import {
  recommendationPenalties,
  recommendationScoreScale,
  recommendationWeights,
} from "./recommendationWeights.js";
import {
  classifyTaxonomyValues,
  genreContractFor,
  genreContractTokens,
  genreMatchStrength,
} from "../genres/genreContract.js";
import { RUNTIME_FILTERS } from "../filters/hardFilterContract.js";

const CONTENT_TYPE_ALIASES = Object.freeze({
  movie: ["movie", "film", "영화"],
  tv: ["tv", "drama", "series", "show", "드라마", "시리즈"],
  animation: ["animation", "anime", "animated", "애니", "애니메이션"],
});

const COUNTRY_ALIASES = Object.freeze({
  kr: ["kr", "한국", "대한민국", "country-kr"],
  jp: ["jp", "일본", "country-jp"],
  us: ["us", "미국", "country-us"],
  gb: ["gb", "uk", "영국", "country-gb", "country-uk"],
  fr: ["fr", "프랑스", "country-fr"],
  de: ["de", "독일", "country-de"],
  cn: ["cn", "중국", "country-cn"],
  hk: ["hk", "홍콩", "country-hk"],
  tw: ["tw", "대만", "country-tw"],
});

const RUNTIME_PRESETS = Object.freeze({
  short: RUNTIME_FILTERS["runtime-short"],
  medium: RUNTIME_FILTERS["runtime-medium"],
  long: RUNTIME_FILTERS["runtime-long"],
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeToken = (value) =>
  normalizeText(value)
    .replace(/^genre-/, "")
    .replace(/^country-/, "")
    .replace(/^type-/, "")
    .replace(/^mood-/, "")
    .replace(/^runtime-/, "");

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [value];
};

const unique = (values) =>
  Array.from(new Set(asArray(values).map((value) => normalizeToken(value)).filter(Boolean)));

const canonicalizeByAlias = (value, aliases) => {
  const token = normalizeToken(value);
  if (!token) return "";

  return (
    Object.entries(aliases).find(([, aliasValues]) =>
      aliasValues.some((alias) => normalizeToken(alias) === token)
    )?.[0] || token
  );
};

const canonicalizeValues = (values, aliases) =>
  unique(values).map((value) => canonicalizeByAlias(value, aliases));

const getNested = (source, path) =>
  path.reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), source);

const getTitleValues = (item) =>
  unique([
    item.title,
    item.name,
    item.originalTitle,
    item.original_title,
    item.originalName,
    item.original_name,
  ]);

const getPreferenceTitles = (preferences) =>
  unique([
    ...asArray(preferences.title),
    ...asArray(preferences.titles),
    ...asArray(preferences.seedTitle),
    ...asArray(preferences.seedTitles),
    ...asArray(preferences.inputs),
  ]);

const getItemSeedValues = (item) =>
  unique([
    item.reasonSeed,
    item.seedTitle,
    ...asArray(item.reasonSeeds),
    ...asArray(item.seedTitles),
  ]);

const getItemGenres = (item) => {
  const taxonomy = classifyTaxonomyValues(item);
  return unique([
    ...taxonomy.canonicalGenreValues,
    ...taxonomy.semanticGenreValues,
    ...taxonomy.combinedGenreValues,
    ...taxonomy.audienceValues,
    ...taxonomy.styleValues,
  ]);
};

const getPreferenceGenres = (preferences) =>
  genreContractTokens([
    ...asArray(preferences.genreIds),
    ...asArray(preferences.genre_ids),
    ...asArray(preferences.genres),
    ...asArray(preferences.genre),
    ...asArray(preferences.filters).filter((filter) => {
      const value = normalizeText(filter);
      return ["genre-", "format-", "audience-", "style-", "tmdb-genre-"].some((prefix) => value.startsWith(prefix));
    }),
    ...asArray(getNested(preferences, ["options", "genreIds"])),
    ...asArray(getNested(preferences, ["options", "genres"])),
  ]).filter((value) => genreContractFor(value)?.category !== "format");

const getItemCountries = (item) =>
  canonicalizeValues([
    ...asArray(item.countryCodes),
    ...asArray(item.countryCode),
    ...asArray(item.originCountry),
    ...asArray(item.origin_country),
    ...asArray(item.productionCountries),
    ...asArray(item.country),
    ...asArray(item.tags).filter((tag) => normalizeText(tag).startsWith("country-")),
  ], COUNTRY_ALIASES);

const getPreferenceCountries = (preferences) =>
  canonicalizeValues([
    ...asArray(preferences.countryCodes),
    ...asArray(preferences.countryCode),
    ...asArray(preferences.countries),
    ...asArray(preferences.country),
    ...asArray(preferences.filters).filter((filter) => normalizeText(filter).startsWith("country-")),
    ...asArray(getNested(preferences, ["options", "countryCodes"])),
    ...asArray(getNested(preferences, ["options", "countries"])),
  ], COUNTRY_ALIASES);

const normalizeContentType = (value) => {
  const token = normalizeToken(value);
  if (!token) return "";

  return (
    Object.entries(CONTENT_TYPE_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => normalizeText(alias) === token)
    )?.[0] || token
  );
};

const getItemContentType = (item) =>
  getItemGenres(item).includes("style-animation")
    ? "animation"
    : normalizeContentType(item.contentType || item.type || item.mediaType || item.media_type);

const getItemProviderMediaType = (item) => {
  const token = normalizeContentType(item.mediaType || item.media_type || item.providerMediaType || item.contentType || item.type);
  if (token === "tv" || ["drama", "series"].includes(normalizeToken(item.mediaType || item.media_type))) return "drama";
  if (token === "animation" && !item.mediaType && !item.media_type) return "animation";
  return token === "drama" ? "drama" : "movie";
};

const getPreferenceContentTypes = (preferences) =>
  unique([
    ...asArray(preferences.contentTypes),
    ...asArray(preferences.contentType),
    ...asArray(preferences.types),
    ...asArray(preferences.type),
    ...asArray(preferences.filters).filter((filter) => normalizeText(filter).startsWith("type-")),
    ...asArray(getNested(preferences, ["options", "contentTypes"])),
  ]).map(normalizeContentType);

const contentTypeMatchSignal = (item, selectedContentTypes, preferences) => {
  if (!selectedContentTypes.length) return 1;
  const outputType = getItemContentType(item);
  const mediaType = getItemProviderMediaType(item);
  const animationStyleSelected = getPreferenceGenres(preferences).includes("style-animation");
  return selectedContentTypes.some((type) => {
    if (type === "animation") return outputType === "animation";
    if (outputType === "animation" && !animationStyleSelected) return false;
    if (type === "movie") return mediaType === "movie";
    if (type === "tv" || type === "drama") return mediaType === "drama";
    return type === outputType;
  }) ? 1 : 0;
};

const genreMatchSignal = (item, preferences, selectedContentTypes) => {
  const preferenceGenres = getPreferenceGenres(preferences).filter((value) =>
    !(value === "style-animation" && selectedContentTypes.includes("animation")),
  );
  if (!preferenceGenres.length) return 0.5;
  const groups = new Map();
  for (const value of preferenceGenres) {
    const contract = genreContractFor(value);
    const groupKey = contract?.specializationGroup || value;
    const strength = genreMatchStrength(item, [value]).strength;
    groups.set(groupKey, Math.max(groups.get(groupKey) || 0, strength));
  }
  const contributions = [...groups.values()];
  return clamp01(contributions.reduce((sum, value) => sum + value, 0) / contributions.length);
};

const getItemMoods = (item) =>
  unique([
    ...asArray(item.moods),
    ...asArray(item.mood),
    ...asArray(item.tags).filter((tag) => normalizeText(tag).startsWith("mood-")),
  ]);

const getPreferenceMoods = (preferences) =>
  unique([
    ...asArray(preferences.moods),
    ...asArray(preferences.mood),
    ...asArray(preferences.filters).filter((filter) => normalizeText(filter).startsWith("mood-")),
    ...asArray(getNested(preferences, ["options", "moods"])),
  ]);

const getRuntimeMinutes = (item) => {
  const runtime = item.runtimeMinutes ?? item.runtime ?? item.duration;
  if (Number.isFinite(Number(runtime))) return Number(runtime);

  const episodeRuntime = asArray(item.episode_run_time || item.episodeRuntime)
    .map(Number)
    .filter(Number.isFinite);
  if (episodeRuntime.length > 0) return episodeRuntime[0];

  return null;
};

const getRuntimePreference = (preferences) => {
  const direct = preferences.runtime || preferences.runtimePreference;
  if (typeof direct === "object" && direct !== null) return direct;

  const runtimeToken =
    direct ||
    asArray(preferences.filters)
      .map(normalizeText)
      .find((filter) => filter.startsWith("runtime-"));

  const normalized = normalizeToken(runtimeToken);
  return RUNTIME_PRESETS[normalized] || null;
};

const getNumericSignal = (value, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return clamp01(number / max);
};

const overlapRatio = (itemValues, preferenceValues) => {
  if (preferenceValues.length === 0) return 0.5;
  if (itemValues.length === 0) return 0;

  const itemSet = new Set(itemValues);
  const matched = preferenceValues.filter((value) => itemSet.has(value)).length;
  return clamp01(matched / preferenceValues.length);
};

const titleMatchSignal = (item, preferences) => {
  const itemTitles = getTitleValues(item);
  const itemSeeds = getItemSeedValues(item);
  const preferenceTitles = getPreferenceTitles(preferences);
  if (preferenceTitles.length === 0) return 0.5;
  if (itemTitles.length === 0 && itemSeeds.length === 0) return 0;

  if (preferenceTitles.some((title) => itemSeeds.includes(title))) return 1;
  if (preferenceTitles.some((title) => itemTitles.includes(title))) return 1;
  if (
    preferenceTitles.some((seed) =>
      [...itemTitles, ...itemSeeds].some((title) => title.includes(seed) || seed.includes(title))
    )
  ) {
    return 0.7;
  }
  return 0;
};

const runtimeMatchSignal = (item, preferences, penalties) => {
  const runtimePreference = getRuntimePreference(preferences);
  if (!runtimePreference) return 0.5;

  const runtimeMinutes = getRuntimeMinutes(item);
  if (!Number.isFinite(runtimeMinutes)) {
    penalties.push({
      id: "runtimeUnknown",
      value: recommendationPenalties.runtimeUnknown,
      reason: "Runtime metadata is unavailable.",
    });
    return 0.5;
  }

  const meetsMin = runtimePreference.min === undefined || runtimeMinutes >= runtimePreference.min;
  const meetsMax = runtimePreference.max === undefined || runtimeMinutes <= runtimePreference.max;
  return meetsMin && meetsMax ? 1 : 0;
};

const diversitySignal = (item, preferences) => {
  const diversity = preferences.diversity || {};
  const seenTypes = unique(diversity.contentTypes || diversity.types);
  const seenCountries = unique(diversity.countries || diversity.countryCodes);
  const seenGenres = unique(diversity.genres || diversity.genreIds);

  if (seenTypes.length === 0 && seenCountries.length === 0 && seenGenres.length === 0) return 0.5;

  let score = 1;
  if (seenTypes.includes(getItemContentType(item))) score -= 0.25;
  if (getItemCountries(item).some((country) => seenCountries.includes(country))) score -= 0.2;
  if (getItemGenres(item).some((genre) => seenGenres.includes(genre))) score -= 0.15;
  return clamp01(score);
};

const buildReasons = (signals) => {
  const reasons = [];
  if (signals.titleMatch >= 0.7) reasons.push("titleMatch:seed-related");
  if (signals.genreMatch > 0.5) reasons.push("genreMatch:shared-genre");
  if (signals.countryMatch === 1) reasons.push("countryMatch:selected-country");
  if (signals.contentTypeMatch === 1) reasons.push("contentTypeMatch:selected-type");
  if (signals.moodMatch > 0.5) reasons.push("moodMatch:selected-mood");
  if (signals.runtimeMatch === 1) reasons.push("runtimeMatch:selected-runtime");
  if (signals.ratingSignal >= 0.75) reasons.push("ratingSignal:strong-rating");
  if (signals.popularitySignal >= 0.75) reasons.push("popularitySignal:strong-popularity");
  if (signals.diversitySignal > 0.5) reasons.push("diversitySignal:balanced-result");
  return reasons;
};

const calculateWeightedScore = (signals, weights) => {
  const activeWeights = Object.entries(weights).filter(([, weight]) => weight > 0);
  const totalWeight = activeWeights.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight <= 0) return 0;

  const weightedScore = activeWeights.reduce(
    (sum, [signal, weight]) => sum + clamp01(signals[signal]) * weight,
    0
  );
  return weightedScore / totalWeight;
};

export const calculateRecommendationScore = (
  item = {},
  preferences = {},
  weights = recommendationWeights
) => {
  const penalties = [];
  const selectedContentTypes = getPreferenceContentTypes(preferences);
  const contentTypeMatch = contentTypeMatchSignal(item, selectedContentTypes, preferences);

  if (contentTypeMatch === 0) {
    penalties.push({
      id: "contentTypeMismatch",
      value: recommendationPenalties.contentTypeMismatch,
      reason: "Content type does not match the selected hard filter.",
    });
  }

  const countryFallbackRelaxed =
    Boolean(item.countryFallbackRelaxed) ||
    Boolean(item.fallbackRelaxed) ||
    preferences.countryFallbackRelaxed === true;

  if (countryFallbackRelaxed) {
    penalties.push({
      id: "countryFallbackRelaxed",
      value: recommendationPenalties.countryFallbackRelaxed,
      reason: "Country condition was relaxed to keep enough recommendations.",
    });
  }

  if (item.fallbackStage && item.fallbackStage !== "strict") {
    penalties.push({
      id: "fallbackRelaxed",
      value: recommendationPenalties.fallbackRelaxed,
      reason: "Recommendation was added from a relaxed fallback stage.",
    });
  }

  const signals = {
    titleMatch: titleMatchSignal(item, preferences),
    genreMatch: genreMatchSignal(item, preferences, selectedContentTypes),
    countryMatch: overlapRatio(getItemCountries(item), getPreferenceCountries(preferences)),
    contentTypeMatch,
    moodMatch: overlapRatio(getItemMoods(item), getPreferenceMoods(preferences)),
    runtimeMatch: runtimeMatchSignal(item, preferences, penalties),
    ratingSignal: getNumericSignal(item.rating ?? item.vote_average, 10),
    popularitySignal: getNumericSignal(Math.log10(Number(item.popularity || 0) + 1), 3),
    diversitySignal: diversitySignal(item, preferences),
  };

  const hardFiltered = contentTypeMatch === 0;
  const weightedScore = calculateWeightedScore(signals, weights);
  const penaltyTotal = penalties.reduce((sum, penalty) => sum + Number(penalty.value || 0), 0);
  const normalizedScore = hardFiltered ? 0 : clamp01(weightedScore - penaltyTotal);

  return {
    finalScore: Math.round(normalizedScore * recommendationScoreScale * 100) / 100,
    signals,
    weights,
    reasons: buildReasons(signals),
    penalties,
    hardFiltered,
  };
};

export const rankRecommendationsByWeight = (
  items = [],
  preferences = {},
  weights = recommendationWeights
) =>
  asArray(items)
    .map((item) => ({
      ...item,
      scoreDetail: calculateRecommendationScore(item, preferences, weights),
    }))
    .sort((a, b) => b.scoreDetail.finalScore - a.scoreDetail.finalScore);

// Sample:
// calculateRecommendationScore(item, {
//   seedTitles: ["김부장"],
//   filters: ["country-kr", "genre-drama", "runtime-short"],
//   contentTypes: ["tv"],
// });
