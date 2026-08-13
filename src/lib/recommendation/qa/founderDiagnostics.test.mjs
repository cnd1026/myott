import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  attachFounderDiagnostics,
  founderDiagnosticsSecretExposureCount,
  sanitizeFounderDiagnostics,
} from "./founderDiagnostics.js";
import {
  TMDB_OBSERVABILITY_ACCEPTED_WORST_CASE,
  TMDB_OBSERVABILITY_INTEGRITY_CODE,
  TMDB_OBSERVABILITY_LIMITS,
  TMDB_OBSERVABILITY_STAGES,
  TmdbObservabilityIntegrityError,
  createTmdbObservabilitySession,
  emitTmdbObservabilityEvent,
  finalizeTmdbObservabilitySession,
  tmdbObservabilitySessionMetadata,
  validateTmdbObservabilityEvidence,
} from "./tmdbObservability.js";

const optionsRouteUrl = new URL("../../../../app/api/recommend/options/route.js", import.meta.url);
let optionsRouteImportSequence = 0;

async function importOptionsRoute(stubs) {
  globalThis.__REC_QA_091_ACTIVE_ROUTE_STUBS__ = {
    ...stubs,
    sanitizeFounderDiagnostics,
    TMDB_OBSERVABILITY_INTEGRITY_CODE,
  };
  const source = (await readFile(optionsRouteUrl, "utf8"))
    .replace(
      'import { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } from "../../../../src/lib/providers/registry";',
      "const { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } = globalThis.__REC_QA_091_ACTIVE_ROUTE_STUBS__;",
    )
    .replace(
      'import { sanitizeFounderDiagnostics } from "../../../../src/lib/recommendation/qa/founderDiagnostics.js";',
      "const { sanitizeFounderDiagnostics } = globalThis.__REC_QA_091_ACTIVE_ROUTE_STUBS__;",
    )
    .replace(
      'import { TMDB_OBSERVABILITY_INTEGRITY_CODE } from "../../../../src/lib/recommendation/qa/tmdbObservability.js";',
      "const { TMDB_OBSERVABILITY_INTEGRITY_CODE } = globalThis.__REC_QA_091_ACTIVE_ROUTE_STUBS__;",
    );
  optionsRouteImportSequence += 1;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#active-route-${optionsRouteImportSequence}`);
}

async function withNodeEnvironment(nodeEnv, operation) {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  try {
    return await operation();
  } finally {
    delete globalThis.__REC_QA_091_ACTIVE_ROUTE_STUBS__;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
}

function routeRequest(query) {
  return { nextUrl: new URL(`http://local.test/api/recommend/options?${query}`) };
}

function validLineageFields(overrides = {}) {
  return {
    candidateId: "tmdb:tv:10",
    arrivalStage: "exact-popularity-page-1",
    preDetailSemantic: "pass",
    preDetailCountry: "pass",
    preDetailContentType: "pass",
    detailState: "selected-enriched",
    postDetailSemantic: "pass",
    postDetailCountry: "pass",
    postDetailContentType: "pass",
    hardFilterDecision: "pass",
    rankingInputOrdinal: 1,
    dedupeDecision: "kept",
    resultTier: "exact",
    finalPath: "primary",
    finalDecision: "selected",
    reason: "selected",
    rank: 1,
    ...overrides,
  };
}

function emitValidLedger(session, { skipLineage = false, duplicateLineage = false, decisionOverride = {} } = {}) {
  emitTmdbObservabilityEvent(session, "request-start", {
    requestId: "request-1",
    requestKind: "list",
    endpointClass: "discover-tv",
    retryIndex: 0,
  });
  emitTmdbObservabilityEvent(session, "request-complete", {
    requestId: "request-1",
    requestKind: "list",
    endpointClass: "discover-tv",
    retryIndex: 0,
    statusClass: "success",
  });
  emitTmdbObservabilityEvent(session, "candidate-pool-summary", {
    recallStageCount: 1,
    sourceResultCount: 1,
    normalizationCount: 1,
    arrivalCount: 1,
    stageCapExcludedCount: 0,
    distinctCount: 1,
    duplicateCount: 0,
    boundedCount: 1,
    poolExcludedCount: 0,
  });
  for (const stage of TMDB_OBSERVABILITY_STAGES) {
    emitTmdbObservabilityEvent(session, "stage-summary", {
      stage,
      inputCount: 1,
      outputCount: 1,
      excludedCount: 0,
    });
  }
  if (!skipLineage) emitTmdbObservabilityEvent(session, "candidate-lineage", validLineageFields());
  if (duplicateLineage) emitTmdbObservabilityEvent(session, "candidate-lineage", validLineageFields());
  emitTmdbObservabilityEvent(session, "candidate-decision", {
    candidateId: "tmdb:tv:10",
    stage: "final-selection",
    decision: "selected",
    reason: "selected",
    rank: 1,
    ...decisionOverride,
  });
  emitTmdbObservabilityEvent(session, "run-summary", {
    requestBudget: 24,
    listRequestBudget: 8,
    detailRequestBudget: 16,
    concurrencyLimit: 4,
    retryLimit: 2,
    fetchTimeoutMs: 8_000,
    recommendationDeadlineMs: 15_000,
    requestsUsed: 1,
    listRequestsUsed: 1,
    detailRequestsUsed: 0,
    cacheHits: 0,
    retryCount: 0,
    deadlineExceeded: false,
  });
}

function emitMaximumAcceptedLedger(session, { extraCacheHit = false, transportFailures = false } = {}) {
  for (let request = 1; request <= 24; request += 1) {
    const requestKind = request <= 8 ? "list" : "detail";
    const endpointClass = requestKind === "list" ? "discover-tv" : "tv-detail";
    emitTmdbObservabilityEvent(session, "request-start", {
      requestId: `request-${request}`,
      requestKind,
      endpointClass,
      retryIndex: 0,
    });
    if (transportFailures) {
      emitTmdbObservabilityEvent(session, "request-failed", {
        requestId: `request-${request}`,
        requestKind,
        endpointClass,
        retryIndex: 0,
        statusClass: "transport-error",
        responseReached: false,
        transportFailureCategory: "other-transport-error",
      });
    } else {
      emitTmdbObservabilityEvent(session, "request-complete", {
        requestId: `request-${request}`,
        requestKind,
        endpointClass,
        retryIndex: 0,
        statusClass: "success",
      });
    }
  }
  for (let hit = 25; hit <= 63 + Number(extraCacheHit); hit += 1) {
    emitTmdbObservabilityEvent(session, "request-cache-hit", {
      requestId: `request-${hit}`,
      requestKind: "detail",
      endpointClass: "tv-detail",
    });
  }
  emitTmdbObservabilityEvent(session, "candidate-pool-summary", {
    recallStageCount: 5,
    sourceResultCount: 72,
    normalizationCount: 72,
    arrivalCount: 72,
    stageCapExcludedCount: 0,
    distinctCount: 72,
    duplicateCount: 0,
    boundedCount: 72,
    poolExcludedCount: 0,
  });
  for (const stage of TMDB_OBSERVABILITY_STAGES) {
    emitTmdbObservabilityEvent(session, "stage-summary", {
      stage,
      inputCount: 72,
      outputCount: 72,
      excludedCount: 0,
    });
  }
  for (let candidate = 1; candidate <= 72; candidate += 1) {
    const finalPath = candidate <= 12 ? "primary" : candidate <= 24 ? "relaxed" : "none";
    const finalDecision = finalPath === "none" ? "not-selected" : "selected";
    const resultTier = finalPath === "relaxed" ? "country-relaxed" : "exact";
    emitTmdbObservabilityEvent(session, "candidate-lineage", {
      candidateId: `tmdb:tv:${candidate}`,
      arrivalStage: "exact-popularity-page-1",
      preDetailSemantic: "pass",
      preDetailCountry: "pass",
      preDetailContentType: "pass",
      detailState: candidate <= 16 ? "selected-enriched" : "not-selected",
      postDetailSemantic: "pass",
      postDetailCountry: "pass",
      postDetailContentType: "pass",
      hardFilterDecision: "pass",
      rankingInputOrdinal: candidate,
      dedupeDecision: "kept",
      resultTier,
      finalPath,
      finalDecision,
      reason: finalDecision === "selected" ? "selected" : "primary-limit-not-selected",
      rank: finalPath === "primary" ? candidate : finalPath === "relaxed" ? candidate - 12 : null,
    });
  }
  for (let candidate = 1; candidate <= 72; candidate += 1) {
    const selected = candidate <= 24;
    emitTmdbObservabilityEvent(session, "candidate-decision", {
      candidateId: `tmdb:tv:${candidate}`,
      stage: "final-selection",
      decision: selected ? "selected" : "excluded",
      reason: selected ? "selected" : "primary-limit-not-selected",
      rank: candidate <= 12 ? candidate : candidate <= 24 ? candidate - 12 : null,
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
    requestsUsed: 24,
    listRequestsUsed: 8,
    detailRequestsUsed: 16,
    cacheHits: 39 + Number(extraCacheHit),
    retryCount: 0,
    deadlineExceeded: false,
  });
}

test("Founder diagnostics redact credential-like fields", () => {
  const sanitized = sanitizeFounderDiagnostics({
    provider: "tmdb",
    authorization: "Bearer do-not-display",
    nested: { apiKey: "do-not-display" },
  });
  assert.equal(sanitized.authorization, "[redacted]");
  assert.equal(sanitized.nested.apiKey, "[redacted]");
  assert.equal(founderDiagnosticsSecretExposureCount(sanitized), 0);
});

test("candidate diagnostics attach by provider media type and content id", () => {
  const [result] = attachFounderDiagnostics(
    [{ mediaType: "tv", tmdbId: 10, title: "A" }],
    { candidates: [{ providerMediaType: "tv", tmdbId: 10, genreMatchMode: "semantic-specialized" }] },
  );
  assert.equal(result.qaDiagnostics.genreMatchMode, "semantic-specialized");
});

test("active-base observability session is opaque and finalization is deterministic", () => {
  const session = createTmdbObservabilitySession();
  assert.deepEqual(JSON.parse(JSON.stringify(session)), {});
  assert.match(tmdbObservabilitySessionMetadata(session).sessionId, /^tmdb-qa-/);
  assert.throws(
    () => createTmdbObservabilitySession({ runId: "caller-controlled" }),
    (error) => error instanceof TmdbObservabilityIntegrityError && error.stage === "session-creation",
  );

  emitValidLedger(session);
  const first = finalizeTmdbObservabilitySession(session);
  const second = finalizeTmdbObservabilitySession(session);
  assert.strictEqual(first, second);
  assert.deepEqual(validateTmdbObservabilityEvidence(first), first);
  assert.equal(first.schemaVersion, "myott.current-product-observability.v3");
  assert.equal(first.summary.requestAttemptCount, 1);
  assert.equal(first.summary.requestCompleteCount, 1);
  assert.equal(first.summary.stageCount, TMDB_OBSERVABILITY_STAGES.length);
  assert.equal(first.summary.candidatePoolSummaryCount, 1);
  assert.equal(first.summary.candidateLineageCount, 1);
  assert.equal(Object.isFrozen(first), true);
});

test("observability rejects unknown fields, elapsedMs, secrets, URLs, queries, and local paths", () => {
  const unknownFields = [
    { field: "elapsedMs", value: 1 },
    { field: "authorization", value: "configured" },
  ];
  for (const unsafe of unknownFields) {
    const session = createTmdbObservabilitySession();
    const fields = {
      stage: "retrieval",
      inputCount: 1,
      outputCount: 1,
      excludedCount: 0,
      [unsafe.field]: unsafe.value,
    };
    assert.throws(
      () => emitTmdbObservabilityEvent(session, "stage-summary", fields),
      (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "event-emission",
    );
  }
  for (const unsafeReason of [
    "Bearer do-not-display",
    "https://api.themoviedb.org/3/tv/10?api_key=secret",
    "C:\\Users\\private\\artifact",
  ]) {
    const session = createTmdbObservabilitySession();
    assert.throws(
      () => emitTmdbObservabilityEvent(session, "candidate-decision", {
        candidateId: "tmdb:tv:10",
        stage: "final-selection",
        decision: "excluded",
        reason: unsafeReason,
        rank: null,
      }),
      (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "event-emission",
    );
  }
});

test("observability enforces the 512-event and 2 MiB ceilings", () => {
  const session = createTmdbObservabilitySession();
  for (let index = 1; index <= TMDB_OBSERVABILITY_LIMITS.maximumEventCount; index += 1) {
    emitTmdbObservabilityEvent(session, "request-cache-hit", {
      requestId: `request-${index}`,
      requestKind: "detail",
      endpointClass: "tv-detail",
    });
  }
  assert.equal(tmdbObservabilitySessionMetadata(session).eventCount, 512);
  assert.throws(
    () => emitTmdbObservabilityEvent(session, "request-cache-hit", {
      requestId: "request-513",
      requestKind: "detail",
      endpointClass: "tv-detail",
    }),
    (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE,
  );

  const oversized = `{"padding":"${"a".repeat(TMDB_OBSERVABILITY_LIMITS.maximumPayloadBytes)}"}`;
  assert.throws(
    () => validateTmdbObservabilityEvidence(oversized),
    (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "payload-validation",
  );
  const circular = {};
  circular.self = circular;
  assert.throws(
    () => validateTmdbObservabilityEvidence(circular),
    (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "payload-validation",
  );

  const maximumAcceptedSession = createTmdbObservabilitySession();
  emitMaximumAcceptedLedger(maximumAcceptedSession, { transportFailures: true });
  const maximumAccepted = finalizeTmdbObservabilitySession(maximumAcceptedSession);
  const serializedBytes = new TextEncoder().encode(JSON.stringify(maximumAccepted)).byteLength;
  assert.equal(maximumAccepted.summary.eventCount, TMDB_OBSERVABILITY_ACCEPTED_WORST_CASE.eventCount);
  assert.equal(maximumAccepted.summary.requestFailureCount, 24);
  assert.equal(TMDB_OBSERVABILITY_ACCEPTED_WORST_CASE.eventCount, 240);
  assert.equal(TMDB_OBSERVABILITY_ACCEPTED_WORST_CASE.payloadBytes, 75_415);
  const maximumAdditiveFragment = new TextEncoder().encode(
    ',"responseReached":false,"transportFailureCategory":"other-transport-error"',
  ).byteLength;
  assert.equal(maximumAdditiveFragment, 75);
  assert.equal(73_615 + maximumAdditiveFragment * 24, 75_415);
  assert.ok(serializedBytes <= TMDB_OBSERVABILITY_ACCEPTED_WORST_CASE.payloadBytes);
  assert.ok(serializedBytes <= TMDB_OBSERVABILITY_LIMITS.maximumPayloadBytes);

  const overAcceptedSession = createTmdbObservabilitySession();
  emitMaximumAcceptedLedger(overAcceptedSession, { extraCacheHit: true });
  assert.throws(
    () => finalizeTmdbObservabilitySession(overAcceptedSession),
    (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "payload-validation",
  );
});

test("v3 request-failed schema conditionally requires exactly the bounded transport fields", () => {
  const validSession = createTmdbObservabilitySession();
  emitTmdbObservabilityEvent(validSession, "request-start", {
    requestId: "request-1",
    requestKind: "list",
    endpointClass: "discover-tv",
    retryIndex: 0,
  });
  emitTmdbObservabilityEvent(validSession, "request-failed", {
    requestId: "request-1",
    requestKind: "list",
    endpointClass: "discover-tv",
    retryIndex: 0,
    statusClass: "transport-error",
    responseReached: false,
    transportFailureCategory: "dns-resolution",
  });

  const invalidFields = [
    {},
    { responseReached: false },
    { transportFailureCategory: "dns-resolution" },
    { responseReached: "false", transportFailureCategory: "dns-resolution" },
    { responseReached: false, transportFailureCategory: "caller-defined" },
  ];
  for (const addition of invalidFields) {
    const session = createTmdbObservabilitySession();
    assert.throws(
      () => emitTmdbObservabilityEvent(session, "request-failed", {
        requestId: "request-1",
        requestKind: "list",
        endpointClass: "discover-tv",
        retryIndex: 0,
        statusClass: "transport-error",
        ...addition,
      }),
      (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "event-emission",
    );
  }

  for (const statusClass of [
    "fetch-timeout",
    "deadline-exceeded",
    "retryable-http-error",
    "http-error",
    "payload-error",
  ]) {
    const session = createTmdbObservabilitySession();
    assert.throws(
      () => emitTmdbObservabilityEvent(session, "request-failed", {
        requestId: "request-1",
        requestKind: "list",
        endpointClass: "discover-tv",
        retryIndex: 0,
        statusClass,
        responseReached: false,
        transportFailureCategory: "other-transport-error",
      }),
      (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "event-emission",
    );
  }
});

test("responseReached is the only exact response-sensitive field exception", () => {
  for (const field of ["response", "responseBody", "responseText", "responseUrl", "responseReachedExtra"]) {
    const session = createTmdbObservabilitySession();
    assert.throws(
      () => emitTmdbObservabilityEvent(session, "request-failed", {
        requestId: "request-1",
        requestKind: "list",
        endpointClass: "discover-tv",
        retryIndex: 0,
        statusClass: "transport-error",
        responseReached: false,
        transportFailureCategory: "other-transport-error",
        [field]: false,
      }),
      (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "event-emission",
    );
  }
});

test("v3 validator does not silently accept pinned historical v2 evidence", () => {
  const session = createTmdbObservabilitySession();
  emitValidLedger(session);
  const evidence = finalizeTmdbObservabilitySession(session);
  const historicalVersion = { ...evidence, schemaVersion: "myott.current-product-observability.v2" };
  assert.throws(
    () => validateTmdbObservabilityEvidence(historicalVersion),
    (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "payload-validation",
  );
});

test("v3 lineage rejects unsafe identity, unknown enum, broken conservation, missing lineage, and final mismatch", () => {
  for (const fields of [
    validLineageFields({ candidateId: "tmdb:tv:01" }),
    validLineageFields({ candidateId: "tmdb:movie:9007199254740992" }),
    validLineageFields({ detailState: "caller-invented-state" }),
  ]) {
    const session = createTmdbObservabilitySession();
    assert.throws(
      () => emitTmdbObservabilityEvent(session, "candidate-lineage", fields),
      (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "event-emission",
    );
  }

  const brokenPool = createTmdbObservabilitySession();
  assert.throws(
    () => emitTmdbObservabilityEvent(brokenPool, "candidate-pool-summary", {
      recallStageCount: 1,
      sourceResultCount: 2,
      normalizationCount: 2,
      arrivalCount: 1,
      stageCapExcludedCount: 0,
      distinctCount: 1,
      duplicateCount: 0,
      boundedCount: 1,
      poolExcludedCount: 0,
    }),
    (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "event-emission",
  );

  for (const options of [
    { skipLineage: true },
    { duplicateLineage: true },
    {
      decisionOverride: {
        decision: "excluded",
        reason: "primary-limit-not-selected",
        rank: null,
      },
    },
  ]) {
    const session = createTmdbObservabilitySession();
    emitValidLedger(session, options);
    assert.throws(
      () => finalizeTmdbObservabilitySession(session),
      (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "payload-validation",
    );
  }
});

test("ledger validation rejects an open request and never accepts self-declared summaries", () => {
  const session = createTmdbObservabilitySession();
  emitTmdbObservabilityEvent(session, "request-start", {
    requestId: "request-1",
    requestKind: "detail",
    endpointClass: "tv-detail",
    retryIndex: 0,
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
    requestsUsed: 1,
    listRequestsUsed: 0,
    detailRequestsUsed: 1,
    cacheHits: 0,
    retryCount: 0,
    deadlineExceeded: false,
  });
  assert.throws(
    () => finalizeTmdbObservabilitySession(session),
    (error) => error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE && error?.stage === "payload-validation",
  );
});

test("options route exposes additive QA diagnostics only for non-production qa=1", async () => {
  await withNodeEnvironment("test", async () => {
    let receivedOptions;
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations(options) {
        receivedOptions = options;
        return {
          results: [],
          relaxedResults: [],
          diagnostics: {
            existingRecommendationDiagnostic: "preserved",
            currentProductObservability: { schemaVersion: "safe-ledger" },
          },
        };
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider: () => activeProvider,
      getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
      isTmdbProviderEnabled: () => true,
    });
    const response = await GET(routeRequest("types=drama&qa=1&requestId=caller-visible-id"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(receivedOptions.qaDiagnostics, true);
    assert.deepEqual(body.recommendationDebug, { existingRecommendationDiagnostic: "preserved" });
    assert.deepEqual(body.currentProductObservability, { schemaVersion: "safe-ledger" });
  });

  await withNodeEnvironment("production", async () => {
    let receivedOptions;
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations(options) {
        receivedOptions = options;
        return { results: [], diagnostics: { currentProductObservability: { unsafe: true } } };
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider: () => activeProvider,
      getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
      isTmdbProviderEnabled: () => true,
    });
    const body = await (await GET(routeRequest("types=drama&qa=1"))).json();
    assert.equal(receivedOptions.qaDiagnostics, false);
    assert.equal(Object.hasOwn(body, "recommendationDebug"), false);
    assert.equal(Object.hasOwn(body, "currentProductObservability"), false);
  });
});

test("options route returns a safe integrity 500 without invoking fallback", async () => {
  await withNodeEnvironment("test", async () => {
    let fallbackCalls = 0;
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations() {
        throw new TmdbObservabilityIntegrityError("event-emission");
      },
    };
    const fallbackProvider = {
      id: "mock",
      name: "Mock Provider",
      async getRecommendations() {
        fallbackCalls += 1;
        return { results: [{ id: "must-not-appear" }] };
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider: () => activeProvider,
      getFallbackProvider: () => fallbackProvider,
      isTmdbProviderEnabled: () => true,
    });
    const response = await GET(routeRequest("types=drama&qa=1&requestId=safe-request"));
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      source: "tmdb",
      dataSource: "qa-observability-error",
      requestId: "safe-request",
      error: { code: TMDB_OBSERVABILITY_INTEGRITY_CODE, stage: "event-emission" },
    });
    assert.equal(fallbackCalls, 0);
    assert.equal(Object.hasOwn(body, "results"), false);
    assert.equal(Object.hasOwn(body, "relaxedResults"), false);
    assert.equal(JSON.stringify(body).includes("integrity validation failed"), false);
  });
});

test("options route preserves ordinary QA-off Product fallback", async () => {
  await withNodeEnvironment("test", async () => {
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations() {
        throw new Error("ordinary Product failure");
      },
    };
    const fallbackProvider = {
      id: "mock",
      name: "Mock Provider",
      async getRecommendations() {
        return { results: [{ id: "mock-result" }], relaxedResults: [] };
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider: () => activeProvider,
      getFallbackProvider: () => fallbackProvider,
      isTmdbProviderEnabled: () => true,
    });
    const body = await (await GET(routeRequest("types=drama&requestId=safe-request"))).json();
    assert.equal(body.fallbackUsed, true);
    assert.equal(body.results[0].id, "mock-result");
    assert.equal(Object.hasOwn(body, "recommendationDebug"), false);
    assert.equal(Object.hasOwn(body, "currentProductObservability"), false);
  });
});

test("active-base observability source has no persistence, transport, or live capability", async () => {
  const source = await readFile(new URL("./tmdbObservability.js", import.meta.url), "utf8");
  assert.equal(/node:fs|writeFile|appendFile|rename|copyFile|createWriteStream/.test(source), false);
  assert.equal(/\bfetch\s*\(|https?\.request|net\.connect|tls\.connect/.test(source), false);
  assert.equal(/TMDB_API_KEY|TMDB_BEARER_TOKEN/.test(source), false);
});
