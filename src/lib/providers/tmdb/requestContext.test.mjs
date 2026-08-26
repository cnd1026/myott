import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  TMDB_REQUEST_LIMITS,
  TMDB_TIME_LIMITS,
  TmdbBudgetError,
  TmdbDeadlineError,
  TmdbFetchTimeoutError,
  clearTmdbRequestCache,
  createTmdbRequestContext,
} from "./requestContext.js";
import {
  TMDB_OBSERVABILITY_STAGES,
  createTmdbObservabilitySession,
  emitTmdbObservabilityEvent,
  finalizeTmdbObservabilitySession,
  tmdbObservabilitySessionMetadata,
} from "../../recommendation/qa/tmdbObservability.js";

function response(status, payload = {}, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] || null },
    async json() {
      return payload;
    },
  };
}

function finalizeRequestOnlySession(session, diagnostics) {
  emitTmdbObservabilityEvent(session, "candidate-pool-summary", {
    recallStageCount: 0,
    sourceResultCount: 0,
    normalizationCount: 0,
    arrivalCount: 0,
    stageCapExcludedCount: 0,
    distinctCount: 0,
    duplicateCount: 0,
    boundedCount: 0,
    poolExcludedCount: 0,
  });
  for (const stage of TMDB_OBSERVABILITY_STAGES) {
    emitTmdbObservabilityEvent(session, "stage-summary", {
      stage,
      inputCount: 0,
      outputCount: 0,
      excludedCount: 0,
    });
  }
  emitTmdbObservabilityEvent(session, "run-summary", {
    requestBudget: 24,
    listRequestBudget: 8,
    detailRequestBudget: 16,
    concurrencyLimit: 4,
    retryLimit: 2,
    fetchTimeoutMs: 8_000,
    recommendationDeadlineMs: 15_000,
    requestsUsed: diagnostics.requestsUsed,
    listRequestsUsed: diagnostics.listRequestsUsed,
    detailRequestsUsed: diagnostics.detailRequestsUsed,
    cacheHits: diagnostics.cacheHits,
    retryCount: diagnostics.retryCount,
    deadlineExceeded: diagnostics.deadlineExceeded,
  });
  return finalizeTmdbObservabilitySession(session);
}

function errorWithCode(code, ErrorType = Error) {
  const error = new ErrorType("sensitive native message must not be emitted");
  Object.defineProperty(error, "code", { value: code, configurable: true, enumerable: true });
  return error;
}

async function captureObservedFailure(error, { afterResponse = false } = {}) {
  clearTmdbRequestCache();
  const session = createTmdbObservabilitySession();
  let fetchCount = 0;
  const context = createTmdbRequestContext({
    observer: session,
    limits: { retries: 0 },
    fetchImpl: async () => {
      fetchCount += 1;
      if (!afterResponse) throw error;
      return { ...response(200), json: () => { throw error; } };
    },
  });
  const noRejection = Symbol("no-rejection");
  let rejection = noRejection;
  try {
    await context.get("/discover/tv", { page: 1 });
  } catch (caught) {
    rejection = caught;
  }
  assert.notStrictEqual(rejection, noRejection);
  assert.strictEqual(rejection, error);
  const evidence = finalizeRequestOnlySession(session, context.diagnostics());
  const failure = evidence.events.find((event) => event.type === "request-failed");
  assert.ok(failure);
  return { evidence, failure, fetchCount };
}

beforeEach(() => clearTmdbRequestCache());

test("concurrent identical requests share one in-flight promise", async () => {
  let fetchCount = 0;
  const context = createTmdbRequestContext({
    fetchImpl: async () => {
      fetchCount += 1;
      await Promise.resolve();
      return response(200, { results: [1] });
    },
  });

  const [left, right] = await Promise.all([
    context.get("/discover/movie", { page: 1 }),
    context.get("/discover/movie", { page: 1 }),
  ]);

  assert.deepEqual(left, right);
  assert.equal(fetchCount, 1);
  assert.equal(context.diagnostics().requestDedupHits, 1);
});

test("cache hits do not consume a later request budget", async () => {
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    return response(200, { id: 10 });
  };
  const first = createTmdbRequestContext({ fetchImpl, language: "ko-KR", region: "KR" });
  const second = createTmdbRequestContext({ fetchImpl, language: "ko-KR", region: "KR" });

  await first.get("/movie/10", {}, { kind: "detail" });
  await second.get("/movie/10", {}, { kind: "detail" });

  assert.equal(fetchCount, 1);
  assert.equal(second.diagnostics().requestsUsed, 0);
  assert.equal(second.diagnostics().cacheHits, 1);
});

test("language and region remain part of the safe cache identity", async () => {
  let fetchCount = 0;
  const fetchImpl = async () => response(200, { call: ++fetchCount });
  const korean = createTmdbRequestContext({ fetchImpl, language: "ko-KR", region: "KR" });
  const english = createTmdbRequestContext({ fetchImpl, language: "en-US", region: "US" });

  await korean.get("/search/multi", { query: "Dune" });
  await english.get("/search/multi", { query: "Dune" });

  assert.equal(fetchCount, 2);
});

test("total and detail limits stop new calls without discarding completed work", async () => {
  const context = createTmdbRequestContext({
    fetchImpl: async (url) => response(200, { url }),
    limits: { total: 2, list: 1, detail: 1 },
  });

  const listResult = await context.get("/discover/movie", { page: 1 });
  const detailResult = await context.get("/movie/1", {}, { kind: "detail" });

  assert.ok(listResult.url);
  assert.ok(detailResult.url);
  await assert.rejects(
    context.get("/movie/2", {}, { kind: "detail" }),
    (error) => error instanceof TmdbBudgetError,
  );
  assert.equal(context.diagnostics().requestsUsed, 2);
  assert.equal(context.diagnostics().budgetExhausted, true);
});

test("429 responses retry at most twice and honor Retry-After", async () => {
  let fetchCount = 0;
  const delays = [];
  const context = createTmdbRequestContext({
    fetchImpl: async () => {
      fetchCount += 1;
      return fetchCount < 3
        ? response(429, {}, { "retry-after": "0.01" })
        : response(200, { ok: true });
    },
    sleep: async (delay) => delays.push(delay),
    random: () => 0,
  });

  const payload = await context.get("/discover/tv", { page: 1 });

  assert.equal(payload.ok, true);
  assert.equal(fetchCount, 3);
  assert.deepEqual(delays, [10, 10]);
  assert.equal(context.diagnostics().retryCount, 2);
  assert.equal(context.diagnostics().rateLimitedCount, 2);
});

test("non-retryable 404 responses fail once", async () => {
  let fetchCount = 0;
  const context = createTmdbRequestContext({
    fetchImpl: async () => {
      fetchCount += 1;
      return response(404);
    },
  });

  await assert.rejects(context.get("/movie/404", {}, { kind: "detail" }));
  assert.equal(fetchCount, 1);
  assert.equal(context.diagnostics().retryCount, 0);
});

test("detail and provider enrichment share the same detail request", async () => {
  let fetchCount = 0;
  const context = createTmdbRequestContext({
    fetchImpl: async () => {
      fetchCount += 1;
      return response(200, { id: 20, "watch/providers": { results: {} } });
    },
  });

  await Promise.all([
    context.get("/movie/20", { append_to_response: "watch/providers" }, { kind: "detail" }),
    context.get("/movie/20", { append_to_response: "watch/providers" }, { kind: "detail" }),
  ]);

  assert.equal(fetchCount, 1);
  assert.equal(context.diagnostics().detailRequestsUsed, 1);
  assert.equal(context.diagnostics().duplicateDetailRequestCount, 0);
});

test("concurrent work never exceeds the configured request limit", async () => {
  let active = 0;
  let maximumActive = 0;
  const context = createTmdbRequestContext({
    fetchImpl: async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return response(200, { ok: true });
    },
    limits: { total: 8, list: 8, concurrency: 4 },
  });

  const requests = Array.from({ length: 8 }, (_, index) =>
    context.get("/discover/movie", { page: index + 1 }),
  );
  await Promise.all(requests);

  assert.equal(maximumActive, 4);
  assert.equal(context.diagnostics().maxConcurrentObserved, 4);
});

async function runPendingBodySlotCheck({ observer } = {}) {
  clearTmdbRequestCache();
  let fetchCount = 0;
  let resolveFirstBody;
  const firstBody = new Promise((resolve) => {
    resolveFirstBody = resolve;
  });
  const context = createTmdbRequestContext({
    observer,
    limits: { total: 2, list: 2, concurrency: 1 },
    fetchImpl: async () => {
      fetchCount += 1;
      return fetchCount === 1
        ? { ...response(200), json: () => firstBody }
        : response(200, { ok: true });
    },
  });

  const first = context.get("/discover/movie", { page: 1 });
  await Promise.resolve();
  await Promise.resolve();
  const second = context.get("/discover/movie", { page: 2 });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(fetchCount, 2);
  resolveFirstBody({ ok: true });
  await Promise.all([first, second]);
  return context.diagnostics();
}

test("observer preserves main request-slot release while response body parsing is pending", async () => {
  const baseline = await runPendingBodySlotCheck();
  const observed = await runPendingBodySlotCheck({ observer: createTmdbObservabilitySession() });
  assert.equal(baseline.requestsUsed, 2);
  assert.equal(observed.requestsUsed, baseline.requestsUsed);
  assert.equal(observed.maxConcurrentObserved, baseline.maxConcurrentObserved);
});

test("individual fetch timeout aborts a stalled request", async () => {
  const session = createTmdbObservabilitySession();
  const context = createTmdbRequestContext({
    observer: session,
    fetchImpl: async (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    }),
    limits: { retries: 0 },
    fetchTimeoutMs: 10,
    recommendationDeadlineMs: 100,
  });

  await assert.rejects(
    context.get("/search/multi", { query: "stalled" }),
    (error) => error instanceof TmdbFetchTimeoutError,
  );
  const diagnostics = context.diagnostics();
  assert.equal(diagnostics.requestsUsed, 1);
  assert.equal(diagnostics.deadlineExceeded, false);
  const evidence = finalizeRequestOnlySession(session, diagnostics);
  const failure = evidence.events.find((event) => event.type === "request-failed");
  assert.equal(failure.statusClass, "fetch-timeout");
  assert.equal(Object.hasOwn(failure, "responseReached"), false);
  assert.equal(Object.hasOwn(failure, "transportFailureCategory"), false);
});

test("Retry-After waits are capped at five seconds", async () => {
  let fetchCount = 0;
  const delays = [];
  const context = createTmdbRequestContext({
    fetchImpl: async () => {
      fetchCount += 1;
      return fetchCount === 1
        ? response(429, {}, { "retry-after": "30" })
        : response(200, { ok: true });
    },
    sleep: async (delay) => delays.push(delay),
    maximumRetryAfterMs: 5_000,
  });

  await context.get("/discover/movie", { page: 1 });
  assert.deepEqual(delays, [5_000]);
  assert.equal(context.diagnostics().maximumRetryAfterMs, 5_000);
});

test("retry does not wait through the remaining recommendation deadline", async () => {
  const delays = [];
  const context = createTmdbRequestContext({
    fetchImpl: async () => response(429, {}, { "retry-after": "30" }),
    sleep: async (delay) => delays.push(delay),
    recommendationDeadlineMs: 2_000,
    maximumRetryAfterMs: 5_000,
  });

  await assert.rejects(
    context.get("/discover/movie", { page: 1 }),
    (error) => error instanceof TmdbDeadlineError,
  );
  assert.deepEqual(delays, []);
  assert.equal(context.diagnostics().deadlineExceeded, true);
});

test("request diagnostics report one aggregate context", async () => {
  const context = createTmdbRequestContext({
    fetchImpl: async () => response(200, { ok: true }),
  });
  context.setSeedDiagnostics({
    requestedSeeds: ["A", "B"],
    normalizedSeeds: ["A", "B"],
    processedSeeds: ["A"],
    unresolvedSeeds: [],
    deferredSeeds: ["B"],
    perSeedCandidateCounts: { A: 4, B: 0 },
  });

  await context.get("/search/multi", { query: "A" }, { seedKey: "A" });
  const diagnostics = context.diagnostics();
  assert.equal(diagnostics.requestContextCount, 1);
  assert.equal(diagnostics.aggregateRequestsUsed, diagnostics.requestsUsed);
  assert.deepEqual(diagnostics.perSeedRequestCounts, { A: 1 });
  assert.equal(diagnostics.processedSeedCount, 1);
  assert.equal(diagnostics.deferredSeedCount, 1);
});

async function runStrictDeadlineBoundary({ observer } = {}) {
  clearTmdbRequestCache();
  let fetchCount = 0;
  let nowCallCount = 0;
  const context = createTmdbRequestContext({
    observer,
    now: () => nowCallCount++ * 130,
    fetchImpl: async () => {
      fetchCount += 1;
      return response(200, { ok: true });
    },
  });
  for (let id = 1; id <= 16; id += 1) {
    await context.get(`/tv/${id}`, {}, { kind: "detail" });
  }
  const callsBeforeDiagnostics = nowCallCount;
  const diagnostics = context.diagnostics();
  return { callsBeforeDiagnostics, diagnostics, fetchCount };
}

test("active-base observer preserves the exact main 15-second detail boundary and policy clock count", async () => {
  const baseline = await runStrictDeadlineBoundary();
  const session = createTmdbObservabilitySession();
  const observed = await runStrictDeadlineBoundary({ observer: session });

  assert.equal(baseline.fetchCount, 16);
  assert.equal(observed.fetchCount, 16);
  assert.equal(baseline.diagnostics.detailRequestsUsed, 16);
  assert.equal(observed.diagnostics.detailRequestsUsed, 16);
  assert.equal(baseline.diagnostics.deadlineExceeded, false);
  assert.equal(observed.diagnostics.deadlineExceeded, false);
  assert.equal(observed.callsBeforeDiagnostics, baseline.callsBeforeDiagnostics);
  assert.equal(tmdbObservabilitySessionMetadata(session).eventCount, 32);
});

test("observer binding rejects non-opaque values before request or policy-clock activity", () => {
  let fetchCount = 0;
  let nowCallCount = 0;
  assert.throws(
    () => createTmdbRequestContext({
      observer: { callerControlled: true },
      now: () => {
        nowCallCount += 1;
        return 0;
      },
      fetchImpl: async () => {
        fetchCount += 1;
        return response(200);
      },
    }),
    (error) => error?.code === "TMDB_OBSERVABILITY_INTEGRITY_FAILED" && error?.stage === "context-binding",
  );
  assert.equal(fetchCount, 0);
  assert.equal(nowCallCount, 0);
});

async function runObservedRetry({ observer } = {}) {
  clearTmdbRequestCache();
  let fetchCount = 0;
  let nowCallCount = 0;
  const context = createTmdbRequestContext({
    observer,
    now: () => {
      nowCallCount += 1;
      return 0;
    },
    fetchImpl: async () => {
      fetchCount += 1;
      return fetchCount < 3
        ? response(429, {}, { "retry-after": "0.01" })
        : response(200, { ok: true });
    },
    sleep: async () => {},
    random: () => 0,
  });
  await context.get("/discover/tv", { page: 1 });
  const callsBeforeDiagnostics = nowCallCount;
  return { callsBeforeDiagnostics, diagnostics: context.diagnostics(), fetchCount };
}

test("observer preserves retry decisions and adds no policy-clock reads", async () => {
  const baseline = await runObservedRetry();
  const session = createTmdbObservabilitySession();
  const observed = await runObservedRetry({ observer: session });
  assert.equal(baseline.fetchCount, 3);
  assert.equal(observed.fetchCount, 3);
  assert.equal(baseline.diagnostics.retryCount, 2);
  assert.equal(observed.diagnostics.retryCount, 2);
  assert.equal(observed.callsBeforeDiagnostics, baseline.callsBeforeDiagnostics);
  assert.equal(tmdbObservabilitySessionMetadata(session).eventCount, 6);
});

test("transport failure observability records the exact pre-response and post-response boundary", async () => {
  const preResponse = await captureObservedFailure(errorWithCode("ENOTFOUND"));
  assert.equal(preResponse.fetchCount, 1);
  assert.equal(preResponse.failure.statusClass, "transport-error");
  assert.equal(preResponse.failure.responseReached, false);
  assert.equal(preResponse.failure.transportFailureCategory, "dns-resolution");

  const postResponse = await captureObservedFailure(errorWithCode("ECONNRESET", TypeError), {
    afterResponse: true,
  });
  assert.equal(postResponse.fetchCount, 1);
  assert.equal(postResponse.failure.statusClass, "transport-error");
  assert.equal(postResponse.failure.responseReached, true);
  assert.equal(postResponse.failure.transportFailureCategory, "connection-reset");
});

test("transport failure normalizer applies every approved non-TLS native mapping", async () => {
  const mappings = [
    ["EAI_AGAIN", "dns-resolution"],
    ["ENOTFOUND", "dns-resolution"],
    ["ECONNREFUSED", "connection-refused"],
    ["ECONNRESET", "connection-reset"],
    ["ENETUNREACH", "network-unreachable"],
    ["EHOSTUNREACH", "host-unreachable"],
    ["ETIMEDOUT", "socket-timeout"],
    ["UND_ERR_CONNECT_TIMEOUT", "socket-timeout"],
    ["UND_ERR_HEADERS_TIMEOUT", "socket-timeout"],
    ["UND_ERR_BODY_TIMEOUT", "socket-timeout"],
    ["ABORT_ERR", "abort"],
  ];
  for (const [code, expectedCategory] of mappings) {
    const { failure } = await captureObservedFailure(errorWithCode(code));
    assert.equal(failure.transportFailureCategory, expectedCategory, code);
    assert.equal(failure.responseReached, false, code);
  }

  const abortError = new Error("safe internal abort identity");
  Object.defineProperty(abortError, "name", { value: "AbortError", configurable: true });
  const { failure } = await captureObservedFailure(abortError);
  assert.equal(failure.transportFailureCategory, "abort");
});

test("transport failure normalizer applies the exact approved TLS code allowlist", async () => {
  const tlsCodes = [
    "CERT_HAS_EXPIRED",
    "CERT_NOT_YET_VALID",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "UNABLE_TO_GET_ISSUER_CERT",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "CERT_SIGNATURE_FAILURE",
    "CERT_CHAIN_TOO_LONG",
    "CERT_REVOKED",
    "INVALID_CA",
    "PATH_LENGTH_EXCEEDED",
    "INVALID_PURPOSE",
    "CERT_UNTRUSTED",
    "CERT_REJECTED",
    "HOSTNAME_MISMATCH",
    "ERR_TLS_CERT_ALTNAME_INVALID",
  ];
  for (const code of tlsCodes) {
    const { failure } = await captureObservedFailure(errorWithCode(code));
    assert.equal(failure.transportFailureCategory, "tls-certificate", code);
  }
});

test("transport failure normalizer inspects only one safe TypeError cause", async () => {
  const cause = errorWithCode("ENOTFOUND");
  const wrapper = new TypeError("fetch failed");
  Object.defineProperty(wrapper, "cause", { value: cause, configurable: true });
  const direct = await captureObservedFailure(wrapper);
  assert.equal(direct.failure.transportFailureCategory, "dns-resolution");

  const postResponse = await captureObservedFailure(wrapper, { afterResponse: true });
  assert.equal(postResponse.failure.responseReached, true);
  assert.equal(postResponse.failure.transportFailureCategory, "other-transport-error");

  let deepCauseReads = 0;
  const directUnknownCause = new Error("direct unknown cause");
  Object.defineProperty(directUnknownCause, "cause", {
    configurable: true,
    get() {
      deepCauseReads += 1;
      return errorWithCode("ENOTFOUND");
    },
  });
  const deepWrapper = new TypeError("fetch failed");
  Object.defineProperty(deepWrapper, "cause", { value: directUnknownCause, configurable: true });
  const deep = await captureObservedFailure(deepWrapper);
  assert.equal(deep.failure.transportFailureCategory, "other-transport-error");
  assert.equal(deepCauseReads, 0);

  const unsupportedWrapper = new Error("not an exact TypeError wrapper");
  Object.defineProperty(unsupportedWrapper, "cause", { value: cause, configurable: true });
  const unsupported = await captureObservedFailure(unsupportedWrapper);
  assert.equal(unsupported.failure.transportFailureCategory, "other-transport-error");
});

test("transport failure normalizer never invokes code, name, cause, or AggregateError accessors", async () => {
  let codeReads = 0;
  const accessorCode = new TypeError("accessor code");
  Object.defineProperty(accessorCode, "code", {
    configurable: true,
    get() {
      codeReads += 1;
      return "ENOTFOUND";
    },
  });
  const codeResult = await captureObservedFailure(accessorCode);
  assert.equal(codeResult.failure.transportFailureCategory, "other-transport-error");
  assert.equal(codeReads, 0);

  let causeReads = 0;
  const accessorCause = new TypeError("accessor cause");
  Object.defineProperty(accessorCause, "cause", {
    configurable: true,
    get() {
      causeReads += 1;
      return errorWithCode("ENOTFOUND");
    },
  });
  const causeResult = await captureObservedFailure(accessorCause);
  assert.equal(causeResult.failure.transportFailureCategory, "other-transport-error");
  assert.equal(causeReads, 0);

  let nameReads = 0;
  const accessorNameCause = new Error("accessor name");
  Object.defineProperty(accessorNameCause, "name", {
    configurable: true,
    get() {
      nameReads += 1;
      return "AbortError";
    },
  });
  const nameWrapper = new TypeError("fetch failed");
  Object.defineProperty(nameWrapper, "cause", { value: accessorNameCause, configurable: true });
  const nameResult = await captureObservedFailure(nameWrapper);
  assert.equal(nameResult.failure.transportFailureCategory, "other-transport-error");
  assert.equal(nameReads, 0);

  let aggregateReads = 0;
  const aggregate = new AggregateError([], "aggregate failure");
  Object.defineProperty(aggregate, "errors", {
    configurable: true,
    get() {
      aggregateReads += 1;
      return [errorWithCode("ENOTFOUND")];
    },
  });
  const aggregateResult = await captureObservedFailure(aggregate);
  assert.equal(aggregateResult.failure.transportFailureCategory, "other-transport-error");
  assert.equal(aggregateReads, 0);
});

test("transport failure normalizer safely collapses unknown and non-Error throws", async () => {
  class CustomError extends Error {}
  const descriptorTrapFailure = new Proxy(new TypeError("fetch failed"), {
    getOwnPropertyDescriptor() {
      throw new Error("descriptor trap must not escape normalization");
    },
  });
  const invalidCodes = [
    errorWithCode("UNKNOWN_NATIVE_CODE"),
    errorWithCode("é"),
    errorWithCode("A".repeat(65)),
    errorWithCode(123),
    new CustomError("custom error"),
    "string throw",
    42,
    null,
    undefined,
    descriptorTrapFailure,
  ];
  for (const thrown of invalidCodes) {
    const { failure } = await captureObservedFailure(thrown);
    assert.equal(failure.transportFailureCategory, "other-transport-error");
  }
});

test("transport failure evidence contains only the two bounded additive fields", async () => {
  const error = errorWithCode("ECONNRESET", TypeError);
  error.url = "https://example.invalid/path?api_key=credential-marker";
  error.authorization = "Bearer credential-marker";
  error.stack = "filesystem-marker";
  const { evidence, failure } = await captureObservedFailure(error);
  assert.deepEqual(Object.keys(failure).sort(), [
    "endpointClass",
    "requestId",
    "requestKind",
    "responseReached",
    "retryIndex",
    "sequence",
    "statusClass",
    "transportFailureCategory",
    "type",
  ]);
  for (const prohibited of [
    "ECONNRESET",
    "sensitive native message",
    "credential-marker",
    "filesystem-marker",
    "https://",
    "api_key",
  ]) {
    assert.equal(JSON.stringify(evidence).includes(prohibited), false, prohibited);
  }
  for (const prohibitedField of ["transportPhase", "abortState", "errorClass", "errorCode"]) {
    assert.equal(Object.hasOwn(failure, prohibitedField), false);
  }
});

test("non-transport request failures never receive transport detail fields", async () => {
  const { failure } = await captureObservedFailure(new SyntaxError("invalid provider payload"), {
    afterResponse: true,
  });
  assert.equal(failure.statusClass, "payload-error");
  assert.equal(Object.hasOwn(failure, "responseReached"), false);
  assert.equal(Object.hasOwn(failure, "transportFailureCategory"), false);
});

async function runObservedTransportRetry({ observer } = {}) {
  clearTmdbRequestCache();
  let fetchCount = 0;
  let nowCallCount = 0;
  const context = createTmdbRequestContext({
    observer,
    now: () => {
      nowCallCount += 1;
      return 0;
    },
    fetchImpl: async () => {
      fetchCount += 1;
      throw errorWithCode("ECONNRESET", TypeError);
    },
    sleep: async () => {},
    random: () => 0,
  });
  await assert.rejects(context.get("/discover/tv", { page: 1 }), TypeError);
  const callsBeforeDiagnostics = nowCallCount;
  return { callsBeforeDiagnostics, diagnostics: context.diagnostics(), fetchCount };
}

test("transport observability preserves Product retry, fetch-count, and policy-clock behavior", async () => {
  const baseline = await runObservedTransportRetry();
  const session = createTmdbObservabilitySession();
  const observed = await runObservedTransportRetry({ observer: session });
  assert.equal(baseline.fetchCount, 3);
  assert.equal(observed.fetchCount, baseline.fetchCount);
  assert.equal(baseline.diagnostics.retryCount, 2);
  assert.equal(observed.diagnostics.retryCount, baseline.diagnostics.retryCount);
  assert.equal(observed.callsBeforeDiagnostics, baseline.callsBeforeDiagnostics);
  assert.equal(tmdbObservabilitySessionMetadata(session).eventCount, 6);
});

test("lifecycle receipt distinguishes pre-issue deferral from the exact physical issue boundary", async () => {
  let nowCalls = 0;
  let fetchCount = 0;
  const deferredContext = createTmdbRequestContext({
    now: () => nowCalls++ === 0 ? 0 : 101,
    recommendationDeadlineMs: 100,
    fetchImpl: async () => {
      fetchCount += 1;
      return response(200);
    },
  });
  const deferredReceipt = deferredContext.createLifecycleReceipt();
  await assert.rejects(
    deferredContext.get("/discover/movie", { page: 1 }, { lifecycleReceipt: deferredReceipt }),
    TmdbDeadlineError,
  );
  assert.deepEqual(deferredContext.readLifecycleReceipt(deferredReceipt), {
    accessMode: "none",
    providerParticipation: false,
    operationId: 0,
    issuedAttemptCount: 0,
    ownedIssuedAttemptCount: 0,
    accessTerminal: "resource-stop-pre-issue",
  });
  assert.equal(fetchCount, 0);

  let releaseFetch;
  const fetchGate = new Promise((resolve) => {
    releaseFetch = resolve;
  });
  let issuedContext;
  let issuedReceipt;
  issuedContext = createTmdbRequestContext({
    limits: { retries: 0 },
    fetchImpl: async () => {
      const issued = issuedContext.readLifecycleReceipt(issuedReceipt);
      assert.equal(issued.accessTerminal, "issued");
      assert.equal(issued.providerParticipation, true);
      assert.equal(issued.issuedAttemptCount, 1);
      await fetchGate;
      return response(200, { ok: true });
    },
  });
  issuedReceipt = issuedContext.createLifecycleReceipt();
  const pending = issuedContext.get(
    "/discover/tv",
    { page: 1 },
    { lifecycleReceipt: issuedReceipt },
  );
  await Promise.resolve();
  releaseFetch();
  await pending;
  assert.equal(issuedContext.readLifecycleReceipt(issuedReceipt).accessTerminal, "success");
});

test("lifecycle receipt preserves issued transport, HTTP, and decode terminals without observability", async () => {
  const cases = [
    {
      name: "sync transport",
      terminal: "transport-failure",
      fetchImpl() {
        throw new Error("sync transport failure");
      },
    },
    {
      name: "async transport",
      terminal: "transport-failure",
      fetchImpl: async () => Promise.reject(new Error("async transport failure")),
    },
    {
      name: "HTTP",
      terminal: "http-failure",
      fetchImpl: async () => response(503),
    },
    {
      name: "decode",
      terminal: "decode-failure",
      fetchImpl: async () => ({
        ...response(200),
        json: async () => Promise.reject(new SyntaxError("decode failure")),
      }),
    },
  ];

  for (const item of cases) {
    clearTmdbRequestCache();
    const context = createTmdbRequestContext({ fetchImpl: item.fetchImpl, limits: { retries: 0 } });
    const receipt = context.createLifecycleReceipt();
    await assert.rejects(
      context.get("/discover/movie", { case: item.name }, { lifecycleReceipt: receipt }),
    );
    const lifecycle = context.readLifecycleReceipt(receipt);
    assert.equal(lifecycle.providerParticipation, true, item.name);
    assert.equal(lifecycle.issuedAttemptCount, 1, item.name);
    assert.equal(lifecycle.ownedIssuedAttemptCount, 1, item.name);
    assert.equal(lifecycle.accessTerminal, item.terminal, item.name);
    assert.deepEqual(Object.keys(lifecycle).sort(), [
      "accessMode",
      "accessTerminal",
      "issuedAttemptCount",
      "operationId",
      "ownedIssuedAttemptCount",
      "providerParticipation",
    ]);
  }
});

test("retry resource termination retains the previously issued attempt lineage", async () => {
  let fetchCount = 0;
  const context = createTmdbRequestContext({
    fetchImpl: async () => {
      fetchCount += 1;
      return response(429, {}, { "retry-after": "30" });
    },
    recommendationDeadlineMs: 2_000,
    maximumRetryAfterMs: 5_000,
  });
  const receipt = context.createLifecycleReceipt();
  await assert.rejects(
    context.get("/discover/movie", { page: 1 }, { lifecycleReceipt: receipt }),
    TmdbDeadlineError,
  );
  assert.equal(fetchCount, 1);
  assert.deepEqual(context.readLifecycleReceipt(receipt), {
    accessMode: "fresh",
    providerParticipation: true,
    operationId: 1,
    issuedAttemptCount: 1,
    ownedIssuedAttemptCount: 1,
    accessTerminal: "resource-stop-post-issue",
  });
});

test("cache receipt records provider participation without a new physical issue", async () => {
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    return response(200, { results: [] });
  };
  const leader = createTmdbRequestContext({ fetchImpl });
  const firstReceipt = leader.createLifecycleReceipt();
  await leader.get("/discover/movie", { page: 1 }, { lifecycleReceipt: firstReceipt });

  const cached = createTmdbRequestContext({ fetchImpl });
  const cachedReceipt = cached.createLifecycleReceipt();
  assert.deepEqual(
    await cached.get("/discover/movie", { page: 1 }, { lifecycleReceipt: cachedReceipt }),
    { results: [] },
  );
  const lifecycle = cached.readLifecycleReceipt(cachedReceipt);
  assert.equal(fetchCount, 1);
  assert.equal(lifecycle.accessMode, "cache");
  assert.equal(lifecycle.providerParticipation, true);
  assert.equal(lifecycle.issuedAttemptCount, 0);
  assert.equal(lifecycle.ownedIssuedAttemptCount, 0);
  assert.equal(lifecycle.accessTerminal, "success");
});

test("dedup leader and joiner inherit success with one physical issue", async () => {
  let fetchCount = 0;
  let releaseFetch;
  const gate = new Promise((resolve) => {
    releaseFetch = resolve;
  });
  const context = createTmdbRequestContext({
    fetchImpl: async () => {
      fetchCount += 1;
      await gate;
      return response(200, { results: [] });
    },
  });
  const leaderReceipt = context.createLifecycleReceipt();
  const joinerReceipt = context.createLifecycleReceipt();
  const leader = context.get("/discover/tv", { page: 1 }, { lifecycleReceipt: leaderReceipt });
  const joiner = context.get("/discover/tv", { page: 1 }, { lifecycleReceipt: joinerReceipt });
  releaseFetch();
  await Promise.all([leader, joiner]);

  const leaderLifecycle = context.readLifecycleReceipt(leaderReceipt);
  const joinerLifecycle = context.readLifecycleReceipt(joinerReceipt);
  assert.equal(fetchCount, 1);
  assert.equal(leaderLifecycle.operationId, joinerLifecycle.operationId);
  assert.equal(leaderLifecycle.accessMode, "fresh");
  assert.equal(joinerLifecycle.accessMode, "in-flight");
  assert.equal(leaderLifecycle.ownedIssuedAttemptCount, 1);
  assert.equal(joinerLifecycle.ownedIssuedAttemptCount, 0);
  assert.equal(leaderLifecycle.accessTerminal, "success");
  assert.equal(joinerLifecycle.accessTerminal, "success");
  assert.equal(joinerLifecycle.providerParticipation, true);
});

test("dedup leader and joiner inherit failure with one physical issue", async () => {
  let fetchCount = 0;
  let rejectFetch;
  const gate = new Promise((resolve, reject) => {
    rejectFetch = reject;
  });
  const context = createTmdbRequestContext({
    fetchImpl: async () => {
      fetchCount += 1;
      return gate;
    },
    limits: { retries: 0 },
  });
  const leaderReceipt = context.createLifecycleReceipt();
  const joinerReceipt = context.createLifecycleReceipt();
  const results = Promise.allSettled([
    context.get("/discover/tv", { page: 1 }, { lifecycleReceipt: leaderReceipt }),
    context.get("/discover/tv", { page: 1 }, { lifecycleReceipt: joinerReceipt }),
  ]);
  rejectFetch(new Error("shared transport failure"));
  const [leader, joiner] = await results;

  assert.equal(leader.status, "rejected");
  assert.equal(joiner.status, "rejected");
  assert.equal(fetchCount, 1);
  const leaderLifecycle = context.readLifecycleReceipt(leaderReceipt);
  const joinerLifecycle = context.readLifecycleReceipt(joinerReceipt);
  assert.equal(leaderLifecycle.operationId, joinerLifecycle.operationId);
  assert.equal(leaderLifecycle.ownedIssuedAttemptCount, 1);
  assert.equal(joinerLifecycle.ownedIssuedAttemptCount, 0);
  assert.equal(leaderLifecycle.accessTerminal, "transport-failure");
  assert.equal(joinerLifecycle.accessTerminal, "transport-failure");
  assert.equal(joinerLifecycle.providerParticipation, true);
});

test("active-base request policy constants remain exact", () => {
  assert.deepEqual(TMDB_REQUEST_LIMITS, {
    total: 24,
    list: 8,
    detail: 16,
    concurrency: 4,
    retries: 2,
  });
  assert.deepEqual(TMDB_TIME_LIMITS, {
    fetchTimeoutMs: 8_000,
    recommendationDeadlineMs: 15_000,
    maximumRetryAfterMs: 5_000,
  });
});
