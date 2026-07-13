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

const GENRE_ALIASES = {
  action: ["action", "액션", "genre-action", "28", "10759"],
  animation: ["animation", "애니", "애니메이션", "genre-animation", "16"],
  comedy: ["comedy", "코미디", "genre-comedy", "35"],
  crime: ["crime", "범죄", "genre-crime", "80"],
  drama: ["drama", "드라마", "genre-drama", "18"],
  fantasy: ["fantasy", "판타지", "genre-fantasy", "14", "10765"],
  horror: ["horror", "공포", "genre-horror", "27"],
  mystery: ["mystery", "미스터리", "genre-mystery", "9648"],
  romance: ["romance", "로맨스", "genre-romance", "10749"],
  sf: ["sf", "sci-fi", "science fiction", "science-fiction", "SF", "genre-sf", "genre-sf-fantasy", "878", "10765"],
  thriller: ["thriller", "스릴러", "genre-thriller", "53"],
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
  const tokens = collectResultTokens(result);
  const expectedGenres = genres.flatMap((genre) => GENRE_ALIASES[normalizeValue(genre)] || [genre]);
  return normalizeValues(expectedGenres).some((genre) => tokens.has(genre));
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
    const seed = normalizeValue(result.reasonSeed || result.seedTitle || result.reasonSeeds?.[0] || "unknown");
    map.set(seed, (map.get(seed) || 0) + 1);
    return map;
  }, new Map());
  return Math.max(...counts.values()) / results.length;
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

export function evaluateRecommendationCase(testCase, recommendationResults = []) {
  const expected = testCase?.expected || {};
  const topN = expected.topN || recommendationResults.length;
  const scopedResults = recommendationResults.slice(0, topN);
  const totalCount = scopedResults.length;
  const matchedCount = countBy(scopedResults, (result) => resultMatchesExpected(result, expected));
  const matchRatio = ratio(matchedCount, totalCount);
  const minimumMatchRatio = Number.isFinite(testCase?.minimumMatchRatio) ? testCase.minimumMatchRatio : 0;

  const metrics = {
    countryRatio: ratio(countBy(scopedResults, (result) => resultCountryMatches(result, expected.match?.country || [])), totalCount),
    contentTypeRatio: ratio(countBy(scopedResults, (result) => resultContentTypeMatches(result, expected.match?.contentType || [])), totalCount),
    genreRatio: ratio(countBy(scopedResults, (result) => resultGenreMatches(result, expected.match?.genreAny || [])), totalCount),
    runtimeRatio: ratio(countBy(scopedResults, (result) => resultRuntimeMatches(result, expected.match || {})), totalCount),
    singleSeedDominanceRatio: seedDominanceRatio(scopedResults),
    maxSingleFranchiseCount: maxSingleFranchiseCount(scopedResults),
    unknownCountryRatio: unknownCountryRatio(scopedResults),
  };

  const failedReasons = [];
  if (totalCount === 0) failedReasons.push("no-results");
  if (matchRatio < minimumMatchRatio) failedReasons.push(`match-ratio-below-minimum:${matchRatio.toFixed(2)}<${minimumMatchRatio}`);
  if (Number.isFinite(expected.minimumResultCount) && totalCount < expected.minimumResultCount) {
    failedReasons.push("insufficient-valid-candidates");
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

export function evaluateRecommendationCases(testCases = [], resultsByCaseId = {}) {
  return testCases.map((testCase) => evaluateRecommendationCase(testCase, resultsByCaseId[testCase.id] || []));
}

/*
Sample usage:

import dataset from "../../../../docs/project/recommendation-qa-dataset.json";
import { evaluateRecommendationCase } from "./evaluateRecommendationCase";

const report = evaluateRecommendationCase(dataset[0], recommendationResults);
*/
