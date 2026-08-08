import { createTmdbRequestContext } from "../../../src/lib/providers/tmdb/requestContext.js";
import { tmdbObservabilityFixtureCandidates, tmdbObservabilityFixtureResponse } from "../../../src/lib/recommendation/qa/tmdbObservabilityFixture.mjs";
import { createSyntheticGovernanceExecutionContract } from "./authorizationContract.mjs";
import { createSyntheticLiveInput } from "./inputContract.mjs";

export const V2_FIXTURE_SOURCE = "DETERMINISTIC_FIXTURE";

export function fixtureListPayload() {
  const results = tmdbObservabilityFixtureCandidates();
  return { page: 1, total_pages: 1, total_results: results.length, results };
}

export function fixtureDetailPayload(id) {
  return {
    id,
    name: `Fixture${id} Horror Drama`,
    original_name: `Fixture${id} Horror Drama`,
    first_air_date: "2020-01-01",
    genres: [{ id: 18, name: "Drama" }, { id: 9648, name: "Mystery" }],
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
  };
}

function redirectResponse(location) {
  return {
    ok: false,
    status: 302,
    headers: { get: (name) => name.toLowerCase() === "location" ? location : null },
    async json() { return {}; },
  };
}

export function createFixtureTransport({ redirects = {}, failures = {}, calls = [], listResponses = [], detailResponses = [] } = {}) {
  const redirectCounts = new Map();
  return async (rawUrl) => {
    const url = new URL(rawUrl);
    const path = url.pathname.startsWith("/3/") ? url.pathname.slice(2) : url.pathname;
    calls.push({ path, host: url.hostname });
    const redirectPlan = redirects[path];
    const redirectIndex = redirectCounts.get(path) || 0;
    const redirect = Array.isArray(redirectPlan) ? redirectPlan[redirectIndex] : redirectIndex === 0 ? redirectPlan : null;
    if (redirect) {
      redirectCounts.set(path, redirectIndex + 1);
      return redirectResponse(redirect);
    }
    if (failures[path]) {
      const error = new Error(failures[path]);
      error.code = failures[path];
      throw error;
    }
    if (path === "/discover/tv") {
      const payload = fixtureListPayload();
      calls[calls.length - 1].payload = payload;
      listResponses.push(payload);
      return tmdbObservabilityFixtureResponse(200, payload);
    }
    const detailMatch = path.match(/^\/tv\/(\d+)$/);
    if (detailMatch) {
      const payload = fixtureDetailPayload(Number(detailMatch[1]));
      calls[calls.length - 1].payload = payload;
      detailResponses.push(payload);
      return tmdbObservabilityFixtureResponse(200, payload);
    }
    throw new Error(`Unexpected deterministic fixture path: ${path}`);
  };
}

export function createFixtureRequestContext({ observer, transport, calls = [] } = {}) {
  const fetchImpl = transport || createFixtureTransport({ calls });
  const options = {
    apiKey: "synthetic-fixture-key",
    language: "en-US",
    region: "US",
    baseUrl: "https://api.themoviedb.org/3",
    fetchImpl,
  };
  if (observer === undefined) {
    return createTmdbRequestContext({ ...options, limits: { total: 24, list: 8, detail: 16, concurrency: 4, retries: 0 } });
  }
  return createTmdbRequestContext({
    ...options,
    observer,
    diagnosticLimits: { total: 24, list: 8, detail: 16, concurrency: 4 },
    diagnosticRetry: 0,
  });
}

export function strictInputNegativeFixtures(baseInput) {
  const cases = [];
  for (const key of ["adapterFactory", "adapter", "fetchImpl", "transport", "consumptionRecorder", "modulePath", "endpoint", "url", "URL", "fixtureAdapter", "testAdapter", "requestHook", "redirectHandler", "unknownField"]) {
    cases.push({ id: `strict-unknown-${key}`, input: { ...baseInput, [key]: true } });
  }
  cases.push({ id: "strict-missing-fixed-input", input: Object.fromEntries(Object.entries(baseInput).filter(([key]) => key !== "fixedInput")) });
  cases.push({ id: "strict-nested-extra", input: { ...baseInput, fixedInput: { ...baseInput.fixedInput, alias: "horror" } } });
  const inherited = Object.create({ inherited: true });
  Object.assign(inherited, baseInput);
  cases.push({ id: "strict-inherited-key", input: inherited });
  const prototypeLike = JSON.parse(JSON.stringify(baseInput));
  prototypeLike.fixedInput.__proto__ = { injected: true };
  cases.push({ id: "strict-prototype-like-key", input: prototypeLike });
  const symbolInput = JSON.parse(JSON.stringify(baseInput));
  symbolInput[Symbol("unknown")] = true;
  cases.push({ id: "strict-symbol-key", input: symbolInput });
  const nonEnumerableInput = JSON.parse(JSON.stringify(baseInput));
  Object.defineProperty(nonEnumerableInput, "nonEnumerable", { value: true, enumerable: false });
  cases.push({ id: "strict-non-enumerable-key", input: nonEnumerableInput });
  return cases;
}

export function authorizationNegativeFixtures(authorization) {
  const cases = [];
  const clone = () => JSON.parse(JSON.stringify(authorization));
  for (const [id, mutate] of [
    ["missing-field", (value) => { delete value.authorizationId; }],
    ["unknown-field", (value) => { value.unknown = true; }],
    ["wrong-id", (value) => { value.authorizationId = "WRONG"; }],
    ["not-granted", (value) => { value.authorizationState = "PENDING"; }],
    ["consumed", (value) => { value.consumedRuns = 1; }],
    ["allowance", (value) => { value.runAllowance = 2; }],
    ["source-pin", (value) => { value.sourcePins[Object.keys(value.sourcePins)[0]].sha256 = "0".repeat(64); }],
    ["input-mismatch", (value) => { value.fixedInput.country = "kr"; }],
    ["budget", (value) => { value.requestBudget.total = 25; }],
    ["destination", (value) => { value.allowedNetworkDestination.host = "evil.example"; }],
  ]) {
    const value = clone();
    mutate(value);
    cases.push({ id: `auth-${id}`, value });
  }
  return cases;
}

export function bindingOverrideNegativeFixtures() {
  return [
    "adapterFactory", "adapter", "fetchImpl", "transport", "consumptionRecorder",
    "modulePath", "endpoint", "url", "fixtureAdapter", "testAdapter",
  ].map((key) => ({ id: `binding-${key}`, input: { [key]: true } }));
}

export function redirectFixtureCases() {
  return [
    { id: "no-redirect", redirects: {} },
    { id: "redirect-1", redirects: { "/discover/tv": ["/discover/tv?hop=1"] }, expectedAttempts: 2 },
    { id: "redirect-3", redirects: { "/discover/tv": ["/discover/tv?hop=1", "/discover/tv?hop=2", "/discover/tv?hop=3"] }, expectedAttempts: 4 },
    { id: "redirect-4", redirects: { "/discover/tv": ["/discover/tv?hop=1", "/discover/tv?hop=2", "/discover/tv?hop=3", "/discover/tv?hop=4"] }, expectedAttempts: 4 },
    { id: "non-tmdb", redirects: { "/discover/tv": "https://evil.example/redirect" } },
    { id: "ip", redirects: { "/discover/tv": "https://127.0.0.1/redirect" } },
    { id: "userinfo", redirects: { "/discover/tv": "https://user:pass@api.themoviedb.org/3/discover/tv" } },
  ];
}

export function syntheticAuthorizationFixture(sourcePins = {}, validatorPins = {}) {
  const combined = {};
  for (const [path, value] of Object.entries(sourcePins)) combined[path] = typeof value === "string" ? { sha256: value, byteSize: 0 } : value;
  for (const [path, value] of Object.entries(validatorPins)) combined[path] = typeof value === "string" ? { sha256: value, byteSize: 0 } : value;
  return createSyntheticGovernanceExecutionContract({ sourcePins: combined });
}

export function syntheticLiveInput(governanceExecutionContract) {
  return createSyntheticLiveInput({ governanceExecutionContract });
}
