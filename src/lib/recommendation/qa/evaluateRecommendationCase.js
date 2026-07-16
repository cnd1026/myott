import {
  candidateGenreMatchDetail,
  classifyTaxonomyValues,
  genreContractTokens,
} from "../genres/genreContract.js";

const COUNTRY_ALIASES = {
  KR: ["KR", "한국", "country-kr"],
  JP: ["JP", "일본", "country-jp"],
  US: ["US", "미국", "country-us"],
  GB: ["GB", "영국", "country-gb"],
  FR: ["FR", "프랑스", "country-fr"],
  DE: ["DE", "독일", "country-de"],
  CN: ["CN", "중국", "country-cn"],
  HK: ["HK", "홍콩", "country-hk"],
  TW: ["TW", "대만", "country-tw"],
  IN: ["IN", "인도", "country-in"],
  CA: ["CA", "캐나다", "country-ca"],
  AU: ["AU", "호주", "country-au"],
  ES: ["ES", "스페인", "country-es"],
  IT: ["IT", "이탈리아", "country-it"],
  TH: ["TH", "태국", "country-th"],
  BR: ["BR", "브라질", "country-br"],
  MX: ["MX", "멕시코", "country-mx"],
};

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeValues(values = []) {
  return (Array.isArray(values) ? values : [values]).map(normalizeValue).filter(Boolean);
}

function collectResultTokens(result = {}) {
  return new Set(
    normalizeValues([
      result.country,
      result.contentType,
      result.type,
      result.label,
      result.genre,
      result.source,
      result.providerId,
      result.dataSource,
      ...(result.countryCodes || []),
      ...(result.originCountries || []),
      ...(result.productionCountries || []),
      ...(result.genres || []),
      ...(result.genreIds || []),
      ...(result.tags || []),
      ...(result.keywords || []),
    ]),
  );
}

function aliasedTokens(values = [], aliases = {}) {
  return normalizeValues(values).flatMap((value) => {
    const upperValue = String(value || "").trim().toUpperCase();
    return normalizeValues([value, ...(aliases[upperValue] || aliases[value] || [])]);
  });
}

function resultCountryMatches(result, countries = []) {
  if (!countries.length) return true;
  const tokens = collectResultTokens(result);
  return aliasedTokens(countries, COUNTRY_ALIASES).some((country) => tokens.has(country));
}

function resultContentType(result = {}) {
  const genreIds = normalizeValues(result.genreIds || []);
  const type = normalizeValue(result.contentType || result.type || result.label);

  if (type === "animation" || type === "애니" || type === "애니메이션" || genreIds.includes("16")) return "animation";
  if (["drama", "series", "tv", "드라마"].includes(type)) return "drama";
  return "movie";
}

function resultContentTypeMatches(result, contentTypes = []) {
  if (!contentTypes.length) return true;
  return normalizeValues(contentTypes).includes(resultContentType(result));
}

function resultGenreMatches(result, genres = []) {
  if (!genres.length) return true;
  const genreFilters = genreContractTokens(genres);
  const taxonomy = resultTaxonomy(result);
  const explicitValues = new Set([
    ...taxonomy.canonicalGenreValues,
    ...taxonomy.semanticGenreValues,
    ...taxonomy.controlledSemanticGenreValues,
    ...taxonomy.combinedGenreValues,
    ...taxonomy.formatValues,
    ...taxonomy.audienceValues,
    ...taxonomy.styleValues,
  ]);
  if (genreFilters.some((value) => explicitValues.has(value))) return true;
  if (genreFilters.length && candidateGenreMatchDetail(result, genreFilters).genreMatched) return true;
  const tokens = collectResultTokens(result);
  return normalizeValues(genres).some((genre) => tokens.has(genre));
}

function resultGenreMatchMode(result, genres = []) {
  const explicitMode = normalizeValue(result.genreMatchMode);
  if (["provider-exact", "provider-combined", "provider-combined-controlled", "semantic-specialized", "semantic", "adjacent", "relaxed"].includes(explicitMode)) {
    return explicitMode;
  }
  const filters = genreContractTokens(genres);
  return filters.length ? candidateGenreMatchDetail(result, filters).genreMatchMode : "provider-exact";
}

function resultTaxonomy(result = {}) {
  const classified = classifyTaxonomyValues(result);
  const explicit = (key) => Array.isArray(result[key]) ? result[key] : classified[key];
  return {
    ...classified,
    canonicalGenreValues: explicit("canonicalGenreValues"),
    combinedGenreValues: explicit("combinedGenreValues"),
    semanticGenreValues: explicit("semanticGenreValues"),
    controlledSemanticGenreValues: explicit("controlledSemanticGenreValues"),
    formatValues: explicit("formatValues"),
    audienceValues: explicit("audienceValues"),
    styleValues: explicit("styleValues"),
  };
}

function taxonomyValuesMatch(result, key, genres = []) {
  const expected = new Set(genreContractTokens(genres));
  if (!expected.size) return false;
  return resultTaxonomy(result)[key].some((value) => expected.has(value));
}

const SPECIALIZATION_GROUPS = [
  ["genre-action", "genre-adventure"],
  ["genre-sf", "genre-fantasy"],
  ["genre-war", "genre-politics"],
];

function duplicateSemanticSpecializations(result = {}) {
  const taxonomy = resultTaxonomy(result);
  const semanticValues = new Set(taxonomy.semanticGenreValues);
  return SPECIALIZATION_GROUPS.reduce(
    (count, group) => {
      const values = group.filter((value) => semanticValues.has(value));
      const evidenced = values.filter((value) => taxonomy.semanticEvidenceByGenre?.[value]?.matched);
      return count + (values.length > 1 && evidenced.length < values.length ? values.length - 1 : 0);
    },
    0,
  );
}

function incompatibleCanonicalGenres(result = {}) {
  const taxonomy = resultTaxonomy(result);
  const canonical = new Set([...taxonomy.canonicalGenreValues, ...taxonomy.semanticGenreValues]);
  return SPECIALIZATION_GROUPS.reduce(
    (count, group) => {
      if (!group.every((value) => canonical.has(value))) return count;
      return count + (group.every((value) => taxonomy.semanticEvidenceByGenre?.[value]?.matched) ? 0 : 1);
    },
    0,
  );
}

function taxonomyCategoryMatches(result = {}, category = "") {
  const taxonomy = resultTaxonomy(result);
  return {
    narrative: taxonomy.canonicalGenreValues.length + taxonomy.semanticGenreValues.length,
    combined: taxonomy.combinedGenreValues.length,
    format: taxonomy.formatValues.length,
    audience: taxonomy.audienceValues.length,
    style: taxonomy.styleValues.length,
  }[category] > 0;
}

function runtimeMinutes(result = {}) {
  if (Number.isFinite(result.runtime)) return Number(result.runtime);
  const match = String(result.runtime || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function resultRuntimeMatches(result, match = {}) {
  const runtime = runtimeMinutes(result);
  if (!Number.isFinite(match.runtimeMaxMinutes) && !Number.isFinite(match.runtimeMinMinutes)) return true;
  if (!Number.isFinite(runtime)) return false;
  if (Number.isFinite(match.runtimeMaxMinutes) && runtime > match.runtimeMaxMinutes) return false;
  if (Number.isFinite(match.runtimeMinMinutes) && runtime < match.runtimeMinMinutes) return false;
  return true;
}

function resultMatchesExpected(result, expected = {}) {
  const match = expected.match || {};

  return (
    resultCountryMatches(result, match.country || []) &&
    resultContentTypeMatches(result, match.contentType || []) &&
    resultGenreMatches(result, match.genreAny || []) &&
    resultRuntimeMatches(result, match)
  );
}

function ratio(count, total) {
  return total > 0 ? count / total : 0;
}

function countBy(results, predicate) {
  return results.reduce((count, result) => count + (predicate(result) ? 1 : 0), 0);
}

function hasSingleTypeDominance(results, threshold = 0.8) {
  if (!results.length) return false;
  const counts = results.reduce((map, result) => {
    const type = resultContentType(result);
    map.set(type, (map.get(type) || 0) + 1);
    return map;
  }, new Map());
  return [...counts.values()].some((count) => count / results.length >= threshold);
}

function sourceIntegrityFails(results = []) {
  return results.some((result) => {
    const dataSource = normalizeValue(result.dataSource);
    const providerId = normalizeValue(result.providerId || result.source);
    if (dataSource === "tmdb") return providerId && providerId !== "tmdb";
    if (dataSource === "fallback") return !result.fallbackUsed && providerId !== "mock";
    return false;
  });
}

function evaluateFailIf(condition, results, testCase, metrics) {
  const expected = testCase.expected || {};
  const match = expected.match || {};

  switch (condition) {
    case "foreign-drama-dominates-top-results":
    case "non-japanese-results-dominate":
    case "non-us-results-dominate":
    case "us-action-dominates-top-results":
      return match.country?.length ? metrics.countryRatio < (expected.minimumCountryRatio || testCase.minimumMatchRatio || 0) : false;
    case "movie-or-animation-appears-in-top-results":
    case "non-movie-type-appears":
    case "movie-results-appear":
    case "non-animation-result-appears":
      return match.contentType?.length ? metrics.contentTypeRatio < 1 : false;
    case "tv-or-animation-dominates":
      return results.some((result) => resultContentType(result) !== "movie");
    case "animation-results-appear":
      return results.some((result) => resultContentType(result) === "animation");
    case "animation-only-results-when-all-types-selected":
      return hasSingleTypeDominance(results) && results.every((result) => resultContentType(result) === "animation");
    case "fallback-notice-missing-when-relaxed":
      return results.some((result) => result.fallbackRelaxed && !String(result.reason || "").includes("조건을 조금 넓혀"));
    case "same-results-as-runtime-long":
    case "same-results-as-runtime-short":
      return false;
    case "long-runtime-dominates-top-results":
      return countBy(results, (result) => (runtimeMinutes(result) || 0) > 120) / Math.max(results.length, 1) >= 0.5;
    case "short-runtime-dominates-top-results":
      return countBy(results, (result) => (runtimeMinutes(result) || 0) <= 60) / Math.max(results.length, 1) >= 0.5;
    case "tmdb-label-with-mock-results":
    case "fallback-no-with-mock-results":
    case "empty-state-auto-filled-by-mock":
    case "mock-results-without-fallback-flag":
      return sourceIntegrityFails(results);
    case "fallback-reason-empty":
      return results.some((result) => result.fallbackUsed && !result.fallbackReason && !result.reason);
    case "one-seed-dominates-results":
      return Number.isFinite(expected.maxSingleSeedDominanceRatio) && metrics.singleSeedDominanceRatio > expected.maxSingleSeedDominanceRatio;
    case "seed-title-reappears-as-recommendation":
      return (testCase.input?.titles || []).some((title) =>
        results.some((result) => normalizeValue(result.title) === normalizeValue(title)),
      );
    case "uk-not-represented-in-top-results":
      return match.country?.includes("GB") ? metrics.countryRatio === 0 : false;
    default:
      return false;
  }
}

function seedDominanceRatio(results = []) {
  if (!results.length) return 0;
  const counts = results.reduce((map, result) => {
    const seeds = [...new Set([
      ...(result.reasonSeeds || []),
      ...(result.seedTitles || []),
      result.reasonSeed,
      result.seedTitle,
    ].map(normalizeValue).filter(Boolean))];
    const contributionSeeds = seeds.length ? seeds : ["unknown"];
    const contribution = 1 / contributionSeeds.length;
    for (const seed of contributionSeeds) map.set(seed, (map.get(seed) || 0) + contribution);
    return map;
  }, new Map());
  return Math.max(...counts.values()) / results.length;
}

function contributingSeedCount(results = [], inputTitles = []) {
  const expectedSeeds = new Set(inputTitles.map(normalizeValue).filter(Boolean));
  const contributing = new Set();
  for (const result of results) {
    const seeds = [
      ...(result.reasonSeeds || []),
      ...(result.seedTitles || []),
      result.reasonSeed,
      result.seedTitle,
    ].map(normalizeValue).filter(Boolean);
    for (const seed of seeds) {
      if (!expectedSeeds.size || expectedSeeds.has(seed)) contributing.add(seed);
    }
  }
  return contributing.size;
}

function maxSingleFranchiseCount(results = []) {
  const counts = results.reduce((map, result) => {
    const key = normalizeValue(result.franchiseKey);
    if (!key) return map;
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
  return counts.size ? Math.max(...counts.values()) : 0;
}

function unknownCountryRatio(results = []) {
  return ratio(
    countBy(results, (result) => ["unknown", ""].includes(normalizeValue(result.countryValidation))),
    results.length,
  );
}

function resultTierRatio(results, tier) {
  return ratio(countBy(results, (result) => result.resultTier === tier), results.length);
}

function seedTitleMatchesResult(result, titles = []) {
  const resultTitle = normalizeValue(result.title || result.name);
  return normalizeValues(titles).includes(resultTitle);
}

function seedRelatedRatio(results = []) {
  return ratio(
    countBy(results, (result) => (
      Boolean(result.reasonSeed || result.seedTitle || result.seedSupplement) ||
      Number(result.scoreDetail?.signals?.titleMatch || 0) > 0
    )),
    results.length,
  );
}

function evaluationDiagnostics(context = {}) {
  return context.diagnostics || context.recommendationDebug || context || {};
}

function duplicateValueCount(values = []) {
  const normalized = values.map(normalizeValue).filter(Boolean);
  return normalized.length - new Set(normalized).size;
}

function resultProviderMediaTypeMatches(result = {}, contentTypes = []) {
  if (!contentTypes.length) return true;
  const mediaType = normalizeValue(result.mediaType || result.media_type);
  const expected = normalizeValues(contentTypes);
  if (expected.includes("animation")) return resultContentType(result) === "animation";
  if (expected.includes("drama")) return mediaType === "tv";
  if (expected.includes("movie")) return mediaType === "movie";
  return true;
}

const ENGLISH_PROVIDER_GENRES = new Set([
  "action & adventure",
  "sci-fi & fantasy",
  "war & politics",
  "science fiction",
  "tv movie",
  "news",
  "reality",
  "talk",
  "soap",
  "kids",
  "animation",
]);

function untranslatedProviderGenreCount(results = []) {
  return countBy(results, (result) => normalizeValues([
    ...(result.genres || []),
    ...String(result.genre || "").split(","),
  ]).some((value) => ENGLISH_PROVIDER_GENRES.has(value)));
}

function selectedReasonMatches(result = {}, selectedGenres = []) {
  if (!selectedGenres.length) return true;
  const reasonValue = normalizeValue(result.reasonTaxonomyValue);
  if (reasonValue) return selectedGenres.includes(reasonValue);
  const reason = normalizeValue(result.presentationReason || result.decisionReason || result.reason);
  const labels = {
    "genre-action": ["액션", "전투", "추격"],
    "genre-adventure": ["모험", "탐험", "여정"],
    "genre-action-adventure": ["액션·모험"],
    "genre-sf": ["sf", "우주", "미래"],
    "genre-fantasy": ["판타지", "마법"],
  };
  return selectedGenres.some((value) => (labels[value] || []).some((label) => reason.includes(normalizeValue(label))));
}

export function evaluateRecommendationCase(testCase, recommendationResults = [], context = {}) {
  const expected = testCase?.expected || {};
  const topN = expected.topN || recommendationResults.length;
  const scopedResults = recommendationResults.slice(0, topN);
  const totalCount = scopedResults.length;
  const matchedCount = countBy(scopedResults, (result) => resultMatchesExpected(result, expected));
  const matchRatio = ratio(matchedCount, totalCount);
  const diagnostics = evaluationDiagnostics(context);
  const minimumMatchRatio = diagnostics.liveQa && Number.isFinite(expected.minimumLiveMatchRatio)
    ? expected.minimumLiveMatchRatio
    : Number.isFinite(testCase?.minimumMatchRatio)
      ? testCase.minimumMatchRatio
      : 0;
  const inputTitles = testCase.input?.titles || [];
  const selectedGenres = genreContractTokens(testCase.input?.filters || []);
  const matchedValues = (result) => new Set(result.matchedTaxonomyValues || []);
  const duplicateDisplayTitleCount = duplicateValueCount(scopedResults.map((result) => result.title || result.name));
  const duplicateTmdbIdCount = duplicateValueCount(scopedResults.map((result) => (
    result.tmdbId || result.providerContentId || ""
  )).filter(Boolean));

  const metrics = {
    countryRatio: ratio(countBy(scopedResults, (result) => resultCountryMatches(result, expected.match?.country || [])), totalCount),
    contentTypeRatio: ratio(countBy(scopedResults, (result) => resultContentTypeMatches(result, expected.match?.contentType || [])), totalCount),
    genreRatio: ratio(countBy(scopedResults, (result) => resultGenreMatches(result, expected.match?.genreAny || [])), totalCount),
    runtimeRatio: ratio(countBy(scopedResults, (result) => resultRuntimeMatches(result, expected.match || {})), totalCount),
    singleSeedDominanceRatio: seedDominanceRatio(scopedResults),
    maxSingleFranchiseCount: maxSingleFranchiseCount(scopedResults),
    unknownCountryRatio: unknownCountryRatio(scopedResults),
    exactResultRatio: resultTierRatio(scopedResults, "exact"),
    sameCountryRelaxedRatio: resultTierRatio(scopedResults, "same-country-relaxed"),
    countryRelaxedRatio: resultTierRatio(scopedResults, "country-relaxed"),
    verifiedCountryRatio: ratio(
      countBy(scopedResults, (result) => normalizeValue(result.countryValidation) === "verified"),
      totalCount,
    ),
    providerFilteredCountryRatio: ratio(
      countBy(scopedResults, (result) => normalizeValue(result.countryValidation) === "provider-filtered"),
      totalCount,
    ),
    seedRelatedRatio: seedRelatedRatio(scopedResults),
    contributingSeedCount: contributingSeedCount(scopedResults, inputTitles),
    seedTitleExcluded: !scopedResults.some((result) => seedTitleMatchesResult(result, inputTitles)),
    tmdbRequestCount: Number(diagnostics.requestsUsed || 0),
    aggregateTmdbRequestCount: Number(diagnostics.aggregateRequestsUsed ?? diagnostics.requestsUsed ?? 0),
    listRequestCount: Number(diagnostics.listRequestsUsed || 0),
    detailRequestCount: Number(diagnostics.detailRequestsUsed || 0),
    duplicateDetailRequestCount: Number(diagnostics.duplicateDetailRequestCount || 0),
    requestBudgetExceeded: Boolean(diagnostics.budgetExhausted),
    requestContextCount: Number(diagnostics.requestContextCount || 0),
    processedSeedCount: Number(diagnostics.processedSeedCount || 0),
    unresolvedSeedCount: Number(diagnostics.unresolvedSeedCount || 0),
    deferredSeedCount: Number(diagnostics.deferredSeedCount || 0),
    deadlineExceeded: Boolean(diagnostics.deadlineExceeded),
    elapsedMs: Number(diagnostics.elapsedMs || 0),
    providerExactGenreRatio: ratio(
      countBy(scopedResults, (result) => resultGenreMatchMode(result, expected.match?.genreAny || []) === "provider-exact"),
      totalCount,
    ),
    providerCombinedGenreRatio: ratio(
      countBy(scopedResults, (result) => resultGenreMatchMode(result, expected.match?.genreAny || []) === "provider-combined"),
      totalCount,
    ),
    semanticGenreRatio: ratio(
      countBy(scopedResults, (result) => ["semantic", "semantic-specialized"].includes(resultGenreMatchMode(result, expected.match?.genreAny || []))),
      totalCount,
    ),
    providerOrSemanticGenreRatio: ratio(
      countBy(scopedResults, (result) => ["provider-exact", "provider-combined", "provider-combined-controlled", "semantic", "semantic-specialized"].includes(
        resultGenreMatchMode(result, expected.match?.genreAny || []),
      )),
      totalCount,
    ),
    plainDramaFalsePositiveCount: countBy(scopedResults, (result) => (
      genreContractTokens(expected.match?.genreAny || []).includes("genre-thriller") &&
      resultGenreMatchMode(result, expected.match?.genreAny || []) === "relaxed" &&
      normalizeValues(result.genreIds || []).includes("18")
    )),
    taxonomyCategoryMatched: ratio(
      countBy(scopedResults, (result) => taxonomyCategoryMatches(result, expected.taxonomyCategory)),
      totalCount,
    ),
    canonicalGenreRatio: ratio(
      countBy(scopedResults, (result) => taxonomyValuesMatch(result, "canonicalGenreValues", expected.match?.genreAny || [])),
      totalCount,
    ),
    combinedGenreRatio: ratio(
      countBy(scopedResults, (result) => taxonomyValuesMatch(result, "combinedGenreValues", expected.match?.genreAny || [])),
      totalCount,
    ),
    semanticSpecializedGenreRatio: ratio(
      countBy(scopedResults, (result) => taxonomyValuesMatch(result, "semanticGenreValues", expected.match?.genreAny || [])),
      totalCount,
    ),
    adjacentGenreRatio: ratio(
      countBy(scopedResults, (result) => resultGenreMatchMode(result, expected.match?.genreAny || []) === "adjacent"),
      totalCount,
    ),
    formatMatchRatio: ratio(
      countBy(scopedResults, (result) => taxonomyValuesMatch(result, "formatValues", expected.match?.genreAny || expected.formatAny || [])),
      totalCount,
    ),
    audienceMatchRatio: ratio(
      countBy(scopedResults, (result) => taxonomyValuesMatch(result, "audienceValues", expected.match?.genreAny || expected.audienceAny || [])),
      totalCount,
    ),
    styleMatchRatio: ratio(
      countBy(scopedResults, (result) => taxonomyValuesMatch(result, "styleValues", expected.match?.genreAny || expected.styleAny || [])),
      totalCount,
    ),
    duplicateSemanticSpecializationCount: scopedResults.reduce((count, result) => count + duplicateSemanticSpecializations(result), 0),
    incompatibleCanonicalGenreCount: scopedResults.reduce((count, result) => count + incompatibleCanonicalGenres(result), 0),
    plainDramaRomanceFalsePositiveCount: countBy(scopedResults, (result) => {
      const taxonomy = resultTaxonomy(result);
      return taxonomy.providerGenreIds.includes(18) &&
        !taxonomy.semanticEvidenceByGenre?.["genre-romance"]?.matched &&
        [...taxonomy.canonicalGenreValues, ...taxonomy.semanticGenreValues].includes("genre-romance");
    }),
    plainMysteryHorrorFalsePositiveCount: countBy(scopedResults, (result) => {
      const taxonomy = resultTaxonomy(result);
      return taxonomy.providerGenreIds.includes(9648) &&
        !taxonomy.semanticEvidenceByGenre?.["genre-horror"]?.matched &&
        [...taxonomy.canonicalGenreValues, ...taxonomy.semanticGenreValues].includes("genre-horror");
    }),
    formatInNarrativeResultCount: countBy(scopedResults, (result) => {
      const taxonomy = resultTaxonomy(result);
      return taxonomy.formatValues.some((value) => taxonomy.canonicalGenreValues.includes(value));
    }),
    audienceDoubleScoreCount: countBy(scopedResults, (result) => result.audienceDoubleScored === true),
    animationDuplicateSignalCount: countBy(scopedResults, (result) => result.animationSignalDuplicated === true),
    actualEligibleLaterSeedDeferredCount: Number(diagnostics.eligibleLaterSeedDeferredCount || 0),
    rawInputCount: Number(diagnostics.rawInputCount || 0),
    normalizedInputCount: Number(diagnostics.normalizedInputCount || 0),
    uniqueInputAliasCount: Number(diagnostics.uniqueInputAliasCount ?? diagnostics.inputAliasCount ?? 0),
    processedWorkCount: Number(diagnostics.processedWorkCount || 0),
    unresolvedRawInputCount: Number(diagnostics.unresolvedRawInputCount || 0),
    deferredRawInputCount: Number(diagnostics.deferredRawInputCount || 0),
    confirmedSeedCount: Number(diagnostics.confirmedSeedCount || 0),
    unconfirmedSeedCount: Number(diagnostics.unconfirmedSeedCount || 0),
    searchSkippedSeedCount: Number(diagnostics.searchSkippedSeedCount || 0),
    uniqueResolvedWorkCount: Number(diagnostics.uniqueResolvedWorkCount || 0),
    resolvedBySearchCount: Number(diagnostics.resolvedBySearchCount || 0),
    resolvedByConfirmedMetadataCount: Number(diagnostics.resolvedByConfirmedMetadataCount || 0),
    recyclableListBudgetUsed: Number(diagnostics.recyclableListBudgetUsed || 0),
    eligibleLaterSeedDeferredCount: Number(diagnostics.eligibleLaterSeedDeferredCount || 0),
    duplicateResolvedSeedCount: Number(diagnostics.duplicateResolvedSeedCount || 0),
    inputLanguagePreserved: diagnostics.inputLanguagePreserved !== false,
    genreOptionOrderMatched: diagnostics.genreOptionOrderMatched !== false,
    emptyStateMessageMatched: diagnostics.emptyStateMessageMatched !== false,
    preSemanticCandidateCount: Number(diagnostics.preSemanticCandidateCount || 0),
    postSemanticCandidateCount: Number(diagnostics.postSemanticCandidateCount || 0),
    semanticRecallRatio: Number.isFinite(diagnostics.semanticRecallRatio)
      ? Number(diagnostics.semanticRecallRatio)
      : ratio(Number(diagnostics.postSemanticCandidateCount || 0), Number(diagnostics.preSemanticCandidateCount || 0)),
    actionSemanticMatchCount: countBy(scopedResults, (result) => (
      matchedValues(result).has("genre-action") &&
      ["semantic-specialized", "provider-combined-controlled"].includes(resultGenreMatchMode(result, ["action"]))
    )),
    adventureSemanticMatchCount: countBy(scopedResults, (result) => (
      matchedValues(result).has("genre-adventure") &&
      ["semantic-specialized", "provider-combined-controlled"].includes(resultGenreMatchMode(result, ["adventure"]))
    )),
    equalEvidencePreservedCount: countBy(scopedResults, (result) => (
      matchedValues(result).has("genre-action") && matchedValues(result).has("genre-adventure")
    )),
    semanticDoubleScoreCount: countBy(scopedResults, (result) => result.semanticFamilyDoubleScored === true),
    controlledCombinedCount: countBy(scopedResults, (result) => result.genreMatchMode === "provider-combined-controlled"),
    plainDramaActionFalsePositiveCount: countBy(scopedResults, (result) => (
      matchedValues(result).has("genre-action") &&
      !(result.providerGenreIds || result.genreIds || []).map(Number).includes(10759)
    )),
    plainDramaAdventureFalsePositiveCount: countBy(scopedResults, (result) => (
      matchedValues(result).has("genre-adventure") &&
      !(result.providerGenreIds || result.genreIds || []).map(Number).includes(10759)
    )),
    selectedContentTypeMatchRatio: ratio(
      countBy(scopedResults, (result) => resultContentTypeMatches(result, testCase.input?.contentTypes || [])),
      totalCount,
    ),
    wrongProviderMediaTypeCount: countBy(scopedResults, (result) => (
      !resultProviderMediaTypeMatches(result, testCase.input?.contentTypes || [])
    )),
    untranslatedProviderGenreCount: untranslatedProviderGenreCount(scopedResults),
    selectedOptionReasonMatchRatio: ratio(
      countBy(scopedResults, (result) => selectedReasonMatches(result, selectedGenres)),
      totalCount,
    ),
    unselectedReasonGenreCount: countBy(scopedResults, (result) => {
      const reasonValue = normalizeValue(result.reasonTaxonomyValue);
      return Boolean(reasonValue) && !selectedGenres.includes(reasonValue);
    }),
    duplicateDisplayTitleCount,
    duplicateTmdbIdCount,
    multiGenreMatchedCount: countBy(scopedResults, (result) => Number(result.matchedSelectedGenreCount || matchedValues(result).size) > 1),
    singleGenreMatchedCount: countBy(scopedResults, (result) => Number(result.matchedSelectedGenreCount || matchedValues(result).size) === 1),
  };

  const failedReasons = [];
  if (totalCount === 0) failedReasons.push("no-results");
  if (matchRatio < minimumMatchRatio) failedReasons.push(`match-ratio-below-minimum:${matchRatio.toFixed(2)}<${minimumMatchRatio}`);
  if (Number.isFinite(expected.minimumResultCount) && totalCount < expected.minimumResultCount) {
    failedReasons.push("insufficient-valid-candidates");
  }
  if (diagnostics.liveQa && Number.isFinite(expected.minimumLiveResultCount) && totalCount < expected.minimumLiveResultCount) {
    failedReasons.push("live-result-count-below-threshold");
  }
  if (Number.isFinite(expected.minimumCountryRatio) && metrics.countryRatio < expected.minimumCountryRatio) {
    failedReasons.push("country-ratio-below-threshold");
  }
  if (Number.isFinite(expected.minimumGenreFamilyRatio) && metrics.genreRatio < expected.minimumGenreFamilyRatio) {
    failedReasons.push("genre-ratio-below-threshold");
  }
  if (Number.isFinite(expected.minimumContentTypeRatio) && metrics.contentTypeRatio < expected.minimumContentTypeRatio) {
    failedReasons.push("content-type-mismatch");
  }
  if (Number.isFinite(expected.minimumRuntimeRatio) && metrics.runtimeRatio < expected.minimumRuntimeRatio) {
    failedReasons.push("runtime-ratio-below-threshold");
  }
  if (Number.isFinite(expected.maxSingleFranchiseCount) && metrics.maxSingleFranchiseCount > expected.maxSingleFranchiseCount) {
    failedReasons.push("franchise-dominance");
  }
  if (
    expected.forbidCrossCountryPrimary &&
    scopedResults.some((result) => !resultCountryMatches(result, expected.match?.country || []) || result.resultTier === "country-relaxed")
  ) {
    failedReasons.push("foreign-result-in-primary");
  }
  if (expected.requiresExactResultTier && scopedResults.some((result) => result.resultTier !== "exact")) {
    failedReasons.push("non-exact-result-tier");
  }
  if (Number.isFinite(expected.maximumUnknownCountryRatio) && metrics.unknownCountryRatio > expected.maximumUnknownCountryRatio) {
    failedReasons.push("unverified-country-metadata");
  }
  if (Number.isFinite(expected.minimumExactResultRatio) && metrics.exactResultRatio < expected.minimumExactResultRatio) {
    failedReasons.push("exact-ratio-below-threshold");
  }
  if (
    Number.isFinite(expected.maximumSameCountryRelaxedRatio) &&
    metrics.sameCountryRelaxedRatio > expected.maximumSameCountryRelaxedRatio
  ) {
    failedReasons.push("same-country-relaxed-ratio-above-threshold");
  }
  if (Number.isFinite(expected.maximumCountryRelaxedRatio) && metrics.countryRelaxedRatio > expected.maximumCountryRelaxedRatio) {
    failedReasons.push("country-relaxed-result-in-primary");
  }
  if (Number.isFinite(expected.minimumVerifiedCountryRatio) && metrics.verifiedCountryRatio < expected.minimumVerifiedCountryRatio) {
    failedReasons.push("verified-country-ratio-below-threshold");
  }
  if (Number.isFinite(expected.minimumProviderFilteredCountryRatio) && metrics.providerFilteredCountryRatio < expected.minimumProviderFilteredCountryRatio) {
    failedReasons.push("provider-filtered-country-ratio-below-threshold");
  }
  if (Number.isFinite(expected.minimumSeedRelatedRatio) && metrics.seedRelatedRatio < expected.minimumSeedRelatedRatio) {
    failedReasons.push("seed-score-not-applied");
  }
  if (expected.requiresSeedTitleScoring && !scopedResults.some((result) => Number(result.scoreDetail?.signals?.titleMatch || 0) > 0)) {
    failedReasons.push("seed-score-not-applied");
  }
  if (expected.seedTitleExcluded && !metrics.seedTitleExcluded) {
    failedReasons.push("seed-title-present-in-results");
  }
  if (
    Number.isFinite(expected.maximumTmdbRequestCount) &&
    metrics.aggregateTmdbRequestCount > expected.maximumTmdbRequestCount
  ) {
    failedReasons.push("request-budget-exceeded");
  }
  if (Number.isFinite(expected.maximumDetailRequestCount) && metrics.detailRequestCount > expected.maximumDetailRequestCount) {
    failedReasons.push("request-budget-exceeded");
  }
  if (Number.isFinite(expected.maximumListRequestCount) && metrics.listRequestCount > expected.maximumListRequestCount) {
    failedReasons.push("request-budget-exceeded");
  }
  if (expected.requestBudgetExceeded === false && metrics.requestBudgetExceeded) {
    failedReasons.push("request-budget-exceeded");
  }
  if (metrics.duplicateDetailRequestCount > Number(expected.maximumDuplicateDetailRequestCount || 0)) {
    failedReasons.push("duplicate-detail-request");
  }
  if (Number.isFinite(expected.requestContextCount) && metrics.requestContextCount !== expected.requestContextCount) {
    failedReasons.push("request-context-count-mismatch");
  }
  if (
    Number.isFinite(expected.minimumContributingSeedCount) &&
    metrics.contributingSeedCount < expected.minimumContributingSeedCount
  ) {
    failedReasons.push("insufficient-seed-contribution");
  }
  if (
    Number.isFinite(expected.maxSingleSeedDominanceRatio) &&
    metrics.singleSeedDominanceRatio > expected.maxSingleSeedDominanceRatio
  ) {
    failedReasons.push("single-seed-dominance");
  }
  if (expected.requiresDeferredSeedMetadata && metrics.deferredSeedCount === 0) {
    failedReasons.push("deferred-seed-metadata-missing");
  }
  if (Number.isFinite(expected.minimumProcessedSeedCount) && metrics.processedSeedCount < expected.minimumProcessedSeedCount) {
    failedReasons.push("insufficient-processed-seeds");
  }
  if (Number.isFinite(expected.minimumUnresolvedSeedCount) && metrics.unresolvedSeedCount < expected.minimumUnresolvedSeedCount) {
    failedReasons.push("unresolved-seed-metadata-missing");
  }
  if (
    expected.requiresUnresolvedOrDeferredSeeds &&
    metrics.unresolvedSeedCount + metrics.deferredSeedCount === 0
  ) {
    failedReasons.push("failed-seed-metadata-missing");
  }
  if (typeof expected.deadlineExceeded === "boolean" && metrics.deadlineExceeded !== expected.deadlineExceeded) {
    failedReasons.push("deadline-state-mismatch");
  }
  if (Number.isFinite(expected.maximumElapsedMs) && metrics.elapsedMs > expected.maximumElapsedMs) {
    failedReasons.push("recommendation-deadline-exceeded");
  }
  if (expected.requiresPartialResultsOnDeadline && metrics.deadlineExceeded && totalCount === 0) {
    failedReasons.push("deadline-partial-results-missing");
  }
  if (
    expected.aggregateRequestsMustEqualRequests &&
    metrics.aggregateTmdbRequestCount !== metrics.tmdbRequestCount
  ) {
    failedReasons.push("aggregate-request-count-mismatch");
  }
  if (
    Number.isFinite(expected.minimumProviderOrSemanticGenreRatio) &&
    metrics.providerOrSemanticGenreRatio < expected.minimumProviderOrSemanticGenreRatio
  ) {
    failedReasons.push("semantic-genre-ratio-below-threshold");
  }
  if (Number.isFinite(expected.maximumPlainDramaFalsePositiveCount) && metrics.plainDramaFalsePositiveCount > expected.maximumPlainDramaFalsePositiveCount) {
    failedReasons.push("plain-drama-false-positive");
  }
  if (Number.isFinite(expected.minimumConfirmedSeedCount) && metrics.confirmedSeedCount < expected.minimumConfirmedSeedCount) {
    failedReasons.push("confirmed-seed-metadata-missing");
  }
  if (Number.isFinite(expected.minimumSearchSkippedSeedCount) && metrics.searchSkippedSeedCount < expected.minimumSearchSkippedSeedCount) {
    failedReasons.push("confirmed-seed-search-not-skipped");
  }
  if (Number.isFinite(expected.minimumUniqueResolvedWorkCount) && metrics.uniqueResolvedWorkCount < expected.minimumUniqueResolvedWorkCount) {
    failedReasons.push("duplicate-resolved-seed");
  }
  if (Number.isFinite(expected.maximumDuplicateResolvedSeedCount) && metrics.duplicateResolvedSeedCount > expected.maximumDuplicateResolvedSeedCount) {
    failedReasons.push("duplicate-resolved-seed");
  }
  if (expected.requiresSearchBudgetRecycling && metrics.recyclableListBudgetUsed <= 0) {
    failedReasons.push("reusable-search-budget-not-recycled");
  }
  if (expected.forbidEligibleLaterSeedDeferred && metrics.eligibleLaterSeedDeferredCount > 0) {
    failedReasons.push("valid-later-seed-deferred");
  }
  if (expected.inputLanguagePreserved && !metrics.inputLanguagePreserved) {
    failedReasons.push("input-language-not-preserved");
  }
  if (expected.genreOptionOrderMatched && !metrics.genreOptionOrderMatched) {
    failedReasons.push("genre-option-order-mismatch");
  }
  if (expected.emptyStateMessageMatched && !metrics.emptyStateMessageMatched) {
    failedReasons.push("incorrect-empty-state-message");
  }
  if (expected.taxonomyCategory && metrics.taxonomyCategoryMatched < 1) {
    failedReasons.push("taxonomy-category-mismatch");
  }
  if (Number.isFinite(expected.minimumCanonicalGenreRatio) && metrics.canonicalGenreRatio < expected.minimumCanonicalGenreRatio) {
    failedReasons.push("canonical-genre-ratio-below-threshold");
  }
  if (Number.isFinite(expected.minimumCombinedGenreRatio) && metrics.combinedGenreRatio < expected.minimumCombinedGenreRatio) {
    failedReasons.push("combined-genre-ratio-below-threshold");
  }
  const minimumSemanticSpecializedGenreRatio = diagnostics.liveQa &&
    Number.isFinite(expected.minimumLiveSemanticSpecializedGenreRatio)
    ? expected.minimumLiveSemanticSpecializedGenreRatio
    : expected.minimumSemanticSpecializedGenreRatio;
  if (
    Number.isFinite(minimumSemanticSpecializedGenreRatio) &&
    metrics.semanticSpecializedGenreRatio < minimumSemanticSpecializedGenreRatio
  ) {
    failedReasons.push("semantic-specialization-missing");
  }
  if (Number.isFinite(expected.minimumFormatMatchRatio) && metrics.formatMatchRatio < expected.minimumFormatMatchRatio) {
    failedReasons.push("taxonomy-category-mismatch");
  }
  if (Number.isFinite(expected.minimumAudienceMatchRatio) && metrics.audienceMatchRatio < expected.minimumAudienceMatchRatio) {
    failedReasons.push("taxonomy-category-mismatch");
  }
  if (Number.isFinite(expected.minimumStyleMatchRatio) && metrics.styleMatchRatio < expected.minimumStyleMatchRatio) {
    failedReasons.push("taxonomy-category-mismatch");
  }
  if (metrics.duplicateSemanticSpecializationCount > Number(expected.maximumDuplicateSemanticSpecializationCount ?? Infinity)) {
    failedReasons.push("duplicate-semantic-specialization");
  }
  if (metrics.incompatibleCanonicalGenreCount > Number(expected.maximumIncompatibleCanonicalGenreCount ?? Infinity)) {
    failedReasons.push("incompatible-canonical-genres");
  }
  if (metrics.plainDramaRomanceFalsePositiveCount > Number(expected.maximumPlainDramaRomanceFalsePositiveCount ?? Infinity)) {
    failedReasons.push("plain-drama-romance-false-positive");
  }
  if (metrics.plainMysteryHorrorFalsePositiveCount > Number(expected.maximumPlainMysteryHorrorFalsePositiveCount ?? Infinity)) {
    failedReasons.push("plain-mystery-horror-false-positive");
  }
  if (metrics.formatInNarrativeResultCount > Number(expected.maximumFormatInNarrativeResultCount ?? Infinity)) {
    failedReasons.push("format-classified-as-narrative");
  }
  if (metrics.audienceDoubleScoreCount > Number(expected.maximumAudienceDoubleScoreCount ?? Infinity)) {
    failedReasons.push("audience-double-counted");
  }
  if (metrics.animationDuplicateSignalCount > Number(expected.maximumAnimationDuplicateSignalCount ?? Infinity)) {
    failedReasons.push("animation-signal-duplicated");
  }
  if (
    Number.isFinite(expected.actualEligibleLaterSeedDeferredCount) &&
    metrics.actualEligibleLaterSeedDeferredCount !== expected.actualEligibleLaterSeedDeferredCount
  ) {
    failedReasons.push("eligible-later-seed-metric-invalid");
  }
  if (Number.isFinite(expected.rawInputCount) && metrics.rawInputCount !== expected.rawInputCount) {
    failedReasons.push("raw-input-count-mismatch");
  }
  if (Number.isFinite(expected.uniqueInputAliasCount) && metrics.uniqueInputAliasCount !== expected.uniqueInputAliasCount) {
    failedReasons.push("raw-input-count-mismatch");
  }
  if (Number.isFinite(expected.uniqueResolvedWorkCount) && metrics.uniqueResolvedWorkCount !== expected.uniqueResolvedWorkCount) {
    failedReasons.push("resolved-work-count-mismatch");
  }
  if (Number.isFinite(expected.minimumSemanticRecallRatio) && metrics.semanticRecallRatio < expected.minimumSemanticRecallRatio) {
    failedReasons.push(expected.match?.genreAny?.includes("adventure")
      ? "adventure-semantic-recall-below-threshold"
      : "action-semantic-recall-below-threshold");
  }
  if (Number.isFinite(expected.minimumActionSemanticMatchCount) && metrics.actionSemanticMatchCount < expected.minimumActionSemanticMatchCount) {
    failedReasons.push("action-semantic-recall-below-threshold");
  }
  if (Number.isFinite(expected.minimumAdventureSemanticMatchCount) && metrics.adventureSemanticMatchCount < expected.minimumAdventureSemanticMatchCount) {
    failedReasons.push("adventure-semantic-recall-below-threshold");
  }
  if (Number.isFinite(expected.minimumEqualEvidencePreservedCount) && metrics.equalEvidencePreservedCount < expected.minimumEqualEvidencePreservedCount) {
    failedReasons.push("equal-evidence-candidate-dropped");
  }
  if (metrics.semanticDoubleScoreCount > Number(expected.maximumSemanticDoubleScoreCount ?? Infinity)) {
    failedReasons.push("semantic-family-double-counted");
  }
  if (Number.isFinite(expected.minimumControlledCombinedCount) && metrics.controlledCombinedCount < expected.minimumControlledCombinedCount) {
    failedReasons.push("controlled-combined-quality-failure");
  }
  if (metrics.plainDramaActionFalsePositiveCount > Number(expected.maximumPlainDramaActionFalsePositiveCount ?? Infinity)) {
    failedReasons.push("plain-drama-action-false-positive");
  }
  if (metrics.plainDramaAdventureFalsePositiveCount > Number(expected.maximumPlainDramaAdventureFalsePositiveCount ?? Infinity)) {
    failedReasons.push("plain-drama-adventure-false-positive");
  }
  if (
    Number.isFinite(expected.minimumSelectedContentTypeMatchRatio) &&
    metrics.selectedContentTypeMatchRatio < expected.minimumSelectedContentTypeMatchRatio
  ) {
    failedReasons.push("content-type-provider-path-mismatch");
  }
  if (metrics.wrongProviderMediaTypeCount > Number(expected.maximumWrongProviderMediaTypeCount ?? Infinity)) {
    failedReasons.push("content-type-provider-path-mismatch");
  }
  if (metrics.untranslatedProviderGenreCount > Number(expected.maximumUntranslatedProviderGenreCount ?? Infinity)) {
    failedReasons.push("untranslated-provider-genre");
  }
  if (
    Number.isFinite(expected.minimumSelectedOptionReasonMatchRatio) &&
    metrics.selectedOptionReasonMatchRatio < expected.minimumSelectedOptionReasonMatchRatio
  ) {
    failedReasons.push("recommendation-reason-selection-mismatch");
  }
  if (metrics.unselectedReasonGenreCount > Number(expected.maximumUnselectedReasonGenreCount ?? Infinity)) {
    failedReasons.push("unselected-genre-used-as-primary-reason");
  }
  if (metrics.duplicateDisplayTitleCount > Number(expected.maximumDuplicateDisplayTitleCount ?? Infinity)) {
    failedReasons.push("duplicate-display-title-primary");
  }
  if (metrics.duplicateTmdbIdCount > Number(expected.maximumDuplicateTmdbIdCount ?? Infinity)) {
    failedReasons.push("duplicate-tmdb-content");
  }
  if (Number.isFinite(expected.minimumMultiGenreMatchedCount) && metrics.multiGenreMatchedCount < expected.minimumMultiGenreMatchedCount) {
    failedReasons.push("multi-genre-match-missing");
  }

  for (const condition of expected.failIf || []) {
    if (evaluateFailIf(condition, scopedResults, testCase, metrics)) {
      failedReasons.push(`fail-if:${condition}`);
    }
  }

  return {
    caseId: testCase?.id || "unknown",
    pass: failedReasons.length === 0,
    score: Math.round(matchRatio * 100),
    matchedCount,
    totalCount,
    matchRatio,
    metrics,
    failedReasons,
  };
}

export function evaluateRecommendationCases(testCases = [], resultsByCaseId = {}, contextsByCaseId = {}) {
  return testCases.map((testCase) => evaluateRecommendationCase(
    testCase,
    resultsByCaseId[testCase.id] || [],
    contextsByCaseId[testCase.id] || {},
  ));
}

/*
Sample usage:

import dataset from "../../../../docs/project/recommendation-qa-dataset.json";
import { evaluateRecommendationCase } from "./evaluateRecommendationCase";

const report = evaluateRecommendationCase(dataset[0], recommendationResults);
*/
