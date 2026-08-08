import {
  LIVE_CONSUMPTION_BOUNDARY,
  LIVE_NETWORK_HOST,
  TECHNICAL_SINGLE_CONSUMPTION_SCOPE,
  TRUST_AUTHORITY,
} from "./authorizationContract.mjs";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECT_HOPS = 3;
const FIXED_LIMITS = Object.freeze({ total: 24, list: 8, detail: 16, aggregate: 72, concurrency: 4, retry: 0 });
const MODULE_GLOBAL_FETCH = globalThis.fetch;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requestClassForPath(pathname) {
  if (/^\/tv\/\d+$/.test(pathname)) return "detail";
  if (/^\/discover\/tv$/.test(pathname) || /^\/discover\//.test(pathname)) return "list";
  return "detail";
}

export function safeEndpointIdentity(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl || rawUrl.startsWith("//")) {
    throw new TypeError("TMDB_DESTINATION_NOT_ALLOWED");
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new TypeError("TMDB_DESTINATION_NOT_ALLOWED");
  }
  if (url.protocol !== "https:" || url.hostname !== LIVE_NETWORK_HOST ||
    (url.port !== "" && url.port !== "443") || url.username || url.password ||
    !url.pathname.startsWith("/") || /^[0-9.]+$/.test(url.hostname) || url.hostname.includes("%")) {
    throw new TypeError("TMDB_DESTINATION_NOT_ALLOWED");
  }
  return {
    url,
    identity: url.pathname.startsWith("/3/") ? url.pathname.slice(2) : url.pathname,
    requestClass: requestClassForPath(url.pathname.startsWith("/3/") ? url.pathname.slice(2) : url.pathname),
  };
}

function locationFromResponse(response) {
  const value = response?.headers?.get?.("location") || response?.headers?.get?.("Location");
  return typeof value === "string" && value ? value : "";
}

function responseIsRedirect(response) {
  return REDIRECT_STATUSES.has(Number(response?.status));
}

function responseStatusClass(response) {
  return responseIsRedirect(response) ? "REDIRECT" : response?.ok ? "SUCCESS" : "HTTP_ERROR";
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label}_INVALID`);
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== "string")) throw new TypeError(`${label}_INVALID`);
  const left = actual.sort();
  const right = [...expected].sort();
  if (left.length !== right.length || left.some((key, index) => key !== right[index])) {
    throw new TypeError(`${label}_INVALID`);
  }
}

function assertAllowedKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label}_INVALID`);
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== "string" || !expected.includes(key))) throw new TypeError(`${label}_INVALID`);
}

const CONTROLLER_OPTION_KEYS = Object.freeze([
  "fetchImpl",
  "getCurrentRequest",
  "limits",
  "mode",
  "integratedRunId",
  "governanceExecutionContract",
  "consumptionState",
  "runtimeIntegrityCheck",
  "onAttemptStart",
  "onAttemptTerminal",
]);

function assertLimits(limits = FIXED_LIMITS) {
  assertExactKeys(limits, Object.keys(FIXED_LIMITS), "OUTBOUND_LIMITS");
  for (const [key, expected] of Object.entries(FIXED_LIMITS)) {
    if (limits[key] !== expected) throw new TypeError("OUTBOUND_LIMITS_CONTRACT_MISMATCH");
  }
  return FIXED_LIMITS;
}

function createDefaultConsumptionState() {
  return { consumed: false, event: null };
}

export function createOutboundController(options = {}) {
  assertAllowedKeys(options, CONTROLLER_OPTION_KEYS, "OUTBOUND_CONTROLLER_OPTIONS");
  const {
    fetchImpl,
    getCurrentRequest,
    limits = FIXED_LIMITS,
    mode = "fixture",
    integratedRunId = "REC-QA-091-V2-INTEGRATED-RUN",
    governanceExecutionContract = null,
    consumptionState = createDefaultConsumptionState(),
    runtimeIntegrityCheck = () => true,
    onAttemptStart,
    onAttemptTerminal,
  } = options;
  if (typeof fetchImpl !== "function" || typeof getCurrentRequest !== "function") {
    throw new TypeError("OUTBOUND_CONTROLLER_INTERNAL_BINDING_REQUIRED");
  }
  if (mode !== "fixture") {
    throw new TypeError("LIVE_V2_LIVE_CONTROLLER_PRECONDITION_REQUIRED");
  }
  if (fetchImpl === MODULE_GLOBAL_FETCH) {
    throw new TypeError("LIVE_V2_LIVE_CONTROLLER_PRECONDITION_REQUIRED");
  }
  const contract = assertLimits(limits);
  const perRun = new Map();
  const attempts = [];
  const events = [];
  const waiters = [];
  let active = 0;
  let nextAttempt = 0;
  let nextReservation = 0;
  let nextEvent = 0;
  let redirectCount = 0;

  function runUsage(runId) {
    if (!perRun.has(runId)) perRun.set(runId, { total: 0, list: 0, detail: 0 });
    return perRun.get(runId);
  }

  function emit(type, fields) {
    const event = { eventId: `outbound:${nextEvent++}`, sequence: events.length, type, ...fields };
    events.push(event);
    return event;
  }

  function usageSnapshot() {
    return {
      perRun: Object.fromEntries([...perRun.entries()].map(([runId, usage]) => [runId, { ...usage }])),
      aggregate: attempts.length,
      remainingAggregateBudget: Math.max(0, contract.aggregate - attempts.length),
    };
  }

  function assertAvailable(runId, requestClass) {
    const usage = runUsage(runId);
    if (usage.total >= contract.total || usage[requestClass] >= contract[requestClass] || attempts.length >= contract.aggregate) {
      const error = new Error("REQUEST_BUDGET_EXCEEDED");
      error.code = "REQUEST_BUDGET_EXCEEDED";
      throw error;
    }
  }

  function reserve(runId, requestClass) {
    assertAvailable(runId, requestClass);
    const usage = runUsage(runId);
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

  async function acquireSlot() {
    if (active >= contract.concurrency) await new Promise((resolve) => waiters.push(resolve));
    active += 1;
  }

  function releaseSlot() {
    active -= 1;
    waiters.shift()?.();
  }

  function recordConsumption(request) {
    if (consumptionState.consumed) return null;
    consumptionState.consumed = true;
    const event = emit("governance-consumption", {
      eventType: "governance-consumption",
      governanceDecisionId: governanceExecutionContract?.governanceDecisionId || "FOUNDER_DECISION_REC_QA_091_LIVE_AUTH_TRUST_MODEL_GOVERNANCE_EXTERNAL",
      executionAuthorizationId: governanceExecutionContract?.executionAuthorizationId || "FOUNDER_AUTHORIZATION_REC_QA_091_BOUNDED_SERVER_SIDE_LIVE_PROBE_V2",
      integratedRunId,
      runId: request.runId,
      runMode: request.runMode,
      logicalRequestId: request.requestId,
      observedAtSequence: events.length,
      boundary: LIVE_CONSUMPTION_BOUNDARY,
      authority: "HQ_EXTERNAL_GOVERNANCE",
      technicalPersistenceScope: TECHNICAL_SINGLE_CONSUMPTION_SCOPE,
      processRestartReuseTechnicallyPrevented: false,
    });
    consumptionState.event = event;
    return event;
  }

  async function fetch(rawUrl, options = {}) {
    const request = getCurrentRequest();
    if (!request || typeof request.requestId !== "string") {
      const error = new Error("LIVE_V2_REQUEST_CONTEXT_REQUIRED");
      error.code = "LIVE_V2_REQUEST_CONTEXT_REQUIRED";
      throw error;
    }
    let currentUrl = rawUrl;
    let hopIndex = 0;
    await acquireSlot();
    try {
      while (true) {
        if (runtimeIntegrityCheck() !== true) {
          const error = new Error("LIVE_V2_RUNTIME_TRANSPORT_INTEGRITY_FAILED");
          error.code = "LIVE_V2_RUNTIME_TRANSPORT_INTEGRITY_FAILED";
          throw error;
        }
        const endpoint = safeEndpointIdentity(currentUrl);
        const requestClass = endpoint.requestClass;
        const budgetReservationId = reserve(request.runId, requestClass);
        recordConsumption(request);
        const attemptId = `attempt:${nextAttempt++}`;
        const attempt = {
          attemptId,
          logicalRequestId: request.requestId,
          runId: request.runId,
          runMode: request.runMode,
          requestClass,
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
        const start = emit("outbound-attempt-start", {
          attemptId,
          logicalRequestId: request.requestId,
          runId: request.runId,
          runMode: request.runMode,
          requestClass,
          attemptSequence: attempt.attemptSequence,
          redirectHopIndex: hopIndex,
          safeEndpointIdentity: endpoint.identity,
          destinationHostClass: "TMDB_EXACT_HOST",
          budgetReservationId,
        });
        attempt.startedSequence = start.sequence;
        try {
          onAttemptStart?.({ requestId: request.requestId, attemptId });
          const fetchOptions = { ...options, redirect: "manual" };
          const result = await fetchImpl(currentUrl, fetchOptions);
          const location = locationFromResponse(result);
          attempt.statusClass = responseStatusClass(result);
          attempt.redirectLocationClass = location ? "PRESENT" : "NONE";
          const terminal = emit(responseIsRedirect(result) ? "outbound-attempt-complete" : "outbound-attempt-complete", {
            attemptId,
            logicalRequestId: request.requestId,
            runId: request.runId,
            runMode: request.runMode,
            requestClass,
            redirectHopIndex: hopIndex,
            safeEndpointIdentity: endpoint.identity,
            statusClass: attempt.statusClass,
            redirectLocationClass: attempt.redirectLocationClass,
            budgetReservationId,
          });
          attempt.completedSequence = terminal.sequence;
          onAttemptTerminal?.({ requestId: request.requestId, attemptId });
          if (!responseIsRedirect(result)) return result;
          redirectCount += 1;
          if (!location || hopIndex >= MAX_REDIRECT_HOPS) {
            const error = new Error(hopIndex >= MAX_REDIRECT_HOPS ? "TMDB_REDIRECT_HOP_LIMIT_EXCEEDED" : "TMDB_REDIRECT_NOT_ALLOWED");
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
          safeEndpointIdentity(nextUrl);
          hopIndex += 1;
          currentUrl = nextUrl;
        } catch (error) {
          if (attempt.completedSequence === null) {
            attempt.statusClass = "FAILED";
            const terminal = emit("outbound-attempt-failed", {
              attemptId,
              logicalRequestId: request.requestId,
              runId: request.runId,
              runMode: request.runMode,
              requestClass,
              redirectHopIndex: hopIndex,
              safeEndpointIdentity: endpoint.identity,
              statusClass: "FAILED",
              redirectLocationClass: null,
              budgetReservationId,
              errorCode: error?.code || error?.message || "OUTBOUND_FAILED",
            });
            attempt.completedSequence = terminal.sequence;
            onAttemptTerminal?.({ requestId: request.requestId, attemptId });
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
    mode,
    limits: contract,
    attempts: () => attempts.map(clone),
    events: () => events.map(clone),
    usage: usageSnapshot,
    redirectCount: () => redirectCount,
    isConsumed: () => consumptionState.consumed,
    consumedAtEvent: () => clone(consumptionState.event),
    assertNoCallerInjection: (value = {}) => {
      if (!value || typeof value !== "object") throw new TypeError("LIVE_V2_CALLER_INJECTION_REJECTED");
      if (Reflect.ownKeys(value).length > 0) {
        throw new TypeError("LIVE_V2_CALLER_INJECTION_REJECTED");
      }
      return true;
    },
  });
}

export function outboundControllerContract() {
  return Object.freeze({
    redirectMode: "manual",
    maximumRedirectHops: MAX_REDIRECT_HOPS,
    requestBudget: { total: 24, list: 8, detail: 16, aggregate: 72 },
    concurrency: 4,
    retry: 0,
    host: LIVE_NETWORK_HOST,
  });
}

export function fixedOutboundLimits() {
  return { ...FIXED_LIMITS };
}
