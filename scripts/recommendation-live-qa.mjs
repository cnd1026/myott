import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";

import { tmdbProvider } from "../src/lib/providers/tmdb/provider.js";
import { evaluateRecommendationCase } from "../src/lib/recommendation/qa/evaluateRecommendationCase.js";

if (!tmdbProvider.isEnabled()) {
  console.log("SKIP Live TMDB Recommendation QA: TMDB_API_KEY/TMDB_ACCESS_TOKEN is not configured.");
  process.exit(0);
}

const dataset = JSON.parse(
  await readFile(new URL("../docs/project/recommendation-qa-dataset.json", import.meta.url), "utf8"),
);
const liveCases = dataset.filter((testCase) => testCase.scope?.includes("tmdb"));
const output = [];
let hasFailure = false;

function normalizedTitle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s.!?。！？]+$/g, "");
}

function mergeSeedPayloads(payloads, seedTitles, limit = 12) {
  const excludedTitles = new Set(seedTitles.map(normalizedTitle));
  const groups = payloads.map((payload) => payload.results || []);
  const seen = new Set();
  const results = [];
  let cursor = 0;

  while (results.length < limit) {
    let added = false;
    for (const group of groups) {
      const item = group[cursor];
      if (!item) continue;
      added = true;
      const itemTitles = [item.title, item.originalTitle].map(normalizedTitle);
      if (itemTitles.some((title) => excludedTitles.has(title))) continue;
      const key = `${item.mediaType || item.type}:${item.tmdbId || item.providerContentId || item.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(item);
      if (results.length >= limit) break;
    }
    if (!added) break;
    cursor += 1;
  }

  const diagnostics = payloads.map((payload) => payload.diagnostics || {});
  return {
    results,
    diagnostics: {
      requestsUsed: Math.max(0, ...diagnostics.map((item) => Number(item.requestsUsed || 0))),
      aggregateRequestsUsed: diagnostics.reduce((sum, item) => sum + Number(item.requestsUsed || 0), 0),
      listRequestsUsed: Math.max(0, ...diagnostics.map((item) => Number(item.listRequestsUsed || 0))),
      detailRequestsUsed: Math.max(0, ...diagnostics.map((item) => Number(item.detailRequestsUsed || 0))),
      cacheHits: diagnostics.reduce((sum, item) => sum + Number(item.cacheHits || 0), 0),
      retryCount: diagnostics.reduce((sum, item) => sum + Number(item.retryCount || 0), 0),
      budgetExhausted: diagnostics.some((item) => item.budgetExhausted),
    },
  };
}

for (const testCase of liveCases) {
  const input = testCase.input || {};
  let payload;
  if (input.titles?.length) {
    const seedPayloads = [];
    for (const query of input.titles) {
      seedPayloads.push(await tmdbProvider.search({
        query,
        seedTitles: input.titles,
        filters: input.filters || [],
        contentTypes: input.contentTypes || [],
      }));
    }
    payload = mergeSeedPayloads(seedPayloads, input.titles);
  } else {
    payload = await tmdbProvider.getRecommendations({
        filters: input.filters || [],
        contentTypes: input.contentTypes || [],
        limit: 12,
      });
  }
  const results = payload.results || [];
  const report = evaluateRecommendationCase(testCase, results, { diagnostics: payload.diagnostics || {} });
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
      genreIds: item.genreIds || [],
      contentType: item.contentType || item.type,
      resultTier: item.resultTier,
      franchiseKey: item.franchiseKey || "",
    })),
  };
  output.push(caseOutput);
  const requestSummary = {
    requestsUsed: caseOutput.diagnostics.requestsUsed,
    listRequestsUsed: caseOutput.diagnostics.listRequestsUsed,
    detailRequestsUsed: caseOutput.diagnostics.detailRequestsUsed,
    cacheHits: caseOutput.diagnostics.cacheHits,
    retryCount: caseOutput.diagnostics.retryCount,
    budgetExhausted: caseOutput.diagnostics.budgetExhausted,
  };
  console.log(
    `${report.pass ? "PASS" : "FAIL"} ${testCase.id} ` +
      `${results.length} results; requests=${requestSummary.requestsUsed ?? 0}; ` +
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
console.log(`Live TMDB Recommendation QA: ${output.length - failures.length}/${output.length} passed.`);
if (failures.length) console.log(`Failed cases: ${failures.map((item) => item.caseId).join(", ")}`);
if (hasFailure) process.exitCode = 1;
