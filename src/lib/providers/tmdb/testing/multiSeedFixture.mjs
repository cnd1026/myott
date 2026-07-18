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

function genreName(id) {
  return ({
    18: "Drama",
    28: "Action",
    878: "Science Fiction",
    10749: "Romance",
    10759: "Action & Adventure",
    10765: "Sci-Fi & Fantasy",
  })[Number(id)] || ("Genre-" + id);
}

function candidate(id, {
  mediaType = "movie",
  genreIds = mediaType === "tv" ? [10765, 18] : [28, 18],
  overview = "Overview " + id,
} = {}) {
  const common = {
    id,
    media_type: mediaType,
    genre_ids: genreIds,
    origin_country: ["US"],
    vote_average: 7.5,
    vote_count: 500,
    popularity: 100 - (id % 10),
    overview,
  };
  return mediaType === "tv"
    ? {
        ...common,
        name: "Work-" + id,
        original_name: "Work-" + id,
        first_air_date: "2024-01-01",
      }
    : {
        ...common,
        title: "Work-" + id,
        original_title: "Work-" + id,
        release_date: "2024-01-01",
      };
}

function candidateList(seedId, count, options = {}) {
  if (!count) return [];
  return [
    candidate(9_000, options),
    ...Array.from({ length: count - 1 }, (_, index) => candidate(seedId * 100 + index + 1, options)),
  ];
}

function detail(id, {
  mediaType = "movie",
  genreIds = mediaType === "tv" ? [10765, 18] : [28, 18],
  overview,
  keywordNames = mediaType === "tv" ? ["space", "future"] : [],
} = {}) {
  const base = candidate(id, { mediaType, genreIds, overview });
  const keywordItems = keywordNames.map((name, index) => ({ id: id * 10 + index, name }));
  return {
    ...base,
    genres: genreIds.map((genreId) => ({ id: genreId, name: genreName(genreId) })),
    production_countries: [{ iso_3166_1: "US", name: "United States" }],
    runtime: mediaType === "movie" ? 112 : undefined,
    episode_run_time: mediaType === "tv" ? [52] : undefined,
    belongs_to_collection: null,
    credits: { cast: [], crew: [] },
    keywords: mediaType === "tv" ? { results: keywordItems } : { keywords: keywordItems },
    "watch/providers": { results: {} },
  };
}

export function createFixtureFetch({
  recommendationCount = 14,
  similarCount = 14,
  failSearchTitles = [],
  stallRecommendationTitles = [],
  tvDiscoverGenreIds = [10765, 18],
  tvDiscoverKeywordNames = ["space", "future"],
  tvDiscoverOverview = "A future journey through space and advanced technology.",
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
      const mediaType = path === "/discover/tv" ? "tv" : "movie";
      const options = mediaType === "tv"
        ? { mediaType, genreIds: tvDiscoverGenreIds, overview: tvDiscoverOverview }
        : { mediaType };
      return jsonResponse(200, {
        page: 1,
        total_results: 14,
        results: candidateList(800, 14, options),
      });
    }

    const detailMatch = path.match(/^\/(movie|tv)\/(\d+)$/);
    if (detailMatch) {
      const mediaType = detailMatch[1];
      return jsonResponse(200, detail(Number(detailMatch[2]), mediaType === "tv"
        ? {
            mediaType,
            genreIds: tvDiscoverGenreIds,
            overview: tvDiscoverOverview,
            keywordNames: tvDiscoverKeywordNames,
          }
        : { mediaType }));
    }
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
