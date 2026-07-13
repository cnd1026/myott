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
} = {}) {
  const requestLimits = { ...TMDB_REQUEST_LIMITS, ...limits };
  const startedAt = now();
  const deadlineAt = startedAt + Math.max(0, recommendationDeadlineMs);
  const inFlight = new Map();
  const requestedKeys = new Set();
  const detailRequestKeys = new Set();
  const waiters = [];
  let activeRequests = 0;
  let earlyStopReason = "";
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

  async function fetchOnce(path, params, kind, requestKey, seedKey) {
    const searchParams = normalizedSearchParams(params, language);
    if (apiKey) searchParams.set("api_key", apiKey);
    const headers = { accept: "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    await acquireSlot();
    let timeoutId;
    let timedOut = false;
    let deadlineBound = false;
    try {
      if (!hasTimeRemaining()) throw new TmdbDeadlineError();
      reserveRequest(kind, requestKey, seedKey);
      const remainingMs = remainingDeadlineMs();
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
      if (!response.ok) {
        state.failedRequestCount += 1;
        if (response.status === 429) state.rateLimitedCount += 1;
        throw new TmdbHttpError(response.status, retryAfterMs(response, now));
      }
      return response.json();
    } catch (error) {
      if (!(error instanceof TmdbHttpError)) state.failedRequestCount += 1;
      if (timedOut) {
        if (deadlineBound || remainingDeadlineMs() <= 0) {
          state.deadlineExceeded = true;
          if (!earlyStopReason) earlyStopReason = "recommendation-deadline-exceeded";
          throw new TmdbDeadlineError();
        }
        throw new TmdbFetchTimeoutError();
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
        return await fetchOnce(path, params, kind, requestKey, seedKey);
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
      return cacheEntry.value;
    }
    if (cacheEntry) responseCache.delete(requestKey);

    if (inFlight.has(requestKey)) {
      state.requestDedupHits += 1;
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
