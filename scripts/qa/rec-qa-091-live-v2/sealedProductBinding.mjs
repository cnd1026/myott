import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clearTmdbRequestCache } from "../../../src/lib/providers/tmdb/requestContext.js";
import { diagnoseTmdbCandidateUniverse, discoverTmdb, hasTmdbKey } from "../../../lib/tmdb.js";
import {
  createTmdbObservabilitySession,
  finalizeTmdbObservabilitySession,
  TMDB_OBSERVABILITY_LIMITS,
} from "../../../src/lib/recommendation/qa/tmdbObservability.js";
import { createOutboundController, fixedOutboundLimits, outboundControllerContract } from "./outboundController.mjs";
import { createFixtureRequestContext, createFixtureTransport } from "./fixtures.mjs";
import { RequestLifecycleReducer, createRequestLifecycleContext } from "./requestLifecycle.mjs";
import {
  FIXED_INPUT,
  OUTPUT_CONTRACT,
  V2_FINDING_ID,
  V2_TASK_ID,
  validateStrictLiveInput,
} from "./inputContract.mjs";
import {
  AUTHORIZATION_CONTRACT,
  createSyntheticGovernanceExecutionContract,
  validateGovernanceExecutionContract,
} from "./authorizationContract.mjs";
import { collectV2SourcePins } from "./sourceInventory.mjs";
import { resolveFutureV2LiveEvidenceOutput } from "./evidenceAssembler.mjs";

const PRODUCT_FILTERS = Object.freeze(["country-us", "genre-horror"]);
const PRODUCT_CONTENT_TYPES = Object.freeze(["drama"]);
const MODULE_FETCH_REFERENCE = globalThis.fetch;
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const PACKAGE_PINS = Object.freeze({
  "package.json": "6322c73d9b444fb756cb4107cb03c10e39e966cbd7cd4d2eb0f2a8643e4ce800",
  "pnpm-lock.yaml": "288c70c3c4f6510d295a2dac4a534b1c6c2b3264457821761c2fad95f55c4cd3",
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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

function makeModuleLocalBinding() {
  return Object.freeze({ discover: discoverTmdb, diagnose: diagnoseTmdbCandidateUniverse, source: "lib/tmdb.js" });
}

function safeListPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.results)) {
    const error = new Error("LIVE_V2_LIST_RESPONSE_INVALID");
    error.code = error.message;
    throw error;
  }
  let serialized;
  try {
    serialized = JSON.stringify(payload);
  } catch {
    const error = new Error("LIVE_V2_LIST_RESPONSE_INVALID");
    error.code = error.message;
    throw error;
  }
  if (new TextEncoder().encode(serialized).byteLength > TMDB_OBSERVABILITY_LIMITS.maximumPayloadBytes ||
    payload.results.length > TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry) {
    const error = new Error("LIVE_V2_LIST_RESPONSE_RESOURCE_LIMIT_EXCEEDED");
    error.code = error.message;
    throw error;
  }
  const safeFields = ["id", "name", "title", "original_name", "original_title", "first_air_date", "genre_ids", "origin_country", "media_type", "popularity", "vote_average", "vote_count"];
  if (payload.results.some((item) => !item || typeof item !== "object" || Array.isArray(item) || !Number.isSafeInteger(item.id))) {
    const error = new Error("LIVE_V2_LIST_RESPONSE_INVALID");
    error.code = error.message;
    throw error;
  }
  return {
    page: Number.isSafeInteger(payload.page) ? payload.page : null,
    total_pages: Number.isSafeInteger(payload.total_pages) ? payload.total_pages : null,
    total_results: Number.isSafeInteger(payload.total_results) ? payload.total_results : payload.results.length,
    results: payload.results.map((item) => Object.fromEntries(safeFields.filter((key) => Object.hasOwn(item, key)).map((key) => [key, clone(item[key])]))),
  };
}

export async function captureListResponse(response) {
  let cloned;
  try {
    if (!response || typeof response.clone !== "function") throw new Error("clone unavailable");
    cloned = response.clone();
  } catch {
    const error = new Error("LIVE_V2_LIST_RESPONSE_CLONE_FAILED");
    error.code = error.message;
    throw error;
  }
  try {
    if (!cloned || typeof cloned.json !== "function") throw new Error("json unavailable");
    return safeListPayload(await cloned.json());
  } catch (error) {
    if (error?.code === "LIVE_V2_LIST_RESPONSE_RESOURCE_LIMIT_EXCEEDED" || error?.code === "LIVE_V2_LIST_RESPONSE_INVALID") throw error;
    const normalized = new Error("LIVE_V2_LIST_RESPONSE_INVALID_JSON");
    normalized.code = normalized.message;
    throw normalized;
  }
}

function createCaptureFixtureTransport({ listPayloadCaptures, runId, runMode, transportReference = MODULE_FETCH_REFERENCE }) {
  if (transportReference === MODULE_FETCH_REFERENCE) throw new TypeError("LIVE_V2_PRODUCTION_TRANSPORT_PROHIBITED_IN_FIXTURE");
  return async (url, options = {}) => {
    const response = await transportReference(url, { ...options, redirect: "manual" });
    const parsed = new URL(url);
    if (parsed.hostname === AUTHORIZATION_CONTRACT.allowedNetworkDestination.host && parsed.pathname === "/3/discover/tv" && typeof response?.clone === "function") {
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
          captureErrorCode: error?.code || "LIVE_V2_LIST_RESPONSE_CAPTURE_FAILED",
        });
      }
    }
    return response;
  };
}

export function createSealedCaptureFixtureTransport({ fetchImpl, listPayloadCaptures = [], runId = "fixture-capture", runMode = "cold" } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("LIVE_V2_FIXTURE_TRANSPORT_REQUIRED");
  return createCaptureFixtureTransport({ listPayloadCaptures, runId, runMode, transportReference: fetchImpl });
}

async function runPhase({ runMode, runIndex, controller, activeLifecycle, calls, listPayloadCaptures, cachedListPayload, binding, mode }) {
  const runId = `REC-QA-091-V2-${runMode}-${runIndex + 1}`;
  const session = createTmdbObservabilitySession({
    runId,
    runMode,
    sourceComponent: "scripts/qa/rec-qa-091-live-v2/sealedProductBinding.mjs",
  });
  const reducer = new RequestLifecycleReducer();
  const transport = controller.fetch;
  if (mode !== "fixture") throw new TypeError("LIVE_V2_LIVE_PRODUCT_BINDING_PRIVATE_ONLY");
  const baseContext = createFixtureRequestContext({ observer: session, transport, calls });
  const lifecycle = createRequestLifecycleContext({ reducer, baseContext, controller, runId, runMode });
  activeLifecycle.current = lifecycle;
  const productInput = buildProductInput();
  assertProductInput(productInput);
  const oldKey = process.env.TMDB_API_KEY;
  const oldBearer = process.env.TMDB_BEARER_TOKEN;
  if (mode === "fixture") {
    process.env.TMDB_API_KEY = "synthetic-fixture-key";
    delete process.env.TMDB_BEARER_TOKEN;
  }
  try {
    if (runMode === "cold") clearTmdbRequestCache();
    const discovery = await binding.discover({
      filters: productInput.filters,
      contentTypes: productInput.contentTypes,
      limit: productInput.limit,
      requestContext: lifecycle.requestContext,
      detailLimit: 0,
      candidateSource: mode === "fixture" ? "rec-qa-091-v2-deterministic-fixture-list" : "rec-qa-091-v2-sealed-live-product-list",
    });
    const captured = mode === "fixture"
      ? calls.find((entry) => entry.path === "/discover/tv")?.payload || cachedListPayload
      : listPayloadCaptures.filter((entry) => entry.runId === runId && entry.payload).at(-1)?.payload || cachedListPayload;
    if (!captured || !Array.isArray(captured.results)) {
      const error = new Error("LIVE_V2_LIVE_CAPTURE_REQUIRED");
      error.code = error.message;
      throw error;
    }
    const capturedSafe = safeListPayload(captured);
    const productDiagnostics = {
      providerTotalResultsByTask: clone(discovery.diagnostics?.providerTotalResultsByTask || {}),
      fetchedPagesByTask: clone(discovery.diagnostics?.fetchedPagesByTask || {}),
    };
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
      source: calls.some((entry) => entry.path === "/discover/tv") ? "transport-response" : "warm-cache-reuse",
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
      mode,
      session,
      ledger,
      discovery: clone(discovery),
      result: clone(diagnostic),
      lifecycleEvents: reducer.events(),
      logicalRequestLedger: reducer.logicalRequestLedger(),
      calls: clone(calls),
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
  } finally {
    if (oldKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = oldKey;
    if (oldBearer === undefined) delete process.env.TMDB_BEARER_TOKEN;
    else process.env.TMDB_BEARER_TOKEN = oldBearer;
  }
}

async function runThreePhases({ transportFactory, mode, governanceExecutionContract }) {
  if (mode !== "fixture") throw new TypeError("LIVE_V2_LIVE_PRODUCT_BINDING_PRIVATE_ONLY");
  const activeLifecycle = { current: null };
  const callsByRun = new Map();
  const listPayloadCaptures = [];
  let fixedTransport;
  const binding = makeModuleLocalBinding();
  const consumptionState = { consumed: false, event: null };
  const controller = createOutboundController({
    mode: "fixture",
    fetchImpl: async (url, options) => fixedTransport(url, options),
    getCurrentRequest: () => activeLifecycle.current?.getCurrentRequest(),
    limits: fixedOutboundLimits(),
    integratedRunId: "REC-QA-091-V2-INTEGRATED-RUN",
    governanceExecutionContract,
    consumptionState,
    runtimeIntegrityCheck: () => true,
    onAttemptStart: (event) => activeLifecycle.current?.reducer.recordAttemptStart(event),
    onAttemptTerminal: (event) => activeLifecycle.current?.reducer.recordAttemptTerminal(event),
  });
  const runs = [];
  let cachedListPayload = null;
  for (const [index, runMode] of ["cold", "warm-prime", "warm-measure"].entries()) {
    const calls = [];
    fixedTransport = transportFactory({ runMode, calls, listPayloadCaptures });
    const run = await runPhase({ runMode, runIndex: index, controller, activeLifecycle, calls, listPayloadCaptures, cachedListPayload, binding, mode });
    cachedListPayload ||= run.listPayload;
    callsByRun.set(run.runId, calls);
    runs.push({ ...run, calls });
  }
  const attemptLedger = controller.attempts();
  const controllerEvents = controller.events();
  return {
    integratedRunId: "REC-QA-091-V2-INTEGRATED-RUN",
    runs: runs.map((run) => ({
      ...run,
      outboundAttemptLedger: attemptLedger.filter((entry) => entry.runId === run.runId),
      controllerEvents: controllerEvents.filter((entry) => entry.runId === run.runId ||
        entry.type === "governance-consumption" && run.runMode === "cold"),
    })),
    controller,
    callsByRun,
    listPayloadCaptures,
    bindingInvocationCount: runs.reduce((sum, run) => sum + run.bindingInvocationCount, 0),
    bindingResolvedBeforeController: true,
    fixedInput: clone(FIXED_INPUT),
    outputContract: clone(OUTPUT_CONTRACT),
    outboundContract: outboundControllerContract(),
    governanceExecutionContract: clone(governanceExecutionContract),
    governanceConsumptionEvidence: controller.events().filter((event) => event.type === "governance-consumption"),
    externalNetworkAttempts: 0,
    liveTmdbAttempts: 0,
    authorizationConsumption: controller.isConsumed() ? 1 : 0,
  };
}

export async function runOfflineArchitectureFixture() {
  const execution = await runThreePhases({
    mode: "fixture",
    transportFactory: ({ calls }) => createFixtureTransport({ calls }),
    governanceExecutionContract: createSyntheticGovernanceExecutionContract({ sourcePins: {
      "scripts/qa/rec-qa-091-live-v2/fixture-contract.mjs": { sha256: "0".repeat(64), byteSize: 0 },
    } }),
  });
  const attemptLedger = execution.controller.attempts();
  const controllerEvents = execution.controller.events();
  return {
    ...execution,
    runs: execution.runs.map((run) => ({
      ...run,
      outboundAttemptLedger: attemptLedger.filter((entry) => entry.runId === run.runId),
      controllerEvents: controllerEvents.filter((entry) => entry.runId === run.runId || entry.type === "budget-reservation" && entry.runId === run.runId || entry.type === "governance-consumption" && run.runMode === "cold"),
    })),
    authorizationConsumption: execution.controller.isConsumed() ? 1 : 0,
    externalNetworkAttempts: 0,
    liveTmdbAttempts: 0,
    mode: "fixture",
    taskId: V2_TASK_ID,
    findingId: V2_FINDING_ID,
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

function isExactPinSet(expected, actual) {
  const expectedKeys = Object.keys(expected || {}).sort();
  const actualKeys = Object.keys(actual || {}).sort();
  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) return false;
  return expectedKeys.every((key) => expected[key]?.sha256 === actual[key]?.sha256 && expected[key]?.byteSize === actual[key]?.byteSize);
}

async function verifyRepositoryAnchors() {
  for (const [relativePath, expectedSha256] of Object.entries(PACKAGE_PINS)) {
    const bytes = await readFile(resolve(REPOSITORY_ROOT, relativePath));
    if (hashBytes(bytes) !== expectedSha256) throw new TypeError(`LIVE_V2_REPOSITORY_PIN_MISMATCH:${relativePath}`);
  }
  return true;
}

async function verifyRuntimePins(runtimePins, { offline = false } = {}) {
  if (offline) return true;
  const nodePin = runtimePins?.node;
  if (!nodePin || nodePin === "NOT_EXECUTED") throw new TypeError("LIVE_V2_NODE_RUNTIME_PIN_REQUIRED");
  const actualPath = resolve(process.execPath);
  if (nodePin.path && resolve(nodePin.path) !== actualPath) throw new TypeError("LIVE_V2_NODE_RUNTIME_PATH_MISMATCH");
  const bytes = await readFile(actualPath);
  if (hashBytes(bytes) !== nodePin.sha256 || bytes.byteLength !== nodePin.byteSize) throw new TypeError("LIVE_V2_NODE_RUNTIME_PIN_MISMATCH");
  if (nodePin.version && nodePin.version !== process.versions.node) throw new TypeError("LIVE_V2_NODE_RUNTIME_VERSION_MISMATCH");
  return true;
}

export async function verifySourcePins(sourcePins) {
  const actual = await collectV2SourcePins();
  if (!isExactPinSet(sourcePins, actual)) throw new TypeError("LIVE_V2_SOURCE_PIN_MISMATCH");
  const results = [];
  for (const [relativePath, record] of Object.entries(actual)) {
    const absolutePath = resolve(REPOSITORY_ROOT, relativePath);
    const relation = relative(REPOSITORY_ROOT, absolutePath);
    if (!relation || relation.startsWith("..") || relation.includes(":")) throw new TypeError("LIVE_V2_SOURCE_PIN_PATH_INVALID");
    await access(absolutePath);
    const bytes = await readFile(absolutePath);
    const fileStat = await stat(absolutePath);
    if (hashBytes(bytes) !== record.sha256 || bytes.byteLength !== record.byteSize) throw new TypeError(`LIVE_V2_SOURCE_PIN_MISMATCH:${relativePath}`);
    results.push({ relativePath, sha256: record.sha256, byteSize: record.byteSize, modifiedMs: fileStat.mtimeMs });
  }
  return results;
}

async function assertOutputCollisionContract(contract, { offline = false } = {}) {
  if (contract.evidenceRoot !== AUTHORIZATION_CONTRACT.evidenceRoot || contract.evidenceFileStem !== AUTHORIZATION_CONTRACT.evidenceFileStem) {
    throw new TypeError("LIVE_V2_OUTPUT_COLLISION_CONTRACT_MISMATCH");
  }
  const target = await resolveFutureV2LiveEvidenceOutput();
  if (!offline) {
    try {
      await access(target);
      throw new TypeError("LIVE_V2_OUTPUT_DESTINATION_COLLISION");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return { checked: true, collision: false, target, offline, writer: "correction-7-immutable-no-clobber" };
}

export async function validateSealedLivePreflight(input, { offline = false } = {}) {
  const trace = [];
  try {
    const rawContract = input?.governanceExecutionContract ? input.governanceExecutionContract : input;
    const frozenInput = validateStrictLiveInput({ governanceExecutionContract: rawContract });
    trace.push("strict-live-api-shape");
    await verifyRepositoryAnchors();
    const actualSourcePins = await collectV2SourcePins();
    if (!isExactPinSet(rawContract?.sourcePins, actualSourcePins)) throw new TypeError("LIVE_V2_SOURCE_PIN_MISMATCH");
    const sourcePins = await verifySourcePins(rawContract.sourcePins);
    await verifyRuntimePins(rawContract.runtimePins, { offline });
    trace.push("repository-source-runtime-pin");
    if (JSON.stringify(rawContract.fixedInput) !== JSON.stringify(FIXED_INPUT)) throw new TypeError("LIVE_V2_FIXED_INPUT_MISMATCH");
    trace.push("fixed-input");
    const outputCollision = await assertOutputCollisionContract(rawContract, { offline });
    trace.push("output-collision");
    if (!offline && !hasTmdbKey()) throw new TypeError("LIVE_V2_CREDENTIAL_MISSING");
    trace.push("credential-presence");
    const allowlist = outboundControllerContract();
    if (allowlist.host !== AUTHORIZATION_CONTRACT.allowedNetworkDestination.host || allowlist.redirectMode !== "manual") {
      throw new TypeError("LIVE_V2_ALLOWLIST_CONSTRUCTION_FAILED");
    }
    trace.push("immutable-tmdb-allowlist");
    const governanceExecutionContract = validateGovernanceExecutionContract(frozenInput.governanceExecutionContract);
    trace.push("governance-execution-contract");
    return Object.freeze({ input: frozenInput, governanceExecutionContract, trace, outputCollision, sourcePins, bindingInvocations: 0, adapterInvocations: 0, outboundAttempts: 0, consumption: 0, governanceConsumptionEvents: 0, preflightComplete: true });
  } catch (error) {
    throw attachPreflightEvidence(error, trace);
  }
}

export function sealedBindingContract() {
  return Object.freeze({
    productExports: ["discoverTmdb", "diagnoseTmdbCandidateUniverse"],
    publicLiveCapableExports: [],
    officialLiveEntryPoint: "scripts/qa/rec-qa-091-live-v2/entrypoint.mjs#runAuthorizedV2",
    publicControllerMode: "FIXTURE_ONLY",
    moduleLocal: true,
    callerAdapterInjection: false,
    callerFetchInjection: false,
    callerTransportInjection: false,
    callerConsumptionRecorderInjection: false,
    internalPreflightRequired: true,
    fixtureRunnerSeparate: true,
    runtimeTransportReference: "MODULE_LOCAL_CAPTURE_WITH_RUNTIME_INTEGRITY_CHECK",
    liveListCaptureSource: "SEALED_TRANSPORT_RESPONSE_CLONE",
    externalGovernanceTrustModel: true,
  });
}
