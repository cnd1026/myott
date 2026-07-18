import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateCrossMediaSeedRelationship,
  planSeedDiscoverSupplementEvidence,
} from "../../../../lib/tmdb.js";
import { finalizeCandidatePool } from "../candidates/candidatePipeline.js";
import { candidateGenreMatchDetail } from "../genres/genreContract.js";
import { D1_RECALL_FIXTURES } from "../qa/recallFixtures.js";
import {
  assembleBalancedExactResults,
  classifyRecallAvailability,
  contentTypeCounts,
  minimumTypeCoverage,
  planAdaptiveDiscoverTasks,
  planCrossMediaTargets,
  planDetailAllocation,
  providerMediaTypeCounts,
  reserveTypeCoverage,
  shouldStopRecall,
  typeCoverageState,
} from "./recallPlanner.js";

const fixtures = D1_RECALL_FIXTURES;

test("two-type and three-type coverage use the documented minimums", () => {
  assert.equal(minimumTypeCoverage(["movie", "drama"]), 3);
  assert.equal(minimumTypeCoverage(["movie", "drama", "animation"]), 2);
  assert.equal(typeCoverageState({ movie: 12, drama: 0 }, ["movie", "drama"]).covered, false);
  assert.equal(typeCoverageState({ movie: 8, drama: 4 }, ["movie", "drama"]).covered, true);
});

test("initial discover planning reserves a request for every selected type", () => {
  const tasks = ["movie", "drama", "animation"].map((contentType) => ({ request: { contentType } }));
  const planned = planAdaptiveDiscoverTasks(tasks, {
    countsByType: {},
    contentTypes: ["movie", "drama", "animation"],
    remainingListBudget: 3,
    initialStage: true,
  });
  assert.deepEqual(new Set(planned.map((task) => task.request.contentType)), new Set(["movie", "drama", "animation"]));
});

test("later discover planning gives the missing type first use of list budget", () => {
  const tasks = ["movie", "drama"].map((contentType) => ({ request: { contentType } }));
  const [planned] = planAdaptiveDiscoverTasks(tasks, {
    countsByType: { movie: 20, drama: 0 },
    contentTypes: ["movie", "drama"],
    remainingListBudget: 1,
  });
  assert.equal(planned.request.contentType, "drama");
});

test("detail allocation cannot be monopolized by the first media type", () => {
  const ordered = [...fixtures.movieExactCandidates, ...fixtures.tvExactCandidates];
  const allocation = planDetailAllocation(ordered, {
    contentTypes: ["movie", "drama"],
    limit: 16,
  });
  assert.deepEqual(contentTypeCounts(allocation.selected), { movie: 8, drama: 8, animation: 0 });
  assert.equal(allocation.diagnostics.detailSelectedCount, 16);
});

test("detail allocation round-robins request sources inside one semantic family", () => {
  const candidates = [
    ...fixtures.tvExactCandidates.slice(0, 6).map((item) => ({ ...item, candidateSource: "popularity-page-1" })),
    ...fixtures.tvExactCandidates.slice(0, 6).map((item, index) => ({ ...item, tmdbId: item.tmdbId + 100, candidateSource: "rating-page-1", title: `${item.title} rating ${index}` })),
    ...fixtures.tvExactCandidates.slice(0, 6).map((item, index) => ({ ...item, tmdbId: item.tmdbId + 200, candidateSource: "popularity-page-2", title: `${item.title} page2 ${index}` })),
  ];
  const allocation = planDetailAllocation(candidates, {
    filters: ["genre-sf"],
    contentTypes: ["drama"],
    limit: 9,
  });
  const sources = contentTypeCounts(allocation.selected);
  assert.equal(sources.drama, 9);
  assert.equal(new Set(allocation.selected.map((item) => item.candidateSource)).size, 3);
});
test("detail allocation returns to global priority after one opportunity per source", () => {
  const sources = ["popularity-page-1", "rating-page-1", "popularity-page-2"];
  const candidates = sources.flatMap((candidateSource, sourceIndex) => (
    fixtures.tvExactCandidates.slice(sourceIndex * 3, sourceIndex * 3 + 3).map((item, index) => ({
      ...item,
      tmdbId: item.tmdbId + sourceIndex * 1000,
      title: `${item.title} source ${sourceIndex} item ${index}`,
      candidateSource,
    }))
  ));
  const allocation = planDetailAllocation(candidates, {
    filters: ["genre-sf"],
    contentTypes: ["drama"],
    limit: 5,
  });
  assert.deepEqual(
    allocation.selected.map((item) => item.candidateSource),
    ["popularity-page-1", "rating-page-1", "popularity-page-2", "popularity-page-1", "popularity-page-1"],
  );
});

test("two-type final reservation prevents a twelve-to-zero result", () => {
  const selected = reserveTypeCoverage(
    [...fixtures.movieExactCandidates, ...fixtures.tvExactCandidates],
    ["movie", "drama"],
    12,
  );
  assert.deepEqual(contentTypeCounts(selected), { movie: 8, drama: 4, animation: 0 });
});

test("three-type reservation keeps every available type represented", () => {
  const selected = reserveTypeCoverage(
    [...fixtures.movieExactCandidates, ...fixtures.tvExactCandidates, ...fixtures.animationExactCandidates],
    ["movie", "drama", "animation"],
    12,
  );
  const counts = contentTypeCounts(selected);
  assert.ok(counts.movie >= 2);
  assert.ok(counts.drama >= 2);
  assert.ok(counts.animation >= 2);
});

test("missing type pools never manufacture inaccurate candidates", () => {
  const selected = reserveTypeCoverage(fixtures.movieExactCandidates, ["movie", "drama"], 12);
  assert.deepEqual(contentTypeCounts(selected), { movie: 12, drama: 0, animation: 0 });
});

function seedCandidate(item, {
  reasonSeeds = [],
  seedCount = reasonSeeds.length,
} = {}) {
  return { ...item, reasonSeeds, seedCount };
}

test("three seeds with movie and drama pools retain global type coverage", () => {
  const rankedItems = ["A", "B", "C"].flatMap((seed, seedIndex) => [
    ...fixtures.movieExactCandidates.slice(seedIndex * 4, seedIndex * 4 + 4)
      .map((item) => seedCandidate(item, { reasonSeeds: ["Seed " + seed] })),
    ...fixtures.tvExactCandidates.slice(seedIndex * 4, seedIndex * 4 + 4)
      .map((item) => seedCandidate(item, { reasonSeeds: ["Seed " + seed] })),
  ]);
  const assembled = assembleBalancedExactResults({
    rankedItems,
    seedTitles: ["Seed A", "Seed B", "Seed C"],
    contentTypes: ["movie", "drama"],
    limit: 12,
  });
  const counts = contentTypeCounts(assembled.selected);
  assert.ok(counts.movie >= 3);
  assert.ok(counts.drama >= 3);
});

test("multi-seed common candidates cannot starve an available content type", () => {
  const rankedItems = [
    ...fixtures.movieExactCandidates.slice(0, 12).map((item) => seedCandidate(item, {
      reasonSeeds: ["Seed A", "Seed B", "Seed C"],
    })),
    ...fixtures.tvExactCandidates.slice(0, 6).map((item, index) => seedCandidate(item, {
      reasonSeeds: [`Seed ${String.fromCharCode(65 + (index % 3))}`],
    })),
  ];
  const assembled = assembleBalancedExactResults({
    rankedItems,
    seedTitles: ["Seed A", "Seed B", "Seed C"],
    contentTypes: ["movie", "drama"],
    limit: 12,
  });
  assert.ok(contentTypeCounts(assembled.selected).drama >= 4);
  assert.equal(assembled.selected.length, 12);
});

test("final candidate assembly applies global type coverage after multi-seed merging", () => {
  const candidates = [
    ...fixtures.movieExactCandidates.slice(0, 12).map((item) => seedCandidate(item, {
      reasonSeeds: ["Seed A", "Seed B", "Seed C"],
    })),
    ...fixtures.tvExactCandidates.slice(0, 6).map((item) => seedCandidate(item, {
      reasonSeeds: ["Seed A"],
    })),
  ];
  const finalized = finalizeCandidatePool(candidates, {
    seedTitles: ["Seed A", "Seed B", "Seed C"],
    contentTypes: ["movie", "drama"],
    limit: 12,
  });
  assert.ok(finalized.diagnostics.selectedExactByType.drama >= 4);
  assert.equal(finalized.diagnostics.seedRepresentationShortfall.length, 0);
});

test("global allocator never manufactures a missing selected type", () => {
  const assembled = assembleBalancedExactResults({
    rankedItems: fixtures.movieExactCandidates,
    seedTitles: ["Seed A", "Seed B", "Seed C"],
    contentTypes: ["movie", "drama"],
    limit: 12,
  });
  assert.deepEqual(contentTypeCounts(assembled.selected), { movie: 12, drama: 0, animation: 0 });
});

test("global allocator preserves three-type coverage across three seeds", () => {
  const rankedItems = [
    ...fixtures.movieExactCandidates.slice(0, 4).map((item) => seedCandidate(item, { reasonSeeds: ["Seed A"] })),
    ...fixtures.tvExactCandidates.slice(0, 4).map((item) => seedCandidate(item, { reasonSeeds: ["Seed B"] })),
    ...fixtures.animationExactCandidates.slice(0, 4).map((item) => seedCandidate(item, { reasonSeeds: ["Seed C"] })),
  ];
  const assembled = assembleBalancedExactResults({
    rankedItems,
    seedTitles: ["Seed A", "Seed B", "Seed C"],
    contentTypes: ["movie", "drama", "animation"],
    limit: 12,
  });
  const counts = contentTypeCounts(assembled.selected);
  assert.ok(counts.movie >= 2);
  assert.ok(counts.drama >= 2);
  assert.ok(counts.animation >= 2);
  assert.equal(assembled.diagnostics.seedRepresentationShortfall.length, 0);
});

test("one candidate can satisfy seed and type reservation without consuming two slots", () => {
  const shared = seedCandidate(fixtures.tvExactCandidates[0], { reasonSeeds: ["Seed A", "Seed B"] });
  const assembled = assembleBalancedExactResults({
    rankedItems: [shared, ...fixtures.movieExactCandidates.slice(0, 8), ...fixtures.tvExactCandidates.slice(1, 5)],
    seedTitles: ["Seed A", "Seed B"],
    contentTypes: ["movie", "drama"],
    limit: 12,
  });
  assert.equal(assembled.selected.filter((item) => item === shared).length, 1);
  assert.equal(new Set(assembled.selected).size, assembled.selected.length);
  assert.equal(assembled.diagnostics.seedRepresentationShortfall.length, 0);
});

test("early stop requires exact count and requested type coverage", () => {
  assert.equal(shouldStopRecall({
    exactCount: 12,
    exactTarget: 12,
    countsByType: { movie: 12, drama: 0 },
    contentTypes: ["movie", "drama"],
  }), false);
  assert.equal(shouldStopRecall({
    exactCount: 12,
    exactTarget: 12,
    countsByType: { movie: 8, drama: 4 },
    contentTypes: ["movie", "drama"],
  }), true);
});

test("cross-media planning prioritizes a requested type absent from direct seed results", () => {
  assert.deepEqual(planCrossMediaTargets({
    seedContentType: "movie",
    contentTypes: ["movie", "drama"],
    exactCountsByType: { movie: 12, drama: 0 },
  }), ["drama"]);
});

test("selected genre narrows but never replaces transferable seed evidence", () => {
  const plan = planSeedDiscoverSupplementEvidence({
    seedGenreIds: [878],
    selectedGenreValues: ["genre-romance"],
    targetMediaType: "tv",
    crossMedia: true,
  });
  assert.deepEqual(plan.crossMediaSeedTransferValues, ["genre-sf"]);
  assert.deepEqual(plan.crossMediaSelectedGenreValues, ["genre-romance"]);
  assert.match(plan.genreParam, /10765/);
  assert.match(plan.genreParam, /18/);
  assert.equal(plan.skipReason, "");
});

test("cross-media planning skips before a request when seed transfer is unavailable", () => {
  const plan = planSeedDiscoverSupplementEvidence({
    seedGenreIds: [999999],
    selectedGenreValues: ["genre-romance"],
    targetMediaType: "tv",
    crossMedia: true,
  });
  assert.equal(plan.requestIssued, false);
  assert.equal(plan.skipReason, "cross-media-seed-transfer-unavailable");
  assert.equal(plan.genreParam, "");
});

test("cross-media candidates must satisfy seed and selected genre contracts", () => {
  const sfAndSf = evaluateCrossMediaSeedRelationship({
    ...fixtures.sfOnly,
    crossMediaSeedTransferValues: ["genre-sf"],
    crossMediaSelectedGenreValues: ["genre-sf"],
  });
  assert.equal(sfAndSf.passed, true);

  const sfAndRomance = evaluateCrossMediaSeedRelationship({
    ...fixtures.sfOnly,
    crossMediaSeedTransferValues: ["genre-sf"],
    crossMediaSelectedGenreValues: ["genre-romance"],
  });
  assert.equal(sfAndRomance.seedRelationshipPassed, true);
  assert.equal(sfAndRomance.selectedPreferencePassed, false);
  assert.equal(sfAndRomance.passed, false);
});

test("provider media diagnostics stay separate from display content types", () => {
  const items = [
    { mediaType: "movie", type: "movie" },
    { mediaType: "movie", type: "animation" },
    { mediaType: "tv", type: "drama" },
    { mediaType: "tv", type: "animation" },
  ];
  assert.deepEqual(providerMediaTypeCounts(items), { movie: 2, tv: 2 });
  assert.deepEqual(contentTypeCounts(items), { movie: 1, drama: 1, animation: 2 });
});

test("SF and Fantasy shared provider evidence does not create automatic overlap", () => {
  assert.equal(candidateGenreMatchDetail(fixtures.sfOnly, ["genre-sf"]).genreMatched, true);
  assert.equal(candidateGenreMatchDetail(fixtures.sfOnly, ["genre-fantasy"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail(fixtures.fantasyOnly, ["genre-fantasy"]).genreMatched, true);
  assert.equal(candidateGenreMatchDetail(fixtures.fantasyOnly, ["genre-sf"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail(fixtures.sfFantasyDual, ["genre-sf"]).genreMatched, true);
  assert.equal(candidateGenreMatchDetail(fixtures.sfFantasyDual, ["genre-fantasy"]).genreMatched, true);
});

test("Action-only provider evidence is not recycled as Adventure", () => {
  assert.equal(candidateGenreMatchDetail(fixtures.actionOnly, ["genre-action"]).genreMatched, true);
  assert.equal(candidateGenreMatchDetail(fixtures.actionOnly, ["genre-adventure"]).genreMatched, false);
});

test("higher-scored duplicate wins before display-title deduplication", () => {
  const finalized = finalizeCandidatePool([
    fixtures.lowScoreDuplicate,
    fixtures.highScoreDuplicate,
  ], {
    filters: ["genre-sf"],
    contentTypes: ["movie"],
    limit: 12,
  });
  assert.equal(finalized.results.length, 1);
  assert.equal(finalized.results[0].tmdbId, fixtures.highScoreDuplicate.tmdbId);
  assert.equal(finalized.diagnostics.dedupeExclusions, 1);
});

test("scarcity classification distinguishes complete pools from unresolved detail budget", () => {
  assert.equal(classifyRecallAvailability({ providerTotal: 7, uniqueRawCount: 7, exactAvailable: 7, target: 8, detailEligibleCount: 7, detailSelectedCount: 7 }), "provider-scarcity");
  assert.equal(classifyRecallAvailability({ providerTotal: 50, uniqueRawCount: 30, exactAvailable: 7, target: 8, detailEligibleCount: 30, detailSelectedCount: 16 }), "detail-budget-unresolved");
  assert.equal(classifyRecallAvailability({ providerTotal: 50, uniqueRawCount: 30, exactAvailable: 12, target: 8, detailEligibleCount: 30, detailSelectedCount: 16 }), "sufficient");
});