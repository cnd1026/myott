import {
  RAW_CANDIDATE_LIMIT,
  finalizeCandidatePool,
  genreFamilyIds,
  normalizedCountryCodes,
  selectedCountryCode,
  selectedGenreFilters,
} from "../src/lib/recommendation/candidates/candidatePipeline.js";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
const TMDB_RECOMMENDATION_LIMIT = 12;
const ALL_CONTENT_TYPES = ["movie", "drama", "animation"];
const RELAXED_REASON = "조건을 조금 넓혀 함께 추천합니다.";
const TMDB_REQUEST_CONCURRENCY = 4;
const TMDB_DISCOVER_PAGES = 2;

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

async function tmdbGet(path, params = {}) {
  const credentials = tmdbCredentials();
  const searchParams = new URLSearchParams({
    language: LANGUAGE,
    ...params,
  });

  if (credentials.apiKey) {
    searchParams.set("api_key", credentials.apiKey);
  }

  const headers = { accept: "application/json" };
  if (credentials.bearer) {
    headers.Authorization = `Bearer ${credentials.bearer}`;
  }

  const response = await fetch(`${TMDB_BASE}${path}?${searchParams.toString()}`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`TMDb request failed: ${response.status}`);
  }

  return response.json();
}

export async function getTmdbGenreMetadata() {
  if (!hasTmdbKey()) {
    return {
      movie: [],
      tv: [],
    };
  }

  const [moviePayload, tvPayload] = await Promise.all([
    tmdbGet("/genre/movie/list"),
    tmdbGet("/genre/tv/list"),
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

async function enrichCandidateMetadata(items = [], { maxDetails = 32 } = {}) {
  const detailTargets = items.slice(0, maxDetails);
  const enrichedTargets = await mapWithConcurrency(detailTargets, TMDB_REQUEST_CONCURRENCY, async (item) => {
    const mediaType = item.mediaType || (item.type === "drama" ? "tv" : "movie");
    const tmdbId = item.tmdbId || item.id;
    if (!tmdbId || !["movie", "tv"].includes(mediaType)) return item;

    const detail = await tmdbGet(`/${mediaType}/${tmdbId}`, {
      append_to_response: "watch/providers,credits,keywords",
    });
    const normalized = normalizeTmdbItem(item, mediaType, detail);
    return {
      ...normalized,
      countryCodes: normalized.countryCodes.length ? normalized.countryCodes : item.countryCodes || [],
      countryValidation: normalized.countryCodes.length ? "verified" : item.countryValidation || "unknown",
      candidateSource: item.candidateSource,
      seedSupplement: Boolean(item.seedSupplement),
      fallbackStage: item.fallbackStage,
      fallbackRelaxed: Boolean(item.fallbackRelaxed),
      reasonSeed: item.reasonSeed,
      seedTitle: item.seedTitle,
    };
  });

  return [...enrichedTargets, ...items.slice(maxDetails)];
}

async function enrichWatchProviders(items = []) {
  const enriched = [];

  for (const item of items) {
    if (Array.isArray(item.actualProviders) && item.actualProviders.length) {
      enriched.push(item);
      continue;
    }

    const tmdbId = item.tmdbId || item.id;
    const mediaType = item.mediaType || (item.type === "drama" ? "tv" : "movie");
    if (!tmdbId || !["movie", "tv"].includes(mediaType)) {
      enriched.push(item);
      continue;
    }

    try {
      const detail = await tmdbGet(`/${mediaType}/${tmdbId}`, {
        append_to_response: "watch/providers",
      });
      const providers = watchProvidersFromDetail(detail);
      enriched.push(
        providers.length
          ? {
              ...item,
              actualProviders: providers,
              ott: providers,
            }
          : item,
      );
    } catch {
      enriched.push(item);
    }
  }

  return enriched;
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

  const payload = await tmdbGet("/search/multi", {
    query,
    include_adult: "false",
    page: "1",
  });

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
  const related = [];

  try {
    related.push(...(await fetchRecommendationResults(seed, "recommendations")));
  } catch {
    // Similar is used as the fallback below.
  }

  if (related.length < limit) {
    try {
      related.push(...(await fetchRecommendationResults(seed, "similar")));
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
  const enrichedRelated = await enrichWatchProviders(uniqueRelated);

  return {
    source: "tmdb",
    tmdbEnabled: true,
    results: enrichedRelated,
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

function discoverStageParams(filters, request, country, runtimeConstraint, stage, genreParam, page) {
  const params = {
    page: String(page),
    sort_by: page === 1 ? "popularity.desc" : "vote_average.desc",
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

function discoverStages(filters, country, seedGenreIds = []) {
  const hasGenre = selectedGenreFilters(filters).length > 0 || seedGenreIds.length > 0;
  const stages = [{ id: "strict", useGenre: hasGenre, useCountry: Boolean(country) }];
  if (hasGenre) {
    stages.push({
      id: "same-country-relaxed",
      useGenre: false,
      useCountry: Boolean(country),
    });
  }
  return stages;
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
  candidateSource = "tmdb-discover",
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
  const tasks = [];

  for (const stage of discoverStages(filters, country, seedGenreIds)) {
    for (let page = 1; page <= TMDB_DISCOVER_PAGES; page += 1) {
      for (const request of requests) {
        const genreVariants = genreParamVariantsForRequest(filters, request, stage.useGenre, seedGenreIds);
        for (const genreParam of genreVariants) {
          tasks.push({ request, stage, page, genreParam });
        }
      }
    }
  }

  const boundedTasks = tasks.slice(0, 24);
  let requestFailureCount = 0;
  const payloads = await mapWithConcurrency(
    boundedTasks,
    TMDB_REQUEST_CONCURRENCY,
    async (task) => {
      const params = discoverStageParams(
        filters,
        task.request,
        country,
        runtimeConstraint,
        task.stage,
        task.genreParam,
        task.page,
      );
      const payload = await tmdbGet(`/discover/${task.request.mediaType}`, params);
      return (payload.results || []).map((item) => {
        const normalized = normalizeTmdbItem(item, task.request.mediaType);
        const providerFiltered = Boolean(country && task.stage.useCountry && !normalized.countryCodes.length);
        return {
          ...normalized,
          countryCodes: providerFiltered ? [country] : normalized.countryCodes,
          countryValidation: providerFiltered ? "provider-filtered" : normalized.countryValidation,
          candidateSource: `${candidateSource}:${task.stage.id}`,
          fallbackStage: task.stage.id,
          fallbackRelaxed: task.stage.id !== "strict",
          reason: task.stage.id !== "strict" ? RELAXED_REASON : normalized.reason,
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

  if (boundedTasks.length && requestFailureCount === boundedTasks.length) {
    throw new Error("TMDB discover requests failed.");
  }

  const rawCandidates = uniqueRawCandidates(payloads.flat()).slice(0, RAW_CANDIDATE_LIMIT);
  const enrichedCandidates = await enrichCandidateMetadata(rawCandidates, { maxDetails: 36 });
  const finalized = finalizeCandidatePool(enrichedCandidates, {
    filters,
    contentTypes: requestedTypes,
    limit,
  });
  const enrichedResults = await enrichWatchProviders(finalized.results);

  return {
    source: "tmdb",
    tmdbEnabled: true,
    results: enrichedResults,
    relaxedResults: finalized.relaxedResults,
    diagnostics: {
      ...finalized.diagnostics,
      requestCount: boundedTasks.length,
      requestFailureCount,
      candidates: enrichedResults.map(debugCandidate),
      exclusions: finalized.exclusions.slice(0, 24).map(debugCandidate),
    },
  };
}

async function fetchRecommendationResults(seed, endpoint) {
  const mediaType = seedMediaType(seed);
  const payload = await tmdbGet(mediaPath(mediaType, seed.tmdbId, endpoint), {
    page: "1",
  });

  return (payload.results || [])
    .filter((item) => item.id !== seed.tmdbId)
    .filter((item) => {
      const itemMediaType = item.media_type || mediaType;
      return ["movie", "tv"].includes(itemMediaType);
    })
    .map((item) => ({
      ...normalizeTmdbItem(item, item.media_type || mediaType),
      candidateSource: `tmdb-seed-${endpoint}`,
      fallbackStage: "strict",
      fallbackRelaxed: false,
      reasonSeed: seed.title,
      seedTitle: seed.title,
    }));
}

async function findSeedContent(query) {
  const payload = await tmdbGet("/search/multi", {
    query,
    include_adult: "false",
    page: "1",
  });

  const candidates = [];
  for (const item of payload.results || []) {
    const mediaType = item.media_type;
    if (!["movie", "tv"].includes(mediaType)) continue;
    candidates.push(normalizeTmdbItem(item, mediaType));
  }

  return candidates.sort((a, b) => scoreSearchResult(b, query) - scoreSearchResult(a, query))[0] || null;
}

export async function searchTmdb(query, contentTypes = [], filters = []) {
  if (!hasTmdbKey()) {
    return {
      source: "fallback",
      tmdbEnabled: false,
      results: [],
      message: "TMDb API key is not configured.",
    };
  }

  const seed = await findSeedContent(query);
  if (!seed) {
    return {
      source: "tmdb",
      tmdbEnabled: true,
      seed: null,
      results: [],
    };
  }

  const recommended = [];
  let candidateRequestSucceeded = false;

  try {
    recommended.push(...(await fetchRecommendationResults(seed, "recommendations")));
    candidateRequestSucceeded = true;
  } catch {
    // Some TMDB titles have sparse recommendation data. Similar is the planned fallback below.
  }

  if (recommended.length < 36) {
    try {
      recommended.push(...(await fetchRecommendationResults(seed, "similar")));
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
      candidateSource: "tmdb-seed-discover",
    });
    candidateRequestSucceeded = true;
  } catch {
    // Seed recommendations remain usable when discover supplement fails.
  }

  if (!candidateRequestSucceeded) {
    throw new Error("TMDB seed recommendation requests failed.");
  }

  const recommendationCandidates = uniqueRawCandidates(recommended).slice(0, 40);
  const enrichedRecommended = await enrichCandidateMetadata(recommendationCandidates, { maxDetails: 32 });
  const supplemented = (supplement.results || []).map((item) => ({
    ...item,
    candidateSource: "tmdb-seed-discover",
    seedSupplement: true,
    reasonSeed: seed.title,
    seedTitle: seed.title,
  }));
  const finalized = finalizeCandidatePool([...enrichedRecommended, ...supplemented], {
    filters,
    contentTypes,
    limit: TMDB_RECOMMENDATION_LIMIT,
  });
  const enrichedResults = await enrichWatchProviders(finalized.results);

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
    results: enrichedResults,
    relaxedResults: finalized.relaxedResults,
    diagnostics: {
      ...finalized.diagnostics,
      seedRecommendationCount: recommended.filter((item) => item.candidateSource === "tmdb-seed-recommendations").length,
      seedSimilarCount: recommended.filter((item) => item.candidateSource === "tmdb-seed-similar").length,
      seedSupplementCount: supplemented.length,
      candidates: enrichedResults.map(debugCandidate),
      exclusions: finalized.exclusions.slice(0, 24).map(debugCandidate),
    },
  };
}
