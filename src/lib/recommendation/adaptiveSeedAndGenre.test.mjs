import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  diagnoseTmdbCandidateUniverse,
  recommendSeedsTmdb,
} from "../../../lib/tmdb.js";
import {
  clearTmdbRequestCache,
  createTmdbRequestContext,
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
  createTmdbObservabilitySession,
  finalizeTmdbObservabilitySession,
} from "./qa/tmdbObservability.js";

beforeEach(() => clearTmdbRequestCache());

function diagnosticUniverse() {
  return Array.from({ length: 51 }, (_, index) => {
    const id = 30_001 + index;
    const mediaType = index < 2 ? "tv" : "movie";
    return {
      id,
      media_type: mediaType,
      ...(mediaType === "tv"
        ? {
            name: `Diagnostic Candidate ${id}`,
            original_name: `Diagnostic Candidate ${id}`,
            first_air_date: "2020-01-01",
          }
        : {
            title: `Diagnostic Candidate ${id}`,
            original_title: `Diagnostic Candidate ${id}`,
            release_date: "2020-01-01",
          }),
      genre_ids: [27],
      origin_country: ["KR"],
      popularity: 1_000 - index,
      vote_average: 8,
      vote_count: 1_000 - index,
    };
  });
}

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

function diagnosticDetailFetch(calls) {
  return async (rawUrl) => {
    const url = new URL(rawUrl);
    const match = url.pathname.match(/\/(movie|tv)\/(\d+)$/);
    assert.ok(match, `unexpected diagnostic detail path: ${url.pathname}`);
    const [, mediaType, rawId] = match;
    const id = Number(rawId);
    calls.push({ mediaType, id });
    return tmdbFixtureResponse(200, {
      id,
      ...(mediaType === "tv"
        ? {
            name: `Diagnostic Candidate ${id}`,
            original_name: `Diagnostic Candidate ${id}`,
            first_air_date: "2020-01-01",
            episode_run_time: [45],
          }
        : {
            title: `Diagnostic Candidate ${id}`,
            original_title: `Diagnostic Candidate ${id}`,
            release_date: "2020-01-01",
            runtime: 100,
          }),
      genres: [{ id: 27, name: "Horror" }],
      origin_country: ["KR"],
      production_countries: [{ iso_3166_1: "KR" }],
      popularity: 500,
      vote_average: 8,
      vote_count: 500,
      keywords: { keywords: [{ name: "ghost" }] },
      credits: { cast: [], crew: [] },
      "watch/providers": { results: {} },
    });
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

test("normal Product output and request defaults remain unchanged", async () => {
  const fixture = createFixtureFetch();
  const context = createRecommendationContextFactory(fixture);
  const payload = await recommendSeedsTmdb({
    seeds: [{
      inputTitle: "home alone",
      tmdbId: 201,
      mediaType: "movie",
      resolvedTitle: "나 홀로 집에",
      originalTitle: "Home Alone",
    }],
    contentTypes: ["movie"],
    requestContextFactory: context.factory,
  });
  assert.deepEqual(payload.results.map((item) => item.tmdbId), [
    20110,
    9000,
    20101,
    20111,
    20102,
    20112,
    20103,
    20113,
    20104,
    20105,
    20106,
    20107,
  ]);
  assert.equal(payload.diagnostics.detailRequestBudget, 16);
  assert.equal(payload.diagnostics.requestBudget, 24);
  assert.equal(payload.diagnostics.listRequestBudget, 8);
  assert.equal(payload.diagnostics.detailRequestsUsed, 14);
  assert.deepEqual(payload.results.map((item) => item.title), [
    "Work-20110",
    "Work-9000",
    "Work-20101",
    "Work-20111",
    "Work-20102",
    "Work-20112",
    "Work-20103",
    "Work-20113",
    "Work-20104",
    "Work-20105",
    "Work-20106",
    "Work-20107",
  ]);
});

test("diagnostic entry requires the exact opaque session and bound request context before network", async () => {
  let fetchCount = 0;
  const validSession = createTmdbObservabilitySession();
  const otherSession = createTmdbObservabilitySession();
  const requestContext = createTmdbRequestContext({
    observer: validSession,
    diagnosticLimits: { total: 51, list: 0, detail: 51, concurrency: 4 },
    diagnosticRetry: 0,
    fetchImpl: async () => {
      fetchCount += 1;
      return tmdbFixtureResponse(200);
    },
  });
  await assert.rejects(
    diagnoseTmdbCandidateUniverse({
      session: {},
      candidates: diagnosticUniverse(),
      contentTypes: ["movie"],
      requestContext,
    }),
    /valid opaque/,
  );
  await assert.rejects(
    diagnoseTmdbCandidateUniverse({
      session: otherSession,
      candidates: diagnosticUniverse(),
      contentTypes: ["movie"],
      requestContext,
    }),
    /not bound/,
  );
  await assert.rejects(
    diagnoseTmdbCandidateUniverse({
      session: validSession,
      candidates: diagnosticUniverse(),
      contentTypes: ["movie"],
      requestContext,
      query: "qa=1",
    }),
    /Unknown diagnostic TMDB input field/,
  );
  assert.equal(fetchCount, 0);
});

test("diagnostic exhaustive mode observes all 51 terminal outcomes without changing Product 16-detail decisions", async () => {
  const session = createTmdbObservabilitySession();
  const detailCalls = [];
  const requestContext = createTmdbRequestContext({
    observer: session,
    diagnosticLimits: { total: 51, list: 0, detail: 51, concurrency: 4 },
    diagnosticRetry: 0,
    fetchImpl: diagnosticDetailFetch(detailCalls),
  });
  const result = await diagnoseTmdbCandidateUniverse({
    session,
    candidates: diagnosticUniverse(),
    filters: ["country-kr", "genre-horror"],
    contentTypes: ["movie"],
    requestContext,
  });
  const events = JSON.parse(finalizeTmdbObservabilitySession(session)).events;
  const byType = (type) => events.filter((event) => event.type === type);
  const preliminaryRemovals = byType("preliminary-decision")
    .filter((event) => event.exclusionReason !== "retained");
  const productSelected = byType("detail-budget")
    .filter((event) => event.budgetDecision === "product-selected-diagnostic-evaluated");
  const productSkipped = byType("detail-budget")
    .filter((event) => event.budgetDecision === "product-skipped-diagnostic-evaluated");
  const requestResults = byType("detail-request-result");
  const finalEligibility = byType("final-eligibility");
  const observedIds = new Set(finalEligibility.map((event) => event.tmdbId));

  assert.equal(result.candidateCount, 51);
  assert.equal(result.preliminaryRemovalCount, 2);
  assert.equal(result.productDetailLimit, 16);
  assert.equal(result.diagnosticDetailLimit, 51);
  assert.equal(result.detailEligibleCount, 49);
  assert.equal(result.detailSelectedCount, 49);
  assert.equal(detailCalls.length, 49);
  assert.equal(requestContext.diagnostics().detailRequestsUsed, 49);
  assert.equal(requestContext.diagnostics().retryCount, 0);

  assert.equal(byType("retrieval-row").length, 51);
  assert.equal(byType("preliminary-decision").length, 51);
  assert.equal(preliminaryRemovals.length, 2);
  assert.equal(byType("duplicate-decision").length, 49);
  assert.equal(byType("detail-order").length, 49);
  assert.equal(byType("detail-budget").length, 49);
  assert.equal(productSelected.length, 16);
  assert.equal(productSkipped.length, 33);
  assert.equal(requestResults.length, 49);
  assert.equal(byType("normalized-evaluation").length, 49);
  assert.equal(finalEligibility.length, 51);
  assert.equal(observedIds.size, 51);
  assert.equal(diagnosticUniverse().filter((item) => !observedIds.has(item.id)).length, 0);
  assert.deepEqual(
    productSelected.map((event) => event.tmdbId),
    requestResults.slice(0, 16).map((event) => event.tmdbId),
  );
  assert.equal(
    byType("exclusion-decision").length,
    finalEligibility.filter((event) => !event.finalEligibility).length,
  );
  assert.ok(events.length <= 512);
});
