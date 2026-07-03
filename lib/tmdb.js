const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

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

function posterUrl(path) {
  return path ? `${IMAGE_BASE}${path}` : "";
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
    TW: "대만",
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
    country: koreanCountry(detail.origin_country || item.origin_country),
    genres: normalizedGenres.length ? normalizedGenres : ["기타"],
    director: director || "정보 없음",
    actors: cast.length ? cast : ["정보 없음"],
    rating: Number(Number(detail.vote_average || item.vote_average || 0).toFixed(1)),
    runtime,
    ott: ott.length ? ott : ["검색 필요"],
    mood: inferMood(normalizedGenres, keywords),
    keywords: keywords.length ? keywords : normalizedGenres.length ? normalizedGenres : ["취향 분석"],
    synopsis: detail.overview || item.overview || "줄거리 정보가 아직 없습니다.",
    poster: posterUrl(detail.poster_path || item.poster_path),
    posterPath: detail.poster_path || item.poster_path || "",
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
  if (item.poster) score += 1;

  return score;
}

export async function searchTmdb(query) {
  if (!hasTmdbKey()) {
    return {
      source: "fallback",
      tmdbEnabled: false,
      results: [],
      message: "TMDb API key is not configured.",
    };
  }

  const payload = await tmdbGet("/search/multi", {
    query,
    include_adult: "false",
    page: "1",
  });

  const results = [];
  for (const item of payload.results || []) {
    const mediaType = item.media_type;
    if (!["movie", "tv"].includes(mediaType)) continue;

    try {
      const detail = await tmdbGet(`/${mediaType}/${item.id}`, {
        append_to_response: "credits,watch/providers,keywords",
      });
      results.push(normalizeTmdbItem(item, mediaType, detail));
    } catch {
      results.push(normalizeTmdbItem(item, mediaType));
    }

    if (results.length >= 12) break;
  }

  return {
    source: "tmdb",
    tmdbEnabled: true,
    results: results.sort((a, b) => scoreSearchResult(b, query) - scoreSearchResult(a, query)).slice(0, 8),
  };
}
