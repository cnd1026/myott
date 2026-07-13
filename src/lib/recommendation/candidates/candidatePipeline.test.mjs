import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  candidateGenreMatches,
  finalizeCandidatePool,
  normalizedCountryCodes,
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

test("same-country genre relaxation stays behind exact candidates", () => {
  const pipeline = finalizeCandidatePool(
    [
      candidate({ tmdbId: 3, title: "Korean Drama", genreIds: [18], popularity: 999 }),
      candidate({ tmdbId: 4, title: "Korean Action", genreIds: [28], popularity: 1 }),
    ],
    { filters: ["country-kr", "genre-action"], contentTypes: ["movie"], limit: 12 },
  );

  assert.deepEqual(pipeline.results.map((item) => item.resultTier), ["exact", "same-country-relaxed"]);
  assert.deepEqual(pipeline.results.map((item) => item.title), ["Korean Action", "Korean Drama"]);
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
  assert.equal(pipeline.results[1].resultTier, "same-country-relaxed");
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

  assert.ok(dataset.length >= 15);
  for (const caseId of requiredCaseIds) {
    const qaCase = dataset.find((item) => item.id === caseId);
    assert.ok(qaCase, `${caseId} must exist`);
    assert.equal(qaCase.expected.forbidCrossCountryPrimary, true);
    assert.equal(qaCase.expected.maxSingleFranchiseCount ?? 1, 1);
    assert.equal(qaCase.expected.allowFewerAccurateResults, true);
  }
});
