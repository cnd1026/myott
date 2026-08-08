import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import {
  BASE_COMMIT,
  FIXED_INPUT,
  GOVERNANCE_BOUNDARY,
  NODE_EXECUTABLE,
  NODE_SHA256,
  NODE_VERSION,
  PACKAGE_JSON_SHA256,
  PINNED_SOURCE_PINS,
  PNPM_LOCK_SHA256,
  REQUEST_BUDGET,
  collectRuntimePins,
  validateEnvironment,
  validateExecArgv,
  validateGovernanceExecutionContract,
  validateInvocation,
  validateRepositoryPins,
  validateRuntimePins,
} from "./runtimeContract.mjs";
import { createOneShotTransport, safeEndpointIdentity } from "./networkPolicy.mjs";
import { RequestLifecycleReducer, createRequestLifecycleContext } from "./requestLifecycle.mjs";
import { assembleImplementationEvidence, assembleRawEvidence } from "./evidenceAssembler.mjs";
import { calculateMetaQuality, validateFixtureRecords, validateRawEvidence } from "./offlineValidator.mjs";
import { runNegativeFixtureSuite, runProductThreePhaseFixture } from "./deterministicFixtures.mjs";
import {
  hashEvidenceFile,
  resolveObservabilityEvidenceOutput,
  writeImmutableObservabilityEvidenceForTest,
} from "../../../src/lib/recommendation/qa/tmdbObservabilityOutput.mjs";
import { runTmdbObservabilityImmutableOutputFixtures } from "../../../src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const RUNNER = resolve(ROOT, "run-rec-qa-091-one-shot.mjs");
const state = {
  runtime: null,
  runs: null,
  rawEvidence: null,
  offlineValidation: null,
  fixtureValidation: null,
  fixtureRecords: null,
  evidenceArtifact: null,
};

function governanceFixture() {
  return {
    governanceDecisionId: "FOUNDER_DECISION_REC_QA_091_ONE_SHOT_LOCAL_PROBE_TRUST_BOUNDARY_V1",
    executionAuthorizationId: "SYNTHETIC_OFFLINE_EXECUTION_AUTHORIZATION",
    executionState: "GRANTED_ACTIVE",
    integratedRunAllowance: 1,
    fixedInput: FIXED_INPUT,
    sourcePins: {},
    runtimePins: {},
    requestBudget: REQUEST_BUDGET,
    concurrency: 4,
    retry: 0,
    allowedNetworkDestination: "https://api.themoviedb.org",
    consumptionBoundary: GOVERNANCE_BOUNDARY,
    automaticRetry: 0,
    evidenceRoot: "qa-evidence/REC-QA-091/ONE_SHOT",
    evidenceFileStem: "synthetic-offline",
    trustAuthority: "EXTERNAL_GOVERNANCE",
    authenticityTechnicallyVerified: false,
  };
}

test("runner is direct-execution-only and safe when imported", async () => {
  const source = await readFile(RUNNER, "utf8");
  assert.doesNotMatch(source, /^\s*export\s+/m);
  const originalFetch = globalThis.fetch;
  let trapCalls = 0;
  globalThis.fetch = async () => {
    trapCalls += 1;
    throw new Error("FETCH_TRAP_SHOULD_NOT_RUN");
  };
  try {
    const imported = await import(`${pathToFileURL(RUNNER).href}?import-safety=${Date.now()}`);
    assert.deepEqual(Object.keys(imported), []);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(trapCalls, 0);
  const importedIdentity = validateInvocation({ moduleUrl: `${pathToFileURL(RUNNER).href}?import`, argv: [process.execPath, RUNNER], expectedScriptPath: RUNNER });
  assert.equal(importedIdentity.ok, false);
});

test("runtime, environment, invocation, and governance contracts are fail-closed", () => {
  assert.equal(Object.isFrozen(FIXED_INPUT), true);
  assert.equal(validateInvocation({ moduleUrl: pathToFileURL(RUNNER).href, argv: [process.execPath, RUNNER], expectedScriptPath: RUNNER }).ok, true);
  assert.equal(validateInvocation({ moduleUrl: pathToFileURL(RUNNER).href, argv: [process.execPath, RUNNER, "--country", "us"], expectedScriptPath: RUNNER }).ok, false);
  assert.equal(validateExecArgv(["--require", "fixture"]).ok, false);
  assert.equal(validateExecArgv([]).ok, true);
  assert.equal(validateEnvironment({}).ok, true);
  assert.equal(validateEnvironment({ NODE_OPTIONS: "fixture" }).ok, false);
  const valid = validateGovernanceExecutionContract(governanceFixture());
  assert.equal(valid.ok, true);
  assert.equal(validateGovernanceExecutionContract({ ...governanceFixture(), unknown: true }).ok, false);
});

test("runtime and source pins are computed from actual files", async () => {
  state.runtime = await collectRuntimePins();
  assert.equal(state.runtime.node.executablePath.toLowerCase(), NODE_EXECUTABLE.toLowerCase());
  assert.equal(state.runtime.node.version, NODE_VERSION);
  assert.equal(state.runtime.node.sha256, NODE_SHA256);
  assert.equal(state.runtime.repository.branch, "main");
  assert.equal(state.runtime.repository.head, BASE_COMMIT);
  assert.equal(state.runtime.repository.originMain, BASE_COMMIT);
  assert.equal(state.runtime.repository.packageJson.sha256, PACKAGE_JSON_SHA256);
  assert.equal(state.runtime.repository.pnpmLock.sha256, PNPM_LOCK_SHA256);
  assert.equal(state.runtime.sourceInventory.diagnostics.missingRoots.length, 0);
  assert.equal(state.runtime.sourceInventory.diagnostics.unresolvedLocalImports.length, 0);
  assert.equal(state.runtime.sourceInventory.diagnostics.duplicatePaths.length, 0);
  assert.ok(state.runtime.sourceInventory.records.some((record) => record.relativePath === "lib/tmdb.js"));
  assert.ok(state.runtime.sourceInventory.records.some((record) => record.relativePath === "src/lib/providers/tmdb/requestContext.js"));
  const runtimeValidation = validateRuntimePins({
    ...state.runtime,
    node: { ...state.runtime.node, execArgv: [] },
  }, { requireSourcePins: false });
  assert.equal(runtimeValidation.ok, true, JSON.stringify({ runtimeValidation, execArgv: state.runtime.node.execArgv }));
  assert.equal(validateRuntimePins({
    ...state.runtime,
    node: { ...state.runtime.node, execArgv: [] },
  }, { requireSourcePins: true, expectedSourcePins: PINNED_SOURCE_PINS }).ok, true);
  assert.equal(validateRepositoryPins(state.runtime.repository, { branch: "wrong" }).ok, false);
});

test("allowlist rejects unsafe destinations and transport detects runtime mutation", async () => {
  for (const url of [
    "http://api.themoviedb.org/3/discover/tv",
    "https://127.0.0.1/3/discover/tv",
    "https://user:pass@api.themoviedb.org/3/discover/tv",
    "https://api.themoviedb.org:8443/3/discover/tv",
    "https://api.themoviedb.org.evil.invalid/3/discover/tv",
  ]) assert.throws(() => safeEndpointIdentity(url), /TMDB_DESTINATION_NOT_ALLOWED/);

  const reducer = new RequestLifecycleReducer();
  const baseContext = { get: () => transport.fetch("https://api.themoviedb.org/3/discover/tv", {}), limits: REQUEST_BUDGET };
  let transport;
  const lifecycle = createRequestLifecycleContext({ reducer, baseContext, runId: "integrity-negative", runMode: "cold" });
  transport = createOneShotTransport({
    nativeFetch: async () => ({ status: 200, ok: true, headers: { get: () => null }, clone: () => ({ json: async () => ({ results: [] }) }) }),
    getCurrentRequest: lifecycle.getCurrentRequest,
    lifecycle,
    runtimeIntegrityCheck: () => false,
    syntheticConsumption: true,
  });
  await assert.rejects(lifecycle.requestContext.get("/discover/tv", {}, { kind: "list" }), (error) => error.code === "LIVE_V2_RUNTIME_TRANSPORT_INTEGRITY_FAILED");
  assert.equal(transport.attempts().length, 0);
  assert.equal(transport.isConsumed(), false);
});

test("deterministic Product cold, warm-prime, and warm-measure fixture executes without network", async () => {
  state.runs = await runProductThreePhaseFixture();
  assert.deepEqual(Object.keys(state.runs).sort(), ["cold", "warm-measure", "warm-prime"]);
  for (const run of Object.values(state.runs)) {
    assert.ok(run.logicalRequestLedger.length > 0);
    assert.ok(run.productDiagnostics);
    assert.ok(Array.isArray(run.candidateRegistry));
    assert.ok(Array.isArray(run.terminalProvenance));
    assert.ok(Array.isArray(run.rankingProvenance));
    assert.ok(Array.isArray(run.controllerEvents));
  }
});

test("all deterministic negative fixtures execute and unexpected passes are zero", async () => {
  const fixtureResult = await runNegativeFixtureSuite();
  state.fixtureRecords = fixtureResult.records;
  state.fixtureValidation = validateFixtureRecords(fixtureResult.records, fixtureResult.manifest);
  assert.equal(fixtureResult.manifest.length, fixtureResult.records.length);
  assert.equal(state.fixtureValidation.ok, true, JSON.stringify(state.fixtureValidation));
  assert.equal(state.fixtureValidation.unexpectedPasses.length, 0);
  assert.equal(new Set(fixtureResult.records.map((record) => record.fixtureId)).size, fixtureResult.records.length);
});

test("raw evidence and independent offline validator recompute the contract", async () => {
  assert.ok(state.runtime && state.runs && state.fixtureValidation);
  state.rawEvidence = assembleRawEvidence({
    dataSource: "DETERMINISTIC_FIXTURE",
    executionIdentity: { isDirect: false, moduleUrl: import.meta.url, argvCount: 1 },
    runtimePins: { ...state.runtime.node, execArgv: [] },
    repositoryPins: state.runtime.repository,
    sourceInventory: state.runtime.sourceInventory.records,
    fixedInput: FIXED_INPUT,
    runs: state.runs,
    rawObservations: { externalNetworkAttempts: 0, liveTmdbAttempts: 0, browserAttempts: 0, cdpAttempts: 0, serverAttempts: 0, portBinds: 0, v1Consumption: 0 },
    outputContract: { writer: "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs", futureLiveEvidenceCreated: false },
  });
  state.offlineValidation = validateRawEvidence(state.rawEvidence, {
    actualSourceInventory: state.runtime.sourceInventory.records,
    expectedRequestContract: REQUEST_BUDGET,
    expectedRunModes: ["cold", "warm-prime", "warm-measure"],
    expectedGovernanceEvents: 1,
    expectedRedirectCount: 0,
  });
  assert.equal(state.offlineValidation.ok, true, JSON.stringify(state.offlineValidation.checks.filter((check) => check.verdict !== "PASS")));
  assert.equal(state.offlineValidation.metaQuality.stringOnlyPasses, 0);
  assert.equal(state.offlineValidation.metaQuality.selfConfirmingPasses, 0);
  assert.equal(state.offlineValidation.metaQuality.duplicateCheckIds, 0);
  assert.equal(state.offlineValidation.metaQuality.unresolvedPointers, 0);
  const implementationEvidence = assembleImplementationEvidence({
    rawEvidence: state.rawEvidence,
    fixtureRecords: state.fixtureRecords,
    offlineValidation: state.offlineValidation,
    testResults: { focusedTests: true, networkAttempts: 0, v1Consumption: 0 },
    sourceInventory: state.runtime.sourceInventory.records,
    runtimeContract: { fixedInput: FIXED_INPUT, requestBudget: REQUEST_BUDGET, productSourceModified: false },
  });
  assert.equal(implementationEvidence.dataSource, "DETERMINISTIC_FIXTURE");
  assert.equal(implementationEvidence.actualCredentialUsed, false);
  assert.equal(implementationEvidence.futureExecutionAuthorizationCreated, false);
  state.implementationEvidence = implementationEvidence;
});

test("existing immutable writer passes output security fixtures and publishes one implementation artifact", async () => {
  assert.ok(state.implementationEvidence);
  const security = await runTmdbObservabilityImmutableOutputFixtures();
  assert.equal(security.status, "PASS", JSON.stringify(security));
  const stem = `one-shot-source-implementation-v1-${process.pid}`;
  const outputPath = await resolveObservabilityEvidenceOutput(stem);
  state.evidenceArtifact = await writeImmutableObservabilityEvidenceForTest(stem, state.implementationEvidence, async () => {});
  const actual = await hashEvidenceFile(outputPath);
  assert.deepEqual(actual, { sha256: state.evidenceArtifact.sha256, byteSize: state.evidenceArtifact.byteSize });
  assert.equal(state.evidenceArtifact.path, outputPath);
});

test("static contract exposes no runner verdict and only one approved output sink", async () => {
  const runnerSource = await readFile(RUNNER, "utf8");
  assert.doesNotMatch(runnerSource, /Technical PASS|Security PASS|Product PASS/);
  assert.match(runnerSource, /RAW_EVIDENCE_READY/);
  assert.equal((runnerSource.match(/writeImmutableObservabilityEvidence/g) || []).length, 0);
  assert.equal(state.evidenceArtifact?.sha256?.length, 64);
});

export { state };
