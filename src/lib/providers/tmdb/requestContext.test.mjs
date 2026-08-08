import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  TmdbBudgetError,
  TmdbDeadlineError,
  TmdbFetchTimeoutError,
  clearTmdbRequestCache,
  createTmdbRequestContext,
} from "./requestContext.js";
import {
  createTmdbObservabilitySession,
  finalizeTmdbObservabilitySession,
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

beforeEach(() => clearTmdbRequestCache());

function observedEvents(session) {
  return JSON.parse(finalizeTmdbObservabilitySession(session)).events;
}

test("observer disabled emits no event", async () => {
  const session = createTmdbObservabilitySession();
  const context = createTmdbRequestContext({
    fetchImpl: async () => response(200, { ok: true }),
  });
  await context.get("/movie/1", {}, { kind: "detail" });
  assert.deepEqual(observedEvents(session), []);
});

test("observer emits safe cache-hit and network-success request results", async () => {
  const networkSession = createTmdbObservabilitySession();
  const first = createTmdbRequestContext({
    observer: networkSession,
    fetchImpl: async () => response(200, { id: 10 }),
  });
  await first.get("/movie/10", {}, { kind: "detail" });
  const [networkEvent] = observedEvents(networkSession);
  assert.equal(networkEvent.endpointPath, "/movie/10");
  assert.equal(networkEvent.httpStatus, 200);
  assert.equal(networkEvent.requestSource, "network");
  assert.equal(networkEvent.terminalResult, "success");
  assert.equal(networkEvent.retryCount, 0);
  assert.ok(networkEvent.elapsedMs >= 0);

  const cacheSession = createTmdbObservabilitySession();
  const second = createTmdbRequestContext({
    observer: cacheSession,
    fetchImpl: async () => {
      throw new Error("cache hit must not reach network");
    },
  });
  await second.get("/movie/10", {}, { kind: "detail" });
  assert.equal(observedEvents(cacheSession)[0].requestSource, "cache");
  assert.equal(observedEvents(cacheSession)[0].terminalResult, "cache-hit");
});

test("observer records safe 404, 429, and 5xx results without unsafe error serialization", async () => {
  const notFoundSession = createTmdbObservabilitySession();
  const notFound = createTmdbRequestContext({
    observer: notFoundSession,
    fetchImpl: async () => response(404),
  });
  await assert.rejects(notFound.get("/movie/404", {}, { kind: "detail" }));
  assert.deepEqual(
    observedEvents(notFoundSession).map(({ httpStatus, terminalResult, retryCount }) => ({
      httpStatus,
      terminalResult,
      retryCount,
    })),
    [{ httpStatus: 404, terminalResult: "http-error", retryCount: 0 }],
  );

  for (const status of [429, 503]) {
    clearTmdbRequestCache();
    let calls = 0;
    const session = createTmdbObservabilitySession();
    const context = createTmdbRequestContext({
      observer: session,
      fetchImpl: async () => (++calls === 1 ? response(status) : response(200, { ok: true })),
      sleep: async () => {},
      random: () => 0,
    });
    await context.get(`/movie/${status}`, {}, { kind: "detail" });
    assert.deepEqual(
      observedEvents(session).map(({ httpStatus, terminalResult, retryCount }) => ({
        httpStatus,
        terminalResult,
        retryCount,
      })),
      [
        { httpStatus: status, terminalResult: "retryable-http-error", retryCount: 0 },
        { httpStatus: 200, terminalResult: "success", retryCount: 1 },
      ],
    );
  }
});

test("diagnostic retry 0 emits one terminal 5xx result", async () => {
  let fetchCount = 0;
  const session = createTmdbObservabilitySession();
  const context = createTmdbRequestContext({
    observer: session,
    diagnosticLimits: { total: 4, list: 4, detail: 4, concurrency: 1 },
    diagnosticRetry: 0,
    fetchImpl: async () => {
      fetchCount += 1;
      return response(503);
    },
  });
  await assert.rejects(context.get("/movie/503", {}, { kind: "detail" }));
  assert.equal(fetchCount, 1);
  assert.equal(context.diagnostics().retryCount, 0);
  assert.equal(observedEvents(session).length, 1);
});

test("observer output excludes full URL, query, headers, and credentials", async () => {
  const session = createTmdbObservabilitySession();
  const context = createTmdbRequestContext({
    apiKey: "diagnostic-secret-key",
    bearer: "diagnostic-secret-bearer",
    observer: session,
    fetchImpl: async () => response(200, { ok: true }),
  });
  await context.get("/discover/movie", { page: 1 });
  const serialized = finalizeTmdbObservabilitySession(session);
  assert.equal(serialized.includes("https://"), false);
  assert.equal(serialized.includes("?"), false);
  assert.equal(serialized.includes("Authorization"), false);
  assert.equal(serialized.includes("api_key"), false);
  assert.equal(serialized.includes("diagnostic-secret"), false);
});

test("invalid observer session fails before cache or network", async () => {
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    return response(200, { id: 77 });
  };
  const warm = createTmdbRequestContext({ fetchImpl });
  await warm.get("/movie/77", {}, { kind: "detail" });
  assert.equal(fetchCount, 1);
  const finalizedSession = createTmdbObservabilitySession();
  const finalizedContext = createTmdbRequestContext({
    observer: finalizedSession,
    fetchImpl,
  });
  finalizeTmdbObservabilitySession(finalizedSession);
  await assert.rejects(
    finalizedContext.get("/movie/77", {}, { kind: "detail" }),
    /finalized TMDB observability session/,
  );
  assert.equal(finalizedContext.diagnostics().cacheHits, 0);
  assert.throws(
    () => createTmdbRequestContext({ observer: {}, fetchImpl }),
    /valid opaque/,
  );
  assert.throws(
    () => createTmdbRequestContext({
      diagnosticLimits: { total: 1, detail: 1 },
      diagnosticRetry: 0,
      fetchImpl,
    }),
    /requires an opaque observability session/,
  );
  assert.equal(fetchCount, 1);
});

test("observer request-result event ordering is deterministic", async () => {
  const session = createTmdbObservabilitySession();
  const context = createTmdbRequestContext({
    observer: session,
    fetchImpl: async (rawUrl) => {
      if (new URL(rawUrl).pathname.endsWith("/movie/1")) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return response(200, { ok: true });
    },
  });
  await Promise.all([
    context.get("/movie/1", {}, { kind: "detail" }),
    context.get("/movie/2", {}, { kind: "detail" }),
  ]);
  assert.deepEqual(
    observedEvents(session).map((event) => [event.sequence, event.endpointPath]),
    [[0, "/movie/1"], [1, "/movie/2"]],
  );
});

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

test("individual fetch timeout aborts a stalled request", async () => {
  const context = createTmdbRequestContext({
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
  assert.equal(context.diagnostics().requestsUsed, 1);
  assert.equal(context.diagnostics().deadlineExceeded, false);
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
