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
import {
  ROUTE_FAILURE_HANDLER_PHASES,
  createRouteFailureObserver,
} from "./routeFailureObservability.js";

const optionsRouteUrl = new URL("../../../../app/api/recommend/options/route.js", import.meta.url);
let optionsRouteImportSequence = 0;

async function importOptionsRoute(stubs) {
  globalThis.__REC_QA_091_ACTIVE_ROUTE_STUBS__ = {
    ...stubs,
    sanitizeFounderDiagnostics,
    TMDB_OBSERVABILITY_INTEGRITY_CODE,
    createRouteFailureObserver: stubs.createRouteFailureObserver || createRouteFailureObserver,
    routeResponse: stubs.routeResponse || globalThis.Response,
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
      'import { createRouteFailureObserver } from "../../../../src/lib/recommendation/qa/routeFailureObservability.js";',
      "const { createRouteFailureObserver, routeResponse: Response } = globalThis.__REC_QA_091_ACTIVE_ROUTE_STUBS__;",
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

const routeFailurePhasePaths = Object.freeze({
  "qa-activated": Object.freeze(["qa-activated"]),
  "request-parsing-complete": Object.freeze(["qa-activated", "request-parsing-complete"]),
  "route-ready": Object.freeze(["qa-activated", "request-parsing-complete", "route-ready"]),
  "active-provider-entered": Object.freeze(["qa-activated", "request-parsing-complete", "route-ready", "active-provider-entered"]),
  "active-response-started": Object.freeze(["qa-activated", "request-parsing-complete", "route-ready", "active-provider-entered", "active-response-started"]),
  "active-failure-caught": Object.freeze(["qa-activated", "request-parsing-complete", "route-ready", "active-provider-entered", "active-failure-caught"]),
  "fallback-entered": Object.freeze(["qa-activated", "request-parsing-complete", "route-ready", "active-provider-entered", "active-failure-caught", "fallback-entered"]),
  "fallback-response-started": Object.freeze(["qa-activated", "request-parsing-complete", "route-ready", "active-provider-entered", "active-failure-caught", "fallback-entered", "fallback-response-started"]),
});

const routeFailurePayloadBytes = Object.freeze({
  "qa-activated": 127,
  "request-parsing-complete": 139,
  "route-ready": 126,
  "active-provider-entered": 138,
  "active-response-started": 138,
  "active-failure-caught": 136,
  "fallback-entered": 131,
  "fallback-response-started": 140,
});

function createRecordingRouteObserverFactory(log) {
  return () => {
    const observer = createRouteFailureObserver();
    return Object.freeze({
      transition(phase) {
        log.push(`phase:${phase}`);
        return observer.transition(phase);
      },
      terminalResponse() {
        return observer.terminalResponse();
      },
    });
  };
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

test("route failure observer exposes the exact closed phases and transition graph", async () => {
  assert.deepEqual(ROUTE_FAILURE_HANDLER_PHASES, [
    "qa-activated",
    "request-parsing-complete",
    "route-ready",
    "active-provider-entered",
    "active-response-started",
    "active-failure-caught",
    "fallback-entered",
    "fallback-response-started",
  ]);
  assert.equal(new Set(ROUTE_FAILURE_HANDLER_PHASES).size, 8);

  for (const phase of ROUTE_FAILURE_HANDLER_PHASES) {
    const observer = createRouteFailureObserver();
    for (const transition of routeFailurePhasePaths[phase]) {
      assert.equal(observer.transition(transition), true, `${phase}: ${transition}`);
    }
    assert.equal((await observer.terminalResponse().json()).handlerPhase, phase);
  }

  const responseFailurePath = createRouteFailureObserver();
  for (const transition of [
    "qa-activated",
    "request-parsing-complete",
    "route-ready",
    "active-provider-entered",
    "active-response-started",
    "active-failure-caught",
    "fallback-entered",
    "fallback-response-started",
  ]) {
    assert.equal(responseFailurePath.transition(transition), true, transition);
  }
});

test("route failure observer permanently rejects invalid, backward, and unknown transitions", () => {
  const uninitialized = createRouteFailureObserver();
  assert.equal(uninitialized.terminalResponse(), null);
  assert.equal(uninitialized.transition("route-ready"), false);
  assert.equal(uninitialized.transition("qa-activated"), false);
  assert.equal(uninitialized.terminalResponse(), null);

  const repeated = createRouteFailureObserver();
  assert.equal(repeated.transition("qa-activated"), true);
  assert.equal(repeated.transition("qa-activated"), false);
  assert.equal(repeated.transition("request-parsing-complete"), false);
  assert.equal(repeated.terminalResponse(), null);

  const backward = createRouteFailureObserver();
  assert.equal(backward.transition("qa-activated"), true);
  assert.equal(backward.transition("request-parsing-complete"), true);
  assert.equal(backward.transition("route-ready"), true);
  assert.equal(backward.transition("qa-activated"), false);
  assert.equal(backward.transition("active-provider-entered"), false);
  assert.equal(backward.terminalResponse(), null);

  for (const phase of ["unknown-phase", "RETURN", "fallback-entered"]) {
    const observer = createRouteFailureObserver();
    assert.equal(observer.transition("qa-activated"), true);
    assert.equal(observer.transition(phase), false);
    assert.equal(observer.terminalResponse(), null);
  }
});

test("route failure terminal responses are exact, bounded, and contain no prohibited data", async () => {
  const prohibited = [
    "requestId",
    "error.message",
    "stack",
    "cause",
    "Authorization",
    "Bearer",
    "hostname",
    "query",
    "headers",
    "cookies",
    "NODE_OPTIONS",
    "execArgv",
    "workingDirectory",
  ];
  let maximum = 0;

  for (const phase of ROUTE_FAILURE_HANDLER_PHASES) {
    const observer = createRouteFailureObserver();
    for (const transition of routeFailurePhasePaths[phase]) observer.transition(transition);
    const response = observer.terminalResponse();
    const body = await response.text();
    const parsed = JSON.parse(body);
    const expectedBody = `{"schemaVersion":"myott.route-failure-observability.v2","classification":"route-handler-failure","handlerPhase":"${phase}"}`;
    const byteSize = Buffer.byteLength(body, "utf8");

    assert.equal(response.status, 500);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(body, expectedBody);
    assert.equal(byteSize, routeFailurePayloadBytes[phase]);
    assert.equal(body.charCodeAt(0) === 0xfeff, false);
    assert.equal(body.endsWith("\n") || body.endsWith("\r"), false);
    assert.deepEqual(Object.keys(parsed), ["schemaVersion", "classification", "handlerPhase"]);
    assert.deepEqual(parsed, {
      schemaVersion: "myott.route-failure-observability.v2",
      classification: "route-handler-failure",
      handlerPhase: phase,
    });
    for (const token of prohibited) assert.equal(body.includes(token), false, `${phase}: ${token}`);
    maximum = Math.max(maximum, byteSize);
  }

  assert.equal(maximum, 140);
});

test("route failure helper has no sink, transport, runtime, or provider-v3 authority", async () => {
  const source = await readFile(new URL("./routeFailureObservability.js", import.meta.url), "utf8");
  assert.equal(/node:fs|writeFile|appendFile|rename|copyFile|createWriteStream|console\./.test(source), false);
  assert.equal(/\bfetch\s*\(|https?\.request|net\.connect|tls\.connect/.test(source), false);
  assert.equal(/process\.|globalThis|TMDB_API_KEY|TMDB_BEARER_TOKEN/.test(source), false);
  assert.equal(/responseReached|transportFailureCategory|Candidate-Lineage|requestId/.test(source), false);
  assert.equal(/JSON\.stringify/.test(source), false);
});

test("options route activates observability only for the exact non-production qa=1 gate", async () => {
  const scenarios = [
    { nodeEnv: "test", qa: "1", expectedCreations: 1 },
    { nodeEnv: "test", qa: null, expectedCreations: 0 },
    { nodeEnv: "test", qa: "0", expectedCreations: 0 },
    { nodeEnv: "test", qa: "01", expectedCreations: 0 },
    { nodeEnv: "test", qa: "true", expectedCreations: 0 },
    { nodeEnv: "production", qa: "1", expectedCreations: 0 },
  ];

  for (const scenario of scenarios) {
    await withNodeEnvironment(scenario.nodeEnv, async () => {
      let observerCreations = 0;
      const activeProvider = {
        id: "tmdb",
        name: "TMDB Provider",
        async getRecommendations() {
          return { results: [{ id: "product-result" }], relaxedResults: [] };
        },
      };
      const { GET } = await importOptionsRoute({
        getActiveProvider: () => activeProvider,
        getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
        isTmdbProviderEnabled: () => true,
        createRouteFailureObserver() {
          observerCreations += 1;
          return createRouteFailureObserver();
        },
      });
      const query = `types=drama${scenario.qa === null ? "" : `&qa=${scenario.qa}`}`;
      const body = await (await GET(routeRequest(query))).json();

      assert.equal(observerCreations, scenario.expectedCreations, `${scenario.nodeEnv}:${scenario.qa}`);
      assert.deepEqual(body.results, [{ id: "product-result" }]);
      assert.equal(Object.hasOwn(body, "schemaVersion"), false);
      assert.equal(Object.hasOwn(body, "handlerPhase"), false);
    });
  }
});

test("options route activates after the exact gate and before Product parameter parsing", async () => {
  await withNodeEnvironment("test", async () => {
    const order = [];
    const values = {
      qa: "1",
      filters: "genre-horror",
      types: "drama",
      requestId: "external-correlation",
    };
    const request = {
      nextUrl: {
        searchParams: {
          get(name) {
            order.push(`lookup:${name}`);
            return values[name] ?? null;
          },
        },
      },
    };
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations() {
        return { results: [{ id: "product-result" }], relaxedResults: [] };
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider() {
        order.push("get-active-provider");
        return activeProvider;
      },
      getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
      isTmdbProviderEnabled: () => true,
      createRouteFailureObserver() {
        order.push("observer:create");
        const observer = createRouteFailureObserver();
        return {
          transition(phase) {
            order.push(`phase:${phase}`);
            return observer.transition(phase);
          },
          terminalResponse: () => observer.terminalResponse(),
        };
      },
    });

    const body = await (await GET(request)).json();
    assert.deepEqual(order.slice(0, 9), [
      "lookup:qa",
      "observer:create",
      "phase:qa-activated",
      "lookup:filters",
      "lookup:types",
      "lookup:requestId",
      "phase:request-parsing-complete",
      "phase:route-ready",
      "get-active-provider",
    ]);
    assert.deepEqual(body.results, [{ id: "product-result" }]);
  });
});

test("a post-gate Product parsing failure emits only the exact qa-activated v2 marker", async () => {
  await withNodeEnvironment("test", async () => {
    let activeProviderCalls = 0;
    const parsingError = new Error("Bearer fake-secret https://unsafe.test/?token=fake C:\\private\\file");
    const request = {
      nextUrl: {
        searchParams: {
          get(name) {
            if (name === "qa") return "1";
            if (name === "filters") throw parsingError;
            return null;
          },
        },
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider() {
        activeProviderCalls += 1;
        return { id: "tmdb", name: "TMDB Provider" };
      },
      getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
      isTmdbProviderEnabled: () => true,
    });

    const response = await GET(request);
    const text = await response.text();
    const body = JSON.parse(text);
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(Object.keys(body), ["schemaVersion", "classification", "handlerPhase"]);
    assert.deepEqual(body, {
      schemaVersion: "myott.route-failure-observability.v2",
      classification: "route-handler-failure",
      handlerPhase: "qa-activated",
    });
    assert.equal(activeProviderCalls, 0);
    for (const token of ["Bearer", "fake-secret", "unsafe.test", "token=fake", "C:\\private\\file"]) {
      assert.equal(text.includes(token), false, token);
    }
  });
});

test("route-v2 terminal markers contain no Product parameters or native Error data", async () => {
  await withNodeEnvironment("test", async () => {
    const injected = [
      "Bearer fixture-secret",
      "Authorization: fixture-header",
      "C:\\fixture\\private.txt",
      "https://fixture.invalid/private?token=fake",
      "query-fragment=fake",
      "X-Fixture-Header: unsafe",
      "stack-like text",
    ];
    const values = {
      qa: "1",
      filters: `${injected[0]},${injected[1]}`,
      types: `${injected[2]},${injected[3]}`,
      requestId: `${injected[4]} ${injected[5]}`,
    };
    const activeError = new Error(injected.join(" | "));
    activeError.name = "FixtureCredentialError";
    activeError.cause = { unsafe: injected[6] };
    activeError.stack = injected[6];
    const fallbackError = new Error(injected.join(" | "));
    const request = {
      nextUrl: {
        searchParams: {
          get(name) {
            return values[name] ?? null;
          },
        },
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider: () => ({
        id: "tmdb",
        name: "TMDB Provider",
        async getRecommendations() {
          throw activeError;
        },
      }),
      getFallbackProvider: () => ({
        id: "mock",
        name: "Mock Provider",
        async getRecommendations() {
          throw fallbackError;
        },
      }),
      isTmdbProviderEnabled: () => true,
    });

    const response = await GET(request);
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), {
      schemaVersion: "myott.route-failure-observability.v2",
      classification: "route-handler-failure",
      handlerPhase: "fallback-entered",
    });
    for (const token of injected) assert.equal(text.includes(token), false, token);
    for (const token of [activeError.name, activeError.message, fallbackError.message]) {
      assert.equal(text.includes(token), false, token);
    }
  });
});

test("observer construction or transition failure cannot replace Product success", async () => {
  for (const failurePoint of ["construction", "transition"]) {
    await withNodeEnvironment("test", async () => {
      let terminalCalls = 0;
      const activeProvider = {
        id: "tmdb",
        name: "TMDB Provider",
        async getRecommendations() {
          return { results: [{ id: "preserved-result" }], relaxedResults: [] };
        },
      };
      const { GET } = await importOptionsRoute({
        getActiveProvider: () => activeProvider,
        getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
        isTmdbProviderEnabled: () => true,
        createRouteFailureObserver() {
          if (failurePoint === "construction") throw new Error("observer construction failure");
          return {
            transition() {
              throw new Error("observer transition failure");
            },
            terminalResponse() {
              terminalCalls += 1;
              throw new Error("must not be called");
            },
          };
        },
      });

      const body = await (await GET(routeRequest("types=drama&qa=1"))).json();
      assert.deepEqual(body.results, [{ id: "preserved-result" }]);
      assert.equal(Object.hasOwn(body, "schemaVersion"), false);
      assert.equal(terminalCalls, 0);
    });
  }
});

test("production parsing failure never exposes route-v2", async () => {
  await withNodeEnvironment("production", async () => {
    let qaLookups = 0;
    let observerCreations = 0;
    const parsingError = new Error("production parsing failure");
    const request = {
      nextUrl: {
        searchParams: {
          get(name) {
            if (name === "qa") {
              qaLookups += 1;
              return "1";
            }
            if (name === "filters") throw parsingError;
            return null;
          },
        },
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider: () => ({ id: "tmdb", name: "TMDB Provider" }),
      getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
      isTmdbProviderEnabled: () => true,
      createRouteFailureObserver() {
        observerCreations += 1;
        return createRouteFailureObserver();
      },
    });

    await assert.rejects(GET(request), (error) => error === parsingError);
    assert.equal(qaLookups, 0);
    assert.equal(observerCreations, 0);
  });
});

test("options route records only approved phases and leaves successful Product responses unchanged", async () => {
  await withNodeEnvironment("test", async () => {
    const order = [];
    let activeCalls = 0;
    let fallbackCalls = 0;
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations() {
        activeCalls += 1;
        order.push("active-provider-call");
        return { results: [{ id: "tmdb-result" }], relaxedResults: [] };
      },
    };
    const routeResponse = {
      json(value, init) {
        order.push("active-response-json");
        return Response.json(value, init);
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider() {
        order.push("get-active-provider");
        return activeProvider;
      },
      getFallbackProvider() {
        fallbackCalls += 1;
        return { id: "mock", name: "Mock Provider" };
      },
      isTmdbProviderEnabled: () => true,
      createRouteFailureObserver: createRecordingRouteObserverFactory(order),
      routeResponse,
    });
    const response = await GET(routeRequest("types=drama&qa=1&requestId=external-correlation"));
    const body = await response.json();

    assert.deepEqual(order, [
      "phase:qa-activated",
      "phase:request-parsing-complete",
      "phase:route-ready",
      "get-active-provider",
      "phase:active-provider-entered",
      "active-provider-call",
      "phase:active-response-started",
      "active-response-json",
    ]);
    assert.equal(activeCalls, 1);
    assert.equal(fallbackCalls, 0);
    assert.equal(body.source, "tmdb");
    assert.deepEqual(body.results, [{ id: "tmdb-result" }]);
    assert.equal(Object.hasOwn(body, "schemaVersion"), false);
    assert.equal(Object.hasOwn(body, "classification"), false);
    assert.equal(Object.hasOwn(body, "handlerPhase"), false);
  });

  for (const branch of ["empty", "mock"]) {
    await withNodeEnvironment("test", async () => {
      const phases = [];
      let recommendationCalls = 0;
      const activeProvider = {
        id: branch === "mock" ? "mock" : "tmdb",
        name: branch === "mock" ? "Mock Provider" : "TMDB Provider",
        async getRecommendations() {
          recommendationCalls += 1;
          return { results: [{ id: "mock-result" }], relaxedResults: [] };
        },
      };
      const { GET } = await importOptionsRoute({
        getActiveProvider: () => activeProvider,
        getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
        isTmdbProviderEnabled: () => true,
        createRouteFailureObserver: createRecordingRouteObserverFactory(phases),
      });
      const query = branch === "empty" ? "qa=1" : "types=drama&qa=1";
      const body = await (await GET(routeRequest(query))).json();

      assert.deepEqual(phases, ["phase:qa-activated", "phase:request-parsing-complete", "phase:route-ready"]);
      assert.equal(recommendationCalls, branch === "mock" ? 1 : 0);
      assert.equal(Object.hasOwn(body, "schemaVersion"), false);
      assert.equal(Object.hasOwn(body, "classification"), false);
      assert.equal(Object.hasOwn(body, "handlerPhase"), false);
    });
  }
});

test("ordinary active failure preserves fallback eligibility and exact ordering", async () => {
  await withNodeEnvironment("test", async () => {
    const order = [];
    let activeCalls = 0;
    let fallbackCalls = 0;
    const activeError = new Error("active Product failure");
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations() {
        activeCalls += 1;
        order.push("active-provider-call");
        throw activeError;
      },
    };
    const fallbackProvider = {
      id: "mock",
      name: "Mock Provider",
      async getRecommendations() {
        fallbackCalls += 1;
        order.push("fallback-provider-call");
        return { results: [{ id: "fallback-result" }], relaxedResults: [] };
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider() {
        order.push("get-active-provider");
        return activeProvider;
      },
      getFallbackProvider() {
        order.push("get-fallback-provider");
        return fallbackProvider;
      },
      isTmdbProviderEnabled: () => true,
      createRouteFailureObserver: createRecordingRouteObserverFactory(order),
      routeResponse: {
        json(value, init) {
          order.push("fallback-response-json");
          return Response.json(value, init);
        },
      },
    });
    const body = await (await GET(routeRequest("types=drama&qa=1"))).json();

    assert.deepEqual(order, [
      "phase:qa-activated",
      "phase:request-parsing-complete",
      "phase:route-ready",
      "get-active-provider",
      "phase:active-provider-entered",
      "active-provider-call",
      "phase:active-failure-caught",
      "phase:fallback-entered",
      "get-fallback-provider",
      "fallback-provider-call",
      "phase:fallback-response-started",
      "fallback-response-json",
    ]);
    assert.equal(activeCalls, 1);
    assert.equal(fallbackCalls, 1);
    assert.equal(body.fallbackUsed, true);
    assert.equal(body.fallbackReason, activeError.message);
    assert.deepEqual(body.results, [{ id: "fallback-result" }]);
  });
});

test("active response serialization failure reaches the existing fallback before any marker", async () => {
  await withNodeEnvironment("test", async () => {
    const order = [];
    let activeCalls = 0;
    let fallbackCalls = 0;
    let responseCalls = 0;
    const serializationError = new Error("active serialization failure");
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations() {
        activeCalls += 1;
        order.push("active-provider-call");
        return { results: [{ id: "active-result" }], relaxedResults: [] };
      },
    };
    const fallbackProvider = {
      id: "mock",
      name: "Mock Provider",
      async getRecommendations() {
        fallbackCalls += 1;
        order.push("fallback-provider-call");
        return { results: [{ id: "fallback-result" }], relaxedResults: [] };
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider: () => activeProvider,
      getFallbackProvider: () => fallbackProvider,
      isTmdbProviderEnabled: () => true,
      createRouteFailureObserver: createRecordingRouteObserverFactory(order),
      routeResponse: {
        json(value, init) {
          responseCalls += 1;
          order.push(responseCalls === 1 ? "active-response-json" : "fallback-response-json");
          if (responseCalls === 1) throw serializationError;
          return Response.json(value, init);
        },
      },
    });
    const body = await (await GET(routeRequest("types=drama&qa=1"))).json();

    assert.deepEqual(order, [
      "phase:qa-activated",
      "phase:request-parsing-complete",
      "phase:route-ready",
      "phase:active-provider-entered",
      "active-provider-call",
      "phase:active-response-started",
      "active-response-json",
      "phase:active-failure-caught",
      "phase:fallback-entered",
      "fallback-provider-call",
      "phase:fallback-response-started",
      "fallback-response-json",
    ]);
    assert.equal(activeCalls, 1);
    assert.equal(fallbackCalls, 1);
    assert.equal(responseCalls, 2);
    assert.equal(body.fallbackUsed, true);
    assert.equal(body.fallbackReason, serializationError.message);
    assert.equal(Object.hasOwn(body, "classification"), false);
  });
});

test("fallback provider and fallback serialization failures emit only the bounded QA marker", async () => {
  for (const failurePoint of ["provider", "serialization"]) {
    await withNodeEnvironment("test", async () => {
      let activeCalls = 0;
      let fallbackCalls = 0;
      let responseCalls = 0;
      const activeProvider = {
        id: "tmdb",
        name: "TMDB Provider",
        async getRecommendations() {
          activeCalls += 1;
          throw new Error("active failure");
        },
      };
      const fallbackProvider = {
        id: "mock",
        name: "Mock Provider",
        async getRecommendations() {
          fallbackCalls += 1;
          if (failurePoint === "provider") throw new Error("fallback provider failure");
          return { results: [{ id: "fallback-result" }], relaxedResults: [] };
        },
      };
      const { GET } = await importOptionsRoute({
        getActiveProvider: () => activeProvider,
        getFallbackProvider: () => fallbackProvider,
        isTmdbProviderEnabled: () => true,
        routeResponse: {
          json(value, init) {
            responseCalls += 1;
            if (failurePoint === "serialization") throw new Error("fallback serialization failure");
            return Response.json(value, init);
          },
        },
      });
      const response = await GET(routeRequest("types=drama&qa=1&requestId=must-not-leak"));
      const text = await response.text();
      const body = JSON.parse(text);

      assert.equal(response.status, 500);
      assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(body, {
        schemaVersion: "myott.route-failure-observability.v2",
        classification: "route-handler-failure",
        handlerPhase: failurePoint === "provider" ? "fallback-entered" : "fallback-response-started",
      });
      assert.equal(text.includes("must-not-leak"), false);
      assert.equal(activeCalls, 1);
      assert.equal(fallbackCalls, 1);
      assert.equal(responseCalls, failurePoint === "provider" ? 0 : 1);
    });
  }
});

test("QA-off and production preserve the original escaping fallback failure", async () => {
  for (const scenario of [
    { nodeEnv: "test", query: "types=drama" },
    { nodeEnv: "production", query: "types=drama&qa=1" },
  ]) {
    await withNodeEnvironment(scenario.nodeEnv, async () => {
      let observerCreations = 0;
      let activeCalls = 0;
      let fallbackCalls = 0;
      const fallbackError = new Error(`${scenario.nodeEnv} fallback failure`);
      const { GET } = await importOptionsRoute({
        getActiveProvider: () => ({
          id: "tmdb",
          name: "TMDB Provider",
          async getRecommendations() {
            activeCalls += 1;
            throw new Error("active failure");
          },
        }),
        getFallbackProvider: () => ({
          id: "mock",
          name: "Mock Provider",
          async getRecommendations() {
            fallbackCalls += 1;
            throw fallbackError;
          },
        }),
        isTmdbProviderEnabled: () => true,
        createRouteFailureObserver() {
          observerCreations += 1;
          return createRouteFailureObserver();
        },
      });

      await assert.rejects(GET(routeRequest(scenario.query)), (error) => error === fallbackError);
      assert.equal(observerCreations, 0);
      assert.equal(activeCalls, 1);
      assert.equal(fallbackCalls, 1);
    });
  }
});

test("invalid observation and terminal construction failure cannot alter Product flow", async () => {
  await withNodeEnvironment("test", async () => {
    let transitions = 0;
    let terminalCalls = 0;
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations() {
        return { results: [{ id: "preserved-result" }], relaxedResults: [] };
      },
    };
    const { GET } = await importOptionsRoute({
      getActiveProvider: () => activeProvider,
      getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
      isTmdbProviderEnabled: () => true,
      createRouteFailureObserver: () => ({
        transition() {
          transitions += 1;
          return transitions === 1;
        },
        terminalResponse() {
          terminalCalls += 1;
          throw new Error("must not be reached");
        },
      }),
    });
    const body = await (await GET(routeRequest("types=drama&qa=1"))).json();
    assert.deepEqual(body.results, [{ id: "preserved-result" }]);
    assert.equal(transitions, 2);
    assert.equal(terminalCalls, 0);
  });

  await withNodeEnvironment("test", async () => {
    let activeCalls = 0;
    let fallbackCalls = 0;
    let terminalCalls = 0;
    const fallbackError = new Error("original fallback failure");
    const { GET } = await importOptionsRoute({
      getActiveProvider: () => ({
        id: "tmdb",
        name: "TMDB Provider",
        async getRecommendations() {
          activeCalls += 1;
          throw new Error("active failure");
        },
      }),
      getFallbackProvider: () => ({
        id: "mock",
        name: "Mock Provider",
        async getRecommendations() {
          fallbackCalls += 1;
          throw fallbackError;
        },
      }),
      isTmdbProviderEnabled: () => true,
      createRouteFailureObserver: () => {
        const observer = createRouteFailureObserver();
        return {
          transition: (phase) => observer.transition(phase),
          terminalResponse() {
            terminalCalls += 1;
            throw new Error("terminal construction failure");
          },
        };
      },
    });

    await assert.rejects(GET(routeRequest("types=drama&qa=1")), (error) => error === fallbackError);
    assert.equal(activeCalls, 1);
    assert.equal(fallbackCalls, 1);
    assert.equal(terminalCalls, 1);
  });
});

test("route observability remains separate from provider-v3 authority", async () => {
  const [providerSource, routeSource, helperSource] = await Promise.all([
    readFile(new URL("./tmdbObservability.js", import.meta.url), "utf8"),
    readFile(optionsRouteUrl, "utf8"),
    readFile(new URL("./routeFailureObservability.js", import.meta.url), "utf8"),
  ]);
  assert.match(providerSource, /TMDB_OBSERVABILITY_SCHEMA_VERSION = "myott\.current-product-observability\.v3"/);
  assert.match(routeSource, /createRouteFailureObserver/);
  assert.equal(/myott\.current-product-observability\.v3|transportFailureCategory|responseReached|candidate-lineage/i.test(helperSource), false);
  assert.equal(/getRecommendations|fallbackProvider|requestBudget|retryLimit/.test(helperSource), false);
});
