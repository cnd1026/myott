import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import { recommendSeedsTmdb } from "../../../lib/tmdb.js";
import { clearTmdbRequestCache } from "../providers/tmdb/requestContext.js";
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

beforeEach(() => clearTmdbRequestCache());

test("shared genre contract keeps movie and TV SF semantics distinct", () => {
  assert.deepEqual(genreIdsForFilters(["genre-sf"], "movie"), [878]);
  assert.deepEqual(genreIdsForFilters(["genre-sf"], "tv"), [10765]);
  assert.deepEqual(genreIdsForFilters(["genre-sf-fantasy"], "movie"), [878, 14]);
  assert.deepEqual(genreIdsForFilters(["genre-sf-fantasy"], "tv"), [10765]);
  assert.equal(candidateGenreMatchDetail({ mediaType: "tv", genreIds: [10765] }, ["genre-sf"]).genreMatchMode, "provider-combined");
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
  assert.equal(semantic.genreMatchMode, "semantic");
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
});

test("seed coverage and empty states explain the actual state", () => {
  assert.equal(
    buildSeedCoverageMessage({ requestedSeedCount: 10, processedSeedCount: 4 }),
    "입력한 10개 작품 중 4개를 이번 추천에 반영했습니다.",
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
