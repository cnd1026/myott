import {
  discoverTmdb,
  firstPicksTmdb,
  hasTmdbKey,
  recommendSeedsTmdb,
  relatedTmdb,
  searchTmdb,
} from "../../../../lib/tmdb.js";
import {
  normalizeDisplayContentType,
  normalizeProviderMediaType,
} from "../../recommendation/filters/hardFilterContract.js";

function typeLabel(contentType) {
  if (contentType === "movie") return "영화";
  if (contentType === "animation") return "애니";
  return "드라마";
}

function toUnifiedContentModel(item) {
  const contentType = item.type || "movie";
  const providerContentId = item.tmdbId ? String(item.tmdbId) : `${contentType}-${item.title}`;
  const overview = item.synopsis || "줄거리 정보가 아직 없습니다.";
  const platforms = item.ott || ["검색 필요"];
  const moods = item.mood || [];

  return {
    ...item,
    id: `tmdb-${providerContentId}`,
    providerId: "tmdb",
    providerContentId,
    providerMediaType: item.providerMediaType || item.mediaType || "",
    displayContentType: item.displayContentType || contentType,
    contentType,
    releaseYear: item.year || 0,
    platforms,
    moods,
    overview,
    backdrop: item.backdrop || "",
    backdropPath: item.backdropPath || "",
    label: item.label || typeLabel(contentType),
    genre: item.genre || (item.genres || ["기타"]).join(", "),
    source: "tmdb",
    // Compatibility aliases for the current UI/API response shape.
    type: contentType,
    year: item.year || 0,
    ott: platforms,
    mood: moods,
    synopsis: overview,
  };
}

function toUnifiedRecommendationPayload(payload = {}) {
  return {
    results: (payload.results || []).map(toUnifiedContentModel),
    relaxedResults: (payload.relaxedResults || []).map(toUnifiedContentModel),
    diagnostics: payload.diagnostics || {},
  };
}

export function toFirstPickContentModel(item = {}) {
  const providerContentId = String(item.tmdbId || item.providerContentId || "").trim();
  const providerMediaType = normalizeProviderMediaType(item);
  const displayContentType = normalizeDisplayContentType(item);
  const title = String(item.title || "").trim();
  if (!providerContentId || !title || !["movie", "tv"].includes(providerMediaType) ||
      !["movie", "drama", "animation"].includes(displayContentType)) {
    return null;
  }

  const genres = (Array.isArray(item.genres) ? item.genres : [])
    .map((genre) => String(genre || "").trim())
    .filter((genre) => genre && genre !== "기타");
  const platforms = (Array.isArray(item.actualStreamingProviders) ? item.actualStreamingProviders : [])
    .map((platform) => String(platform || "").trim())
    .filter(Boolean);
  const runtime = Number(item.runtime);
  const rating = Number(item.rating);

  return {
    id: `tmdb-${providerMediaType}-${providerContentId}`,
    providerId: "tmdb",
    providerContentId,
    tmdbId: Number(providerContentId),
    providerMediaType,
    displayContentType,
    contentType: displayContentType,
    type: displayContentType,
    title,
    originalTitle: String(item.originalTitle || "").trim(),
    year: Number(item.year) || 0,
    poster: typeof item.poster === "string" ? item.poster : "",
    backdrop: typeof item.backdrop === "string" ? item.backdrop : "",
    genres,
    genre: genres.join(", "),
    runtime: Number.isFinite(runtime) && runtime > 0 ? runtime : 0,
    rating: Number.isFinite(rating) && rating > 0 ? rating : 0,
    platforms,
    ott: platforms,
    synopsis: String(item.synopsis || "").trim(),
    providerGenreIds: Array.isArray(item.providerGenreIds) ? item.providerGenreIds : [],
    source: "tmdb",
  };
}

export const tmdbProvider = {
  id: "tmdb",
  name: "TMDB Provider",

  isEnabled() {
    return hasTmdbKey();
  },

  async search({ query = "", contentTypes = [], filters = [], seedTitles = [] } = {}) {
    const payload = await searchTmdb(query, contentTypes, filters, { seedTitles });
    return {
      ...toUnifiedRecommendationPayload(payload),
      results: (payload.results || []).map((item) =>
        toUnifiedContentModel({
          ...item,
          seedTitle: payload.seed?.title || query,
          seedGenreIds: payload.seed?.genreIds || [],
          seedGenres: payload.seed?.genres || [],
          seedContentType: payload.seed?.type || "",
        }),
      ),
    };
  },

  async getDetail() {
    return null;
  },

  async getRecommendations({
    query = "",
    filters = [],
    contentTypes = [],
    limit,
    seedTitles = [],
    qaDiagnostics = false,
  } = {}) {
    if (query) return this.search({ query, filters, contentTypes, seedTitles });
    const payload = await discoverTmdb({
      filters,
      contentTypes,
      limit,
      qaObservability: process.env.NODE_ENV !== "production" && Boolean(qaDiagnostics),
    });
    return toUnifiedRecommendationPayload(payload);
  },

  async getFirstPicks() {
    const payload = await firstPicksTmdb();
    return {
      results: (payload.results || []).map(toFirstPickContentModel).filter(Boolean).slice(0, 3),
      diagnostics: payload.diagnostics || {},
    };
  },

  async getSeedRecommendations({ titles = [], seeds = [], filters = [], contentTypes = [], limit } = {}) {
    const payload = await recommendSeedsTmdb({ titles, seeds, filters, contentTypes, limit });
    return {
      ...payload,
      ...toUnifiedRecommendationPayload(payload),
    };
  },

  async getRelated({ providerContentId, providerMediaType, contentType, title, originalTitle, limit } = {}) {
    const payload = await relatedTmdb({
      tmdbId: providerContentId,
      providerMediaType,
      contentType,
      title,
      originalTitle,
      limit,
    });
    return (payload.results || []).map(toUnifiedContentModel);
  },

  async getTrending() {
    return [];
  },
};
