import {
  FIXED_INPUT,
  OUTPUT_CONTRACT,
  LIVE_INPUT_FIELDS,
  V2_AUTHORIZATION_ID,
  V2_GOVERNANCE_DECISION_ID,
  V2_PACKAGE_ID,
  assertExactFixedInput,
  createSyntheticLiveInput,
  validateStrictLiveInput,
} from "./inputContract.mjs";
import {
  AUTHORIZATION_CONTRACT,
  GOVERNANCE_EXECUTION_FIELDS,
  LIVE_CONSUMPTION_BOUNDARY,
} from "./authorizationContract.mjs";
import {
  captureListResponse,
  runOfflineArchitectureFixture,
  validateSealedLivePreflight,
} from "./sealedProductBinding.mjs";
import { clearTmdbRequestCache, createTmdbRequestContext } from "../../../src/lib/providers/tmdb/requestContext.js";
import { LANGUAGE, REGION, diagnoseTmdbCandidateUniverse, discoverTmdb } from "../../../lib/tmdb.js";
import { createTmdbObservabilitySession, finalizeTmdbObservabilitySession } from "../../../src/lib/recommendation/qa/tmdbObservability.js";
import { createOutboundController, fixedOutboundLimits, outboundControllerContract } from "./outboundController.mjs";
import { RequestLifecycleReducer, createRequestLifecycleContext } from "./requestLifecycle.mjs";
import {
  assembleExternalGovernanceEvidence,
  futureLiveEvidenceOutputContract,
  writeFutureV2LiveEvidence,
} from "./evidenceAssembler.mjs";
import { validateExternalGovernanceEvidence } from "./independentValidator.mjs";
import { runNegativeFixtureSuite } from "./negativeFixtures.mjs";
import { collectV2SourceGraph, collectV2SourcePins } from "./sourceInventory.mjs";

const MODULE_FETCH_REFERENCE = globalThis.fetch;
const LIVE_CAPABILITY_BRAND = Symbol("myott-v2-private-live-capability");
const MODULE_PRIVATE_LIVE_CAPABILITY = Object.freeze({ [LIVE_CAPABILITY_BRAND]: true });
const PRODUCT_FILTERS = Object.freeze(["country-us", "genre-horror"]);
const PRODUCT_CONTENT_TYPES = Object.freeze(["drama"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildProductInput() {
  return {
    filters: [...PRODUCT_FILTERS],
    contentTypes: [...PRODUCT_CONTENT_TYPES],
    limit: FIXED_INPUT.limit,
    detailLimit: OUTPUT_CONTRACT.requestBudget.detail,
  };
}

function assertProductInput(input) {
  if (JSON.stringify(input) !== JSON.stringify(buildProductInput())) throw new TypeError("LIVE_V2_PRODUCT_INPUT_MISMATCH");
}

function makeModuleLocalLiveBinding() {
  return Object.freeze({ discover: discoverTmdb, diagnose: diagnoseTmdbCandidateUniverse, source: "lib/tmdb.js" });
}

function assertRuntimeTransportIntegrity() {
  if (globalThis.fetch !== MODULE_FETCH_REFERENCE) throw new TypeError("LIVE_V2_RUNTIME_TRANSPORT_INTEGRITY_FAILED");
  return true;
}

function acquireModulePrivateLiveCapability(preflight) {
  if (preflight?.preflightComplete !== true || !Object.isFrozen(preflight.governanceExecutionContract)) {
    throw new TypeError("LIVE_V2_INTERNAL_PREFLIGHT_REQUIRED");
  }
  return MODULE_PRIVATE_LIVE_CAPABILITY;
}

function assertModulePrivateLiveCapability(capability) {
  if (capability !== MODULE_PRIVATE_LIVE_CAPABILITY || capability[LIVE_CAPABILITY_BRAND] !== true) {
    throw new TypeError("LIVE_V2_PRIVATE_LIVE_CAPABILITY_REQUIRED");
  }
}

function createOfficialLiveTransport(capability, { listPayloadCaptures, runId, runMode }) {
  assertModulePrivateLiveCapability(capability);
  return async (url, options = {}) => {
    assertRuntimeTransportIntegrity();
    const response = await MODULE_FETCH_REFERENCE(url, { ...options, redirect: "manual" });
    const parsed = new URL(url);
    if (parsed.hostname === AUTHORIZATION_CONTRACT.allowedNetworkDestination.host &&
      parsed.pathname === "/3/discover/tv" && typeof response?.clone === "function") {
      try {
        const payload = await captureListResponse(response);
        listPayloadCaptures.push({
          runId,
          runMode,
          taskIdentity: "discover-tv",
          page: payload.page,
          totalResults: payload.total_results,
          candidateIds: payload.results.map((item) => item.id),
          safeEndpointIdentity: "/discover/tv",
          payload,
          captureStatus: "CAPTURED",
        });
      } catch (error) {
        listPayloadCaptures.push({
          runId,
          runMode,
          taskIdentity: "discover-tv",
          safeEndpointIdentity: "/discover/tv",
          payload: null,
          captureStatus: "UNREADABLE",
          captureErrorCode: error?.code || "LIVE_V2_LIVE_CAPTURE_FAILED",
        });
      }
    }
    return response;
  };
}

async function runOfficialLivePhase({ runMode, runIndex, controller, activeLifecycle, listPayloadCaptures, cachedListPayload, binding }) {
  const runId = `REC-QA-091-V2-${runMode}-${runIndex + 1}`;
  const session = createTmdbObservabilitySession({
    runId,
    runMode,
    sourceComponent: "scripts/qa/rec-qa-091-live-v2/entrypoint.mjs",
  });
  const reducer = new RequestLifecycleReducer();
  const lifecycle = createRequestLifecycleContext({
    reducer,
    baseContext: createTmdbRequestContext({
      apiKey: process.env.TMDB_API_KEY || "",
      bearer: process.env.TMDB_BEARER_TOKEN || "",
      language: LANGUAGE,
      region: REGION,
      fetchImpl: controller.fetch,
      observer: session,
      diagnosticLimits: { total: 24, list: 8, detail: 16, concurrency: 4 },
      diagnosticRetry: 0,
    }),
    controller,
    runId,
    runMode,
  });
  activeLifecycle.current = lifecycle;
  const productInput = buildProductInput();
  assertProductInput(productInput);
  if (runMode === "cold") clearTmdbRequestCache();
  const discovery = await binding.discover({
    filters: productInput.filters,
    contentTypes: productInput.contentTypes,
    limit: productInput.limit,
    requestContext: lifecycle.requestContext,
    detailLimit: 0,
    candidateSource: "rec-qa-091-v2-private-live-product-list",
  });
  const captured = listPayloadCaptures.filter((entry) => entry.runId === runId && entry.payload).at(-1)?.payload || cachedListPayload;
  if (!captured || !Array.isArray(captured.results)) throw Object.assign(new Error("LIVE_V2_LIVE_CAPTURE_REQUIRED"), { code: "LIVE_V2_LIVE_CAPTURE_REQUIRED" });
  const productDiagnostics = {
    providerTotalResultsByTask: clone(discovery.diagnostics?.providerTotalResultsByTask || {}),
    fetchedPagesByTask: clone(discovery.diagnostics?.fetchedPagesByTask || {}),
  };
  const capturedSafe = clone(captured);
  const capturedListResponses = [{
    integratedRunId: "REC-QA-091-V2-INTEGRATED-RUN",
    runId,
    runMode,
    taskIdentities: Object.keys(productDiagnostics.providerTotalResultsByTask),
    taskIdentity: "discover-tv",
    page: capturedSafe.page,
    totalResults: capturedSafe.total_results,
    candidateIds: capturedSafe.results.map((item) => item.id),
    safeEndpointIdentity: "/discover/tv",
    source: listPayloadCaptures.some((entry) => entry.runId === runId && entry.payload) ? "transport-response" : "warm-cache-reuse",
  }];
  const diagnostic = await binding.diagnose({
    session,
    candidates: captured.results,
    filters: productInput.filters,
    contentTypes: productInput.contentTypes,
    limit: productInput.limit,
    requestContext: lifecycle.requestContext,
    diagnosticMode: "product-plan",
  });
  const ledger = finalizeTmdbObservabilitySession(session);
  return {
    runId,
    runMode,
    mode: "live",
    session,
    ledger,
    discovery: clone(discovery),
    result: clone(diagnostic),
    lifecycleEvents: reducer.events(),
    logicalRequestLedger: reducer.logicalRequestLedger(),
    calls: [],
    listPayloadCaptures: clone(listPayloadCaptures.filter((entry) => entry.runId === runId)),
    capturedListResponses,
    productDiagnostics,
    productInput,
    listPayload: clone(captured),
    bindingInvocationCount: 2,
    candidateRegistry: clone(diagnostic.candidateRegistry),
    terminalProvenance: clone(diagnostic.terminalProvenance),
    rankingProvenance: clone(diagnostic.rankingProvenance),
  };
}

async function runOfficialLiveExecution(preflight, capability) {
  assertModulePrivateLiveCapability(capability);
  const activeLifecycle = { current: null };
  const listPayloadCaptures = [];
  const callsByRun = new Map();
  const transportSlot = { current: null };
  const consumptionState = { consumed: false, event: null };
  const binding = makeModuleLocalLiveBinding();
  const controller = createOutboundController({
    mode: "fixture",
    fetchImpl: async (url, options) => {
      assertModulePrivateLiveCapability(capability);
      if (typeof transportSlot.current !== "function") throw new TypeError("LIVE_V2_PRIVATE_TRANSPORT_REQUIRED");
      return transportSlot.current(url, options);
    },
    getCurrentRequest: () => activeLifecycle.current?.getCurrentRequest(),
    limits: fixedOutboundLimits(),
    integratedRunId: "REC-QA-091-V2-INTEGRATED-RUN",
    governanceExecutionContract: preflight.governanceExecutionContract,
    consumptionState,
    runtimeIntegrityCheck: assertRuntimeTransportIntegrity,
    onAttemptStart: (event) => activeLifecycle.current?.reducer.recordAttemptStart(event),
    onAttemptTerminal: (event) => activeLifecycle.current?.reducer.recordAttemptTerminal(event),
  });
  const runs = [];
  let cachedListPayload = null;
  for (const [index, runMode] of ["cold", "warm-prime", "warm-measure"].entries()) {
    const runId = `REC-QA-091-V2-${runMode}-${index + 1}`;
    transportSlot.current = createOfficialLiveTransport(capability, { listPayloadCaptures, runId, runMode });
    const run = await runOfficialLivePhase({ runMode, runIndex: index, controller, activeLifecycle, listPayloadCaptures, cachedListPayload, binding });
    cachedListPayload ||= run.listPayload;
    callsByRun.set(run.runId, []);
    runs.push(run);
  }
  const attemptLedger = controller.attempts();
  const controllerEvents = controller.events();
  return {
    integratedRunId: "REC-QA-091-V2-INTEGRATED-RUN",
    runs: runs.map((run) => ({
      ...run,
      outboundAttemptLedger: attemptLedger.filter((entry) => entry.runId === run.runId),
      controllerEvents: controllerEvents.filter((entry) => entry.runId === run.runId || entry.type === "governance-consumption" && run.runMode === "cold"),
    })),
    controller,
    callsByRun,
    listPayloadCaptures,
    bindingInvocationCount: runs.reduce((sum, run) => sum + run.bindingInvocationCount, 0),
    bindingResolvedBeforeController: true,
    fixedInput: clone(FIXED_INPUT),
    outputContract: clone(OUTPUT_CONTRACT),
    outboundContract: outboundControllerContract(),
    governanceExecutionContract: clone(preflight.governanceExecutionContract),
    governanceConsumptionEvidence: controller.events().filter((event) => event.type === "governance-consumption"),
    externalNetworkAttempts: controller.attempts().length,
    liveTmdbAttempts: controller.attempts().length,
    authorizationConsumption: controller.isConsumed() ? 1 : 0,
    runtimePins: clone(preflight.governanceExecutionContract.runtimePins),
    preflightEvidence: [{
      fixtureId: "valid-live",
      disposition: "ACCEPTED",
      trace: [...preflight.trace, "module-private-live-capability", "module-private-live-controller"],
      bindingCount: 0,
      attemptCount: 0,
      consumptionEventCount: 0,
    }],
  };
}

function attachPreflightEvidence(error, trace) {
  error.preflightTrace = [...trace];
  error.bindingInvocations = 0;
  error.adapterInvocations = 0;
  error.outboundAttempts = 0;
  error.governanceConsumptionEvents = 0;
  return error;
}

export async function verifySourcePins(sourcePins) {
  const actual = await collectV2SourcePins();
  const expectedKeys = Object.keys(sourcePins || {}).sort();
  const actualKeys = Object.keys(actual).sort();
  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys) || expectedKeys.some((key) => {
    return sourcePins[key]?.sha256 !== actual[key]?.sha256 || sourcePins[key]?.byteSize !== actual[key]?.byteSize;
  })) throw new TypeError("LIVE_V2_SOURCE_PIN_MISMATCH");
  return Object.entries(actual).map(([relativePath, record]) => ({ relativePath, ...record }));
}

export async function validateLivePreflight(input, { offline = false } = {}) {
  const trace = [];
  try {
    if (!offline) {
      const keys = input && typeof input === "object" ? Reflect.ownKeys(input) : [];
      if (keys.length !== 0 && keys.some((key) => key !== "governanceExecutionContract")) {
        throw new TypeError("LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED");
      }
      const result = await validateSealedLivePreflight(input, { offline: false });
      return result;
    }
    const validatedEnvelope = validateStrictLiveInput(input, { offlineEnvelope: true });
    trace.push("strict-live-api-shape");
    if (validatedEnvelope.credentialPresence.available !== true) throw attachPreflightEvidence(new TypeError("LIVE_V2_CREDENTIAL_MISSING"), trace);
    assertExactFixedInput(validatedEnvelope.fixedInput);
    if (validatedEnvelope.outputContract.expectedMinimum !== OUTPUT_CONTRACT.expectedMinimum ||
      JSON.stringify(validatedEnvelope.outputContract.requestBudget) !== JSON.stringify({ total: 24, list: 8, detail: 16 })) {
      throw attachPreflightEvidence(new TypeError("LIVE_V2_OUTPUT_CONTRACT_MISMATCH"), trace);
    }
    const result = await validateSealedLivePreflight({ governanceExecutionContract: validatedEnvelope.governanceExecutionContract }, { offline: true });
    trace.splice(0, trace.length, ...result.trace);
    return Object.freeze({ ...result, input: validatedEnvelope });
  } catch (error) {
    if (!error.preflightTrace) attachPreflightEvidence(error, trace);
    throw error;
  }
}

export async function runAuthorizedV2(governanceExecutionContract) {
  if (!governanceExecutionContract || typeof governanceExecutionContract !== "object" ||
    Object.hasOwn(governanceExecutionContract, "governanceExecutionContract") ||
    Object.hasOwn(governanceExecutionContract, "preflightComplete") ||
    Object.hasOwn(governanceExecutionContract, "liveCapability")) {
    throw new TypeError("LIVE_V2_CALLER_MUST_PROVIDE_GOVERNANCE_CONTRACT_ONLY");
  }
  const preflight = await validateLivePreflight({ governanceExecutionContract });
  const capability = acquireModulePrivateLiveCapability(preflight);
  const result = await runOfficialLiveExecution(preflight, capability);
  const evidenceResult = await finalizeV2Evidence(result, { publish: true });
  return {
    ...result,
    ...evidenceResult,
    preflightTrace: [...preflight.trace, "module-private-live-capability", "module-private-live-controller", "logical-request-created", "attempt-budget-reservation", "governance-consumption", "outbound-attempt"],
    packageId: V2_PACKAGE_ID,
    authorizationId: V2_AUTHORIZATION_ID,
    governanceDecisionId: V2_GOVERNANCE_DECISION_ID,
  };
}

export async function finalizeV2Evidence(execution, { publish = false, negativeFixtureRecords = null, writerForTest = null } = {}) {
  const sourceGraph = await collectV2SourceGraph();
  const governanceExecutionContract = execution?.governanceExecutionContract;
  if (!governanceExecutionContract) throw new TypeError("LIVE_V2_GOVERNANCE_CONTRACT_REQUIRED_FOR_EVIDENCE");
  const preflightEvidence = execution.preflightEvidence || await collectOfflinePreflightEvidence();
  const fixturePreflightEvidence = execution.preflightEvidence
    ? await collectOfflinePreflightEvidence()
    : preflightEvidence;
  const preflightRecords = fixturePreflightEvidence
    .filter((record) => record.disposition === "REJECTED")
    .map((record) => ({
      fixtureId: `preflight-${record.fixtureId}`,
      category: "Preflight Ordering",
      inputMutation: record.fixtureId,
      expectedDisposition: "REJECTED",
      observedDisposition: record.disposition,
      observedErrorCode: record.errorCode || null,
      bindingCount: record.bindingCount,
      attemptCount: record.attemptCount,
      consumptionEventCount: record.consumptionEventCount,
      observed: { trace: record.trace },
      verdict: record.disposition === "REJECTED" ? "PASS" : "FAIL",
    }));
  const records = negativeFixtureRecords || [
    ...preflightRecords,
    ...(await runNegativeFixtureSuite({
      validInput: createSyntheticLiveInput({ governanceExecutionContract }),
      governanceExecutionContract,
    })),
  ];
  const futureOutput = futureLiveEvidenceOutputContract();
  const evidenceExecution = {
    ...execution,
    preflightEvidence,
    negativeFixtureRecords: records,
    sourceInventoryDiagnostics: sourceGraph.diagnostics,
    outputIntegrity: {
      ...futureOutput,
      root: futureOutput.rootRelative,
      existingDestinationDeleted: false,
      directFinalWrite: false,
      futureLiveRootRelative: futureOutput.rootRelative,
      futureLiveFileStem: futureOutput.fileStem,
      futureLiveWriter: futureOutput.writer,
      collisionChecked: true,
      publishedFinalEvidence: false,
    },
  };
  const rawEvidence = assembleExternalGovernanceEvidence(evidenceExecution, sourceGraph.records, sourceGraph.diagnostics);
  const independentValidation = await validateExternalGovernanceEvidence(rawEvidence, {
    sourceInventory: sourceGraph.records,
    negativeFixtureRecords: records,
  });
  const result = {
    rawEvidence,
    independentValidation,
    evidenceStatus: independentValidation.status === "PASS" ? "INDEPENDENT_VALIDATION_PASS" : "INDEPENDENT_VALIDATION_FAIL",
    published: false,
  };
  if (independentValidation.status !== "PASS") return result;
  const finalEvidence = {
    ...rawEvidence,
    independentValidation,
    evidenceStatus: "INDEPENDENT_VALIDATION_PASS",
    finalStatus: "REC_QA_091_LIVE_V2_EVIDENCE_VALIDATED",
    publishedFinalEvidence: false,
  };
  if (!publish) return { ...result, finalEvidence };
  try {
    if (writerForTest && execution.mode !== "fixture") throw new TypeError("LIVE_V2_TEST_WRITER_OVERRIDE_PROHIBITED");
    const written = writerForTest
      ? await writerForTest(finalEvidence)
      : await writeFutureV2LiveEvidence(finalEvidence);
    return { ...result, finalEvidence: { ...finalEvidence, publishedFinalEvidence: true }, published: true, publishedFinalEvidence: true, written };
  } catch (error) {
    const failure = {
      integratedRunId: rawEvidence.integratedRunId,
      executionAuthorizationId: rawEvidence.executionAuthorizationId,
      governanceDecisionId: rawEvidence.governanceDecisionId,
      consumptionBoundary: rawEvidence.consumptionBoundary,
      consumptionEvidence: rawEvidence.governanceConsumptionEvidence,
      logicalRequestLedger: rawEvidence.logicalRequestLedger,
      outboundAttemptLedger: rawEvidence.outboundAttemptLedger,
      rawEventLedger: rawEvidence.rawEventLedger,
      writerErrorClass: error?.code || error?.name || "WRITER_FAILURE",
      publishedFinalEvidence: false,
      automaticRetry: 0,
      alternateOutput: false,
      overwrite: false,
      secondExecution: false,
    };
    return {
      ...result,
      finalEvidence: {
        ...finalEvidence,
        evidenceStatus: "PUBLISH_FAILED",
        finalStatus: "REC_QA_091_LIVE_V2_FINAL_WRITER_FAILED_AFTER_CONSUMPTION",
        writerFailure: failure,
        publishedFinalEvidence: false,
      },
      published: false,
      publishedFinalEvidence: false,
      writerFailure: failure,
    };
  }
}

export async function runOfflineFixtureForArchitecture() {
  return runOfflineArchitectureFixture();
}

export async function collectOfflinePreflightEvidence() {
  const sourcePins = await collectV2SourcePins();
  const governanceExecutionContract = {
    governanceDecisionId: V2_GOVERNANCE_DECISION_ID,
    executionAuthorizationId: V2_AUTHORIZATION_ID,
    executionState: "APPROVED",
    integratedRunAllowance: 1,
    fixedInput: { ...FIXED_INPUT },
    sourcePins,
    runtimePins: { node: "NOT_EXECUTED", browser: "NOT_EXECUTED" },
    requestBudget: { total: 24, list: 8, detail: 16, aggregate: 72 },
    concurrency: 4,
    retry: 0,
    allowedNetworkDestination: { protocol: "https", host: "api.themoviedb.org", port: 443 },
    consumptionBoundary: LIVE_CONSUMPTION_BOUNDARY,
    automaticRetry: 0,
    evidenceRoot: AUTHORIZATION_CONTRACT.evidenceRoot,
    evidenceFileStem: AUTHORIZATION_CONTRACT.evidenceFileStem,
    trustAuthority: "EXTERNAL_GOVERNANCE",
    authenticityTechnicallyVerified: false,
    technicalSingleConsumptionScope: "CURRENT_INTEGRATED_RUN_ONLY",
    processRestartReuseTechnicallyPrevented: false,
  };
  const base = createSyntheticLiveInput({ governanceExecutionContract });
  const observations = [];
  const cases = [
    { id: "valid-offline", input: base },
    { id: "missing-credential", input: { ...base, credentialPresence: { available: false } } },
    { id: "governance-unknown-field", input: { ...base, governanceExecutionContract: { ...base.governanceExecutionContract, unknown: true } } },
    { id: "fixed-input-mismatch", input: { ...base, fixedInput: { ...FIXED_INPUT, country: "kr" } } },
  ];
  for (const fixture of cases) {
    try {
      const result = await validateLivePreflight(fixture.input, { offline: true });
      observations.push({ fixtureId: fixture.id, disposition: "ACCEPTED", trace: result.trace, bindingCount: 0, attemptCount: 0, consumptionEventCount: 0 });
    } catch (error) {
      observations.push({ fixtureId: fixture.id, disposition: "REJECTED", errorCode: error.code || error.message, trace: error.preflightTrace || [], bindingCount: error.bindingInvocations || 0, attemptCount: error.outboundAttempts || 0, consumptionEventCount: error.governanceConsumptionEvents || 0 });
    }
  }
  return observations;
}

export function entrypointContract() {
  return Object.freeze({
    packageId: V2_PACKAGE_ID,
    governanceDecisionId: V2_GOVERNANCE_DECISION_ID,
    executionAuthorizationId: V2_AUTHORIZATION_ID,
    acceptedFields: [...LIVE_INPUT_FIELDS],
    governanceFields: [...GOVERNANCE_EXECUTION_FIELDS],
    preflightOrder: [
      "strict-live-api-shape", "repository-source-runtime-pin", "fixed-input", "output-collision",
      "credential-presence", "immutable-tmdb-allowlist", "governance-execution-contract",
      "module-local-sealed-binding", "single-outbound-controller", "logical-request-created",
      "attempt-budget-reservation", "governance-consumption", "outbound-attempt-start", "actual-transport-invocation",
    ],
    preflightFailuresHaveZeroConsumption: true,
    callerProvides: "governanceExecutionContract-only",
    liveCapablePublicExports: ["runAuthorizedV2"],
    modulePrivateLiveCapability: true,
    callerCreatedPreflightLiveReachability: 0,
    publicControllerNetworkInertByDefault: true,
    fixtureTransportOnlyOutsideOfficialLivePath: true,
    trustModel: "EXTERNAL_GOVERNANCE",
    authenticityTechnicallyVerified: false,
    processRestartReuseTechnicallyPrevented: false,
  });
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  process.stderr.write("V2 live entrypoint is library-only; use the offline fixture command for architecture evidence.\n");
  process.exitCode = 2;
}
