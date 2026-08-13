import {
  assertTmdbObservabilitySession,
  emitTmdbObservabilityEvent,
} from "../../recommendation/qa/tmdbObservability.js";

const DEFAULT_BASE_URL = "https://api.themoviedb.org/3";

export const TMDB_REQUEST_LIMITS = Object.freeze({
  total: 24,
  list: 8,
  detail: 16,
  concurrency: 4,
  retries: 2,
});

export const TMDB_TIME_LIMITS = Object.freeze({
  fetchTimeoutMs: 8_000,
  recommendationDeadlineMs: 15_000,
  maximumRetryAfterMs: 5_000,
});

export const TMDB_CACHE_TTL = Object.freeze({
  metadata: 60 * 60 * 1000,
  detail: 30 * 60 * 1000,
  list: 7 * 60 * 1000,
});

const responseCache = new Map();
const MAX_CACHE_ENTRIES = 500;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const NO_SAFE_OWN_DATA = Symbol("no-safe-own-data");
const TRANSPORT_FAILURE_CATEGORY_BY_CODE = Object.freeze({
  EAI_AGAIN: "dns-resolution",
  ENOTFOUND: "dns-resolution",
  ECONNREFUSED: "connection-refused",
  ECONNRESET: "connection-reset",
  ENETUNREACH: "network-unreachable",
  EHOSTUNREACH: "host-unreachable",
  CERT_HAS_EXPIRED: "tls-certificate",
  CERT_NOT_YET_VALID: "tls-certificate",
  DEPTH_ZERO_SELF_SIGNED_CERT: "tls-certificate",
  SELF_SIGNED_CERT_IN_CHAIN: "tls-certificate",
  UNABLE_TO_GET_ISSUER_CERT: "tls-certificate",
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: "tls-certificate",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "tls-certificate",
  CERT_SIGNATURE_FAILURE: "tls-certificate",
  CERT_CHAIN_TOO_LONG: "tls-certificate",
  CERT_REVOKED: "tls-certificate",
  INVALID_CA: "tls-certificate",
  PATH_LENGTH_EXCEEDED: "tls-certificate",
  INVALID_PURPOSE: "tls-certificate",
  CERT_UNTRUSTED: "tls-certificate",
  CERT_REJECTED: "tls-certificate",
  HOSTNAME_MISMATCH: "tls-certificate",
  ERR_TLS_CERT_ALTNAME_INVALID: "tls-certificate",
  ETIMEDOUT: "socket-timeout",
  UND_ERR_CONNECT_TIMEOUT: "socket-timeout",
  UND_ERR_HEADERS_TIMEOUT: "socket-timeout",
  UND_ERR_BODY_TIMEOUT: "socket-timeout",
  ABORT_ERR: "abort",
});

export class TmdbBudgetError extends Error {
  constructor(message = "TMDB request budget exhausted.") {
    super(message);
    this.name = "TmdbBudgetError";
    this.code = "TMDB_BUDGET_EXHAUSTED";
  }
}

export class TmdbDeadlineError extends Error {
  constructor(message = "TMDB recommendation deadline exceeded.") {
    super(message);
    this.name = "TmdbDeadlineError";
    this.code = "TMDB_RECOMMENDATION_DEADLINE_EXCEEDED";
  }
}

export class TmdbFetchTimeoutError extends Error {
  constructor(message = "TMDB fetch timed out.") {
    super(message);
    this.name = "TmdbFetchTimeoutError";
    this.code = "TMDB_FETCH_TIMEOUT";
  }
}

export class TmdbHttpError extends Error {
  constructor(status, retryAfterMs = 0) {
    super(`TMDb request failed: ${status}`);
    this.name = "TmdbHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function pruneCache(now) {
  for (const [key, entry] of responseCache) {
    if (entry.expiresAt <= now) responseCache.delete(key);
  }
  while (responseCache.size >= MAX_CACHE_ENTRIES) {
    responseCache.delete(responseCache.keys().next().value);
  }
}

export function clearTmdbRequestCache() {
  responseCache.clear();
}

function normalizedSearchParams(params, language) {
  const entries = Object.entries({ language, ...params })
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)])
    .sort(([left], [right]) => left.localeCompare(right));
  return new URLSearchParams(entries);
}

function safeRequestKey(path, params, language, region) {
  const searchParams = normalizedSearchParams(params, language);
  return `${path}?${searchParams.toString()}|region=${region}`;
}

function retryAfterMs(response, now) {
  const value = response.headers?.get?.("retry-after");
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now()) : 0;
}

function shouldRetry(error) {
  if (error instanceof TmdbDeadlineError) return false;
  if (error instanceof TmdbFetchTimeoutError) return true;
  if (error?.name === "AbortError") return false;
  if (Number.isFinite(error?.status)) return RETRYABLE_STATUSES.has(error.status);
  return error instanceof TypeError || error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT";
}

const defaultSleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

function safeEndpointClass(path) {
  const parts = String(path || "").split("/").filter(Boolean);
  if (parts[0] === "discover" && ["movie", "tv"].includes(parts[1])) return `discover-${parts[1]}`;
  if (parts[0] === "genre" && ["movie", "tv"].includes(parts[1])) return `genre-${parts[1]}`;
  if (parts[0] === "search" && parts[1] === "multi") return "search-multi";
  if (["movie", "tv"].includes(parts[0]) && /^\d+$/.test(parts[1] || "")) {
    if (["recommendations", "similar"].includes(parts[2])) return `${parts[0]}-${parts[2]}`;
    if (parts.length === 2) return `${parts[0]}-detail`;
  }
  return "unknown-safe-endpoint";
}

function requestFailureStatus(error, timedOut, deadlineBound) {
  if (timedOut) return deadlineBound ? "deadline-exceeded" : "fetch-timeout";
  if (error instanceof TmdbDeadlineError) return "deadline-exceeded";
  if (error instanceof TmdbHttpError) {
    return RETRYABLE_STATUSES.has(error.status) ? "retryable-http-error" : "http-error";
  }
  if (error instanceof SyntaxError) return "payload-error";
  return "transport-error";
}

function safeOwnDataProperty(value, field) {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return NO_SAFE_OWN_DATA;
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    return descriptor && Object.hasOwn(descriptor, "value") ? descriptor.value : NO_SAFE_OWN_DATA;
  } catch {
    return NO_SAFE_OWN_DATA;
  }
}

function isInspectableError(value) {
  try {
    return value instanceof Error;
  } catch {
    return false;
  }
}

function isAggregateError(value) {
  try {
    return typeof AggregateError === "function" && value instanceof AggregateError;
  } catch {
    return false;
  }
}

function categoryFromErrorIdentity(error) {
  const code = safeOwnDataProperty(error, "code");
  if (typeof code === "string" && /^[\x20-\x7e]{1,64}$/.test(code) &&
      Object.hasOwn(TRANSPORT_FAILURE_CATEGORY_BY_CODE, code)) {
    return TRANSPORT_FAILURE_CATEGORY_BY_CODE[code];
  }
  return safeOwnDataProperty(error, "name") === "AbortError" ? "abort" : "";
}

function isExactBuiltInTypeError(value) {
  try {
    return Object.getPrototypeOf(value) === TypeError.prototype;
  } catch {
    return false;
  }
}

function normalizeTransportFailureCategory(error, allowDirectCause) {
  try {
    if (!isInspectableError(error) || isAggregateError(error)) return "other-transport-error";
    const rootCategory = categoryFromErrorIdentity(error);
    if (rootCategory) return rootCategory;
    if (!allowDirectCause || !isExactBuiltInTypeError(error)) return "other-transport-error";

    const cause = safeOwnDataProperty(error, "cause");
    if (cause === NO_SAFE_OWN_DATA || !isInspectableError(cause) || isAggregateError(cause)) {
      return "other-transport-error";
    }
    return categoryFromErrorIdentity(cause) || "other-transport-error";
  } catch {
    return "other-transport-error";
  }
}

function transportFailureObservation(error, responseReached, statusClass) {
  if (statusClass !== "transport-error") return {};
  return {
    responseReached,
    transportFailureCategory: normalizeTransportFailureCategory(error, responseReached === false),
  };
}

export function createTmdbRequestContext({
  apiKey = "",
  bearer = "",
  language = "ko-KR",
  region = "KR",
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  limits = {},
  now = Date.now,
  sleep = defaultSleep,
  random = Math.random,
  fetchTimeoutMs = TMDB_TIME_LIMITS.fetchTimeoutMs,
  recommendationDeadlineMs = TMDB_TIME_LIMITS.recommendationDeadlineMs,
  maximumRetryAfterMs = TMDB_TIME_LIMITS.maximumRetryAfterMs,
  observer,
} = {}) {
  if (observer !== undefined) assertTmdbObservabilitySession(observer);
  const requestLimits = { ...TMDB_REQUEST_LIMITS, ...limits };
  const startedAt = now();
  const deadlineAt = startedAt + Math.max(0, recommendationDeadlineMs);
  const inFlight = new Map();
  const requestedKeys = new Set();
  const detailRequestKeys = new Set();
  const waiters = [];
  let activeRequests = 0;
  let earlyStopReason = "";
  let nextObservationRequestId = 1;
  const seedDiagnostics = {
    requestedSeeds: [],
    normalizedSeeds: [],
    processedSeeds: [],
    unresolvedSeeds: [],
    deferredSeeds: [],
    perSeedCandidateCounts: {},
  };

  const state = {
    requestsUsed: 0,
    listRequestsUsed: 0,
    detailRequestsUsed: 0,
    cacheHits: 0,
    requestDedupHits: 0,
    retryCount: 0,
    rateLimitedCount: 0,
    failedRequestCount: 0,
    duplicateDetailRequestCount: 0,
    budgetExhausted: false,
    deadlineExceeded: false,
    maxConcurrentObserved: 0,
    perSeedRequestCounts: {},
  };

  function observationRequestId() {
    if (observer === undefined) return "";
    const requestId = `request-${nextObservationRequestId}`;
    nextObservationRequestId += 1;
    return requestId;
  }

  function emitObservation(type, fields) {
    if (observer !== undefined) emitTmdbObservabilityEvent(observer, type, fields);
  }

  function remainingDeadlineMs() {
    return Math.max(0, deadlineAt - now());
  }

  function hasTimeRemaining() {
    if (remainingDeadlineMs() > 0) return true;
    state.deadlineExceeded = true;
    if (!earlyStopReason) earlyStopReason = "recommendation-deadline-exceeded";
    return false;
  }

  function hasBudget(kind = "list", count = 1) {
    if (!hasTimeRemaining()) return false;
    if (state.requestsUsed + count > requestLimits.total) return false;
    if (kind === "detail" && state.detailRequestsUsed + count > requestLimits.detail) return false;
    if (kind !== "detail" && state.listRequestsUsed + count > requestLimits.list) return false;
    return true;
  }

  function reserveRequest(kind, requestKey, seedKey = "") {
    if (!hasTimeRemaining()) throw new TmdbDeadlineError();
    if (!hasBudget(kind)) {
      state.budgetExhausted = true;
      throw new TmdbBudgetError();
    }
    state.requestsUsed += 1;
    if (kind === "detail") {
      if (detailRequestKeys.has(requestKey)) state.duplicateDetailRequestCount += 1;
      detailRequestKeys.add(requestKey);
      state.detailRequestsUsed += 1;
    } else {
      state.listRequestsUsed += 1;
    }
    if (seedKey) {
      state.perSeedRequestCounts[seedKey] = (state.perSeedRequestCounts[seedKey] || 0) + 1;
    }
    requestedKeys.add(requestKey);
  }

  async function acquireSlot() {
    if (activeRequests >= requestLimits.concurrency) {
      await new Promise((resolve) => waiters.push(resolve));
    }
    activeRequests += 1;
    state.maxConcurrentObserved = Math.max(state.maxConcurrentObserved, activeRequests);
  }

  function releaseSlot() {
    activeRequests -= 1;
    waiters.shift()?.();
  }

  async function fetchOnce(path, params, kind, requestKey, seedKey, retryIndex) {
    const searchParams = normalizedSearchParams(params, language);
    if (apiKey) searchParams.set("api_key", apiKey);
    const headers = { accept: "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    await acquireSlot();
    let timeoutId;
    let timedOut = false;
    let deadlineBound = false;
    let terminalEmitted = false;
    let responseReached = false;
    let requestId = "";
    const endpointClass = observer === undefined ? "" : safeEndpointClass(path);
    try {
      if (!hasTimeRemaining()) throw new TmdbDeadlineError();
      reserveRequest(kind, requestKey, seedKey);
      const remainingMs = remainingDeadlineMs();
      requestId = observationRequestId();
      if (requestId) {
        emitObservation("request-start", {
          requestId,
          requestKind: kind,
          endpointClass,
          retryIndex,
        });
      }
      const controller = new AbortController();
      const effectiveTimeoutMs = Math.max(1, Math.min(fetchTimeoutMs, remainingMs));
      deadlineBound = remainingMs <= fetchTimeoutMs;
      timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, effectiveTimeoutMs);
      const response = await fetchImpl(`${baseUrl}${path}?${searchParams.toString()}`, {
        headers,
        cache: "no-store",
        signal: controller.signal,
      });
      responseReached = true;
      if (!response.ok) {
        state.failedRequestCount += 1;
        if (response.status === 429) state.rateLimitedCount += 1;
        const httpError = new TmdbHttpError(response.status, retryAfterMs(response, now));
        if (requestId) {
          emitObservation("request-failed", {
            requestId,
            requestKind: kind,
            endpointClass,
            retryIndex,
            statusClass: requestFailureStatus(httpError, false, false),
          });
          terminalEmitted = true;
        }
        throw httpError;
      }
      const payload = response.json();
      if (!requestId) return payload;
      return Promise.resolve(payload).then(
        (value) => {
          emitObservation("request-complete", {
            requestId,
            requestKind: kind,
            endpointClass,
            retryIndex,
            statusClass: "success",
          });
          terminalEmitted = true;
          return value;
        },
        (error) => {
          const statusClass = requestFailureStatus(error, false, deadlineBound);
          emitObservation("request-failed", {
            requestId,
            requestKind: kind,
            endpointClass,
            retryIndex,
            statusClass,
            ...transportFailureObservation(error, responseReached, statusClass),
          });
          terminalEmitted = true;
          throw error;
        },
      );
    } catch (error) {
      if (!(error instanceof TmdbHttpError)) state.failedRequestCount += 1;
      if (timedOut) {
        if (deadlineBound || remainingDeadlineMs() <= 0) {
          state.deadlineExceeded = true;
          if (!earlyStopReason) earlyStopReason = "recommendation-deadline-exceeded";
          if (requestId && !terminalEmitted) {
            emitObservation("request-failed", {
              requestId,
              requestKind: kind,
              endpointClass,
              retryIndex,
              statusClass: "deadline-exceeded",
            });
            terminalEmitted = true;
          }
          throw new TmdbDeadlineError();
        }
        if (requestId && !terminalEmitted) {
          emitObservation("request-failed", {
            requestId,
            requestKind: kind,
            endpointClass,
            retryIndex,
            statusClass: "fetch-timeout",
          });
          terminalEmitted = true;
        }
        throw new TmdbFetchTimeoutError();
      }
      if (requestId && !terminalEmitted) {
        const statusClass = requestFailureStatus(error, false, deadlineBound);
        emitObservation("request-failed", {
          requestId,
          requestKind: kind,
          endpointClass,
          retryIndex,
          statusClass,
          ...transportFailureObservation(error, responseReached, statusClass),
        });
        terminalEmitted = true;
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      releaseSlot();
    }
  }

  async function fetchWithRetry(path, params, kind, requestKey, seedKey) {
    let attempt = 0;
    while (true) {
      try {
        return await fetchOnce(path, params, kind, requestKey, seedKey, attempt);
      } catch (error) {
        if (!shouldRetry(error) || attempt >= requestLimits.retries) throw error;
        if (!hasBudget(kind)) {
          state.budgetExhausted = true;
          throw error;
        }
        const exponentialDelay = 150 * 2 ** attempt;
        const jitter = Math.floor(random() * 100);
        const requestedDelay = error.retryAfterMs > 0 ? error.retryAfterMs : exponentialDelay + jitter;
        const remainingMs = remainingDeadlineMs();
        if (remainingMs <= 0) {
          state.deadlineExceeded = true;
          if (!earlyStopReason) earlyStopReason = "recommendation-deadline-exceeded";
          throw new TmdbDeadlineError();
        }
        const delay = Math.min(requestedDelay, maximumRetryAfterMs, remainingMs);
        if (delay <= 0 || delay >= remainingMs) {
          state.deadlineExceeded = true;
          if (!earlyStopReason) earlyStopReason = "recommendation-deadline-exceeded";
          throw new TmdbDeadlineError();
        }
        state.retryCount += 1;
        attempt += 1;
        await sleep(delay);
      }
    }
  }

  async function get(
    path,
    params = {},
    { kind = "list", ttlMs = TMDB_CACHE_TTL.list, seedKey = "" } = {},
  ) {
    if (!hasTimeRemaining()) throw new TmdbDeadlineError();
    const requestKey = safeRequestKey(path, params, language, region);
    const cacheEntry = responseCache.get(requestKey);
    if (cacheEntry && cacheEntry.expiresAt > now()) {
      state.cacheHits += 1;
      const requestId = observationRequestId();
      if (requestId) {
        emitObservation("request-cache-hit", {
          requestId,
          requestKind: kind,
          endpointClass: safeEndpointClass(path),
        });
      }
      return cacheEntry.value;
    }
    if (cacheEntry) responseCache.delete(requestKey);

    if (inFlight.has(requestKey)) {
      state.requestDedupHits += 1;
      const requestId = observationRequestId();
      if (requestId) {
        emitObservation("request-dedup-hit", {
          requestId,
          requestKind: kind,
          endpointClass: safeEndpointClass(path),
        });
      }
      return inFlight.get(requestKey);
    }

    const requestPromise = fetchWithRetry(path, params, kind, requestKey, seedKey)
      .then((value) => {
        pruneCache(now());
        responseCache.set(requestKey, { value, expiresAt: now() + ttlMs });
        return value;
      })
      .finally(() => inFlight.delete(requestKey));

    inFlight.set(requestKey, requestPromise);
    return requestPromise;
  }

  function setEarlyStop(reason) {
    if (reason && !earlyStopReason) earlyStopReason = reason;
  }

  function setSeedDiagnostics({
    requestedSeeds,
    normalizedSeeds,
    processedSeeds,
    unresolvedSeeds,
    deferredSeeds,
    perSeedCandidateCounts,
  } = {}) {
    if (Array.isArray(requestedSeeds)) seedDiagnostics.requestedSeeds = [...requestedSeeds];
    if (Array.isArray(normalizedSeeds)) seedDiagnostics.normalizedSeeds = [...normalizedSeeds];
    if (Array.isArray(processedSeeds)) seedDiagnostics.processedSeeds = [...processedSeeds];
    if (Array.isArray(unresolvedSeeds)) seedDiagnostics.unresolvedSeeds = [...unresolvedSeeds];
    if (Array.isArray(deferredSeeds)) seedDiagnostics.deferredSeeds = [...deferredSeeds];
    if (perSeedCandidateCounts && typeof perSeedCandidateCounts === "object") {
      seedDiagnostics.perSeedCandidateCounts = { ...perSeedCandidateCounts };
    }
  }

  function diagnostics() {
    const elapsedMs = Math.max(0, now() - startedAt);
    return {
      requestBudget: requestLimits.total,
      requestsUsed: state.requestsUsed,
      aggregateRequestsUsed: state.requestsUsed,
      remainingBudget: Math.max(0, requestLimits.total - state.requestsUsed),
      listRequestBudget: requestLimits.list,
      listRequestsUsed: state.listRequestsUsed,
      detailRequestBudget: requestLimits.detail,
      detailRequestsUsed: state.detailRequestsUsed,
      concurrencyLimit: requestLimits.concurrency,
      maxConcurrentObserved: state.maxConcurrentObserved,
      cacheHits: state.cacheHits,
      requestDedupHits: state.requestDedupHits,
      dedupHits: state.requestDedupHits,
      retryCount: state.retryCount,
      rateLimitedCount: state.rateLimitedCount,
      failedRequestCount: state.failedRequestCount,
      duplicateDetailRequestCount: state.duplicateDetailRequestCount,
      budgetExhausted: state.budgetExhausted,
      deadlineExceeded: state.deadlineExceeded,
      elapsedMs,
      maximumFetchTimeoutMs: fetchTimeoutMs,
      maximumRetryAfterMs,
      recommendationDeadlineMs,
      earlyStopReason,
      requestContextCount: 1,
      requestedSeedCount: seedDiagnostics.normalizedSeeds.length,
      processedSeedCount: seedDiagnostics.processedSeeds.length,
      unresolvedSeedCount: seedDiagnostics.unresolvedSeeds.length,
      deferredSeedCount: seedDiagnostics.deferredSeeds.length,
      requestedSeeds: [...seedDiagnostics.requestedSeeds],
      normalizedSeeds: [...seedDiagnostics.normalizedSeeds],
      processedSeeds: [...seedDiagnostics.processedSeeds],
      unresolvedSeeds: [...seedDiagnostics.unresolvedSeeds],
      deferredSeeds: [...seedDiagnostics.deferredSeeds],
      perSeedRequestCounts: { ...state.perSeedRequestCounts },
      perSeedCandidateCounts: { ...seedDiagnostics.perSeedCandidateCounts },
      requestedUrls: [...requestedKeys],
    };
  }

  return {
    get,
    hasBudget,
    hasTimeRemaining,
    remainingDeadlineMs,
    setEarlyStop,
    setSeedDiagnostics,
    diagnostics,
    limits: requestLimits,
  };
}
