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

function currentProductCandidates(count = 72, { horrorPassCount = null, idOffset = 0 } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const id = 80_001 + idOffset + index;
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

function currentProductCandidate(id, {
  genreIds = [18],
  horrorSemantic = false,
  detailKeywords = [],
  detailOverview = "",
} = {}) {
  const title = `Synthetic Candidate ${id}`;
  return {
    id,
    name: title,
    original_name: title,
    first_air_date: "2024-01-01",
    genre_ids: genreIds,
    origin_country: ["US"],
    overview: horrorSemantic ? "A horror haunting with an occult ghost." : "A quiet character drama.",
    detailKeywords,
    detailOverview,
    popularity: 500,
    vote_average: 7.5,
    vote_count: 500,
  };
}

function currentProductFixtureFetch(calls, fixtureOptions = {}) {
  const candidates = currentProductCandidates(fixtureOptions.count || 72, fixtureOptions);
  const additionalHorrorByPage = new Map(
    Object.entries(fixtureOptions.additionalHorrorByPage || {}).map(([page, count]) => [
      Number(page),
      currentProductCandidates(Number(count), {
        horrorPassCount: Number(count),
        idOffset: Number(page) * 100,
      }),
    ]),
  );
  const candidatesByGenreAndPage = new Map(Object.entries(fixtureOptions.candidatesByGenreAndPage || {}));
  const allCandidates = [
    ...new Map(
      [
        ...candidates,
        ...[...additionalHorrorByPage.values()].flat(),
        ...[...candidatesByGenreAndPage.values()].flat(),
      ]
        .map((candidate) => [candidate.id, candidate]),
    ).values(),
  ];
  return async (rawUrl) => {
    const url = new URL(rawUrl);
    calls.push(url.pathname);
    fixtureOptions.requestLog?.push({
      path: url.pathname,
      page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : null,
      sortBy: url.searchParams.get("sort_by") || "",
      withGenres: url.searchParams.get("with_genres") || "",
      withOriginCountry: url.searchParams.get("with_origin_country") || "",
      withoutGenres: url.searchParams.get("without_genres") || "",
      includeAdult: url.searchParams.get("include_adult") || "",
    });
    if (["/3/discover/tv", "/3/discover/movie"].includes(url.pathname)) {
      const page = Number(url.searchParams.get("page") || 1);
      const requestKey = `${url.searchParams.get("with_genres") || ""}:${page}`;
      const pageCandidates = candidatesByGenreAndPage.has(requestKey)
        ? candidatesByGenreAndPage.get(requestKey)
        : page >= 3
          ? [...(additionalHorrorByPage.get(page) || []), ...candidates]
          : candidates;
      return tmdbFixtureResponse(200, {
        page,
        total_results: allCandidates.length,
        results: pageCandidates,
      });
    }
    const detailMatch = url.pathname.match(/^\/3\/(?:tv|movie)\/(\d+)$/);
    assert.ok(detailMatch, `unexpected current Product fixture path: ${url.pathname}`);
    const id = Number(detailMatch[1]);
    const candidate = allCandidates.find((item) => item.id === id);
    assert.ok(candidate, `unknown current Product fixture candidate: ${id}`);
    return tmdbFixtureResponse(200, {
      ...candidate,
      overview: candidate.detailOverview || candidate.overview,
      genres: candidate.genre_ids.map((id) => ({ id, name: id === 9648 ? "Mystery" : "Drama" })),
      episode_run_time: [45],
      production_countries: [{ iso_3166_1: "US" }],
      keywords: {
        results: candidate.detailKeywords?.length
          ? candidate.detailKeywords.map((name, index) => ({ id: candidate.id * 10 + index, name }))
          : candidate.overview.startsWith("A horror")
            ? [{ id: candidate.id, name: "horror" }]
            : [],
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

test("Horror TV exact recall adds true semantic candidates within the bounded page plan", async () => {
  const baselineCandidates = currentProductCandidates(12, { horrorPassCount: 7 })
    .map((item) => ({ ...item, mediaType: "tv" }));
  const baselineExact = baselineCandidates
    .filter((item) => candidateGenreMatchDetail(item, ["genre-horror"]).genreMatched);
  const baselineRelaxed = baselineCandidates
    .filter((item) => !candidateGenreMatchDetail(item, ["genre-horror"]).genreMatched);
  const requestLog = [];
  const run = await withCurrentProductRuntime(
    () => discoverTmdb({
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: 12,
      qaObservability: true,
    }),
    {
      fixtureOptions: {
        count: 12,
        horrorPassCount: 7,
        additionalHorrorByPage: { 3: 1 },
        requestLog,
      },
    },
  );
  const evidence = validateTmdbObservabilityEvidence(run.payload.diagnostics.currentProductObservability);
  const pool = evidence.events.find((event) => event.type === "candidate-pool-summary");
  const lineage = evidence.events.filter((event) => event.type === "candidate-lineage");
  const discoverRequests = requestLog.filter((request) => request.path === "/3/discover/tv");
  const primaryIds = lineage
    .filter((item) => item.finalPath === "primary" && item.finalDecision === "selected")
    .sort((left, right) => left.rank - right.rank)
    .map((item) => item.candidateId);
  const resultIds = run.payload.results.map((item) => `tmdb:${item.mediaType}:${item.tmdbId}`);
  const mysteryOnlyIds = new Set(baselineRelaxed.map((item) => `tmdb:tv:${item.id}`));
  const resultTitles = run.payload.results.map((item) => item.title.trim().toLowerCase());
  const resultFranchises = run.payload.results.map((item) => item.franchiseKey).filter(Boolean);
  const newExact = run.payload.results.find((item) => item.tmdbId === 80_301);

  assert.equal(baselineExact.length, 7);
  assert.equal(baselineRelaxed.length, 5);
  assert.equal(pool.recallStageCount, 8);
  assert.equal(pool.arrivalCount, pool.distinctCount + pool.duplicateCount);
  assert.equal(pool.distinctCount, pool.boundedCount + pool.poolExcludedCount);
  assert.equal(pool.boundedCount, 13);
  assert.equal(lineage.length, 13);
  assert.equal(lineage.filter((item) => item.preDetailSemantic === "pass").length, 8);
  assert.equal(lineage.filter((item) => item.preDetailSemantic === "fail").length, 5);
  assert.equal(run.payload.results.length, 8);
  assert.deepEqual(primaryIds, resultIds);
  assert.ok(run.payload.results.length <= 12);
  assert.ok(newExact);
  assert.equal(newExact.genreMatchMode, "semantic-specialized");
  assert.ok(newExact.semanticGenreReasons.some((reason) => reason.startsWith("genre-horror:")));
  assert.equal(resultIds.some((id) => mysteryOnlyIds.has(id)), false);
  assert.ok(run.payload.results.every((item) => item.resultTier === "exact"));
  assert.ok(run.payload.results.every((item) => item.countryCodes.includes("US")));
  assert.ok(run.payload.results.every((item) => item.mediaType === "tv" && item.type === "drama"));
  assert.equal(new Set(resultIds).size, resultIds.length);
  assert.equal(new Set(resultTitles).size, resultTitles.length);
  assert.equal(new Set(resultFranchises).size, resultFranchises.length);
  assert.equal(lineage.filter((item) => item.detailState === "selected-enriched").length, 13);
  assert.deepEqual(discoverRequests.map((request) => request.withGenres), [
    "9648", "9648", "9648", "10765", "10765", "80", "80", "18",
  ]);
  assert.deepEqual(discoverRequests.map((request) => request.page), [1, 2, 3, 1, 2, 1, 2, 1]);
  assert.ok(discoverRequests.every((request) => request.sortBy === "popularity.desc"));
  assert.ok(discoverRequests.every((request) => request.withOriginCountry === "US"));
  assert.ok(discoverRequests.every((request) => request.withoutGenres === "16"));
  assert.ok(discoverRequests.every((request) => request.includeAdult === "false"));
  assert.equal(discoverRequests.filter((request) => request.page > 7).length, 0);
  assert.equal(run.payload.diagnostics.listRequestsUsed, 8);
  assert.equal(run.payload.diagnostics.detailRequestsUsed, 13);
  assert.equal(run.payload.diagnostics.requestsUsed, 21);
});

test("Horror TV bounded pool preserves unique alternate-source stage opportunity", async () => {
  const requestLog = [];
  const alternateCandidates = {
    "10765:1": [currentProductCandidate(90_101, { genreIds: [10765] })],
    "10765:2": [currentProductCandidate(90_102, { genreIds: [10765] })],
    "80:1": [currentProductCandidate(90_201, { genreIds: [80] })],
    "80:2": [currentProductCandidate(90_202, { genreIds: [80] })],
    "18:1": [currentProductCandidate(90_301, { genreIds: [18] })],
  };
  const run = await withCurrentProductRuntime(
    () => discoverTmdb({
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: 12,
      qaObservability: true,
    }),
    {
      fixtureOptions: {
        count: 72,
        horrorPassCount: 0,
        candidatesByGenreAndPage: alternateCandidates,
        requestLog,
      },
    },
  );
  const evidence = validateTmdbObservabilityEvidence(run.payload.diagnostics.currentProductObservability);
  const pool = evidence.events.find((event) => event.type === "candidate-pool-summary");
  const lineage = evidence.events.filter((event) => event.type === "candidate-lineage");
  const representedStages = new Set(lineage.map((item) => item.arrivalStage));

  assert.equal(pool.boundedCount, 72);
  assert.ok(pool.distinctCount > pool.boundedCount);
  assert.ok(representedStages.has("exact-breadth-page-3"));
  assert.ok(representedStages.has("exact-breadth-page-4"));
  assert.ok(representedStages.has("exact-breadth-page-5"));
  assert.ok(representedStages.has("exact-breadth-page-6"));
  assert.ok(representedStages.has("exact-breadth-page-7"));
  assert.deepEqual(
    requestLog.filter((request) => request.path === "/3/discover/tv").map((request) => [request.withGenres, request.page]),
    [["9648", 1], ["9648", 2], ["9648", 3], ["10765", 1], ["10765", 2], ["80", 1], ["80", 2], ["18", 1]],
  );
});

test("Horror TV bounded pool does not manufacture representation for duplicate-only late stages", async () => {
  const run = await withCurrentProductRuntime(
    () => discoverTmdb({
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: 12,
      qaObservability: true,
    }),
    { fixtureOptions: { count: 72, horrorPassCount: 0 } },
  );
  const evidence = validateTmdbObservabilityEvidence(run.payload.diagnostics.currentProductObservability);
  const lineage = evidence.events.filter((event) => event.type === "candidate-lineage");

  assert.equal(lineage.length, 72);
  assert.equal(lineage.some((item) => item.arrivalStage === "exact-breadth-page-7"), false);
});

test("Horror TV diversification completes its bounded eight-request plan after reaching the exact target", async () => {
  const requestLog = [];
  const run = await withCurrentProductRuntime(
    () => discoverTmdb({
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: 12,
    }),
    {
      fixtureOptions: {
        count: 12,
        horrorPassCount: 7,
        additionalHorrorByPage: { 3: 8 },
        requestLog,
      },
    },
  );
  const discoverRequests = requestLog.filter((request) => request.path === "/3/discover/tv");

  assert.deepEqual(discoverRequests.map((request) => request.withGenres), [
    "9648", "9648", "9648", "10765", "10765", "80", "80", "18",
  ]);
  assert.deepEqual(discoverRequests.map((request) => request.page), [1, 2, 3, 1, 2, 1, 2, 1]);
  assert.equal(run.payload.diagnostics.listRequestsUsed, 8);
  assert.ok(run.payload.diagnostics.exactAfterDetail >= 15);
  assert.ok(run.payload.diagnostics.detailRequestsUsed <= 16);
  assert.ok(run.payload.diagnostics.requestsUsed <= 24);
});

test("Horror TV retrieval lenses do not replace independent candidate semantic qualification", async () => {
  const mysteryOnly = currentProductCandidate(91_001, { genreIds: [9648] });
  const sfLensDecoy = currentProductCandidate(91_002, { genreIds: [18] });
  const crimeLensDecoy = currentProductCandidate(91_003, { genreIds: [10765] });
  const dramaLensDecoy = currentProductCandidate(91_004, { genreIds: [80] });
  const alternateQualified = currentProductCandidate(91_005, {
    genreIds: [9648, 10765],
    horrorSemantic: true,
  });
  const alternateWithoutProviderEvidence = currentProductCandidate(91_006, {
    genreIds: [80],
    horrorSemantic: true,
  });
  const alternateWithoutSemanticEvidence = currentProductCandidate(91_007, {
    genreIds: [9648, 18],
  });
  const requestLog = [];
  const run = await withCurrentProductRuntime(
    () => discoverTmdb({
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: 12,
    }),
    {
      fixtureOptions: {
        count: 1,
        horrorPassCount: 0,
        candidatesByGenreAndPage: {
          "9648:1": [mysteryOnly],
          "9648:2": [mysteryOnly],
          "9648:3": [mysteryOnly],
          "10765:1": [sfLensDecoy],
          "10765:2": [alternateQualified],
          "80:1": [crimeLensDecoy],
          "80:2": [alternateWithoutProviderEvidence],
          "18:1": [dramaLensDecoy, alternateWithoutSemanticEvidence],
        },
        requestLog,
      },
    },
  );
  const resultIds = run.payload.results.map((item) => item.tmdbId);
  const diagnostics = [...run.payload.diagnostics.candidates, ...run.payload.diagnostics.exclusions];
  const diagnosticFor = (candidate) => diagnostics.find((item) => item.tmdbId === candidate.id);

  assert.deepEqual(
    requestLog.filter((request) => request.path === "/3/discover/tv").map((request) => request.withGenres),
    ["9648", "9648", "9648", "10765", "10765", "80", "80", "18"],
  );
  assert.deepEqual(diagnosticFor(sfLensDecoy).genreIds, [18]);
  assert.deepEqual(diagnosticFor(crimeLensDecoy).genreIds, [10765]);
  assert.deepEqual(diagnosticFor(dramaLensDecoy).genreIds, [80]);
  assert.equal(diagnosticFor(sfLensDecoy).genreIds.includes(10765), false);
  assert.equal(diagnosticFor(crimeLensDecoy).genreIds.includes(80), false);
  assert.equal(diagnosticFor(dramaLensDecoy).genreIds.includes(18), false);
  assert.equal(candidateGenreMatchDetail({ ...sfLensDecoy, mediaType: "tv" }, ["genre-horror"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail({ ...crimeLensDecoy, mediaType: "tv" }, ["genre-horror"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail({ ...dramaLensDecoy, mediaType: "tv" }, ["genre-horror"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail({ ...mysteryOnly, mediaType: "tv" }, ["genre-horror"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail({ ...alternateQualified, mediaType: "tv" }, ["genre-horror"]).genreMatched, true);
  assert.equal(candidateGenreMatchDetail({ ...alternateWithoutProviderEvidence, mediaType: "tv" }, ["genre-horror"]).genreMatched, true);
  assert.equal(diagnosticFor(alternateWithoutProviderEvidence).genreMatchMode, "semantic-specialized");
  assert.equal(diagnosticFor(alternateWithoutProviderEvidence).exclusionReason, "duplicate-franchise");
  assert.deepEqual(resultIds, [alternateQualified.id]);
  assert.ok(run.payload.results.every((item) => item.genreMatchMode === "semantic-specialized"));
  assert.ok(run.payload.results.every((item) => (
    item.semanticGenreReasons.some((reason) => reason.startsWith("genre-horror:"))
  )));
  assert.equal(resultIds.includes(alternateWithoutSemanticEvidence.id), false);
});

test("Horror TV non-9648 detail enrichment closes the circular gate without weakening ambiguity", async () => {
  const detailQualified = currentProductCandidate(92_001, {
    genreIds: [18],
    detailKeywords: ["zombie"],
  });
  const detailAmbiguous = currentProductCandidate(92_002, {
    genreIds: [80],
    detailKeywords: ["supernatural", "monster", "dark"],
  });
  const requestLog = [];
  const run = await withCurrentProductRuntime(
    () => discoverTmdb({
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: 12,
    }),
    {
      fixtureOptions: {
        count: 1,
        horrorPassCount: 0,
        candidatesByGenreAndPage: {
          "10765:1": [detailQualified],
          "80:1": [detailAmbiguous],
        },
        requestLog,
      },
    },
  );
  const resultIds = run.payload.results.map((item) => item.tmdbId);
  const detailPaths = requestLog.filter((request) => /^\/3\/tv\/\d+$/.test(request.path)).map((request) => request.path);

  assert.ok(detailPaths.includes(`/3/tv/${detailQualified.id}`));
  assert.ok(detailPaths.includes(`/3/tv/${detailAmbiguous.id}`));
  assert.ok(resultIds.includes(detailQualified.id));
  assert.equal(resultIds.includes(detailAmbiguous.id), false);
  assert.equal(run.payload.results.find((item) => item.tmdbId === detailQualified.id)?.genreMatchMode, "semantic-specialized");
  assert.ok(run.payload.diagnostics.detailRequestsUsed <= 16);
  assert.ok(run.payload.diagnostics.requestsUsed <= 24);
});

test("Horror TV qualification is invariant across retrieval lenses for identical candidate evidence", async () => {
  const lenses = ["9648:1", "10765:1", "80:1", "18:1"];
  const titles = ["Ash Hollow", "Night Signal", "Red Chapel", "Winter Grave"];
  const candidates = lenses.map((_, index) => ({
    ...currentProductCandidate(93_001 + index, {
      genreIds: [18],
      horrorSemantic: true,
    }),
    name: titles[index],
    original_name: titles[index],
  }));
  const run = await withCurrentProductRuntime(
    () => discoverTmdb({
      filters: ["country-us", "genre-horror"],
      contentTypes: ["drama"],
      limit: 12,
    }),
    {
      fixtureOptions: {
        count: 1,
        horrorPassCount: 0,
        candidatesByGenreAndPage: Object.fromEntries(
          lenses.map((lens, index) => [lens, [candidates[index]]]),
        ),
      },
    },
  );
  const resultIds = new Set(run.payload.results.map((item) => item.tmdbId));

  candidates.forEach((candidate) => assert.ok(resultIds.has(candidate.id)));
  assert.ok(run.payload.results.every((item) => item.genreMatchMode === "semantic-specialized"));
});

test("Horror TV breadth stages do not expand representative non-target recall plans", async () => {
  const scenarios = [
    {
      filters: ["country-us", "genre-romance"],
      contentTypes: ["drama"],
      endpoint: "/3/discover/tv",
      expected: [["18", 1, "popularity.desc"], ["18", 1, "vote_average.desc"], ["18", 2, "popularity.desc"]],
    },
    {
      filters: ["country-us", "genre-sf"],
      contentTypes: ["drama"],
      endpoint: "/3/discover/tv",
      expected: [["10765", 1, "popularity.desc"], ["10765", 1, "vote_average.desc"], ["10765", 2, "popularity.desc"]],
    },
    {
      filters: ["country-us", "genre-thriller"],
      contentTypes: ["drama"],
      endpoint: "/3/discover/tv",
      expected: [
        ["80", 1, "popularity.desc"], ["9648", 1, "popularity.desc"],
        ["80", 1, "vote_average.desc"], ["9648", 1, "vote_average.desc"],
        ["80", 2, "popularity.desc"], ["9648", 2, "popularity.desc"],
        ["80", 1, "popularity.desc"], ["9648", 1, "popularity.desc"],
      ],
    },
    {
      filters: ["country-us", "genre-horror"],
      contentTypes: ["movie"],
      endpoint: "/3/discover/movie",
      expected: [["27", 1, "popularity.desc"], ["27", 1, "vote_average.desc"], ["27", 2, "popularity.desc"]],
    },
  ];

  for (const scenario of scenarios) {
    const requestLog = [];
    await withCurrentProductRuntime(
      () => discoverTmdb({ ...scenario, limit: 12 }),
      { fixtureOptions: { count: 1, requestLog } },
    );
    const discoverRequests = requestLog.filter((request) => request.path === scenario.endpoint);
    assert.equal(discoverRequests.length, scenario.expected.length);
    assert.deepEqual(
      discoverRequests.map((request) => [request.withGenres, request.page, request.sortBy]),
      scenario.expected,
    );
    assert.ok(discoverRequests.every((request) => request.path === scenario.endpoint));
  }
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
