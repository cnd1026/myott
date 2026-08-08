import { createTmdbRequestContext } from "../../providers/tmdb/requestContext.js";

export function tmdbObservabilityFixtureCandidates() {
  return Array.from({ length: 20 }, (_, index) => {
    const id = 91_001 + index;
    return {
      id,
      media_type: "tv",
      name: `Fixture${id} Horror Drama`,
      original_name: `Fixture${id} Horror Drama`,
      first_air_date: "2020-01-01",
      genre_ids: [18, 9648],
      origin_country: ["US"],
      overview: "A ghost and demon haunt this horror drama.",
      popularity: 1_000 - index,
      vote_average: 8,
      vote_count: 500 - index,
    };
  });
}

export function tmdbObservabilityFixtureResponse(status, payload = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    async json() {
      return payload;
    },
  };
}

export function createTmdbObservabilityFixtureFetch(calls = []) {
  return async (rawUrl) => {
    const url = new URL(rawUrl);
    const match = url.pathname.match(/\/tv\/(\d+)$/);
    if (!match) throw new Error(`Unexpected deterministic fixture path: ${url.pathname}`);
    const id = Number(match[1]);
    calls.push({ id, pathname: url.pathname });
    return tmdbObservabilityFixtureResponse(200, {
      id,
      name: `Fixture${id} Horror Drama`,
      original_name: `Fixture${id} Horror Drama`,
      first_air_date: "2020-01-01",
      genres: [
        { id: 18, name: "Drama" },
        { id: 9648, name: "Mystery" },
      ],
      origin_country: ["US"],
      production_countries: [{ iso_3166_1: "US" }],
      episode_run_time: [45],
      overview: "A ghost and demon haunt this horror drama.",
      keywords: { results: [{ name: "ghost" }, { name: "demon" }] },
      credits: { cast: [], crew: [] },
      "watch/providers": { results: {} },
      popularity: 500,
      vote_average: 8,
      vote_count: 500,
    });
  };
}

export function createTmdbObservabilityFixtureContext({ observer, calls = [] } = {}) {
  const options = {
    fetchImpl: createTmdbObservabilityFixtureFetch(calls),
  };
  if (observer === undefined) {
    return createTmdbRequestContext({
      ...options,
      limits: { total: 24, list: 8, detail: 16, concurrency: 4, retries: 0 },
    });
  }
  return createTmdbRequestContext({
    ...options,
    observer,
    diagnosticLimits: { total: 24, list: 8, detail: 16, concurrency: 4 },
    diagnosticRetry: 0,
  });
}

export const TMDB_OBSERVABILITY_FIXTURE_INPUT = Object.freeze({
  candidates: tmdbObservabilityFixtureCandidates(),
  filters: ["country-us", "genre-horror"],
  contentTypes: ["drama"],
  limit: 12,
  diagnosticMode: "product-plan",
});
