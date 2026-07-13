import { calculateRecommendationScore } from "../scoring/recommendationWeightEngine.js";

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

const GENRE_FAMILIES = Object.freeze({
  "genre-action": {
    movie: [28, 80, 53],
    tv: [10759, 80, 9648],
  },
  "genre-action-adventure": {
    movie: [28, 12],
    tv: [10759],
  },
  "genre-adventure": {
    movie: [12],
    tv: [10759],
  },
  "genre-animation": {
    movie: [16],
    tv: [16],
  },
  "genre-comedy": {
    movie: [35],
    tv: [35],
  },
  "genre-crime": {
    movie: [80, 53],
    tv: [80, 9648],
  },
  "genre-drama": {
    movie: [18],
    tv: [18],
  },
  "genre-family": {
    movie: [10751],
    tv: [10751, 10762],
  },
  "genre-fantasy": {
    movie: [14],
    tv: [10765],
  },
  "genre-horror": {
    movie: [27, 53],
    tv: [9648],
  },
  "genre-mystery": {
    movie: [9648, 53],
    tv: [9648, 80],
  },
  "genre-romance": {
    movie: [10749],
    tv: [18],
  },
  "genre-sf": {
    movie: [878],
    tv: [10765],
  },
  "genre-sf-fantasy": {
    movie: [878, 14],
    tv: [10765],
  },
  "genre-thriller": {
    movie: [53, 80, 9648],
    tv: [80, 9648],
  },
  "genre-tv-movie": {
    movie: [10770],
    tv: [],
  },
});

const TIER_ORDER = Object.freeze({
  exact: 1,
  "same-country-relaxed": 2,
  "country-relaxed": 3,
});

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const unique = (values) => [...new Set(values.filter(Boolean))];

const uniqueNumbers = (values) =>
  [...new Set(values.map(Number).filter((value) => Number.isFinite(value)))];

export function selectedCountryCode(filters = []) {
  return filters.map((filter) => COUNTRY_CODE_BY_FILTER[filter]).find(Boolean) || "";
}

export function normalizeContentType(item = {}) {
  const genreIds = uniqueNumbers(item.genreIds || item.genre_ids || []);
  const rawType = normalizeText(item.contentType || item.type || item.mediaType || item.media_type);
  if (rawType === "animation" || genreIds.includes(16)) return "animation";
  if (["drama", "series", "tv"].includes(rawType)) return "drama";
  return "movie";
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
  const targetType = mediaType === "tv" || mediaType === "drama" ? "tv" : "movie";
  return uniqueNumbers(
    filters.flatMap((filter) => {
      if (GENRE_FAMILIES[filter]) return GENRE_FAMILIES[filter][targetType] || [];
      if (filter.startsWith("tmdb-genre-")) return [filter.replace("tmdb-genre-", "")];
      return [];
    }),
  );
}

export function selectedGenreFilters(filters = []) {
  return filters.filter((filter) => filter.startsWith("genre-") || filter.startsWith("tmdb-genre-"));
}

export function candidateGenreMatches(item = {}, filters = []) {
  const genreFilters = selectedGenreFilters(filters);
  if (!genreFilters.length) return true;

  const mediaType = item.mediaType === "tv" || normalizeContentType(item) === "drama" ? "tv" : "movie";
  const expectedIds = genreFamilyIds(genreFilters, mediaType);
  const itemGenreIds = uniqueNumbers(item.genreIds || item.genre_ids || []);
  if (!expectedIds.length || !itemGenreIds.length) return false;

  const hasExpectedGenre = expectedIds.some((genreId) => itemGenreIds.includes(genreId));
  if (!hasExpectedGenre) return false;

  if (normalizeContentType(item) === "animation" && genreFilters.some((filter) => filter !== "genre-animation")) {
    return expectedIds.some((genreId) => genreId !== 16 && itemGenreIds.includes(genreId));
  }

  return true;
}

function selectedTypes(contentTypes = []) {
  return unique(contentTypes.map((type) => (type === "tv" || type === "series" ? "drama" : type)));
}

function candidateContentTypeMatches(item, contentTypes) {
  const types = selectedTypes(contentTypes);
  return !types.length || types.includes(normalizeContentType(item));
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
  const contentTypeMatched = candidateContentTypeMatches(item, contentTypes);
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

  return {
    ...item,
    contentType: normalizeContentType(item),
    type: normalizeContentType(item),
    countryCodes: countryCodes.length || !providerFiltered || !country ? countryCodes : [country],
    countryValidation,
    countryMatched,
    genreMatched,
    contentTypeMatched,
    resultTier,
    exactMatch,
    fallbackStage: resultTier === "exact" ? "strict" : resultTier,
    fallbackRelaxed,
    franchiseKey: candidateFranchiseKey(item),
    candidateSource: item.candidateSource || "provider",
  };
}

function contentKey(item = {}) {
  const providerId = item.providerId || item.source || "unknown";
  const tmdbId = item.tmdbId || item.providerContentId;
  if (tmdbId) return `${providerId}:${item.mediaType || item.type}:${tmdbId}`;
  return `${providerId}:${normalizeContentType(item)}:${normalizeText(item.originalTitle || item.title)}`;
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
    Number(right.scoreDetail?.finalScore || 0) - Number(left.scoreDetail?.finalScore || 0) ||
    Number(right.voteCount || right.vote_count || 0) - Number(left.voteCount || left.vote_count || 0) ||
    Number(right.popularity || 0) - Number(left.popularity || 0) ||
    Number(right.rating || right.vote_average || 0) - Number(left.rating || left.vote_average || 0) ||
    String(left.title || "").localeCompare(String(right.title || ""), "ko")
  );
}

function dedupeCandidates(items = [], { franchiseLimit = 1 } = {}) {
  const seenContent = new Set();
  const franchiseCounts = new Map();
  const kept = [];
  const excluded = [];

  for (const item of items) {
    const key = contentKey(item);
    if (seenContent.has(key)) {
      excluded.push({ ...item, exclusionReason: "duplicate-content" });
      continue;
    }

    const franchiseKey = item.franchiseKey;
    if (franchiseKey && (franchiseCounts.get(franchiseKey) || 0) >= franchiseLimit) {
      excluded.push({ ...item, exclusionReason: "duplicate-franchise" });
      continue;
    }

    seenContent.add(key);
    if (franchiseKey) franchiseCounts.set(franchiseKey, (franchiseCounts.get(franchiseKey) || 0) + 1);
    kept.push(item);
  }

  return { kept, excluded };
}

function balanceTypes(items = [], contentTypes = [], limit = PRIMARY_RESULT_LIMIT) {
  const types = selectedTypes(contentTypes);
  if (types.length <= 1) return items.slice(0, limit);

  const byTier = new Map();
  for (const item of items) {
    const tier = item.resultTier || "exact";
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push(item);
  }

  const balanced = [];
  for (const tier of ["exact", "same-country-relaxed", "country-relaxed"]) {
    const tierItems = byTier.get(tier) || [];
    const groups = new Map(types.map((type) => [type, []]));
    for (const item of tierItems) groups.get(normalizeContentType(item))?.push(item);
    let cursor = 0;
    while (balanced.length < limit) {
      let added = false;
      for (const type of types) {
        const item = groups.get(type)?.[cursor];
        if (!item) continue;
        balanced.push(item);
        added = true;
        if (balanced.length >= limit) break;
      }
      if (!added) break;
      cursor += 1;
    }
    if (balanced.length >= limit) break;
  }

  for (const item of items) {
    if (balanced.length >= limit) break;
    if (!balanced.includes(item)) balanced.push(item);
  }
  return balanced;
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
  const selectedFranchises = new Set(selected.map((item) => item.franchiseKey).filter(Boolean));
  const eligible = [];
  const excluded = [];

  for (const item of items) {
    if (selectedContent.has(contentKey(item))) {
      excluded.push({ ...item, exclusionReason: "duplicate-content" });
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
    contentType: item.contentType || item.type,
    resultTier: item.resultTier,
    candidateSource: item.candidateSource,
    fallbackStage: item.fallbackStage,
    franchiseKey: item.franchiseKey || "",
    finalScore: item.scoreDetail?.finalScore ?? null,
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
    if (!item.contentTypeMatched) {
      exclusions.push({ ...item, exclusionReason: "content-type-mismatch" });
      continue;
    }
    classified.push(item);
  }

  const preferences = {
    filters,
    contentTypes,
    seedTitles,
    countryCodes: country ? [country] : [],
    genreIds: uniqueNumbers(
      [
        ...seedGenreIds,
        ...["movie", "tv"].flatMap((mediaType) => genreFamilyIds(filters, mediaType)),
      ],
    ),
    diversity,
  };
  const scored = classified.map((item) => scoreCandidate(item, preferences)).sort(compareCandidates);
  const relaxedEligible = country ? scored.filter((item) => item.resultTier === "country-relaxed") : [];
  const exactDedupe = dedupeCandidates(scored.filter((item) => item.resultTier === "exact"));
  const exactResults = balanceTypes(exactDedupe.kept, contentTypes, limit);
  const sameCountryDedupe = dedupeCandidates(scored.filter((item) => item.resultTier === "same-country-relaxed"));
  const sameCountryEligible = dedupeAgainst(sameCountryDedupe.kept, exactResults);
  const remainingSlots = Math.max(0, limit - exactResults.length);
  const maxSameCountryRelaxed = Math.min(remainingSlots, Math.floor(exactResults.length * 0.25));
  const sameCountryResults = balanceTypes(sameCountryEligible.eligible, contentTypes, maxSameCountryRelaxed);
  const primaryResults = [...exactResults, ...sameCountryResults];
  const relaxedDedupe = dedupeCandidates(relaxedEligible);
  const allExclusions = [
    ...exclusions,
    ...exactDedupe.excluded,
    ...sameCountryDedupe.excluded,
    ...sameCountryEligible.excluded,
    ...relaxedDedupe.excluded,
  ];
  const exactResultRatio = primaryResults.length ? exactResults.length / primaryResults.length : 0;
  const sameCountryRelaxedRatio = primaryResults.length ? sameCountryResults.length / primaryResults.length : 0;
  const rawCandidateCountByType = boundedCandidates.reduce((counts, item) => {
    const type = normalizeContentType(item);
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, { movie: 0, drama: 0, animation: 0 });

  return {
    results: primaryResults,
    relaxedResults: relaxedDedupe.kept.slice(0, limit),
    exclusions: allExclusions,
    diagnostics: {
      rawCandidateCount: Math.min(candidates.length, RAW_CANDIDATE_LIMIT),
      rawCandidateCountByType,
      classifiedCount: classified.length,
      primaryCount: primaryResults.length,
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
