import { mockContents } from "./data.js";
import { finalizeCandidatePool } from "../../recommendation/candidates/candidatePipeline.js";

const DEFAULT_LIMIT = 12;

const MOCK_GENRE_IDS = Object.freeze({
  "SF": 878,
  판타지: 14,
  애니메이션: 16,
  드라마: 18,
  공포: 27,
  액션: 28,
  코미디: 35,
  스릴러: 53,
  범죄: 80,
  다큐멘터리: 99,
  로맨스: 10749,
  가족: 10751,
  모험: 12,
  미스터리: 9648,
});

function mockGenreIds(content) {
  const isDrama = ["drama", "series", "tv"].includes(content.contentType || content.type);
  return [...new Set((content.genres || []).flatMap((genre) => {
    if (isDrama && genre === "SF") return [10765];
    if (isDrama && genre === "액션") return [10759];
    if (isDrama && genre === "스릴러") return [80, 9648];
    return MOCK_GENRE_IDS[genre] ? [MOCK_GENRE_IDS[genre]] : [];
  }))];
}

function cloneContent(content) {
  return {
    ...content,
    genreIds: content.genreIds?.length ? [...content.genreIds] : mockGenreIds(content),
    genres: [...content.genres],
    actors: [...content.actors],
    platforms: [...content.platforms],
    ott: [...content.ott],
    moods: [...content.moods],
    mood: [...content.mood],
    tags: [...content.tags],
    keywords: [...content.keywords],
  };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function contentMatchesQuery(content, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const searchableText = [
    content.title,
    content.contentType,
    content.type,
    content.label,
    content.country,
    content.genre,
    content.director,
    ...content.genres,
    ...content.actors,
    ...content.keywords,
    ...content.tags,
  ]
    .map(normalizeText)
    .join(" ");

  return searchableText.includes(normalizedQuery);
}

function contentMatchesTypes(content, contentTypes = []) {
  if (!contentTypes.length) return true;
  const contentType = content.contentType === "series" || content.contentType === "tv" ? "drama" : content.contentType;
  const type = content.type === "series" || content.type === "tv" ? "drama" : content.type;
  return contentTypes.includes(contentType) || contentTypes.includes(type);
}

function contentMatchesFilters(content, filters = []) {
  if (!filters.length) return true;
  return filters.some((filter) => searchableTagsForContent(content).has(filter));
}

function contentMatchesEveryFilter(content, filters = []) {
  if (!filters.length) return true;
  const searchableTags = searchableTagsForContent(content);
  return filters.every((filter) => searchableTags.has(filter));
}

function optionFilterGroups(filters = []) {
  return {
    genres: filters.filter((filter) => filter.startsWith("genre-") || filter.startsWith("tmdb-genre-")),
    countries: filters.filter((filter) => filter.startsWith("country-")),
    runtimes: filters.filter((filter) => filter.startsWith("runtime-")),
  };
}

function searchableTagsForContent(content) {
  const searchableTags = new Set([
    content.contentType,
    content.type,
    content.country,
    ...content.platforms,
    ...content.ott,
    ...content.genres,
    ...content.moods,
    ...content.keywords,
    ...content.tags,
  ]);

  return searchableTags;
}

function fallbackResults(contentTypes = [], limit = DEFAULT_LIMIT) {
  return mockContents.filter((content) => contentMatchesTypes(content, contentTypes)).slice(0, limit).map(cloneContent);
}

function progressiveRecommendationPayload(filters = [], contentTypes = [], limit = DEFAULT_LIMIT) {
  const { runtimes } = optionFilterGroups(filters);
  const candidates = mockContents
    .filter((content) => contentMatchesTypes(content, contentTypes))
    .filter((content) => contentMatchesEveryFilter(content, runtimes))
    .map((content) => ({
      ...cloneContent(content),
      candidateSource: "mock-candidate",
    }));

  return finalizeCandidatePool(candidates, { filters, contentTypes, limit });
}

export const mockProvider = {
  id: "mock",
  name: "MyOTT Mock Provider",

  async search({ query = "", contentTypes = [], filters = [], limit = DEFAULT_LIMIT, seedTitles = [] } = {}) {
    const matched = mockContents
      .filter((content) => contentMatchesTypes(content, contentTypes))
      .filter((content) => contentMatchesQuery(content, query))
      .slice(0, limit)
      .map((content) => ({ ...cloneContent(content), candidateSource: "mock-seed-match" }));

    const fallbackMatched = progressiveRecommendationPayload(filters, contentTypes, limit).results.map((content) => ({
      ...content,
      candidateSource: content.candidateSource || "mock-seed-supplement",
      seedSupplement: true,
    }));
    return finalizeCandidatePool([...matched, ...fallbackMatched], {
      filters,
      contentTypes,
      limit,
      seedTitles: [...new Set([...seedTitles, query].filter(Boolean))],
    });
  },

  async getDetail({ providerContentId } = {}) {
    const content = mockContents.find((item) => item.providerContentId === providerContentId || item.id === providerContentId);
    return content ? cloneContent(content) : null;
  },

  async getRecommendations({ filters = [], contentTypes = [], limit = DEFAULT_LIMIT } = {}) {
    const payload = progressiveRecommendationPayload(filters, contentTypes, limit);

    if (payload.results.length) return payload;
    if (filters.some((filter) => filter.startsWith("country-"))) return payload;
    return finalizeCandidatePool(fallbackResults(contentTypes, limit), { filters, contentTypes, limit });
  },

  async getRelated({ providerContentId, contentTypes = [], limit = DEFAULT_LIMIT } = {}) {
    const current = mockContents.find((item) => item.providerContentId === providerContentId || item.id === providerContentId);
    const filters = current ? [...current.tags, ...current.genres, current.country] : [];
    const matched = mockContents
      .filter((content) => content.providerContentId !== providerContentId && content.id !== providerContentId)
      .filter((content) => contentMatchesTypes(content, contentTypes))
      .filter((content) => contentMatchesFilters(content, filters))
      .slice(0, limit)
      .map(cloneContent);

    return matched.length ? matched : fallbackResults(contentTypes, limit).filter((content) => content.providerContentId !== providerContentId);
  },

  async getTrending({ contentTypes = [], limit = DEFAULT_LIMIT } = {}) {
    return fallbackResults(contentTypes, limit);
  },
};
