import {
  RAW_CANDIDATE_LIMIT,
  classifyCandidate,
  finalizeCandidatePool,
  genreFamilyIds,
  normalizedCountryCodes,
  roundRobinCandidates,
  selectedCountryCode,
  selectedGenreFilters,
} from "../src/lib/recommendation/candidates/candidatePipeline.js";
import {
  TMDB_CACHE_TTL,
  createTmdbRequestContext,
} from "../src/lib/providers/tmdb/requestContext.js";
import {
  mergeMultiSeedCandidates,
  normalizeSeedTitles,
} from "../src/lib/recommendation/seeds/multiSeed.js";

const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
const TMDB_RECOMMENDATION_LIMIT = 12;
const ALL_CONTENT_TYPES = ["movie", "drama", "animation"];
const RELAXED_REASON = "조건을 조금 넓혀 함께 추천합니다.";
const TMDB_REQUEST_CONCURRENCY = 4;
const DETAIL_ENRICHMENT_LIMIT = 16;
const EXACT_CANDIDATE_TARGET = 15;
const MULTI_SEED_MIN_CANDIDATES_PER_SEED = 2;

const GENRE_BY_ID = {
  12: "모험",
  14: "판타지",
  16: "애니메이션",
  18: "드라마",
  27: "공포",
  28: "액션",
  35: "코미디",
  36: "역사",
  37: "서부",
  53: "스릴러",
  80: "범죄",
  99: "다큐멘터리",
  878: "SF",
  9648: "미스터리",
  10402: "음악",
  10749: "로맨스",
  10751: "가족",
  10752: "전쟁",
  10759: "액션/모험",
  10762: "키즈",
  10763: "뉴스",
  10764: "리얼리티",
  10765: "SF",
  10766: "드라마",
  10767: "토크",
  10768: "전쟁/정치",
  10770: "TV 영화",
};

export const LANGUAGE = process.env.TMDB_LANGUAGE || "ko-KR";
export const REGION = process.env.TMDB_REGION || "KR";

function tmdbCredentials() {
  return {
    apiKey: (process.env.TMDB_API_KEY || "").trim(),
    bearer: (process.env.TMDB_BEARER_TOKEN || "").trim(),
  };
}

export function hasTmdbKey() {
  const credentials = tmdbCredentials();
  return Boolean(credentials.apiKey || credentials.bearer);
}

export function createRequestContext(options = {}) {
  const credentials = tmdbCredentials();
  return createTmdbRequestContext({
    ...credentials,
    language: LANGUAGE,
    region: REGION,
    ...options,
  });
}

async function tmdbGet(path, params = {}, requestContext = createRequestContext(), options = {}) {
  return requestContext.get(path, params, options);
}

export async function getTmdbGenreMetadata() {
  if (!hasTmdbKey()) {
    return {
      movie: [],
      tv: [],
    };
  }

  const requestContext = createRequestContext();
  const [moviePayload, tvPayload] = await Promise.all([
    tmdbGet("/genre/movie/list", {}, requestContext, { ttlMs: TMDB_CACHE_TTL.metadata }),
    tmdbGet("/genre/tv/list", {}, requestContext, { ttlMs: TMDB_CACHE_TTL.metadata }),
  ]);

  return {
    movie: moviePayload.genres || [],
    tv: tvPayload.genres || [],
  };
}

function posterUrl(path) {
  return path ? `${IMAGE_BASE}${path}` : "";
}

function backdropUrl(path) {
  return path ? `${BACKDROP_BASE}${path}` : "";
}

function normalizeSearchText(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function koreanCountry(originCountries) {
  const mapping = {
    KR: "한국",
    JP: "일본",
    US: "미국",
    GB: "영국",
    DE: "독일",
    FR: "프랑스",
    CN: "중국",
    HK: "홍콩",
    TW: "대만",
    IN: "인도",
    CA: "캐나다",
    AU: "호주",
    ES: "스페인",
    IT: "이탈리아",
    TH: "태국",
    BR: "브라질",
    MX: "멕시코",
  };
  if (!originCountries?.length) return "기타";
  return mapping[originCountries[0]] || originCountries[0];
}

function serviceName(providerName = "") {
  const lowered = providerName.toLowerCase();
  if (lowered.includes("netflix")) return "Netflix";
  if (lowered.includes("disney")) return "Disney+";
  if (lowered.includes("watcha")) return "Watcha";
  if (lowered.includes("tving")) return "TVING";
  if (lowered.includes("wavve")) return "Wavve";
  return providerName;
}

function watchProvidersFromDetail(detail = {}) {
  const providers = detail["watch/providers"]?.results?.[REGION] || {};
  const providerNames = [];
  const providerGroups = [providers.flatrate, providers.free, providers.ads, providers.rent, providers.buy];

  for (const group of providerGroups) {
    for (const provider of group || []) {
      const name = serviceName(provider.provider_name);
      if (name && !providerNames.includes(name)) providerNames.push(name);
      if (providerNames.length >= 5) return providerNames;
    }
  }

  return providerNames;
}

function translateGenre(genre) {
  const mapping = {
    Action: "액션",
    Adventure: "모험",
    Animation: "애니메이션",
    Comedy: "코미디",
    Crime: "범죄",
    Documentary: "다큐멘터리",
    Drama: "드라마",
    Family: "가족",
    Fantasy: "판타지",
    History: "역사",
    Horror: "공포",
    Music: "음악",
    Mystery: "미스터리",
    Romance: "로맨스",
    "Science Fiction": "SF",
    "Sci-Fi & Fantasy": "SF",
    "TV Movie": "TV 영화",
    Thriller: "스릴러",
    War: "전쟁",
    Western: "서부",
    Kids: "키즈",
  };
  return mapping[genre] || genre;
}

function translateKeyword(keyword) {
  const mapping = {
    "time travel": "시간여행",
    zombie: "좀비",
    revenge: "복수",
    friendship: "우정",
    love: "사랑",
    family: "가족",
    survival: "생존",
    space: "우주",
    magic: "마법",
    "based on novel or book": "원작",
  };
  return mapping[keyword] || keyword;
}

function inferMood(genres, keywords) {
  const terms = new Set([...genres, ...keywords]);
  const moods = [];
  if (["코미디", "모험", "가족", "우정"].some((term) => terms.has(term))) moods.push("light");
  if (["스릴러", "공포", "범죄", "액션", "생존"].some((term) => terms.has(term))) moods.push("tense");
  if (["SF", "미스터리", "시간여행", "원작"].some((term) => terms.has(term))) moods.push("brainy");
  if (["드라마", "로맨스", "가족", "사랑"].some((term) => terms.has(term))) moods.push("moving");
  return moods.length ? moods : ["brainy"];
}

function normalizeTmdbItem(item, mediaType = item.media_type, detail = item) {
  const resolvedMediaType = mediaType || item.media_type || (item.first_air_date || item.name ? "tv" : "movie");
  const isMovie = resolvedMediaType === "movie";
  const title =
    (isMovie ? detail.title : detail.name) ||
    item.title ||
    item.name ||
    detail.original_title ||
    detail.original_name ||
    item.original_title ||
    item.original_name ||
    "제목 없음";
  const originalTitle =
    detail.original_title ||
    detail.original_name ||
    item.original_title ||
    item.original_name ||
    item.originalTitle ||
    title;
  const release = (isMovie ? detail.release_date : detail.first_air_date) || item.release_date || item.first_air_date || "";
  const year = release && /^\d{4}/.test(release) ? Number(release.slice(0, 4)) : Number(item.year || 0);
  const genres = (detail.genres || [])
    .map((genre) => genre.name)
    .filter(Boolean);
  const genreIds = [
    ...new Set(
      (detail.genre_ids?.length
        ? detail.genre_ids
        : detail.genres?.length
          ? detail.genres.map((genre) => genre.id)
          : item.genre_ids || item.genreIds || [])
        .map(Number)
        .filter(Number.isFinite),
    ),
  ];
  const genreIdNames = genreIds.map((genreId) => GENRE_BY_ID[genreId]).filter(Boolean);
  const translatedGenres = genres.map(translateGenre);
  const normalizedGenres = translatedGenres.length ? translatedGenres : genreIdNames;
  const isAnimation = genres.includes("Animation") || normalizedGenres.includes("애니메이션");
  const itemType = isAnimation ? "animation" : isMovie ? "movie" : "drama";
  const credits = detail.credits || {};
  const cast = (credits.cast || []).slice(0, 3).map((person) => person.name).filter(Boolean);
  const crew = credits.crew || [];
  let director = "";

  if (isMovie) {
    director = crew.find((person) => person.job === "Director")?.name || "";
  } else {
    director =
      detail.created_by?.[0]?.name ||
      crew.find((person) => ["Director", "Creator"].includes(person.job))?.name ||
      "";
  }

  const ott = watchProvidersFromDetail(detail);

  const keywordPayload = detail.keywords || {};
  const keywordItems = keywordPayload.keywords || keywordPayload.results || [];
  const keywords = [
    ...normalizedGenres,
    ...keywordItems.slice(0, 8).map((keyword) => translateKeyword(keyword.name)).filter(Boolean),
  ].slice(0, 10);

  const runtime = detail.runtime ?? detail.episode_run_time?.[0] ?? item.runtime ?? 0;
  const productionCountries = (detail.production_countries || item.production_countries || item.productionCountries || [])
    .map((country) => country?.iso_3166_1 || country)
    .filter(Boolean);
  const originCountries = detail.origin_country || item.origin_country || item.originCountries || [];
  const countryCodes = normalizedCountryCodes({
    originCountries,
    productionCountries,
  });
  const collectionId = detail.belongs_to_collection?.id || item.belongs_to_collection?.id || item.collectionId || null;

  return {
    tmdbId: detail.id || item.id,
    mediaType: resolvedMediaType,
    title,
    originalTitle,
    type: itemType,
    year,
    genreIds,
    originCountries,
    productionCountries,
    countryCodes,
    countryValidation: countryCodes.length ? "verified" : "unknown",
    country: koreanCountry(countryCodes),
    genres: normalizedGenres.length ? normalizedGenres : ["기타"],
    director: director || "정보 없음",
    actors: cast.length ? cast : ["정보 없음"],
    rating: Number(Number(detail.vote_average || item.vote_average || 0).toFixed(1)),
    popularity: Number(detail.popularity || item.popularity || 0),
    voteCount: Number(detail.vote_count || item.vote_count || item.voteCount || 0),
    runtime,
    ott: ott.length ? ott : ["검색 필요"],
    actualProviders: ott,
    mood: inferMood(normalizedGenres, keywords),
    keywords: keywords.length ? keywords : normalizedGenres.length ? normalizedGenres : ["취향 분석"],
    synopsis: detail.overview || item.overview || item.synopsis || "줄거리 정보가 아직 없습니다.",
    poster: posterUrl(detail.poster_path || item.poster_path || item.posterPath),
    backdrop: backdropUrl(detail.backdrop_path || item.backdrop_path || item.backdropPath),
    posterPath: detail.poster_path || item.poster_path || item.posterPath || "",
    backdropPath: detail.backdrop_path || item.backdrop_path || item.backdropPath || "",
    collectionId,
    franchiseKey: collectionId ? `collection:${collectionId}` : "",
    source: "tmdb",
  };
}

async function mapWithConcurrency(items, limit, mapper, { onError = (item) => item } = {}) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        results[index] = onError(items[index], error);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function detailCandidateOrder(items = []) {
  return [...items].sort((left, right) => {
    const leftNeedsCountry = ["unknown", ""].includes(left.countryValidation || "");
    const rightNeedsCountry = ["unknown", ""].includes(right.countryValidation || "");
    return (
      Number(rightNeedsCountry) - Number(leftNeedsCountry) ||
      Number(right.genreMatched !== false) - Number(left.genreMatched !== false) ||
      Number(right.popularity || 0) - Number(left.popularity || 0) ||
      Number(right.rating || 0) - Number(left.rating || 0)
    );
  });
}

function preserveCandidateMetadata(item, normalized) {
  return {
    ...item,
    ...normalized,
    countryCodes: normalized.countryCodes.length ? normalized.countryCodes : item.countryCodes || [],
    countryValidation: normalized.countryCodes.length ? "verified" : item.countryValidation || "unknown",
    resultTier: item.resultTier,
    exactMatch: item.exactMatch,
    fallbackStage: item.fallbackStage,
    fallbackRelaxed: Boolean(item.fallbackRelaxed),
    reason: item.reason,
    candidateSource: item.candidateSource,
    reasonSeed: item.reasonSeed,
    seedTitle: item.seedTitle,
    seedSupplement: Boolean(item.seedSupplement),
    countryMatched: item.countryMatched,
    genreMatched: item.genreMatched,
    contentTypeMatched: item.contentTypeMatched,
    franchiseKey: normalized.franchiseKey || item.franchiseKey || "",
    detailEnriched: true,
    providersEnriched: true,
  };
}

async function enrichCandidateMetadata(
  items = [],
  {
    maxDetails = DETAIL_ENRICHMENT_LIMIT,
    requestContext = createRequestContext(),
    filters = [],
    contentTypes = [],
  } = {},
) {
  const preliminaryCandidates = items
    .map((item) => classifyCandidate(item, { filters, contentTypes }))
    .filter((item) => item.contentTypeMatched && item.countryValidation !== "mismatch");
  const detailTargets = roundRobinCandidates(
    detailCandidateOrder(preliminaryCandidates),
    Math.min(maxDetails, DETAIL_ENRICHMENT_LIMIT),
  );
  const detailKeys = new Set(detailTargets.map((item) => `${item.mediaType || item.type}:${item.tmdbId || item.id}`));
  const enrichedTargets = await mapWithConcurrency(
    detailTargets,
    TMDB_REQUEST_CONCURRENCY,
    async (item) => {
      const mediaType = item.mediaType || (item.type === "drama" ? "tv" : "movie");
      const tmdbId = item.tmdbId || item.id;
      if (!tmdbId || !["movie", "tv"].includes(mediaType)) return item;

      const detail = await tmdbGet(
        `/${mediaType}/${tmdbId}`,
        { append_to_response: "watch/providers,credits,keywords" },
        requestContext,
        {
          kind: "detail",
          ttlMs: TMDB_CACHE_TTL.detail,
          seedKey: item.reasonSeed || item.seedTitle || "shared-detail",
        },
      );
      return preserveCandidateMetadata(item, normalizeTmdbItem(item, mediaType, detail));
    },
    {
      onError: (item) => ({
        ...item,
        detailEnriched: false,
        providersEnriched: Boolean(item.providersEnriched),
      }),
    },
  );
  const enrichedByKey = new Map(
    enrichedTargets.map((item) => [`${item.mediaType || item.type}:${item.tmdbId || item.id}`, item]),
  );

  return preliminaryCandidates.map((item) => {
    const key = `${item.mediaType || item.type}:${item.tmdbId || item.id}`;
    return detailKeys.has(key) ? enrichedByKey.get(key) || item : item;
  });
}

function scoreSearchResult(item, query) {
  const normalizedQuery = normalizeSearchText(query);
  const title = normalizeSearchText(item.title);
  const originalTitle = normalizeSearchText(item.originalTitle);
  let score = Number(item.rating || 0) + Number(item.year || 0) / 10000;

  if (title === normalizedQuery || originalTitle === normalizedQuery) score += 100;
  else if (title.startsWith(normalizedQuery) || originalTitle.startsWith(normalizedQuery)) score += 45;
  else if (title.includes(normalizedQuery) || originalTitle.includes(normalizedQuery)) score += 20;

  if (item.type === "movie") score += 3;
  if (item.backdrop) score += 2;
  if (item.poster) score += 1;

  return score;
}

function mediaPath(mediaType, tmdbId, endpoint) {
  const typePath = mediaType === "tv" ? "tv" : "movie";
  return `/${typePath}/${tmdbId}/${endpoint}`;
}

function seedMediaType(seed) {
  return seed.type === "drama" ? "tv" : "movie";
}

function normalizedContentTypes(contentTypes = []) {
  return [...new Set(contentTypes.filter((type) => ALL_CONTENT_TYPES.includes(type)))];
}

function hasFocusedContentTypes(contentTypes = []) {
  const types = normalizedContentTypes(contentTypes);
  return types.length > 0 && types.length < ALL_CONTENT_TYPES.length;
}

function contentMatchesRequestedTypes(item, contentTypes = []) {
  if (!hasFocusedContentTypes(contentTypes)) return true;
  return normalizedContentTypes(contentTypes).includes(item.type);
}

function suggestionLabel(type) {
  if (type === "movie") return "영화";
  if (type === "animation") return "애니";
  return "TV";
}

function normalizeSuggestion(item) {
  const normalized = normalizeTmdbItem(item, item.media_type);

  return {
    providerId: "tmdb",
    providerContentId: String(normalized.tmdbId),
    tmdbId: normalized.tmdbId,
    title: normalized.title,
    originalTitle: normalized.originalTitle,
    year: normalized.year,
    type: normalized.type,
    label: suggestionLabel(normalized.type),
    poster: normalized.poster,
  };
}

export async function suggestTmdb(query, limit = 8) {
  if (!hasTmdbKey() || query.trim().length < 2) {
    return [];
  }

  const requestContext = createRequestContext();
  const payload = await tmdbGet(
    "/search/multi",
    { query, include_adult: "false", page: "1" },
    requestContext,
    { ttlMs: TMDB_CACHE_TTL.list },
  );

  return (payload.results || [])
    .filter((item) => ["movie", "tv"].includes(item.media_type))
    .map(normalizeSuggestion)
    .sort((a, b) => scoreSearchResult(b, query) - scoreSearchResult(a, query))
    .slice(0, limit);
}

function countryFromFilters(filters = []) {
  const countryMap = {
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
  };

  return selectedCountryCode(filters) || filters.map((filter) => countryMap[filter]).find(Boolean) || "";
}

function runtimeConstraintFromFilters(filters = []) {
  const constraints = filters
    .filter((filter) => filter.startsWith("runtime-"))
    .map((filter) => {
      if (filter === "runtime-short") return { max: 60 };
      if (filter === "runtime-medium") return { max: 120 };
      if (filter === "runtime-long") return { min: 140 };
      return null;
    })
    .filter(Boolean);

  if (!constraints.length) return {};

  const maxValues = constraints.map((constraint) => constraint.max).filter((value) => Number.isFinite(value));
  const minValues = constraints.map((constraint) => constraint.min).filter((value) => Number.isFinite(value));
  const runtime = {};

  if (maxValues.length) runtime.max = Math.min(...maxValues);
  if (minValues.length) runtime.min = Math.max(...minValues);
  if (Number.isFinite(runtime.max) && Number.isFinite(runtime.min) && runtime.min > runtime.max) return {};

  return runtime;
}

function watchProvidersFromFilters(filters = []) {
  const providerMap = {
    netflix: { id: 8, label: "Netflix" },
    disney: { id: 337, label: "Disney+" },
    watcha: { id: 97, label: "Watcha" },
    tving: { id: 188, label: "TVING" },
  };
  return filters.map((filter) => providerMap[filter]).filter(Boolean);
}

export async function relatedTmdb({ tmdbId, contentType = "movie", limit = TMDB_RECOMMENDATION_LIMIT } = {}) {
  if (!hasTmdbKey() || !tmdbId) {
    return {
      source: "fallback",
      tmdbEnabled: hasTmdbKey(),
      results: [],
      message: "TMDb id is missing or TMDB API key is not configured.",
    };
  }

  const seed = {
    tmdbId,
    type: contentType === "drama" || contentType === "tv" ? "drama" : contentType,
  };
  const requestContext = createRequestContext();
  const related = [];

  try {
    related.push(...(await fetchRecommendationResults(seed, "recommendations", requestContext)));
  } catch {
    // Similar is used as the fallback below.
  }

  if (related.length < limit) {
    try {
      related.push(...(await fetchRecommendationResults(seed, "similar", requestContext)));
    } catch {
      // The API route caller will keep the UI alive with fallback results.
    }
  }

  const seen = new Set();
  const uniqueRelated = related
    .filter((item) => {
      if (String(item.tmdbId) === String(tmdbId)) return false;
      const key = `${item.type}-${item.tmdbId || item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
  const enrichedRelated = await enrichCandidateMetadata(uniqueRelated, {
    maxDetails: Math.min(limit, DETAIL_ENRICHMENT_LIMIT),
    requestContext,
  });

  return {
    source: "tmdb",
    tmdbEnabled: true,
    results: enrichedRelated,
    diagnostics: requestContext.diagnostics(),
  };
}

function discoverRequestsForTypes(contentTypes = []) {
  const types = normalizedContentTypes(contentTypes);
  const requestedTypes = types.length ? types : ALL_CONTENT_TYPES;
  const requests = [];

  if (requestedTypes.includes("movie")) requests.push({ mediaType: "movie", contentType: "movie", animationOnly: false });
  if (requestedTypes.includes("drama")) requests.push({ mediaType: "tv", contentType: "drama", animationOnly: false });
  if (requestedTypes.includes("animation")) {
    requests.push({ mediaType: "movie", contentType: "animation", animationOnly: true });
    requests.push({ mediaType: "tv", contentType: "animation", animationOnly: true });
  }

  return requests;
}

function genreParamVariantsForRequest(filters, request, includeGenre = true, seedGenreIds = []) {
  const filterGenreIds = genreFamilyIds(filters, request.mediaType);
  const targetGenreIds = (filterGenreIds.length ? filterGenreIds : seedGenreIds)
    .map(Number)
    .filter((genreId) => Number.isFinite(genreId) && genreId !== 16);

  if (request.animationOnly) {
    if (!includeGenre || !targetGenreIds.length) return ["16"];
    return [...new Set(targetGenreIds.map((genreId) => `16,${genreId}`))];
  }

  if (!includeGenre || !targetGenreIds.length) return [""];
  return [...new Set(targetGenreIds.map(String))];
}

function discoverStageParams(request, country, runtimeConstraint, stage, genreParam) {
  const params = {
    page: String(stage.page),
    sort_by: stage.sortBy,
    include_adult: "false",
    "vote_count.gte": "30",
  };

  if (stage.useGenre && genreParam) params.with_genres = genreParam;
  if (!request.animationOnly) params.without_genres = "16";
  if (country && stage.useCountry) params.with_origin_country = country;
  if (Number.isFinite(runtimeConstraint.max)) params["with_runtime.lte"] = String(runtimeConstraint.max);
  if (Number.isFinite(runtimeConstraint.min)) params["with_runtime.gte"] = String(runtimeConstraint.min);

  return params;
}

function progressiveDiscoverStages(filters, country, seedGenreIds = []) {
  const hasGenre = selectedGenreFilters(filters).length > 0 || seedGenreIds.length > 0;
  const stages = [
    { id: "exact-popularity-page-1", resultTier: "strict", useGenre: hasGenre, useCountry: Boolean(country), sortBy: "popularity.desc", page: 1 },
    { id: "exact-rating-page-1", resultTier: "strict", useGenre: hasGenre, useCountry: Boolean(country), sortBy: "vote_average.desc", page: 1 },
    { id: "exact-popularity-page-2", resultTier: "strict", useGenre: hasGenre, useCountry: Boolean(country), sortBy: "popularity.desc", page: 2 },
  ];
  if (hasGenre) {
    stages.push({
      id: "same-country-relaxed-popularity-page-1",
      resultTier: "same-country-relaxed",
      useGenre: false,
      useCountry: Boolean(country),
      sortBy: "popularity.desc",
      page: 1,
    });
  }
  return stages;
}

function roundRobinSourceGroups(groups = [], limit = RAW_CANDIDATE_LIMIT) {
  const results = [];
  let cursor = 0;
  while (results.length < limit) {
    let added = false;
    for (const group of groups) {
      const item = group[cursor];
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

function roundRobinDiscoverTasks(tasks = []) {
  const grouped = new Map(["movie", "drama", "animation"].map((type) => [type, []]));
  for (const task of tasks) grouped.get(task.request.contentType)?.push(task);
  return roundRobinSourceGroups([...grouped.values()], tasks.length);
}

function exactCandidateStats(items = [], filters = [], contentTypes = []) {
  const countsByType = { movie: 0, drama: 0, animation: 0 };
  let exactCount = 0;
  for (const item of uniqueRawCandidates(items)) {
    const classified = classifyCandidate(item, { filters, contentTypes });
    if (classified.resultTier !== "exact" || !classified.contentTypeMatched) continue;
    exactCount += 1;
    countsByType[classified.type] = (countsByType[classified.type] || 0) + 1;
  }
  return { exactCount, countsByType };
}

function hasRequestedTypeCoverage(countsByType, contentTypes = []) {
  const types = normalizedContentTypes(contentTypes);
  if (types.length <= 1) return true;
  return types.every((type) => Number(countsByType[type] || 0) >= 2);
}

function uniqueRawCandidates(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.mediaType || item.type}-${item.tmdbId || item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function debugCandidate(item = {}) {
  return {
    title: item.title,
    tmdbId: item.tmdbId,
    countryCodes: item.countryCodes || [],
    countryValidation: item.countryValidation,
    genres: item.genres || [],
    genreIds: item.genreIds || [],
    contentType: item.type,
    resultTier: item.resultTier,
    candidateSource: item.candidateSource,
    fallbackStage: item.fallbackStage,
    franchiseKey: item.franchiseKey,
    finalScore: item.scoreDetail?.finalScore ?? null,
    exclusionReason: item.exclusionReason || "",
  };
}

export async function discoverTmdb({
  filters = [],
  contentTypes = [],
  limit = TMDB_RECOMMENDATION_LIMIT,
  seedGenreIds = [],
  seedTitles = [],
  candidateSource = "tmdb-discover",
  requestContext = createRequestContext(),
  detailLimit = DETAIL_ENRICHMENT_LIMIT,
  seedKey = "",
} = {}) {
  if (!hasTmdbKey()) {
    return {
      source: "fallback",
      tmdbEnabled: false,
      results: [],
      message: "TMDb API key is not configured.",
    };
  }

  const requestedTypes = normalizedContentTypes(contentTypes);
  const country = countryFromFilters(filters);
  const runtimeConstraint = runtimeConstraintFromFilters(filters);
  const requests = discoverRequestsForTypes(requestedTypes);
  const stages = progressiveDiscoverStages(filters, country, seedGenreIds);
  const exactTarget = Math.min(EXACT_CANDIDATE_TARGET, Math.max(limit, TMDB_RECOMMENDATION_LIMIT));
  let rawCandidates = [];
  let requestFailureCount = 0;
  let successfulListRequestCount = 0;

  for (const stage of stages) {
    const beforeStage = exactCandidateStats(rawCandidates, filters, requestedTypes);
    if (
      stage.resultTier === "same-country-relaxed" &&
      (beforeStage.exactCount === 0 || beforeStage.exactCount >= exactTarget)
    ) {
      requestContext.setEarlyStop(beforeStage.exactCount === 0 ? "no-exact-candidates-for-relaxation" : "exact-target-reached");
      break;
    }
    if (!requestContext.hasBudget("list")) {
      requestContext.setEarlyStop("list-budget-exhausted");
      break;
    }

    const tasks = [];
    for (const request of requests) {
      const genreVariants = genreParamVariantsForRequest(filters, request, stage.useGenre, seedGenreIds);
      for (const genreParam of genreVariants) tasks.push({ request, stage, genreParam });
    }
    const stagePayloads = await mapWithConcurrency(
      roundRobinDiscoverTasks(tasks),
      TMDB_REQUEST_CONCURRENCY,
      async (task) => {
        const params = discoverStageParams(task.request, country, runtimeConstraint, task.stage, task.genreParam);
        const payload = await tmdbGet(
          `/discover/${task.request.mediaType}`,
          params,
          requestContext,
          { ttlMs: TMDB_CACHE_TTL.list, seedKey },
        );
        successfulListRequestCount += 1;
        return (payload.results || []).map((item) => {
          const normalized = normalizeTmdbItem(item, task.request.mediaType);
          const providerFiltered = Boolean(country && task.stage.useCountry && !normalized.countryCodes.length);
          const fallbackRelaxed = task.stage.resultTier !== "strict";
          return {
            ...normalized,
            countryCodes: providerFiltered ? [country] : normalized.countryCodes,
            countryValidation: providerFiltered ? "provider-filtered" : normalized.countryValidation,
            candidateSource: `${candidateSource}:${task.stage.id}`,
            fallbackStage: task.stage.resultTier,
            fallbackRelaxed,
            reason: fallbackRelaxed
              ? country
                ? "선택한 국가 안에서 장르 조건을 조금 넓혀 함께 추천합니다."
                : RELAXED_REASON
              : normalized.reason,
          };
        });
      },
      {
        onError: () => {
          requestFailureCount += 1;
          return [];
        },
      },
    );

    const stageCandidates = roundRobinSourceGroups(stagePayloads, RAW_CANDIDATE_LIMIT);
    rawCandidates = roundRobinCandidates(
      uniqueRawCandidates([...rawCandidates, ...stageCandidates]),
      RAW_CANDIDATE_LIMIT,
    );
    const afterStage = exactCandidateStats(rawCandidates, filters, requestedTypes);
    if (afterStage.exactCount >= exactTarget && hasRequestedTypeCoverage(afterStage.countsByType, requestedTypes)) {
      requestContext.setEarlyStop("exact-target-and-type-coverage-reached");
      break;
    }
    if (requestContext.diagnostics().budgetExhausted) {
      requestContext.setEarlyStop("request-budget-exhausted");
      break;
    }
  }

  const requestDiagnostics = requestContext.diagnostics();
  if (!rawCandidates.length && !successfulListRequestCount && !requestDiagnostics.budgetExhausted) {
    throw new Error("TMDB discover requests failed.");
  }

  const enrichedCandidates = await enrichCandidateMetadata(rawCandidates, {
    maxDetails: detailLimit,
    requestContext,
    filters,
    contentTypes: requestedTypes,
  });
  const finalized = finalizeCandidatePool(enrichedCandidates, {
    filters,
    contentTypes: requestedTypes,
    limit,
    seedTitles,
    seedGenreIds,
  });

  return {
    source: "tmdb",
    tmdbEnabled: true,
    results: finalized.results,
    relaxedResults: finalized.relaxedResults,
    diagnostics: {
      ...finalized.diagnostics,
      requestFailureCount,
      ...requestContext.diagnostics(),
      candidates: finalized.results.map(debugCandidate),
      exclusions: finalized.exclusions.slice(0, 24).map(debugCandidate),
    },
  };
}

async function fetchRecommendationResults(seed, endpoint, requestContext, seedKey = seed.title) {
  const mediaType = seedMediaType(seed);
  const payload = await tmdbGet(
    mediaPath(mediaType, seed.tmdbId, endpoint),
    { page: "1" },
    requestContext,
    { ttlMs: TMDB_CACHE_TTL.list, seedKey },
  );

  return (payload.results || [])
    .filter((item) => item.id !== seed.tmdbId)
    .filter((item) => {
      const itemMediaType = item.media_type || mediaType;
      return ["movie", "tv"].includes(itemMediaType);
    })
    .map((item) => normalizeTmdbItem(item, item.media_type || mediaType))
    .filter((item) => {
      if (!seed.title) return true;
      const seedTitles = [seed.title, seed.originalTitle].map(normalizeSearchText).filter(Boolean);
      return !seedTitles.includes(normalizeSearchText(item.title)) && !seedTitles.includes(normalizeSearchText(item.originalTitle));
    })
    .map((item) => ({
      ...item,
      candidateSource: `tmdb-seed-${endpoint}`,
      fallbackStage: "strict",
      fallbackRelaxed: false,
      reasonSeed: seed.title,
      seedTitle: seed.title,
    }));
}

async function findSeedContent(query, requestContext, seedKey = query) {
  const payload = await tmdbGet(
    "/search/multi",
    { query, include_adult: "false", page: "1" },
    requestContext,
    { ttlMs: TMDB_CACHE_TTL.list, seedKey },
  );

  const candidates = [];
  for (const item of payload.results || []) {
    const mediaType = item.media_type;
    if (!["movie", "tv"].includes(mediaType)) continue;
    candidates.push(normalizeTmdbItem(item, mediaType));
  }

  return candidates.sort((a, b) => scoreSearchResult(b, query) - scoreSearchResult(a, query))[0] || null;
}

function remainingListRequests(requestContext) {
  const diagnostics = requestContext.diagnostics();
  return Math.max(0, Number(diagnostics.listRequestBudget || 0) - Number(diagnostics.listRequestsUsed || 0));
}

function resourceStopError(error) {
  return ["TMDB_BUDGET_EXHAUSTED", "TMDB_RECOMMENDATION_DEADLINE_EXCEEDED"].includes(error?.code);
}

function seedCandidateState(records, filters, contentTypes, seedTitles, limit) {
  const merged = mergeMultiSeedCandidates(records, seedTitles);
  const potentialExact = merged.filter((item) => {
    const classified = classifyCandidate(item, { filters, contentTypes });
    return (
      classified.contentTypeMatched &&
      classified.genreMatched &&
      classified.countryValidation !== "mismatch"
    );
  });
  const representedSeeds = records.filter((record) => record.candidates.length >= MULTI_SEED_MIN_CANDIDATES_PER_SEED);
  const target = Math.max(limit, records.length * MULTI_SEED_MIN_CANDIDATES_PER_SEED);

  return {
    merged,
    potentialExactCount: potentialExact.length,
    representedSeedCount: representedSeeds.length,
    enough:
      potentialExact.length >= target &&
      representedSeeds.length === records.length,
  };
}

async function fetchSeedDiscoverSupplement(record, filters, contentTypes, requestContext) {
  const requestedTypes = normalizedContentTypes(contentTypes);
  const requests = discoverRequestsForTypes(requestedTypes);
  const preferredType = record.seed.type;
  const request = requests.find((item) => item.contentType === preferredType) || requests[0];
  if (!request) return [];

  const country = countryFromFilters(filters);
  const runtimeConstraint = runtimeConstraintFromFilters(filters);
  const stage = {
    id: "seed-supplement-exact-popularity-page-1",
    resultTier: "strict",
    useGenre: true,
    useCountry: Boolean(country),
    sortBy: "popularity.desc",
    page: 1,
  };
  const genreParam = genreParamVariantsForRequest(
    filters,
    request,
    true,
    record.seed.genreIds || [],
  )[0] || "";
  const params = discoverStageParams(request, country, runtimeConstraint, stage, genreParam);
  const payload = await tmdbGet(
    `/discover/${request.mediaType}`,
    params,
    requestContext,
    { ttlMs: TMDB_CACHE_TTL.list, seedKey: record.title },
  );

  return (payload.results || []).map((item) => {
    const normalized = normalizeTmdbItem(item, request.mediaType);
    const providerFiltered = Boolean(country && !normalized.countryCodes.length);
    return {
      ...normalized,
      countryCodes: providerFiltered ? [country] : normalized.countryCodes,
      countryValidation: providerFiltered ? "provider-filtered" : normalized.countryValidation,
      candidateSource: "tmdb-seed-discover:exact-popularity-page-1",
      fallbackStage: "strict",
      fallbackRelaxed: false,
      seedSupplement: true,
    };
  });
}

function seedResultMetadata(records, deferredTitles, unresolvedTitles) {
  const deferred = new Set(deferredTitles);
  const unresolved = new Set(unresolvedTitles);
  return records.map((record) => ({
    title: record.title,
    normalizedTitle: record.title,
    status: unresolved.has(record.title)
      ? "unresolved"
      : deferred.has(record.title)
        ? "deferred"
        : "processed",
    tmdbId: record.seed?.tmdbId || null,
    resolvedTitle: record.seed?.title || "",
    contentType: record.seed?.type || "",
    candidateCount: record.candidates.length,
    phases: [...record.phases],
  }));
}

export async function recommendSeedsTmdb({
  titles = [],
  contentTypes = [],
  filters = [],
  limit = TMDB_RECOMMENDATION_LIMIT,
  requestContext = null,
  requestContextFactory = createRequestContext,
} = {}) {
  const normalizedInput = normalizeSeedTitles(titles);
  const hasInjectedContext = Boolean(requestContext) || requestContextFactory !== createRequestContext;
  if (!hasTmdbKey() && !hasInjectedContext) {
    return {
      source: "fallback",
      tmdbEnabled: false,
      results: [],
      relaxedResults: [],
      seedResults: [],
      processedSeeds: [],
      unresolvedSeeds: [],
      deferredSeeds: normalizedInput.normalizedSeeds,
      message: "TMDb API key is not configured.",
    };
  }

  const context = requestContext || requestContextFactory();
  const records = normalizedInput.entries.map((entry) => ({
    ...entry,
    seed: null,
    candidates: [],
    phases: [],
    searchSucceeded: false,
    candidateRequestSucceeded: false,
    candidatePhaseAttempted: false,
    error: null,
  }));
  const initiallyDeferred = [];
  const unresolvedSeeds = [];
  let successfulSearchRequests = 0;
  let successfulCandidateRequests = 0;

  context.setSeedDiagnostics({
    requestedSeeds: normalizedInput.requestedSeeds,
    normalizedSeeds: normalizedInput.normalizedSeeds,
    processedSeeds: [],
    unresolvedSeeds: [],
    deferredSeeds: [],
  });

  if (!records.length) {
    return {
      source: "tmdb",
      tmdbEnabled: true,
      results: [],
      relaxedResults: [],
      seedResults: [],
      processedSeeds: [],
      unresolvedSeeds: [],
      deferredSeeds: [],
      diagnostics: context.diagnostics(),
    };
  }

  const coldSearchCapacity = Math.max(1, Math.floor(context.limits.list / 2));
  const searchRecords = records.slice(0, coldSearchCapacity);
  initiallyDeferred.push(...records.slice(coldSearchCapacity).map((record) => record.title));

  await mapWithConcurrency(searchRecords, TMDB_REQUEST_CONCURRENCY, async (record) => {
    try {
      record.seed = await findSeedContent(record.title, context, record.title);
      record.searchSucceeded = true;
      successfulSearchRequests += 1;
      record.phases.push("search");
      if (!record.seed) unresolvedSeeds.push(record.title);
    } catch (error) {
      record.error = error;
      initiallyDeferred.push(record.title);
    }
    return record;
  });

  const resolvedRecords = searchRecords.filter((record) => record.seed);
  const recommendationCapacity = remainingListRequests(context);
  const recommendationRecords = resolvedRecords.slice(0, recommendationCapacity);
  initiallyDeferred.push(
    ...resolvedRecords.slice(recommendationCapacity).map((record) => record.title),
  );

  await mapWithConcurrency(recommendationRecords, TMDB_REQUEST_CONCURRENCY, async (record) => {
    record.candidatePhaseAttempted = true;
    try {
      const candidates = await fetchRecommendationResults(record.seed, "recommendations", context, record.title);
      record.candidates.push(...candidates);
      record.candidateRequestSucceeded = true;
      successfulCandidateRequests += 1;
      record.phases.push("recommendations");
    } catch (error) {
      record.error = error;
      if (resourceStopError(error)) initiallyDeferred.push(record.title);
    }
    return record;
  });

  let candidateState = seedCandidateState(
    recommendationRecords,
    filters,
    contentTypes,
    normalizedInput.normalizedSeeds,
    limit,
  );

  if (candidateState.enough) {
    context.setEarlyStop("seed-recommendations-sufficient");
  } else if (context.hasTimeRemaining() && remainingListRequests(context) > 0) {
    const similarCapacity = remainingListRequests(context);
    const similarRecords = [...recommendationRecords]
      .sort((left, right) => left.candidates.length - right.candidates.length)
      .slice(0, similarCapacity);
    await mapWithConcurrency(similarRecords, TMDB_REQUEST_CONCURRENCY, async (record) => {
      record.candidatePhaseAttempted = true;
      try {
        const candidates = await fetchRecommendationResults(record.seed, "similar", context, record.title);
        record.candidates.push(...candidates);
        record.candidateRequestSucceeded = true;
        successfulCandidateRequests += 1;
        record.phases.push("similar");
      } catch (error) {
        record.error = error;
        if (resourceStopError(error)) initiallyDeferred.push(record.title);
      }
      return record;
    });
    candidateState = seedCandidateState(
      recommendationRecords,
      filters,
      contentTypes,
      normalizedInput.normalizedSeeds,
      limit,
    );
    if (candidateState.enough) context.setEarlyStop("seed-similar-sufficient");
  }

  if (!candidateState.enough && context.hasTimeRemaining() && remainingListRequests(context) > 0) {
    const supplementCapacity = remainingListRequests(context);
    const supplementRecords = [...recommendationRecords]
      .sort((left, right) => left.candidates.length - right.candidates.length)
      .slice(0, supplementCapacity);
    await mapWithConcurrency(supplementRecords, TMDB_REQUEST_CONCURRENCY, async (record) => {
      record.candidatePhaseAttempted = true;
      try {
        const candidates = await fetchSeedDiscoverSupplement(record, filters, contentTypes, context);
        record.candidates.push(...candidates);
        record.candidateRequestSucceeded = true;
        successfulCandidateRequests += 1;
        record.phases.push("discover-supplement");
      } catch (error) {
        record.error = error;
        if (resourceStopError(error)) initiallyDeferred.push(record.title);
      }
      return record;
    });
  }

  const mergedCandidates = mergeMultiSeedCandidates(
    recommendationRecords,
    normalizedInput.normalizedSeeds,
  );
  const enrichedCandidates = await enrichCandidateMetadata(mergedCandidates, {
    requestContext: context,
    filters,
    contentTypes,
    maxDetails: DETAIL_ENRICHMENT_LIMIT,
  });
  const seedGenreIds = [
    ...new Set(resolvedRecords.flatMap((record) => record.seed.genreIds || []).map(Number).filter(Number.isFinite)),
  ];
  const finalized = finalizeCandidatePool(enrichedCandidates, {
    filters,
    contentTypes,
    limit,
    seedTitles: normalizedInput.normalizedSeeds,
    seedGenreIds,
  });

  const processedSeeds = recommendationRecords
    .filter((record) => record.candidateRequestSucceeded || record.candidates.length)
    .map((record) => record.title);
  const deferredSeeds = [
    ...new Set([
      ...initiallyDeferred,
      ...resolvedRecords
        .filter((record) => !record.candidateRequestSucceeded && !record.candidates.length)
        .map((record) => record.title),
    ]),
  ].filter((title) => !processedSeeds.includes(title) && !unresolvedSeeds.includes(title));
  const perSeedCandidateCounts = Object.fromEntries(
    records.map((record) => [record.title, record.candidates.length]),
  );

  context.setSeedDiagnostics({
    requestedSeeds: normalizedInput.requestedSeeds,
    normalizedSeeds: normalizedInput.normalizedSeeds,
    processedSeeds,
    unresolvedSeeds,
    deferredSeeds,
    perSeedCandidateCounts,
  });
  const requestDiagnostics = context.diagnostics();

  if (
    !mergedCandidates.length &&
    !requestDiagnostics.deadlineExceeded &&
    (successfulSearchRequests === 0 || (resolvedRecords.length > 0 && successfulCandidateRequests === 0))
  ) {
    const error = new Error("TMDB multi-seed recommendation requests failed.");
    error.diagnostics = requestDiagnostics;
    throw error;
  }

  return {
    source: "tmdb",
    tmdbEnabled: true,
    results: finalized.results,
    relaxedResults: finalized.relaxedResults,
    seedResults: seedResultMetadata(records, deferredSeeds, unresolvedSeeds),
    requestedSeedCount: normalizedInput.normalizedSeeds.length,
    processedSeedCount: processedSeeds.length,
    unresolvedSeedCount: unresolvedSeeds.length,
    deferredSeedCount: deferredSeeds.length,
    processedSeeds,
    unresolvedSeeds,
    deferredSeeds,
    diagnostics: {
      ...finalized.diagnostics,
      ...requestDiagnostics,
      candidateRequestSucceededCount: successfulCandidateRequests,
      searchRequestSucceededCount: successfulSearchRequests,
    },
  };
}

export async function searchTmdb(
  query,
  contentTypes = [],
  filters = [],
  { seedTitles = [] } = {},
) {
  if (!hasTmdbKey()) {
    return {
      source: "fallback",
      tmdbEnabled: false,
      results: [],
      message: "TMDb API key is not configured.",
    };
  }

  const requestContext = createRequestContext();
  const seed = await findSeedContent(query, requestContext);
  if (!seed) {
    return {
      source: "tmdb",
      tmdbEnabled: true,
      seed: null,
      results: [],
    };
  }

  const normalizedSeedTitles = [...new Set(
    [...seedTitles, query, seed.title]
      .map((title) => String(title || "").trim())
      .filter(Boolean),
  )];

  const recommended = [];
  let candidateRequestSucceeded = false;

  try {
    recommended.push(...(await fetchRecommendationResults(seed, "recommendations", requestContext)));
    candidateRequestSucceeded = true;
  } catch {
    // Some TMDB titles have sparse recommendation data. Similar is the planned fallback below.
  }

  if (recommended.length < 36) {
    try {
      recommended.push(...(await fetchRecommendationResults(seed, "similar", requestContext)));
      candidateRequestSucceeded = true;
    } catch {
      // Empty similar data should not break Mock fallback in the API route caller.
    }
  }

  const selectedGenres = selectedGenreFilters(filters);
  let supplement = { results: [], relaxedResults: [], diagnostics: {} };
  try {
    supplement = await discoverTmdb({
      filters,
      contentTypes,
      limit: 36,
      seedGenreIds: selectedGenres.length ? [] : seed.genreIds || [],
      seedTitles: normalizedSeedTitles,
      candidateSource: "tmdb-seed-discover",
      requestContext,
      detailLimit: 0,
    });
    candidateRequestSucceeded = true;
  } catch {
    // Seed recommendations remain usable when discover supplement fails.
  }

  if (!candidateRequestSucceeded) {
    throw new Error("TMDB seed recommendation requests failed.");
  }

  const recommendationCandidates = uniqueRawCandidates(recommended).slice(0, 40);
  const supplemented = (supplement.results || []).map((item) => ({
    ...item,
    candidateSource: "tmdb-seed-discover",
    seedSupplement: true,
    reasonSeed: seed.title,
    seedTitle: seed.title,
  }));
  const enrichedCandidates = await enrichCandidateMetadata(
    [...recommendationCandidates, ...supplemented],
    {
      requestContext,
      filters,
      contentTypes,
      maxDetails: DETAIL_ENRICHMENT_LIMIT,
    },
  );
  const finalized = finalizeCandidatePool(enrichedCandidates, {
    filters,
    contentTypes,
    limit: TMDB_RECOMMENDATION_LIMIT,
    seedTitles: normalizedSeedTitles,
    seedGenreIds: seed.genreIds || [],
  });
  const diagnostics = requestContext.diagnostics();

  return {
    source: "tmdb",
    tmdbEnabled: true,
    seed: {
      tmdbId: seed.tmdbId,
      title: seed.title,
      originalTitle: seed.originalTitle,
      type: seed.type,
      genreIds: seed.genreIds || [],
      genres: seed.genres || [],
    },
    results: finalized.results,
    relaxedResults: finalized.relaxedResults,
    diagnostics: {
      ...finalized.diagnostics,
      ...diagnostics,
      seedRecommendationCount: recommended.filter((item) => item.candidateSource === "tmdb-seed-recommendations").length,
      seedSimilarCount: recommended.filter((item) => item.candidateSource === "tmdb-seed-similar").length,
      seedSupplementCount: supplemented.length,
      candidates: finalized.results.map(debugCandidate),
      exclusions: finalized.exclusions.slice(0, 24).map(debugCandidate),
    },
  };
}
