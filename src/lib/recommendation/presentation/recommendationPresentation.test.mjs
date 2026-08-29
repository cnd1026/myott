import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEvidenceGroundedDecisionReason,
  buildEvidenceGroundedDecisionReasons,
  buildEvidenceGroundedRecommendationReason,
  buildSelectedOptionReason,
  contentTypeMatchesSelection,
  dedupePrimaryDisplayTitles,
  presentationGenreLabels,
  resolveCanonicalReasonSeed,
} from "./recommendationPresentation.js";
import {
  confirmSeedRow,
  createSeedRow,
  editSeedRow,
  removeSeedConfirmation,
  seedRowsToPreferenceState,
} from "../seeds/confirmedSeedState.js";
import {
  applySuggestionSelection,
  buildSeedRequestPayload,
} from "../seeds/seedRequest.js";

test("provider combined genre labels use Korean canonical presentation", () => {
  assert.deepEqual(
    presentationGenreLabels({
      providerGenreIds: [10759, 10765, 10768],
      providerGenreNames: ["Action & Adventure", "Sci-Fi & Fantasy", "War & Politics"],
    }),
    ["액션·모험", "SF·판타지", "전쟁·정치"],
  );
});

test("selected option reason uses only genres that actually matched", () => {
  const action = buildSelectedOptionReason({
    matchedTaxonomyValues: ["genre-action"],
  }, ["genre-action", "genre-sf"]);
  const sf = buildSelectedOptionReason({
    matchedTaxonomyValues: ["genre-sf"],
  }, ["genre-action", "genre-sf"]);
  const dual = buildSelectedOptionReason({
    matchedTaxonomyValues: ["genre-action", "genre-sf"],
  }, ["genre-action", "genre-sf"]);

  assert.match(action, /액션/);
  assert.doesNotMatch(action, /SF/);
  assert.match(sf, /미래|우주|SF/);
  assert.doesNotMatch(sf, /액션/);
  assert.match(dual, /액션과 SF/);
});

test("primary presentation removes duplicate TMDB content and duplicate Korean titles", () => {
  const results = dedupePrimaryDisplayTitles([
    { providerId: "tmdb", mediaType: "tv", tmdbId: 2, title: "닥터 후", year: 2005 },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 1, title: "닥터 후", year: 1963 },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 2, title: "Doctor Who", year: 2005 },
  ]);

  assert.equal(results.length, 1);
  assert.equal(results.filter((item) => item.title === "닥터 후").length, 1);
});

test("twelve unique primary lineage identities preserve client cardinality and order", () => {
  const productResults = Array.from({ length: 12 }, (_, index) => ({
    providerId: "tmdb",
    mediaType: "tv",
    tmdbId: 50_001 + index,
    title: `Primary ${index + 1}`,
    year: 2020 + (index % 5),
  }));
  const primaryLineage = productResults.map((item, index) => ({
    candidateId: `tmdb:${item.mediaType}:${item.tmdbId}`,
    finalPath: "primary",
    finalDecision: "selected",
    rank: index + 1,
  }));
  const presented = dedupePrimaryDisplayTitles(productResults);

  assert.equal(presented.length, 12);
  assert.deepEqual(
    presented.map((item) => `tmdb:${item.mediaType}:${item.tmdbId}`),
    primaryLineage.map((item) => item.candidateId),
  );
});

test("content type presentation keeps movie, drama, and animation provider paths separate", () => {
  assert.equal(contentTypeMatchesSelection({ mediaType: "tv", genreIds: [10759] }, ["drama"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "movie", genreIds: [28] }, ["drama"]), false);
  assert.equal(contentTypeMatchesSelection({ mediaType: "movie", genreIds: [28] }, ["movie"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "tv", genreIds: [16, 10759] }, ["animation"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "tv", genreIds: [10759] }, ["animation"]), false);
  assert.equal(contentTypeMatchesSelection({ mediaType: "movie", genreIds: [16] }, ["movie"], ["style-animation"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "tv", genreIds: [16] }, ["drama"], ["style-animation"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "movie", genreIds: [16] }, ["drama"], ["style-animation"]), false);
});

test("confirmed seed aliases resolve to the canonical provider-backed title", () => {
  const confirmedSeeds = {
    0: {
      inputTitle: "인터",
      displayTitle: "인터",
      resolvedTitle: "인터스텔라",
      originalTitle: "Interstellar",
      tmdbId: 157336,
      mediaType: "movie",
    },
  };

  assert.equal(resolveCanonicalReasonSeed({ reasonSeed: "인터" }, confirmedSeeds), "인터스텔라");
  assert.equal(resolveCanonicalReasonSeed({ seedTitle: "Interstellar" }, confirmedSeeds), "인터스텔라");
  assert.equal(resolveCanonicalReasonSeed({ reasonSeed: "확인되지 않은 작품" }, confirmedSeeds), "확인되지 않은 작품");
});

test("recommendation rationale uses canonical seed identity and card-specific evidence", () => {
  const preferences = {
    titles: ["인터"],
    confirmedSeeds: { 0: { inputTitle: "인터", resolvedTitle: "인터스텔라" } },
    selectedFilters: ["genre-sf"],
    selectedTypes: ["movie"],
  };
  const scienceFiction = {
    reasonSeed: "인터",
    providerMediaType: "movie",
    displayContentType: "movie",
    providerGenreIds: [878],
    reason: "우주 탐사 설정을 함께 살펴볼 수 있습니다.",
  };
  const adventure = {
    ...scienceFiction,
    providerGenreIds: [12],
    reason: "탐험과 여정에 초점을 둔 작품입니다.",
  };

  const sfReason = buildEvidenceGroundedDecisionReason(scienceFiction, preferences);
  const adventureReason = buildEvidenceGroundedDecisionReason(adventure, preferences);
  assert.match(sfReason, /인터스텔라/);
  assert.doesNotMatch(sfReason, /인터(?:을|를) 좋아/);
  assert.match(sfReason, /SF/);
  assert.match(adventureReason, /모험/);
  assert.notEqual(sfReason, adventureReason);
  assert.match(buildEvidenceGroundedRecommendationReason(scienceFiction, preferences), /우주 탐사 설정/);
});

test("recommendation rationale stays truthful, varied, and deterministic across cards", () => {
  const preferences = {
    titles: ["인터"],
    confirmedSeeds: { 0: { inputTitle: "인터", resolvedTitle: "인터스텔라" } },
    selectedFilters: ["genre-sf"],
    selectedTypes: ["movie"],
    selectedOtt: ["netflix"],
  };
  const items = ["듄", "그래비티", "마션"].map((title, index) => ({
    title,
    reasonSeed: "인터",
    providerMediaType: "movie",
    displayContentType: "movie",
    providerGenreIds: [878],
    matchedTaxonomyValues: ["genre-sf"],
    ott: ["Netflix"],
    reason: `검증된 상세 근거 ${index + 1}`,
  }));

  const first = buildEvidenceGroundedDecisionReasons(items, preferences);
  const second = buildEvidenceGroundedDecisionReasons(items, preferences);

  assert.deepEqual(first, second);
  assert.equal(new Set(first).size, 3);
  assert.match(first[0], /인터스텔라.*SF/);
  assert.match(first[1], /미래|우주|SF/);
  assert.match(first[2], /영화 조건/);
  assert.doesNotMatch(first.join(" "), /인터(?:을|를) 좋아/);
  assert.doesNotMatch(first.join(" "), /요즘 인기|수상|관객|리뷰|트렌드/);
});

test("confirmed seed state preserves raw input, invalidates on edit, and removes identity only", () => {
  let sequence = 2;
  const createBlank = () => createSeedRow(`seed-${sequence++}`);
  const selection = applySuggestionSelection("인터", {
    tmdbId: 157336,
    mediaType: "movie",
    type: "movie",
    title: "인터스텔라",
    resolvedTitle: "인터스텔라",
    originalTitle: "Interstellar",
    year: 2014,
  });
  const confirmedRows = confirmSeedRow(
    [createSeedRow("seed-1", selection.inputValue)],
    "seed-1",
    selection.confirmedSeed,
    createBlank,
  );
  assert.equal(confirmedRows[0].raw, "인터");
  assert.equal(confirmedRows[0].confirmed.resolvedTitle, "인터스텔라");

  const preference = seedRowsToPreferenceState(confirmedRows);
  const payload = buildSeedRequestPayload({
    ...preference,
    contentTypes: ["movie"],
    filters: ["genre-sf", "netflix"],
  });
  assert.equal(payload.seeds[0].inputTitle, "인터");
  assert.equal(payload.seeds[0].resolvedTitle, "인터스텔라");
  assert.deepEqual(payload.contentTypes, ["movie"]);

  const editedRows = editSeedRow(confirmedRows, "seed-1", "인터스", createBlank);
  assert.equal(editedRows[0].raw, "인터스");
  assert.equal(editedRows[0].confirmed, null);
  assert.equal(editedRows[0].state, "CONFIRMED_THEN_RAW_EDITED");

  const removedRows = removeSeedConfirmation(confirmedRows, "seed-1");
  assert.equal(removedRows[0].raw, "인터");
  assert.equal(removedRows[0].confirmed, null);
  assert.equal(removedRows[0].state, "CONFIRMATION_REMOVED");
});

test("seed request serialization preserves movie-only and movie-plus-drama exactly", () => {
  const movieOnly = buildSeedRequestPayload({ contentTypes: ["movie"], filters: ["genre-sf", "netflix"] });
  const movieDrama = buildSeedRequestPayload({ contentTypes: ["movie", "drama"], filters: ["genre-sf", "netflix"] });
  assert.deepEqual(movieOnly.contentTypes, ["movie"]);
  assert.deepEqual(movieDrama.contentTypes, ["movie", "drama"]);
  assert.deepEqual(movieOnly.filters, ["genre-sf", "netflix"]);
  assert.deepEqual(movieDrama.filters, ["genre-sf", "netflix"]);
});

test("all seven content-type combinations exclude every unselected final classification", () => {
  const candidates = [
    { id: "movie", providerMediaType: "movie", displayContentType: "movie", genreIds: [878] },
    { id: "drama", providerMediaType: "tv", displayContentType: "drama", genreIds: [10765] },
    { id: "animation", providerMediaType: "movie", displayContentType: "animation", genreIds: [16] },
  ];
  const combinations = [
    ["movie"],
    ["drama"],
    ["animation"],
    ["movie", "drama"],
    ["movie", "animation"],
    ["drama", "animation"],
    ["movie", "drama", "animation"],
  ];

  for (const selectedTypes of combinations) {
    const eligible = candidates.filter((item) => contentTypeMatchesSelection(item, selectedTypes));
    assert.deepEqual(eligible.map((item) => item.id), selectedTypes);
  }
});
