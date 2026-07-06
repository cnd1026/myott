import { mockContents } from "./data";

const DEFAULT_LIMIT = 8;
const RELAXED_REASON = "조건을 조금 넓혀 함께 추천합니다.";
const FALLBACK_STAGES = [
  { id: "strict", useGenre: true, useCountry: true, relaxed: false },
  { id: "country", useGenre: false, useCountry: true, relaxed: true },
  { id: "genre", useGenre: true, useCountry: false, relaxed: true },
  { id: "type", useGenre: false, useCountry: false, relaxed: true },
];

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

function filterMatchCount(content, filters = []) {
  if (!filters.length) return 0;
  const searchableTags = searchableTagsForContent(content);
  return filters.reduce((score, filter) => score + (searchableTags.has(filter) ? 1 : 0), 0);
}

function fallbackResults(contentTypes = [], limit = DEFAULT_LIMIT) {
  return mockContents.filter((content) => contentMatchesTypes(content, contentTypes)).slice(0, limit).map(cloneContent);
}

function progressiveRecommendationResults(filters = [], contentTypes = [], limit = DEFAULT_LIMIT) {
  const { genres, countries, runtimes } = optionFilterGroups(filters);
  const seen = new Set();
  const results = [];

  for (const stage of FALLBACK_STAGES) {
    if (results.length >= limit) break;
    const stageFilters = [
      ...(stage.useGenre ? genres : []),
      ...(stage.useCountry ? countries : []),
      ...runtimes,
    ];
    const matched = mockContents
      .filter((content) => contentMatchesTypes(content, contentTypes))
      .filter((content) => contentMatchesEveryFilter(content, stageFilters))
      .sort((left, right) => filterMatchCount(right, filters) - filterMatchCount(left, filters));

    for (const content of matched) {
      const key = content.providerContentId || content.id || content.title;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        ...cloneContent(content),
        fallbackRelaxed: Boolean(stage.relaxed),
        fallbackStage: stage.id,
        reason: stage.relaxed ? RELAXED_REASON : content.reason,
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export const mockProvider = {
  id: "mock",
  name: "MyOTT Mock Provider",

  async search({ query = "", contentTypes = [], filters = [], limit = DEFAULT_LIMIT } = {}) {
    const matched = mockContents
      .filter((content) => contentMatchesTypes(content, contentTypes))
      .filter((content) => contentMatchesQuery(content, query))
      .filter((content) => contentMatchesEveryFilter(content, filters))
      .slice(0, limit)
      .map(cloneContent);

    if (matched.length >= limit) return matched;

    const fallbackMatched = progressiveRecommendationResults(filters, contentTypes, limit);
    const seen = new Set(matched.map((content) => content.providerContentId || content.id || content.title));
    const supplemented = [...matched];

    for (const content of fallbackMatched) {
      const key = content.providerContentId || content.id || content.title;
      if (seen.has(key)) continue;
      seen.add(key);
      supplemented.push(content);
      if (supplemented.length >= limit) break;
    }

    return supplemented.length ? supplemented : fallbackResults(contentTypes, limit);
  },

  async getDetail({ providerContentId } = {}) {
    const content = mockContents.find((item) => item.providerContentId === providerContentId || item.id === providerContentId);
    return content ? cloneContent(content) : null;
  },

  async getRecommendations({ filters = [], contentTypes = [], limit = DEFAULT_LIMIT } = {}) {
    const matched = progressiveRecommendationResults(filters, contentTypes, limit);

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
