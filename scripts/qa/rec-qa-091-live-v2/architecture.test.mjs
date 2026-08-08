import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  FIXED_INPUT,
  OUTPUT_CONTRACT,
  createSyntheticLiveInput,
  validateStrictLiveInput,
} from "./inputContract.mjs";
import {
  GOVERNANCE_EXECUTION_FIELDS,
  TRUST_AUTHORITY,
  createSyntheticGovernanceExecutionContract,
  validateGovernanceExecutionContract,
} from "./authorizationContract.mjs";
import { createOutboundController, fixedOutboundLimits, safeEndpointIdentity } from "./outboundController.mjs";
import { RequestLifecycleReducer } from "./requestLifecycle.mjs";
import { createFixtureTransport, redirectFixtureCases, strictInputNegativeFixtures } from "./fixtures.mjs";
import {
  collectOfflinePreflightEvidence,
  finalizeV2Evidence,
  runAuthorizedV2,
  runOfflineFixtureForArchitecture,
  validateLivePreflight,
} from "./entrypoint.mjs";
import { captureListResponse, createSealedCaptureFixtureTransport, sealedBindingContract } from "./sealedProductBinding.mjs";
import * as sealedProductBinding from "./sealedProductBinding.mjs";
import {
  assembleExternalGovernanceEvidence,
  collectV2SourceInventory,
  writeImmutableV2EvidenceForTest,
} from "./evidenceAssembler.mjs";
import { validateExternalGovernanceEvidence, requiredCheckFields } from "./independentValidator.mjs";
import { collectV2SourceGraph, collectV2SourcePins } from "./sourceInventory.mjs";
import { runNegativeFixtureSuite } from "./negativeFixtures.mjs";
import { CANONICAL_EXPECTED_CONTRACT, CANONICAL_FIXTURE_MANIFEST } from "./canonicalExpectedContract.mjs";
import { TMDB_OBSERVABILITY_LIMITS } from "../../../src/lib/recommendation/qa/tmdbObservability.js";

function validContract(sourcePins) {
  return createSyntheticGovernanceExecutionContract({ sourcePins });
}

async function validInput() {
  return createSyntheticLiveInput({ governanceExecutionContract: validContract(await collectV2SourcePins()) });
}

function response(status = 200, body = { ok: true }) {
  return { ok: status >= 200 && status < 300, status, headers: { get: () => null }, async json() { return body; } };
}

function controllerHarness({ fetchImpl = async () => response(), runId = "test-run", requestClass = "detail", runtimeIntegrityCheck = () => true } = {}) {
  let current = { requestId: `${runId}:request:0`, runId, runMode: "fixture", requestClass };
  const consumptionState = { consumed: false, event: null };
  const controller = createOutboundController({
    fetchImpl,
    getCurrentRequest: () => current,
    limits: fixedOutboundLimits(),
    consumptionState,
    runtimeIntegrityCheck,
    onAttemptStart: () => {},
    onAttemptTerminal: () => {},
  });
  return { controller, setRequest: (id, className = requestClass) => { current = { requestId: `${runId}:request:${id}`, runId, runMode: "fixture", requestClass: className }; } };
}

function listPayload(count, overrides = {}) {
  return {
    page: 1,
    total_pages: 1,
    total_results: count,
    results: Array.from({ length: count }, (_, index) => ({ id: 91000 + index, name: "Fixture" })),
    ...overrides,
  };
}

function clonedListResponse(payload) {
  return { clone: () => ({ json: async () => payload }) };
}

async function finalizedFixtureEvidence() {
  const result = await finalizeV2Evidence(await runOfflineFixtureForArchitecture(), { publish: false });
  assert.equal(result.independentValidation.status, "PASS");
  return result.rawEvidence;
}

async function assertEvidenceMutationFails(baseEvidence, mutate, label) {
  const mutated = structuredClone(baseEvidence);
  mutate(mutated);
  const validation = await validateExternalGovernanceEvidence(mutated, {
    sourceInventory: mutated.sourceInventory,
    negativeFixtureRecords: mutated.negativeFixtureRecords,
  });
  assert.equal(validation.status, "FAIL", label);
  return validation;
}

test("strict input is exact, deeply inspected, and rejects unknown fields", async () => {
  const input = await validInput();
  const validated = validateStrictLiveInput({ governanceExecutionContract: input.governanceExecutionContract });
  assert.deepEqual({ ...validated.governanceExecutionContract.fixedInput }, FIXED_INPUT);
  assert.equal(Object.isFrozen(validated), true);
  assert.equal(Object.isFrozen(validated.fixedInput), true);
  for (const fixture of strictInputNegativeFixtures(input)) {
    assert.throws(() => validateStrictLiveInput(fixture.input, { offlineEnvelope: true }), /LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED|keys must be exactly|must be a plain object/);
  }
});

test("External Governance contract has an exact field set and explicit non-authenticity", async () => {
  const contract = validContract(await collectV2SourcePins());
  const validated = validateGovernanceExecutionContract(contract);
  assert.deepEqual(Object.keys(validated).sort(), [...GOVERNANCE_EXECUTION_FIELDS].sort());
  assert.equal(validated.trustAuthority, TRUST_AUTHORITY);
  assert.equal(validated.authenticityTechnicallyVerified, false);
  assert.equal(validated.processRestartReuseTechnicallyPrevented, false);
  assert.throws(() => validateGovernanceExecutionContract({ ...contract, unknown: true }));
  const missing = { ...contract };
  delete missing.trustAuthority;
  assert.throws(() => validateGovernanceExecutionContract(missing));
});

test("offline preflight follows actual control flow and rejects before binding", async () => {
  const input = await validInput();
  const preflight = await validateLivePreflight(input, { offline: true });
  assert.deepEqual(preflight.trace, [
    "strict-live-api-shape", "repository-source-runtime-pin", "fixed-input", "output-collision",
    "credential-presence", "immutable-tmdb-allowlist", "governance-execution-contract",
  ]);
  const invalid = { ...input, credentialPresence: { available: false } };
  await assert.rejects(() => validateLivePreflight(invalid, { offline: true }), /LIVE_V2_CREDENTIAL_MISSING/);
});

test("controller enforces fixed limits, manual redirect, and one governance event", async () => {
  let observedOptions;
  const harness = controllerHarness({ fetchImpl: async (_url, options) => { observedOptions = options; return response(); } });
  await harness.controller.fetch("https://api.themoviedb.org/3/tv/91001", { cache: "no-store" });
  assert.equal(observedOptions.redirect, "manual");
  assert.equal(harness.controller.events().filter((event) => event.type === "governance-consumption").length, 1);
  assert.equal(harness.controller.attempts().length, 1);
  assert.throws(() => createOutboundController({ fetchImpl: async () => response(), getCurrentRequest: () => ({ requestId: "x", runId: "x", runMode: "fixture" }), limits: { ...fixedOutboundLimits(), total: 25 } }), /OUTBOUND_LIMITS_CONTRACT_MISMATCH/);
});

test("redirect fixtures are stateful and each hop is an actual attempt", async () => {
  for (const fixture of redirectFixtureCases().filter((item) => ["redirect-1", "redirect-3"].includes(item.id))) {
    const calls = [];
    const harness = controllerHarness({ fetchImpl: createFixtureTransport({ redirects: fixture.redirects, calls }) });
    const result = await harness.controller.fetch("https://api.themoviedb.org/3/discover/tv", {});
    assert.equal(result.status, 200);
    assert.equal(harness.controller.attempts().length, fixture.expectedAttempts);
  }
  const unsafe = controllerHarness({ fetchImpl: createFixtureTransport({ redirects: { "/discover/tv": "https://evil.example/next" } }) });
  await assert.rejects(() => unsafe.controller.fetch("https://api.themoviedb.org/3/discover/tv"), /TMDB_DESTINATION_NOT_ALLOWED|TMDB_REDIRECT_NOT_ALLOWED/);
});

test("runtime transport mutation fails closed before an attempt", async () => {
  let fetchCalls = 0;
  const harness = controllerHarness({ fetchImpl: async () => { fetchCalls += 1; return response(); }, runtimeIntegrityCheck: () => false });
  await assert.rejects(() => harness.controller.fetch("https://api.themoviedb.org/3/tv/1"), /LIVE_V2_RUNTIME_TRANSPORT_INTEGRITY_FAILED/);
  assert.equal(fetchCalls, 0);
  assert.equal(harness.controller.attempts().length, 0);
  assert.equal(harness.controller.isConsumed(), false);
});

test("lifecycle rejects open attempts and represents cache hits explicitly", () => {
  const reducer = new RequestLifecycleReducer();
  reducer.startRequest({ requestId: "r", runId: "run", runMode: "cold", requestClass: "detail", providerItemId: 1, safeEndpointIdentity: "/tv/1" });
  reducer.recordAttemptStart({ requestId: "r", attemptId: "a" });
  assert.throws(() => reducer.completeRequest("r"), /REQUEST_TERMINAL_WITH_OPEN_ATTEMPT/);
  reducer.recordAttemptTerminal({ requestId: "r", attemptId: "a" });
  reducer.completeRequest("r");
  assert.throws(() => reducer.failRequest("r"), /REQUEST_TERMINAL_DUPLICATE_OR_INVALID/);
  const cache = new RequestLifecycleReducer();
  cache.startRequest({ requestId: "cache", runId: "warm", runMode: "warm-measure", requestClass: "list", page: 1, safeEndpointIdentity: "/discover/tv" });
  cache.markCacheAttempt("cache");
  cache.completeRequest("cache");
  assert.equal(cache.logicalRequestLedger()[0].cacheRelation, "HIT");
  assert.deepEqual(cache.logicalRequestLedger()[0].outboundAttemptIds, []);
});

test("direct live execution requires validated preflight and has no caller transport", async () => {
  const input = await validInput();
  assert.equal(Object.hasOwn(sealedProductBinding, "runAuthorizedSealedLiveProbe"), false);
  await assert.rejects(() => runAuthorizedV2(input.governanceExecutionContract), /LIVE_V2_CREDENTIAL_MISSING|LIVE_V2_OUTPUT_DESTINATION_COLLISION|LIVE_V2_NODE_RUNTIME_PIN_REQUIRED/);
  await assert.rejects(() => runAuthorizedV2(input), /LIVE_V2_CALLER_MUST_PROVIDE_GOVERNANCE_CONTRACT_ONLY/);
  assert.equal(sealedBindingContract().callerTransportInjection, false);
  assert.deepEqual(sealedBindingContract().publicLiveCapableExports, []);
});

test("sealed live transport captures list payload from its response clone", async () => {
  const captures = [];
  const payload = { page: 1, total_pages: 1, total_results: 1, results: [{ id: 91001, name: "Fixture" }] };
  const responseValue = {
    ok: true,
    status: 200,
    headers: { get: () => null },
    clone: () => ({ async json() { return payload; } }),
  };
  const transport = createSealedCaptureFixtureTransport({
    fetchImpl: async () => responseValue,
    listPayloadCaptures: captures,
    runId: "capture-run",
    runMode: "cold",
  });
  const responseValueReturned = await transport("https://api.themoviedb.org/3/discover/tv", {});
  assert.equal(responseValueReturned, responseValue);
  assert.deepEqual(captures, [{
    runId: "capture-run",
    runMode: "cold",
    taskIdentity: "discover-tv",
    page: 1,
    totalResults: 1,
    candidateIds: [91001],
    safeEndpointIdentity: "/discover/tv",
    payload,
    captureStatus: "CAPTURED",
  }]);
});

test("canonical contract and fixture manifest are recursively frozen", () => {
  assert.equal(Object.isFrozen(CANONICAL_EXPECTED_CONTRACT), true);
  assert.equal(Object.isFrozen(CANONICAL_EXPECTED_CONTRACT.requestBudget), true);
  assert.equal(Object.isFrozen(CANONICAL_EXPECTED_CONTRACT.fixtureManifest), true);
  assert.equal(Object.isFrozen(CANONICAL_EXPECTED_CONTRACT.fixtureManifest[0]), true);
  assert.ok(CANONICAL_FIXTURE_MANIFEST.some((record) => record.fixtureId === "capture-exact-boundary"));
  assert.throws(() => { CANONICAL_EXPECTED_CONTRACT.requestBudget.total = 25; }, TypeError);
  assert.throws(() => { CANONICAL_EXPECTED_CONTRACT.fixtureManifest[0].fixtureId = "mutated"; }, TypeError);
  assert.throws(() => { CANONICAL_EXPECTED_CONTRACT.fixtureManifest[0].expectedErrorCodePrefix = "mutated"; }, TypeError);
  assert.throws(() => { CANONICAL_EXPECTED_CONTRACT.fixtureManifest[0].expectedAttemptCount = 99; }, TypeError);
  assert.throws(() => { CANONICAL_EXPECTED_CONTRACT.fixtureManifest[0].expectedConsumptionEventCount = 99; }, TypeError);
  assert.throws(() => { CANONICAL_EXPECTED_CONTRACT.futureOutput.fileStem = "mutated"; }, TypeError);
});

test("list response capture uses Response.clone and existing observability limits", async () => {
  const empty = await captureListResponse(clonedListResponse(listPayload(0)));
  const normal = await captureListResponse(clonedListResponse(listPayload(20)));
  const exact = await captureListResponse(clonedListResponse(listPayload(TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry)));
  assert.equal(empty.results.length, 0);
  assert.equal(normal.results.length, 20);
  assert.equal(exact.results.length, TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry);
  await assert.rejects(
    () => captureListResponse(clonedListResponse(listPayload(TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry + 1))),
    /LIVE_V2_LIST_RESPONSE_RESOURCE_LIMIT_EXCEEDED/,
  );
  await assert.rejects(
    () => captureListResponse(clonedListResponse(listPayload(1, { results: [{ id: 1, name: "x".repeat(TMDB_OBSERVABILITY_LIMITS.maximumPayloadBytes) }] }))),
    /LIVE_V2_LIST_RESPONSE_RESOURCE_LIMIT_EXCEEDED/,
  );
  await assert.rejects(() => captureListResponse(clonedListResponse({ page: 1, total_results: 1, results: [null] })), /LIVE_V2_LIST_RESPONSE_INVALID/);
  await assert.rejects(() => captureListResponse(clonedListResponse({ page: 1, total_results: 1, results: {} })), /LIVE_V2_LIST_RESPONSE_INVALID/);
  await assert.rejects(() => captureListResponse({ clone: () => ({ json: async () => { throw new SyntaxError("invalid json"); } }) }), /LIVE_V2_LIST_RESPONSE_INVALID_JSON/);
  await assert.rejects(() => captureListResponse({ clone: () => { throw new Error("clone failed"); } }), /LIVE_V2_LIST_RESPONSE_CLONE_FAILED/);
});

test("live low-level controller cannot bypass preflight or use direct global transport", () => {
  const getCurrentRequest = () => ({ requestId: "live:request:0", runId: "live", runMode: "live", requestClass: "list" });
  assert.throws(
    () => createOutboundController({ mode: "live", fetchImpl: globalThis.fetch, getCurrentRequest }),
    /LIVE_V2_LIVE_CONTROLLER_PRECONDITION_REQUIRED/,
  );
  assert.throws(
    () => createOutboundController({ mode: "live", fetchImpl: async () => response(), getCurrentRequest }),
    /LIVE_V2_LIVE_CONTROLLER_PRECONDITION_REQUIRED/,
  );
});

test("caller-created preflight, frozen objects, and token-like values cannot reach live capability", () => {
  const getCurrentRequest = () => ({ requestId: "forged:request", runId: "forged", runMode: "fixture", requestClass: "detail" });
  const fakeTransport = async () => response();
  for (const forged of [
    { preflightComplete: true },
    Object.freeze({ preflightComplete: true, governanceExecutionContract: Object.freeze({}) }),
    { liveCapability: Symbol("caller-token") },
    { liveCapability: "magic-hash" },
  ]) {
    assert.throws(
      () => createOutboundController({ mode: "live", fetchImpl: fakeTransport, getCurrentRequest, livePreflight: forged }),
      /OUTBOUND_CONTROLLER_OPTIONS_INVALID|LIVE_V2_LIVE_CONTROLLER_PRECONDITION_REQUIRED/,
    );
  }
});

test("public controller is network-inert and fixture transport remains explicit", async () => {
  assert.throws(
    () => createOutboundController({ fetchImpl: globalThis.fetch, getCurrentRequest: () => ({ requestId: "global", runId: "global", runMode: "fixture", requestClass: "detail" }) }),
    /LIVE_V2_LIVE_CONTROLLER_PRECONDITION_REQUIRED/,
  );
  let calls = 0;
  const controller = createOutboundController({
    fetchImpl: async () => { calls += 1; return response(); },
    getCurrentRequest: () => ({ requestId: "fixture", runId: "fixture", runMode: "fixture", requestClass: "detail" }),
  });
  await controller.fetch("https://api.themoviedb.org/3/tv/1");
  assert.equal(calls, 1);
  assert.equal(controller.mode, "fixture");
});

test("forged public paths do not call the global fetch trap or read credential inputs", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error("GLOBAL_FETCH_MUST_NOT_RUN"); };
  try {
    await assert.rejects(() => runAuthorizedV2({ preflightComplete: true }), /LIVE_V2_CALLER_MUST_PROVIDE_GOVERNANCE_CONTRACT_ONLY/);
    const input = await validInput();
    await assert.rejects(() => runAuthorizedV2({ ...input.governanceExecutionContract, credential: "credential-like-input" }), /LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED|LIVE_V2_CALLER_MUST_PROVIDE_GOVERNANCE_CONTRACT_ONLY|LIVE_V2_/);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("successful synthetic preflight stops before capability or transport execution", async () => {
  const input = await validInput();
  const preflight = await validateLivePreflight(input, { offline: true });
  assert.equal(preflight.preflightComplete, true);
  assert.equal(preflight.bindingInvocations, 0);
  assert.equal(preflight.outboundAttempts, 0);
  assert.equal(preflight.consumption, 0);
});

test("offline product binding preserves cold/warm ledgers and governance scope", async () => {
  const execution = await runOfflineFixtureForArchitecture();
  assert.deepEqual(execution.runs.map((run) => run.logicalRequestLedger.length), [17, 17, 17]);
  assert.deepEqual(execution.runs.map((run) => run.outboundAttemptLedger.length), [17, 0, 0]);
  assert.equal(execution.authorizationConsumption, 1);
  assert.equal(execution.governanceConsumptionEvidence.length, 1);
  assert.equal(execution.governanceConsumptionEvidence[0].authority, "HQ_EXTERNAL_GOVERNANCE");
});

test("independent validator computes checks from raw evidence and complete inventory", async () => {
  const execution = await runOfflineFixtureForArchitecture();
  execution.preflightEvidence = await collectOfflinePreflightEvidence();
  const negative = await runNegativeFixtureSuite({ validInput: await validInput(), governanceExecutionContract: execution.governanceExecutionContract });
  execution.negativeFixtureRecords = (await collectOfflinePreflightEvidence()).filter((record) => record.fixtureId !== "valid-offline").map((record) => ({
    fixtureId: record.fixtureId,
    category: "Strict Input",
    expectedDisposition: "REJECTED",
    observedDisposition: record.disposition,
    observedErrorCode: record.errorCode,
    bindingCount: record.bindingCount,
    attemptCount: record.attemptCount,
    consumptionEventCount: record.consumptionEventCount,
  })).concat(negative);
  const sourceGraph = await collectV2SourceGraph();
  execution.sourceInventoryDiagnostics = sourceGraph.diagnostics;
  const sourceInventory = sourceGraph.records;
  const rawEvidence = assembleExternalGovernanceEvidence(execution, sourceInventory, sourceGraph.diagnostics);
  const validation = await validateExternalGovernanceEvidence(rawEvidence, { sourceInventory, negativeFixtureRecords: execution.negativeFixtureRecords });
  assert.ok(validation.total >= 16);
  assert.equal(validation.meta.stringOnlyPasses, 0);
  assert.equal(validation.meta.selfConfirmingPasses, 0);
  assert.equal(validation.meta.unresolvedPointers, 0);
  assert.deepEqual(sourceGraph.diagnostics.missingRoots, []);
  assert.deepEqual(sourceGraph.diagnostics.unresolvedLocalImports, []);
  assert.deepEqual(sourceGraph.diagnostics.duplicatePaths, []);
  assert.ok(validation.checks.every((check) => Object.keys(check).sort().join("|") === [...requiredCheckFields()].sort().join("|")));
});

test("independent validator fails when one canonical negative fixture is missing", async () => {
  const execution = await runOfflineFixtureForArchitecture();
  execution.preflightEvidence = await collectOfflinePreflightEvidence();
  const preflightRecords = execution.preflightEvidence
    .filter((record) => record.fixtureId !== "valid-offline")
    .map((record) => ({
      fixtureId: `preflight-${record.fixtureId}`,
      category: "Preflight Ordering",
      expectedDisposition: "REJECTED",
      observedDisposition: record.disposition,
      observedErrorCode: record.errorCode || null,
      bindingCount: record.bindingCount,
      attemptCount: record.attemptCount,
      consumptionEventCount: record.consumptionEventCount,
      observed: { trace: record.trace },
      verdict: "PASS",
    }));
  const negative = await runNegativeFixtureSuite({ validInput: await validInput(), governanceExecutionContract: execution.governanceExecutionContract });
  execution.negativeFixtureRecords = [...preflightRecords, ...negative].slice(1);
  const sourceGraph = await collectV2SourceGraph();
  execution.sourceInventoryDiagnostics = sourceGraph.diagnostics;
  const rawEvidence = assembleExternalGovernanceEvidence(execution, sourceGraph.records, sourceGraph.diagnostics);
  const validation = await validateExternalGovernanceEvidence(rawEvidence, {
    sourceInventory: sourceGraph.records,
    negativeFixtureRecords: execution.negativeFixtureRecords,
  });
  const fixtureCheck = validation.checks.find((check) => check.checkId === "V2-001");
  assert.equal(validation.status, "FAIL");
  assert.equal(fixtureCheck.verdict, "FAIL");
  assert.equal(fixtureCheck.observed.missing.length, 1);
});

test("evidence finalizer validates before publish and supports a no-write dry run", async () => {
  const execution = await runOfflineFixtureForArchitecture();
  const result = await finalizeV2Evidence(execution, { publish: false });
  assert.equal(result.independentValidation.status, "PASS");
  assert.equal(result.published, false);
  assert.equal(result.finalEvidence.evidenceStatus, "INDEPENDENT_VALIDATION_PASS");
  assert.equal(result.finalEvidence.outputIntegrity.writer, "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs");
});

test("writer failure after consumption preserves evidence and forbids retry or overwrite", async () => {
  const execution = await runOfflineFixtureForArchitecture();
  const result = await finalizeV2Evidence(execution, {
    publish: true,
    writerForTest: async () => {
      const error = new Error("synthetic writer failure");
      error.code = "SYNTHETIC_WRITER_FAILURE";
      throw error;
    },
  });
  assert.equal(result.published, false);
  assert.equal(result.publishedFinalEvidence, false);
  assert.equal(result.finalEvidence.publishedFinalEvidence, false);
  assert.equal(result.finalEvidence.writerFailure.integratedRunId, "REC-QA-091-V2-INTEGRATED-RUN");
  assert.equal(result.finalEvidence.writerFailure.executionAuthorizationId, execution.governanceExecutionContract.executionAuthorizationId);
  assert.equal(result.finalEvidence.writerFailure.governanceDecisionId, execution.governanceExecutionContract.governanceDecisionId);
  assert.equal(result.finalEvidence.writerFailure.consumptionEvidence.length, 1);
  assert.ok(result.finalEvidence.writerFailure.logicalRequestLedger.length > 0);
  assert.ok(result.finalEvidence.writerFailure.outboundAttemptLedger.length > 0);
  assert.equal(result.finalEvidence.writerFailure.writerErrorClass, "SYNTHETIC_WRITER_FAILURE");
  assert.equal(result.finalEvidence.writerFailure.automaticRetry, 0);
  assert.equal(result.finalEvidence.writerFailure.alternateOutput, false);
  assert.equal(result.finalEvidence.writerFailure.overwrite, false);
  assert.equal(result.finalEvidence.writerFailure.secondExecution, false);
});

test("pre-consumption validation failure never invokes the writer", async () => {
  const execution = await runOfflineFixtureForArchitecture();
  execution.runs = [];
  execution.governanceConsumptionEvidence = [];
  execution.authorizationConsumption = 0;
  let writerCalls = 0;
  const result = await finalizeV2Evidence(execution, {
    publish: true,
    writerForTest: async () => {
      writerCalls += 1;
      throw Object.assign(new Error("writer must not be reached"), { code: "UNEXPECTED_WRITER_CALL" });
    },
  });
  assert.equal(result.independentValidation.status, "FAIL");
  assert.equal(result.published, false);
  assert.equal(writerCalls, 0);
});

test("independent validator rejects raw ledger, provenance, diagnostics, output, and fixture mutations", async () => {
  const baseEvidence = await finalizedFixtureEvidence();
  const mutations = [
    ["logical attempt count increment", (e) => { e.logicalRequestLedger[0].attemptCount += 1; }],
    ["logical attempt count decrement", (e) => { e.logicalRequestLedger[0].attemptCount -= 1; }],
    ["duplicate governance consumption", (e) => { e.governanceConsumptionEvidence.push(structuredClone(e.governanceConsumptionEvidence[0])); }],
    ["governance consumption count decrement", (e) => { e.governanceConsumptionEvidence.pop(); }],
    ["unmatched attempt terminal", (e) => { e.rawEventLedger.cold.controller.push({ type: "outbound-attempt-complete", attemptId: "unmatched-attempt", sequence: 999999 }); }],
    ["missing attempt terminal", (e) => { e.rawEventLedger.cold.controller = e.rawEventLedger.cold.controller.filter((event) => event.type !== "outbound-attempt-complete"); }],
    ["duplicate logical terminal", (e) => { const terminal = e.rawEventLedger.cold.lifecycle.find((event) => event.type === "provider-request-complete"); e.rawEventLedger.cold.lifecycle.push({ ...terminal, eventId: "duplicate-terminal", sequence: 999999 }); }],
    ["extraneous terminal provenance", (e) => { e.terminalProvenance.push({ candidateId: "extraneous-terminal" }); }],
    ["missing terminal provenance", (e) => { e.terminalProvenance = e.terminalProvenance.slice(1); }],
    ["extraneous ranking provenance", (e) => { e.rankingProvenance.push({ candidateId: "extraneous-ranking" }); }],
    ["missing ranking provenance", (e) => { e.rankingProvenance = e.rankingProvenance.slice(1); }],
    ["extraneous final candidate", (e) => { e.threeRunEvidence.cold.finalCandidateIds.push("extraneous-final"); }],
    ["candidate partition mutation", (e) => { e.candidateRegistry.find((candidate) => candidate.selected === true).selected = false; }],
    ["final excluded overlap", (e) => { const candidate = e.candidateRegistry.find((item) => item.selected === true); candidate.assemblyExclusion = true; }],
    ["future live root mutation", (e) => { e.outputIntegrity.futureLiveRootRelative = "invalid-root"; }],
    ["future live stem mutation", (e) => { e.outputIntegrity.futureLiveFileStem = "invalid-stem"; }],
    ["future live writer mutation", (e) => { e.outputIntegrity.futureLiveWriter = "invalid-writer"; }],
    ["source inventory mutation", (e) => { e.sourcePins[Object.keys(e.sourcePins)[0]].sha256 = "0".repeat(64); }],
    ["fixture attempt count mutation", (e) => { e.negativeFixtureRecords.find((record) => record.fixtureId === "consumption-after-outbound-failure").attemptCount += 1; }],
    ["fixture consumption count mutation", (e) => { e.negativeFixtureRecords.find((record) => record.fixtureId === "consumption-after-outbound-failure").consumptionEventCount += 1; }],
  ];
  for (const [label, mutate] of mutations) await assertEvidenceMutationFails(baseEvidence, mutate, label);
});

test("immutable writer is contained, no-clobber, and cleans its temporary file", async () => {
  const root = await mkdtemp(join(tmpdir(), "myott-v2-writer-"));
  try {
    const first = await writeImmutableV2EvidenceForTest({ root, stem: "fixture", value: { version: 1 } });
    assert.equal(JSON.parse(await readFile(first.path, "utf8")).version, 1);
    await assert.rejects(() => writeImmutableV2EvidenceForTest({ root, stem: "fixture", value: { version: 2 } }), /DESTINATION_EXISTS/);
    assert.deepEqual((await readdir(root)).filter((item) => item.endsWith(".tmp")), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("allowlist rejects unsafe endpoint identities", () => {
  for (const value of [
    "http://api.themoviedb.org/3/tv/1",
    "https://evil.example/3/tv/1",
    "https://api.themoviedb.org.evil.example/3/tv/1",
    "https://user:pass@api.themoviedb.org/3/tv/1",
    "https://127.0.0.1/3/tv/1",
  ]) assert.throws(() => safeEndpointIdentity(value), /TMDB_DESTINATION_NOT_ALLOWED/);
});
