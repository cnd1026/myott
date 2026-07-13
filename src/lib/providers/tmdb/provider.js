import {
  discoverTmdb,
  hasTmdbKey,
  recommendSeedsTmdb,
  relatedTmdb,
  searchTmdb,
} from "../../../../lib/tmdb.js";

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

  async getRecommendations({ query = "", filters = [], contentTypes = [], limit, seedTitles = [] } = {}) {
    if (query) return this.search({ query, filters, contentTypes, seedTitles });
    const payload = await discoverTmdb({ filters, contentTypes, limit });
    return toUnifiedRecommendationPayload(payload);
  },

  async getSeedRecommendations({ titles = [], filters = [], contentTypes = [], limit } = {}) {
    const payload = await recommendSeedsTmdb({ titles, filters, contentTypes, limit });
    return {
      ...payload,
      ...toUnifiedRecommendationPayload(payload),
    };
  },

  async getRelated({ providerContentId, contentType, limit } = {}) {
    const payload = await relatedTmdb({
      tmdbId: providerContentId,
      contentType,
      limit,
    });
    return (payload.results || []).map(toUnifiedContentModel);
  },

  async getTrending() {
    return [];
  },
};
