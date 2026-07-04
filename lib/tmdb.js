const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
const TMDB_RECOMMENDATION_LIMIT = 12;
const ALL_CONTENT_TYPES = ["movie", "drama", "animation"];

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
  const originalTitle = detail.original_title || detail.original_name || item.original_title || item.original_name || title;
  const release = (isMovie ? detail.release_date : detail.first_air_date) || item.release_date || item.first_air_date || "";
  const year = release && /^\d{4}/.test(release) ? Number(release.slice(0, 4)) : 0;
  const genres = (detail.genres || [])
    .map((genre) => genre.name)
    .filter(Boolean);
  const genreIdNames = (detail.genre_ids || item.genre_ids || []).map((genreId) => GENRE_BY_ID[genreId]).filter(Boolean);
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

  const providers = detail["watch/providers"]?.results?.[REGION] || {};
  const ott = [];
  for (const provider of (providers.flatrate || []).slice(0, 5)) {
    const name = serviceName(provider.provider_name);
    if (name && !ott.includes(name)) ott.push(name);
  }

  const keywordPayload = detail.keywords || {};
  const keywordItems = keywordPayload.keywords || keywordPayload.results || [];
  const keywords = [
    ...normalizedGenres,
    ...keywordItems.slice(0, 8).map((keyword) => translateKeyword(keyword.name)).filter(Boolean),
  ].slice(0, 10);

  const runtime = detail.runtime ?? detail.episode_run_time?.[0] ?? 0;

  return {
    tmdbId: detail.id || item.id,
    title,
    originalTitle,
    type: itemType,
    year,
    genreIds: detail.genre_ids || item.genre_ids || [],
    country: koreanCountry(detail.origin_country || item.origin_country),
    genres: normalizedGenres.length ? normalizedGenres : ["기타"],
    director: director || "정보 없음",
    actors: cast.length ? cast : ["정보 없음"],
    rating: Number(Number(detail.vote_average || item.vote_average || 0).toFixed(1)),
    popularity: Number(detail.popularity || item.popularity || 0),
    runtime,
    ott: ott.length ? ott : ["검색 필요"],
    mood: inferMood(normalizedGenres, keywords),
    keywords: keywords.length ? keywords : normalizedGenres.length ? normalizedGenres : ["취향 분석"],
    synopsis: detail.overview || item.overview || "줄거리 정보가 아직 없습니다.",
    poster: posterUrl(detail.poster_path || item.poster_path),
    backdrop: backdropUrl(detail.backdrop_path || item.backdrop_path),
    posterPath: detail.poster_path || item.poster_path || "",
    backdropPath: detail.backdrop_path || item.backdrop_path || "",
    source: "tmdb",
  };
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

function balanceDiscoveredResults(results = [], contentTypes = []) {
  const types = normalizedContentTypes(contentTypes);
  const typeOrder = types.length ? types : ALL_CONTENT_TYPES;
  if (typeOrder.length <= 1) return results;

  const groups = new Map(typeOrder.map((type) => [type, []]));
  const ungrouped = [];

  for (const item of results) {
    if (groups.has(item.type)) {
      groups.get(item.type).push(item);
    } else {
      ungrouped.push(item);
    }
  }

  const balanced = [];
  let cursor = 0;

  while (balanced.length < results.length) {
    let added = false;
    for (const type of typeOrder) {
      const item = groups.get(type)?.[cursor];
      if (!item) continue;
      balanced.push(item);
      added = true;
    }
    if (!added) break;
    cursor += 1;
  }

  for (const item of [...results, ...ungrouped]) {
    if (!balanced.includes(item)) balanced.push(item);
  }

  return balanced;
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

function genreIdsFromFilters(filters = [], mediaType = "movie") {
  const movieGenreMap = {
    "genre-sf": [878],
    "genre-sf-fantasy": [878, 14],
    "genre-romance": [10749],
    "genre-thriller": [53],
    "genre-animation": [16],
    "genre-action": [28],
    "genre-action-adventure": [28, 12],
    "genre-adventure": [12],
    "genre-comedy": [35],
    "genre-crime": [80],
    "genre-drama": [18],
    "genre-family": [10751],
    "genre-fantasy": [14],
    "genre-horror": [27],
    "genre-mystery": [9648],
    "genre-tv-movie": [10770],
  };
  const tvGenreMap = {
    "genre-sf": [10765],
    "genre-sf-fantasy": [10765],
    "genre-romance": [18],
    "genre-thriller": [80, 9648, 18],
    "genre-animation": [16],
    "genre-action": [10759],
    "genre-action-adventure": [10759],
    "genre-adventure": [10759],
    "genre-comedy": [35],
    "genre-crime": [80],
    "genre-drama": [18],
    "genre-family": [10751, 10762],
    "genre-fantasy": [10765],
    "genre-horror": [9648],
    "genre-mystery": [9648],
    "genre-news": [10763],
    "genre-reality": [10764],
    "genre-talk": [10767],
    "genre-soap": [10766],
    "genre-war-politics": [10768],
  };
  const genreMap = mediaType === "tv" ? tvGenreMap : movieGenreMap;

  return [
    ...new Set(
      filters.flatMap((filter) => {
        if (genreMap[filter]) return genreMap[filter];
        if (filter.startsWith("tmdb-genre-")) return [Number(filter.replace("tmdb-genre-", ""))];
        return [];
      }),
    ),
  ].filter((value) => Number.isFinite(value));
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

  return filters.map((filter) => countryMap[filter]).find(Boolean) || "";
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
  return {
    source: "tmdb",
    tmdbEnabled: true,
    results: related
      .filter((item) => {
        if (String(item.tmdbId) === String(tmdbId)) return false;
        const key = `${item.type}-${item.tmdbId || item.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit),
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

function withGenreParamForRequest(filters, request) {
  const filterGenreIds = genreIdsFromFilters(filters, request.mediaType);
  const nonAnimationGenreIds = filterGenreIds.filter((genreId) => genreId !== 16);

  if (request.animationOnly) {
    return nonAnimationGenreIds.length ? `16,${nonAnimationGenreIds.join("|")}` : "16";
  }

  return nonAnimationGenreIds.length ? nonAnimationGenreIds.join("|") : "";
}

export async function discoverTmdb({ filters = [], contentTypes = [], limit = TMDB_RECOMMENDATION_LIMIT } = {}) {
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
  const watchProviders = watchProvidersFromFilters(filters);
  const watchProviderIds = watchProviders.map((provider) => provider.id);
  const watchProviderLabels = watchProviders.map((provider) => provider.label);
  const results = [];

  for (const request of discoverRequestsForTypes(requestedTypes)) {
    const params = {
      page: "1",
      sort_by: "popularity.desc",
      include_adult: "false",
      "vote_count.gte": "50",
    };
    const genreParam = withGenreParamForRequest(filters, request);

    if (genreParam) params.with_genres = genreParam;
    if (!request.animationOnly) params.without_genres = "16";
    if (country) params.with_origin_country = country;
    if (watchProviderIds.length) {
      params.watch_region = REGION;
      params.with_watch_providers = watchProviderIds.join("|");
    }

    const payload = await tmdbGet(`/discover/${request.mediaType}`, params);
    results.push(
      ...(payload.results || []).map((item) => ({
        ...normalizeTmdbItem(item, request.mediaType),
        ...(watchProviderLabels.length ? { ott: watchProviderLabels } : {}),
      })),
    );
  }

  const seen = new Set();
  const uniqueResults = results
    .filter((item) => {
      const key = `${item.type}-${item.tmdbId || item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((item) => contentMatchesRequestedTypes(item, requestedTypes));

  return {
    source: "tmdb",
    tmdbEnabled: true,
    results: balanceDiscoveredResults(uniqueResults, requestedTypes).slice(0, limit),
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
    .map((item) => normalizeTmdbItem(item, item.media_type || mediaType));
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

export async function searchTmdb(query, contentTypes = []) {
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

  try {
    recommended.push(...(await fetchRecommendationResults(seed, "recommendations")));
  } catch {
    // Some TMDB titles have sparse recommendation data. Similar is the planned fallback below.
  }

  if (recommended.length < TMDB_RECOMMENDATION_LIMIT) {
    try {
      recommended.push(...(await fetchRecommendationResults(seed, "similar")));
    } catch {
      // Empty similar data should not break Mock fallback in the API route caller.
    }
  }

  const seen = new Set();
  const results = [];
  for (const item of recommended) {
    const key = `${item.type}-${item.tmdbId || item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (contentMatchesRequestedTypes(item, contentTypes)) results.push(item);
    if (results.length >= TMDB_RECOMMENDATION_LIMIT) break;
  }

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
    results,
  };
}
