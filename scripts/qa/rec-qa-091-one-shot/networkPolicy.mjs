import {
  GOVERNANCE_AUTHORITY,
  GOVERNANCE_BOUNDARY,
  MAX_REDIRECT_HOPS,
  REQUEST_BUDGET,
  TECHNICAL_PERSISTENCE_SCOPE,
  TMDB_HOST,
} from "./runtimeContract.mjs";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const OPTION_KEYS = new Set(["headers", "cache", "signal", "redirect"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeErrorCode(error) {
  const candidate = typeof error?.code === "string" ? error.code : "";
  return /^[A-Z0-9_]{1,80}$/.test(candidate) ? candidate : "OUTBOUND_FAILED";
}

function responseIsRedirect(response) {
  return REDIRECT_STATUSES.has(Number(response?.status));
}

function responseStatusClass(response) {
  if (responseIsRedirect(response)) return "REDIRECT";
  return response?.ok ? "SUCCESS" : "HTTP_ERROR";
}

function locationFromResponse(response) {
  const location = response?.headers?.get?.("location") || response?.headers?.get?.("Location");
  return typeof location === "string" && location ? location : "";
}

function requestClassForPath(pathname) {
  if (pathname === "/3/discover/tv") return "list";
  if (/^\/3\/tv\/\d+$/.test(pathname)) return "detail";
  throw new TypeError("TMDB_ENDPOINT_NOT_ALLOWED");
}

export function safeEndpointIdentity(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl || rawUrl.startsWith("//")) {
    throw new TypeError("TMDB_DESTINATION_NOT_ALLOWED");
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new TypeError("TMDB_DESTINATION_NOT_ALLOWED");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== TMDB_HOST ||
    (parsed.port !== "" && parsed.port !== "443") ||
    parsed.username ||
    parsed.password ||
    /^[0-9.]+$/.test(parsed.hostname) ||
    parsed.hostname.includes("%")
  ) {
    throw new TypeError("TMDB_DESTINATION_NOT_ALLOWED");
  }
  return {
    identity: parsed.pathname,
    requestClass: requestClassForPath(parsed.pathname),
    url: parsed,
  };
}

function assertFetchOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("TMDB_FETCH_OPTIONS_INVALID");
  }
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== "string" || !OPTION_KEYS.has(key)) throw new TypeError("TMDB_FETCH_OPTIONS_INVALID");
  }
  if (Object.hasOwn(options, "redirect") && options.redirect !== "manual") {
    throw new TypeError("TMDB_REDIRECT_MODE_INVALID");
  }
}

async function captureListPayload(response) {
  if (!response || typeof response.clone !== "function") throw new TypeError("LIST_RESPONSE_CLONE_REQUIRED");
  const cloned = response.clone();
  if (!cloned || typeof cloned.json !== "function") throw new TypeError("LIST_RESPONSE_JSON_REQUIRED");
  const payload = await cloned.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.results)) {
    throw new TypeError("LIST_RESPONSE_INVALID");
  }
  const safeFields = ["id", "name", "title", "original_name", "original_title", "first_air_date", "genre_ids", "origin_country", "media_type", "popularity", "vote_average", "vote_count"];
  const safePayload = {
    page: Number.isSafeInteger(payload.page) ? payload.page : null,
    total_pages: Number.isSafeInteger(payload.total_pages) ? payload.total_pages : null,
    total_results: Number.isSafeInteger(payload.total_results) ? payload.total_results : payload.results.length,
    results: payload.results.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item) || !Number.isSafeInteger(item.id)) {
        throw new TypeError("LIST_RESPONSE_INVALID");
      }
      return Object.fromEntries(safeFields.filter((key) => Object.hasOwn(item, key)).map((key) => [key, clone(item[key])]));
    }),
  };
  if (JSON.stringify(safePayload).length > 2_000_000 || safePayload.results.length > 500) {
    throw new TypeError("LIST_RESPONSE_RESOURCE_LIMIT_EXCEEDED");
  }
  return safePayload;
}

export function createOneShotTransport({
  nativeFetch,
  getCurrentRequest,
  lifecycle,
  integratedRunId = "REC-QA-091-ONE-SHOT-INTEGRATED-RUN",
  syntheticConsumption = false,
  runtimeIntegrityCheck = () => true,
} = {}) {
  if (typeof nativeFetch !== "function") throw new TypeError("ONE_SHOT_NATIVE_FETCH_REQUIRED");
  if (typeof getCurrentRequest !== "function") throw new TypeError("ONE_SHOT_REQUEST_CONTEXT_REQUIRED");
  if (!lifecycle || typeof lifecycle.recordAttemptStart !== "function" || typeof lifecycle.recordAttemptTerminal !== "function") {
    throw new TypeError("ONE_SHOT_LIFECYCLE_REQUIRED");
  }
  if (typeof runtimeIntegrityCheck !== "function") throw new TypeError("ONE_SHOT_RUNTIME_INTEGRITY_CHECK_REQUIRED");

  const attempts = [];
  const events = [];
  const listPayloadCaptures = [];
  const perRun = new Map();
  const waiters = [];
  let active = 0;
  let nextAttempt = 0;
  let nextReservation = 0;
  let nextEvent = 0;
  let consumed = false;
  let consumptionEvent = null;

  function emit(type, fields) {
    const event = { eventId: `one-shot:${nextEvent++}`, sequence: events.length, type, ...fields };
    events.push(event);
    return event;
  }

  function usageFor(runId) {
    if (!perRun.has(runId)) perRun.set(runId, { total: 0, list: 0, detail: 0 });
    return perRun.get(runId);
  }

  function reserve(runId, requestClass) {
    const usage = usageFor(runId);
    if (usage.total >= REQUEST_BUDGET.total || usage[requestClass] >= REQUEST_BUDGET[requestClass] || attempts.length >= REQUEST_BUDGET.aggregate) {
      const error = new Error("REQUEST_BUDGET_EXCEEDED");
      error.code = "REQUEST_BUDGET_EXCEEDED";
      throw error;
    }
    usage.total += 1;
    usage[requestClass] += 1;
    const budgetReservationId = `budget:${runId}:${nextReservation++}`;
    emit("budget-reservation", {
      runId,
      requestClass,
      budgetReservationId,
      usage: { ...usage },
      aggregateUsage: attempts.length + 1,
    });
    return budgetReservationId;
  }

  function recordConsumption(request) {
    if (consumed) return;
    consumed = true;
    consumptionEvent = emit("governanceConsumptionObserved", {
      eventType: "governanceConsumptionObserved",
      governanceDecisionId: "FOUNDER_DECISION_REC_QA_091_ONE_SHOT_LOCAL_PROBE_TRUST_BOUNDARY_V1",
      executionAuthorizationId: "FOUNDER_AUTHORIZATION_REC_QA_091_ONE_SHOT_SOURCE_IMPLEMENTATION_V1",
      integratedRunId,
      runId: request.runId,
      runMode: request.runMode,
      logicalRequestId: request.requestId,
      observedAtSequence: events.length,
      boundary: GOVERNANCE_BOUNDARY,
      authority: GOVERNANCE_AUTHORITY,
      technicalPersistenceScope: TECHNICAL_PERSISTENCE_SCOPE,
      processRestartReuseTechnicallyPrevented: false,
      synthetic: syntheticConsumption,
    });
  }

  async function acquireSlot() {
    if (active >= REQUEST_BUDGET.concurrency) await new Promise((resolvePromise) => waiters.push(resolvePromise));
    active += 1;
  }

  function releaseSlot() {
    active -= 1;
    waiters.shift()?.();
  }

  function recordAttempt(request, endpoint, budgetReservationId, hopIndex) {
    const attempt = {
      attemptId: `attempt:${nextAttempt++}`,
      logicalRequestId: request.requestId,
      runId: request.runId,
      runMode: request.runMode,
      requestClass: endpoint.requestClass,
      attemptSequence: attempts.length,
      redirectHopIndex: hopIndex,
      safeEndpointIdentity: endpoint.identity,
      destinationHostClass: "TMDB_EXACT_HOST",
      startedSequence: null,
      completedSequence: null,
      statusClass: null,
      redirectLocationClass: null,
      budgetReservationId,
    };
    attempts.push(attempt);
    return attempt;
  }

  async function fetch(rawUrl, options = {}) {
    const request = getCurrentRequest();
    if (!request || typeof request.requestId !== "string") throw new TypeError("ONE_SHOT_REQUEST_CONTEXT_REQUIRED");
    assertFetchOptions(options);
    await acquireSlot();
    let currentUrl = rawUrl;
    let redirectCount = 0;
    let hopIndex = 0;
    try {
      while (true) {
        const endpoint = safeEndpointIdentity(currentUrl);
        if (!runtimeIntegrityCheck()) {
          const error = new Error("LIVE_V2_RUNTIME_TRANSPORT_INTEGRITY_FAILED");
          error.code = error.message;
          throw error;
        }
        const budgetReservationId = reserve(request.runId, endpoint.requestClass);
        recordConsumption(request);
        const attempt = recordAttempt(request, endpoint, budgetReservationId, hopIndex);
        const start = emit("outbound-attempt-start", {
          attemptId: attempt.attemptId,
          logicalRequestId: request.requestId,
          runId: request.runId,
          runMode: request.runMode,
          requestClass: endpoint.requestClass,
          attemptSequence: attempt.attemptSequence,
          redirectHopIndex: hopIndex,
          safeEndpointIdentity: endpoint.identity,
          destinationHostClass: "TMDB_EXACT_HOST",
          budgetReservationId,
        });
        attempt.startedSequence = start.sequence;
        lifecycle.recordAttemptStart({ requestId: request.requestId, attemptId: attempt.attemptId });
        try {
          const response = await nativeFetch(currentUrl, { ...options, redirect: "manual" });
          const isRedirect = responseIsRedirect(response);
          if (!isRedirect && endpoint.requestClass === "list") {
            const payload = await captureListPayload(response);
            listPayloadCaptures.push({
              runId: request.runId,
              runMode: request.runMode,
              requestClass: endpoint.requestClass,
              safeEndpointIdentity: endpoint.identity,
              page: payload.page,
              totalResults: payload.total_results,
              candidateIds: payload.results.map((item) => item.id),
              payload,
            });
          }
          attempt.statusClass = responseStatusClass(response);
          attempt.redirectLocationClass = locationFromResponse(response) ? "PRESENT" : "NONE";
          const terminal = emit("outbound-attempt-complete", {
            attemptId: attempt.attemptId,
            logicalRequestId: request.requestId,
            runId: request.runId,
            runMode: request.runMode,
            requestClass: endpoint.requestClass,
            redirectHopIndex: hopIndex,
            safeEndpointIdentity: endpoint.identity,
            statusClass: attempt.statusClass,
            redirectLocationClass: attempt.redirectLocationClass,
            budgetReservationId,
          });
          attempt.completedSequence = terminal.sequence;
          lifecycle.recordAttemptTerminal({ requestId: request.requestId, attemptId: attempt.attemptId });
          if (!isRedirect) return response;

          const location = locationFromResponse(response);
          if (!location || redirectCount >= MAX_REDIRECT_HOPS) {
            const error = new Error(!location ? "TMDB_REDIRECT_NOT_ALLOWED" : "TMDB_REDIRECT_HOP_LIMIT_EXCEEDED");
            error.code = error.message;
            throw error;
          }
          let nextUrl;
          try {
            nextUrl = new URL(location, endpoint.url).toString();
          } catch {
            const error = new Error("TMDB_REDIRECT_NOT_ALLOWED");
            error.code = error.message;
            throw error;
          }
          try {
            safeEndpointIdentity(nextUrl);
          } catch {
            const error = new Error("TMDB_REDIRECT_NOT_ALLOWED");
            error.code = error.message;
            throw error;
          }
          redirectCount += 1;
          hopIndex += 1;
          currentUrl = nextUrl;
        } catch (error) {
          if (attempt.completedSequence === null) {
            attempt.statusClass = "FAILED";
            const terminal = emit("outbound-attempt-failed", {
              attemptId: attempt.attemptId,
              logicalRequestId: request.requestId,
              runId: request.runId,
              runMode: request.runMode,
              requestClass: endpoint.requestClass,
              redirectHopIndex: hopIndex,
              safeEndpointIdentity: endpoint.identity,
              statusClass: "FAILED",
              redirectLocationClass: null,
              budgetReservationId,
              errorCode: safeErrorCode(error),
            });
            attempt.completedSequence = terminal.sequence;
            lifecycle.recordAttemptTerminal({ requestId: request.requestId, attemptId: attempt.attemptId });
          }
          throw error;
        }
      }
    } finally {
      releaseSlot();
    }
  }

  return Object.freeze({
    fetch,
    attempts: () => attempts.map(clone),
    events: () => events.map(clone),
    listPayloadCaptures: () => listPayloadCaptures.map(clone),
    usage: () => ({
      perRun: Object.fromEntries([...perRun.entries()].map(([runId, usage]) => [runId, { ...usage }])),
      aggregate: attempts.length,
      remainingAggregateBudget: Math.max(0, REQUEST_BUDGET.aggregate - attempts.length),
    }),
    isConsumed: () => consumed,
    consumptionEvent: () => clone(consumptionEvent),
    redirectCount: () => attempts.filter((attempt) => attempt.redirectHopIndex > 0).length,
  });
}

export function networkPolicyContract() {
  return Object.freeze({
    host: TMDB_HOST,
    httpsOnly: true,
    redirect: "manual",
    maximumRedirectHops: MAX_REDIRECT_HOPS,
    requestBudget: REQUEST_BUDGET,
    callerProvidedFetch: false,
    callerProvidedTransport: false,
    automaticRetry: 0,
  });
}
