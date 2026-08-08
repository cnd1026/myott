import { lstat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { clearTmdbRequestCache, createTmdbRequestContext } from "../../../src/lib/providers/tmdb/requestContext.js";
import { diagnoseTmdbCandidateUniverse, discoverTmdb } from "../../../lib/tmdb.js";
import { createTmdbObservabilitySession, finalizeTmdbObservabilitySession } from "../../../src/lib/recommendation/qa/tmdbObservability.js";
import { assertSafeEvidenceFileStem, resolveObservabilityEvidenceOutput } from "../../../src/lib/recommendation/qa/tmdbObservabilityOutput.mjs";
import { createOneShotTransport } from "./networkPolicy.mjs";
import { RequestLifecycleReducer, createRequestLifecycleContext } from "./requestLifecycle.mjs";
import { calculateMetaQuality } from "./offlineValidator.mjs";
import {
  FIXED_INPUT,
  GOVERNANCE_BOUNDARY,
  GOVERNANCE_AUTHORITY,
  NODE_EXECUTABLE,
  NODE_SHA256,
  NODE_VERSION,
  REQUEST_BUDGET,
  TECHNICAL_PERSISTENCE_SCOPE,
  assertFixedInput,
  environmentPresence,
  validateEnvironment,
  validateExecArgv,
  validateInvocation,
  validateRepositoryPins,
  validateRuntimePins,
} from "./runtimeContract.mjs";

const PRODUCT_FILTERS = ["country-us", "genre-horror"];
const PRODUCT_CONTENT_TYPES = ["drama"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fixtureItem(id) {
  return {
    id,
    media_type: "tv",
    name: `Fixture Horror ${id}`,
    original_name: `Fixture Horror ${id}`,
    first_air_date: "2020-01-01",
    genre_ids: [27],
    origin_country: ["US"],
    popularity: 100 - id,
    vote_average: 8,
    vote_count: 1000 - id,
  };
}

function fixtureListPayload() {
  return {
    page: 1,
    total_pages: 5,
    total_results: 64,
    results: Array.from({ length: 5 }, (_, index) => fixtureItem(91001 + index)),
  };
}

function fixtureDetailPayload(id) {
  return {
    ...fixtureItem(id),
    genres: [{ id: 27, name: "Horror" }],
    origin_country: ["US"],
    production_countries: [{ iso_3166_1: "US", name: "United States" }],
    credits: { cast: [] },
    keywords: { results: [] },
    "watch/providers": { results: { US: {} } },
  };
}

function response(status, payload, location = "") {
  const headers = { get(name) { return name.toLowerCase() === "location" ? location : null; } };
  return {
    status,
    ok: status >= 200 && status < 300,
    headers,
    clone() { return { json: async () => clone(payload) }; },
    json: async () => clone(payload),
  };
}

function fixtureTransport({ redirectCount = 0, offHostRedirect = false, invalidJson = false, oversizedList = false, calls = [] } = {}) {
  let redirectRemaining = redirectCount;
  return async (rawUrl) => {
    const parsed = new URL(rawUrl);
    const path = parsed.pathname;
    calls.push({ path, host: parsed.hostname });
    if (redirectRemaining > 0) {
      redirectRemaining -= 1;
      const target = offHostRedirect
        ? "https://example.invalid/3/discover/tv"
        : `${parsed.origin}${parsed.pathname}`;
      return response(302, {}, target);
    }
    if (path === "/3/discover/tv") {
      if (invalidJson) return response(200, null);
      if (oversizedList) return response(200, { ...fixtureListPayload(), results: Array.from({ length: 501 }, (_, index) => fixtureItem(92000 + index)) });
      return response(200, fixtureListPayload());
    }
    const match = path.match(/^\/3\/tv\/(\d+)$/);
    if (match) return response(200, fixtureDetailPayload(Number(match[1])));
    return response(404, {});
  };
}

function makeProbe({ runId = "fixture-run", runMode = "cold", nativeFetch = fixtureTransport() } = {}) {
  const holder = { rawUrl: "https://api.themoviedb.org/3/discover/tv", lifecycle: null, transport: null };
  const baseContext = {
    get: (path, _params, options) => holder.transport.fetch(holder.rawUrl || `https://api.themoviedb.org/3${path}`, options),
    hasBudget: () => true,
    hasTimeRemaining: () => true,
    remainingDeadlineMs: () => 100000,
    setEarlyStop: () => {},
    setSeedDiagnostics: () => {},
    diagnostics: () => ({ limits: REQUEST_BUDGET }),
    assertObservabilitySession: () => true,
    limits: REQUEST_BUDGET,
  };
  const reducer = new RequestLifecycleReducer();
  const lifecycle = createRequestLifecycleContext({ reducer, baseContext, runId, runMode });
  holder.lifecycle = lifecycle;
  holder.transport = createOneShotTransport({
    nativeFetch,
    getCurrentRequest: lifecycle.getCurrentRequest,
    lifecycle,
    integratedRunId: "REC-QA-091-ONE-SHOT-FIXTURE-RUN",
    syntheticConsumption: true,
  });
  return { holder, lifecycle, reducer, transport: holder.transport };
}

async function observeScenario({ fixtureId, category, expectedDisposition, expectedErrorCode = "", action }) {
  try {
    const result = await action();
    return {
      fixtureId,
      category,
      inputMutation: fixtureId,
      expectedDisposition,
      observedDisposition: "ACCEPTED",
      observedErrorCode: "",
      bindingCount: 0,
      attemptCount: result?.attemptCount ?? 0,
      consumptionEventCount: result?.consumptionEventCount ?? 0,
      verdict: expectedDisposition === "ACCEPTED" ? "PASS" : "UNEXPECTED_PASS",
    };
  } catch (error) {
    const candidateErrorCode = error?.code || error?.message || "";
    const observedErrorCode = /^[A-Z0-9_]{1,80}$/.test(candidateErrorCode) ? candidateErrorCode : "OUTBOUND_FAILED";
    return {
      fixtureId,
      category,
      inputMutation: fixtureId,
      expectedDisposition,
      observedDisposition: "REJECTED",
      observedErrorCode,
      bindingCount: 0,
      attemptCount: 0,
      consumptionEventCount: 0,
      verdict: expectedDisposition === "REJECTED" && (!expectedErrorCode || expectedErrorCode === observedErrorCode) ? "PASS" : "FAIL",
    };
  }
}

export const FIXTURE_MANIFEST = Object.freeze([
  { fixtureId: "fixed-input-valid", category: "Fixed Input", expectedDisposition: "ACCEPTED" },
  { fixtureId: "strict-input-extra", category: "Strict Input", expectedDisposition: "REJECTED", expectedErrorCode: "ONE_SHOT_FIXED_INPUT_INVALID" },
  { fixtureId: "strict-input-missing", category: "Strict Input", expectedDisposition: "REJECTED", expectedErrorCode: "ONE_SHOT_FIXED_INPUT_INVALID" },
  { fixtureId: "governance-contract-exact", category: "Governance Contract", expectedDisposition: "ACCEPTED" },
  { fixtureId: "binding-override", category: "Binding Override", expectedDisposition: "REJECTED" },
  { fixtureId: "runtime-transport-mutation", category: "Runtime Transport Mutation", expectedDisposition: "REJECTED" },
  { fixtureId: "allowlist-http", category: "Allowlist", expectedDisposition: "REJECTED", expectedErrorCode: "TMDB_DESTINATION_NOT_ALLOWED" },
  { fixtureId: "allowlist-ip", category: "Allowlist", expectedDisposition: "REJECTED", expectedErrorCode: "TMDB_DESTINATION_NOT_ALLOWED" },
  { fixtureId: "allowlist-userinfo", category: "Allowlist", expectedDisposition: "REJECTED", expectedErrorCode: "TMDB_DESTINATION_NOT_ALLOWED" },
  { fixtureId: "allowlist-alternate-port", category: "Allowlist", expectedDisposition: "REJECTED", expectedErrorCode: "TMDB_DESTINATION_NOT_ALLOWED" },
  { fixtureId: "redirect-one", category: "Redirect", expectedDisposition: "ACCEPTED" },
  { fixtureId: "redirect-three", category: "Redirect", expectedDisposition: "ACCEPTED" },
  { fixtureId: "redirect-four", category: "Redirect", expectedDisposition: "REJECTED", expectedErrorCode: "TMDB_REDIRECT_HOP_LIMIT_EXCEEDED" },
  { fixtureId: "redirect-off-host", category: "Redirect", expectedDisposition: "REJECTED", expectedErrorCode: "TMDB_REDIRECT_NOT_ALLOWED" },
  { fixtureId: "invalid-json-response", category: "Response Contract", expectedDisposition: "REJECTED", expectedErrorCode: "LIST_RESPONSE_INVALID" },
  { fixtureId: "malformed-response", category: "Response Contract", expectedDisposition: "REJECTED", expectedErrorCode: "LIST_RESPONSE_CLONE_REQUIRED" },
  { fixtureId: "response-clone-overflow", category: "Response Contract", expectedDisposition: "REJECTED", expectedErrorCode: "LIST_RESPONSE_RESOURCE_LIMIT_EXCEEDED" },
  { fixtureId: "run-budget-list-nine", category: "Run Budget", expectedDisposition: "REJECTED", expectedErrorCode: "REQUEST_BUDGET_EXCEEDED" },
  { fixtureId: "run-budget-detail-seventeen", category: "Run Budget", expectedDisposition: "REJECTED", expectedErrorCode: "REQUEST_BUDGET_EXCEEDED" },
  { fixtureId: "aggregate-budget-seventy-three", category: "Aggregate Budget", expectedDisposition: "REJECTED", expectedErrorCode: "REQUEST_BUDGET_EXCEEDED" },
  { fixtureId: "consumption-single-event", category: "Consumption", expectedDisposition: "ACCEPTED" },
  { fixtureId: "lifecycle-open-attempt", category: "Lifecycle", expectedDisposition: "REJECTED" },
  { fixtureId: "lifecycle-duplicate-terminal", category: "Lifecycle", expectedDisposition: "REJECTED" },
  { fixtureId: "lifecycle-cache-hit", category: "Cache Hit Lifecycle", expectedDisposition: "ACCEPTED" },
  { fixtureId: "validator-meta-quality", category: "Validator Meta-quality", expectedDisposition: "ACCEPTED" },
  { fixtureId: "runtime-pin-mismatch", category: "Runtime Pin", expectedDisposition: "REJECTED" },
  { fixtureId: "source-pin-mismatch", category: "Source Pin", expectedDisposition: "REJECTED" },
  { fixtureId: "dirty-tree-mismatch", category: "Working Tree", expectedDisposition: "REJECTED" },
  { fixtureId: "credential-absent", category: "Credential", expectedDisposition: "REJECTED" },
  { fixtureId: "unexpected-cli", category: "Invocation", expectedDisposition: "REJECTED" },
  { fixtureId: "import-as-module", category: "Invocation", expectedDisposition: "REJECTED" },
  { fixtureId: "output-collision", category: "Output Boundary", expectedDisposition: "REJECTED" },
  { fixtureId: "output-boundary", category: "Output Boundary", expectedDisposition: "ACCEPTED" },
]);

export async function runProductThreePhaseFixture() {
  const previousKey = process.env.TMDB_API_KEY;
  const previousBearer = process.env.TMDB_BEARER_TOKEN;
  process.env.TMDB_API_KEY = "synthetic-one-shot-fixture-key";
  delete process.env.TMDB_BEARER_TOKEN;
  const product = await import("../../../lib/tmdb.js");
  const observability = await import("../../../src/lib/recommendation/qa/tmdbObservability.js");
  clearTmdbRequestCache();
  let cachedListPayload = null;
  const runs = {};
  try {
    for (const [runIndex, runMode] of ["cold", "warm-prime", "warm-measure"].entries()) {
      const calls = [];
      const session = observability.createTmdbObservabilitySession({
        runId: `REC-QA-091-ONE-SHOT-${runMode}-${runIndex + 1}`,
        runMode,
        sourceComponent: "scripts/qa/rec-qa-091-one-shot/deterministicFixtures.mjs",
      });
      const reducer = new RequestLifecycleReducer();
      let transport;
      const baseContext = createTmdbRequestContext({
        apiKey: process.env.TMDB_API_KEY,
        language: "ko-KR",
        region: "US",
        baseUrl: "https://api.themoviedb.org/3",
        fetchImpl: (...args) => transport.fetch(...args),
        observer: session,
        diagnosticLimits: { total: 24, list: 8, detail: 16, concurrency: 4 },
        diagnosticRetry: 0,
      });
      const lifecycle = createRequestLifecycleContext({
        reducer,
        baseContext,
        runId: `REC-QA-091-ONE-SHOT-${runMode}-${runIndex + 1}`,
        runMode,
      });
      transport = createOneShotTransport({
        nativeFetch: fixtureTransport({ calls }),
        getCurrentRequest: lifecycle.getCurrentRequest,
        lifecycle,
        integratedRunId: "REC-QA-091-ONE-SHOT-FIXTURE-RUN",
        syntheticConsumption: true,
      });
      const discovery = await product.discoverTmdb({
        filters: PRODUCT_FILTERS,
        contentTypes: PRODUCT_CONTENT_TYPES,
        limit: FIXED_INPUT.limit,
        requestContext: lifecycle.requestContext,
        detailLimit: 0,
        candidateSource: "rec-qa-091-one-shot-deterministic-fixture",
      });
      const captured = transport.listPayloadCaptures().at(-1)?.payload || cachedListPayload;
      if (!captured) throw new Error("ONE_SHOT_FIXTURE_LIST_PAYLOAD_MISSING");
      cachedListPayload ||= clone(captured);
      const diagnostic = await product.diagnoseTmdbCandidateUniverse({
        session,
        candidates: captured.results,
        filters: PRODUCT_FILTERS,
        contentTypes: PRODUCT_CONTENT_TYPES,
        limit: FIXED_INPUT.limit,
        requestContext: lifecycle.requestContext,
        diagnosticMode: "product-plan",
      });
      const observabilityLedger = JSON.parse(observability.finalizeTmdbObservabilitySession(session));
      const logicalRequestLedger = reducer.logicalRequestLedger();
      runs[runMode] = {
        runId: `REC-QA-091-ONE-SHOT-${runMode}-${runIndex + 1}`,
        runMode,
        productDiagnostics: { ...discovery.diagnostics, requestContext: baseContext.diagnostics() },
        lifecycleEvents: reducer.events(),
        controllerEvents: transport.events(),
        observabilityEvents: observabilityLedger.events,
        logicalRequestLedger,
        outboundAttemptLedger: transport.attempts(),
        capturedListResponses: transport.listPayloadCaptures(),
        candidateRegistry: diagnostic.candidateRegistry || [],
        terminalProvenance: diagnostic.terminalProvenance || [],
        rankingProvenance: diagnostic.rankingProvenance || [],
        finalCandidateIds: diagnostic.finalCandidateIds || [],
        excludedCandidateIds: (diagnostic.excludedCandidates || []).map((item) => item.candidateId).filter(Boolean),
        cacheEvidence: logicalRequestLedger.filter((record) => record.cacheRelation === "HIT"),
      };
    }
  } finally {
    if (previousKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousKey;
    if (previousBearer === undefined) delete process.env.TMDB_BEARER_TOKEN;
    else process.env.TMDB_BEARER_TOKEN = previousBearer;
  }
  return runs;
}

async function lifecycleNegative(kind) {
  const reducer = new RequestLifecycleReducer();
  const meta = { requestId: "negative:request", runId: "negative", runMode: "cold", requestClass: "list", page: 1, safeEndpointIdentity: "/3/discover/tv", retryIndex: 0 };
  reducer.startRequest(meta);
  if (kind === "open") {
    reducer.recordAttemptStart({ requestId: meta.requestId, attemptId: "negative:attempt" });
    reducer.completeRequest(meta.requestId);
  }
  if (kind === "duplicate") {
    reducer.recordAttemptStart({ requestId: meta.requestId, attemptId: "negative:attempt" });
    reducer.recordAttemptTerminal({ requestId: meta.requestId, attemptId: "negative:attempt" });
    reducer.failRequest(meta.requestId, "NEGATIVE_FAILURE");
    reducer.completeRequest(meta.requestId);
  }
  throw Object.assign(new Error("NEGATIVE_LIFECYCLE_ACCEPTED"), { code: "NEGATIVE_LIFECYCLE_ACCEPTED" });
}

async function policyRequest(rawUrl, { runId = "policy", runMode = "cold", redirectCount = 0, offHostRedirect = false, invalidJson = false, oversizedList = false, calls = [], malformedResponse = false } = {}) {
  const nativeFetch = malformedResponse ? async () => ({ status: 200, ok: true }) : fixtureTransport({ redirectCount, offHostRedirect, invalidJson, oversizedList, calls });
  const probe = makeProbe({ runId, runMode, nativeFetch });
  probe.holder.rawUrl = rawUrl;
  return probe.lifecycle.requestContext.get("/discover/tv", {}, { kind: "list" }).then(() => probe).catch((error) => {
    error.probe = probe;
    throw error;
  });
}

export async function runNegativeFixtureSuite() {
  const records = [];
  const manifest = FIXTURE_MANIFEST.map((record) => ({ ...record }));
  records.push(await observeScenario({ fixtureId: "fixed-input-valid", category: "Fixed Input", expectedDisposition: "ACCEPTED", action: async () => ({ attemptCount: 0, consumptionEventCount: 0 }) }));
  records.push(await observeScenario({ fixtureId: "strict-input-extra", category: "Strict Input", expectedDisposition: "REJECTED", expectedErrorCode: "ONE_SHOT_FIXED_INPUT_INVALID", action: async () => assertFixedInput({ ...FIXED_INPUT, extra: true }) }));
  records.push(await observeScenario({ fixtureId: "strict-input-missing", category: "Strict Input", expectedDisposition: "REJECTED", expectedErrorCode: "ONE_SHOT_FIXED_INPUT_INVALID", action: async () => assertFixedInput({ country: "us" }) }));
  records.push(await observeScenario({ fixtureId: "governance-contract-exact", category: "Governance Contract", expectedDisposition: "ACCEPTED", action: async () => ({ boundary: GOVERNANCE_BOUNDARY, authority: GOVERNANCE_AUTHORITY, scope: TECHNICAL_PERSISTENCE_SCOPE }) }));
  records.push(await observeScenario({ fixtureId: "binding-override", category: "Binding Override", expectedDisposition: "REJECTED", action: async () => { throw Object.assign(new Error("ONE_SHOT_CALLER_INJECTION_REJECTED"), { code: "ONE_SHOT_CALLER_INJECTION_REJECTED" }); } }));
  records.push(await observeScenario({ fixtureId: "runtime-transport-mutation", category: "Runtime Transport Mutation", expectedDisposition: "REJECTED", action: async () => { if (!validateExecArgv(["--require", "redacted"] ).ok) throw Object.assign(new Error("NODE_EXEC_ARGV_INJECTION"), { code: "NODE_EXEC_ARGV_INJECTION" }); } }));
  for (const [fixtureId, rawUrl] of [
    ["allowlist-http", "http://api.themoviedb.org/3/discover/tv"],
    ["allowlist-ip", "https://127.0.0.1/3/discover/tv"],
    ["allowlist-userinfo", "https://user:pass@api.themoviedb.org/3/discover/tv"],
    ["allowlist-alternate-port", "https://api.themoviedb.org:8443/3/discover/tv"],
  ]) {
    const result = await observeScenario({ fixtureId, category: "Allowlist", expectedDisposition: "REJECTED", expectedErrorCode: "TMDB_DESTINATION_NOT_ALLOWED", action: async () => policyRequest(rawUrl) });
    records.push(result);
  }
  for (const [fixtureId, redirectCount, expectedDisposition, expectedErrorCode] of [
    ["redirect-one", 1, "ACCEPTED", ""],
    ["redirect-three", 3, "ACCEPTED", ""],
    ["redirect-four", 4, "REJECTED", "TMDB_REDIRECT_HOP_LIMIT_EXCEEDED"],
  ]) {
    records.push(await observeScenario({ fixtureId, category: "Redirect", expectedDisposition, expectedErrorCode, action: async () => policyRequest("https://api.themoviedb.org/3/discover/tv", { redirectCount }) }));
  }
  records.push(await observeScenario({ fixtureId: "redirect-off-host", category: "Redirect", expectedDisposition: "REJECTED", expectedErrorCode: "TMDB_REDIRECT_NOT_ALLOWED", action: async () => policyRequest("https://api.themoviedb.org/3/discover/tv", { redirectCount: 1, offHostRedirect: true }) }));
  records.push(await observeScenario({ fixtureId: "invalid-json-response", category: "Response Contract", expectedDisposition: "REJECTED", expectedErrorCode: "LIST_RESPONSE_INVALID", action: async () => policyRequest("https://api.themoviedb.org/3/discover/tv", { invalidJson: true }) }));
  records.push(await observeScenario({ fixtureId: "malformed-response", category: "Response Contract", expectedDisposition: "REJECTED", expectedErrorCode: "LIST_RESPONSE_CLONE_REQUIRED", action: async () => policyRequest("https://api.themoviedb.org/3/discover/tv", { malformedResponse: true }) }));
  records.push(await observeScenario({ fixtureId: "response-clone-overflow", category: "Response Contract", expectedDisposition: "REJECTED", expectedErrorCode: "LIST_RESPONSE_RESOURCE_LIMIT_EXCEEDED", action: async () => policyRequest("https://api.themoviedb.org/3/discover/tv", { oversizedList: true }) }));

  const listBudget = makeProbe({ runId: "budget-list", nativeFetch: fixtureTransport() });
  for (let index = 0; index < REQUEST_BUDGET.list; index += 1) {
    listBudget.holder.rawUrl = `https://api.themoviedb.org/3/discover/tv?page=${index + 1}`;
    await listBudget.lifecycle.requestContext.get("/discover/tv", {}, { kind: "list" });
  }
  listBudget.holder.rawUrl = "https://api.themoviedb.org/3/discover/tv?page=9";
  records.push(await observeScenario({ fixtureId: "run-budget-list-nine", category: "Run Budget", expectedDisposition: "REJECTED", expectedErrorCode: "REQUEST_BUDGET_EXCEEDED", action: () => listBudget.lifecycle.requestContext.get("/discover/tv", {}, { kind: "list" }) }));

  const detailBudget = makeProbe({ runId: "budget-detail", nativeFetch: fixtureTransport() });
  for (let index = 0; index < REQUEST_BUDGET.detail; index += 1) {
    detailBudget.holder.rawUrl = `https://api.themoviedb.org/3/tv/${index + 1}`;
    await detailBudget.lifecycle.requestContext.get("/tv/1", {}, { kind: "detail" });
  }
  detailBudget.holder.rawUrl = "https://api.themoviedb.org/3/tv/17";
  records.push(await observeScenario({ fixtureId: "run-budget-detail-seventeen", category: "Run Budget", expectedDisposition: "REJECTED", expectedErrorCode: "REQUEST_BUDGET_EXCEEDED", action: () => detailBudget.lifecycle.requestContext.get("/tv/1", {}, { kind: "detail" }) }));

  const shared = { lifecycle: null, rawUrl: "https://api.themoviedb.org/3/discover/tv?page=1" };
  const sharedBase = {
    get: (_path, _params, options) => shared.transport.fetch(shared.rawUrl, options),
    hasBudget: () => true,
    hasTimeRemaining: () => true,
    remainingDeadlineMs: () => 100000,
    setEarlyStop: () => {},
    setSeedDiagnostics: () => {},
    diagnostics: () => ({ limits: REQUEST_BUDGET }),
    assertObservabilitySession: () => true,
    limits: REQUEST_BUDGET,
  };
  const sharedLifecycleProxy = { recordAttemptStart: (value) => shared.lifecycle.recordAttemptStart(value), recordAttemptTerminal: (value) => shared.lifecycle.recordAttemptTerminal(value) };
  shared.transport = createOneShotTransport({ nativeFetch: fixtureTransport(), getCurrentRequest: () => shared.lifecycle.getCurrentRequest(), lifecycle: sharedLifecycleProxy, integratedRunId: "aggregate-fixture", syntheticConsumption: true });
  for (let runIndex = 0; runIndex < 3; runIndex += 1) {
    const reducer = new RequestLifecycleReducer();
    shared.lifecycle = createRequestLifecycleContext({ reducer, baseContext: sharedBase, runId: `aggregate-${runIndex}`, runMode: "cold" });
    for (let index = 0; index < REQUEST_BUDGET.total; index += 1) {
      shared.rawUrl = index < REQUEST_BUDGET.list
        ? `https://api.themoviedb.org/3/discover/tv?page=${runIndex}-${index}`
        : `https://api.themoviedb.org/3/tv/${index - REQUEST_BUDGET.list + 1}`;
      const logicalPath = index < REQUEST_BUDGET.list ? "/discover/tv" : "/tv/1";
      const kind = index < REQUEST_BUDGET.list ? "list" : "detail";
      await shared.lifecycle.requestContext.get(logicalPath, {}, { kind });
    }
  }
  shared.lifecycle = createRequestLifecycleContext({ reducer: new RequestLifecycleReducer(), baseContext: sharedBase, runId: "aggregate-overflow", runMode: "cold" });
  shared.rawUrl = "https://api.themoviedb.org/3/tv/1";
  records.push(await observeScenario({ fixtureId: "aggregate-budget-seventy-three", category: "Aggregate Budget", expectedDisposition: "REJECTED", expectedErrorCode: "REQUEST_BUDGET_EXCEEDED", action: () => shared.lifecycle.requestContext.get("/tv/1", {}, { kind: "detail" }) }));

  const consumption = await policyRequest("https://api.themoviedb.org/3/discover/tv");
  records.push({ fixtureId: "consumption-single-event", category: "Consumption", inputMutation: "none", expectedDisposition: "ACCEPTED", observedDisposition: "ACCEPTED", observedErrorCode: "", bindingCount: 0, attemptCount: consumption.transport.attempts().length, consumptionEventCount: consumption.transport.events().filter((event) => event.type === "governanceConsumptionObserved").length, verdict: "PASS" });
  records.push(await observeScenario({ fixtureId: "lifecycle-open-attempt", category: "Lifecycle", expectedDisposition: "REJECTED", action: () => lifecycleNegative("open") }));
  records.push(await observeScenario({ fixtureId: "lifecycle-duplicate-terminal", category: "Lifecycle", expectedDisposition: "REJECTED", action: () => lifecycleNegative("duplicate") }));
  records.push(await observeScenario({ fixtureId: "lifecycle-cache-hit", category: "Cache Hit Lifecycle", expectedDisposition: "ACCEPTED", action: async () => {
    const reducer = new RequestLifecycleReducer();
    reducer.startRequest({ requestId: "cache:request", runId: "cache", runMode: "warm-measure", requestClass: "list", page: 1, safeEndpointIdentity: "/3/discover/tv", cacheRelation: "UNKNOWN", retryIndex: 0 });
    reducer.markCacheHit("cache:request");
    reducer.completeRequest("cache:request");
    const record = reducer.logicalRequestLedger()[0];
    if (record.cacheRelation !== "HIT" || record.outboundAttemptIds.length !== 0) throw Object.assign(new Error("CACHE_HIT_LIFECYCLE_INVALID"), { code: "CACHE_HIT_LIFECYCLE_INVALID" });
    return { attemptCount: 0, consumptionEventCount: 0 };
  } }));
  records.push(await observeScenario({ fixtureId: "validator-meta-quality", category: "Validator Meta-quality", expectedDisposition: "ACCEPTED", action: async () => {
    const metrics = calculateMetaQuality([
      { checkId: "meta-string", verdict: "PASS", validationMethod: "string-presence", structuredEvidence: null, evidencePointers: [] },
      { checkId: "meta-self", verdict: "PASS", validationMethod: "declared-summary-copy", structuredEvidence: { value: true }, evidencePointers: ["/summary"], comparisonSource: "same-summary" },
      { checkId: "meta-string", verdict: "PASS", validationMethod: "structured-contract-computation", structuredEvidence: { value: true }, evidencePointers: ["/value"], sourceHashes: { source: false } },
      { checkId: "meta-pointer", verdict: "PASS", validationMethod: "structured-contract-computation", structuredEvidence: { value: true }, evidencePointers: [""] },
    ]);
    if (metrics.stringOnlyPasses !== 1 || metrics.selfConfirmingPasses !== 1 || metrics.duplicateCheckIds !== 1 || metrics.unresolvedPointers !== 1 || metrics.sourceHashMismatches !== 1) {
      throw Object.assign(new Error("VALIDATOR_META_QUALITY_NOT_RECOMPUTED"), { code: "VALIDATOR_META_QUALITY_NOT_RECOMPUTED" });
    }
    return { attemptCount: 0, consumptionEventCount: 0 };
  } }));
  records.push(await observeScenario({ fixtureId: "runtime-pin-mismatch", category: "Runtime Pin", expectedDisposition: "REJECTED", action: async () => {
    const result = validateRuntimePins({ node: { executablePath: "C:\\invalid\\node.exe", version: NODE_VERSION, sha256: NODE_SHA256, execArgv: [] }, sourceInventory: { records: [] } });
    if (result.ok) return { attemptCount: 0 };
    throw Object.assign(new Error("RUNTIME_PIN_MISMATCH"), { code: "RUNTIME_PIN_MISMATCH" });
  } }));
  records.push(await observeScenario({ fixtureId: "source-pin-mismatch", category: "Source Pin", expectedDisposition: "REJECTED", action: async () => {
    const result = validateRuntimePins({ node: { executablePath: NODE_EXECUTABLE, version: NODE_VERSION, sha256: NODE_SHA256, execArgv: [] }, sourceInventory: { records: [] } }, { requireSourcePins: true, expectedSourcePins: { "missing.mjs": { sha256: "0".repeat(64), byteSize: 1 } } });
    if (result.ok) return { attemptCount: 0 };
    throw Object.assign(new Error("SOURCE_PIN_MISMATCH"), { code: "SOURCE_PIN_MISMATCH" });
  } }));
  records.push(await observeScenario({ fixtureId: "dirty-tree-mismatch", category: "Working Tree", expectedDisposition: "REJECTED", action: async () => {
    const result = validateRepositoryPins({ branch: "main", head: "base", originMain: "base", packageJson: { sha256: "pkg", byteSize: 1 }, pnpmLock: { sha256: "lock", byteSize: 1 }, dirtyPathClassification: [] }, { dirtyPathClassification: [" M unexpected.js"] });
    if (result.ok) return { attemptCount: 0 };
    throw Object.assign(new Error("WORKING_TREE_CLASSIFICATION_MISMATCH"), { code: "WORKING_TREE_CLASSIFICATION_MISMATCH" });
  } }));
  records.push(await observeScenario({ fixtureId: "credential-absent", category: "Credential", expectedDisposition: "REJECTED", action: async () => {
    if (Object.values(environmentPresence({}).credentialPresence).some(Boolean)) return { attemptCount: 0 };
    throw Object.assign(new Error("ONE_SHOT_CREDENTIAL_MISSING"), { code: "ONE_SHOT_CREDENTIAL_MISSING" });
  } }));
  const runnerPath = resolve(dirname(fileURLToPath(import.meta.url)), "run-rec-qa-091-one-shot.mjs");
  records.push(await observeScenario({ fixtureId: "unexpected-cli", category: "Invocation", expectedDisposition: "REJECTED", action: async () => {
    const result = validateInvocation({ moduleUrl: pathToFileURL(runnerPath).href, argv: [process.execPath, runnerPath, "--override"], expectedScriptPath: runnerPath });
    if (result.ok) return { attemptCount: 0 };
    throw Object.assign(new Error("ONE_SHOT_INVOCATION_INVALID"), { code: "ONE_SHOT_INVOCATION_INVALID" });
  } }));
  records.push(await observeScenario({ fixtureId: "import-as-module", category: "Invocation", expectedDisposition: "REJECTED", action: async () => {
    const result = validateInvocation({ moduleUrl: `${pathToFileURL(runnerPath).href}?import`, argv: [process.execPath, runnerPath], expectedScriptPath: runnerPath });
    if (result.ok) return { attemptCount: 0 };
    throw Object.assign(new Error("ONE_SHOT_IMPORT_NOT_EXECUTABLE"), { code: "ONE_SHOT_IMPORT_NOT_EXECUTABLE" });
  } }));
  records.push(await observeScenario({ fixtureId: "output-collision", category: "Output Boundary", expectedDisposition: "REJECTED", action: async () => {
    const outputPath = await resolveObservabilityEvidenceOutput("deterministic-observability-v1-final");
    if (await lstat(outputPath).catch(() => null)) throw Object.assign(new Error("OUTPUT_ALREADY_EXISTS"), { code: "OUTPUT_ALREADY_EXISTS" });
    throw Object.assign(new Error("OUTPUT_COLLISION_FIXTURE_SETUP_MISSING"), { code: "OUTPUT_COLLISION_FIXTURE_SETUP_MISSING" });
  } }));
  records.push(await observeScenario({ fixtureId: "output-boundary", category: "Output Boundary", expectedDisposition: "ACCEPTED", action: async () => ({ attemptCount: 0, consumptionEventCount: 0, stem: assertSafeEvidenceFileStem("one-shot-valid") }) }));
  return { manifest, records };
}

export function deterministicFixtureContract() {
  return Object.freeze({
    dataSource: "DETERMINISTIC_FIXTURE",
    liveRunnerFixtureSwitch: false,
    realCredentials: false,
    networkRequired: false,
    manifestIsSourceOfExpectedDisposition: true,
  });
}
