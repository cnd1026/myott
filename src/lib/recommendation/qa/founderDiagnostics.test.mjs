import assert from "node:assert/strict";
import test from "node:test";

import {
  attachFounderDiagnostics,
  founderDiagnosticsSecretExposureCount,
  sanitizeFounderDiagnostics,
} from "./founderDiagnostics.js";
import {
  createRequestContext,
  diagnoseTmdbCandidateUniverse,
  evaluateTmdbCandidateUniverse,
} from "../../../../lib/tmdb.js";
import { clearTmdbRequestCache, createTmdbRequestContext } from "../../providers/tmdb/requestContext.js";
import {
  TMDB_OBSERVABILITY_LIMITS,
  TMDB_OBSERVABILITY_TRACE_STAGES,
  assertTmdbObservabilityBehaviorInvariant,
  assertTmdbObservabilitySession,
  buildTmdbObservabilityEvidence,
  createTmdbObservabilitySession,
  emitTmdbObservabilityEvent,
  finalizeTmdbObservabilitySession,
  summarizeTmdbObservabilityLedger,
  tmdbObservabilitySessionMetadata,
  validateCorrectedEventLimitContract,
  validateTmdbObservabilityLedger,
} from "./tmdbObservability.js";
import {
  TMDB_OBSERVABILITY_FIXTURE_INPUT,
  createTmdbObservabilityFixtureContext,
  tmdbObservabilityFixtureCandidates,
} from "./tmdbObservabilityFixture.mjs";
import { assertSafeEvidenceFileStem } from "./tmdbObservabilityOutput.mjs";
import {
  runTmdbObservabilityEventLimitFixtures,
  runTmdbObservabilityImmutableOutputFixtures,
} from "./tmdbObservabilitySecurityFixtures.mjs";

const safeCandidateFields = Object.freeze({
  tmdbId: 10,
  title: "Safe Candidate",
  providerMediaType: "movie",
  normalizedContentType: "movie",
});

function deterministicEvidenceArgs(session, result, runMode = "cold") {
  return {
    session,
    run: {
      taskId: "MYOTT-S09-006A2D1A",
      findingId: "REC-QA-091",
      runId: `deterministic-${runMode}`,
      runMode,
      generatedAt: "2026-08-02T00:00:00.000Z",
      repositoryCommit: "f38b746416a13c3b2bbcac4396fee08b7c1160ea",
      repositoryDirtyState: "candidate-diff-preserved",
      input: {
        country: "us",
        semanticGenre: "horror",
        contentType: "drama",
        providerMediaType: "tv",
        limit: 12,
      },
    },
    productContract: {
      country: "us",
      semanticGenre: "horror",
      contentType: "drama",
      providerMediaType: "tv",
      minimumExpected: 8,
      productScoreThreshold: "NONE",
    },
    requestBudget: result.traceSummary.requestBudget,
    cache: result.traceSummary.cache,
    stages: result.traceStages,
    candidates: result.candidateRegistry,
    finalCandidateIds: result.finalCandidateIds,
    excludedCandidates: result.excludedCandidates,
    summary: {
      dataSource: "DETERMINISTIC_FIXTURE",
      providerScarcity: "NOT_PROVEN",
      rootCause: "UNRESOLVED",
      detailBudgetUnresolved: result.traceSummary.detailBudgetUnresolved,
    },
  };
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

test("TMDB observability accepts only the explicit event and field allowlists", () => {
  const session = createTmdbObservabilitySession();
  const candidateEvents = [
    "retrieval-row",
    "duplicate-decision",
    "preliminary-decision",
    "detail-order",
    "detail-budget",
    "normalized-evaluation",
    "exclusion-decision",
    "final-eligibility",
  ];
  candidateEvents.forEach((type) => emitTmdbObservabilityEvent(session, type, safeCandidateFields));
  emitTmdbObservabilityEvent(session, "detail-request-result", {
    endpointPath: "/movie/10",
    requestKind: "detail",
    providerMediaType: "movie",
    tmdbId: 10,
    requestSource: "network",
    httpStatus: 200,
    terminalResult: "success",
    elapsedMs: 4,
    retryCount: 0,
  });
  const payload = JSON.parse(finalizeTmdbObservabilitySession(session));
  assert.deepEqual(payload.events.map((event) => event.type), [
    ...candidateEvents,
    "detail-request-result",
  ]);

  const unknownEventSession = createTmdbObservabilitySession();
  assert.throws(
    () => emitTmdbObservabilityEvent(unknownEventSession, "unknown-event", safeCandidateFields),
    /Unknown TMDB observability event type/,
  );
  const unknownFieldSession = createTmdbObservabilitySession();
  assert.throws(
    () => emitTmdbObservabilityEvent(unknownFieldSession, "retrieval-row", {
      ...safeCandidateFields,
      unexpected: true,
    }),
    /Unknown field/,
  );
});

test("TMDB observability rejects secret-shaped keys, credentials, URLs, queries, paths, and raw errors", () => {
  const secretFieldSession = createTmdbObservabilitySession();
  assert.throws(
    () => emitTmdbObservabilityEvent(secretFieldSession, "retrieval-row", {
      ...safeCandidateFields,
      apiKey: "do-not-store",
    }),
    /Secret-shaped/,
  );

  for (const unsafeTitle of [
    "Bearer abcdefghijklmnop",
    "api_key=do-not-store",
    "C:\\Users\\private\\secret.txt",
  ]) {
    const session = createTmdbObservabilitySession();
    assert.throws(
      () => emitTmdbObservabilityEvent(session, "retrieval-row", {
        ...safeCandidateFields,
        title: unsafeTitle,
      }),
      /Unsafe or credential-shaped/,
    );
  }

  for (const endpointPath of [
    "https://api.themoviedb.org/3/movie/10",
    "/movie/10?api_key=secret",
  ]) {
    const session = createTmdbObservabilitySession();
    assert.throws(
      () => emitTmdbObservabilityEvent(session, "detail-request-result", {
        endpointPath,
        requestKind: "detail",
      }),
      /Unsafe or credential-shaped|repository-safe/,
    );
  }

  const errorSession = createTmdbObservabilitySession();
  assert.throws(
    () => emitTmdbObservabilityEvent(errorSession, "detail-request-result", {
      endpointPath: "/movie/10",
      requestKind: "detail",
      terminalResult: new Error("unsafe"),
    }),
    /Unsafe object serialization/,
  );
});

test("TMDB observability normalizes control characters and serializes deterministically", () => {
  const build = (reverseFields = false) => {
    const session = createTmdbObservabilitySession();
    const fields = reverseFields
      ? { providerMediaType: "movie", title: "A\u0000B\nC", tmdbId: 10 }
      : { tmdbId: 10, title: "A\u0000B\nC", providerMediaType: "movie" };
    emitTmdbObservabilityEvent(session, "retrieval-row", fields);
    return finalizeTmdbObservabilitySession(session);
  };
  const left = build(false);
  const right = build(true);
  assert.equal(left, right);
  assert.equal(JSON.parse(left).events[0].title, "A B C");
});

test("TMDB observability enforces event-count, string-size, and total-payload bounds", () => {
  const eventCountSession = createTmdbObservabilitySession();
  for (let index = 0; index < TMDB_OBSERVABILITY_LIMITS.maximumEventCount; index += 1) {
    emitTmdbObservabilityEvent(eventCountSession, "retrieval-row", {
      tmdbId: index + 1,
      title: `Candidate ${index + 1}`,
      providerMediaType: "movie",
    });
  }
  assert.throws(
    () => emitTmdbObservabilityEvent(eventCountSession, "retrieval-row", safeCandidateFields),
    /event-count limit/,
  );

  const stringSession = createTmdbObservabilitySession();
  assert.throws(
    () => emitTmdbObservabilityEvent(stringSession, "retrieval-row", {
      ...safeCandidateFields,
      title: "x".repeat(TMDB_OBSERVABILITY_LIMITS.maximumStringLength + 1),
    }),
    /string limit/,
  );

  const payloadSession = createTmdbObservabilitySession();
  const largeValues = Array.from(
    { length: 64 },
    (_, index) => `${"x".repeat(1_990)}${index}`,
  );
  assert.throws(
    () => {
      for (let index = 0; index < 40; index += 1) {
        emitTmdbObservabilityEvent(payloadSession, "normalized-evaluation", {
          tmdbId: index + 1,
          title: `Candidate ${index + 1}`,
          providerMediaType: "movie",
          canonicalGenreValues: largeValues,
        });
      }
    },
    /total-payload limit/,
  );
});

test("TMDB observability session identity is opaque, process-local, and not publicly activatable", () => {
  const session = createTmdbObservabilitySession();
  assert.equal(JSON.stringify(session), "{}");
  const reconstructed = JSON.parse(JSON.stringify(session));
  assert.throws(() => assertTmdbObservabilitySession(reconstructed), /valid opaque/);
  assert.throws(
    () => emitTmdbObservabilityEvent({}, "retrieval-row", safeCandidateFields),
    /valid opaque/,
  );
  assert.throws(
    () => createRequestContext({ observer: session }),
    /cannot be activated through the public request-context factory/,
  );
});

test("QA-only observability records Product-plan stages without changing deterministic Product behavior", async () => {
  const inputBefore = JSON.parse(JSON.stringify(TMDB_OBSERVABILITY_FIXTURE_INPUT));
  clearTmdbRequestCache();
  const baselineCalls = [];
  const baseline = await evaluateTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    requestContext: createTmdbObservabilityFixtureContext({ calls: baselineCalls }),
  });

  clearTmdbRequestCache();
  const session = createTmdbObservabilitySession();
  const observedCalls = [];
  const observed = await diagnoseTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    session,
    requestContext: createTmdbObservabilityFixtureContext({ observer: session, calls: observedCalls }),
  });
  const evidence = buildTmdbObservabilityEvidence(deterministicEvidenceArgs(session, observed));
  const ledger = validateTmdbObservabilityLedger(finalizeTmdbObservabilitySession(session));

  assert.equal(assertTmdbObservabilityBehaviorInvariant(
    baseline.productSnapshot,
    observed.productSnapshot,
  ), true);
  assert.deepEqual(TMDB_OBSERVABILITY_FIXTURE_INPUT, inputBefore);
  assert.equal(baselineCalls.length, 16);
  assert.equal(observedCalls.length, 16);
  assert.deepEqual(
    [...new Set(ledger.events.map((event) => event.stage))].sort(),
    [...TMDB_OBSERVABILITY_TRACE_STAGES].sort(),
  );
  assert.equal(observed.traceSummary.detailBudgetUnresolved, true);
  assert.equal(observed.candidateRegistry.length, 20);
  assert.equal(observed.candidateRegistry.filter((candidate) => candidate.detailBudgetStatus === "detail-budget-unresolved").length, 4);
  assert.equal(observed.candidateRegistry.every((candidate) => (
    candidate.candidateId && candidate.provider === "tmdb" && candidate.mediaType === "tv" &&
    Number.isSafeInteger(candidate.providerId) && candidate.canonicalId && candidate.title &&
    candidate.originalTitle && candidate.identityCompleteness === "complete"
  )), true);
  assert.equal(observed.finalCandidateIds.length, 12);
  assert.equal(evidence.summary.dataSource, "DETERMINISTIC_FIXTURE");
  assert.equal(evidence.redactionValidation.secretShapedOutputCount, 0);
  assert.equal(JSON.stringify(evidence).includes("api_key"), false);

  const warmSession = createTmdbObservabilitySession();
  const warm = await diagnoseTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    session: warmSession,
    requestContext: createTmdbObservabilityFixtureContext({ observer: warmSession }),
  });
  assert.deepEqual(warm.finalCandidateIds, observed.finalCandidateIds);
  assert.equal(warm.traceSummary.cache.cacheHit, true);
  assert.equal(warm.traceSummary.cache.recomputedPipeline, true);
  clearTmdbRequestCache();
});

test("QA-only observability rejects malformed evidence and Product-plan contract drift", async () => {
  clearTmdbRequestCache();
  const session = createTmdbObservabilitySession();
  const result = await diagnoseTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    session,
    requestContext: createTmdbObservabilityFixtureContext({ observer: session }),
  });
  const args = deterministicEvidenceArgs(session, result);
  const ledger = JSON.parse(finalizeTmdbObservabilitySession(session));

  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    run: { ...args.run, input: { ...args.run.input, token: "not-allowed" } },
  }), /Secret-shaped evidence field/);
  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    candidates: args.candidates.map((candidate, index) => index
      ? candidate
      : (() => {
          const copy = { ...candidate };
          delete copy.candidateId;
          return copy;
        })()),
  }), /registry is incomplete/);
  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    stages: args.stages.map((stage, index) => index ? stage : { ...stage, stage: "invalid-stage" }),
  }), /invalid or duplicate stage summary/);
  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    stages: args.stages.map((stage, index) => index ? stage : { ...stage, sequence: 99 }),
  }), /canonical deterministic sequence/);
  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    stages: args.stages.map((stage, index) => index ? stage : { ...stage, sourceComponent: "" }),
  }), /requires a source component/);
  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    stages: args.stages.map((stage) => stage.stage === "raw-candidate"
      ? { ...stage, outputCount: stage.outputCount + 1 }
      : stage),
  }), /output count does not match/);
  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    stages: args.stages.map((stage) => stage.stage === "final-exclusion"
      ? { ...stage, exclusionReasons: [] }
      : stage),
  }), /exclusions require a stable drop reason/);
  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    finalCandidateIds: [...args.finalCandidateIds, "tmdb:tv:999999"],
  }), /absent from the registry/);
  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    excludedCandidates: args.excludedCandidates.map((candidate, index) => index
      ? candidate
      : { ...candidate, traceDropReason: "invalid-drop" }),
  }), /exclusion is incomplete/);
  assert.throws(() => buildTmdbObservabilityEvidence({
    ...args,
    excludedCandidates: args.excludedCandidates.map((candidate, index) => index
      ? candidate
      : { ...candidate, traceDropReason: "unknown-uninstrumented-drop", exclusionReason: "" }),
  }), /unknown drop requires/);
  ledger.events[1].sequence = ledger.events[0].sequence;
  assert.throws(() => validateTmdbObservabilityLedger(JSON.stringify(ledger)), /duplicate or invalid event sequence/);
  assert.throws(() => assertTmdbObservabilityBehaviorInvariant(
    result.productSnapshot,
    { ...result.productSnapshot, candidateCount: result.productSnapshot.candidateCount + 1 },
  ), /changed the Product behavior snapshot/);

  const driftContext = createTmdbRequestContext({
    fetchImpl: async () => {
      throw new Error("Product-plan policy must reject before fixture fetch.");
    },
    limits: { total: 25, list: 8, detail: 16, concurrency: 4, retries: 0 },
  });
  await assert.rejects(
    evaluateTmdbCandidateUniverse({
      ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
      requestContext: driftContext,
    }),
    /24\/8\/16 concurrency-4/,
  );
  clearTmdbRequestCache();
});

test("Corrected observability records complete ranking and pre-ranking terminal provenance", async () => {
  clearTmdbRequestCache();
  const session = createTmdbObservabilitySession({
    runId: "corrected-provenance-cold",
    runMode: "cold",
    sourceComponent: "lib/tmdb.js:qa-only-diagnostic",
  });
  const result = await diagnoseTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    session,
    requestContext: createTmdbObservabilityFixtureContext({ observer: session }),
  });
  const ledger = finalizeTmdbObservabilitySession(session);
  const metadata = tmdbObservabilitySessionMetadata(session);
  const recomputed = summarizeTmdbObservabilityLedger(ledger);

  assert.deepEqual(metadata, {
    runId: "corrected-provenance-cold",
    runMode: "cold",
    sourceComponent: "lib/tmdb.js:qa-only-diagnostic",
  });
  assert.deepEqual(recomputed, result.traceStages);
  assert.equal(result.terminalProvenance.length, result.candidateRegistry.length);
  assert.equal(result.terminalProvenance.every((entry) => (
    entry.rankingInput && Number.isFinite(entry.score) && entry.scoreComponents.length > 0 &&
    Number.isSafeInteger(entry.rankBeforeAssembly) &&
    (Number.isSafeInteger(entry.rankAfterAssembly) || entry.assemblyExclusion === true)
  )), true);
  assert.equal(result.candidateRegistry.some((candidate) => candidate.traceDropReason === "unknown-uninstrumented-drop"), false);

  const candidates = tmdbObservabilityFixtureCandidates();
  candidates[0] = { ...candidates[0], origin_country: ["GB"] };
  const preRankingSession = createTmdbObservabilitySession({
    runId: "corrected-provenance-pre-ranking",
    runMode: "cold",
    sourceComponent: "lib/tmdb.js:qa-only-diagnostic",
  });
  const preRanking = await diagnoseTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    candidates,
    session: preRankingSession,
    requestContext: createTmdbObservabilityFixtureContext({ observer: preRankingSession }),
  });
  const excluded = preRanking.terminalProvenance.find((entry) => !entry.rankingInput);
  assert.deepEqual({
    score: excluded.score,
    rankBeforeAssembly: excluded.rankBeforeAssembly,
    rankAfterAssembly: excluded.rankAfterAssembly,
    exclusionStage: excluded.exclusionStage,
    exclusionReason: excluded.exclusionReason,
    terminalStage: excluded.terminalStage,
    terminalReason: excluded.terminalReason,
  }, {
    score: null,
    rankBeforeAssembly: null,
    rankAfterAssembly: null,
    exclusionStage: "preliminary",
    exclusionReason: "country-mismatch",
    terminalStage: "final-exclusion",
    terminalReason: "country-mismatch",
  });
  clearTmdbRequestCache();
});

test("Observability-disabled evaluation reports zero diagnostic overhead without changing Product output", async () => {
  clearTmdbRequestCache();
  const baseline = await evaluateTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    requestContext: createTmdbObservabilityFixtureContext(),
  });
  assert.deepEqual(baseline.observabilityDisabled, {
    candidateIterationCount: 0,
    candidateRegistryCount: 0,
    eventCount: 0,
    serializationCount: 0,
    redactionCount: 0,
    evidenceWriteCount: 0,
  });
  assert.equal(baseline.traceStages.length, 0);
  assert.equal(baseline.candidateRegistry.length, 0);
  assert.equal(baseline.terminalProvenance.length, 0);
  clearTmdbRequestCache();
});

test("Evidence boundary and recursive safety reject traversal, reserved keys, and circular values", async () => {
  assert.equal(assertSafeEvidenceFileStem("deterministic-observability-v1-correction-test"), "deterministic-observability-v1-correction-test");
  for (const invalidStem of ["", "../escape", "C:\\escape", "D:/escape", "bad\u0000name", ".."] ) {
    assert.throws(() => assertSafeEvidenceFileStem(invalidStem), /EVIDENCE_FILE_STEM_INVALID/);
  }
  const circular = {};
  circular.self = circular;
  clearTmdbRequestCache();
  const session = createTmdbObservabilitySession();
  const result = await diagnoseTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    session,
    requestContext: createTmdbObservabilityFixtureContext({ observer: session }),
  });
  const args = deterministicEvidenceArgs(session, result);
  args.run.input.circular = circular;
  assert.throws(
    () => buildTmdbObservabilityEvidence(args),
    /CIRCULAR_REFERENCE_REJECTED/,
  );
  clearTmdbRequestCache();
});

function eventLimitContractRuns(counts = [181, 181, 181]) {
  return ["cold", "warm-prime", "warm-measure"].map((runMode, index) => ({
    runMode,
    ledger: JSON.stringify({
      events: Array.from({ length: counts[index] }, (_, eventIndex) => ({ sequence: eventIndex + 1 })),
    }),
  }));
}

function eventLimitContractResourceLimits(overrides = {}) {
  return {
    status: "PASS",
    eventLimitScope: "PER_RUN_AND_AGGREGATE",
    maximumEventCountPerRun: 512,
    maximumRunCount: 3,
    maximumAggregateEventCount: 1536,
    actualEventCountByRun: { cold: 181, "warm-prime": 181, "warm-measure": 181 },
    actualAggregateEventCount: 543,
    ...overrides,
  };
}

test("Corrected observability declares per-run and aggregate event limits", async () => {
  assert.deepEqual(
    validateCorrectedEventLimitContract(eventLimitContractRuns(), eventLimitContractResourceLimits()).actualEventCountByRun,
    { cold: 181, "warm-prime": 181, "warm-measure": 181 },
  );
  const fixtures = await runTmdbObservabilityEventLimitFixtures({
    runs: eventLimitContractRuns(),
    resourceLimits: eventLimitContractResourceLimits(),
  });
  assert.deepEqual({ total: fixtures.total, passed: fixtures.passed, failed: fixtures.failed, unexpectedPasses: fixtures.unexpectedPasses }, {
    total: 10,
    passed: 10,
    failed: 0,
    unexpectedPasses: 0,
  });
  assert.throws(
    () => validateCorrectedEventLimitContract(eventLimitContractRuns([513, 181, 181]), eventLimitContractResourceLimits()),
    /EVENT_LIMIT_PER_RUN_EXCEEDED/,
  );
  assert.throws(
    () => validateCorrectedEventLimitContract(eventLimitContractRuns(), eventLimitContractResourceLimits({ eventLimitScope: "PER_SESSION" })),
    /EVENT_LIMIT_CONTRACT_DECLARATION_INVALID/,
  );
});

test("Immutable observability output preserves existing files during races", async () => {
  const result = await runTmdbObservabilityImmutableOutputFixtures();
  assert.equal(result.status, "PASS");
  assert.equal(result.destinationRacePreserved, true);
  assert.equal(result.concurrentSingleWinner, true);
  assert.equal(result.residualTemporaryFileCount, 0);
});
