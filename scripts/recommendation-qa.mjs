import { readFile } from "node:fs/promises";

import { finalizeCandidatePool } from "../src/lib/recommendation/candidates/candidatePipeline.js";
import { evaluateRecommendationCase } from "../src/lib/recommendation/qa/evaluateRecommendationCase.js";

const dataset = JSON.parse(
  await readFile(new URL("../docs/project/recommendation-qa-dataset.json", import.meta.url), "utf8"),
);

const MOVIE_GENRE_IDS = Object.freeze({
  action: 28,
  animation: 16,
  comedy: 35,
  crime: 80,
  drama: 18,
  fantasy: 14,
  horror: 27,
  mystery: 9648,
  romance: 10749,
  sf: 878,
  thriller: 53,
});

const TV_GENRE_IDS = Object.freeze({
  action: 10759,
  animation: 16,
  comedy: 35,
  crime: 80,
  drama: 18,
  fantasy: 10765,
  horror: 9648,
  mystery: 9648,
  romance: 18,
  sf: 10765,
  thriller: 80,
});

function fixtureGenreIds(genres, contentType) {
  const genreMap = contentType === "drama" ? TV_GENRE_IDS : MOVIE_GENRE_IDS;
  const ids = genres.map((genre) => genreMap[String(genre).toLowerCase()]).filter(Boolean);
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
const reports = dataset.map((testCase) =>
  evaluateRecommendationCase(testCase, buildCaseResults(testCase), { diagnostics }),
);

for (const report of reports) {
  const status = report.pass ? "PASS" : "FAIL";
  const details = report.failedReasons.length ? ` ${report.failedReasons.join(", ")}` : "";
  console.log(`${status} ${report.caseId} ${report.matchedCount}/${report.totalCount}${details}`);
}

const failed = reports.filter((report) => !report.pass);
console.log(`Recommendation QA: ${reports.length - failed.length}/${reports.length} passed.`);
if (failed.length) process.exitCode = 1;
