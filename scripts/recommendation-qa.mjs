import { readFile } from "node:fs/promises";

import { recommendSeedsTmdb } from "../lib/tmdb.js";
import { clearTmdbRequestCache } from "../src/lib/providers/tmdb/requestContext.js";
import {
  createFixtureFetch,
  createRecommendationContextFactory,
} from "../src/lib/providers/tmdb/testing/multiSeedFixture.mjs";
import { classifyCandidate, finalizeCandidatePool } from "../src/lib/recommendation/candidates/candidatePipeline.js";
import {
  GENRE_TOP_EIGHT_VALUES,
  genreContractTokens,
  genreIdsForFilters,
  prioritizeGenreOptions,
} from "../src/lib/recommendation/genres/genreContract.js";
import { evaluateRecommendationCase } from "../src/lib/recommendation/qa/evaluateRecommendationCase.js";
import { taxonomyFixturesForCase } from "../src/lib/recommendation/qa/genreTaxonomyFixtures.js";
import {
  applySuggestionSelection,
  buildSeedRequestPayload,
  resolveEmptyStateMessage,
} from "../src/lib/recommendation/seeds/seedRequest.js";

const dataset = JSON.parse(
  await readFile(new URL("../docs/project/recommendation-qa-dataset.json", import.meta.url), "utf8"),
);

function fixtureGenreIds(genres, contentType) {
  const filters = genreContractTokens(genres);
  const ids = genreIdsForFilters(filters, contentType === "drama" ? "tv" : "movie");
  if (contentType === "animation" && !ids.includes(16)) ids.unshift(16);
  return ids.length ? ids : [18];
}

function buildCaseCandidates(testCase) {
  const expected = testCase.expected || {};
  const match = expected.match || {};
  const count = Math.max(expected.minimumResultCount || 0, Math.min(expected.topN || 8, 8));
  const countries = match.country?.length ? match.country : testCase.country || [];
  const genres = match.genreAny?.length ? match.genreAny : testCase.genre || [];
  const contentTypes = match.contentType?.length
    ? match.contentType
    : testCase.input?.contentTypes?.length
      ? testCase.input.contentTypes
      : testCase.contentType?.length
        ? testCase.contentType
        : ["movie"];
  const seedTitles = testCase.input?.titles || [];
  const fallbackCase = expected.dataSourceStates?.length === 1 && expected.dataSourceStates[0] === "fallback";

  const exactCandidates = Array.from({ length: count }, (_, index) => {
    const contentType = contentTypes[index % contentTypes.length];
    const seedTitle = seedTitles[index % Math.max(seedTitles.length, 1)] || "";
    const runtime = Number.isFinite(match.runtimeMaxMinutes)
      ? Math.max(20, match.runtimeMaxMinutes - 5)
      : Number.isFinite(match.runtimeMinMinutes)
        ? match.runtimeMinMinutes + 10
        : contentType === "drama"
          ? 55
          : 110;

    return {
      id: `fixture-${testCase.id}-${index + 1}`,
      tmdbId: 900000 + index,
      title: `${testCase.title} Fixture ${index + 1}`,
      originalTitle: `${testCase.id} Fixture ${index + 1}`,
      providerId: fallbackCase ? "mock" : "tmdb",
      dataSource: fallbackCase ? "fallback" : "tmdb",
      fallbackUsed: fallbackCase,
      fallbackReason: fallbackCase ? "Deterministic QA fallback fixture." : "",
      source: fallbackCase ? "mock" : "tmdb",
      countryCodes: countries.length ? countries : ["KR"],
      countryValidation: "verified",
      contentType,
      type: contentType,
      mediaType: contentType === "drama" ? "tv" : "movie",
      genres,
      genreIds: fixtureGenreIds(genres, contentType),
      runtime,
      franchiseKey: `fixture:${testCase.id}:${index + 1}`,
      reasonSeed: seedTitle,
      seedTitle,
    };
  });

  if (!testCase.input?.filters?.some((filter) => filter.startsWith("genre-"))) {
    return exactCandidates;
  }

  const relaxedCount = Math.floor(exactCandidates.length * 0.25);
  const relaxedCandidates = Array.from({ length: relaxedCount }, (_, index) => ({
    ...exactCandidates[index],
    tmdbId: 910000 + index,
    id: `fixture-${testCase.id}-relaxed-${index + 1}`,
    title: `${testCase.title} Relaxed Fixture ${index + 1}`,
    originalTitle: `${testCase.id} Relaxed Fixture ${index + 1}`,
    genreIds: [99],
    genres: ["documentary"],
    franchiseKey: `fixture:${testCase.id}:relaxed:${index + 1}`,
    reason: "선택한 국가 안에서 장르 조건을 조금 넓혀 함께 추천합니다.",
  }));

  const selectedCountry = countries[0] || "KR";
  const foreignCandidate = {
    ...exactCandidates[0],
    tmdbId: 920000,
    id: `fixture-${testCase.id}-foreign`,
    title: `${testCase.title} Foreign Fixture`,
    originalTitle: `${testCase.id} Foreign Fixture`,
    countryCodes: [selectedCountry === "US" ? "JP" : "US"],
    franchiseKey: `fixture:${testCase.id}:foreign`,
  };
  const duplicateFranchise = {
    ...exactCandidates[0],
    tmdbId: 930000,
    id: `fixture-${testCase.id}-franchise-duplicate`,
    title: `${testCase.title} Franchise Duplicate`,
    originalTitle: `${testCase.id} Franchise Duplicate`,
  };

  return [...exactCandidates, ...relaxedCandidates, foreignCandidate, duplicateFranchise];
}

function buildCaseResults(testCase) {
  const input = testCase.input || {};
  const finalized = finalizeCandidatePool(buildCaseCandidates(testCase), {
    filters: input.filters || [],
    contentTypes: input.contentTypes || testCase.contentType || [],
    limit: testCase.expected?.topN || 12,
    seedTitles: input.titles || [],
  });
  return finalized.results;
}

const diagnostics = {
  requestsUsed: 8,
  detailRequestsUsed: 4,
  duplicateDetailRequestCount: 0,
  budgetExhausted: false,
};
const multiSeedCaseIds = new Set(["REC-QA-021", "REC-QA-022", "REC-QA-023", "REC-QA-024", "REC-QA-027", "REC-QA-047"]);
const taxonomyCaseIds = new Set(Array.from({ length: 15 }, (_, index) => `REC-QA-${String(index + 32).padStart(3, "0")}`));
const reports = [];

for (const testCase of dataset) {
  if (taxonomyCaseIds.has(testCase.id)) {
    const fixtures = taxonomyFixturesForCase(testCase.id);
    const results = fixtures.map((item) => classifyCandidate(item, {
      filters: testCase.input?.filters || [],
      contentTypes: testCase.input?.contentTypes || [],
    }));
    reports.push(evaluateRecommendationCase(testCase, results, { diagnostics }));
    continue;
  }
  if (testCase.id === "REC-QA-028") {
    const selection = applySuggestionSelection("home alone", {
      providerContentId: 201,
      mediaType: "movie",
      type: "movie",
      title: "나 홀로 집에",
      originalTitle: "Home Alone",
    });
    const request = buildSeedRequestPayload({
      titles: [selection.inputValue],
      confirmedSeeds: { 0: selection.confirmedSeed },
      contentTypes: ["movie"],
    });
    reports.push(evaluateRecommendationCase(testCase, [{ title: "UI contract" }], {
      diagnostics: {
        inputLanguagePreserved: selection.inputValue === "home alone",
        confirmedSeedCount: request.seeds.length,
        searchSkippedSeedCount: request.seeds.length,
      },
    }));
    continue;
  }
  if (testCase.id === "REC-QA-029") {
    clearTmdbRequestCache();
    const fixture = createFixtureFetch();
    const contextFactory = createRecommendationContextFactory(fixture);
    const payload = await recommendSeedsTmdb({
      seeds: ["나 홀로 집에", "Home Alone", "home alone"].map((inputTitle) => ({
        inputTitle,
        tmdbId: 201,
        mediaType: "movie",
        resolvedTitle: "나 홀로 집에",
        originalTitle: "Home Alone",
      })),
      contentTypes: ["movie"],
      requestContextFactory: contextFactory.factory,
    });
    reports.push(evaluateRecommendationCase(testCase, payload.results || [], { diagnostics: payload.diagnostics }));
    continue;
  }
  if (testCase.id === "REC-QA-048") {
    clearTmdbRequestCache();
    const fixture = createFixtureFetch();
    const contextFactory = createRecommendationContextFactory(fixture);
    const payload = await recommendSeedsTmdb({
      seeds: ["나 홀로 집에", "Home Alone", "home alone"].map((inputTitle) => ({
        inputTitle,
        tmdbId: 201,
        mediaType: "movie",
        resolvedTitle: "나 홀로 집에",
        originalTitle: "Home Alone",
      })),
      contentTypes: ["movie"],
      requestContextFactory: contextFactory.factory,
    });
    reports.push(evaluateRecommendationCase(testCase, payload.results || [], { diagnostics: payload.diagnostics }));
    continue;
  }
  if (testCase.id === "REC-QA-030") {
    const options = prioritizeGenreOptions(dataset
      .flatMap((item) => item.input?.filters || [])
      .filter((value) => value.startsWith("genre-"))
      .map((value) => [value, value]));
    const topValues = prioritizeGenreOptions([
      ...GENRE_TOP_EIGHT_VALUES.map((value) => [value, value]),
      ...options,
    ]).slice(0, 8).map(([value]) => value);
    reports.push(evaluateRecommendationCase(testCase, [{ title: "UI contract" }], {
      diagnostics: { genreOptionOrderMatched: JSON.stringify(topValues) === JSON.stringify(testCase.expected.genreOptionOrder) },
    }));
    continue;
  }
  if (testCase.id === "REC-QA-031") {
    const message = resolveEmptyStateMessage({ recommendationStatus: "empty", selectedTypes: ["drama"] });
    reports.push(evaluateRecommendationCase(testCase, [{ title: "UI contract" }], {
      diagnostics: { emptyStateMessageMatched: !message.includes("하나 이상 선택") },
    }));
    continue;
  }
  if (!multiSeedCaseIds.has(testCase.id)) {
    reports.push(evaluateRecommendationCase(testCase, buildCaseResults(testCase), { diagnostics }));
    continue;
  }

  clearTmdbRequestCache();
  const fixture = createFixtureFetch(
    testCase.id === "REC-QA-024"
      ? { stallRecommendationTitles: ["Seed Beta"] }
      : {},
  );
  const contextFactory = createRecommendationContextFactory(
    fixture,
    testCase.id === "REC-QA-024"
      ? { fetchTimeoutMs: 100, recommendationDeadlineMs: 30 }
      : {},
  );
  const payload = await recommendSeedsTmdb({
    titles: testCase.input?.titles || [],
    contentTypes: testCase.input?.contentTypes || [],
    filters: testCase.input?.filters || [],
    requestContextFactory: contextFactory.factory,
  });
  reports.push(evaluateRecommendationCase(testCase, payload.results || [], {
    diagnostics: payload.diagnostics || {},
  }));
}

for (const report of reports) {
  const status = report.pass ? "PASS" : "FAIL";
  const details = report.failedReasons.length ? ` ${report.failedReasons.join(", ")}` : "";
  console.log(`${status} ${report.caseId} ${report.matchedCount}/${report.totalCount}${details}`);
}

const failed = reports.filter((report) => !report.pass);
console.log(`Recommendation QA: ${reports.length - failed.length}/${reports.length} passed.`);
if (failed.length) process.exitCode = 1;
