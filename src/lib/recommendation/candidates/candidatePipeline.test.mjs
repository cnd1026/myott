import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  candidateGenreMatches,
  finalizeCandidatePool,
  normalizedCountryCodes,
  roundRobinCandidates,
} from "./candidatePipeline.js";
import { evaluateRecommendationCase } from "../qa/evaluateRecommendationCase.js";

let candidateId = 1000;

function candidate(overrides = {}) {
  candidateId += 1;
  return {
    providerId: "tmdb",
    tmdbId: overrides.tmdbId || candidateId,
    title: "Candidate",
    originalTitle: "Candidate",
    type: "movie",
    mediaType: "movie",
    countryCodes: ["KR"],
    countryValidation: "verified",
    genreIds: [28],
    rating: 7.5,
    popularity: 50,
    ...overrides,
  };
}

test("country mismatch never enters primary results", () => {
  const pipeline = finalizeCandidatePool(
    [
      candidate({ tmdbId: 1, title: "Korean Action" }),
      candidate({ tmdbId: 2, title: "Foreign Hit", countryCodes: ["US"], popularity: 999 }),
    ],
    { filters: ["country-kr", "genre-action"], contentTypes: ["movie"], limit: 12 },
  );

  assert.deepEqual(pipeline.results.map((item) => item.title), ["Korean Action"]);
  assert.deepEqual(pipeline.relaxedResults.map((item) => item.title), ["Foreign Hit"]);
  assert.equal(pipeline.results[0].resultTier, "exact");
});

test("same-country genre relaxation never exceeds twenty percent", () => {
  const pipeline = finalizeCandidatePool(
    [
      candidate({ tmdbId: 3, title: "Korean Drama", originalTitle: "Drama Alpha", genreIds: [18], popularity: 999 }),
      candidate({ tmdbId: 4, title: "Korean Action", originalTitle: "Action Alpha", genreIds: [28], popularity: 1 }),
      candidate({ tmdbId: 41, title: "Korean Action 2", originalTitle: "Action Beta", genreIds: [28], popularity: 2 }),
      candidate({ tmdbId: 42, title: "Korean Action 3", originalTitle: "Action Gamma", genreIds: [28], popularity: 3 }),
      candidate({ tmdbId: 43, title: "Korean Action 4", originalTitle: "Action Delta", genreIds: [28], popularity: 4 }),
    ],
    { filters: ["country-kr", "genre-action"], contentTypes: ["movie"], limit: 12 },
  );

  assert.deepEqual(pipeline.results.map((item) => item.resultTier), ["exact", "exact", "exact", "exact", "same-country-relaxed"]);
  assert.equal(pipeline.diagnostics.primaryExactRatio, 0.8);
  assert.equal(pipeline.diagnostics.primaryRelaxedRatio, 0.2);
});

test("animation plus SF requires both animation and SF metadata", () => {
  const pipeline = finalizeCandidatePool(
    [
      candidate({ tmdbId: 5, title: "SF Animation", type: "animation", genreIds: [16, 878], countryCodes: ["JP"] }),
      candidate({ tmdbId: 6, title: "Animation Only", type: "animation", genreIds: [16], countryCodes: ["JP"] }),
    ],
    { filters: ["country-jp", "genre-sf"], contentTypes: ["animation"], limit: 12 },
  );

  assert.equal(pipeline.results[0].title, "SF Animation");
  assert.equal(pipeline.results[0].resultTier, "exact");
  assert.equal(pipeline.results.length, 1);
  assert.equal(pipeline.diagnostics.primaryRelaxedRatio, 0);
});

test("raw candidates round robin across content types", () => {
  const results = roundRobinCandidates([
    candidate({ tmdbId: 51, type: "movie" }),
    candidate({ tmdbId: 52, type: "movie" }),
    candidate({ tmdbId: 53, type: "drama", mediaType: "tv" }),
    candidate({ tmdbId: 54, type: "animation", genreIds: [16, 878] }),
  ]);

  assert.deepEqual(results.map((item) => item.type), ["movie", "drama", "animation", "movie"]);
});

test("seed titles are applied to the final weight score", () => {
  const pipeline = finalizeCandidatePool(
    [
      candidate({ tmdbId: 61, title: "Seed Related", reasonSeed: "김부장" }),
      candidate({ tmdbId: 62, title: "Metadata Only" }),
    ],
    {
      filters: ["country-kr", "genre-action"],
      contentTypes: ["movie"],
      seedTitles: ["김부장"],
      limit: 12,
    },
  );

  assert.equal(pipeline.results[0].title, "Seed Related");
  assert.equal(pipeline.results[0].scoreDetail.signals.titleMatch, 1);
  assert.equal(pipeline.results[1].scoreDetail.signals.titleMatch, 0);
});

test("one collection contributes at most one primary result", () => {
  const pipeline = finalizeCandidatePool(
    [
      candidate({ tmdbId: 7, title: "Series One", collectionId: 100, popularity: 10 }),
      candidate({ tmdbId: 8, title: "Series Two", collectionId: 100, popularity: 9 }),
      candidate({ tmdbId: 9, title: "Standalone", popularity: 8 }),
    ],
    { filters: ["country-kr", "genre-action"], contentTypes: ["movie"], limit: 12 },
  );

  assert.equal(pipeline.results.filter((item) => item.franchiseKey === "collection:100").length, 1);
  assert.ok(pipeline.exclusions.some((item) => item.exclusionReason === "duplicate-franchise"));
});

test("QA evaluator reports country, genre, type, and franchise failures", () => {
  const qaCase = {
    id: "pipeline-qa",
    minimumMatchRatio: 0.8,
    expected: {
      topN: 10,
      match: { country: ["KR"], genreAny: ["action"], contentType: ["movie"] },
      minimumCountryRatio: 0.8,
      minimumGenreFamilyRatio: 0.8,
      minimumContentTypeRatio: 1,
      maxSingleFranchiseCount: 1,
      forbidCrossCountryPrimary: true,
      maximumUnknownCountryRatio: 0.2,
    },
  };
  const results = [
    candidate({ tmdbId: 10, franchiseKey: "collection:200" }),
    candidate({ tmdbId: 11, franchiseKey: "collection:200", countryCodes: ["US"], resultTier: "country-relaxed" }),
  ];
  const report = evaluateRecommendationCase(qaCase, results);

  assert.equal(report.pass, false);
  assert.ok(report.failedReasons.includes("country-ratio-below-threshold"));
  assert.ok(report.failedReasons.includes("foreign-result-in-primary"));
  assert.ok(report.failedReasons.includes("franchise-dominance"));
});

test("movie and TV country metadata normalize to the same ISO contract", () => {
  assert.deepEqual(
    normalizedCountryCodes({ production_countries: [{ iso_3166_1: "KR" }] }),
    ["KR"],
  );
  assert.deepEqual(normalizedCountryCodes({ origin_country: ["JP"] }), ["JP"]);
});

test("SF and SF fantasy keep distinct movie semantics", () => {
  const fantasyOnly = candidate({ genreIds: [14] });

  assert.equal(candidateGenreMatches(fantasyOnly, ["genre-sf"]), false);
  assert.equal(candidateGenreMatches(fantasyOnly, ["genre-sf-fantasy"]), true);
});

test("QA dataset contains the Sprint 9 candidate integrity contract", async () => {
  const datasetUrl = new URL("../../../../docs/project/recommendation-qa-dataset.json", import.meta.url);
  const dataset = JSON.parse(await readFile(datasetUrl, "utf8"));
  const requiredCaseIds = [
    "REC-QA-001",
    "REC-QA-002",
    "REC-QA-003",
    "REC-QA-004",
    "REC-QA-005",
    "REC-QA-006",
    "REC-QA-007",
    "REC-QA-013",
    "REC-QA-014",
    "REC-QA-015",
  ];
  const addedCaseIds = ["REC-QA-016", "REC-QA-017", "REC-QA-018", "REC-QA-019", "REC-QA-020"];

  assert.ok(dataset.length >= 20);
  for (const caseId of requiredCaseIds) {
    const qaCase = dataset.find((item) => item.id === caseId);
    assert.ok(qaCase, `${caseId} must exist`);
    assert.equal(qaCase.expected.forbidCrossCountryPrimary, true);
    assert.equal(qaCase.expected.maxSingleFranchiseCount ?? 1, 1);
    assert.equal(qaCase.expected.allowFewerAccurateResults, true);
  }
  for (const caseId of addedCaseIds) {
    assert.ok(dataset.some((item) => item.id === caseId), `${caseId} must exist`);
  }
});
