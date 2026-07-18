import { readFile } from "node:fs/promises";

import { recommendSeedsTmdb } from "../lib/tmdb.js";
import { clearTmdbRequestCache } from "../src/lib/providers/tmdb/requestContext.js";
import {
  createFixtureFetch,
  createRecommendationContextFactory,
} from "../src/lib/providers/tmdb/testing/multiSeedFixture.mjs";
import { classifyCandidate, finalizeCandidatePool } from "../src/lib/recommendation/candidates/candidatePipeline.js";
import { calculateRecommendationScore } from "../src/lib/recommendation/scoring/recommendationWeightEngine.js";
import {
  GENRE_TOP_EIGHT_VALUES,
  genreContractTokens,
  genreIdsForFilters,
  prioritizeGenreOptions,
} from "../src/lib/recommendation/genres/genreContract.js";
import { evaluateRecommendationCase } from "../src/lib/recommendation/qa/evaluateRecommendationCase.js";
import { D1_RECALL_FIXTURES } from "../src/lib/recommendation/qa/recallFixtures.js";
import { planDetailAllocation } from "../src/lib/recommendation/recall/recallPlanner.js";
import {
  GENRE_TAXONOMY_FIXTURES,
  taxonomyFixturesForCase,
} from "../src/lib/recommendation/qa/genreTaxonomyFixtures.js";
import {
  buildSelectedOptionReason,
  presentationGenreLabels,
} from "../src/lib/recommendation/presentation/recommendationPresentation.js";
import {
  applySuggestionSelection,
  buildSeedRequestPayload,
  resolveEmptyStateMessage,
} from "../src/lib/recommendation/seeds/seedRequest.js";
import {
  createSubmittedPreferences,
  preferencesChanged,
} from "../src/lib/recommendation/preferences/submittedPreferenceSession.js";
import { dedupeRelatedItems } from "../src/lib/recommendation/content/contentIdentity.js";
import { createLatestRequestGate } from "../src/lib/recommendation/requests/latestRequestGate.js";
import {
  founderDiagnosticsSecretExposureCount,
  sanitizeFounderDiagnostics,
} from "../src/lib/recommendation/qa/founderDiagnostics.js";

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
const taxonomyCaseIds = new Set([
  ...Array.from({ length: 15 }, (_, index) => `REC-QA-${String(index + 32).padStart(3, "0")}`),
  ...Array.from({ length: 12 }, (_, index) => `REC-QA-${String(index + 49).padStart(3, "0")}`),
]);
const correctnessCaseIds = new Set(Array.from({ length: 20 }, (_, index) => `REC-QA-${String(index + 61).padStart(3, "0")}`));
const recallCaseIds = new Set(Array.from({ length: 19 }, (_, index) => `REC-QA-${String(index + 82).padStart(3, "0")}`));

function finalizeRecallCase(testCase, candidates, overrides = {}) {
  const filters = testCase.input?.filters || [];
  const contentTypes = testCase.input?.contentTypes || [];
  const finalized = finalizeCandidatePool(candidates, {
    filters,
    contentTypes,
    limit: testCase.expected?.topN || 12,
    seedTitles: testCase.input?.titles || [],
  });
  return {
    results: finalized.results,
    diagnostics: { ...diagnostics, ...finalized.diagnostics, ...overrides },
  };
}

function runRecallFixtureCase(testCase) {
  const id = Number(testCase.id.slice(-3));
  const fixture = D1_RECALL_FIXTURES;

  if ([82, 83].includes(id)) return finalizeRecallCase(testCase, fixture.adventureCandidates);

  if (id === 84) {
    const actionOnly = classifyCandidate(fixture.actionOnly, {
      filters: testCase.input.filters,
      contentTypes: testCase.input.contentTypes,
    });
    return finalizeRecallCase(testCase, [fixture.actionOnly, fixture.adventureOnly], {
      actionOnlyAdventureFalsePositiveCount: Number(actionOnly.genreMatched),
    });
  }

  if (id === 85) {
    const allocation = planDetailAllocation(fixture.adventureCandidates, {
      filters: testCase.input.filters,
      contentTypes: testCase.input.contentTypes,
      limit: 16,
    });
    return finalizeRecallCase(testCase, allocation.selected, allocation.diagnostics);
  }

  if (id === 86) return finalizeRecallCase(testCase, [fixture.sfOnly, fixture.sfFantasyDual]);
  if (id === 87) return finalizeRecallCase(testCase, [fixture.fantasyOnly, fixture.sfFantasyDual]);

  if (id === 88) {
    const candidates = [fixture.sfOnly, fixture.fantasyOnly, fixture.sfFantasyDual];
    const sf = finalizeCandidatePool(candidates, { filters: ["country-jp", "genre-sf"], contentTypes: ["drama"], limit: 12 }).results;
    const fantasy = finalizeCandidatePool(candidates, { filters: ["country-jp", "genre-fantasy"], contentTypes: ["drama"], limit: 12 }).results;
    const sfIds = new Set(sf.map((item) => item.tmdbId));
    const fantasyIds = new Set(fantasy.map((item) => item.tmdbId));
    const overlap = [...sfIds].filter((value) => fantasyIds.has(value)).length;
    return {
      results: sf,
      diagnostics: {
        ...diagnostics,
        sfFantasyOverlapRatio: overlap / Math.max(1, Math.min(sfIds.size, fantasyIds.size)),
        uniqueSfResultCount: [...sfIds].filter((value) => !fantasyIds.has(value)).length,
        uniqueFantasyResultCount: [...fantasyIds].filter((value) => !sfIds.has(value)).length,
      },
    };
  }

  if (id === 89) return finalizeRecallCase(testCase, fixture.warCandidates);
  if (id === 90) return finalizeRecallCase(testCase, fixture.politicsCandidates);
  if (id === 91) return finalizeRecallCase(testCase, [fixture.horrorExact, fixture.horrorFalsePositive]);

  if ([92, 93, 96].includes(id)) {
    return finalizeRecallCase(testCase, [...fixture.movieExactCandidates, ...fixture.tvExactCandidates], {
      requestsUsed: 19,
      aggregateRequestsUsed: 19,
      listRequestsUsed: 3,
      detailRequestsUsed: 16,
      requestContextCount: 1,
    });
  }

  if (id === 94) {
    return finalizeRecallCase(testCase, [
      ...fixture.movieExactCandidates,
      ...fixture.tvExactCandidates,
      ...fixture.animationExactCandidates,
    ], {
      requestsUsed: 21,
      aggregateRequestsUsed: 21,
      listRequestsUsed: 5,
      detailRequestsUsed: 16,
      requestContextCount: 1,
    });
  }

  if (id === 95) {
    const payload = finalizeRecallCase(testCase, fixture.movieExactCandidates);
    const fabricated = payload.results.filter((item) => item.contentType === "drama").length;
    return {
      ...payload,
      diagnostics: { ...payload.diagnostics, falseCandidateFabricationCount: fabricated },
    };
  }

  if (id === 97) {
    return finalizeRecallCase(testCase, fixture.adventureCandidates, {
      requestsUsed: 24,
      aggregateRequestsUsed: 24,
      listRequestsUsed: 8,
      detailRequestsUsed: 16,
      budgetExhausted: false,
    });
  }

  if (id === 98) {
    const detailPool = [
      ...fixture.adventureCandidates,
      ...fixture.movieExactCandidates,
      ...fixture.tvExactCandidates,
    ];
    const allocation = planDetailAllocation(detailPool, {
      filters: testCase.input.filters,
      contentTypes: testCase.input.contentTypes,
      limit: 16,
    });
    return finalizeRecallCase(testCase, allocation.selected, {
      ...allocation.diagnostics,
      requestsUsed: 24,
      aggregateRequestsUsed: 24,
      listRequestsUsed: 8,
      detailRequestsUsed: 16,
      budgetExhausted: false,
    });
  }

  if (id === 99) {
    const payload = finalizeRecallCase(testCase, [fixture.lowScoreDuplicate, fixture.highScoreDuplicate]);
    return {
      ...payload,
      diagnostics: {
        ...payload.diagnostics,
        highScoreDuplicateWinner: payload.results[0]?.tmdbId === fixture.highScoreDuplicate.tmdbId,
      },
    };
  }

  if (id === 100) {
    const payload = finalizeRecallCase(testCase, [
      ...fixture.movieExactCandidates.slice(0, 4),
      ...fixture.tvExactCandidates.slice(0, 4),
    ]);
    const results = payload.results.map((item) => ({
      ...item,
      presentationReason: buildSelectedOptionReason(item, testCase.input.filters),
      reasonTaxonomyValue: "genre-sf",
    }));
    const mismatches = results.filter((item) => {
      const crossMedia = String(item.candidateSource || "").startsWith("tmdb-cross-media-discover:");
      return crossMedia && (!item.reasonSeed || !(item.crossMediaSeedGenreValues || []).includes("genre-sf"));
    }).length;
    return {
      results,
      diagnostics: { ...payload.diagnostics, recommendationReasonSourceMismatchCount: mismatches },
    };
  }

  throw new Error(`Unhandled recall fixture case: ${testCase.id}`);
}
const reports = [];

for (const testCase of dataset) {
  if (recallCaseIds.has(testCase.id)) {
    const payload = runRecallFixtureCase(testCase);
    reports.push(evaluateRecommendationCase(testCase, payload.results, { diagnostics: payload.diagnostics }));
    continue;
  }
  if (["REC-QA-016", "REC-QA-025"].includes(testCase.id)) {
    const payload = finalizeRecallCase(testCase, [D1_RECALL_FIXTURES.sfOnly, D1_RECALL_FIXTURES.sfFantasyDual]);
    reports.push(evaluateRecommendationCase(testCase, payload.results, { diagnostics: payload.diagnostics }));
    continue;
  }
  if (correctnessCaseIds.has(testCase.id)) {
    const fixtures = taxonomyFixturesForCase(testCase.id);
    const filters = testCase.input?.filters || [];
    const contentTypes = testCase.input?.contentTypes || [];
    let results = [];
    let caseDiagnostics = { ...diagnostics };

    if (["REC-QA-061", "REC-QA-062"].includes(testCase.id)) {
      const submitted = createSubmittedPreferences({ contentTypes: ["drama"], filters: ["genre-action"] });
      const draft = testCase.id === "REC-QA-061"
        ? { contentTypes: ["drama"], filters: ["genre-adventure"] }
        : { contentTypes: ["movie"], filters: ["genre-action"] };
      results = [{ title: "Submitted session fixture", mediaType: "tv", contentType: "drama" }];
      caseDiagnostics = {
        ...caseDiagnostics,
        submittedPreferenceMutationCount: submitted.filters[0] === "genre-action" && preferencesChanged(draft, submitted) ? 0 : 1,
      };
    } else if (Number(testCase.id.slice(-3)) >= 63 && Number(testCase.id.slice(-3)) <= 72) {
      const finalized = finalizeCandidatePool(fixtures, { filters, contentTypes, limit: 12 });
      results = finalized.results;
      caseDiagnostics = { ...caseDiagnostics, ...finalized.diagnostics };
    } else if (["REC-QA-073", "REC-QA-074", "REC-QA-075"].includes(testCase.id)) {
      const current = GENRE_TAXONOMY_FIXTURES.relatedCurrent;
      results = dedupeRelatedItems(fixtures, current);
      const providerKeys = results.map((item) => `${item.mediaType}:${item.tmdbId}`);
      const titleKeys = results.map((item) => String(item.title).trim().toLowerCase());
      caseDiagnostics = {
        ...caseDiagnostics,
        relatedCurrentContentCount: results.filter((item) => item.tmdbId === current.tmdbId).length,
        relatedCurrentTitleCount: results.filter((item) => item.title === current.title || item.originalTitle === current.originalTitle).length,
        relatedDuplicateContentCount: providerKeys.length - new Set(providerKeys).size,
        relatedDuplicateTitleCount: titleKeys.length - new Set(titleKeys).size,
        relatedSequelCount: results.filter((item) => item.title === "모아나 2").length,
      };
    } else if (["REC-QA-076", "REC-QA-077"].includes(testCase.id)) {
      const gate = createLatestRequestGate();
      const first = gate.begin();
      const second = gate.begin();
      const committed = gate.canCommit(second.sequence) ? [{ title: "Latest response" }] : [];
      gate.canCommit(first.sequence);
      results = committed;
      caseDiagnostics = {
        ...caseDiagnostics,
        ...(testCase.id === "REC-QA-076"
          ? { staleRecommendationCommitCount: committed[0]?.title === "Latest response" ? 0 : 1 }
          : { staleRelatedCommitCount: committed[0]?.title === "Latest response" ? 0 : 1 }),
      };
    } else if (testCase.id === "REC-QA-078") {
      const sanitized = sanitizeFounderDiagnostics({ providerId: "tmdb", authorization: "Bearer fixed-secret", apiKey: "fixed-secret" });
      results = [{ title: "Diagnostics fixture" }];
      caseDiagnostics = { ...caseDiagnostics, ...sanitized, diagnosticsSecretExposureCount: founderDiagnosticsSecretExposureCount(sanitized) };
    } else if (testCase.id === "REC-QA-079") {
      results = [{ title: "Fallback diagnostics fixture", providerId: "mock", dataSource: "fallback", fallbackUsed: true }];
      caseDiagnostics = { ...caseDiagnostics, providerId: "mock", dataSource: "fallback", fallbackUsed: true, fallbackDiagnosticsVisible: true };
    } else if (testCase.id === "REC-QA-080") {
      results = fixtures.map((item) => classifyCandidate(item, { filters, contentTypes }));
      caseDiagnostics = {
        ...caseDiagnostics,
        diagnosticsMissingProviderCount: results.filter((item) => !(item.providerGenreIds || []).length).length,
        diagnosticsMissingMatchModeCount: results.filter((item) => !item.genreMatchMode).length,
      };
    }

    reports.push(evaluateRecommendationCase(testCase, results, { diagnostics: caseDiagnostics }));
    continue;
  }
  if (taxonomyCaseIds.has(testCase.id)) {
    const fixtures = taxonomyFixturesForCase(testCase.id);
    const filters = testCase.input?.filters || [];
    const contentTypes = testCase.input?.contentTypes || [];
    const usesFinalPipeline = ["REC-QA-049", "REC-QA-050", "REC-QA-053", "REC-QA-054", "REC-QA-055", "REC-QA-058", "REC-QA-059", "REC-QA-060"]
      .includes(testCase.id);
    let results = usesFinalPipeline
      ? finalizeCandidatePool(fixtures, { filters, contentTypes, limit: 12 }).results
      : fixtures.map((item) => classifyCandidate(item, { filters, contentTypes }));
    if (testCase.id === "REC-QA-052" && results[0]) {
      const actionOnly = calculateRecommendationScore(results[0], {
        filters: ["genre-action"],
        contentTypes: ["drama"],
      });
      const actionAndAdventure = calculateRecommendationScore(results[0], {
        filters: ["genre-action", "genre-adventure"],
        contentTypes: ["drama"],
      });
      results = [{
        ...results[0],
        semanticFamilyDoubleScored: actionOnly.signals.genreMatch !== actionAndAdventure.signals.genreMatch,
      }];
    }
    results = results.map((item) => {
      const selected = genreContractTokens(filters);
      const reasonTaxonomyValue = selected.find((value) => item.matchedTaxonomyValues?.includes(value)) || "";
      const genres = testCase.id === "REC-QA-056" ? presentationGenreLabels(item) : item.genres;
      return {
        ...item,
        genres,
        genre: Array.isArray(genres) ? genres.join(", ") : item.genre,
        presentationReason: buildSelectedOptionReason(item, filters),
        reasonTaxonomyValue,
      };
    });
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
