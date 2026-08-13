import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  TmdbObservabilityIntegrityError,
  createRequestContext,
  discoverTmdb,
  recommendSeedsTmdb,
} from "../../../lib/tmdb.js";
import { tmdbProvider } from "../providers/tmdb/provider.js";
import {
  TMDB_REQUEST_LIMITS,
  TMDB_TIME_LIMITS,
  clearTmdbRequestCache,
} from "../providers/tmdb/requestContext.js";
import {
  createFixtureFetch,
  createRecommendationContextFactory,
} from "../providers/tmdb/testing/multiSeedFixture.mjs";
import {
  GENRE_TOP_EIGHT_VALUES,
  candidateGenreMatchDetail,
  genreIdsForFilters,
  prioritizeGenreOptions,
} from "./genres/genreContract.js";
import {
  applySuggestionSelection,
  buildSeedCoverageMessage,
  buildSeedRequestPayload,
  resolveEmptyStateMessage,
} from "./seeds/seedRequest.js";
import {
  TMDB_OBSERVABILITY_ACCEPTED_WORST_CASE,
  TMDB_OBSERVABILITY_LIMITS,
  TMDB_OBSERVABILITY_STAGES,
  createTmdbObservabilitySession,
  validateTmdbObservabilityEvidence,
} from "./qa/tmdbObservability.js";

beforeEach(() => clearTmdbRequestCache());

function tmdbFixtureResponse(status, payload = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    async json() {
      return payload;
    },
  };
}

function currentProductCandidates(count = 72, { horrorPassCount = null } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const id = 80_001 + index;
    const horrorFixture = Number.isSafeInteger(horrorPassCount);
    const horrorPass = horrorFixture && index < horrorPassCount;
    const title = horrorFixture
      ? `Candidate${id} Current Product`
      : `Current Product Candidate ${id}`;
    return {
      id,
      name: title,
      original_name: title,
      first_air_date: `202${index % 5}-01-01`,
      genre_ids: horrorFixture ? [9648] : [18],
      origin_country: ["US"],
      overview: horrorPass ? "A horror haunting with an occult ghost." : "A quiet mystery drama.",
      popularity: 1_000 - index,
      vote_average: 8 - (index % 5) / 10,
      vote_count: 2_000 - index,
    };
  });
}

function currentProductFixtureFetch(calls, fixtureOptions = {}) {
  const candidates = currentProductCandidates(fixtureOptions.count || 72, fixtureOptions);
  return async (rawUrl) => {
    const url = new URL(rawUrl);
    calls.push(url.pathname);
    if (url.pathname === "/3/discover/tv") {
      return tmdbFixtureResponse(200, {
        page: Number(url.searchParams.get("page") || 1),
        total_results: candidates.length,
        results: candidates,
      });
    }
    const detailMatch = url.pathname.match(/^\/3\/tv\/(\d+)$/);
    assert.ok(detailMatch, `unexpected current Product fixture path: ${url.pathname}`);
    const id = Number(detailMatch[1]);
    const candidate = candidates.find((item) => item.id === id);
    assert.ok(candidate, `unknown current Product fixture candidate: ${id}`);
    return tmdbFixtureResponse(200, {
      ...candidate,
      genres: candidate.genre_ids.map((id) => ({ id, name: id === 9648 ? "Mystery" : "Drama" })),
      episode_run_time: [45],
      production_countries: [{ iso_3166_1: "US" }],
      keywords: {
        results: candidate.overview.startsWith("A horror") ? [{ id: candidate.id, name: "horror" }] : [],
      },
      credits: { cast: [], crew: [] },
      "watch/providers": { results: {} },
    });
  };
}

async function withCurrentProductRuntime(operation, { nodeEnv = "test", clock, fixtureOptions } = {}) {
  const previousFetch = globalThis.fetch;
  const previousNow = Date.now;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousApiKey = process.env.TMDB_API_KEY;
  const previousBearer = process.env.TMDB_BEARER_TOKEN;
  const calls = [];
  clearTmdbRequestCache();
  globalThis.fetch = currentProductFixtureFetch(calls, fixtureOptions);
  if (clock) {
    Date.now = () => {
      const value = Math.min(clock.calls * Number(clock.stepMs || 10), Number(clock.maximumMs ?? Infinity));
      clock.calls += 1;
      clock.maximumObserved = Math.max(Number(clock.maximumObserved || 0), value);
      return value;
    };
  }
  process.env.NODE_ENV = nodeEnv;
  process.env.TMDB_API_KEY = "deterministic-fixture-key";
  delete process.env.TMDB_BEARER_TOKEN;
  try {
    return { calls, payload: await operation() };
  } finally {
    clearTmdbRequestCache();
    globalThis.fetch = previousFetch;
    Date.now = previousNow;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousApiKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousApiKey;
    if (previousBearer === undefined) delete process.env.TMDB_BEARER_TOKEN;
    else process.env.TMDB_BEARER_TOKEN = previousBearer;
  }
}

function currentProductSnapshot(payload) {
  const { currentProductObservability, ...productDiagnostics } = payload.diagnostics;
  return {
    results: payload.results.map((item) => ({
      tmdbId: item.tmdbId,
      score: item.scoreDetail?.finalScore ?? null,
    })),
    relaxedResults: payload.relaxedResults.map((item) => ({
      tmdbId: item.tmdbId,
      score: item.scoreDetail?.finalScore ?? null,
    })),
    diagnostics: productDiagnostics,
  };
}

test("shared genre contract keeps movie and TV SF semantics distinct", () => {
  assert.deepEqual(genreIdsForFilters(["genre-sf"], "movie"), [878]);
  assert.deepEqual(genreIdsForFilters(["genre-sf"], "tv"), [10765]);
  assert.deepEqual(genreIdsForFilters(["genre-sf-fantasy"], "movie"), [878, 14]);
  assert.deepEqual(genreIdsForFilters(["genre-sf-fantasy"], "tv"), [10765]);
  assert.equal(candidateGenreMatchDetail({ mediaType: "tv", genreIds: [10765] }, ["genre-sf"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail({ mediaType: "tv", genreIds: [10765], keywords: ["space"] }, ["genre-sf"]).genreMatchMode, "semantic-specialized");
  assert.equal(candidateGenreMatchDetail({ mediaType: "tv", genreIds: [10765] }, ["genre-sf-fantasy"]).genreMatchMode, "provider-combined");
  assert.equal(candidateGenreMatchDetail({ mediaType: "tv", genreIds: [16] }, ["genre-sf"]).genreMatched, false);
});

test("TV thriller needs provider or semantic evidence, not plain drama", () => {
  assert.equal(candidateGenreMatchDetail({ mediaType: "tv", genreIds: [18] }, ["genre-thriller"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail({ mediaType: "tv", genreIds: [80, 18] }, ["genre-thriller"]).genreMatchMode, "provider-exact");
  const semantic = candidateGenreMatchDetail({
    mediaType: "tv",
    genreIds: [10759, 18],
    keywords: ["investigation", "conspiracy"],
  }, ["genre-thriller"]);
  assert.equal(semantic.genreMatchMode, "semantic-specialized");
  assert.equal(semantic.semanticGenreMatched, true);
});

test("genre options keep the Founder top eight and remove duplicates", () => {
  const options = prioritizeGenreOptions([
    ["genre-sf-fantasy", "SF·판타지"],
    ["genre-horror", "공포"],
    ["genre-action", "액션"],
    ["genre-sf", "SF"],
    ["genre-drama", "드라마"],
    ["genre-romance", "로맨스"],
    ["genre-mystery", "미스터리"],
    ["genre-thriller", "스릴러"],
    ["genre-comedy", "코미디"],
    ["genre-action", "액션 중복"],
  ]);
  assert.deepEqual(options.slice(0, 8).map(([value]) => value), GENRE_TOP_EIGHT_VALUES);
  assert.equal(options.filter(([value]) => value === "genre-action").length, 1);
});

test("autocomplete confirmation preserves the typed language and skips search", async () => {
  const selection = applySuggestionSelection("home alone", {
    providerContentId: 201,
    mediaType: "movie",
    type: "movie",
    title: "나 홀로 집에",
    originalTitle: "Home Alone",
  });
  assert.equal(selection.inputValue, "home alone");

  const body = buildSeedRequestPayload({
    titles: [selection.inputValue],
    confirmedSeeds: { 0: selection.confirmedSeed },
    contentTypes: ["movie"],
  });
  assert.equal(body.titles.length, 0);
  assert.equal(body.seeds[0].inputTitle, "home alone");
  assert.equal(body.seeds[0].tmdbId, 201);

  const fixture = createFixtureFetch();
  const context = createRecommendationContextFactory(fixture);
  const payload = await recommendSeedsTmdb({ ...body, requestContextFactory: context.factory });
  assert.equal(fixture.calls.some((call) => call.path === "/search/multi"), false);
  assert.equal(payload.searchSkippedSeedCount, 1);
  assert.equal(payload.confirmedSeedCount, 1);
});

test("confirmed seed indexes remain aligned when an earlier input is blank", () => {
  const request = buildSeedRequestPayload({
    titles: ["", "home alone", ""],
    confirmedSeeds: {
      1: {
        inputTitle: "home alone",
        tmdbId: 201,
        mediaType: "movie",
        resolvedTitle: "나 홀로 집에",
        originalTitle: "Home Alone",
      },
    },
    contentTypes: ["movie"],
  });
  assert.equal(request.titles.length, 0);
  assert.equal(request.seeds.length, 1);
  assert.equal(request.seeds[0].tmdbId, 201);
});

test("translated confirmed aliases resolve to one TMDB work", async () => {
  const fixture = createFixtureFetch();
  const context = createRecommendationContextFactory(fixture);
  const payload = await recommendSeedsTmdb({
    seeds: ["나 홀로 집에", "Home Alone", "home alone"].map((inputTitle) => ({
      inputTitle,
      tmdbId: 201,
      mediaType: "movie",
      resolvedTitle: "나 홀로 집에",
      originalTitle: "Home Alone",
    })),
    contentTypes: ["movie"],
    requestContextFactory: context.factory,
  });
  assert.equal(payload.requestedSeedCount, 2);
  assert.equal(payload.rawInputCount, 3);
  assert.equal(payload.uniqueInputAliasCount, 2);
  assert.equal(payload.uniqueResolvedWorkCount, 1);
  assert.equal(payload.processedSeedCount, 1);
  assert.deepEqual(payload.seedResults[0].inputAliases, ["나 홀로 집에", "Home Alone", "home alone"]);
  assert.equal(fixture.calls.filter((call) => call.path.endsWith("/recommendations")).length, 1);
});

test("unused recommendation reservations are recycled for later valid titles", async () => {
  const fixture = createFixtureFetch();
  const context = createRecommendationContextFactory(fixture);
  const payload = await recommendSeedsTmdb({
    titles: ["나홀로성에", "나홀로벽에", "나홀로우주에", "나홀로아프리카에", "인터스텔라", "마션"],
    contentTypes: ["movie"],
    requestContextFactory: context.factory,
  });
  assert.equal(payload.unresolvedSeedCount, 4);
  assert.equal(payload.processedSeedCount, 2);
  assert.equal(payload.deferredSeedCount, 0);
  assert.ok(payload.results.length > 0);
  assert.ok(payload.diagnostics.listRequestsUsed <= 8);
  assert.ok(payload.diagnostics.requestsUsed <= 24);
  assert.equal(payload.diagnostics.requestContextCount, 1);
  assert.ok(payload.recyclableListBudgetUsed > 0);
  assert.equal(payload.eligibleLaterSeedDeferredCount, 0);
  assert.equal(payload.rawInputCount, 6);
  assert.equal(payload.uniqueInputAliasCount, 6);
});

test("seed coverage and empty states explain the actual state", () => {
  assert.equal(
    buildSeedCoverageMessage({ requestedSeedCount: 10, processedSeedCount: 4 }),
    "입력한 10개 작품 중 4개를 이번 추천에 반영했습니다.",
  );
  assert.equal(
    buildSeedCoverageMessage({ rawInputCount: 3, processedWorkCount: 1, uniqueResolvedWorkCount: 1, unresolvedSeedCount: 0 }),
    "입력한 3개 제목을 1개 작품으로 확인해 추천에 반영했습니다.",
  );
  assert.equal(
    resolveEmptyStateMessage({ recommendationStatus: "empty", selectedTypes: ["drama"] }),
    "선택한 조건에 맞는 작품을 찾지 못했습니다. 장르나 국가 조건을 조금 넓혀 보세요.",
  );
  assert.equal(
    resolveEmptyStateMessage({ recommendationStatus: "empty", selectedTypes: [] }),
    "영화, 드라마, 애니 중 하나 이상 선택해 주세요.",
  );
  assert.equal(
    resolveEmptyStateMessage({
      recommendationStatus: "empty",
      selectedTypes: ["movie"],
      hasSeedInput: true,
      processedSeedCount: 0,
      unresolvedSeedCount: 2,
    }),
    "입력한 작품을 찾지 못했습니다. 작품 제목을 확인하거나 자동완성에서 작품을 선택해 주세요.",
  );
});

test("active-base QA observability preserves Product output, request sequence, policy, and clock reads", async () => {
  const baselineClock = { calls: 0 };
  const observedClock = { calls: 0 };
  const baseline = await withCurrentProductRuntime(
    () => discoverTmdb({ contentTypes: ["drama"], limit: 12 }),
    { clock: baselineClock },
  );
  const observed = await withCurrentProductRuntime(
    () => discoverTmdb({ contentTypes: ["drama"], limit: 12, qaObservability: true }),
    { clock: observedClock },
  );

  assert.deepEqual(currentProductSnapshot(observed.payload), currentProductSnapshot(baseline.payload));
  assert.deepEqual(observed.calls, baseline.calls);
  assert.equal(observedClock.calls, baselineClock.calls);
  assert.equal(observed.calls.filter((path) => path === "/3/discover/tv").length, 1);
  assert.equal(observed.calls.filter((path) => /^\/3\/tv\/\d+$/.test(path)).length, 16);
  assert.deepEqual({
    total: observed.payload.diagnostics.requestBudget,
    list: observed.payload.diagnostics.listRequestBudget,
    detail: observed.payload.diagnostics.detailRequestBudget,
    concurrency: observed.payload.diagnostics.concurrencyLimit,
    retries: TMDB_REQUEST_LIMITS.retries,
    timeout: observed.payload.diagnostics.maximumFetchTimeoutMs,
    deadline: observed.payload.diagnostics.recommendationDeadlineMs,
  }, {
    total: 24,
    list: 8,
    detail: 16,
    concurrency: 4,
    retries: 2,
    timeout: 8_000,
    deadline: 15_000,
  });
  assert.equal(baseline.payload.diagnostics.currentProductObservability, undefined);

  const evidence = validateTmdbObservabilityEvidence(observed.payload.diagnostics.currentProductObservability);
  assert.ok(evidence.events.length <= TMDB_OBSERVABILITY_LIMITS.maximumEventCount);
  assert.ok(evidence.events.length <= TMDB_OBSERVABILITY_ACCEPTED_WORST_CASE.eventCount);
  assert.equal(evidence.schemaVersion, "myott.current-product-observability.v3");
  assert.deepEqual(
    evidence.events.filter((event) => event.type === "stage-summary").map((event) => event.stage),
    TMDB_OBSERVABILITY_STAGES,
  );
  assert.equal(evidence.events.some((event) => Object.hasOwn(event, "elapsedMs")), false);
  assert.equal(evidence.summary.requestAttemptCount, observed.payload.diagnostics.requestsUsed);
  assert.equal(evidence.summary.requestAttemptCount,
    evidence.summary.requestCompleteCount + evidence.summary.requestFailureCount);
  assert.equal(evidence.summary.candidatePoolSummaryCount, 1);
  assert.equal(evidence.summary.candidateLineageCount, 72);
  assert.equal(evidence.summary.selectedCandidateCount + evidence.summary.excludedCandidateCount, 72);
  assert.equal(new Set(
    evidence.events.filter((event) => event.type === "candidate-lineage").map((event) => event.candidateId),
  ).size, 72);
  assert.equal(/https?:\/\/|api_key|authorization|bearer|\?/.test(JSON.stringify(evidence)), false);
});

test("lineage reconstructs the earliest below-eight Horror transition from finalized evidence only", async () => {
  const run = await withCurrentProductRuntime(
    () => discoverTmdb({
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: 12,
      qaObservability: true,
    }),
    { fixtureOptions: { count: 12, horrorPassCount: 7 } },
  );
  const evidence = validateTmdbObservabilityEvidence(run.payload.diagnostics.currentProductObservability);
  const pool = evidence.events.find((event) => event.type === "candidate-pool-summary");
  const lineage = evidence.events.filter((event) => event.type === "candidate-lineage");
  const transitions = [
    { stage: "bounded-candidate-arrival", count: pool.boundedCount },
    { stage: "pre-detail-semantic", count: lineage.filter((item) => item.preDetailSemantic === "pass").length },
    {
      stage: "pre-detail-country",
      count: lineage.filter((item) => item.preDetailSemantic === "pass" && item.preDetailCountry === "pass").length,
    },
    {
      stage: "pre-detail-content",
      count: lineage.filter((item) => item.preDetailSemantic === "pass" && item.preDetailCountry === "pass" &&
        item.preDetailContentType === "pass").length,
    },
    {
      stage: "hard-filter",
      count: lineage.filter((item) => item.preDetailSemantic === "pass" && item.hardFilterDecision === "pass").length,
    },
    { stage: "primary-final-selection", count: lineage.filter((item) => item.finalPath === "primary").length },
  ];
  const earliestBelowEight = transitions.find((transition) => transition.count < 8);
  const primaryIds = lineage
    .filter((item) => item.finalPath === "primary" && item.finalDecision === "selected")
    .sort((left, right) => left.rank - right.rank)
    .map((item) => item.candidateId);
  const resultIds = run.payload.results.map((item) => `tmdb:${item.mediaType}:${item.tmdbId}`);

  assert.deepEqual(earliestBelowEight, { stage: "pre-detail-semantic", count: 7 });
  assert.equal(pool.recallStageCount, 3);
  assert.equal(pool.arrivalCount, pool.distinctCount + pool.duplicateCount);
  assert.equal(pool.distinctCount, pool.boundedCount + pool.poolExcludedCount);
  assert.equal(lineage.length, 12);
  assert.equal(run.payload.results.length, 7);
  assert.deepEqual(primaryIds, resultIds);
  assert.equal(lineage.filter((item) => item.preDetailSemantic === "fail").length, 5);
  assert.equal(lineage.filter((item) => item.detailState === "selected-enriched").length, 12);
});

test("QA lineage adds no Product-policy clock read across an advancing 15-second window", async () => {
  const baselineClock = { calls: 0, stepMs: 1_000, maximumMs: 14_999 };
  const observedClock = { calls: 0, stepMs: 1_000, maximumMs: 14_999 };
  const baseline = await withCurrentProductRuntime(
    () => discoverTmdb({ contentTypes: ["drama"], limit: 12 }),
    { clock: baselineClock },
  );
  const observed = await withCurrentProductRuntime(
    () => discoverTmdb({ contentTypes: ["drama"], limit: 12, qaObservability: true }),
    { clock: observedClock },
  );

  assert.deepEqual(currentProductSnapshot(observed.payload), currentProductSnapshot(baseline.payload));
  assert.deepEqual(observed.calls, baseline.calls);
  assert.equal(observedClock.calls, baselineClock.calls);
  assert.equal(observedClock.maximumObserved, 14_999);
  assert.equal(baselineClock.maximumObserved, 14_999);
});

test("QA observability is disabled in production and rejects external context binding before fetch", async () => {
  const production = await withCurrentProductRuntime(
    () => discoverTmdb({ contentTypes: ["drama"], limit: 12, qaObservability: true }),
    { nodeEnv: "production" },
  );
  assert.equal(production.payload.diagnostics.currentProductObservability, undefined);

  let fetchCount = 0;
  const previousFetch = globalThis.fetch;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousApiKey = process.env.TMDB_API_KEY;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return tmdbFixtureResponse(200);
  };
  process.env.NODE_ENV = "test";
  process.env.TMDB_API_KEY = "deterministic-fixture-key";
  try {
    await assert.rejects(
      discoverTmdb({
        contentTypes: ["drama"],
        qaObservability: true,
        requestContext: {},
      }),
      (error) => error instanceof TmdbObservabilityIntegrityError &&
        error.code === "TMDB_OBSERVABILITY_INTEGRITY_FAILED" &&
        error.stage === "context-binding",
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousApiKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousApiKey;
  }
  assert.equal(fetchCount, 0);
});

test("current Product observability identity is internal and caller IDs are not authoritative", async () => {
  const first = await withCurrentProductRuntime(() => discoverTmdb({
    contentTypes: ["drama"],
    limit: 12,
    qaObservability: true,
    requestId: "caller-request-id",
    runId: "caller-run-id",
  }));
  const second = await withCurrentProductRuntime(() => discoverTmdb({
    contentTypes: ["drama"],
    limit: 12,
    qaObservability: true,
    requestId: "caller-request-id",
    runId: "caller-run-id",
  }));
  const firstEvidence = first.payload.diagnostics.currentProductObservability;
  const secondEvidence = second.payload.diagnostics.currentProductObservability;

  assert.notEqual(firstEvidence.sessionId, secondEvidence.sessionId);
  assert.equal(JSON.stringify(firstEvidence).includes("caller-request-id"), false);
  assert.equal(JSON.stringify(firstEvidence).includes("caller-run-id"), false);
  assert.equal(TMDB_REQUEST_LIMITS.total, 24);
  assert.equal(TMDB_TIME_LIMITS.recommendationDeadlineMs, 15_000);
});

test("provider exposes only the QA Boolean and public context creation cannot activate an observer", async () => {
  let injectedContextCalls = 0;
  const run = await withCurrentProductRuntime(() => tmdbProvider.getRecommendations({
    contentTypes: ["drama"],
    limit: 12,
    qaDiagnostics: true,
    observer: { callerControlled: true },
    adapter: { callerControlled: true },
    requestContext: {
      get() {
        injectedContextCalls += 1;
      },
    },
  }));
  assert.ok(run.payload.diagnostics.currentProductObservability);
  assert.equal(injectedContextCalls, 0);

  const session = createTmdbObservabilitySession();
  assert.throws(
    () => createRequestContext({ observer: session }),
    (error) => error?.code === "TMDB_OBSERVABILITY_INTEGRITY_FAILED" && error?.stage === "context-binding",
  );
});
