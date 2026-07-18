import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";

import { tmdbProvider } from "../src/lib/providers/tmdb/provider.js";
import { clearTmdbRequestCache } from "../src/lib/providers/tmdb/requestContext.js";
import { evaluateRecommendationCase } from "../src/lib/recommendation/qa/evaluateRecommendationCase.js";

if (!tmdbProvider.isEnabled()) {
  console.log("SKIP Live TMDB Recommendation QA: TMDB_API_KEY/TMDB_BEARER_TOKEN is not configured.");
  process.exit(0);
}

const qaMode = process.argv.includes("--warm") ? "warm" : "cold";

const dataset = JSON.parse(
  await readFile(new URL("../docs/project/recommendation-qa-dataset.json", import.meta.url), "utf8"),
);
const requestedCaseIds = new Set(
  String(process.env.QA_CASES || "").split(",").map((value) => value.trim()).filter(Boolean),
);
const liveCases = dataset.filter((testCase) => (
  testCase.scope?.includes("tmdb") && (!requestedCaseIds.size || requestedCaseIds.has(testCase.id))
));
const output = [];
let hasFailure = false;

async function executeProductCase(testCase) {
  const input = testCase.input || {};
  if (input.titles?.length) {
    return tmdbProvider.getSeedRecommendations({
      titles: input.titles,
      filters: input.filters || [],
      contentTypes: input.contentTypes || [],
      limit: 12,
    });
  }
  return tmdbProvider.getRecommendations({
    filters: input.filters || [],
    contentTypes: input.contentTypes || [],
    limit: 12,
  });
}

if (qaMode === "warm") clearTmdbRequestCache();
console.log(`Live TMDB Recommendation QA mode: ${qaMode.toUpperCase()}`);

for (const testCase of liveCases) {
  if (qaMode === "cold") clearTmdbRequestCache();
  if (qaMode === "warm") await executeProductCase(testCase);
  const payload = await executeProductCase(testCase);
  const results = payload.results || [];
  const report = evaluateRecommendationCase(testCase, results, {
    diagnostics: { ...(payload.diagnostics || {}), liveQa: true },
  });
  hasFailure ||= !report.pass;
  const caseOutput = {
    caseId: testCase.id,
    pass: report.pass,
    failedReasons: report.failedReasons,
    metrics: report.metrics,
    diagnostics: payload.diagnostics || {},
    results: results.map((item) => ({
      title: item.title,
      tmdbId: item.tmdbId,
      countryCodes: item.countryCodes || [],
      providerGenreIds: item.providerGenreIds || item.genreIds || [],
      providerGenreNames: item.providerGenreNames || item.genres || [],
      genreIds: item.genreIds || [],
      canonicalGenreValues: item.canonicalGenreValues || [],
      combinedGenreValues: item.combinedGenreValues || [],
      semanticGenreValues: item.semanticGenreValues || [],
      controlledSemanticGenreValues: item.controlledSemanticGenreValues || [],
      formatValues: item.formatValues || [],
      audienceValues: item.audienceValues || [],
      styleValues: item.styleValues || [],
      semanticEvidence: item.semanticEvidenceByGenre || {},
      providerMediaType: item.providerMediaType || item.mediaType || "",
      displayContentType: item.displayContentType || item.contentType || item.type || "",
      contentType: item.contentType || item.type,
      runtimeMinutes: item.runtimeMinutes ?? item.runtime ?? null,
      actualStreamingProviderIds: item.actualStreamingProviderIds || [],
      actualStreamingProviders: item.actualStreamingProviders || [],
      watchAvailability: item.watchAvailability || {},
      hardFilterStatus: item.hardFilterStatus || {},
      exclusionReason: item.exclusionReason || "",
      resultTier: item.resultTier,
      genreMatchMode: item.genreMatchMode || "",
      semanticGenreMatched: Boolean(item.semanticGenreMatched),
      matchedTaxonomyValues: item.matchedTaxonomyValues || [],
      semanticConfidence: item.semanticConfidence || "none",
      reason: item.reason || "",
      taxonomyCategory: item.formatValues?.length
        ? "format"
        : item.audienceValues?.length
          ? "audience"
          : item.styleValues?.length
            ? "style"
            : item.combinedGenreValues?.length && !item.canonicalGenreValues?.length && !item.semanticGenreValues?.length
              ? "combined"
              : "narrative",
      franchiseKey: item.franchiseKey || "",
      reasonSeeds: item.reasonSeeds || (item.reasonSeed ? [item.reasonSeed] : []),
    })),
  };
  output.push(caseOutput);
  const requestSummary = {
    requestsUsed: caseOutput.diagnostics.requestsUsed,
    aggregateRequestsUsed: caseOutput.diagnostics.aggregateRequestsUsed,
    listRequestsUsed: caseOutput.diagnostics.listRequestsUsed,
    detailRequestsUsed: caseOutput.diagnostics.detailRequestsUsed,
    requestContextCount: caseOutput.diagnostics.requestContextCount,
    cacheHits: caseOutput.diagnostics.cacheHits,
    retryCount: caseOutput.diagnostics.retryCount,
    budgetExhausted: caseOutput.diagnostics.budgetExhausted,
    deadlineExceeded: caseOutput.diagnostics.deadlineExceeded,
    elapsedMs: caseOutput.diagnostics.elapsedMs,
    processedSeedCount: caseOutput.diagnostics.processedSeedCount,
    deferredSeedCount: caseOutput.diagnostics.deferredSeedCount,
  };
  const budgetFailure = Number(requestSummary.aggregateRequestsUsed ?? requestSummary.requestsUsed ?? 0) > 24 ||
    Number(requestSummary.listRequestsUsed || 0) > 8 ||
    Number(requestSummary.detailRequestsUsed || 0) > 16 ||
    Number(requestSummary.requestContextCount || 0) !== 1;
  if (budgetFailure) {
    hasFailure = true;
    caseOutput.pass = false;
    caseOutput.failedReasons.push("live-request-budget-contract-failed");
  }
  console.log(
    `${caseOutput.pass ? "PASS" : "FAIL"} ${testCase.id} ` +
      `${results.length} results; requests=${requestSummary.aggregateRequestsUsed ?? requestSummary.requestsUsed ?? 0}; ` +
      `${report.failedReasons.join(", ") || "criteria-met"}`,
  );
  if (process.env.QA_VERBOSE === "1") {
    console.table(caseOutput.results);
    console.log(requestSummary);
  }
}

if (process.env.QA_OUTPUT) {
  await writeFile(process.env.QA_OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Live QA JSON written to ${process.env.QA_OUTPUT}`);
}

const failures = output.filter((item) => !item.pass);
const maximumAggregateRequests = Math.max(
  0,
  ...output.map((item) => Number(item.diagnostics.aggregateRequestsUsed ?? item.diagnostics.requestsUsed ?? 0)),
);
const maximumElapsedMs = Math.max(0, ...output.map((item) => Number(item.diagnostics.elapsedMs || 0)));
const totalCacheHits = output.reduce((sum, item) => sum + Number(item.diagnostics.cacheHits || 0), 0);
if (qaMode === "warm" && totalCacheHits === 0) {
  hasFailure = true;
  console.log("FAIL warm-cache: no cache hits were recorded after priming.");
}
console.log(`Live TMDB Recommendation QA (${qaMode}): ${output.length - failures.length}/${output.length} passed.`);
console.log(
  `Live QA summary: maximumAggregateRequests=${maximumAggregateRequests}; ` +
    `maximumElapsedMs=${maximumElapsedMs}; totalCacheHits=${totalCacheHits}`,
);
if (failures.length) console.log(`Failed cases: ${failures.map((item) => item.caseId).join(", ")}`);
if (hasFailure) process.exitCode = 1;
