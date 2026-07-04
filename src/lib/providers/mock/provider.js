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
  const contentType = content.contentType === "series" || content.contentType === "tv" ? "drama" : content.contentType;
  const type = content.type === "series" || content.type === "tv" ? "drama" : content.type;
  return contentTypes.includes(contentType) || contentTypes.includes(type);
}

function contentMatchesFilters(content, filters = []) {
  if (!filters.length) return true;
  return filters.some((filter) => searchableTagsForContent(content).has(filter));
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

function filterMatchCount(content, filters = []) {
  if (!filters.length) return 0;
  const searchableTags = searchableTagsForContent(content);
  return filters.reduce((score, filter) => score + (searchableTags.has(filter) ? 1 : 0), 0);
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
      .sort((left, right) => filterMatchCount(right, filters) - filterMatchCount(left, filters))
      .slice(0, limit)
      .map(cloneContent);

    return matched.length ? matched : fallbackResults(contentTypes, limit);
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
