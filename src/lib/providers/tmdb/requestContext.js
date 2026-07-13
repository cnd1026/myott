const DEFAULT_BASE_URL = "https://api.themoviedb.org/3";

export const TMDB_REQUEST_LIMITS = Object.freeze({
  total: 24,
  list: 8,
  detail: 16,
  concurrency: 4,
  retries: 2,
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
} = {}) {
  const requestLimits = { ...TMDB_REQUEST_LIMITS, ...limits };
  const inFlight = new Map();
  const requestedKeys = new Set();
  const detailRequestKeys = new Set();
  const waiters = [];
  let activeRequests = 0;
  let earlyStopReason = "";

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
    maxConcurrentObserved: 0,
  };

  function hasBudget(kind = "list", count = 1) {
    if (state.requestsUsed + count > requestLimits.total) return false;
    if (kind === "detail" && state.detailRequestsUsed + count > requestLimits.detail) return false;
    if (kind !== "detail" && state.listRequestsUsed + count > requestLimits.list) return false;
    return true;
  }

  function reserveRequest(kind, requestKey) {
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

  async function fetchOnce(path, params, kind, requestKey) {
    reserveRequest(kind, requestKey);
    const searchParams = normalizedSearchParams(params, language);
    if (apiKey) searchParams.set("api_key", apiKey);
    const headers = { accept: "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    await acquireSlot();
    try {
      const response = await fetchImpl(`${baseUrl}${path}?${searchParams.toString()}`, {
        headers,
        cache: "no-store",
      });
      if (!response.ok) {
        state.failedRequestCount += 1;
        if (response.status === 429) state.rateLimitedCount += 1;
        throw new TmdbHttpError(response.status, retryAfterMs(response, now));
      }
      return response.json();
    } catch (error) {
      if (!(error instanceof TmdbHttpError)) state.failedRequestCount += 1;
      throw error;
    } finally {
      releaseSlot();
    }
  }

  async function fetchWithRetry(path, params, kind, requestKey) {
    let attempt = 0;
    while (true) {
      try {
        return await fetchOnce(path, params, kind, requestKey);
      } catch (error) {
        if (!shouldRetry(error) || attempt >= requestLimits.retries) throw error;
        if (!hasBudget(kind)) {
          state.budgetExhausted = true;
          throw error;
        }
        const exponentialDelay = 150 * 2 ** attempt;
        const jitter = Math.floor(random() * 100);
        const delay = error.retryAfterMs > 0 ? error.retryAfterMs : exponentialDelay + jitter;
        state.retryCount += 1;
        attempt += 1;
        await sleep(delay);
      }
    }
  }

  async function get(path, params = {}, { kind = "list", ttlMs = TMDB_CACHE_TTL.list } = {}) {
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

    const requestPromise = fetchWithRetry(path, params, kind, requestKey)
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

  function diagnostics() {
    return {
      requestBudget: requestLimits.total,
      requestsUsed: state.requestsUsed,
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
      earlyStopReason,
      requestedUrls: [...requestedKeys],
    };
  }

  return {
    get,
    hasBudget,
    setEarlyStop,
    diagnostics,
    limits: requestLimits,
  };
}
