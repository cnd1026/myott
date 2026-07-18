import { calculateRecommendationScore } from "../scoring/recommendationWeightEngine.js";
import {
  candidateGenreMatchDetail,
  genreContractFor,
  genreIdsForFilters,
  normalizeTaxonomyValue,
  selectedGenreFilters,
} from "../genres/genreContract.js";
import {
  contentTypeMatchesSubmittedPreferences,
  evaluateHardFilters,
  normalizeDisplayContentType,
  normalizeProviderMediaType,
} from "../filters/hardFilterContract.js";
import {
  contentTypeCounts,
  reserveTypeCoverage,
  typeCoverageState,
} from "../recall/recallPlanner.js";

export { selectedGenreFilters };

export const PRIMARY_RESULT_LIMIT = 12;
export const RAW_CANDIDATE_LIMIT = 72;

const COUNTRY_CODE_BY_FILTER = Object.freeze({
  "country-kr": "KR",
  "country-us": "US",
  "country-jp": "JP",
  "country-gb": "GB",
  "country-fr": "FR",
  "country-de": "DE",
  "country-cn": "CN",
  "country-hk": "HK",
  "country-tw": "TW",
  "country-in": "IN",
  "country-ca": "CA",
  "country-au": "AU",
  "country-es": "ES",
  "country-it": "IT",
  "country-th": "TH",
  "country-br": "BR",
  "country-mx": "MX",
});

const COUNTRY_CODE_BY_LABEL = Object.freeze({
  한국: "KR",
  미국: "US",
  일본: "JP",
  영국: "GB",
  프랑스: "FR",
  독일: "DE",
  중국: "CN",
  홍콩: "HK",
  대만: "TW",
  인도: "IN",
  캐나다: "CA",
  호주: "AU",
  스페인: "ES",
  이탈리아: "IT",
  태국: "TH",
  브라질: "BR",
  멕시코: "MX",
});

const TIER_ORDER = Object.freeze({
  exact: 1,
  "same-country-relaxed": 2,
  "country-relaxed": 3,
});
const GENRE_MATCH_MODE_ORDER = Object.freeze({
  "provider-exact": 1,
  "semantic-specialized": 2,
  semantic: 2,
  "provider-combined-controlled": 3,
  "provider-combined": 4,
  adjacent: 5,
  relaxed: 6,
});

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const unique = (values) => [...new Set(values.filter(Boolean))];

const uniqueNumbers = (values) =>
  [...new Set(values.map(Number).filter((value) => Number.isFinite(value)))];

export function selectedCountryCode(filters = []) {
  return filters.map((filter) => COUNTRY_CODE_BY_FILTER[filter]).find(Boolean) || "";
}

export function normalizeContentType(item = {}) {
  return normalizeDisplayContentType(item) || "movie";
}

export function normalizedCountryCodes(item = {}) {
  const productionCountries = (item.productionCountries || item.production_countries || []).map((country) =>
    typeof country === "string" ? country : country?.iso_3166_1,
  );
  const codes = [
    ...(item.countryCodes || []),
    ...(item.originCountries || item.origin_country || []),
    ...productionCountries,
    item.countryCode,
    COUNTRY_CODE_BY_LABEL[item.country],
  ];

  return unique(codes.map((code) => String(code || "").trim().toUpperCase()));
}

export function genreFamilyIds(filters = [], mediaType = "movie") {
  return genreIdsForFilters(filters, mediaType);
}

export function candidateGenreMatches(item = {}, filters = []) {
  const genreFilters = selectedGenreFilters(filters);
  if (!genreFilters.length) return true;
  const match = candidateGenreMatchDetail(item, genreFilters);
  if (!match.genreMatched) return false;
  if (
    normalizeContentType(item) !== "animation" ||
    genreFilters.every((filter) => normalizeTaxonomyValue(filter) === "style-animation")
  ) {
    return true;
  }
  const itemGenreIds = uniqueNumbers(item.genreIds || item.genre_ids || []);
  return itemGenreIds.some((genreId) => genreId !== 16);
}

function selectedTypes(contentTypes = []) {
  return unique(contentTypes.map((type) => (type === "tv" || type === "series" ? "drama" : type)));
}

export function candidateContentTypeMatches(item, contentTypes, filters = []) {
  return contentTypeMatchesSubmittedPreferences(item, contentTypes, filters);
}

function officialFranchiseKey(item = {}) {
  const collectionId = item.collectionId || item.belongsToCollectionId || item.belongs_to_collection?.id;
  if (collectionId) return `collection:${collectionId}`;
  const seriesId = item.seriesId || item.franchiseId;
  if (seriesId) return `series:${seriesId}`;
  return "";
}

function conservativeTitleFranchiseKey(item = {}) {
  const title = String(item.originalTitle || item.original_title || item.title || "").trim();
  if (!title) return "";
  const colonPrefix = title.split(/[:：]/)[0]?.trim();
  if (colonPrefix && colonPrefix !== title && colonPrefix.length >= 5) {
    return `title:${normalizeText(colonPrefix).replace(/[^\p{L}\p{N}]+/gu, "-")}`;
  }
  return "";
}

export function candidateFranchiseKey(item = {}) {
  return item.franchiseKey || officialFranchiseKey(item) || conservativeTitleFranchiseKey(item);
}

function contextualFranchiseCandidates(items = []) {
  const roots = new Map();
  const genericRoots = new Set(["detective", "project", "american", "national", "secret"]);

  for (const item of items) {
    if (candidateFranchiseKey(item)) continue;
    const originalTitle = String(item.originalTitle || item.original_title || "").trim();
    const [firstToken] = originalTitle.split(/\s+/);
    const normalizedRoot = normalizeText(firstToken).replace(/[^\p{L}\p{N}]+/gu, "");
    if (normalizedRoot.length < 7 || genericRoots.has(normalizedRoot)) continue;
    if (!roots.has(normalizedRoot)) roots.set(normalizedRoot, []);
    roots.get(normalizedRoot).push(item);
  }

  const contextualKeys = new Map();
  for (const [root, candidates] of roots) {
    if (candidates.length < 3) continue;
    for (const candidate of candidates) contextualKeys.set(candidate, `series-title:${root}`);
  }
  return contextualKeys;
}

export function classifyCandidate(item = {}, { filters = [], contentTypes = [] } = {}) {
  const country = selectedCountryCode(filters);
  const countryCodes = normalizedCountryCodes(item);
  const genreMatch = candidateGenreMatchDetail(item, filters);
  const selectedContracts = selectedGenreFilters(filters).map(genreContractFor).filter(Boolean);
  const formatSelected = selectedContracts.some((contract) => contract.category === "format");
  const unexpectedFormat = genreMatch.formatValues.length > 0 && !formatSelected;
  const contentTypeMatched = candidateContentTypeMatches(item, contentTypes, filters) && !unexpectedFormat;
  const genreMatched = candidateGenreMatches(item, filters);
  const providerFiltered = item.countryValidation === "provider-filtered";
  const countryVerified = !country || countryCodes.includes(country) || providerFiltered;
  const countryMatched = !country || countryVerified;
  const countryValidation = !country
    ? countryCodes.length
      ? "verified"
      : "unknown"
    : countryCodes.includes(country)
      ? "verified"
      : providerFiltered
        ? "provider-filtered"
        : countryCodes.length
          ? "mismatch"
          : "unknown";

  let resultTier = "exact";
  if (!countryMatched) resultTier = "country-relaxed";
  else if (!genreMatched) resultTier = "same-country-relaxed";

  const exactMatch = contentTypeMatched && countryMatched && genreMatched;
  const fallbackRelaxed = resultTier !== "exact";

  const classified = {
    ...item,
    providerMediaType: normalizeProviderMediaType(item),
    displayContentType: normalizeDisplayContentType(item),
    contentType: normalizeContentType(item),
    type: normalizeContentType(item),
    countryCodes: countryCodes.length || !providerFiltered || !country ? countryCodes : [country],
    countryValidation,
    countryMatched,
    genreMatched,
    genreMatchMode: genreMatched ? genreMatch.genreMatchMode : "relaxed",
    semanticGenreMatched: genreMatched && genreMatch.semanticGenreMatched,
    semanticGenreReasons: genreMatched ? genreMatch.semanticGenreReasons : [],
    matchedTaxonomyValues: genreMatched ? genreMatch.matchedTaxonomyValues : [],
    matchedSemanticGenres: genreMatched ? genreMatch.matchedSemanticGenres || [] : [],
    primarySemanticGenre: genreMatched ? genreMatch.primarySemanticGenre || "" : "",
    semanticConfidence: genreMatched ? genreMatch.semanticConfidence || "none" : "none",
    selectedTaxonomyValues: genreMatch.selectedTaxonomyValues || [],
    unmatchedSelectedTaxonomyValues: genreMatch.unmatchedSelectedTaxonomyValues || [],
    matchedSelectedGenreCount: genreMatch.matchedSelectedGenreCount || 0,
    selectedGenreCount: genreMatch.selectedGenreCount || 0,
    allSelectedGenresMatched: Boolean(genreMatch.allSelectedGenresMatched),
    providerCombinedFallbackReason: genreMatch.providerCombinedFallbackReason || "",
    providerGenreIds: genreMatch.providerGenreIds,
    providerGenreNames: genreMatch.providerGenreNames,
    canonicalGenreValues: genreMatch.canonicalGenreValues,
    combinedGenreValues: genreMatch.combinedGenreValues,
    semanticGenreValues: genreMatch.semanticGenreValues,
    controlledSemanticGenreValues: genreMatch.controlledSemanticGenreValues || [],
    formatValues: genreMatch.formatValues,
    audienceValues: genreMatch.audienceValues,
    styleValues: genreMatch.styleValues,
    semanticEvidenceByGenre: genreMatch.semanticEvidenceByGenre,
    contentTypeMatched,
    resultTier,
    exactMatch,
    fallbackStage: resultTier === "exact" ? "strict" : resultTier,
    fallbackRelaxed,
    reason: genreMatched && genreMatch.recommendationReason
      ? genreMatch.recommendationReason
      : item.reason,
    franchiseKey: candidateFranchiseKey(item),
    candidateSource: item.candidateSource || "provider",
  };
  const hardFilters = evaluateHardFilters(classified, { filters, contentTypes });
  return {
    ...classified,
    ...hardFilters,
    hardFilterStatus: {
      ...hardFilters.hardFilterStatus,
      country: countryValidation === "unknown" ? "unknown" : countryMatched ? "pass" : "fail",
      genre: genreMatched ? "pass" : "fail",
    },
  };
}

function contentKey(item = {}) {
  const providerId = item.providerId || item.source || "unknown";
  const tmdbId = item.tmdbId || item.providerContentId;
  if (tmdbId) return `${providerId}:${normalizeProviderMediaType(item) || item.type}:${tmdbId}`;
  return `${providerId}:${normalizeContentType(item)}:${normalizeText(item.originalTitle || item.title)}`;
}

function displayTitleKey(item = {}) {
  const title = normalizeText(item.title || item.name).replace(/[^\p{L}\p{N}]+/gu, "");
  if (!title || ["제목없음", "unknown"].includes(title)) return "";
  return title;
}

function scoreCandidate(item, preferences) {
  return {
    ...item,
    scoreDetail: calculateRecommendationScore(item, preferences),
  };
}

function compareCandidates(left, right) {
  return (
    (TIER_ORDER[left.resultTier] || 99) - (TIER_ORDER[right.resultTier] || 99) ||
    Number(right.countryMatched) - Number(left.countryMatched) ||
    Number(right.genreMatched) - Number(left.genreMatched) ||
    Number(right.contentTypeMatched) - Number(left.contentTypeMatched) ||
    (GENRE_MATCH_MODE_ORDER[left.genreMatchMode] || 99) - (GENRE_MATCH_MODE_ORDER[right.genreMatchMode] || 99) ||
    Number(right.seedCount || 0) - Number(left.seedCount || 0) ||
    Number(right.scoreDetail?.finalScore || 0) - Number(left.scoreDetail?.finalScore || 0) ||
    Number(right.voteCount || right.vote_count || 0) - Number(left.voteCount || left.vote_count || 0) ||
    Number(right.popularity || 0) - Number(left.popularity || 0) ||
    Number(right.rating || right.vote_average || 0) - Number(left.rating || left.vote_average || 0) ||
    String(left.title || "").localeCompare(String(right.title || ""), "ko")
  );
}

function balanceSeedSources(items = [], seedTitles = [], contentTypes = [], limit = PRIMARY_RESULT_LIMIT) {
  if (seedTitles.length <= 1) return balanceTypes(items, contentTypes, limit);

  const normalizedSeedOrder = seedTitles.map(normalizeText).filter(Boolean);
  const common = items.filter((item) => Number(item.seedCount || item.reasonSeeds?.length || 0) > 1);
  const directGroups = new Map(normalizedSeedOrder.map((seed) => [seed, []]));
  const supplementGroups = new Map(normalizedSeedOrder.map((seed) => [seed, []]));
  const ungrouped = [];

  for (const item of items) {
    if (common.includes(item)) continue;
    const seed = normalizeText(item.reasonSeed || item.seedTitle || item.reasonSeeds?.[0]);
    const target = item.seedSupplement ? supplementGroups : directGroups;
    if (target.has(seed)) target.get(seed).push(item);
    else ungrouped.push(item);
  }

  for (const groups of [directGroups, supplementGroups]) {
    for (const [seed, group] of groups) {
      groups.set(seed, balanceTypes(group, contentTypes, group.length));
    }
  }

  const balanced = common.slice(0, limit);
  for (const groups of [directGroups, supplementGroups]) {
    let cursor = 0;
    while (balanced.length < limit) {
      let added = false;
      for (const seed of normalizedSeedOrder) {
        const item = groups.get(seed)?.[cursor];
        if (!item) continue;
        balanced.push(item);
        added = true;
        if (balanced.length >= limit) break;
      }
      if (!added) break;
      cursor += 1;
    }
  }

  for (const item of ungrouped) {
    if (balanced.length >= limit) break;
    balanced.push(item);
  }
  return balanced;
}

function dedupeCandidates(items = [], { franchiseLimit = 1 } = {}) {
  const seenContent = new Set();
  const seenDisplayTitles = new Set();
  const franchiseCounts = new Map();
  const kept = [];
  const excluded = [];

  for (const item of items) {
    const key = contentKey(item);
    if (seenContent.has(key)) {
      excluded.push({ ...item, exclusionReason: "duplicate-content" });
      continue;
    }
    const titleKey = displayTitleKey(item);
    if (titleKey && seenDisplayTitles.has(titleKey)) {
      excluded.push({ ...item, exclusionReason: "duplicate-display-title" });
      continue;
    }

    const franchiseKey = item.franchiseKey;
    if (franchiseKey && (franchiseCounts.get(franchiseKey) || 0) >= franchiseLimit) {
      excluded.push({ ...item, exclusionReason: "duplicate-franchise" });
      continue;
    }

    seenContent.add(key);
    if (titleKey) seenDisplayTitles.add(titleKey);
    if (franchiseKey) franchiseCounts.set(franchiseKey, (franchiseCounts.get(franchiseKey) || 0) + 1);
    kept.push(item);
  }

  return { kept, excluded };
}

function balanceTypes(items = [], contentTypes = [], limit = PRIMARY_RESULT_LIMIT) {
  return reserveTypeCoverage(items, contentTypes, limit);
}
export function roundRobinCandidates(items = [], limit = RAW_CANDIDATE_LIMIT) {
  const bucketOrder = ["movie", "drama", "animation"];
  const buckets = new Map(bucketOrder.map((type) => [type, []]));
  for (const item of items) buckets.get(normalizeContentType(item))?.push(item);

  const results = [];
  let cursor = 0;
  while (results.length < limit) {
    let added = false;
    for (const type of bucketOrder) {
      const item = buckets.get(type)?.[cursor];
      if (!item) continue;
      results.push(item);
      added = true;
      if (results.length >= limit) break;
    }
    if (!added) break;
    cursor += 1;
  }
  return results;
}

function dedupeAgainst(items = [], selected = []) {
  const selectedContent = new Set(selected.map(contentKey));
  const selectedDisplayTitles = new Set(selected.map(displayTitleKey).filter(Boolean));
  const selectedFranchises = new Set(selected.map((item) => item.franchiseKey).filter(Boolean));
  const eligible = [];
  const excluded = [];

  for (const item of items) {
    if (selectedContent.has(contentKey(item))) {
      excluded.push({ ...item, exclusionReason: "duplicate-content" });
      continue;
    }
    if (selectedDisplayTitles.has(displayTitleKey(item))) {
      excluded.push({ ...item, exclusionReason: "duplicate-display-title" });
      continue;
    }
    if (item.franchiseKey && selectedFranchises.has(item.franchiseKey)) {
      excluded.push({ ...item, exclusionReason: "duplicate-franchise" });
      continue;
    }
    eligible.push(item);
  }
  return { eligible, excluded };
}

function diagnosticCandidate(item = {}) {
  return {
    title: item.title,
    tmdbId: item.tmdbId || item.providerContentId || null,
    countryCodes: item.countryCodes || [],
    countryValidation: item.countryValidation || "unknown",
    genres: item.genres || [],
    genreIds: item.genreIds || [],
    providerGenreIds: item.providerGenreIds || item.genreIds || [],
    canonicalGenreValues: item.canonicalGenreValues || [],
    combinedGenreValues: item.combinedGenreValues || [],
    semanticGenreValues: item.semanticGenreValues || [],
    controlledSemanticGenreValues: item.controlledSemanticGenreValues || [],
    formatValues: item.formatValues || [],
    audienceValues: item.audienceValues || [],
    styleValues: item.styleValues || [],
    genreMatchMode: item.genreMatchMode,
    matchedTaxonomyValues: item.matchedTaxonomyValues || [],
    selectedTaxonomyValues: item.selectedTaxonomyValues || [],
    unmatchedSelectedTaxonomyValues: item.unmatchedSelectedTaxonomyValues || [],
    semanticConfidence: item.semanticConfidence || "none",
    semanticEvidenceByGenre: item.semanticEvidenceByGenre || {},
    providerMediaType: item.providerMediaType || normalizeProviderMediaType(item),
    displayContentType: item.displayContentType || normalizeDisplayContentType(item),
    contentType: item.contentType || item.type,
    resultTier: item.resultTier,
    candidateSource: item.candidateSource,
    fallbackStage: item.fallbackStage,
    franchiseKey: item.franchiseKey || "",
    finalScore: item.scoreDetail?.finalScore ?? null,
    runtimeMinutes: item.runtimeMinutes ?? item.runtime ?? null,
    actualProviderIds: item.actualProviderIds || [],
    actualProviders: item.actualProviders || [],
    actualStreamingProviderIds: item.actualStreamingProviderIds || [],
    actualStreamingProviders: item.actualStreamingProviders || [],
    hardFilterStatus: item.hardFilterStatus || {},
    exclusionReason: item.exclusionReason || "",
  };
}

export function finalizeCandidatePool(
  candidates = [],
  {
    filters = [],
    contentTypes = [],
    limit = PRIMARY_RESULT_LIMIT,
    seedTitles = [],
    seedGenreIds = [],
    diversity = {},
  } = {},
) {
  const country = selectedCountryCode(filters);
  const exclusions = [];
  const classified = [];
  const boundedCandidates = candidates.slice(0, RAW_CANDIDATE_LIMIT);
  const contextualFranchiseKeys = contextualFranchiseCandidates(boundedCandidates);

  for (const candidate of boundedCandidates) {
    const item = classifyCandidate(
      contextualFranchiseKeys.has(candidate)
        ? { ...candidate, franchiseKey: contextualFranchiseKeys.get(candidate) }
        : candidate,
      { filters, contentTypes },
    );
    if (!item.pass) {
      exclusions.push({ ...item, exclusionReason: item.exclusionReason || "hard-filter-failed" });
      continue;
    }
    classified.push(item);
  }

  const preferences = {
    filters,
    contentTypes,
    seedTitles,
    countryCodes: country ? [country] : [],
    // Selected filters already carry canonical values. Re-adding their Provider IDs
    // would turn one combined ID into multiple preferences in the Weight Engine.
    genreIds: uniqueNumbers(seedGenreIds),
    diversity,
  };
  const scored = classified.map((item) => scoreCandidate(item, preferences)).sort(compareCandidates);
  const relaxedEligible = country ? scored.filter((item) => item.resultTier === "country-relaxed") : [];
  const exactDedupe = dedupeCandidates(scored.filter((item) => item.resultTier === "exact"));
  const exactResults = balanceSeedSources(exactDedupe.kept, seedTitles, contentTypes, limit);
  const sameCountryDedupe = dedupeCandidates(scored.filter((item) => item.resultTier === "same-country-relaxed"));
  const sameCountryEligible = dedupeAgainst(sameCountryDedupe.kept, exactResults);
  const remainingSlots = Math.max(0, limit - exactResults.length);
  const selectedGenres = selectedGenreFilters(filters).map(normalizeTaxonomyValue);
  const requestedTypes = selectedTypes(contentTypes);
  const requiresSpecializedTvRecall = requestedTypes.includes("drama") &&
    selectedGenres.some((value) => genreContractFor(value)?.tv?.semanticRequired);
  const maxSameCountryRelaxed = requiresSpecializedTvRecall
    ? 0
    : Math.min(remainingSlots, Math.floor(exactResults.length * 0.25));
  const sameCountryResults = balanceSeedSources(
    sameCountryEligible.eligible,
    seedTitles,
    contentTypes,
    maxSameCountryRelaxed,
  );
  const selectedSameCountryKeys = new Set(sameCountryResults.map(contentKey));
  const unusedSameCountryCandidates = sameCountryEligible.eligible
    .filter((item) => !selectedSameCountryKeys.has(contentKey(item)))
    .map((item) => ({ ...item, exclusionReason: item.exclusionReason || "genre-mismatch" }));
  const primaryResults = [...exactResults, ...sameCountryResults];
  const relaxedDedupe = dedupeCandidates(relaxedEligible);
  const allExclusions = [
    ...exclusions,
    ...exactDedupe.excluded,
    ...sameCountryDedupe.excluded,
    ...sameCountryEligible.excluded,
    ...unusedSameCountryCandidates,
    ...relaxedDedupe.excluded,
  ];
  const exactResultRatio = primaryResults.length ? exactResults.length / primaryResults.length : 0;
  const sameCountryRelaxedRatio = primaryResults.length ? sameCountryResults.length / primaryResults.length : 0;
  const rawCandidateCountByType = boundedCandidates.reduce((counts, item) => {
    const type = normalizeContentType(item);
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, { movie: 0, drama: 0, animation: 0 });
  const availableExactByType = contentTypeCounts(exactDedupe.kept);
  const selectedExactByType = contentTypeCounts(exactResults);
  const exactTypeCoverage = typeCoverageState(availableExactByType, requestedTypes, { finalLimit: limit });
  const selectedTypeCoverage = typeCoverageState(selectedExactByType, requestedTypes, { finalLimit: limit });
  const requestedTypeCoverage = Object.fromEntries(requestedTypes.map((type) => [
    type,
    Number(selectedExactByType[type] || 0) >= Math.min(
      Number(exactTypeCoverage.targets[type] || 0),
      Number(availableExactByType[type] || 0),
    ),
  ]));
  const dedupeExclusions = allExclusions.filter((item) => ["duplicate-content", "duplicate-display-title"].includes(item.exclusionReason)).length;
  const franchiseExclusions = allExclusions.filter((item) => item.exclusionReason === "duplicate-franchise").length;
  const contentTypeExclusions = allExclusions.filter((item) => item.hardFilterStatus?.contentType === "fail").length;
  const genreExclusions = allExclusions.filter((item) => item.genreMatched === false).length;
  const countryExclusions = allExclusions.filter((item) => item.countryValidation === "mismatch").length;
  const hardFilterExclusions = allExclusions.filter((item) => item.pass === false).length;

  return {
    results: primaryResults,
    relaxedResults: relaxedDedupe.kept.slice(0, limit),
    exclusions: allExclusions,
    diagnostics: {
      rawCandidateCount: Math.min(candidates.length, RAW_CANDIDATE_LIMIT),
      rawCandidateCountByType,
      classifiedCount: classified.length,
      primaryCount: primaryResults.length,
      finalCount: primaryResults.length,
      availableExactByType,
      selectedExactByType,
      requestedTypeCoverage,
      typeCoverageShortfall: selectedTypeCoverage.shortfall,
      typeCoverageScarcity: exactTypeCoverage.shortfall,
      dedupeExclusions,
      franchiseExclusions,
      contentTypeExclusions,
      genreExclusions,
      countryExclusions,
      hardFilterExclusions,
      exactCandidateCount: exactResults.length,
      sameCountryRelaxedCount: sameCountryResults.length,
      primaryExactRatio: exactResultRatio,
      primaryRelaxedRatio: sameCountryRelaxedRatio,
      relaxedCount: Math.min(relaxedDedupe.kept.length, limit),
      candidates: primaryResults.map(diagnosticCandidate),
      relaxedCandidates: relaxedDedupe.kept.slice(0, limit).map(diagnosticCandidate),
      exclusions: allExclusions.slice(0, 24).map(diagnosticCandidate),
      exclusionCounts: allExclusions.reduce((counts, item) => {
        const reason = item.exclusionReason || "unknown";
        counts[reason] = (counts[reason] || 0) + 1;
        return counts;
      }, {}),
    },
  };
}
