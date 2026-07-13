import { createTmdbRequestContext } from "../requestContext.js";

export const FIXTURE_SEEDS = Object.freeze({
  "seed alpha": { id: 101, title: "Seed Alpha" },
  "seed beta": { id: 102, title: "Seed Beta" },
  "seed gamma": { id: 103, title: "Seed Gamma" },
  "seed delta": { id: 104, title: "Seed Delta" },
  "seed epsilon": { id: 105, title: "Seed Epsilon" },
  "seed zeta": { id: 106, title: "Seed Zeta" },
  "seed eta": { id: 107, title: "Seed Eta" },
  "seed theta": { id: 108, title: "Seed Theta" },
  "seed iota": { id: 109, title: "Seed Iota" },
  "seed kappa": { id: 110, title: "Seed Kappa" },
  인터스텔라: { id: 201, title: "인터스텔라" },
  라라랜드: { id: 202, title: "라라랜드" },
  "너의 이름은": { id: 203, title: "너의 이름은" },
  기생충: { id: 204, title: "기생충" },
  듄: { id: 205, title: "듄" },
  컨택트: { id: 206, title: "컨택트" },
  매트릭스: { id: 207, title: "매트릭스" },
  인셉션: { id: 208, title: "인셉션" },
  타이타닉: { id: 209, title: "타이타닉" },
  아바타: { id: 210, title: "아바타" },
  마션: { id: 211, title: "마션" },
});

function jsonResponse(status, payload = {}, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[String(name).toLowerCase()] || null },
    async json() {
      return payload;
    },
  };
}

function candidate(id) {
  return {
    id,
    title: `Work-${id}`,
    original_title: `Work-${id}`,
    media_type: "movie",
    genre_ids: [28, 18],
    origin_country: ["US"],
    release_date: "2024-01-01",
    vote_average: 7.5,
    vote_count: 500,
    popularity: 100 - (id % 10),
    overview: `Overview ${id}`,
  };
}

function candidateList(seedId, count) {
  if (!count) return [];
  return [candidate(9_000), ...Array.from({ length: count - 1 }, (_, index) => candidate(seedId * 100 + index + 1))];
}

function detail(id) {
  return {
    ...candidate(id),
    genres: [
      { id: 28, name: "Action" },
      { id: 18, name: "Drama" },
    ],
    production_countries: [{ iso_3166_1: "US", name: "United States" }],
    runtime: 112,
    belongs_to_collection: null,
    credits: { cast: [], crew: [] },
    keywords: { keywords: [] },
    "watch/providers": { results: {} },
  };
}

export function createFixtureFetch({
  recommendationCount = 14,
  similarCount = 14,
  failSearchTitles = [],
  stallRecommendationTitles = [],
} = {}) {
  const calls = [];
  const failedSearches = new Set(failSearchTitles.map((title) => title.toLocaleLowerCase()));
  const stalledRecommendations = new Set(stallRecommendationTitles.map((title) => title.toLocaleLowerCase()));
  const seedTitleById = new Map(Object.values(FIXTURE_SEEDS).map((seed) => [String(seed.id), seed.title.toLocaleLowerCase()]));

  const fetchImpl = async (url, { signal } = {}) => {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/3/, "");
    const query = parsed.searchParams.get("query")?.trim().toLocaleLowerCase() || "";
    calls.push({ path, query });

    if (path === "/search/multi") {
      if (failedSearches.has(query)) return jsonResponse(500);
      const seed = FIXTURE_SEEDS[query];
      return jsonResponse(200, {
        results: seed
          ? [{
              id: seed.id,
              media_type: "movie",
              title: seed.title,
              original_title: seed.title,
              genre_ids: [28, 18],
              origin_country: ["US"],
              release_date: "2020-01-01",
              vote_average: 8,
              popularity: 80,
            }]
          : [],
      });
    }

    const recommendationMatch = path.match(/^\/movie\/(\d+)\/recommendations$/);
    if (recommendationMatch) {
      const seedId = recommendationMatch[1];
      const seedTitle = seedTitleById.get(seedId);
      if (stalledRecommendations.has(seedTitle)) {
        return new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        });
      }
      return jsonResponse(200, { results: candidateList(Number(seedId), recommendationCount) });
    }

    const similarMatch = path.match(/^\/movie\/(\d+)\/similar$/);
    if (similarMatch) {
      return jsonResponse(200, { results: candidateList(Number(similarMatch[1]) + 50, similarCount) });
    }

    if (path.startsWith("/discover/")) {
      return jsonResponse(200, { results: candidateList(800, 14) });
    }

    const detailMatch = path.match(/^\/movie\/(\d+)$/);
    if (detailMatch) return jsonResponse(200, detail(Number(detailMatch[1])));

    return jsonResponse(404);
  };

  return { fetchImpl, calls };
}

export function createRecommendationContextFactory(fixture, options = {}) {
  let count = 0;
  return {
    factory() {
      count += 1;
      return createTmdbRequestContext({
        fetchImpl: fixture.fetchImpl,
        fetchTimeoutMs: options.fetchTimeoutMs ?? 100,
        recommendationDeadlineMs: options.recommendationDeadlineMs ?? 2_000,
        maximumRetryAfterMs: 20,
        sleep: async () => {},
      });
    },
    count: () => count,
  };
}
