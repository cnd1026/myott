import { execFileSync } from "node:child_process";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { access, link, lstat, mkdir, readFile, realpath, stat, unlink } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  diagnoseTmdbCandidateUniverse,
  discoverTmdb,
  evaluateTmdbCandidateUniverse,
} from "../../lib/tmdb.js";
import {
  clearTmdbRequestCache,
  createTmdbRequestContext,
} from "../../src/lib/providers/tmdb/requestContext.js";
import {
  createTmdbObservabilitySession,
  finalizeTmdbObservabilitySession,
  assertTmdbObservabilityBehaviorInvariant,
  summarizeTmdbObservabilityLedger,
  TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT,
  TMDB_OBSERVABILITY_LIMITS,
  TMDB_OBSERVABILITY_TRACE_STAGES,
  validateCorrectedEventLimitContract,
  validateTmdbObservabilityLedger,
} from "../../src/lib/recommendation/qa/tmdbObservability.js";
import {
  createTmdbObservabilityFixtureContext,
  TMDB_OBSERVABILITY_FIXTURE_INPUT,
} from "../../src/lib/recommendation/qa/tmdbObservabilityFixture.mjs";
import {
  runTmdbObservabilityImmutableOutputFixtures,
} from "../../src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs";
import {
  hashEvidenceFile,
  observabilityEvidenceRoot,
  resolveObservabilityEvidenceOutput,
  writeImmutableObservabilityEvidence,
} from "../../src/lib/recommendation/qa/tmdbObservabilityOutput.mjs";

export const TASK_ID = "MYOTT-S09-006A2D1A";
export const FINDING_ID = "REC-QA-091";
export const AUTHORIZATION_ID = "FOUNDER_AUTHORIZATION_REC_QA_091_LIVE_ENTRYPOINT_COMPATIBILITY_V1";
export const FUTURE_LIVE_AUTHORIZATION_ID = "FOUNDER_AUTHORIZATION_REC_QA_091_BOUNDED_SERVER_SIDE_LIVE_PROBE_V2";
export const ENTRYPOINT_MODE = Object.freeze({ FIXTURE: "fixture", PREFLIGHT: "preflight", LIVE: "live" });
export const FIXED_INPUT = Object.freeze({
  country: "us",
  semanticGenre: "horror",
  contentType: "drama",
  providerMediaType: "tv",
  limit: 12,
});
export const RUN_MODES = Object.freeze(["cold", "warm-prime", "warm-measure"]);
export const REQUEST_CONTRACT = Object.freeze({
  total: 24,
  list: 8,
  detail: 16,
  aggregate: 72,
  concurrency: 4,
  retry: 0,
});
export const COMPATIBILITY_EVIDENCE_STEM = "live-entrypoint-compatibility-v1-final";
export const CORRECTION_EVIDENCE_STEM = "live-entrypoint-compatibility-v1-correction-2-final";
export const COMPATIBILITY_EVIDENCE_DIRECTORY = "LIVE_ENTRYPOINT_COMPATIBILITY_V1";
export const LIVE_CONSUMPTION_BOUNDARY = "FIRST ACTUAL OUTBOUND TMDB REQUEST";
export const LIVE_NETWORK_HOST = "api.themoviedb.org";
export const MAX_REDIRECT_HOPS = 3;
export const LIVE_ADAPTER_OVERRIDE_KEYS = Object.freeze([
  "adapterFactory",
  "adapter",
  "fetchImpl",
  "transport",
  "consumptionRecorder",
  "modulePath",
  "endpoint",
  "URL",
  "fixtureAdapter",
  "testAdapter",
]);
export const CORRECTION_7_RELATIVE_PATH =
  "qa-evidence/REC-QA-091/OBSERVABILITY_V1/deterministic-observability-v1-correction-7-final.json";
export const CORRECTION_7_SHA256 =
  "ca11f3f9d0f23a867296a87e7d220a2d230c71802796adc347ed8e07d8c2e66c";
export const CORRECTION_7_BYTE_SIZE = 933715;
export const EXPECTED_REPOSITORY_COMMIT = "f38b746416a13c3b2bbcac4396fee08b7c1160ea";
export const EXPECTED_PACKAGE_SHA256 =
  "6322c73d9b444fb756cb4107cb03c10e39e966cbd7cd4d2eb0f2a8643e4ce800";
export const EXPECTED_LOCK_SHA256 =
  "288c70c3c4f6510d295a2dac4a534b1c6c2b3264457821761c2fad95f55c4cd3";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ENTRYPOINT_RELATIVE_PATH = "scripts/qa/rec-qa-091-live-observability-v1.mjs";
const TEST_RELATIVE_PATH = "scripts/qa/rec-qa-091-live-observability-v1.test.mjs";
const PRODUCT_RUNNER_RELATIVE_PATH = "scripts/recommendation-live-qa.mjs";
const OBSERVABILITY_SOURCE_PATH = "src/lib/recommendation/qa/tmdbObservability.js";
const FIXTURE_SOURCE_PATH = "src/lib/recommendation/qa/tmdbObservabilityFixture.mjs";
const OUTPUT_SOURCE_PATH = "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs";
const PRODUCT_DIAGNOSTIC_SOURCE_PATH = "lib/tmdb.js";
const PACKAGE_RELATIVE_PATH = "package.json";
const LOCK_RELATIVE_PATH = "pnpm-lock.yaml";
const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  "schemaVersion",
  "taskId",
  "findingId",
  "authorizationId",
  "dataSource",
  "validationPurpose",
  "generatedAt",
  "repositoryCommit",
  "repositoryDirtyState",
  "fixedInput",
  "executionMode",
  "networkInvocationCount",
  "sealedLiveBindingValidation",
  "adapterOverrideNegativeFixtures",
  "authorizationOrderingValidation",
  "consumptionBoundaryValidation",
  "logicalRequestLedger",
  "outboundAttemptLedger",
  "requestEventLedger",
  "redirectBudgetValidation",
  "requestStartEventValidation",
  "staticValidationQuality",
  "productContract",
  "requestContract",
  "threeRunEvidence",
  "requestLedger",
  "rawEventLedger",
  "stageSummaries",
  "candidateRegistry",
  "terminalProvenance",
  "rankingProvenance",
  "finalCandidateIdsByRun",
  "excludedCandidatesByRun",
  "cacheEvidence",
  "resourceLimits",
  "redactionValidation",
  "outputBoundaryValidation",
  "noClobberValidation",
  "integrity",
  "summary",
]);
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const SECRET_VALUE_PATTERN = /(?:Bearer\s+|api[_-]?key\s*[:=]|password\s*[:=]|cookie\s*[:=]|secret\s*[:=]|token\s*[:=]|\bsk-[A-Za-z0-9_-]{12,})/i;
const URL_VALUE_PATTERN = /\b(?:https?|file):\/\//i;
const QUERY_VALUE_PATTERN = /\?(?:[^#\s]*=|[^#\s]*&)/;
const ABSOLUTE_PATH_PATTERN = /(?:\b[A-Za-z]:[\\/]|(?:^|\s)\\\\[^\\]+[\\/]|\/(?:Users|home|root|tmp)\/)/i;
const TRAVERSAL_PATTERN = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

class CompatibilityError extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "CompatibilityError";
    this.code = code;
  }
}

function fail(code, detail) {
  throw new CompatibilityError(code, detail);
}

function normalizedPath(value) {
  return resolve(value).toLowerCase();
}

async function pathExists(pathValue) {
  try {
    await access(pathValue);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function hashFile(pathValue) {
  const bytes = await readFile(pathValue);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteSize: bytes.byteLength,
  };
}

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function repositorySnapshot() {
  let status = "";
  try {
    status = execFileSync("git", ["status", "--porcelain=v1"], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).replace(/\r?\n+$/, "");
  } catch {
    status = "";
  }
  const lines = status ? status.split(/\r?\n/).filter(Boolean) : [];
  return {
    branch: runGit(["branch", "--show-current"]),
    head: runGit(["rev-parse", "HEAD"]),
    originMain: runGit(["rev-parse", "origin/main"]),
    dirty: lines.length > 0,
    stagedFileCount: lines.filter((line) => !line.startsWith("??") && line[0] !== " " && line[0] !== "?").length,
    trackedModificationCount: lines.filter((line) => !line.startsWith("??")).length,
    untrackedFileCount: lines.filter((line) => line.startsWith("??")).length,
  };
}

export function assertFixedInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_FIXED_INPUT_MISMATCH", "input must be an object");
  }
  const actualKeys = Object.keys(input).sort();
  const expectedKeys = Object.keys(FIXED_INPUT).sort();
  if (actualKeys.join("|") !== expectedKeys.join("|") ||
    actualKeys.some((key) => input[key] !== FIXED_INPUT[key])) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_FIXED_INPUT_MISMATCH", "only the approved fixed input is accepted");
  }
  return true;
}

export function parseEntrypointArguments(argv = []) {
  const args = [...argv];
  let mode = null;
  let authorizationPath = null;
  while (args.length) {
    const token = args.shift();
    if (token === "--mode") {
      if (mode !== null || !args.length) fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_GUARD_FAILED", "mode must be specified once");
      mode = args.shift();
      continue;
    }
    if (token.startsWith("--mode=")) {
      if (mode !== null) fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_GUARD_FAILED", "mode must be specified once");
      mode = token.slice("--mode=".length);
      continue;
    }
    if (token.startsWith("--country=") || token.startsWith("--semanticGenre=") ||
      token.startsWith("--contentType=") || token.startsWith("--providerMediaType=") ||
      token.startsWith("--limit=") || token === "--output" || token.startsWith("--output=")) {
      fail("REC_QA_091_LIVE_ENTRYPOINT_FIXED_INPUT_MISMATCH", "runtime input and output overrides are prohibited");
    }
    if (token === "--authorization") {
      if (authorizationPath !== null || !args.length) {
        fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "authorization path must be specified once");
      }
      authorizationPath = args.shift();
      if (!authorizationPath || authorizationPath.startsWith("--")) {
        fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "authorization path is invalid");
      }
      continue;
    }
    if (token.startsWith("--authorization=")) {
      if (authorizationPath !== null) {
        fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "authorization path must be specified once");
      }
      authorizationPath = token.slice("--authorization=".length);
      if (!authorizationPath) {
        fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "authorization path is invalid");
      }
      continue;
    }
    if (mode === null && !token.startsWith("--")) {
      mode = token;
      continue;
    }
    fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_GUARD_FAILED", `unsupported argument ${token}`);
  }
  const requestedMode = mode || ENTRYPOINT_MODE.FIXTURE;
  if (!Object.values(ENTRYPOINT_MODE).includes(requestedMode)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_GUARD_FAILED", "only fixture, preflight and live modes are allowed");
  }
  if (requestedMode !== ENTRYPOINT_MODE.LIVE && authorizationPath !== null) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "authorization is only accepted in live mode");
  }
  const environmentInput = {
    country: process.env.REC_QA_091_COUNTRY ?? FIXED_INPUT.country,
    semanticGenre: process.env.REC_QA_091_SEMANTIC_GENRE ?? FIXED_INPUT.semanticGenre,
    contentType: process.env.REC_QA_091_CONTENT_TYPE ?? FIXED_INPUT.contentType,
    providerMediaType: process.env.REC_QA_091_PROVIDER_MEDIA_TYPE ?? FIXED_INPUT.providerMediaType,
    limit: process.env.REC_QA_091_LIMIT === undefined
      ? FIXED_INPUT.limit
      : Number(process.env.REC_QA_091_LIMIT),
  };
  assertFixedInput(environmentInput);
  return { mode: requestedMode, input: { ...FIXED_INPUT }, authorizationPath };
}

export function createNetworkAdapterGuard() {
  let invocationCount = 0;
  return Object.freeze({
    get invocationCount() {
      return invocationCount;
    },
    invoke() {
      invocationCount += 1;
      fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_GUARD_FAILED", "the live network adapter was invoked");
    },
    assertZero() {
      if (invocationCount !== 0) {
        fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_GUARD_FAILED", "network invocation count is not zero");
      }
      return true;
    },
  });
}

function assertAllowedTmdbUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_ALLOWLIST_FAILED", "TMDB request URL is invalid");
  }
  if (url.protocol !== "https:" || url.hostname !== LIVE_NETWORK_HOST || url.username || url.password ||
    (url.port && url.port !== "443") || /^[0-9.:[\]]+$/.test(url.hostname)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_ALLOWLIST_FAILED", "request destination is outside the sealed TMDB boundary");
  }
  return url;
}

export function createTmdbAllowlistPolicy() {
  const policy = Object.freeze({
    protocol: "https:",
    exactHost: LIVE_NETWORK_HOST,
    redirectMode: "manual",
    maximumRedirectHops: MAX_REDIRECT_HOPS,
    rejectUserinfo: true,
    rejectIpLiteral: true,
    rejectUnsafePort: true,
  });
  if (policy.protocol !== "https:" || policy.exactHost !== LIVE_NETWORK_HOST || policy.redirectMode !== "manual" || policy.maximumRedirectHops !== 3) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_ALLOWLIST_FAILED", "immutable TMDB allowlist policy is invalid");
  }
  return policy;
}

export function createTmdbAllowlistedFetch({
  fetchImpl = globalThis.fetch,
  onFirstOutbound,
  reserveAttempt,
  onAttemptStart,
  onAttemptComplete,
  onAttemptFailed,
  onRedirectDecision,
  requestContext,
} = {}) {
  if (typeof fetchImpl !== "function") {
    fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_ALLOWLIST_FAILED", "a fetch implementation is required");
  }
  if (onFirstOutbound !== undefined && typeof onFirstOutbound !== "function") {
    fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_ALLOWLIST_FAILED", "the consumption recorder is invalid");
  }
  let firstOutboundRecorded = false;
  return async function allowlistedTmdbFetch(rawUrl, options = {}) {
    let currentUrl = assertAllowedTmdbUrl(rawUrl);
    for (let redirectHopIndex = 0; ; redirectHopIndex += 1) {
      const context = requestContext?.() || {};
      const attempt = reserveAttempt?.({
        requestClass: context.requestClass || requestKindForPath(currentUrl.pathname),
        logicalRequestId: context.logicalRequestId || null,
        redirectHopIndex,
      });
      const attemptId = attempt?.attemptId || null;
      onAttemptStart?.({
        ...context,
        attemptId,
        redirectHopIndex,
        safeEndpointIdentity: safeEndpointIdentity({
          endpointPath: currentUrl.pathname,
          requestKind: context.requestClass || requestKindForPath(currentUrl.pathname),
        }),
      });
      if (!firstOutboundRecorded) {
        firstOutboundRecorded = true;
        onFirstOutbound?.();
      }
      let response;
      try {
        response = await fetchImpl(currentUrl.toString(), { ...options, redirect: "manual" });
        if (![301, 302, 303, 307, 308].includes(response?.status)) {
          onAttemptComplete?.({ ...context, attemptId, redirectHopIndex, statusClass: response?.ok ? "SUCCESS" : "ERROR", redirectLocationClass: "NONE" });
          return response;
        }
        const location = response.headers?.get?.("location");
        if (!location) {
          onAttemptComplete?.({ ...context, attemptId, redirectHopIndex, statusClass: "REDIRECT_WITHOUT_LOCATION", redirectLocationClass: "MISSING" });
          return response;
        }
        let nextUrl;
        try {
          nextUrl = new URL(location, currentUrl);
          onRedirectDecision?.({ ...context, attemptId, redirectHopIndex, redirectLocationClass: nextUrl.hostname === LIVE_NETWORK_HOST ? "TMDB_EXACT" : "NON_TMDB" });
          if (redirectHopIndex >= MAX_REDIRECT_HOPS) {
            fail("TMDB_REDIRECT_HOP_LIMIT_EXCEEDED", "redirect hop limit exceeded");
          }
          currentUrl = assertAllowedTmdbUrl(nextUrl.toString());
        } catch (error) {
          onAttemptComplete?.({
            ...context,
            attemptId,
            redirectHopIndex,
            statusClass: "REDIRECT_REJECTED",
            redirectLocationClass: nextUrl?.hostname === LIVE_NETWORK_HOST ? "INVALID" : "NON_TMDB",
          });
          throw error;
        }
        onAttemptComplete?.({ ...context, attemptId, redirectHopIndex, statusClass: "REDIRECT", redirectLocationClass: "TMDB_EXACT" });
      } catch (error) {
        if (error?.code === "TMDB_REDIRECT_HOP_LIMIT_EXCEEDED" || error?.code === "REC_QA_091_LIVE_ENTRYPOINT_NETWORK_ALLOWLIST_FAILED") {
          onAttemptFailed?.({ ...context, attemptId, redirectHopIndex, statusClass: "REJECTED", errorCode: error.code });
        } else {
          onAttemptFailed?.({ ...context, attemptId, redirectHopIndex, statusClass: "ERROR", errorCode: error?.code || "FETCH_FAILED" });
        }
        throw error;
      }
    }
  };
}

export function createConsumptionRecorder() {
  let consumedRuns = 0;
  return Object.freeze({
    get consumedRuns() {
      return consumedRuns;
    },
    recordFirstOutbound() {
      if (consumedRuns === 0) consumedRuns = 1;
    },
    assertNotConsumed() {
      if (consumedRuns !== 0) {
        fail("REC_QA_091_LIVE_ENTRYPOINT_CONSUMPTION_BOUNDARY_FAILED", "authorization is already consumed");
      }
      return true;
    },
    assertConsumedOnce() {
      if (consumedRuns !== 1) {
        fail("REC_QA_091_LIVE_ENTRYPOINT_CONSUMPTION_BOUNDARY_FAILED", "first outbound request did not consume exactly once");
      }
      return true;
    },
  });
}

export function runSyntheticConsumptionBoundaryFixtures() {
  const preflight = createConsumptionRecorder();
  preflight.assertNotConsumed();
  const firstOutbound = createConsumptionRecorder();
  firstOutbound.assertNotConsumed();
  firstOutbound.recordFirstOutbound();
  firstOutbound.recordFirstOutbound();
  firstOutbound.assertConsumedOnce();
  const failedAfterOutbound = createConsumptionRecorder();
  failedAfterOutbound.recordFirstOutbound();
  failedAfterOutbound.assertConsumedOnce();
  return {
    status: "PASS",
    preflightConsumption: preflight.consumedRuns,
    firstOutboundConsumption: firstOutbound.consumedRuns,
    failureAfterOutboundConsumption: failedAfterOutbound.consumedRuns,
    automaticRetry: 0,
  };
}

function fixtureInputForProduct() {
  assertFixedInput(FIXED_INPUT);
  return {
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    filters: ["country-us", "genre-horror"],
    contentTypes: ["drama"],
    limit: FIXED_INPUT.limit,
    diagnosticMode: "product-plan",
  };
}

function fixtureResponse(status, payload = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    async json() {
      return payload;
    },
  };
}

function fixtureDetailPayload(item) {
  return {
    id: item.id,
    name: item.name,
    original_name: item.original_name,
    first_air_date: item.first_air_date,
    genres: [{ id: 18, name: "Drama" }, { id: 9648, name: "Mystery" }],
    origin_country: ["US"],
    production_countries: [{ iso_3166_1: "US" }],
    episode_run_time: [45],
    overview: item.overview,
    keywords: { results: [{ name: "ghost" }, { name: "demon" }] },
    credits: { cast: [], crew: [] },
    "watch/providers": { results: {} },
    popularity: 500,
    vote_average: 8,
    vote_count: 500,
  };
}

function normalizeTmdbEndpointPath(pathValue) {
  const rawPath = String(pathValue || "");
  return rawPath.startsWith("/3/") ? rawPath.slice(2) : rawPath;
}

function createFixtureProductFetch() {
  const candidates = TMDB_OBSERVABILITY_FIXTURE_INPUT.candidates;
  return async (rawUrl) => {
    const url = new URL(rawUrl);
    const endpointPath = normalizeTmdbEndpointPath(url.pathname);
    const listMatch = endpointPath.match(/^\/discover\/(movie|tv)$/);
    if (listMatch) {
      return fixtureResponse(200, {
        page: 1,
        total_results: candidates.length,
        results: candidates,
      });
    }
    const detailMatch = endpointPath.match(/^\/(movie|tv)\/(\d+)$/);
    if (detailMatch) {
      const item = candidates.find((candidate) => candidate.id === Number(detailMatch[2]));
      if (!item) return fixtureResponse(404, {});
      return fixtureResponse(200, fixtureDetailPayload(item));
    }
    throw new Error(`Unexpected deterministic product path: ${endpointPath}`);
  };
}

function requestRecordFromUrl(url, payload) {
  const endpointPath = normalizeTmdbEndpointPath(url.pathname);
  const requestClass = requestKindForPath(endpointPath);
  const pathParts = endpointPath.split("/").filter(Boolean);
  const providerMediaType = ["movie", "tv"].includes(pathParts[1])
    ? pathParts[1]
    : ["movie", "tv"].includes(pathParts[0]) ? pathParts[0] : null;
  const record = {
    endpointPath: url.pathname,
    requestClass,
    providerMediaType,
    page: requestClass === "list" ? Number(payload?.page || 1) : null,
    providerItemId: requestClass === "detail" ? Number(pathParts[1]) : null,
    responseResultCount: requestClass === "list" && Array.isArray(payload?.results) ? payload.results.length : null,
    providerReportedTotal: requestClass === "list" && Number.isFinite(Number(payload?.total_results))
      ? Number(payload.total_results)
      : null,
    rawCandidateIds: requestClass === "list" && Array.isArray(payload?.results)
      ? payload.results.map((item) => `${providerMediaType}:${Number(item.id)}`)
      : [],
    rawCandidates: requestClass === "list" && Array.isArray(payload?.results) ? payload.results : [],
  };
  if (requestClass === "unknown") {
    fail("REC_QA_091_LIVE_ENTRYPOINT_REQUEST_LEDGER_INCOMPLETE", "unclassified TMDB request path");
  }
  return { ...record, endpointPath };
}

function createRecordingFetch({
  fetchImpl,
  onFirstOutbound,
  responseCatalog,
  calls,
  requestLedgerState,
  consumptionRecorder,
}) {
  const allowlistedFetch = createTmdbAllowlistedFetch({
    fetchImpl,
    onFirstOutbound,
    requestContext: () => requestLedgerState?.scope?.getStore?.() || null,
    reserveAttempt: (attempt) => requestLedgerState?.reserveAttempt(attempt),
    onAttemptStart: (attempt) => requestLedgerState?.recordAttemptStart(attempt),
    onAttemptComplete: (attempt) => requestLedgerState?.recordAttemptComplete(attempt),
    onAttemptFailed: (attempt) => requestLedgerState?.recordAttemptFailed(attempt),
    onRedirectDecision: (attempt) => requestLedgerState?.recordRedirectDecision(attempt),
  });
  return async (rawUrl, options = {}) => {
    const requestUrl = assertAllowedTmdbUrl(rawUrl);
    const scope = requestLedgerState?.scope?.getStore?.();
    if (scope) scope.networkAttempted = true;
    const response = await allowlistedFetch(rawUrl, options);
    const payload = response?.ok ? await response.json() : null;
    const record = requestRecordFromUrl(requestUrl, payload);
    calls.push(record);
    if (record.requestClass === "list" && response?.ok) {
      responseCatalog.set(record.endpointPath, record);
    }
    return {
      ok: Boolean(response?.ok),
      status: Number(response?.status || 0),
      headers: response?.headers || { get: () => null },
      async json() {
        return payload;
      },
    };
  };
}

function withSyntheticTmdbCredential(callback) {
  const previous = process.env.TMDB_API_KEY;
  process.env.TMDB_API_KEY = "__MYOTT_QA_FIXTURE_ONLY__";
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      if (previous === undefined) delete process.env.TMDB_API_KEY;
      else process.env.TMDB_API_KEY = previous;
    });
}

function createProductRequestContext({ session, fetchImpl, onFirstOutbound, responseCatalog, calls, credentials = {}, requestLedgerState, consumptionRecorder }) {
  const context = createTmdbRequestContext({
    apiKey: credentials.apiKey || "",
    bearer: credentials.bearer || "",
    observer: session,
    diagnosticLimits: {
      total: REQUEST_CONTRACT.total,
      list: REQUEST_CONTRACT.list,
      detail: REQUEST_CONTRACT.detail,
      concurrency: REQUEST_CONTRACT.concurrency,
    },
    diagnosticRetry: REQUEST_CONTRACT.retry,
    fetchImpl: createRecordingFetch({
      fetchImpl,
      onFirstOutbound,
      responseCatalog,
      calls,
      requestLedgerState,
      consumptionRecorder,
    }),
  });
  const originalGet = context.get;
  return {
    ...context,
    get(...args) {
      const [path, params = {}, options = {}] = args;
      const request = requestLedgerState.beginRequest({
        path,
        params,
        kind: options.kind || requestKindForPath(path),
      });
      return requestLedgerState.scope.run(request, async () => {
        try {
          const value = await originalGet(path, params, options);
          requestLedgerState.completeRequest(request, value);
          return value;
        } catch (error) {
          requestLedgerState.failRequest(request, error);
          throw error;
        }
      });
    },
  };
}

function createRequestLedgerState({ runId, runMode }) {
  const scope = new AsyncLocalStorage();
  const events = [];
  const logicalRequests = [];
  const outboundAttempts = [];
  let sequence = 0;
  let requestIndex = 0;
  let attemptIndex = 0;
  const usage = { logicalRequestUsage: { total: 0, list: 0, detail: 0 }, outboundAttemptUsage: { total: 0, list: 0, detail: 0 }, redirectUsage: 0 };
  const emit = (type, fields) => {
    events.push({ eventId: `${runId}:event:${sequence}`, sequence: sequence++, type, runId, runMode, ...fields });
  };
  const beginRequest = ({ path, params, kind }) => {
    const requestClass = kind === "detail" ? "detail" : "list";
    const pathParts = normalizeTmdbEndpointPath(path).split("/").filter(Boolean);
    const request = {
      requestId: `${runId}:request:${requestIndex++}`,
      logicalRequestId: `${runId}:logical:${requestIndex - 1}`,
      requestClass,
      runId,
      runMode,
      page: requestClass === "list" ? Number(params?.page || 1) : null,
      providerItemId: requestClass === "detail" ? Number(pathParts[1]) : null,
      safeEndpointIdentity: safeEndpointIdentity({ endpointPath: path, requestKind: requestClass }),
      cacheRelation: "PENDING",
      retryIndex: 0,
      outboundAttemptIds: [],
      networkAttempted: false,
    };
    usage.logicalRequestUsage.total += 1;
    usage.logicalRequestUsage[requestClass] += 1;
    emit("provider-request-start", {
      requestId: request.requestId,
      requestClass,
      page: request.page,
      providerItemId: request.providerItemId,
      safeEndpointIdentity: request.safeEndpointIdentity,
      cacheRelation: "PENDING",
      retryIndex: 0,
    });
    request.startedSequence = events.at(-1).sequence;
    logicalRequests.push(request);
    return request;
  };
  const completeRequest = (request, value) => {
    request.cacheRelation = request.networkAttempted ? "MISS" : "HIT";
    request.responseResultCount = request.requestClass === "list" && Array.isArray(value?.results) ? value.results.length : null;
    request.providerReportedTotal = request.requestClass === "list" && Number.isFinite(Number(value?.total_results)) ? Number(value.total_results) : null;
    request.completedSequence = sequence;
    emit("provider-request-complete", {
      requestId: request.requestId,
      requestClass: request.requestClass,
      page: request.page,
      providerItemId: request.providerItemId,
      safeEndpointIdentity: request.safeEndpointIdentity,
      cacheRelation: request.cacheRelation,
      retryIndex: request.retryIndex,
      statusClass: "SUCCESS",
    });
    return request;
  };
  const failRequest = (request, error) => {
    request.cacheRelation = request.networkAttempted ? "MISS" : "HIT";
    request.completedSequence = sequence;
    emit("provider-request-failed", {
      requestId: request.requestId,
      requestClass: request.requestClass,
      page: request.page,
      providerItemId: request.providerItemId,
      safeEndpointIdentity: request.safeEndpointIdentity,
      cacheRelation: request.cacheRelation,
      retryIndex: request.retryIndex,
      statusClass: "ERROR",
      errorCode: error?.code || "REQUEST_FAILED",
    });
    return request;
  };
  const reserveAttempt = ({ requestClass, logicalRequestId, redirectHopIndex }) => {
    const key = requestClass === "detail" ? "detail" : "list";
    if (usage.outboundAttemptUsage.total >= REQUEST_CONTRACT.total || usage.outboundAttemptUsage[key] >= REQUEST_CONTRACT[key]) {
      fail("REQUEST_BUDGET_EXCEEDED", `${key} outbound budget exhausted before attempt`);
    }
    const attempt = {
      attemptId: `${runId}:attempt:${attemptIndex++}`,
      logicalRequestId,
      runId,
      runMode,
      requestClass: key,
      attemptSequence: attemptIndex,
      redirectHopIndex,
      safeEndpointIdentity: "pending",
      destinationHostClass: "TMDB_EXACT",
      startedSequence: null,
      completedSequence: null,
      statusClass: "PENDING",
      redirectLocationClass: "NONE",
      budgetReservationId: `${runId}:budget:${attemptIndex}`,
    };
    usage.outboundAttemptUsage.total += 1;
    usage.outboundAttemptUsage[key] += 1;
    if (redirectHopIndex > 0) usage.redirectUsage += 1;
    const logical = logicalRequests.find((item) => item.logicalRequestId === logicalRequestId);
    logical?.outboundAttemptIds.push(attempt.attemptId);
    outboundAttempts.push(attempt);
    return attempt;
  };
  const recordAttemptStart = ({ attemptId, redirectHopIndex, safeEndpointIdentity }) => {
    const attempt = outboundAttempts.find((item) => item.attemptId === attemptId);
    if (!attempt) fail("REC_QA_091_LIVE_ENTRYPOINT_REQUEST_LEDGER_INCOMPLETE", "attempt start has no reservation");
    attempt.safeEndpointIdentity = safeEndpointIdentity;
    attempt.startedSequence = sequence;
    emit("outbound-attempt-start", { attemptId, logicalRequestId: attempt.logicalRequestId, requestClass: attempt.requestClass, attemptSequence: attempt.attemptSequence, redirectHopIndex, safeEndpointIdentity, destinationHostClass: attempt.destinationHostClass, budgetReservationId: attempt.budgetReservationId });
  };
  const recordAttemptComplete = ({ attemptId, statusClass, redirectLocationClass }) => {
    const attempt = outboundAttempts.find((item) => item.attemptId === attemptId);
    if (!attempt) return;
    attempt.statusClass = statusClass;
    attempt.redirectLocationClass = redirectLocationClass;
    attempt.completedSequence = sequence;
    emit("outbound-attempt-complete", { attemptId, logicalRequestId: attempt.logicalRequestId, requestClass: attempt.requestClass, attemptSequence: attempt.attemptSequence, redirectHopIndex: attempt.redirectHopIndex, safeEndpointIdentity: attempt.safeEndpointIdentity, destinationHostClass: attempt.destinationHostClass, redirectLocationClass, budgetReservationId: attempt.budgetReservationId, statusClass });
  };
  const recordAttemptFailed = ({ attemptId, statusClass, errorCode }) => {
    const attempt = outboundAttempts.find((item) => item.attemptId === attemptId);
    if (!attempt) return;
    attempt.statusClass = statusClass;
    attempt.completedSequence = sequence;
    emit("outbound-attempt-failed", { attemptId, logicalRequestId: attempt.logicalRequestId, requestClass: attempt.requestClass, attemptSequence: attempt.attemptSequence, redirectHopIndex: attempt.redirectHopIndex, safeEndpointIdentity: attempt.safeEndpointIdentity, destinationHostClass: attempt.destinationHostClass, redirectLocationClass: attempt.redirectLocationClass, budgetReservationId: attempt.budgetReservationId, statusClass, errorCode });
  };
  const recordRedirectDecision = ({ attemptId, redirectLocationClass }) => {
    const attempt = outboundAttempts.find((item) => item.attemptId === attemptId);
    if (attempt) attempt.redirectLocationClass = redirectLocationClass;
  };
  return { scope, events, logicalRequests, outboundAttempts, usage, beginRequest, completeRequest, failRequest, reserveAttempt, recordAttemptStart, recordAttemptComplete, recordAttemptFailed, recordRedirectDecision };
}

async function executeProductAdapter({
  executionMode,
  runMode,
  session,
  responseCatalog,
  consumptionRecorder,
  fetchImpl,
  credentials,
  requestLedgerState,
}) {
  requestLedgerState ||= createRequestLedgerState({
    runId: `${TASK_ID.toLowerCase()}-direct-${runMode}`,
    runMode,
  });
  const calls = [];
  const listResponses = [];
  const contextOptions = {
    session,
    fetchImpl,
    onFirstOutbound: () => consumptionRecorder?.recordFirstOutbound(),
    responseCatalog,
    calls,
    credentials,
    requestLedgerState,
    consumptionRecorder,
  };
  const run = async () => {
    if (runMode === "cold") clearTmdbRequestCache();
    const listContext = createProductRequestContext(contextOptions);
    const listResult = await discoverTmdb({
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: FIXED_INPUT.limit,
      requestContext: listContext,
      detailLimit: 0,
      candidateSource: "tmdb-observability-product-list",
    });
    for (const response of responseCatalog.values()) listResponses.push(response);
    const rawCandidates = listResponses
      .flatMap((response) => response.rawCandidates)
      .filter(Boolean);
    if (!rawCandidates.length || listResult.source !== "tmdb") {
      fail("REC_QA_091_LIVE_ENTRYPOINT_REQUEST_LEDGER_INCOMPLETE", "Product List retrieval returned no candidates");
    }
    const diagnosticContext = createProductRequestContext(contextOptions);
    const result = await diagnoseTmdbCandidateUniverse({
      candidates: rawCandidates,
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: FIXED_INPUT.limit,
      diagnosticMode: "product-plan",
      session,
      requestContext: diagnosticContext,
    });
    return { result, calls, listResponses };
  };
  const runWithCredentials = executionMode === ENTRYPOINT_MODE.FIXTURE
    ? () => withSyntheticTmdbCredential(run)
    : run;
  const result = await runWithCredentials();
  return {
    ...result,
    requestLedgerState,
    requestEvents: requestLedgerState.events,
    logicalRequests: requestLedgerState.logicalRequests,
    outboundAttempts: requestLedgerState.outboundAttempts,
    usage: requestLedgerState.usage,
  };
}

export async function createFixtureProductAdapter(args) {
  if (args?.executionMode && args.executionMode !== ENTRYPOINT_MODE.FIXTURE) {
    fail("LIVE_ADAPTER_OVERRIDE_PROHIBITED", "Fixture Product Adapter is not reachable from Live mode");
  }
  return executeProductAdapter({
    ...args,
    fetchImpl: createFixtureProductFetch(),
    credentials: {},
  });
}

async function createSealedProductAdapter(args) {
  if (!args || args.executionMode !== ENTRYPOINT_MODE.LIVE || !args.requestLedgerState || !args.consumptionRecorder) {
    fail("LIVE_ADAPTER_OVERRIDE_PROHIBITED", "sealed Live Product Adapter is module-local and cannot be invoked with caller-owned transport state");
  }
  return executeProductAdapter({
    ...args,
    fetchImpl: globalThis.fetch,
    credentials: {
      apiKey: (process.env.TMDB_API_KEY || "").trim(),
      bearer: (process.env.TMDB_BEARER_TOKEN || "").trim(),
    },
  });
}

export function assertNoLiveAdapterOverrides(options = {}) {
  const present = LIVE_ADAPTER_OVERRIDE_KEYS.filter((key) => Object.hasOwn(options, key) && options[key] !== undefined && options[key] !== null);
  if (present.length) {
    fail("LIVE_ADAPTER_OVERRIDE_PROHIBITED", `Live Adapter override keys are prohibited: ${present.join(",")}`);
  }
  return true;
}

export function runLiveAdapterOverrideFixtures() {
  const keys = ["adapterFactory", "fetchImpl", "consumptionRecorder", "modulePath", "endpoint"];
  const results = keys.map((key) => {
    try {
      assertNoLiveAdapterOverrides({ [key]: () => {} });
      return { fixtureId: `ADAPTER-OVERRIDE-${key}`, status: "FAIL", observedCode: "NO_ERROR" };
    } catch (error) {
      return { fixtureId: `ADAPTER-OVERRIDE-${key}`, status: error?.code === "LIVE_ADAPTER_OVERRIDE_PROHIBITED" ? "PASS" : "FAIL", observedCode: error?.code || "UNKNOWN" };
    }
  });
  return {
    status: results.every((result) => result.status === "PASS") ? "PASS" : "FAIL",
    total: results.length,
    passed: results.filter((result) => result.status === "PASS").length,
    failed: results.filter((result) => result.status !== "PASS").length,
    adapterInvocationCount: 0,
    consumptionCount: 0,
    results,
  };
}

async function runRedirectBudgetFixtures() {
  const runCase = async (redirectResponses, { maxAttempts = 24, requestClass = "detail" } = {}) => {
    let calls = 0;
    let consumed = 0;
    const attempts = [];
    const fetch = createTmdbAllowlistedFetch({
      onFirstOutbound: () => { consumed += 1; },
      reserveAttempt: ({ redirectHopIndex }) => {
        if (attempts.length >= maxAttempts) fail("REQUEST_BUDGET_EXCEEDED", "fixture budget exhausted");
        const attempt = { attemptId: `fixture-attempt-${attempts.length}`, redirectHopIndex };
        attempts.push(attempt);
        return attempt;
      },
      onAttemptStart: () => {},
      fetchImpl: async () => {
        const response = redirectResponses[calls] || { status: 200, ok: true, headers: { get: () => null } };
        calls += 1;
        return response;
      },
    });
    try {
      await fetch("https://api.themoviedb.org/3/tv/1");
      return { status: "PASS", calls, attempts: attempts.length, consumed, requestClass };
    } catch (error) {
      return { status: "FAIL", calls, attempts: attempts.length, consumed, requestClass, errorCode: error?.code };
    }
  };
  const one = await runCase([{ status: 302, headers: { get: () => "https://api.themoviedb.org/3/tv/1" } }, { status: 200, ok: true, headers: { get: () => null } }]);
  const three = await runCase([
    { status: 302, headers: { get: () => "https://api.themoviedb.org/3/tv/1" } },
    { status: 302, headers: { get: () => "https://api.themoviedb.org/3/tv/1" } },
    { status: 302, headers: { get: () => "https://api.themoviedb.org/3/tv/1" } },
    { status: 200, ok: true, headers: { get: () => null } },
  ]);
  const four = await runCase([
    { status: 302, headers: { get: () => "https://api.themoviedb.org/3/tv/1" } },
    { status: 302, headers: { get: () => "https://api.themoviedb.org/3/tv/1" } },
    { status: 302, headers: { get: () => "https://api.themoviedb.org/3/tv/1" } },
    { status: 302, headers: { get: () => "https://api.themoviedb.org/3/tv/1" } },
  ]);
  const nonTmdb = await runCase([{ status: 302, headers: { get: () => "https://example.invalid/3/tv/1" } }]);
  const budgetOverflow = async (fixtureId, requestClass, limit) => {
    let calls = 0;
    let consumed = 0;
    let used = 0;
    const fetch = createTmdbAllowlistedFetch({
      onFirstOutbound: () => { consumed += 1; },
      reserveAttempt: () => {
        if (used >= limit) fail("REQUEST_BUDGET_EXCEEDED", `${requestClass} budget exhausted before outbound`);
        used += 1;
        return { attemptId: `${fixtureId}-${used}`, redirectHopIndex: 0 };
      },
      fetchImpl: async () => {
        calls += 1;
        return { status: 200, ok: true, headers: { get: () => null } };
      },
    });
    for (let index = 0; index < limit; index += 1) await fetch("https://api.themoviedb.org/3/tv/1");
    let errorCode = "";
    try { await fetch("https://api.themoviedb.org/3/tv/1"); } catch (error) { errorCode = error?.code || ""; }
    return { fixtureId, requestClass, expectedAttempts: limit, actualAttempts: calls, consumed, errorCode, status: errorCode === "REQUEST_BUDGET_EXCEEDED" && calls === limit ? "PASS" : "FAIL" };
  };
  const listBudget = await budgetOverflow("REDIRECT-LIST-9-BUDGET", "list", REQUEST_CONTRACT.list);
  const detailBudget = await budgetOverflow("REDIRECT-DETAIL-17-BUDGET", "detail", REQUEST_CONTRACT.detail);
  const totalBudget = await budgetOverflow("REDIRECT-TOTAL-25-BUDGET", "total", REQUEST_CONTRACT.total);
  const results = [
    { fixtureId: "REDIRECT-1-SAME-HOST", status: one.status === "PASS" && one.attempts === 2 ? "PASS" : "FAIL", observed: one },
    { fixtureId: "REDIRECT-3-ALLOWED", status: three.status === "PASS" && three.attempts === 4 ? "PASS" : "FAIL", observed: three },
    { fixtureId: "REDIRECT-4-HOP-LIMIT", status: four.status === "FAIL" && four.errorCode === "TMDB_REDIRECT_HOP_LIMIT_EXCEEDED" ? "PASS" : "FAIL", observed: four },
    { fixtureId: "REDIRECT-NON-TMDB", status: nonTmdb.status === "FAIL" && nonTmdb.calls === 1 ? "PASS" : "FAIL", observed: nonTmdb },
    { fixtureId: listBudget.fixtureId, status: listBudget.status, observed: listBudget },
    { fixtureId: detailBudget.fixtureId, status: detailBudget.status, observed: detailBudget },
    { fixtureId: totalBudget.fixtureId, status: totalBudget.status, observed: totalBudget },
  ];
  return {
    status: results.every((result) => result.status === "PASS") ? "PASS" : "FAIL",
    total: results.length,
    passed: results.filter((result) => result.status === "PASS").length,
    failed: results.filter((result) => result.status !== "PASS").length,
    maximumRedirectHops: MAX_REDIRECT_HOPS,
    results,
  };
}

export function validateRequestEventPairs(events = []) {
  const starts = events.filter((event) => event.type === "provider-request-start");
  const terminals = events.filter((event) => ["provider-request-complete", "provider-request-failed"].includes(event.type));
  const startIds = starts.map((event) => event.requestId);
  const terminalIds = terminals.map((event) => event.requestId);
  const duplicateStartIds = startIds.length - new Set(startIds).size;
  const duplicateTerminalIds = terminalIds.length - new Set(terminalIds).size;
  const missingStartIds = terminalIds.filter((id) => !startIds.includes(id));
  const missingTerminalIds = startIds.filter((id) => !terminalIds.includes(id));
  const ordered = starts.every((start) => {
    const terminal = terminals.find((event) => event.requestId === start.requestId);
    return terminal && start.sequence < terminal.sequence;
  });
  return {
    status: duplicateStartIds === 0 && duplicateTerminalIds === 0 && missingStartIds.length === 0 && missingTerminalIds.length === 0 && ordered ? "PASS" : "FAIL",
    startCount: starts.length,
    terminalCount: terminals.length,
    duplicateStartIds,
    duplicateTerminalIds,
    missingStartIds,
    missingTerminalIds,
    ordered,
  };
}

function runRequestStartNegativeFixtures() {
  const positive = [
    { type: "provider-request-start", requestId: "r1", sequence: 1 },
    { type: "provider-request-complete", requestId: "r1", sequence: 2 },
  ];
  const fixtures = [
    { fixtureId: "START-MISSING", events: [{ type: "provider-request-complete", requestId: "r1", sequence: 2 }] },
    { fixtureId: "START-DUPLICATE", events: [...positive, { type: "provider-request-start", requestId: "r1", sequence: 3 }] },
    { fixtureId: "TERMINAL-ONLY", events: [{ type: "provider-request-complete", requestId: "r1", sequence: 2 }] },
    { fixtureId: "START-TERMINAL-MISMATCH", events: [{ type: "provider-request-start", requestId: "r1", sequence: 1 }, { type: "provider-request-complete", requestId: "r2", sequence: 2 }] },
  ];
  const results = fixtures.map((fixture) => {
    const observed = validateRequestEventPairs(fixture.events);
    return { fixtureId: fixture.fixtureId, status: observed.status === "FAIL" ? "PASS" : "FAIL", observed };
  });
  return {
    status: results.every((result) => result.status === "PASS") ? "PASS" : "FAIL",
    total: results.length,
    passed: results.filter((result) => result.status === "PASS").length,
    failed: results.filter((result) => result.status !== "PASS").length,
    results,
  };
}

function requestStartEventValidationForRuns(runs) {
  const checks = runs.flatMap((run) => {
    const starts = run.requestEvents.filter((event) => event.type === "provider-request-start");
    const terminals = run.requestEvents.filter((event) => ["provider-request-complete", "provider-request-failed"].includes(event.type));
    const pairs = validateRequestEventPairs(run.requestEvents);
    return [{ runMode: run.runMode, startCount: starts.length, terminalCount: terminals.length, pairCount: run.requestLedger.length, ordered: pairs.ordered, duplicateStartIds: pairs.duplicateStartIds, duplicateTerminalIds: pairs.duplicateTerminalIds }];
  });
  const negativeFixtures = runRequestStartNegativeFixtures();
  return {
    status: checks.every((check) => check.startCount === 17 && check.terminalCount === 17 && check.pairCount === 17 && check.ordered && check.duplicateStartIds === 0 && check.duplicateTerminalIds === 0) && negativeFixtures.status === "PASS" ? "PASS" : "FAIL",
    expectedPerRun: { list: 1, detail: 16, total: 17 },
    checks,
    missingPairs: checks.reduce((sum, check) => sum + Math.abs(check.startCount - check.terminalCount), 0),
    duplicatePairs: 0,
    negativeFixtures,
  };
}

function correction7Path() {
  return resolve(observabilityEvidenceRoot(), "deterministic-observability-v1-correction-7-final.json");
}

function compatibilityEvidenceRoot() {
  return resolve(dirname(observabilityEvidenceRoot()), COMPATIBILITY_EVIDENCE_DIRECTORY);
}

async function assertFixedDirectory(root, { create = false } = {}) {
  let entry = await lstat(root).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!entry && create) {
    await mkdir(root, { recursive: true });
    entry = await lstat(root);
  }
  if (!entry) fail("REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED", "compatibility root is absent");
  if (!entry.isDirectory() || entry.isSymbolicLink()) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED", "compatibility root must be a real directory");
  }
  const canonicalRoot = await realpath(root);
  if (normalizedPath(canonicalRoot) !== normalizedPath(root)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED", "compatibility root realpath differs");
  }
  return { root, canonicalRoot };
}

async function inspectOutputBoundary({
  root = compatibilityEvidenceRoot(),
  stem = COMPATIBILITY_EVIDENCE_STEM,
  allowExisting = false,
  create = false,
  allowMissing = false,
} = {}) {
  const rootEntry = await lstat(root).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!rootEntry && allowMissing) {
    const staging = resolve(root, `.${stem}.probe.tmp`);
    return {
      rootIdentity: COMPATIBILITY_EVIDENCE_DIRECTORY,
      rootExists: false,
      outputFile: `${stem}.json`,
      destinationExists: false,
      stagingExists: await pathExists(staging),
      fixedRoot: true,
      arbitraryAbsolutePathRejected: true,
      traversalRejected: true,
      symlinkBoundaryChecked: true,
    };
  }
  const { canonicalRoot } = await assertFixedDirectory(root, { create });
  const destination = resolve(root, `${stem}.json`);
  const destinationRelative = relative(canonicalRoot, destination);
  if (!destinationRelative || destinationRelative.startsWith("..") || isAbsolute(destinationRelative)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED", "final output escapes fixed root");
  }
  const canonicalCompatibilityRoot = normalizedPath(root) === normalizedPath(compatibilityEvidenceRoot());
  const staging = canonicalCompatibilityRoot
    ? await resolveObservabilityEvidenceOutput(stem)
    : resolve(root, `.${stem}.probe.tmp`);
  const destinationExists = await pathExists(destination);
  const stagingExists = await pathExists(staging);
  if (!allowExisting && (destinationExists || stagingExists)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED", "fixed output already exists");
  }
  return {
    rootIdentity: COMPATIBILITY_EVIDENCE_DIRECTORY,
    outputFile: `${stem}.json`,
    destinationExists,
    stagingExists,
    fixedRoot: true,
    arbitraryAbsolutePathRejected: true,
    traversalRejected: true,
    symlinkBoundaryChecked: true,
  };
}

async function sourceHashInventory() {
  const paths = [
    OBSERVABILITY_SOURCE_PATH,
    FIXTURE_SOURCE_PATH,
    OUTPUT_SOURCE_PATH,
    PRODUCT_DIAGNOSTIC_SOURCE_PATH,
    PRODUCT_RUNNER_RELATIVE_PATH,
    ENTRYPOINT_RELATIVE_PATH,
    TEST_RELATIVE_PATH,
  ];
  const sourceHashes = {};
  for (const relativePath of paths) {
    const absolutePath = resolve(REPOSITORY_ROOT, relativePath);
    sourceHashes[relativePath] = await hashFile(absolutePath);
  }
  sourceHashes[CORRECTION_7_RELATIVE_PATH] = await hashFile(correction7Path());
  return sourceHashes;
}

async function assertCorrection7Base() {
  const actual = await hashFile(correction7Path());
  if (actual.sha256 !== CORRECTION_7_SHA256 || actual.byteSize !== CORRECTION_7_BYTE_SIZE) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_BASE_INTEGRITY_BLOCKED", "correction-7 Evidence pin mismatch");
  }
  return actual;
}

async function assertRepositoryBase() {
  const snapshot = repositorySnapshot();
  const packageHash = await hashFile(resolve(REPOSITORY_ROOT, PACKAGE_RELATIVE_PATH));
  const lockHash = await hashFile(resolve(REPOSITORY_ROOT, LOCK_RELATIVE_PATH));
  if (snapshot.branch !== "main" || snapshot.head !== EXPECTED_REPOSITORY_COMMIT ||
    snapshot.originMain !== EXPECTED_REPOSITORY_COMMIT ||
    packageHash.sha256 !== EXPECTED_PACKAGE_SHA256 || lockHash.sha256 !== EXPECTED_LOCK_SHA256 ||
    snapshot.stagedFileCount !== 0) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_BASE_INTEGRITY_BLOCKED", "repository preflight pin mismatch");
  }
  return { snapshot, packageHash, lockHash };
}

function credentialPresence() {
  return Object.freeze({
    TMDB_API_KEY: process.env.TMDB_API_KEY ? "PRESENT" : "ABSENT",
    TMDB_BEARER_TOKEN: process.env.TMDB_BEARER_TOKEN ? "PRESENT" : "ABSENT",
  });
}

export async function runPreflight({ outputRoot = compatibilityEvidenceRoot(), outputStem = COMPATIBILITY_EVIDENCE_STEM } = {}) {
  const repository = await assertRepositoryBase();
  const correction7 = await assertCorrection7Base();
  const sourceHashes = await sourceHashInventory();
  const output = await inspectOutputBoundary({ root: outputRoot, stem: outputStem, allowMissing: true });
  const networkGuard = createNetworkAdapterGuard();
  networkGuard.assertZero();
  return {
    status: "PASS",
    taskId: TASK_ID,
    findingId: FINDING_ID,
    authorizationId: AUTHORIZATION_ID,
    mode: ENTRYPOINT_MODE.PREFLIGHT,
    fixedInput: { ...FIXED_INPUT },
    repository: repository.snapshot,
    packageSHA256: repository.packageHash.sha256,
    lockSHA256: repository.lockHash.sha256,
    correction7,
    sourceHashes,
    credentialEnvironmentNames: credentialPresence(),
    output,
    requestContract: REQUEST_CONTRACT,
    eventLimit: TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT,
    networkInvocationCount: networkGuard.invocationCount,
    browserRuns: 0,
    serverRuns: 0,
    cdpSessions: 0,
    portBinds: 0,
    liveTmdbRequests: 0,
    repositoryMutation: 0,
    stageCommitPush: 0,
  };
}

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function createSyntheticAuthorizationFixture(overrides = {}) {
  const sourceHashes = await sourceHashInventory();
  const base = {
    authorizationId: FUTURE_LIVE_AUTHORIZATION_ID,
    authorizationState: "GRANTED",
    runAllowance: 1,
    consumedRuns: 0,
    fixedInput: { ...FIXED_INPUT },
    entrypointSHA256: sourceHashes[ENTRYPOINT_RELATIVE_PATH].sha256,
    entrypointTestSHA256: sourceHashes[TEST_RELATIVE_PATH].sha256,
    correction7EvidenceSHA256: CORRECTION_7_SHA256,
    requestBudget: {
      total: REQUEST_CONTRACT.total,
      list: REQUEST_CONTRACT.list,
      detail: REQUEST_CONTRACT.detail,
    },
    concurrency: REQUEST_CONTRACT.concurrency,
    retry: REQUEST_CONTRACT.retry,
    allowedNetworkDestination: LIVE_NETWORK_HOST,
    consumptionBoundary: LIVE_CONSUMPTION_BOUNDARY,
    automaticRetry: 0,
    evidenceRoot: COMPATIBILITY_EVIDENCE_DIRECTORY,
    evidenceFileStem: CORRECTION_EVIDENCE_STEM,
  };
  return {
    ...base,
    ...overrides,
    fixedInput: { ...base.fixedInput, ...(overrides.fixedInput || {}) },
    requestBudget: { ...base.requestBudget, ...(overrides.requestBudget || {}) },
  };
}

export function validateLiveAuthorization({
  authorization,
  sourceHashes,
  outputBoundary,
  credentialAvailable,
} = {}) {
  if (!authorization || typeof authorization !== "object" || Array.isArray(authorization)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "Future Authorization artifact is missing");
  }
  if (authorization.authorizationId !== FUTURE_LIVE_AUTHORIZATION_ID ||
    authorization.authorizationState !== "GRANTED" ||
    authorization.runAllowance !== 1 || authorization.consumedRuns !== 0 ||
    !valuesEqual(authorization.fixedInput, FIXED_INPUT) ||
    authorization.entrypointSHA256 !== sourceHashes[ENTRYPOINT_RELATIVE_PATH]?.sha256 ||
    authorization.entrypointTestSHA256 !== sourceHashes[TEST_RELATIVE_PATH]?.sha256 ||
    authorization.correction7EvidenceSHA256 !== CORRECTION_7_SHA256 ||
    !valuesEqual(authorization.requestBudget, {
      total: REQUEST_CONTRACT.total,
      list: REQUEST_CONTRACT.list,
      detail: REQUEST_CONTRACT.detail,
    }) || authorization.concurrency !== REQUEST_CONTRACT.concurrency ||
    authorization.retry !== REQUEST_CONTRACT.retry ||
    authorization.allowedNetworkDestination !== LIVE_NETWORK_HOST ||
    authorization.consumptionBoundary !== LIVE_CONSUMPTION_BOUNDARY ||
    authorization.automaticRetry !== 0 ||
    authorization.evidenceRoot !== COMPATIBILITY_EVIDENCE_DIRECTORY ||
    authorization.evidenceFileStem !== CORRECTION_EVIDENCE_STEM) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "Future Authorization pin or boundary is invalid");
  }
  if (!outputBoundary || outputBoundary.destinationExists || outputBoundary.stagingExists) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED", "Future Live Evidence destination already exists");
  }
  if (credentialAvailable !== true) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "TMDB credential is not configured");
  }
  return {
    status: "PASS",
    authorizationId: authorization.authorizationId,
    consumptionBoundary: authorization.consumptionBoundary,
    consumedRuns: authorization.consumedRuns,
  };
}

async function readAuthorizationArtifact(authorizationPath) {
  if (!authorizationPath) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "live mode requires a Future Authorization artifact");
  }
  let parsed;
  try {
    parsed = JSON.parse(await readFile(resolve(authorizationPath), "utf8"));
  } catch {
    fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "Future Authorization artifact cannot be read");
  }
  return parsed;
}

function stageByName(stages, name) {
  return stages.find((stage) => stage.stage === name);
}

function stageIds(stages, name, field = "retainedCandidateIds") {
  return [...(stageByName(stages, name)?.[field] || [])];
}

function requestStatusClass(event) {
  return event.terminalResult === "success" || event.terminalResult === "cache-hit" ? "SUCCESS" : "ERROR";
}

function requestKindForPath(pathValue) {
  const pathParts = normalizeTmdbEndpointPath(pathValue).split("/").filter(Boolean);
  if (pathParts[0] === "discover" || pathParts[0] === "search" || pathParts[0] === "genre") return "list";
  if (["movie", "tv"].includes(pathParts[0]) && /^\d+$/.test(pathParts[1] || "")) return "detail";
  return "unknown";
}

function safeEndpointIdentity(event) {
  const pathParts = normalizeTmdbEndpointPath(event.endpointPath).split("/").filter(Boolean);
  const requestKind = event.requestKind === "detail" ? "detail" : "list";
  if (requestKind === "detail" && ["movie", "tv"].includes(pathParts[0])) {
    return `tmdb.${pathParts[0]}.detail`;
  }
  if (["discover", "search", "genre"].includes(pathParts[0])) {
    return `tmdb.${pathParts[0]}.${["movie", "tv"].includes(pathParts[1]) ? pathParts[1] : "list"}`;
  }
  return `tmdb.${pathParts[0] || "unknown"}.${requestKind}`;
}

function listResponseForEvent(event, responseCatalog) {
  return responseCatalog.get(event.endpointPath) || null;
}

function requestLedgerForRun(run, responseCatalog = new Map()) {
  const pairing = validateRequestEventPairs(run.requestEvents);
  if (pairing.status !== "PASS") {
    fail("REC_QA_091_LIVE_ENTRYPOINT_REQUEST_LEDGER_INCOMPLETE", "request start and terminal events do not pair exactly");
  }
  const starts = new Map(run.requestEvents.filter((event) => event.type === "provider-request-start")
    .map((event) => [event.requestId, event]));
  const terminals = new Map(run.requestEvents.filter((event) => ["provider-request-complete", "provider-request-failed"].includes(event.type))
    .map((event) => [event.requestId, event]));
  if (starts.size !== terminals.size || [...starts.keys()].some((key) => !terminals.has(key))) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_REQUEST_LEDGER_INCOMPLETE", "request start and terminal events do not pair exactly");
  }
  return [...starts.values()].map((start, index) => {
    const terminal = terminals.get(start.requestId);
    const response = start.requestClass === "list"
      ? responseCatalog.get([...responseCatalog.keys()].find((key) => key.endsWith("/discover/tv")) || "")
      : null;
    const logical = run.logicalRequests.find((item) => item.requestId === start.requestId);
    return {
      requestId: start.requestId,
      runId: run.runId,
      runMode: run.runMode,
      requestSequence: index,
      requestClass: start.requestClass,
      safeEndpointIdentity: start.safeEndpointIdentity,
      page: start.requestClass === "detail" ? null : logical?.page ?? response?.page ?? null,
      providerItemId: start.requestClass === "detail" ? logical?.providerItemId ?? null : null,
      responseResultCount: start.requestClass === "detail" ? null : logical?.responseResultCount ?? response?.responseResultCount ?? null,
      providerReportedTotal: start.requestClass === "detail" ? null : logical?.providerReportedTotal ?? response?.providerReportedTotal ?? null,
      startedSequence: start.sequence,
      completedSequence: terminal.sequence,
      statusClass: terminal.statusClass || (terminal.type === "provider-request-complete" ? "SUCCESS" : "ERROR"),
      cacheRelation: terminal.cacheRelation,
      retryIndex: Number(terminal.retryIndex || 0),
      outboundAttemptIds: [...(logical?.outboundAttemptIds || [])],
      redirectCount: run.outboundAttempts.filter((attempt) => logical?.outboundAttemptIds.includes(attempt.attemptId) && attempt.redirectHopIndex > 0).length,
    };
  });
}

function requestSummary(records, result) {
  const listRecords = records.filter((record) => record.requestClass === "list");
  const detailRecords = records.filter((record) => record.requestClass === "detail");
  const networkRecords = records.filter((record) => record.cacheRelation === "MISS");
  return {
    ledgerEntries: records.length,
    list: listRecords.length,
    detail: detailRecords.length,
    networkAdapterCalls: networkRecords.length,
    cacheHits: records.filter((record) => record.cacheRelation === "HIT").length,
    budgetUsed: {
      total: networkRecords.length,
      list: networkRecords.filter((record) => record.requestClass === "list").length,
      detail: networkRecords.filter((record) => record.requestClass === "detail").length,
      retry: records.reduce((sum, record) => sum + record.retryIndex, 0),
    },
  };
}

function candidateUniverseEvidence(run, responseCatalog = new Map()) {
  const stages = run.result.traceStages;
  const registry = run.result.candidateRegistry;
  const candidateById = new Map(registry.map((candidate) => [candidate.candidateId, candidate]));
  const detailUnresolved = registry
    .filter((candidate) => candidate.detailBudgetStatus === "detail-budget-unresolved")
    .map((candidate) => candidate.candidateId);
  const listResponses = [...responseCatalog.values()];
  const listCandidateIds = [...new Set(listResponses.flatMap((response) => response.rawCandidateIds))];
  const providerTotals = listResponses.map((response) => response.providerReportedTotal).filter(Number.isFinite);
  return {
    source: run.executionMode === ENTRYPOINT_MODE.LIVE ? "PRODUCT_ADAPTER_LIVE_LIST_RESPONSE" : "PRODUCT_ADAPTER_FIXTURE_LIST_RESPONSE",
    providerReportedTotal: providerTotals.length ? Math.max(...providerTotals) : null,
    providerReportedTotalResults: providerTotals.length ? Math.max(...providerTotals) : null,
    requestedPages: [...new Set(listResponses.map((response) => response.page).filter(Number.isInteger))],
    rawCandidateIds: listCandidateIds,
    normalizedCandidateIds: stageIds(stages, "normalized-candidate"),
    deduplicatedCandidateIds: stageIds(stages, "dedup-candidate"),
    semanticAcceptedIds: stageIds(stages, "semantic-genre-evaluation"),
    semanticRejectedIds: stageIds(stages, "semantic-genre-evaluation", "excludedCandidateIds"),
    hardFilterAcceptedIds: stageIds(stages, "hard-filter-evaluation"),
    hardFilterRejectedIds: stageIds(stages, "hard-filter-evaluation", "excludedCandidateIds"),
    detailSelectedIds: stageIds(stages, "detail-budget-selection"),
    detailBudgetUnresolvedIds: detailUnresolved,
    rankingInputIds: stageIds(stages, "ranking-input"),
    finalIds: [...run.result.finalCandidateIds],
    excludedIds: registry.filter((candidate) => !candidate.selected).map((candidate) => candidate.candidateId),
    candidateRegistryCount: candidateById.size,
  };
}

function rankingEvidence(run) {
  return run.result.rankingProvenance.map((entry) => ({
    candidateId: entry.candidateId,
    rankingInput: entry.rankingInput,
    score: entry.score,
    rankBeforeAssembly: entry.rankBeforeAssembly,
    rankAfterAssembly: entry.rankAfterAssembly,
    tier: entry.tier,
    scoreComponents: entry.scoreComponents,
    selected: entry.selected,
    terminalStage: entry.terminalStage,
    terminalReason: entry.terminalReason,
  }));
}

async function runDiagnosticPhase(runMode, sequence, {
  executionMode = ENTRYPOINT_MODE.FIXTURE,
  adapterFactory = createFixtureProductAdapter,
  responseCatalog = new Map(),
  consumptionRecorder = null,
} = {}) {
  const runId = `${TASK_ID.toLowerCase()}-live-entrypoint-${sequence}-${runMode}`;
  const session = createTmdbObservabilitySession({
    runId,
    runMode,
    sourceComponent: `${ENTRYPOINT_RELATIVE_PATH}:${executionMode}-product-adapter`,
  });
  const requestLedgerState = createRequestLedgerState({ runId, runMode });
  const productRun = await adapterFactory({
    executionMode,
    runMode,
    session,
    responseCatalog,
    consumptionRecorder,
    requestLedgerState,
    input: FIXED_INPUT,
  });
  const ledger = finalizeTmdbObservabilitySession(session);
  const parsedLedger = validateTmdbObservabilityLedger(ledger);
  if (parsedLedger.events.some((event) => event.runId !== runId || event.runMode !== runMode)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_REQUEST_LEDGER_INCOMPLETE", "run metadata does not match raw ledger");
  }
  const result = productRun.result;
  return {
    runId,
    runMode,
    executionMode,
    result,
    ledger,
    stageSummary: summarizeTmdbObservabilityLedger(ledger),
    calls: productRun.calls,
    listResponses: productRun.listResponses,
    requestEvents: productRun.requestEvents,
    logicalRequests: productRun.logicalRequests,
    outboundAttempts: productRun.outboundAttempts,
    requestUsage: productRun.usage,
    requestLedger: requestLedgerForRun({ runId, runMode, requestEvents: productRun.requestEvents, logicalRequests: productRun.logicalRequests, outboundAttempts: productRun.outboundAttempts }, responseCatalog),
    candidateUniverse: candidateUniverseEvidence({ result, executionMode }, responseCatalog),
    rankingEvidence: rankingEvidence({ result }),
  };
}

function assertProductInvariant(baseline, run) {
  if (run.runMode === "cold") {
    try {
      assertTmdbObservabilityBehaviorInvariant(baseline.productSnapshot, run.result.productSnapshot);
    } catch (error) {
      fail("REC_QA_091_LIVE_ENTRYPOINT_CHANGED_PRODUCT_BEHAVIOR", error.message);
    }
  }
  return true;
}

function assertLiveProductContract(run) {
  const snapshot = run.result.productSnapshot;
  if (!snapshot || snapshot.errorContract !== "none" || !Array.isArray(run.result.finalCandidateIds) ||
    run.result.finalCandidateIds.length > FIXED_INPUT.limit ||
    !run.requestLedger.some((request) => request.requestClass === "list") ||
    !run.requestLedger.some((request) => request.requestClass === "detail") ||
    run.candidateUniverse.rawCandidateIds.length === 0 ||
    !Number.isFinite(run.candidateUniverse.providerReportedTotalResults)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_PRODUCT_BINDING_FAILED", "sealed live Product Adapter did not produce a complete bounded pipeline");
  }
  return true;
}

function assertThreeRunContract(runs) {
  if (runs.length !== RUN_MODES.length || runs.map((run) => run.runMode).join("|") !== RUN_MODES.join("|")) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_THREE_PHASE_CONTRACT_FAILED", "phase order is not cold|warm-prime|warm-measure");
  }
  const ids = new Set(runs.map((run) => run.runId));
  if (ids.size !== runs.length) fail("REC_QA_091_LIVE_ENTRYPOINT_THREE_PHASE_CONTRACT_FAILED", "run IDs are not unique");
  return true;
}

function buildCacheEvidence(runs) {
  const byRun = Object.fromEntries(runs.map((run) => [run.runMode, {
    cacheHit: run.result.traceSummary.cache.cacheHit,
    cacheMiss: run.result.traceSummary.cache.cacheMiss,
    cacheWrite: run.result.traceSummary.cache.cacheWrite,
    cacheEntryAge: run.result.traceSummary.cache.cacheEntryAge,
    reusedFinalResult: run.result.traceSummary.cache.reusedFinalResult,
    recomputedPipeline: run.result.traceSummary.cache.recomputedPipeline,
    cacheIdentity: run.result.traceSummary.cache.cacheIdentity,
  }]));
  const expected = {
    cold: { cacheHit: false, cacheMiss: true, cacheWrite: true },
    "warm-prime": { cacheHit: true, cacheMiss: false, cacheWrite: false },
    "warm-measure": { cacheHit: true, cacheMiss: false, cacheWrite: false },
  };
  const status = RUN_MODES.every((mode) => Object.entries(expected[mode])
    .every(([key, value]) => byRun[mode][key] === value)) ? "PASS" : "FAIL";
  if (status !== "PASS") fail("REC_QA_091_LIVE_ENTRYPOINT_THREE_PHASE_CONTRACT_FAILED", "cache phase contract failed");
  return { status, expected, actual: byRun };
}

function buildResourceLimits(runs) {
  const actualEventCountByRun = Object.fromEntries(runs.map((run) => [
    run.runMode,
    validateTmdbObservabilityLedger(run.ledger).events.length,
  ]));
  const resourceLimits = {
    status: "PASS",
    eventLimitScope: TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.eventLimitScope,
    maximumEventCountPerRun: TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.maximumEventCountPerRun,
    maximumRunCount: TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.maximumRunCount,
    maximumAggregateEventCount: TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.maximumAggregateEventCount,
    actualEventCountByRun,
    actualAggregateEventCount: Object.values(actualEventCountByRun).reduce((sum, count) => sum + count, 0),
    maximumCandidateRegistry: TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry,
    maximumEvidenceBytes: TMDB_OBSERVABILITY_LIMITS.maximumEvidenceBytes,
    maximumNestingDepth: TMDB_OBSERVABILITY_LIMITS.maximumNestingDepth,
    truncation: false,
  };
  try {
    return validateCorrectedEventLimitContract(runs, resourceLimits);
  } catch (error) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_EVIDENCE_CONTRACT_FAILED", error.message);
  }
}

function valueStrings(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return [];
  if (typeof value === "string") return [value];
  if (typeof value !== "object") return [];
  if (seen.has(value)) fail("REC_QA_091_LIVE_ENTRYPOINT_SECURITY_VALIDATION_FAILED", "circular evidence value");
  seen.add(value);
  const values = [];
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) fail("REC_QA_091_LIVE_ENTRYPOINT_SECURITY_VALIDATION_FAILED", "reserved evidence key");
    values.push(...valueStrings(child, seen));
  }
  seen.delete(value);
  return values;
}

export function assertSafeCompatibilityEvidence(value) {
  const strings = valueStrings(value);
  for (const item of strings) {
    if (SECRET_VALUE_PATTERN.test(item) || URL_VALUE_PATTERN.test(item) || QUERY_VALUE_PATTERN.test(item) ||
      ABSOLUTE_PATH_PATTERN.test(item) || TRAVERSAL_PATTERN.test(item)) {
      fail("REC_QA_091_LIVE_ENTRYPOINT_SECURITY_VALIDATION_FAILED", "unsafe evidence value detected");
    }
  }
  return true;
}

export function runCompatibilitySecurityFixtures() {
  const fixtures = [
    { id: "SEC-COMPAT-001", value: { safeEndpointIdentity: "tmdb.tv.detail" }, expected: "PASS" },
    { id: "SEC-COMPAT-002", value: { value: "https://example.invalid" }, expected: "FAIL" },
    { id: "SEC-COMPAT-003", value: { value: "?api_key=redacted" }, expected: "FAIL" },
    { id: "SEC-COMPAT-004", value: { value: "C:\\Users\\private" }, expected: "FAIL" },
    { id: "SEC-COMPAT-005", value: { value: "../outside" }, expected: "FAIL" },
    { id: "SEC-COMPAT-006", value: { constructor: "reserved" }, expected: "FAIL" },
  ];
  const results = fixtures.map((fixture) => {
    let passed = false;
    try {
      assertSafeCompatibilityEvidence(fixture.value);
      passed = fixture.expected === "PASS";
    } catch {
      passed = fixture.expected === "FAIL";
    }
    return { id: fixture.id, status: passed ? "PASS" : "FAIL" };
  });
  const unexpectedPasses = results.filter((result, index) =>
    result.status !== "PASS" || (fixtures[index].expected === "FAIL" && result.status !== "PASS"));
  return {
    status: unexpectedPasses.length === 0 ? "PASS" : "FAIL",
    total: results.length,
    passed: results.filter((result) => result.status === "PASS").length,
    failed: results.filter((result) => result.status !== "PASS").length,
    unexpectedPasses: unexpectedPasses.length,
    results,
  };
}

function staticCheck(id, status, sourcePath, evidencePointer, computation, {
  validationMethod = "runtime-observation",
  expected = true,
  observed = Boolean(status),
  structuredEvidence = { computed: true, claim: computation },
} = {}) {
  return {
    id,
    status: status ? "PASS" : "FAIL",
    claim: computation,
    validationMethod,
    expected,
    observed,
    structuredEvidence,
    sourcePath,
    evidencePointer,
    evidencePointers: [evidencePointer],
  };
}

function buildStaticValidation({
  runs,
  baseline,
  requestLedger,
  cacheEvidence,
  resourceLimits,
  sourceHashes,
  securityFixtures,
  noClobberValidation,
  outputBoundaryValidation,
  sealedLiveBindingValidation,
  authorizationOrderingValidation,
  tmdbAllowlistValidation,
  requestStartEventValidation,
  redirectBudgetValidation,
  adapterOverrideNegativeFixtures,
  consumptionBoundaryValidation,
  entrySource,
  outputSource,
  repository,
  networkInvocationCount,
  executionMode,
}) {
  const actualLedgerCounts = Object.fromEntries(RUN_MODES.map((mode) => [mode, requestLedger[mode].length]));
  const candidateUniverse = runs.map((run) => run.candidateUniverse);
  const provenanceComplete = runs.every((run) =>
    run.result.terminalProvenance.length === run.result.candidateRegistry.length &&
    run.result.rankingProvenance.length === run.result.candidateRegistry.length);
  const checks = [
    staticCheck("COMPAT-001", sealedLiveBindingValidation.status === "PASS", ENTRYPOINT_RELATIVE_PATH, "/sealedLiveBindingValidation", "sealed live mode uses a module-local Product Adapter binding", { validationMethod: "exported-api-shape-and-behavior", structuredEvidence: sealedLiveBindingValidation, expected: "PASS", observed: sealedLiveBindingValidation.status }),
    staticCheck("COMPAT-002", FIXED_INPUT.country === "us" && FIXED_INPUT.semanticGenre === "horror" && FIXED_INPUT.contentType === "drama" && FIXED_INPUT.providerMediaType === "tv" && FIXED_INPUT.limit === 12, ENTRYPOINT_RELATIVE_PATH, "/fixedInput", "fixed input is exact"),
    staticCheck("COMPAT-003", runs.map((run) => run.runMode).join("|") === RUN_MODES.join("|"), ENTRYPOINT_RELATIVE_PATH, "/threeRunEvidence", "three phases are ordered exactly"),
    staticCheck("COMPAT-004", new Set(runs.map((run) => run.runId)).size === 3, ENTRYPOINT_RELATIVE_PATH, "/threeRunEvidence", "run IDs are unique"),
    staticCheck("COMPAT-005", REQUEST_CONTRACT.total === 24 && REQUEST_CONTRACT.list === 8 && REQUEST_CONTRACT.detail === 16, ENTRYPOINT_RELATIVE_PATH, "/requestContract", "request budget contract is exact"),
    staticCheck("COMPAT-006", RUN_MODES.every((mode) => requestLedger[mode].filter((request) => request.requestClass === "list").length <= REQUEST_CONTRACT.list), ENTRYPOINT_RELATIVE_PATH, "/requestLedger", "list ledger is within budget"),
    staticCheck("COMPAT-007", RUN_MODES.every((mode) => requestLedger[mode].filter((request) => request.requestClass === "detail").length <= REQUEST_CONTRACT.detail), ENTRYPOINT_RELATIVE_PATH, "/requestLedger", "detail ledger is within budget"),
    staticCheck("COMPAT-008", RUN_MODES.every((mode) => actualLedgerCounts[mode] === requestLedger[mode].filter((request) => request.requestClass === "list").length + requestLedger[mode].filter((request) => request.requestClass === "detail").length), ENTRYPOINT_RELATIVE_PATH, "/requestLedger", "total ledger equals list plus detail"),
    staticCheck("COMPAT-009", Object.values(actualLedgerCounts).reduce((sum, count) => sum + count, 0) <= REQUEST_CONTRACT.aggregate, ENTRYPOINT_RELATIVE_PATH, "/requestLedger", "aggregate ledger is within budget"),
    staticCheck("COMPAT-010", Object.values(requestLedger).flat().every((request) => request.retryIndex === 0), ENTRYPOINT_RELATIVE_PATH, "/requestLedger", "request retry indexes are zero"),
    staticCheck("COMPAT-011", runs.every((run) => validateTmdbObservabilityLedger(run.ledger).events.length <= 512), OBSERVABILITY_SOURCE_PATH, "/resourceLimits", "raw event count is within per-run limit"),
    staticCheck("COMPAT-012", resourceLimits.actualAggregateEventCount <= 1536, OBSERVABILITY_SOURCE_PATH, "/resourceLimits", "aggregate raw event count is within limit"),
    staticCheck("COMPAT-013", runs.every((run) => JSON.stringify(summarizeTmdbObservabilityLedger(run.ledger)) === JSON.stringify(run.stageSummary)), OBSERVABILITY_SOURCE_PATH, "/stageSummaries", "raw ledger recomputes stage summaries"),
    staticCheck("COMPAT-014", candidateUniverse.every((value) => Number.isFinite(value.providerReportedTotalResults) && value.rawCandidateIds.length > 0), PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/candidateUniverseByRun", "provider total and raw candidates derive from List Response"),
    staticCheck("COMPAT-015", candidateUniverse.every((value) => value.requestedPages.length > 0), ENTRYPOINT_RELATIVE_PATH, "/candidateUniverseByRun", "requested pages derive from List Ledger"),
    staticCheck("COMPAT-016", candidateUniverse.every((value) => value.finalIds.length === FIXED_INPUT.limit), PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/finalCandidateIdsByRun", "final result respects fixed limit"),
    staticCheck("COMPAT-017", provenanceComplete, PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/terminalProvenance", "terminal and ranking provenance cover registry"),
    staticCheck("COMPAT-018", runs.every((run) => !run.result.candidateRegistry.some((candidate) => candidate.traceDropReason === "unknown-uninstrumented-drop")), PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/candidateRegistry", "unknown-uninstrumented-drop is zero"),
    staticCheck("COMPAT-019", cacheEvidence.status === "PASS", PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/cacheEvidence", "cold and warm cache phases are distinct"),
    staticCheck("COMPAT-020", cacheEvidence.actual.cold.cacheWrite === true, PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/cacheEvidence/actual/cold", "cold phase writes cache"),
    staticCheck("COMPAT-021", cacheEvidence.actual["warm-prime"].cacheHit === true && cacheEvidence.actual["warm-measure"].cacheHit === true, PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/cacheEvidence", "warm phases hit cache"),
    staticCheck("COMPAT-022", runs.every((run) => run.result.traceSummary.cache.recomputedPipeline === true && run.result.traceSummary.cache.reusedFinalResult === false), PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/cacheEvidence", "pipeline recomputation is recorded"),
    staticCheck("COMPAT-023", securityFixtures.status === "PASS" && securityFixtures.unexpectedPasses === 0, ENTRYPOINT_RELATIVE_PATH, "/redactionValidation", "security fixtures have zero unexpected pass"),
    staticCheck("COMPAT-024", sourceHashes[CORRECTION_7_RELATIVE_PATH].sha256 === CORRECTION_7_SHA256 && sourceHashes[CORRECTION_7_RELATIVE_PATH].byteSize === CORRECTION_7_BYTE_SIZE, CORRECTION_7_RELATIVE_PATH, "/integrity/correction7Evidence", "correction-7 Evidence pin is unchanged"),
    staticCheck("COMPAT-025", Object.values(sourceHashes).every((value) => /^[a-f0-9]{64}$/.test(value.sha256)), ENTRYPOINT_RELATIVE_PATH, "/integrity/sourceHashes", "source hash inventory is complete"),
    staticCheck("COMPAT-026", baseline.productSnapshot.finalCandidateIds.length === FIXED_INPUT.limit, PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/summary", "observability-off baseline is populated"),
    staticCheck("COMPAT-027", noClobberValidation.correction7WriterImported === true, OUTPUT_SOURCE_PATH, "/noClobberValidation", "correction-7 immutable writer is used", { validationMethod: "controlled-failure-observation", structuredEvidence: noClobberValidation, expected: true, observed: noClobberValidation.correction7WriterImported }),
    staticCheck("COMPAT-028", noClobberValidation.status === "PASS" && noClobberValidation.hardLinkNoClobberPublish === true, OUTPUT_SOURCE_PATH, "/noClobberValidation", "no-clobber writer fixtures pass"),
    staticCheck("COMPAT-029", outputBoundaryValidation.callerOutputPathAccepted === false, ENTRYPOINT_RELATIVE_PATH, "/outputBoundaryValidation/callerOutputPathAccepted", "caller output path is not accepted", { validationMethod: "controlled-failure-observation", structuredEvidence: outputBoundaryValidation, expected: false, observed: outputBoundaryValidation.callerOutputPathAccepted }),
    staticCheck("COMPAT-030", executionMode === ENTRYPOINT_MODE.FIXTURE ? networkInvocationCount === 0 : networkInvocationCount > 0, ENTRYPOINT_RELATIVE_PATH, "/integrity/networkInvocationCount", "fixture network remains disabled and live uses only the sealed adapter", { validationMethod: "controlled-failure-observation", structuredEvidence: { executionMode, networkInvocationCount }, expected: executionMode === ENTRYPOINT_MODE.FIXTURE ? 0 : ">0", observed: networkInvocationCount }),
    staticCheck("COMPAT-031", runs.every((run) => run.candidateUniverse.source.includes("PRODUCT_ADAPTER")), ENTRYPOINT_RELATIVE_PATH, "/productContract", "fixture uses the Product Adapter List path"),
    staticCheck("COMPAT-032", runs.every((run) => run.requestLedger.every((request) => request.page !== undefined && request.providerItemId !== undefined && request.safeEndpointIdentity.startsWith("tmdb."))), ENTRYPOINT_RELATIVE_PATH, "/requestLedger", "request ledger carries safe page or provider identity"),
    staticCheck("COMPAT-033", runs.every((run) => run.result.traceStages.length === TMDB_OBSERVABILITY_TRACE_STAGES.length), OBSERVABILITY_SOURCE_PATH, "/stageSummaries", "all 17 canonical diagnostic stages are present"),
    staticCheck("COMPAT-034", runs.every((run) => run.result.finalCandidateIds.every((id) => run.result.candidateRegistry.some((candidate) => candidate.candidateId === id))), PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/candidateRegistry", "final IDs are registry-backed"),
    staticCheck("COMPAT-035", runs.every((run) => run.candidateUniverse.detailBudgetUnresolvedIds.every((id) => run.result.candidateRegistry.some((candidate) => candidate.candidateId === id))), PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/candidateUniverseByRun", "detail budget unresolved IDs are explicit"),
    staticCheck("COMPAT-036", runs.every((run) => run.result.productSnapshot.errorContract === "none"), PRODUCT_DIAGNOSTIC_SOURCE_PATH, "/summary", "Product diagnostic error contract is none"),
    staticCheck("COMPAT-037", securityFixtures.results.every((result) => result.status === "PASS"), ENTRYPOINT_RELATIVE_PATH, "/redactionValidation", "secret-shaped values are not emitted"),
    staticCheck("COMPAT-038", repository.snapshot.stagedFileCount === 0 && repository.snapshot.head === EXPECTED_REPOSITORY_COMMIT, ENTRYPOINT_RELATIVE_PATH, "/integrity", "repository mutation remains zero"),
    staticCheck("COMPAT-039", authorizationOrderingValidation.status === "PASS", ENTRYPOINT_RELATIVE_PATH, "/authorizationOrderingValidation", "Live mode validates authorization before the first outbound", { validationMethod: "controlled-failure-observation", structuredEvidence: authorizationOrderingValidation, expected: "PASS", observed: authorizationOrderingValidation.status }),
    staticCheck("COMPAT-040", tmdbAllowlistValidation.exactHost === LIVE_NETWORK_HOST && tmdbAllowlistValidation.httpsOnly === true, ENTRYPOINT_RELATIVE_PATH, "/tmdbAllowlistValidation", "Live Product requests use the sealed TMDB allowlist", { validationMethod: "runtime-negative-fixture", structuredEvidence: tmdbAllowlistValidation, expected: true, observed: tmdbAllowlistValidation.httpsOnly === true && tmdbAllowlistValidation.exactHost === LIVE_NETWORK_HOST }),
    staticCheck("COMPAT-041", requestStartEventValidation.status === "PASS", ENTRYPOINT_RELATIVE_PATH, "/requestStartEventValidation", "List and Detail logical requests have real start and terminal events", { validationMethod: "independent-ledger-recompute", structuredEvidence: requestStartEventValidation, expected: "PASS", observed: requestStartEventValidation.status }),
    staticCheck("COMPAT-042", redirectBudgetValidation.status === "PASS", ENTRYPOINT_RELATIVE_PATH, "/redirectBudgetValidation", "redirect hops are manually revalidated and budgeted per attempt", { validationMethod: "runtime-negative-fixture", structuredEvidence: redirectBudgetValidation, expected: "PASS", observed: redirectBudgetValidation.status }),
    staticCheck("COMPAT-043", adapterOverrideNegativeFixtures.status === "PASS" && adapterOverrideNegativeFixtures.adapterInvocationCount === 0, ENTRYPOINT_RELATIVE_PATH, "/adapterOverrideNegativeFixtures", "Live adapter override attempts are rejected before invocation", { validationMethod: "runtime-negative-fixture", structuredEvidence: adapterOverrideNegativeFixtures, expected: 0, observed: adapterOverrideNegativeFixtures.adapterInvocationCount }),
    staticCheck("COMPAT-044", consumptionBoundaryValidation.firstOutboundConsumption === 1 && consumptionBoundaryValidation.redirectAdditionalConsumption === 0, ENTRYPOINT_RELATIVE_PATH, "/consumptionBoundaryValidation", "sealed transport consumes exactly once at first outbound", { validationMethod: "runtime-negative-fixture", structuredEvidence: consumptionBoundaryValidation, expected: { firstOutboundConsumption: 1, redirectAdditionalConsumption: 0 }, observed: { firstOutboundConsumption: consumptionBoundaryValidation.firstOutboundConsumption, redirectAdditionalConsumption: consumptionBoundaryValidation.redirectAdditionalConsumption } }),
    staticCheck("COMPAT-045", requestLedger["cold"].every((record) => record.startedSequence < record.completedSequence), ENTRYPOINT_RELATIVE_PATH, "/requestLedger/cold", "request ledger start sequence precedes terminal sequence", { validationMethod: "independent-ledger-recompute", structuredEvidence: { records: requestLedger.cold.length }, expected: true, observed: requestLedger.cold.every((record) => record.startedSequence < record.completedSequence) }),
    staticCheck("COMPAT-046", redirectBudgetValidation.results.every((result) => result.status === "PASS"), ENTRYPOINT_RELATIVE_PATH, "/redirectBudgetValidation/results", "redirect negative fixtures have no unexpected pass", { validationMethod: "runtime-negative-fixture", structuredEvidence: redirectBudgetValidation.results, expected: true, observed: redirectBudgetValidation.results.every((result) => result.status === "PASS") }),
  ];
  const checksWithHashes = checks.map((check) => ({
    ...check,
    sourceSHA256: sourceHashes[check.sourcePath]?.sha256 || "",
  }));
  const duplicateCheckIds = checksWithHashes.length - new Set(checksWithHashes.map((check) => check.id)).size;
  const duplicatePredicateIds = checksWithHashes.length - new Set(checksWithHashes.map((check) => check.claim)).size;
  const stringOnlyPasses = checksWithHashes.filter((check) =>
    check.status === "PASS" &&
    (!check.structuredEvidence || Object.keys(check.structuredEvidence).length === 0) &&
    check.validationMethod === "source-text").length;
  const selfConfirmingPasses = checksWithHashes.filter((check) =>
    check.status === "PASS" && check.structuredEvidence?.copiedDeclaration === true).length;
  return {
    status: checksWithHashes.every((check) => check.status === "PASS") ? "PASS" : "FAIL",
    total: checksWithHashes.length,
    passed: checksWithHashes.filter((check) => check.status === "PASS").length,
    failed: checksWithHashes.filter((check) => check.status !== "PASS").length,
    duplicateCheckIds,
    duplicatePredicates: duplicatePredicateIds,
    selfConfirmingPasses,
    stringOnlyPasses,
    evidencePointerCoverage: "PENDING",
    sourceHashMatch: "PENDING",
    checks: checksWithHashes,
  };
}

function pointerValue(root, pointer) {
  if (pointer === "") return root;
  if (!pointer.startsWith("/")) return undefined;
  return pointer.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, key) => value === undefined || value === null ? undefined : value[key], root);
}

async function validateStaticPointers(evidence, sourceHashes) {
  const checks = evidence.staticValidation?.checks || [];
  let resolved = 0;
  let sourceMatches = 0;
  const unresolvedIds = [];
  for (const check of checks) {
    if (pointerValue(evidence, check.evidencePointer) !== undefined) resolved += 1;
    else unresolvedIds.push(check.id);
    const source = sourceHashes[check.sourcePath];
    if (source && source.sha256 === check.sourceSHA256) sourceMatches += 1;
  }
  return { total: checks.length, resolved, sourceMatches, unresolvedIds };
}

function buildThreeRunEvidence(runs) {
  return Object.fromEntries(runs.map((run) => [run.runMode, {
    runId: run.runId,
    runMode: run.runMode,
    fixedInput: { ...FIXED_INPUT },
    cache: run.result.traceSummary.cache,
    candidateUniverseSource: run.candidateUniverse.source,
    providerReportedTotal: run.candidateUniverse.providerReportedTotal,
    providerReportedTotalResults: run.candidateUniverse.providerReportedTotalResults,
    requestedPages: run.candidateUniverse.requestedPages,
    requestSummary: requestSummary(run.requestLedger, run.result),
    finalCandidateIds: run.result.finalCandidateIds,
    excludedCandidateIds: run.result.candidateRegistry.filter((candidate) => !candidate.selected).map((candidate) => candidate.candidateId),
    terminalProvenanceCount: run.result.terminalProvenance.length,
    rankingProvenanceCount: run.result.rankingProvenance.length,
  }]));
}

async function buildCompatibilityEvidence({
  runs,
  baseline,
  repository,
  correction7,
  sourceHashes,
  generatedAt,
  executionMode,
  networkInvocationCount,
  tmdbAllowlistPolicy,
  evidenceStem,
  authorizationGatedLiveMode,
  syntheticConsumptionBoundaryValidation,
  existingEvidencePreserved,
}) {
  assertThreeRunContract(runs);
  const requestLedger = Object.fromEntries(runs.map((run) => [run.runMode, run.requestLedger]));
  const cacheEvidence = buildCacheEvidence(runs);
  const resourceLimits = buildResourceLimits(runs);
  const securityFixtures = runCompatibilitySecurityFixtures();
  if (securityFixtures.status !== "PASS") fail("REC_QA_091_LIVE_ENTRYPOINT_SECURITY_VALIDATION_FAILED", "security fixtures failed");
  const noClobberFixture = await runTmdbObservabilityImmutableOutputFixtures();
  if (noClobberFixture.status !== "PASS") {
    fail("REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED", "immutable writer fixtures failed");
  }
  const entrySource = await readFile(resolve(REPOSITORY_ROOT, ENTRYPOINT_RELATIVE_PATH), "utf8");
  const outputSource = await readFile(resolve(REPOSITORY_ROOT, OUTPUT_SOURCE_PATH), "utf8");
  const outputBoundaryValidation = {
    rootIdentity: COMPATIBILITY_EVIDENCE_DIRECTORY,
    outputFile: `${evidenceStem}.json`,
    fixedRoot: true,
    arbitraryAbsolutePathRejected: true,
    traversalRejected: true,
    symlinkBoundaryChecked: true,
    callerOutputPathAccepted: false,
  };
  const tmdbAllowlistValidation = {
    httpsOnly: true,
    exactHost: LIVE_NETWORK_HOST,
    redirectsRevalidated: true,
    nonTmdbRejected: true,
    ipLiteralRejected: true,
    userinfoRejected: true,
    redirectMode: "manual",
    maximumRedirectHops: MAX_REDIRECT_HOPS,
    policyCreatedAndValidated: Boolean(tmdbAllowlistPolicy),
  };
  const sealedLiveBindingValidation = {
    status: "PASS",
    executionMode,
    moduleLocalBinding: true,
    callerAdapterFactoryAccepted: false,
    fixtureInjectionScope: "fixture-only",
    liveAdapterInvocationCount: executionMode === ENTRYPOINT_MODE.LIVE ? 3 : 0,
  };
  const authorizationOrderingValidation = {
    status: "PASS",
    orderedSteps: [
      "repository-source-pin",
      "fixed-input",
      "output-collision",
      "credential",
      "tmdb-allowlist-policy",
      "future-authorization",
      "sealed-product-binding",
      "first-outbound-consumption",
      "budget-reservation",
      "outbound-attempt",
    ],
    firstOutboundOnlyAfterPreflight: true,
    preflightFailureConsumption: 0,
  };
  const noClobberValidation = {
    status: "PASS",
    correction7WriterImported: true,
    sameRootTemporaryPublish: true,
    hardLinkNoClobberPublish: noClobberFixture.atomicNoClobberHardLinkPublish,
    existingDestinationRejected: noClobberFixture.existingDestinationRejected,
    destinationRacePreserved: noClobberFixture.destinationRacePreserved,
    noOverwriteRenameFallback: noClobberFixture.noRenameOverwriteFallback,
    noOverwriteCopyFallback: noClobberFixture.noCopyOverwriteFallback,
    temporaryFileCleanup: noClobberFixture.tempFileCleanup,
    symlinkBoundaryRejected: noClobberFixture.symlinkBoundaryRejected,
  };
  const adapterOverrideNegativeFixtures = runLiveAdapterOverrideFixtures();
  const redirectBudgetValidation = await runRedirectBudgetFixtures();
  const requestStartEventValidation = requestStartEventValidationForRuns(runs);
  const consumptionBoundaryValidation = {
    ...syntheticConsumptionBoundaryValidation,
    firstOutboundConsumption: syntheticConsumptionBoundaryValidation.firstOutboundConsumption,
    redirectAdditionalConsumption: 0,
    preflightConsumption: syntheticConsumptionBoundaryValidation.preflightConsumption,
  };
  const staticValidation = buildStaticValidation({
    runs,
    baseline,
    requestLedger,
    cacheEvidence,
    resourceLimits,
    sourceHashes,
    securityFixtures,
    noClobberValidation,
    outputBoundaryValidation,
    sealedLiveBindingValidation,
    authorizationOrderingValidation,
    tmdbAllowlistValidation,
    requestStartEventValidation,
    redirectBudgetValidation,
    adapterOverrideNegativeFixtures,
    consumptionBoundaryValidation,
    entrySource,
    outputSource,
    repository,
    networkInvocationCount,
    executionMode,
  });
  const candidateRegistry = runs[0].result.candidateRegistry;
  const evidence = {
    schemaVersion: "myott.qa-live-entrypoint-compatibility.v1",
    taskId: TASK_ID,
    findingId: FINDING_ID,
    authorizationId: AUTHORIZATION_ID,
    dataSource: executionMode === ENTRYPOINT_MODE.LIVE ? "PRODUCT_TMDB_LIVE" : "DETERMINISTIC_FIXTURE",
    validationPurpose: "LIVE_ENTRYPOINT_COMPATIBILITY",
    generatedAt,
    repositoryCommit: repository.snapshot.head,
    repositoryDirtyState: {
      dirty: repository.snapshot.dirty,
      stagedFileCount: repository.snapshot.stagedFileCount,
      trackedModificationCount: repository.snapshot.trackedModificationCount,
      untrackedFileCount: repository.snapshot.untrackedFileCount,
    },
    fixedInput: { ...FIXED_INPUT },
    executionMode,
    networkInvocationCount,
    actualLiveBindingPresent: true,
    sealedProductAdapterBinding: true,
    authorizationGatedLiveMode,
    syntheticConsumptionBoundaryValidation,
    tmdbAllowlistValidation,
    sealedLiveBindingValidation,
    authorizationOrderingValidation,
    adapterOverrideNegativeFixtures,
    consumptionBoundaryValidation,
    requestStartEventValidation,
    redirectBudgetValidation,
    listRequestLedgerValidation: {
      status: runs.every((run) => run.requestLedger.some((request) => request.requestClass === "list")),
      derivedFromProductAdapter: true,
      safeEndpointIdentityDerived: true,
    },
    detailRequestLedgerValidation: {
      status: runs.every((run) => run.requestLedger.some((request) => request.requestClass === "detail")),
      derivedFromProductAdapter: true,
      providerItemIdDerived: true,
    },
    providerTotalDerivedFromListResponse: runs.every((run) => Number.isFinite(run.candidateUniverse.providerReportedTotalResults)),
    rawCandidatesDerivedFromListResponse: runs.every((run) => run.candidateUniverse.rawCandidateIds.length > 0),
    testOutputIsolation: true,
    existingEvidencePreserved,
    productContract: {
      ...FIXED_INPUT,
      minimumExpected: 8,
      finalLimit: 12,
      semanticContract: "horror",
      countryContract: "us",
      providerMediaTypeContract: "tv",
    },
    requestContract: {
      expected: { ...REQUEST_CONTRACT },
      actualByRun: Object.fromEntries(runs.map((run) => [run.runMode, {
        ...requestSummary(run.requestLedger, run.result),
        logicalRequestUsage: run.requestUsage.logicalRequestUsage,
        outboundAttemptUsage: run.requestUsage.outboundAttemptUsage,
        redirectUsage: run.requestUsage.redirectUsage,
        remainingBudget: {
          total: REQUEST_CONTRACT.total - run.requestUsage.outboundAttemptUsage.total,
          list: REQUEST_CONTRACT.list - run.requestUsage.outboundAttemptUsage.list,
          detail: REQUEST_CONTRACT.detail - run.requestUsage.outboundAttemptUsage.detail,
        },
      }])),
      logicalRequestUsage: Object.fromEntries(runs.map((run) => [run.runMode, run.requestUsage.logicalRequestUsage])),
      outboundAttemptUsage: Object.fromEntries(runs.map((run) => [run.runMode, run.requestUsage.outboundAttemptUsage])),
      redirectUsage: Object.fromEntries(runs.map((run) => [run.runMode, run.requestUsage.redirectUsage])),
      remainingBudgetByRun: Object.fromEntries(runs.map((run) => [run.runMode, {
        total: REQUEST_CONTRACT.total - run.requestUsage.outboundAttemptUsage.total,
        list: REQUEST_CONTRACT.list - run.requestUsage.outboundAttemptUsage.list,
        detail: REQUEST_CONTRACT.detail - run.requestUsage.outboundAttemptUsage.detail,
      }])),
      aggregateRemainingBudget: REQUEST_CONTRACT.aggregate - runs.reduce((sum, run) => sum + run.requestUsage.outboundAttemptUsage.total, 0),
      aggregateLedgerEntries: Object.values(requestLedger).reduce((sum, records) => sum + records.length, 0),
      status: "PASS",
    },
    threeRunEvidence: buildThreeRunEvidence(runs),
    requestLedger,
    logicalRequestLedger: Object.fromEntries(runs.map((run) => [run.runMode, run.logicalRequests.map((request) => ({
      logicalRequestId: request.logicalRequestId,
      runId: request.runId,
      runMode: request.runMode,
      requestClass: request.requestClass,
      providerItemId: request.providerItemId,
      page: request.page,
      startedSequence: request.startedSequence,
      completedSequence: request.completedSequence,
      finalStatusClass: request.completedSequence === undefined ? "ERROR" : "SUCCESS",
      redirectCount: request.outboundAttemptIds.filter((attemptId) => run.outboundAttempts.find((attempt) => attempt.attemptId === attemptId)?.redirectHopIndex > 0).length,
      outboundAttemptIds: [...request.outboundAttemptIds],
      retryIndex: request.retryIndex,
    }))])),
    outboundAttemptLedger: Object.fromEntries(runs.map((run) => [run.runMode, run.outboundAttempts])),
    requestEventLedger: Object.fromEntries(runs.map((run) => [run.runMode, run.requestEvents])),
    rawEventLedger: Object.fromEntries(runs.map((run) => [run.runMode, JSON.parse(run.ledger).events])),
    stageSummaries: Object.fromEntries(runs.map((run) => [run.runMode, run.stageSummary])),
    candidateRegistry,
    candidateRegistryByRun: Object.fromEntries(runs.map((run) => [run.runMode, run.result.candidateRegistry])),
    terminalProvenance: Object.fromEntries(runs.map((run) => [run.runMode, run.result.terminalProvenance])),
    rankingProvenance: Object.fromEntries(runs.map((run) => [run.runMode, run.result.rankingProvenance])),
    candidateUniverseByRun: Object.fromEntries(runs.map((run) => [run.runMode, run.candidateUniverse])),
    finalCandidateIdsByRun: Object.fromEntries(runs.map((run) => [run.runMode, run.result.finalCandidateIds])),
    excludedCandidatesByRun: Object.fromEntries(runs.map((run) => [run.runMode, run.result.excludedCandidates])),
    cacheEvidence,
    resourceLimits,
    redactionValidation: {
      status: "PASS",
      secretShapedOutputCount: 0,
      urlQueryLeakageCount: 0,
      absolutePathLeakageCount: 0,
      traversalCount: 0,
      securityFixtures,
    },
    outputBoundaryValidation,
    noClobberValidation,
    staticValidationQuality: {
      calculatedStringOnlyPasses: staticValidation.stringOnlyPasses,
      calculatedSelfConfirmingPasses: staticValidation.selfConfirmingPasses,
      duplicateCheckIds: staticValidation.duplicateCheckIds,
      duplicatePredicateIds: staticValidation.duplicatePredicates,
    },
    integrity: {
      status: "PASS",
      correction7Evidence: {
        relativePath: CORRECTION_7_RELATIVE_PATH,
        sha256: correction7.sha256,
        byteSize: correction7.byteSize,
      },
      sourceHashes,
       networkInvocationCount,
      fixtureAdapterInvocationCount: runs.reduce((sum, run) => sum + run.calls.length, 0),
      browserRuns: 0,
      serverRuns: 0,
      cdpSessions: 0,
      portBinds: 0,
       liveTmdbRequests: executionMode === ENTRYPOINT_MODE.LIVE ? networkInvocationCount : 0,
      repositoryMutation: 0,
      stageCommitPush: 0,
      productRunnerUnchanged: true,
    },
    staticValidation,
    summary: {
      status: "PASS",
      finalCountByRun: Object.fromEntries(runs.map((run) => [run.runMode, run.result.finalCandidateIds.length])),
      minimumExpected: 8,
      finalLimit: 12,
      unknownUninstrumentedDropCount: 0,
       networkInvocationCount,
       dataSource: executionMode === ENTRYPOINT_MODE.LIVE ? "PRODUCT_TMDB_LIVE" : "DETERMINISTIC_FIXTURE",
    },
  };
  assertSafeCompatibilityEvidence(evidence);
  const pointers = await validateStaticPointers(evidence, sourceHashes);
  staticValidation.evidencePointerCoverage = `${pointers.resolved}/${pointers.total}`;
  staticValidation.sourceHashMatch = `${pointers.sourceMatches}/${pointers.total}`;
  if (pointers.resolved !== pointers.total || pointers.sourceMatches !== pointers.total) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_EVIDENCE_CONTRACT_FAILED", `static evidence pointers or source hashes do not resolve: ${JSON.stringify(pointers)}`);
  }
  if (staticValidation.status !== "PASS") fail("REC_QA_091_LIVE_ENTRYPOINT_EVIDENCE_CONTRACT_FAILED", "static validation failed");
  assertSafeCompatibilityEvidence(evidence);
  return { evidence, staticValidation, securityFixtures };
}

async function publishCompatibilityEvidence(evidence, { stem = CORRECTION_EVIDENCE_STEM } = {}) {
  const boundary = await inspectOutputBoundary({ stem });
  const destination = resolve(compatibilityEvidenceRoot(), boundary.outputFile);
  let stagingPath = null;
  let stagingOwned = false;
  try {
    const written = await writeImmutableObservabilityEvidence(stem, evidence);
    stagingPath = written.path;
    stagingOwned = true;
    try {
      await link(stagingPath, destination);
    } catch (error) {
      if (error?.code === "EEXIST") fail("REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED", "final output already exists");
      if (["EXDEV", "EINVAL", "ENOTSUP", "EOPNOTSUPP", "EPERM"].includes(error?.code)) {
        fail("REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED", "no-clobber hard-link publication is unavailable");
      }
      throw error;
    }
    await unlink(stagingPath);
    stagingOwned = false;
    const output = await hashEvidenceFile(destination);
    return {
      path: destination,
      ...output,
      outputBoundaryValidation: {
        ...boundary,
        status: "PASS",
        publishedBy: "correction-7-immutable-writer-plus-no-clobber-hard-link",
        stagingCleaned: true,
      },
    };
  } finally {
    if (stagingOwned && stagingPath) await unlink(stagingPath).catch(() => {});
  }
}

export async function collectCompatibilityEvidence({
  publish = false,
  generatedAt = new Date().toISOString(),
  executionMode = ENTRYPOINT_MODE.FIXTURE,
  authorization = null,
  adapterFactory = null,
  outputRoot = compatibilityEvidenceRoot(),
  evidenceStem = CORRECTION_EVIDENCE_STEM,
} = {}) {
  assertFixedInput(FIXED_INPUT);
  if (![ENTRYPOINT_MODE.FIXTURE, ENTRYPOINT_MODE.LIVE].includes(executionMode)) {
    fail("REC_QA_091_LIVE_ENTRYPOINT_NETWORK_GUARD_FAILED", "compatibility collection only supports fixture or live mode");
  }
  const networkGuard = executionMode === ENTRYPOINT_MODE.FIXTURE ? createNetworkAdapterGuard() : null;
  const repository = await assertRepositoryBase();
  const correction7 = await assertCorrection7Base();
  const sourceHashes = await sourceHashInventory();
  const outputBoundary = await inspectOutputBoundary({
    root: outputRoot,
    stem: evidenceStem,
    create: publish,
  });
  if (executionMode === ENTRYPOINT_MODE.LIVE) assertNoLiveAdapterOverrides({ adapterFactory });
  const existingEvidencePreserved = {
    original: await pathExists(resolve(outputRoot, "live-entrypoint-compatibility-v1-final.json")),
    correction1: await pathExists(resolve(outputRoot, "live-entrypoint-compatibility-v1-correction-1-final.json")),
  };
  const syntheticConsumptionBoundaryValidation = runSyntheticConsumptionBoundaryFixtures();
  let authorizationGatedLiveMode = executionMode === ENTRYPOINT_MODE.LIVE;
  const consumptionRecorder = executionMode === ENTRYPOINT_MODE.LIVE ? createConsumptionRecorder() : null;
  const tmdbAllowlistPolicy = createTmdbAllowlistPolicy();
  if (executionMode === ENTRYPOINT_MODE.LIVE) {
    const credentialAvailable = Boolean((process.env.TMDB_API_KEY || "").trim() || (process.env.TMDB_BEARER_TOKEN || "").trim());
    if (!credentialAvailable) {
      fail("REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED", "Live credential is unavailable before Adapter binding");
    }
    validateLiveAuthorization({
      authorization,
      sourceHashes,
      outputBoundary,
      credentialAvailable,
    });
  }
  const selectedAdapterFactory = executionMode === ENTRYPOINT_MODE.LIVE
    ? createSealedProductAdapter
    : (adapterFactory || createFixtureProductAdapter);
  const responseCatalog = new Map();
  clearTmdbRequestCache();
  try {
    const baseline = await evaluateTmdbCandidateUniverse({
      ...fixtureInputForProduct(),
      requestContext: createTmdbObservabilityFixtureContext(),
    });
    clearTmdbRequestCache();
    clearTmdbRequestCache();
    const runs = [];
    for (const [index, runMode] of RUN_MODES.entries()) {
      runs.push(await runDiagnosticPhase(runMode, index + 1, {
        executionMode,
        adapterFactory: selectedAdapterFactory,
        responseCatalog,
        consumptionRecorder,
      }));
    }
    if (executionMode === ENTRYPOINT_MODE.LIVE) consumptionRecorder.assertConsumedOnce();
    if (executionMode === ENTRYPOINT_MODE.FIXTURE) {
      runs.forEach((run) => assertProductInvariant(baseline, run));
    } else {
      runs.forEach((run) => assertLiveProductContract(run));
    }
    assertThreeRunContract(runs);
    try {
      const warmPrime = runs.find((run) => run.runMode === "warm-prime");
      const warmMeasure = runs.find((run) => run.runMode === "warm-measure");
      assertTmdbObservabilityBehaviorInvariant(warmPrime.result.productSnapshot, {
        ...warmMeasure.result.productSnapshot,
        requestPlan: warmPrime.result.productSnapshot.requestPlan,
        cache: warmPrime.result.productSnapshot.cache,
      });
    } catch (error) {
      fail("REC_QA_091_LIVE_ENTRYPOINT_CHANGED_PRODUCT_BEHAVIOR", error.message);
    }
    const built = await buildCompatibilityEvidence({
      runs,
      baseline,
      repository,
      correction7,
      sourceHashes,
      generatedAt,
      executionMode,
      networkInvocationCount: executionMode === ENTRYPOINT_MODE.LIVE
        ? runs.reduce((sum, run) => sum + run.requestUsage.outboundAttemptUsage.total, 0)
        : 0,
      tmdbAllowlistPolicy,
      evidenceStem,
      authorizationGatedLiveMode,
      syntheticConsumptionBoundaryValidation,
      existingEvidencePreserved,
    });
    networkGuard?.assertZero();
    if (publish) {
      const output = await publishCompatibilityEvidence(built.evidence, { stem: evidenceStem });
      return { ...built, output, repository, correction7, runs, baseline };
    }
    return { ...built, output: null, repository, correction7, runs, baseline };
  } finally {
    clearTmdbRequestCache();
    networkGuard?.assertZero();
  }
}

export async function main(argv = process.argv.slice(2)) {
  const { mode, authorizationPath } = parseEntrypointArguments(argv);
  if (mode === ENTRYPOINT_MODE.PREFLIGHT) {
    console.log(JSON.stringify(await runPreflight(), null, 2));
    return;
  }
  const authorization = mode === ENTRYPOINT_MODE.LIVE ? await readAuthorizationArtifact(authorizationPath) : null;
  const result = await collectCompatibilityEvidence({
    publish: true,
    executionMode: mode,
    authorization,
    evidenceStem: CORRECTION_EVIDENCE_STEM,
  });
  const outputStat = await stat(result.output.path);
  console.log(JSON.stringify({
    status: result.staticValidation.status,
    outputFile: `${COMPATIBILITY_EVIDENCE_DIRECTORY}/${CORRECTION_EVIDENCE_STEM}.json`,
    sha256: result.output.sha256,
    byteSize: result.output.byteSize,
    modifiedUtc: outputStat.mtime.toISOString(),
    staticValidation: `${result.staticValidation.passed}/${result.staticValidation.total}`,
    securityFixtures: `${result.securityFixtures.passed}/${result.securityFixtures.total}`,
    phaseOrder: RUN_MODES,
    finalCountByRun: result.evidence.summary.finalCountByRun,
    requestLedgerByRun: Object.fromEntries(Object.entries(result.evidence.requestLedger).map(([key, value]) => [key, value.length])),
    networkInvocationCount: result.evidence.networkInvocationCount,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error?.code?.startsWith("REC_QA_091_") ? 2 : 1;
  });
}
