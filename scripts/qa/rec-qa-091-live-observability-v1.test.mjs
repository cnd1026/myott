import { strict as assert } from "node:assert";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  assertFixedInput,
  assertSafeCompatibilityEvidence,
  collectCompatibilityEvidence,
  COMPATIBILITY_EVIDENCE_STEM,
  CORRECTION_EVIDENCE_STEM,
  createSyntheticAuthorizationFixture,
  createConsumptionRecorder,
  createFixtureProductAdapter,
  createTmdbAllowlistedFetch,
  createNetworkAdapterGuard,
  FIXED_INPUT,
  parseEntrypointArguments,
  REQUEST_CONTRACT,
  RUN_MODES,
  runLiveAdapterOverrideFixtures,
  validateRequestEventPairs,
  runCompatibilitySecurityFixtures,
  runSyntheticConsumptionBoundaryFixtures,
  runPreflight,
  validateLiveAuthorization,
} from "./rec-qa-091-live-observability-v1.mjs";
import {
  summarizeTmdbObservabilityLedger,
  validateTmdbObservabilityLedger,
} from "../../src/lib/recommendation/qa/tmdbObservability.js";

let fixtureResultPromise;

async function withIsolatedOutputRoot(callback) {
  const root = await mkdtemp(join(tmpdir(), "myott-live-entrypoint-"));
  try {
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function fixtureResult() {
  fixtureResultPromise ??= withIsolatedOutputRoot((outputRoot) => collectCompatibilityEvidence({
    publish: false,
    generatedAt: "2026-08-02T00:00:00.000Z",
    outputRoot,
    evidenceStem: CORRECTION_EVIDENCE_STEM,
  }));
  return fixtureResultPromise;
}

test("preflight is offline and preserves the pinned repository state", async () => {
  await withIsolatedOutputRoot(async (root) => {
    const result = await runPreflight({ root, outputRoot: root, outputStem: "preflight-isolated" });
    assert.equal(result.status, "PASS");
    assert.equal(result.repository.branch, "main");
    assert.equal(result.repository.head, "f38b746416a13c3b2bbcac4396fee08b7c1160ea");
    assert.equal(result.repository.originMain, result.repository.head);
    assert.equal(result.repository.stagedFileCount, 0);
    assert.equal(result.networkInvocationCount, 0);
    assert.equal(result.browserRuns, 0);
    assert.equal(result.serverRuns, 0);
    assert.equal(result.cdpSessions, 0);
    assert.equal(result.portBinds, 0);
    assert.equal(result.liveTmdbRequests, 0);
    assert.equal(result.repositoryMutation, 0);
    assert.equal(result.stageCommitPush, 0);
    assert.deepEqual(await readdir(root), []);
  });
});

test("fixed input and mode guards reject mutation while exposing auth-gated live mode", () => {
  assert.deepEqual(parseEntrypointArguments(["fixture"]).input, FIXED_INPUT);
  assert.deepEqual(parseEntrypointArguments(["--mode=preflight"]).input, FIXED_INPUT);
  assert.equal(parseEntrypointArguments(["live"]).mode, "live");
  assert.equal(parseEntrypointArguments(["live", "--authorization", "future-grant.json"]).authorizationPath, "future-grant.json");
  assert.throws(
    () => parseEntrypointArguments(["live", "--adapter", "./arbitrary.mjs"]),
    (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_NETWORK_GUARD_FAILED",
  );
  assert.throws(
    () => assertFixedInput({ ...FIXED_INPUT, semanticGenre: "romance" }),
    (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_FIXED_INPUT_MISMATCH",
  );
  assert.throws(
    () => parseEntrypointArguments(["fixture", "--output", "outside.json"]),
    (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_FIXED_INPUT_MISMATCH",
  );
});

test("network adapter guard remains at zero", () => {
  const guard = createNetworkAdapterGuard();
  assert.equal(guard.invocationCount, 0);
  guard.assertZero();
  assert.throws(() => guard.invoke(), (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_NETWORK_GUARD_FAILED");
  assert.equal(guard.invocationCount, 1);
});

test("live authorization is exact, unconsumed, and future-mode only", async () => {
  const authorization = await createSyntheticAuthorizationFixture();
  const sourceHashes = {
    "scripts/qa/rec-qa-091-live-observability-v1.mjs": { sha256: authorization.entrypointSHA256 },
    "scripts/qa/rec-qa-091-live-observability-v1.test.mjs": { sha256: authorization.entrypointTestSHA256 },
  };
  const valid = validateLiveAuthorization({
    authorization,
    sourceHashes,
    outputBoundary: { destinationExists: false, stagingExists: false },
    credentialAvailable: true,
  });
  assert.equal(valid.status, "PASS");
  assert.equal(valid.consumedRuns, 0);
  assert.throws(
    () => validateLiveAuthorization({
      authorization: { ...authorization, consumedRuns: 1 },
      sourceHashes,
      outputBoundary: { destinationExists: false, stagingExists: false },
      credentialAvailable: true,
    }),
    (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED",
  );
  await withIsolatedOutputRoot(async (root) => {
    await assert.rejects(
      collectCompatibilityEvidence({
        executionMode: "live",
        publish: false,
        authorization,
        outputRoot: root,
        evidenceStem: "live-auth-test",
      }),
      (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_AUTHORIZATION_GATE_FAILED",
    );
  });
});

test("TMDB allowlist revalidates redirects and records one consumption boundary", async () => {
  const requested = [];
  let firstOutboundCount = 0;
  const fetch = createTmdbAllowlistedFetch({
    onFirstOutbound: () => { firstOutboundCount += 1; },
    fetchImpl: async (url) => {
      requested.push(url);
      if (requested.length === 1) {
        return { status: 302, headers: { get: (name) => name === "location" ? "https://api.themoviedb.org/3/discover/tv" : null } };
      }
      return { status: 200, ok: true, headers: { get: () => null }, json: async () => ({}) };
    },
  });
  const response = await fetch("https://api.themoviedb.org/3/discover/tv");
  assert.equal(response.status, 200);
  assert.equal(firstOutboundCount, 1);
  assert.equal(requested.length, 2);
  await assert.rejects(
    createTmdbAllowlistedFetch({ fetchImpl: async () => ({ status: 200 }) })("https://example.invalid/3/discover/tv"),
    (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_NETWORK_ALLOWLIST_FAILED",
  );
  await assert.rejects(
    createTmdbAllowlistedFetch({ fetchImpl: async () => ({ status: 200 }) })("https://127.0.0.1/3/discover/tv"),
    (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_NETWORK_ALLOWLIST_FAILED",
  );
  const redirectToOtherHost = createTmdbAllowlistedFetch({
    fetchImpl: async () => ({
      status: 302,
      headers: { get: () => "https://example.invalid/3/discover/tv" },
    }),
  });
  await assert.rejects(
    redirectToOtherHost("https://api.themoviedb.org/3/discover/tv"),
    (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_NETWORK_ALLOWLIST_FAILED",
  );
});

test("Live Adapter overrides are rejected before any Adapter or consumption boundary", () => {
  const fixtures = runLiveAdapterOverrideFixtures();
  assert.equal(fixtures.status, "PASS");
  assert.equal(fixtures.total, 5);
  assert.equal(fixtures.adapterInvocationCount, 0);
  assert.equal(fixtures.consumptionCount, 0);
});

test("request start and terminal pairing rejects missing, duplicate, terminal-only, and mismatched ledgers", () => {
  assert.equal(validateRequestEventPairs([
    { type: "provider-request-start", requestId: "r1", sequence: 1 },
    { type: "provider-request-complete", requestId: "r1", sequence: 2 },
  ]).status, "PASS");
  assert.equal(validateRequestEventPairs([{ type: "provider-request-complete", requestId: "r1", sequence: 2 }]).status, "FAIL");
  assert.equal(validateRequestEventPairs([
    { type: "provider-request-start", requestId: "r1", sequence: 1 },
    { type: "provider-request-start", requestId: "r1", sequence: 2 },
    { type: "provider-request-complete", requestId: "r1", sequence: 3 },
  ]).status, "FAIL");
  assert.equal(validateRequestEventPairs([
    { type: "provider-request-start", requestId: "r1", sequence: 1 },
    { type: "provider-request-complete", requestId: "r2", sequence: 2 },
  ]).status, "FAIL");
});

test("synthetic consumption boundary consumes only at first outbound request", () => {
  const result = runSyntheticConsumptionBoundaryFixtures();
  assert.deepEqual(result, {
    status: "PASS",
    preflightConsumption: 0,
    firstOutboundConsumption: 1,
    failureAfterOutboundConsumption: 1,
    automaticRetry: 0,
  });
});

test("Fixture Product Adapter is fixture-only and never reachable from Live mode", async () => {
  await assert.rejects(
    createFixtureProductAdapter({ executionMode: "live" }),
    (error) => error.code === "LIVE_ADAPTER_OVERRIDE_PROHIBITED",
  );
  const previousKey = process.env.TMDB_API_KEY;
  process.env.TMDB_API_KEY = "__MYOTT_QA_FIXTURE_ONLY__";
  try {
    const sessionModule = await import("../../src/lib/recommendation/qa/tmdbObservability.js");
    const session = sessionModule.createTmdbObservabilitySession({
      runId: "synthetic-live-binding",
      runMode: "cold",
      sourceComponent: "compatibility-test",
    });
    const consumptionRecorder = createConsumptionRecorder();
    const responseCatalog = new Map();
    const result = await createFixtureProductAdapter({
      executionMode: "fixture",
      runMode: "cold",
      session,
      responseCatalog,
      consumptionRecorder,
      input: FIXED_INPUT,
    });
    assert.equal(result.result.productSnapshot.errorContract, "none");
    assert.equal(result.calls.length, 17);
    assert.equal(responseCatalog.size, 1);
    assert.equal(responseCatalog.values().next().value.providerReportedTotal, 20);
    assert.equal(consumptionRecorder.consumedRuns, 1);
  } finally {
    if (previousKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousKey;
  }
});

test("fixture entrypoint produces the exact three-run compatibility evidence", async () => {
  const result = await fixtureResult();
  assert.equal(result.evidence.executionMode, "fixture");
  assert.equal(result.evidence.dataSource, "DETERMINISTIC_FIXTURE");
  assert.equal(result.evidence.validationPurpose, "LIVE_ENTRYPOINT_COMPATIBILITY");
  assert.equal(result.evidence.networkInvocationCount, 0);
  assert.equal(result.evidence.actualLiveBindingPresent, true);
  assert.equal(result.evidence.sealedProductAdapterBinding, true);
  assert.equal(result.evidence.listRequestLedgerValidation.status, true);
  assert.equal(result.evidence.detailRequestLedgerValidation.status, true);
  assert.equal(result.evidence.providerTotalDerivedFromListResponse, true);
  assert.equal(result.evidence.rawCandidatesDerivedFromListResponse, true);
  assert.equal(result.evidence.testOutputIsolation, true);
  assert.deepEqual(Object.keys(result.evidence.threeRunEvidence), RUN_MODES);
  assert.equal(result.staticValidation.status, "PASS");
  assert.ok(result.staticValidation.total > 40);
  assert.equal(result.staticValidation.passed, result.staticValidation.total);
  assert.equal(result.staticValidation.failed, 0);
  assert.equal(result.staticValidation.evidencePointerCoverage, `${result.staticValidation.total}/${result.staticValidation.total}`);
  assert.equal(result.staticValidation.sourceHashMatch, `${result.staticValidation.total}/${result.staticValidation.total}`);
  assert.equal(result.evidence.staticValidationQuality.calculatedStringOnlyPasses, 0);
  assert.equal(result.evidence.staticValidationQuality.calculatedSelfConfirmingPasses, 0);
});

test("request ledger is bounded, safe, and connected to actual raw events", async () => {
  const { evidence } = await fixtureResult();
  const expectedFields = [
    "cacheRelation",
    "completedSequence",
    "page",
    "providerItemId",
    "providerReportedTotal",
    "requestClass",
    "requestId",
    "requestSequence",
    "responseResultCount",
    "retryIndex",
    "runId",
    "runMode",
    "safeEndpointIdentity",
    "startedSequence",
    "statusClass",
    "outboundAttemptIds",
    "redirectCount",
  ].sort().join("|");
  const ledgerCounts = Object.fromEntries(Object.entries(evidence.requestLedger).map(([mode, entries]) => {
    assert.ok(entries.length <= REQUEST_CONTRACT.total);
    assert.ok(entries.every((entry) => Object.keys(entry).sort().join("|") === expectedFields));
    assert.ok(entries.every((entry) => !Object.hasOwn(entry, "url") && !Object.hasOwn(entry, "headers")));
    assert.equal(entries.filter((entry) => entry.requestClass === "list").length, 1);
    assert.equal(entries.filter((entry) => entry.requestClass === "detail").length, 16);
    const list = entries.find((entry) => entry.requestClass === "list");
    assert.equal(list.safeEndpointIdentity, "tmdb.discover.tv");
    assert.equal(list.page, 1);
    assert.equal(list.providerReportedTotal, 20);
    assert.equal(list.responseResultCount, 20);
    assert.ok(entries.filter((entry) => entry.requestClass === "detail").every((entry) => entry.safeEndpointIdentity === "tmdb.tv.detail" && Number.isInteger(entry.providerItemId)));
    return [mode, entries.length];
  }));
  assert.deepEqual(ledgerCounts, { cold: 17, "warm-prime": 17, "warm-measure": 17 });
  assert.equal(evidence.requestContract.aggregateLedgerEntries, 51);
  assert.equal(evidence.requestContract.logicalRequestUsage.cold.total, 17);
  assert.equal(evidence.requestContract.outboundAttemptUsage.cold.total, 17);
  assert.equal(evidence.requestContract.aggregateRemainingBudget, 55);
  assert.ok(evidence.requestContract.aggregateLedgerEntries <= REQUEST_CONTRACT.aggregate);
  assert.equal(evidence.requestContract.expected.total, 24);
  assert.equal(evidence.requestContract.expected.list, 8);
  assert.equal(evidence.requestContract.expected.detail, 16);
  assert.equal(evidence.requestContract.expected.concurrency, 4);
  assert.equal(evidence.requestContract.expected.retry, 0);
  assert.equal(evidence.requestStartEventValidation.status, "PASS");
  assert.equal(evidence.requestStartEventValidation.missingPairs, 0);
  assert.equal(evidence.requestStartEventValidation.duplicatePairs, 0);
  assert.equal(evidence.redirectBudgetValidation.status, "PASS");
  assert.equal(evidence.redirectBudgetValidation.total, 7);
  assert.equal(evidence.adapterOverrideNegativeFixtures.status, "PASS");
  assert.equal(evidence.adapterOverrideNegativeFixtures.adapterInvocationCount, 0);
  assert.equal(evidence.consumptionBoundaryValidation.redirectAdditionalConsumption, 0);
});

test("raw event ledgers recompute stage summaries and preserve provenance", async () => {
  const { evidence } = await fixtureResult();
  for (const mode of RUN_MODES) {
    const serialized = JSON.stringify({ events: evidence.rawEventLedger[mode] });
    const parsed = validateTmdbObservabilityLedger(serialized);
    assert.equal(parsed.events.length, 182);
    assert.deepEqual(summarizeTmdbObservabilityLedger(serialized), evidence.stageSummaries[mode]);
    assert.equal(evidence.terminalProvenance[mode].length, evidence.candidateRegistryByRun[mode].length);
    assert.equal(evidence.rankingProvenance[mode].length, evidence.candidateRegistryByRun[mode].length);
    assert.equal(evidence.finalCandidateIdsByRun[mode].length, 12);
    assert.equal(evidence.threeRunEvidence[mode].terminalProvenanceCount, 20);
    assert.equal(evidence.threeRunEvidence[mode].rankingProvenanceCount, 20);
    assert.equal(evidence.candidateUniverseByRun[mode].providerReportedTotalResults, 20);
    assert.deepEqual(evidence.candidateUniverseByRun[mode].requestedPages, [1]);
  }
  assert.equal(evidence.summary.unknownUninstrumentedDropCount, 0);
});

test("cache phases, event limits, and final candidate contract are explicit", async () => {
  const { evidence } = await fixtureResult();
  assert.equal(evidence.cacheEvidence.status, "PASS");
  assert.equal(evidence.cacheEvidence.actual.cold.cacheMiss, true);
  assert.equal(evidence.cacheEvidence.actual["warm-prime"].cacheHit, true);
  assert.equal(evidence.cacheEvidence.actual["warm-measure"].cacheHit, true);
  assert.deepEqual(evidence.resourceLimits.actualEventCountByRun, {
    cold: 182,
    "warm-prime": 182,
    "warm-measure": 182,
  });
  assert.equal(evidence.resourceLimits.actualEventCountByRun.cold, 182);
  assert.equal(evidence.resourceLimits.actualAggregateEventCount, 546);
  assert.ok(evidence.resourceLimits.actualAggregateEventCount <= 1536);
  assert.deepEqual(evidence.summary.finalCountByRun, {
    cold: 12,
    "warm-prime": 12,
    "warm-measure": 12,
  });
  assert.equal(evidence.noClobberValidation.status, "PASS");
  assert.equal(evidence.noClobberValidation.hardLinkNoClobberPublish, true);
  assert.equal(evidence.noClobberValidation.existingDestinationRejected, true);
});

test("canonical CLI output collision remains rejected while tests use isolated output", async () => {
  await assert.rejects(
    runPreflight(),
    (error) => error.code === "REC_QA_091_LIVE_ENTRYPOINT_OUTPUT_BOUNDARY_FAILED",
  );
  await withIsolatedOutputRoot(async (root) => {
    const result = await runPreflight({ outputRoot: root, outputStem: "isolated-output" });
    assert.equal(result.status, "PASS");
    assert.deepEqual(await readdir(root), []);
  });
});

test("security fixtures reject secret, URL, path, query, traversal, and reserved-key values", async () => {
  const fixtures = runCompatibilitySecurityFixtures();
  assert.equal(fixtures.status, "PASS");
  assert.equal(fixtures.total, 6);
  assert.equal(fixtures.passed, 6);
  assert.equal(fixtures.failed, 0);
  assert.equal(fixtures.unexpectedPasses, 0);
  assert.throws(() => assertSafeCompatibilityEvidence({ value: "https://example.invalid" }));
});

test("the existing broad live runner remains an unchanged source dependency", async () => {
  const { evidence } = await fixtureResult();
  const liveRunner = await readFile(new URL("../recommendation-live-qa.mjs", import.meta.url), "utf8");
  assert.ok(liveRunner.length > 0);
  assert.ok(/^[a-f0-9]{64}$/.test(evidence.integrity.sourceHashes["scripts/recommendation-live-qa.mjs"].sha256));
  assert.equal(evidence.integrity.productRunnerUnchanged, true);
  assert.equal(evidence.integrity.repositoryMutation, 0);
  assert.equal(evidence.integrity.stageCommitPush, 0);
  assert.equal(COMPATIBILITY_EVIDENCE_STEM, "live-entrypoint-compatibility-v1-final");
});

test("final publication has no direct file writer or overwrite fallback", async () => {
  const source = await readFile(new URL("./rec-qa-091-live-observability-v1.mjs", import.meta.url), "utf8");
  assert.equal(/\bwriteFile\s*\(/.test(source), false);
  assert.equal(/\brename(?:Sync)?\s*\(/.test(source), false);
  assert.equal(/\bcopyFile(?:Sync)?\s*\(/.test(source), false);
  assert.equal(source.includes("writeImmutableObservabilityEvidence("), true);
  assert.equal(source.includes("await link(stagingPath, destination)"), true);
});
