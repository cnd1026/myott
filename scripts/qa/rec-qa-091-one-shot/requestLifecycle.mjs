import { AsyncLocalStorage } from "node:async_hooks";

const REQUEST_CLASSES = new Set(["list", "detail"]);
const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertRequestClass(value) {
  if (!REQUEST_CLASSES.has(value)) throw new TypeError("ONE_SHOT_REQUEST_CLASS_INVALID");
}

export class RequestLifecycleReducer {
  #requests = new Map();
  #events = [];
  #nextEvent = 0;

  #emit(type, fields) {
    const event = { eventId: `lifecycle:${this.#nextEvent++}`, sequence: this.#events.length, type, ...fields };
    this.#events.push(event);
    return event;
  }

  startRequest({ requestId, runId, runMode, requestClass, page, providerItemId, safeEndpointIdentity, cacheRelation = "UNKNOWN", retryIndex = 0 }) {
    if (typeof requestId !== "string" || !requestId || this.#requests.has(requestId)) throw new TypeError("REQUEST_START_DUPLICATE_OR_INVALID");
    assertRequestClass(requestClass);
    if (typeof runId !== "string" || !runId || typeof runMode !== "string" || !runMode ||
      typeof safeEndpointIdentity !== "string" || !safeEndpointIdentity || !Number.isSafeInteger(retryIndex)) {
      throw new TypeError("REQUEST_START_FIELDS_INVALID");
    }
    if (requestClass === "list" && !Number.isSafeInteger(page)) throw new TypeError("LIST_START_PAGE_REQUIRED");
    if (requestClass === "detail" && !Number.isSafeInteger(providerItemId)) throw new TypeError("DETAIL_START_PROVIDER_ID_REQUIRED");
    const state = {
      requestId,
      runId,
      runMode,
      requestClass,
      page: page ?? null,
      providerItemId: providerItemId ?? null,
      safeEndpointIdentity,
      cacheRelation,
      retryIndex,
      phase: "STARTED",
      attemptIds: new Set(),
      terminalAttemptIds: new Set(),
      attemptObserved: false,
      cacheObserved: false,
      terminal: null,
    };
    this.#requests.set(requestId, state);
    this.#emit("provider-request-start", {
      requestId,
      requestClass,
      runId,
      runMode,
      ...(requestClass === "list" ? { page } : { providerItemId }),
      safeEndpointIdentity,
      cacheRelation,
      retryIndex,
    });
    return requestId;
  }

  recordAttemptStart({ requestId, attemptId }) {
    const state = this.#requests.get(requestId);
    if (!state) throw new TypeError("UNKNOWN_REQUEST_ID");
    if (!["STARTED", "ATTEMPTING"].includes(state.phase)) throw new TypeError("ATTEMPT_AFTER_TERMINAL");
    if (typeof attemptId !== "string" || !attemptId || state.attemptIds.has(attemptId)) throw new TypeError("ATTEMPT_START_DUPLICATE_OR_INVALID");
    state.attemptIds.add(attemptId);
    state.attemptObserved = true;
    state.phase = "ATTEMPTING";
    return true;
  }

  recordAttemptTerminal({ requestId, attemptId }) {
    const state = this.#requests.get(requestId);
    if (!state) throw new TypeError("UNKNOWN_REQUEST_ID");
    if (!state.attemptIds.has(attemptId) || state.terminalAttemptIds.has(attemptId)) throw new TypeError("ATTEMPT_TERMINAL_PAIR_INVALID");
    state.terminalAttemptIds.add(attemptId);
    return true;
  }

  markCacheHit(requestId) {
    const state = this.#requests.get(requestId);
    if (!state) throw new TypeError("UNKNOWN_REQUEST_ID");
    if (state.phase !== "STARTED" || state.attemptIds.size !== 0) throw new TypeError("CACHE_ATTEMPT_AFTER_OUTBOUND");
    state.attemptObserved = true;
    state.cacheObserved = true;
    state.cacheRelation = "HIT";
    state.phase = "CACHE_HIT";
    this.#emit("provider-request-cache-hit", {
      requestId: state.requestId,
      requestClass: state.requestClass,
      runId: state.runId,
      runMode: state.runMode,
      ...(state.requestClass === "list" ? { page: state.page } : { providerItemId: state.providerItemId }),
      safeEndpointIdentity: state.safeEndpointIdentity,
      cacheRelation: "HIT",
      outboundAttemptIds: [],
    });
    return true;
  }

  markPreOutboundFailure(requestId) {
    const state = this.#requests.get(requestId);
    if (!state) throw new TypeError("UNKNOWN_REQUEST_ID");
    if (state.phase !== "STARTED") throw new TypeError("PRE_OUTBOUND_FAILURE_INVALID");
    state.attemptObserved = true;
    state.phase = "PRE_OUTBOUND_FAILURE";
    return true;
  }

  #finish(requestId, statusClass, errorCode = "") {
    const state = this.#requests.get(requestId);
    if (!state) throw new TypeError("UNKNOWN_REQUEST_ID");
    if (state.terminal || !TERMINAL_STATUSES.has(statusClass)) throw new TypeError("REQUEST_TERMINAL_DUPLICATE_OR_INVALID");
    if (!state.attemptObserved) throw new TypeError("REQUEST_TERMINAL_WITHOUT_ATTEMPT");
    if (state.attemptIds.size !== state.terminalAttemptIds.size) throw new TypeError("REQUEST_TERMINAL_WITH_OPEN_ATTEMPT");
    state.phase = statusClass;
    state.terminal = statusClass;
    const start = this.#events.find((event) => event.requestId === requestId && event.type === "provider-request-start");
    this.#emit(statusClass === "COMPLETED" ? "provider-request-complete" : "provider-request-failed", {
      requestId,
      requestClass: state.requestClass,
      runId: state.runId,
      runMode: state.runMode,
      ...(state.requestClass === "list" ? { page: state.page } : { providerItemId: state.providerItemId }),
      safeEndpointIdentity: state.safeEndpointIdentity,
      cacheRelation: state.cacheRelation,
      outboundAttemptIds: [...state.attemptIds],
      startedSequence: start?.sequence ?? null,
      ...(errorCode ? { errorCode: /^[A-Z0-9_]{1,80}$/.test(errorCode) ? errorCode : "REQUEST_FAILED" } : {}),
    });
    return true;
  }

  completeRequest(requestId) {
    return this.#finish(requestId, "COMPLETED");
  }

  failRequest(requestId, errorCode = "REQUEST_FAILED") {
    return this.#finish(requestId, "FAILED", errorCode);
  }

  getState(requestId) {
    const state = this.#requests.get(requestId);
    if (!state) throw new TypeError("UNKNOWN_REQUEST_ID");
    return {
      requestId: state.requestId,
      requestClass: state.requestClass,
      phase: state.phase,
      terminal: state.terminal,
      attemptCount: state.attemptIds.size,
      terminalAttemptCount: state.terminalAttemptIds.size,
      cacheRelation: state.cacheRelation,
    };
  }

  events() {
    return this.#events.map(clone);
  }

  logicalRequestLedger() {
    const starts = new Map();
    const terminals = new Map();
    const cacheHits = new Map();
    for (const event of this.#events) {
      if (event.type === "provider-request-start") starts.set(event.requestId, event);
      if (["provider-request-complete", "provider-request-failed"].includes(event.type)) terminals.set(event.requestId, event);
      if (event.type === "provider-request-cache-hit") cacheHits.set(event.requestId, event);
    }
    return [...starts.values()].map((start) => {
      const terminal = terminals.get(start.requestId);
      const state = this.#requests.get(start.requestId);
      return {
        logicalRequestId: start.requestId,
        runId: start.runId,
        runMode: start.runMode,
        requestClass: start.requestClass,
        ...(start.requestClass === "list" ? { page: start.page } : { providerItemId: start.providerItemId }),
        safeEndpointIdentity: start.safeEndpointIdentity,
        startedSequence: start.sequence,
        completedSequence: terminal?.sequence ?? null,
        finalStatusClass: terminal?.type === "provider-request-complete" ? "COMPLETED" : terminal ? "FAILED" : "OPEN",
        cacheRelation: cacheHits.has(start.requestId) ? "HIT" : start.cacheRelation,
        redirectCount: 0,
        outboundAttemptIds: [...(state?.attemptIds || [])],
        retryIndex: start.retryIndex,
        attemptCount: state?.attemptIds.size ?? 0,
      };
    });
  }
}

export function createRequestLifecycleContext({ reducer, baseContext, runId, runMode }) {
  if (!(reducer instanceof RequestLifecycleReducer)) throw new TypeError("ONE_SHOT_REDUCER_REQUIRED");
  if (!baseContext || typeof baseContext.get !== "function") throw new TypeError("ONE_SHOT_BASE_CONTEXT_REQUIRED");
  const storage = new AsyncLocalStorage();
  let nextRequest = 0;

  function requestMeta(path, kind) {
    const parts = String(path).split("/").filter(Boolean);
    const providerItemId = /^\d+$/.test(parts[1] || "") ? Number(parts[1]) : null;
    const requestClass = kind === "detail" ? "detail" : "list";
    return {
      requestId: `${runId}:logical:${nextRequest++}`,
      runId,
      runMode,
      requestClass,
      page: requestClass === "list" ? 1 : undefined,
      providerItemId: requestClass === "detail" ? providerItemId : undefined,
      safeEndpointIdentity: requestClass === "detail" ? `/3/tv/${providerItemId || 0}` : "/3/discover/tv",
      cacheRelation: runMode === "cold" ? "MISS" : "UNKNOWN",
      retryIndex: 0,
    };
  }

  async function execute(meta, operation) {
    reducer.startRequest(meta);
    return storage.run({ requestId: meta.requestId, runId, runMode }, async () => {
      try {
        const value = await operation();
        const state = reducer.getState(meta.requestId);
        if (state.attemptCount === 0) reducer.markCacheHit(meta.requestId);
        reducer.completeRequest(meta.requestId);
        return value;
      } catch (error) {
        const state = reducer.getState(meta.requestId);
        if (state.attemptCount === 0 && state.phase === "STARTED") reducer.markPreOutboundFailure(meta.requestId);
        reducer.failRequest(meta.requestId, error?.code || error?.message || "REQUEST_FAILED");
        throw error;
      }
    });
  }

  const requestContext = {
    get(path, params = {}, options = {}) {
      const kind = options.kind || (String(path).match(/^\/tv\/\d+$/) ? "detail" : "list");
      const { kind: _kind, ...transportOptions } = options;
      return execute(requestMeta(path, kind), () => baseContext.get(path, params, transportOptions));
    },
    hasBudget: (...args) => baseContext.hasBudget(...args),
    hasTimeRemaining: (...args) => baseContext.hasTimeRemaining(...args),
    remainingDeadlineMs: (...args) => baseContext.remainingDeadlineMs(...args),
    setEarlyStop: (...args) => baseContext.setEarlyStop(...args),
    setSeedDiagnostics: (...args) => baseContext.setSeedDiagnostics(...args),
    diagnostics: (...args) => baseContext.diagnostics(...args),
    assertObservabilitySession: (...args) => baseContext.assertObservabilitySession(...args),
    limits: baseContext.limits,
  };

  return {
    requestContext,
    getCurrentRequest: () => storage.getStore(),
    recordAttemptStart: ({ requestId, attemptId }) => reducer.recordAttemptStart({ requestId, attemptId }),
    recordAttemptTerminal: ({ requestId, attemptId }) => reducer.recordAttemptTerminal({ requestId, attemptId }),
    reducer,
  };
}
