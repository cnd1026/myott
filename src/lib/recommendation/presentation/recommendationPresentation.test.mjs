import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEvidenceGroundedDecisionReason,
  buildEvidenceGroundedDecisionReasons,
  buildEvidenceGroundedRecommendationReason,
  buildBaselineSessionContext,
  buildSelectedOptionReason,
  buildFirstPickRecommendationReason,
  contentTypeMatchesSelection,
  dedupePrimaryDisplayTitles,
  normalizeDisplayOttProviders,
  presentationGenreLabels,
  recommendationOptionButtonLabel,
  resolveCanonicalReasonSeed,
  isBaselineRecommendationContext,
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
  assert.match(first[2], /인터스텔라|SF|미래|우주/);
  assert.doesNotMatch(first.join(" "), /인터(?:을|를) 좋아/);
  assert.doesNotMatch(first.join(" "), /요즘 인기|수상|관객|리뷰|트렌드/);
});

test("First Pick rationale is isolated from submitted recommendation preferences", () => {
  const firstPick = {
    firstPick: true,
    providerContentId: "first-pick-1",
    providerMediaType: "tv",
    providerGenreIds: [18],
    reason: "실제 TMDB 작품 정보입니다.",
  };
  const preferences = {
    titles: ["입력 작품"],
    confirmedSeeds: { 0: { inputTitle: "입력 작품", resolvedTitle: "확인된 작품" } },
    selectedFilters: ["genre-horror"],
    selectedTypes: ["drama"],
    selectedOtt: ["netflix"],
  };

  const before = buildEvidenceGroundedRecommendationReason(firstPick, {});
  const after = buildEvidenceGroundedRecommendationReason(firstPick, preferences);

  assert.equal(before, buildFirstPickRecommendationReason(firstPick));
  assert.equal(after, before);
  assert.match(after, /드라마|드라마틱|장르/);
  assert.doesNotMatch(after, /입력|선택한|조건에 맞춘|TMDB/);
  assert.doesNotMatch(after, /\.(?:입니다\.)/u);
});

test("default all-type state does not claim a focused type selection", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [18],
  }, { selectedTypes: ["movie", "drama", "animation"] });

  assert.match(reason, /드라마/);
  assert.doesNotMatch(reason, /드라마 조건에 맞춘 추천/);
});

test("top-level content type selection remains a baseline filter, not personalization", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [18],
  }, { selectedTypes: ["drama"] });

  assert.doesNotMatch(reason, /드라마 조건에 맞춘 추천/);
  assert.match(reason, /드라마/);
});

test("baseline session predicate treats OTT and top-level types as base filters", () => {
  assert.equal(isBaselineRecommendationContext({
    selectedTypes: ["movie", "drama", "animation"],
  }), true);
  assert.equal(isBaselineRecommendationContext({
    selectedTypes: ["drama"],
    selectedOtt: ["netflix"],
  }), true);
  assert.equal(isBaselineRecommendationContext({
    selectedTypes: ["drama"],
    selectedFilters: ["genre-horror"],
  }), false);
  assert.equal(isBaselineRecommendationContext({
    titles: ["인터스텔라"],
  }), false);
});

test("baseline session copy distinguishes pure default from base-filtered", () => {
  assert.equal(buildBaselineSessionContext({
    selectedTypes: ["movie", "drama", "animation"],
  }), "추가 취향 정보가 없어 폭넓은 기본 추천을 보여드려요.");
  assert.equal(buildBaselineSessionContext({
    selectedTypes: ["movie", "drama", "animation"],
    selectedOtt: ["netflix"],
  }), "추가 취향 정보가 없어 선택한 기본 조건을 기준으로 추천했어요.");
  assert.equal(buildBaselineSessionContext({
    selectedTypes: ["drama"],
  }), "추가 취향 정보가 없어 선택한 기본 조건을 기준으로 추천했어요.");
  assert.equal(buildBaselineSessionContext({
    selectedTypes: ["movie", "drama", "animation"],
    selectedFilters: ["genre-horror"],
  }), "");
});

test("baseline items retain distinct truthful evidence when their metadata differs", () => {
  const reasons = buildEvidenceGroundedDecisionReasons([
    { providerMediaType: "tv", displayContentType: "drama", providerGenreIds: [80, 18] },
    { providerMediaType: "movie", displayContentType: "movie", providerGenreIds: [878, 12] },
    { providerMediaType: "tv", displayContentType: "drama", providerGenreIds: [16, 10751, 35, 14] },
  ], { selectedTypes: ["movie", "drama", "animation"] });

  assert.equal(new Set(reasons).size, 3);
  assert.match(reasons[0], /범죄·드라마/);
  assert.match(reasons[1], /SF·모험/);
  assert.match(reasons[2], /애니메이션|가족|코미디/);
});

test("default baseline has no false title or preference relationship claim", () => {
  const reason = buildEvidenceGroundedRecommendationReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [80, 18],
    reason: "입력한 작품과 연결해 확인해볼 만한 실제 검색 결과입니다.",
  }, { selectedTypes: ["movie", "drama", "animation"] });

  assert.doesNotMatch(reason, /입력한 작품|입력한 취향/);
  assert.doesNotMatch(reason, /드라마 조건에 맞춘 추천/);
});

test("generic provider boilerplate is suppressed while useful detail is retained", () => {
  const generic = buildEvidenceGroundedRecommendationReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [10765],
    reason: "실제 TMDB 작품 정보입니다.",
  }, { selectedTypes: ["movie", "drama", "animation"] });
  const useful = buildEvidenceGroundedRecommendationReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [10765],
    reason: "인물 사이의 긴장을 따라갈 수 있습니다..",
  }, { selectedTypes: ["movie", "drama", "animation"] });

  assert.doesNotMatch(generic, /실제 TMDB|검색 결과/);
  assert.match(generic, /전쟁|정치|드라마/);
  assert.match(useful, /인물 사이의 긴장을 따라갈 수 있습니다\./);
  assert.doesNotMatch(useful, /\.{2,}/u);
  assert.doesNotMatch(useful, /입니다\.\s*입니다\./u);
});

test("no submitted input suppresses false provider seed references", () => {
  const reason = buildEvidenceGroundedRecommendationReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [80, 18],
    reason: "입력한 작품과 연결해 확인해볼 만한 실제 검색 결과입니다.",
  }, { selectedTypes: ["movie", "drama", "animation"] });

  assert.doesNotMatch(reason, /입력한 작품|검색 결과/);
  assert.match(reason, /범죄|드라마/);
});

test("truthful item detail remains when false input clause is removed", () => {
  const reason = buildEvidenceGroundedRecommendationReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [80, 18],
    reason: "수사와 긴장감이 강한 범죄 드라마입니다. 입력한 작품과 연결해 확인해볼 만한 실제 검색 결과입니다.",
  }, { selectedTypes: ["movie", "drama", "animation"] });

  assert.match(reason, /수사와 긴장감이 강한 범죄 드라마입니다\./);
  assert.doesNotMatch(reason, /입력한 작품|검색 결과/);
});

test("submitted canonical seed keeps truthful input-connected detail", () => {
  const reason = buildEvidenceGroundedRecommendationReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [18],
    reason: "입력한 작품과 연결해 확인해볼 만한 실제 검색 결과입니다.",
  }, {
    titles: ["인터"],
    confirmedSeeds: { 0: { inputTitle: "인터", resolvedTitle: "인터스텔라" } },
  });

  assert.match(reason, /입력한 작품|검색 결과/);
});

test("default content types do not count as submitted input evidence", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [18],
    reason: "입력한 작품과 연결해 확인해볼 만한 실제 검색 결과입니다.",
  }, { selectedTypes: ["movie", "drama", "animation"] });

  assert.doesNotMatch(reason, /입력한 작품|검색 결과/);
  assert.match(reason, /드라마/);
});

test("neutral default rationales use actual evidence and remain deterministic across cards", () => {
  const items = [
    { providerContentId: "neutral-1", providerMediaType: "tv", displayContentType: "drama", providerGenreIds: [18] },
    { providerContentId: "neutral-2", providerMediaType: "movie", displayContentType: "movie", providerGenreIds: [878] },
    { providerContentId: "neutral-3", providerMediaType: "tv", displayContentType: "drama", providerGenreIds: [10749] },
  ];
  const preferences = { selectedTypes: ["movie", "drama", "animation"] };
  const first = buildEvidenceGroundedDecisionReasons(items, preferences);
  const second = buildEvidenceGroundedDecisionReasons(items, preferences);

  assert.deepEqual(first, second);
  assert.equal(new Set(first).size, 3);
  assert.match(first.join(" "), /드라마|영화|SF|로맨스/);
  assert.doesNotMatch(first.join(" "), /요즘 인기|트렌드|수상|관객|리뷰|선택한 .*조건/);
});

test("no-input primary rationales use diverse evidence-backed structures", () => {
  const items = [
    { providerContentId: "primary-1", providerMediaType: "movie", displayContentType: "movie", providerGenreIds: [878, 28, 12], runtimeMinutes: 145, rating: 7.9 },
    { providerContentId: "primary-2", providerMediaType: "tv", displayContentType: "drama", providerGenreIds: [10759, 80], ott: ["Amazon Prime Video"], rating: 8.1 },
    { providerContentId: "primary-3", providerMediaType: "tv", displayContentType: "animation", providerGenreIds: [16, 10751, 35, 12], runtimeMinutes: 102, rating: 8.3 },
    { providerContentId: "primary-4", providerMediaType: "movie", displayContentType: "movie", providerGenreIds: [12, 28, 14], runtimeMinutes: 173, rating: 8.0 },
    { providerContentId: "primary-5", providerMediaType: "tv", displayContentType: "drama", providerGenreIds: [80, 18, 9648], ott: ["Netflix"], rating: 8.4 },
    { providerContentId: "primary-6", providerMediaType: "tv", displayContentType: "animation", providerGenreIds: [16, 28, 12, 878, 80, 18], runtimeMinutes: 79, rating: 9.1 },
  ];
  const reasons = buildEvidenceGroundedDecisionReasons(items, {
    selectedTypes: ["movie", "drama", "animation"],
  });
  const structuralFamilies = reasons.map((reason) => {
    if (reason.includes("장르를 넘나드는")) return "genre-range";
    if (reason.includes("장르가 함께 드러나는")) return "multi-genre";
    if (reason.startsWith("평점 ")) return "rating";
    return "other";
  });
  const familyCounts = structuralFamilies.reduce((counts, family) => ({
    ...counts,
    [family]: (counts[family] || 0) + 1,
  }), {});

  assert.equal(new Set(reasons).size, 6);
  assert.ok(Math.max(...Object.values(familyCounts)) <= 2);
  assert.ok(new Set(structuralFamilies).size >= 3);
  assert.ok(reasons.every((reason) => !/입력한 작품|입력한 취향|좋아한 작품|요즘 인기|트렌드|수상|관객|리뷰/.test(reason)));
});

test("no-input primary rationales do not treat OTT placeholders as availability evidence", () => {
  const [reason] = buildEvidenceGroundedDecisionReasons([
    {
      title: "Placeholder title",
      providerMediaType: "tv",
      displayContentType: "drama",
      providerGenreIds: [18, 35],
      ott: ["OTT 정보 확인 필요"],
    },
  ], { selectedTypes: ["movie", "drama", "animation"] });

  assert.doesNotMatch(reason, /확인할 수 있는/);
  assert.match(reason, /드라마·코미디 장르|드라마 형식/);
});

test("availability metadata does not override intrinsic no-input content evidence", () => {
  const [reason] = buildEvidenceGroundedDecisionReasons([
    {
      providerMediaType: "tv",
      displayContentType: "drama",
      providerGenreIds: [10759, 80],
      ott: ["Amazon Prime Video"],
      reason: "오늘 바로 고르기 좋은 추천",
    },
  ], { selectedTypes: ["movie", "drama", "animation"] });

  assert.doesNotMatch(reason, /시청 정보를 확인할 수 있는/);
  assert.equal(reason, "액션·모험·범죄 장르가 함께 드러나는 드라마입니다.");
});

test("availability-only metadata still uses a narrow content fallback", () => {
  const [reason] = buildEvidenceGroundedDecisionReasons([{
    providerMediaType: "tv",
    displayContentType: "drama",
    ott: ["Netflix"],
  }], { selectedTypes: ["movie", "drama", "animation"] });

  assert.doesNotMatch(reason, /Netflix|시청 정보를 확인할 수 있는/);
  assert.equal(reason, "드라마 형식으로 만나볼 수 있는 작품입니다.");
});

test("explicit OTT match keeps intrinsic content as the primary rationale", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [80, 18],
    ott: ["Netflix"],
  }, {
    selectedTypes: ["movie", "drama", "animation"],
    selectedOtt: ["netflix"],
  });

  assert.equal(reason, "범죄·드라마 장르가 함께 드러나는 드라마입니다.");
});

test("metadata-rich Netflix items never select the provider-only rationale", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    title: "Walking Dead equivalent",
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [10759, 18, 10765],
    ott: ["Netflix"],
  }, {
    selectedTypes: ["movie", "drama", "animation"],
    selectedOtt: ["netflix"],
  });

  assert.equal(reason, "액션·모험·드라마 장르가 함께 드러나는 드라마입니다.");
  assert.notEqual(reason, "선택한 OTT에서 볼 수 있는 작품 중 고른 추천");
});

test("provider-only rationale is not preferred over reusable intrinsic evidence", () => {
  const reasons = buildEvidenceGroundedDecisionReasons([
    ...Array.from({ length: 3 }, (_, index) => ({
      providerContentId: `provider-reason-${index}`,
      providerMediaType: "tv",
      displayContentType: "drama",
      providerGenreIds: [18, 80],
      ott: ["Netflix"],
    })),
  ], {
    selectedTypes: ["movie", "drama", "animation"],
    selectedOtt: ["netflix"],
  });

  assert.equal(reasons.length, 3);
  assert.ok(reasons.every((reason) => !reason.includes("선택한 OTT에서 볼 수 있는")));
  assert.ok(reasons.every((reason) => /장르|평점|형식/.test(reason)));
});

test("displayed genre metadata is usable when provider ids are absent", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    genre: "액션·모험, 드라마, SF·판타지",
    ott: ["Netflix"],
  }, {
    selectedTypes: ["movie", "drama", "animation"],
    selectedOtt: ["netflix"],
  });

  assert.match(reason, /액션·모험·드라마 장르가 함께 드러나는 드라마입니다/);
  assert.doesNotMatch(reason, /선택한 OTT에서 볼 수 있는/);
});

test("rating evidence outranks a type-only fallback", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    rating: 8.2,
    ott: ["Netflix"],
  }, {
    selectedTypes: ["movie", "drama", "animation"],
    selectedOtt: ["netflix"],
  });

  assert.equal(reason, "평점 8.2의 드라마입니다.");
  assert.doesNotMatch(reason, /형식으로/);
});

test("rating-only movie and animation rationales use each existing type label once", () => {
  const cases = [
    ["movie", "영화"],
    ["animation", "애니"],
  ];

  for (const [displayContentType, label] of cases) {
    const reason = buildEvidenceGroundedDecisionReason({
      providerMediaType: displayContentType === "movie" ? "movie" : "tv",
      displayContentType,
      rating: 8.2,
      ott: ["Netflix"],
    }, {
      selectedTypes: [displayContentType],
      selectedOtt: ["netflix"],
    });

    assert.equal(reason, `평점 8.2의 ${label}입니다.`);
    assert.equal(reason.split(label).length - 1, 1);
  }
});

test("metadata-sparse items keep a safe non-OTT fallback", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    ott: ["Netflix"],
  }, {
    selectedTypes: ["movie", "drama", "animation"],
    selectedOtt: ["netflix"],
  });

  assert.equal(reason, "드라마 형식으로 만나볼 수 있는 작품입니다.");
  assert.doesNotMatch(reason, /Netflix|선택한 OTT에서 볼 수 있는/);
});

test("type-only provider prose yields intrinsic evidence when metadata exists", () => {
  const reasons = buildEvidenceGroundedDecisionReasons([
    {
      providerMediaType: "tv",
      displayContentType: "drama",
      genre: "SF·판타지, 드라마",
      rating: "8.2",
      reason: "드라마 형식으로 만나볼 수 있는 작품입니다.",
    },
    {
      providerMediaType: "movie",
      displayContentType: "movie",
      genre: "공포, 스릴러",
      rating: "8.2",
      reason: "영화 형식으로 만나볼 수 있는 작품입니다.",
    },
  ], { selectedTypes: ["movie", "drama", "animation"] });

  assert.match(reasons[0], /SF·판타지|드라마|평점/);
  assert.match(reasons[1], /공포|스릴러|평점/);
  assert.doesNotMatch(reasons.join(" "), /형식으로 만나볼 수 있는 작품입니다/);
});

test("Silo and Obsession-equivalent rich cards never regress to type-only after reason diversity is exhausted", () => {
  const cardInputs = [
    ["crime", "범죄, 액션, 스릴러", "8.8"],
    ["drama", "범죄, 드라마, 미스터리", "8.4"],
    ["animation", "애니메이션, 코미디, SF·판타지, 액션·모험", "8.7"],
    ["movie", "드라마, 범죄", "8.7"],
    ["drama", "범죄, 드라마, 코미디", "8.5"],
    ["animation", "애니메이션, 액션, 판타지", "8.8"],
    ["movie", "범죄, 드라마, 스릴러", "6.3"],
    ["drama", "범죄, 드라마, 미스터리", "8.0"],
    ["animation", "모험, 애니메이션, 가족, 판타지", "8.9"],
    ["drama", "액션·모험, 미스터리", "8.2"],
    ["movie", "가족, 애니메이션, SF, 모험", "8.3"],
    ["drama", "액션·모험, 드라마, SF·판타지", "8.1"],
  ].map(([type, genre, rating], index) => ({
    providerContentId: `browser-equivalent-${index}`,
    providerMediaType: type === "movie" ? "movie" : "tv",
    displayContentType: type,
    genre,
    rating,
    reason: `${type === "movie" ? "영화" : type === "animation" ? "애니" : "드라마"} 형식으로 만나볼 수 있는 작품입니다.`,
  }));

  const reasons = buildEvidenceGroundedDecisionReasons(cardInputs, {
    selectedTypes: ["movie", "drama", "animation"],
    selectedOtt: ["netflix"],
  });

  assert.equal(reasons.length, 12);
  assert.doesNotMatch(reasons.join(" "), /형식으로 만나볼 수 있는 작품입니다/);
  assert.match(reasons[7], /범죄|드라마|미스터리|평점/);
  assert.match(reasons[10], /가족|애니메이션|SF|모험|평점/);
});

test("metadata-sparse cards retain the truthful type-only fallback", () => {
  const [reason] = buildEvidenceGroundedDecisionReasons([{
    providerContentId: "sparse-equivalent",
    providerMediaType: "tv",
    displayContentType: "drama",
    reason: "드라마 형식으로 만나볼 수 있는 작품입니다.",
  }], { selectedTypes: ["movie", "drama", "animation"] });

  assert.equal(reason, "드라마 형식으로 만나볼 수 있는 작품입니다");
});

test("duplicate intrinsic family does not resurrect a rich item's type-only fallback", () => {
  const reasons = buildEvidenceGroundedDecisionReasons([
    {
      providerMediaType: "tv",
      displayContentType: "drama",
      providerGenreIds: [80, 18],
      reason: "범죄·드라마 장르가 함께 드러나는 드라마입니다.",
    },
    {
      providerMediaType: "tv",
      displayContentType: "drama",
      genre: "범죄, 드라마",
      rating: "8.1",
      reason: "드라마 형식으로 만나볼 수 있는 작품입니다.",
    },
  ], { selectedTypes: ["movie", "drama", "animation"] });

  assert.doesNotMatch(reasons[1], /형식으로 만나볼 수 있는 작품입니다/);
  assert.match(reasons[1], /범죄|드라마|평점/);
});

test("explicit OTT nonmatch cannot claim availability", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    providerGenreIds: [80, 18],
    ott: ["Amazon Prime Video"],
  }, {
    selectedTypes: ["movie", "drama", "animation"],
    selectedOtt: ["netflix"],
  });

  assert.doesNotMatch(reason, /OTT|시청 정보를 확인할 수 있는/);
  assert.match(reason, /장르가 함께 드러나는/);
});

test("metadata-backed baseline reasons never fall back to generic filler", () => {
  const reasons = buildEvidenceGroundedDecisionReasons([
    { providerContentId: "metadata-1", providerMediaType: "tv", displayContentType: "drama", providerGenreIds: [18] },
    { providerContentId: "metadata-2", providerMediaType: "movie", displayContentType: "movie", rating: 8.2 },
    { providerContentId: "metadata-3", providerMediaType: "tv", displayContentType: "drama", providerGenreIds: [80, 9648] },
  ], { selectedTypes: ["movie", "drama", "animation"] });

  assert.equal(reasons.length, 3);
  assert.ok(reasons.every((reason) => !/오늘 바로|기본 정보를 바탕으로/.test(reason)));
});

test("truthful item-specific rationale is reusable before generic fallback", () => {
  const items = [1, 2].map((id) => ({
    providerContentId: `same-detail-${id}`,
    providerMediaType: "tv",
    displayContentType: "drama",
    reason: "인물 사이의 긴장을 따라갈 수 있는 작품입니다.",
  }));
  const reasons = buildEvidenceGroundedDecisionReasons(items, {
    selectedTypes: ["movie", "drama", "animation"],
  });

  assert.deepEqual(reasons, [
    "인물 사이의 긴장을 따라갈 수 있는 작품입니다",
    "인물 사이의 긴장을 따라갈 수 있는 작품입니다",
  ]);
  assert.ok(reasons.every((reason) => !/오늘 바로|기본 정보를 바탕으로/.test(reason)));
});

test("runtime evidence stays hidden unless a runtime option is selected", () => {
  const reason = buildEvidenceGroundedDecisionReason({
    providerMediaType: "movie",
    displayContentType: "movie",
    runtimeMinutes: 47,
    providerGenreIds: [],
  }, { selectedTypes: ["movie"] });

  assert.doesNotMatch(reason, /47분/);
  assert.match(reason, /영화 형식/);
});

test("selected runtime options expose only the approved display buckets", () => {
  const cases = [
    ["runtime-short", "60분 이하", 47],
    ["runtime-medium", "2시간 이하", 90],
    ["runtime-long", "2시간 이상", 180],
  ];

  for (const [filter, bucket, runtimeMinutes] of cases) {
    const reason = buildEvidenceGroundedDecisionReason({
      providerMediaType: "movie",
      displayContentType: "movie",
      runtimeMinutes,
      providerGenreIds: [],
    }, { selectedTypes: ["movie"], selectedFilters: [filter] });

    assert.match(reason, new RegExp(bucket));
    assert.doesNotMatch(reason, new RegExp(`${runtimeMinutes}분`));
  }
});

test("runtime-bearing item detail cannot leak exact minutes into rationale", () => {
  const reason = buildEvidenceGroundedRecommendationReason({
    providerMediaType: "tv",
    displayContentType: "drama",
    runtimeMinutes: 121,
    providerGenreIds: [18],
    reason: "121분 동안 이어지는 인물 관계의 긴장이 인상적인 작품입니다.",
  }, { selectedTypes: ["drama"] });

  assert.doesNotMatch(reason, /121분/);
  assert.match(reason, /드라마/);
});

test("display OTT normalization merges only the explicit Netflix aliases", () => {
  const rawProviders = ["Netflix Standard with Ads", "Netflix", "TVING", "Hulu"];
  const normalized = normalizeDisplayOttProviders(rawProviders);

  assert.deepEqual(normalized, ["Netflix", "TVING", "Hulu"]);
  assert.deepEqual(rawProviders, ["Netflix Standard with Ads", "Netflix", "TVING", "Hulu"]);
});

test("option button copy exposes idle and selected states", () => {
  assert.equal(recommendationOptionButtonLabel(0), "더 많은 옵션 선택하기");
  assert.equal(recommendationOptionButtonLabel(2), "추가 옵션 2개 선택됨");
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
