import { mockContents } from "./data";

const DEFAULT_LIMIT = 8;

function cloneContent(content) {
  return {
    ...content,
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
  return contentTypes.includes(content.contentType) || contentTypes.includes(content.type);
}

function contentMatchesFilters(content, filters = []) {
  if (!filters.length) return true;
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

  return filters.some((filter) => searchableTags.has(filter));
}

function fallbackResults(contentTypes = [], limit = DEFAULT_LIMIT) {
  return mockContents.filter((content) => contentMatchesTypes(content, contentTypes)).slice(0, limit).map(cloneContent);
}

export const mockProvider = {
  id: "mock",
  name: "MyOTT Mock Provider",

  async search({ query = "", contentTypes = [], limit = DEFAULT_LIMIT } = {}) {
    const matched = mockContents
      .filter((content) => contentMatchesTypes(content, contentTypes))
      .filter((content) => contentMatchesQuery(content, query))
      .slice(0, limit)
      .map(cloneContent);

    return matched.length ? matched : fallbackResults(contentTypes, limit);
  },

  async getDetail({ providerContentId } = {}) {
    const content = mockContents.find((item) => item.providerContentId === providerContentId || item.id === providerContentId);
    return content ? cloneContent(content) : null;
  },

  async getRecommendations({ filters = [], contentTypes = [], limit = DEFAULT_LIMIT } = {}) {
    const matched = mockContents
      .filter((content) => contentMatchesTypes(content, contentTypes))
      .filter((content) => contentMatchesFilters(content, filters))
      .slice(0, limit)
      .map(cloneContent);

    return matched.length ? matched : fallbackResults(contentTypes, limit);
  },

  async getTrending({ contentTypes = [], limit = DEFAULT_LIMIT } = {}) {
    return fallbackResults(contentTypes, limit);
  },
};
