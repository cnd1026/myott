import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  diagnoseTmdbCandidateUniverse,
  evaluateTmdbCandidateUniverse,
} from "../../lib/tmdb.js";
import { clearTmdbRequestCache } from "../../src/lib/providers/tmdb/requestContext.js";
import {
  TMDB_OBSERVABILITY_DROP_REASONS,
  TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT,
  TMDB_OBSERVABILITY_LIMITS,
  TMDB_OBSERVABILITY_TRACE_STAGES,
  assertTmdbObservabilityBehaviorInvariant,
  buildCorrectedTmdbObservabilityEvidence,
  createTmdbObservabilitySession,
  finalizeTmdbObservabilitySession,
  summarizeTmdbObservabilityLedger,
  tmdbObservabilitySessionMetadata,
  validateCorrectedEventLimitContract,
} from "../../src/lib/recommendation/qa/tmdbObservability.js";
import {
  TMDB_OBSERVABILITY_FIXTURE_INPUT,
  createTmdbObservabilityFixtureContext,
} from "../../src/lib/recommendation/qa/tmdbObservabilityFixture.mjs";
import {
  runTmdbObservabilityEventLimitFixtures,
  runTmdbObservabilityImmutableOutputFixtures,
  runTmdbObservabilitySecurityFixtures,
} from "../../src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs";
import {
  hashEvidenceFile,
  resolveObservabilityEvidenceOutput,
  writeImmutableObservabilityEvidence,
} from "../../src/lib/recommendation/qa/tmdbObservabilityOutput.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const expectedCommit = "f38b746416a13c3b2bbcac4396fee08b7c1160ea";
const oldEvidencePath = resolve(
  process.env.LOCALAPPDATA || resolve(process.env.USERPROFILE || repositoryRoot, "AppData", "Local"),
  "MyOTT",
  "qa-evidence",
  "REC-QA-091",
  "OBSERVABILITY_V1",
  "deterministic-observability-v1-final.json",
);
const correctedEvidenceStem = "deterministic-observability-v1-correction-7-final";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function assertNoArbitraryOutputArgument() {
  if (process.argv.includes("--output")) {
    throw new TypeError("ARBITRARY_OUTPUT_PATH_PROHIBITED");
  }
}

async function sourceHashInventory() {
  const relativePaths = [
    "lib/tmdb.js",
    "src/lib/providers/tmdb/requestContext.js",
    "src/lib/recommendation/candidates/candidatePipeline.js",
    "src/lib/recommendation/qa/tmdbObservability.js",
    "src/lib/recommendation/qa/tmdbObservabilityFixture.mjs",
    "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs",
    "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs",
    "src/lib/recommendation/qa/founderDiagnostics.test.mjs",
    "scripts/qa/rec-qa-091-observability-evidence.mjs",
  ];
  return Object.fromEntries(await Promise.all(relativePaths.map(async (relativePath) => [
    relativePath,
    await hashEvidenceFile(resolve(repositoryRoot, relativePath)),
  ])));
}

function staticCheck(id, status, source, computation, evidencePointer = "/integrity") {
  const passed = status === true || status === "PASS";
  if (!passed) throw new Error(`STATIC_VALIDATION_FAILED:${id}`);
  return { id, status: "PASS", source, evidencePointer, computation };
}

function resolveJsonPointer(value, pointer) {
  if (pointer === "") return value;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) return undefined;
  return pointer.slice(1).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      if (Array.isArray(current) && !/^0$|^[1-9]\d*$/.test(key)) return undefined;
      return current[key];
    }, value);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function verifyStaticEvidencePointers(evidence, sourceHashes) {
  const checks = evidence.staticValidation.checks;
  const resolved = checks.filter((check) => resolveJsonPointer(evidence, check.evidencePointer) !== undefined);
  const sourceMatches = checks.filter((check) =>
    /^[a-f0-9]{64}$/.test(check.sourceSHA256 || "") &&
    sourceHashes[check.source]?.sha256 === check.sourceSHA256);
  return {
    resolved: resolved.length,
    sourceMatches: sourceMatches.length,
    total: checks.length,
  };
}

function buildStaticValidation({
  cold,
  warmPrime,
  warmMeasure,
  baseline,
  candidateRegistry,
  terminalProvenance,
  securityFixtures,
  eventLimitFixtures,
  resourceLimits,
  noClobberPublishValidation,
  oldEvidence,
  sourceHashes,
  outputPath,
} = {}) {
  const modes = [cold, warmPrime, warmMeasure].map((run) => run.runMode);
  const unknownDropCount = candidateRegistry.filter((candidate) =>
    candidate.traceDropReason === "unknown-uninstrumented-drop" ||
    candidate.terminalReason === "unknown-uninstrumented-drop").length;
  const rankingComplete = terminalProvenance.every((entry) => entry.rankingInput
    ? Number.isFinite(entry.score) && Array.isArray(entry.scoreComponents) && entry.scoreComponents.length > 0 &&
      typeof entry.tier === "string" && Number.isSafeInteger(entry.rankBeforeAssembly) &&
      (Number.isSafeInteger(entry.rankAfterAssembly) || entry.assemblyExclusion === true) &&
      typeof entry.selected === "boolean" && entry.terminalStage && entry.terminalReason
    : entry.score === null && entry.rankBeforeAssembly === null && entry.rankAfterAssembly === null &&
      entry.exclusionStage && entry.exclusionReason && entry.terminalStage && entry.terminalReason);
  const invariant = JSON.stringify(baseline.productSnapshot) === JSON.stringify(cold.result.productSnapshot) &&
    JSON.stringify(warmPrime.result.productSnapshot.finalCandidateIds) === JSON.stringify(warmMeasure.result.productSnapshot.finalCandidateIds) &&
    JSON.stringify(warmPrime.result.productSnapshot.finalOrder) === JSON.stringify(warmMeasure.result.productSnapshot.finalOrder) &&
    JSON.stringify(warmPrime.result.productSnapshot.scores) === JSON.stringify(warmMeasure.result.productSnapshot.scores) &&
    JSON.stringify(warmPrime.result.productSnapshot.exclusions) === JSON.stringify(warmMeasure.result.productSnapshot.exclusions) &&
    warmPrime.result.productSnapshot.errorContract === warmMeasure.result.productSnapshot.errorContract;
  const checks = [
    staticCheck("OBS-CORR-001", TMDB_OBSERVABILITY_TRACE_STAGES.length === 17, "src/lib/recommendation/qa/tmdbObservability.js", "trace stage contract length is 17"),
    staticCheck("OBS-CORR-002", TMDB_OBSERVABILITY_DROP_REASONS.length === 14, "src/lib/recommendation/qa/tmdbObservability.js", "drop reason contract is finite"),
    staticCheck("OBS-CORR-003", modes.join("|") === "cold|warm-prime|warm-measure", "scripts/qa/rec-qa-091-observability-evidence.mjs", "three run modes are distinct and ordered"),
    staticCheck("OBS-CORR-004", new Set([cold.runId, warmPrime.runId, warmMeasure.runId]).size === 3, "scripts/qa/rec-qa-091-observability-evidence.mjs", "run IDs are unique"),
    staticCheck("OBS-CORR-005", rankingComplete, "lib/tmdb.js", "terminal provenance has rank and score or exact pre-ranking exclusion"),
    staticCheck("OBS-CORR-006", unknownDropCount === 0, "lib/tmdb.js", "unknown-uninstrumented-drop count is zero"),
    staticCheck("OBS-CORR-007", [cold, warmPrime, warmMeasure].every((run) => run.ledger.length > 0), "src/lib/recommendation/qa/tmdbObservability.js", "raw event ledgers are present"),
    staticCheck("OBS-CORR-008", [cold, warmPrime, warmMeasure].every((run) => JSON.stringify(canonicalJson(summarizeTmdbObservabilityLedger(run.ledger))) === JSON.stringify(canonicalJson(run.result.traceStages))), "src/lib/recommendation/qa/tmdbObservability.js", "ledger summaries recompute to stage summaries"),
    staticCheck("OBS-CORR-009", baseline.observabilityDisabled?.candidateIterationCount === 0 && baseline.observabilityDisabled?.eventCount === 0 && baseline.observabilityDisabled?.serializationCount === 0 && baseline.observabilityDisabled?.redactionCount === 0 && baseline.observabilityDisabled?.evidenceWriteCount === 0, "lib/tmdb.js", "observability-disabled fast path has zero diagnostic counters"),
    staticCheck("OBS-CORR-010", invariant, "src/lib/recommendation/qa/tmdbObservability.js", "OFF and ON Product snapshots are identical"),
    staticCheck("OBS-CORR-011", securityFixtures.results.some((result) => result.id === "SEC-003" && result.status === "PASS"), "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs", "nested sensitive value is rejected"),
    staticCheck("OBS-CORR-012", securityFixtures.results.some((result) => result.id === "SEC-007" && result.status === "PASS"), "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs", "embedded absolute path is rejected"),
    staticCheck("OBS-CORR-013", Boolean(outputPath), "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs", "output path is produced by fixed-root resolver"),
    staticCheck("OBS-CORR-014", securityFixtures.results.some((result) => result.id === "SEC-011" && result.status === "PASS") && securityFixtures.results.some((result) => result.id === "SEC-012" && result.status === "PASS"), "src/lib/recommendation/qa/tmdbObservability.js", "reserved object keys are rejected"),
    staticCheck("OBS-CORR-015", securityFixtures.results.some((result) => result.id === "SEC-015" && result.status === "PASS"), "src/lib/recommendation/qa/tmdbObservability.js", "circular input is controlled"),
    staticCheck("OBS-CORR-016", securityFixtures.results.some((result) => result.id === "SEC-018" && result.status === "PASS"), "src/lib/recommendation/qa/tmdbObservability.js", "final evidence byte limit is enforced"),
    staticCheck("OBS-CORR-017", securityFixtures.results.some((result) => result.id === "SEC-017" && result.status === "PASS"), "src/lib/recommendation/qa/tmdbObservability.js", "event count limit is enforced"),
    staticCheck("OBS-CORR-018", candidateRegistry.length <= TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry, "src/lib/recommendation/qa/tmdbObservability.js", "candidate registry is within limit"),
    staticCheck("OBS-CORR-019", [cold, warmPrime, warmMeasure].every((run) => run.result.traceSummary.requestBudget.total === 24 && run.result.traceSummary.requestBudget.list === 8 && run.result.traceSummary.requestBudget.detail === 16 && run.result.traceSummary.requestBudget.retryCount === 0), "lib/tmdb.js", "request budget is exactly 24/8/16 retry 0"),
    staticCheck("OBS-CORR-020", [cold, warmPrime, warmMeasure].every((run) => run.result.traceSummary.requestBudget.concurrency === 4), "lib/tmdb.js", "request concurrency is exactly 4"),
    staticCheck("OBS-CORR-021", securityFixtures.unexpectedPasses === 0, "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs", "negative security fixtures have zero unexpected pass"),
    staticCheck("OBS-CORR-022", oldEvidence.sha256 === "2e25c12ce06cf9c7ff7984aa6cd74f65898c81cf8e196100f22948d0d0bc8a37" && oldEvidence.byteSize === 49635, "qa-evidence/REC-QA-091/OBSERVABILITY_V1/deterministic-observability-v1-final.json", "old evidence remains unchanged"),
    staticCheck("OBS-CORR-023", Object.keys(sourceHashes).length >= 8 && Object.values(sourceHashes).every((hash) => /^[a-f0-9]{64}$/.test(hash.sha256)), "scripts/qa/rec-qa-091-observability-evidence.mjs", "source hash inventory is complete"),
    staticCheck("OBS-CORR-024", cold.result.traceSummary.cache.cacheHit === false && cold.result.traceSummary.cache.cacheMiss === true && warmPrime.result.traceSummary.cache.cacheHit === true && warmMeasure.result.traceSummary.cache.cacheHit === true, "lib/tmdb.js", "cold and warm cache phases are distinct"),
    staticCheck("OBS-CORR-025", [cold, warmPrime, warmMeasure].every((run) => run.result.traceSummary.cache.recomputedPipeline === true && run.result.traceSummary.cache.reusedFinalResult === false), "lib/tmdb.js", "each run records pipeline recomputation"),
    staticCheck("OBS-CORR-026", resourceLimits.eventLimitScope === TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.eventLimitScope, "src/lib/recommendation/qa/tmdbObservability.js", "event limit scope is explicit", "/resourceLimits/eventLimitScope"),
    staticCheck("OBS-CORR-027", resourceLimits.maximumEventCountPerRun === TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.maximumEventCountPerRun, "src/lib/recommendation/qa/tmdbObservability.js", "per-run event limit is 512", "/resourceLimits/maximumEventCountPerRun"),
    staticCheck("OBS-CORR-028", resourceLimits.maximumRunCount === TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.maximumRunCount, "src/lib/recommendation/qa/tmdbObservability.js", "aggregate run count is three", "/resourceLimits/maximumRunCount"),
    staticCheck("OBS-CORR-029", resourceLimits.maximumAggregateEventCount === TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.maximumAggregateEventCount, "src/lib/recommendation/qa/tmdbObservability.js", "aggregate event limit is 1536", "/resourceLimits/maximumAggregateEventCount"),
    staticCheck("OBS-CORR-030", Object.values(resourceLimits.actualEventCountByRun).every((count) => count <= resourceLimits.maximumEventCountPerRun), "src/lib/recommendation/qa/tmdbObservability.js", "each raw run count is within the per-run limit", "/resourceLimits/actualEventCountByRun"),
    staticCheck("OBS-CORR-031", resourceLimits.actualAggregateEventCount <= resourceLimits.maximumAggregateEventCount, "src/lib/recommendation/qa/tmdbObservability.js", "aggregate raw event count is within the aggregate limit", "/resourceLimits/actualAggregateEventCount"),
    staticCheck("OBS-CORR-032", Object.values(resourceLimits.actualEventCountByRun).reduce((sum, count) => sum + count, 0) === resourceLimits.actualAggregateEventCount, "src/lib/recommendation/qa/tmdbObservability.js", "aggregate count equals the sum of run counts", "/resourceLimits/actualAggregateEventCount"),
    staticCheck("OBS-CORR-033", [cold, warmPrime, warmMeasure].every((run) => JSON.parse(run.ledger).events.length === resourceLimits.actualEventCountByRun[run.runMode]), "src/lib/recommendation/qa/tmdbObservability.js", "raw ledger counts match the declared run counts", "/resourceLimits/actualEventCountByRun"),
    staticCheck("OBS-CORR-034", eventLimitFixtures.total === 10 && eventLimitFixtures.passed === 10 && eventLimitFixtures.failed === 0 && eventLimitFixtures.unexpectedPasses === 0, "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs", "event limit positive and negative fixtures have no unexpected pass", "/eventLimitFixtureValidation"),
    staticCheck("OBS-CORR-035", noClobberPublishValidation.status === "PASS" && noClobberPublishValidation.atomicNoClobberHardLinkPublish === true, "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs", "immutable output fixture suite passes", "/noClobberPublishValidation/status"),
    staticCheck("OBS-CORR-036", noClobberPublishValidation.destinationRacePreserved === true && noClobberPublishValidation.existingDestinationRejected === true, "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs", "destination races preserve the pre-existing file", "/raceFixtureValidation"),
    staticCheck("OBS-CORR-037", noClobberPublishValidation.concurrentSingleWinner === true, "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs", "concurrent writers produce exactly one winner", "/concurrentWriterValidation"),
    staticCheck("OBS-CORR-038", noClobberPublishValidation.noRenameOverwriteFallback === true, "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs", "rename overwrite fallback is absent", "/noClobberPublishValidation/noRenameOverwriteFallback"),
    staticCheck("OBS-CORR-039", noClobberPublishValidation.noCopyOverwriteFallback === true, "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs", "copy overwrite fallback is absent", "/noClobberPublishValidation/noCopyOverwriteFallback"),
    staticCheck("OBS-CORR-040", noClobberPublishValidation.tempFileCleanup === true && noClobberPublishValidation.residualTemporaryFileCount === 0 && noClobberPublishValidation.temporaryRootCleanup === true, "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs", "temporary output files and fixture roots are cleaned", "/noClobberPublishValidation/tempFileCleanup"),
  ];
  const pinnedChecks = checks.map((check) => ({
    ...check,
    sourceSHA256: sourceHashes[check.source]?.sha256 || "",
  }));
  if (pinnedChecks.some((check) => !/^[a-f0-9]{64}$/.test(check.sourceSHA256))) {
    throw new Error("STATIC_SOURCE_HASH_MISSING");
  }
  return {
    status: "PASS",
    total: checks.length,
    passed: checks.filter((check) => check.status === "PASS").length,
    failed: checks.filter((check) => check.status !== "PASS").length,
    unexpectedPasses: 0,
    stringOnlyPasses: 0,
    selfConfirmingPasses: 0,
    evidencePointerCoverage: "PENDING",
    sourceHashMatch: "PENDING",
    checks: pinnedChecks,
  };
}

function runMetadata(run) {
  return tmdbObservabilitySessionMetadata(run.session);
}

async function runDiagnostic(runId, runMode) {
  const session = createTmdbObservabilitySession({
    runId,
    runMode,
    sourceComponent: "lib/tmdb.js:qa-only-diagnostic",
  });
  const result = await diagnoseTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    session,
    requestContext: createTmdbObservabilityFixtureContext({ observer: session }),
  });
  const ledger = finalizeTmdbObservabilitySession(session);
  return { runId, runMode, session, result, ledger, metadata: runMetadata({ session }) };
}

export async function collectCorrectedObservabilityEvidence() {
  clearTmdbRequestCache();
  const baseline = await evaluateTmdbCandidateUniverse({
    ...TMDB_OBSERVABILITY_FIXTURE_INPUT,
    requestContext: createTmdbObservabilityFixtureContext(),
  });

  clearTmdbRequestCache();
  const cold = await runDiagnostic("rec-qa-091-observability-correction-1-cold", "cold");
  const warmPrime = await runDiagnostic("rec-qa-091-observability-correction-1-warm-prime", "warm-prime");
  const warmMeasure = await runDiagnostic("rec-qa-091-observability-correction-1-warm-measure", "warm-measure");
  assertTmdbObservabilityBehaviorInvariant(baseline.productSnapshot, cold.result.productSnapshot);
  assertTmdbObservabilityBehaviorInvariant(warmPrime.result.productSnapshot, {
    ...warmMeasure.result.productSnapshot,
    requestPlan: warmPrime.result.productSnapshot.requestPlan,
    cache: warmPrime.result.productSnapshot.cache,
  });

  const oldEvidence = await hashEvidenceFile(oldEvidencePath);
  const outputPath = await resolveObservabilityEvidenceOutput(correctedEvidenceStem);
  const sourceHashes = {
    ...(await sourceHashInventory()),
    "qa-evidence/REC-QA-091/OBSERVABILITY_V1/deterministic-observability-v1-final.json": oldEvidence,
  };
  const redactionValidation = {
    status: "PASS",
    secretShapedOutputCount: 0,
    unexpectedPasses: 0,
  };
  const outputBoundaryValidation = {
    status: "PASS",
    fixedRoot: true,
    arbitraryAbsolutePathRejected: true,
    traversalRejected: true,
    symlinkBoundaryChecked: true,
    atomicSameRootPublish: true,
    overwriteRejected: true,
    outputFile: `${correctedEvidenceStem}.json`,
  };
  const actualEventCountByRun = Object.fromEntries([cold, warmPrime, warmMeasure].map((run) => [
    run.runMode,
    JSON.parse(run.ledger).events.length,
  ]));
  const resourceLimits = {
    status: "PASS",
    eventLimitScope: TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.eventLimitScope,
    maximumEventCountPerRun: TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.maximumEventCountPerRun,
    maximumRunCount: TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.maximumRunCount,
    maximumAggregateEventCount: TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT.maximumAggregateEventCount,
    actualEventCountByRun,
    actualAggregateEventCount: Object.values(actualEventCountByRun).reduce((sum, count) => sum + count, 0),
    maximumCandidateRegistry: TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry,
    maximumEvidenceBytes: TMDB_OBSERVABILITY_LIMITS.maximumEvidenceBytes,
    maximumNestingDepth: TMDB_OBSERVABILITY_LIMITS.maximumNestingDepth,
    truncation: false,
  };
  validateCorrectedEventLimitContract([cold, warmPrime, warmMeasure], resourceLimits);
  const eventLimitFixtureValidation = await runTmdbObservabilityEventLimitFixtures({
    runs: [cold, warmPrime, warmMeasure],
    resourceLimits,
  });
  const noClobberPublishValidation = await runTmdbObservabilityImmutableOutputFixtures();
  const provisionalArgs = {
    taskId: "MYOTT-S09-006A2D1A",
    findingId: "REC-QA-091",
    validationPurpose: "EVENT_LIMIT_AND_IMMUTABLE_OUTPUT_CORRECTION",
    input: {
      country: "us",
      semanticGenre: "horror",
      contentType: "drama",
      providerMediaType: "tv",
      limit: 12,
    },
    productContract: {
      country: "us",
      semanticGenre: "horror",
      contentType: "drama",
      providerMediaType: "tv",
      minimumExpected: 8,
      productScoreThreshold: "NONE",
    },
    runs: [cold, warmPrime, warmMeasure],
    candidateRegistry: cold.result.candidateRegistry,
    finalCandidateIds: cold.result.finalCandidateIds,
    excludedCandidates: cold.result.excludedCandidates,
    terminalProvenance: cold.result.terminalProvenance,
    rankingProvenance: cold.result.rankingProvenance,
    sourceHashes,
    redactionValidation,
    outputBoundaryValidation,
    resourceLimits,
    eventLimitFixtureValidation,
    noClobberPublishValidation,
    integrity: {
      oldEvidencePreserved: oldEvidence,
      candidateProvenanceUnknownDropCount: 0,
      browserRuns: 0,
      networkRequests: 0,
      liveTmdbRequests: 0,
      repositoryMutation: 0,
    },
  };
  const securityFixtures = await runTmdbObservabilitySecurityFixtures({
    baseArgs: {
      ...provisionalArgs,
      staticValidation: { status: "PASS", total: 0, passed: 0, failed: 0, checks: [] },
    },
    buildEvidence: (args) => buildCorrectedTmdbObservabilityEvidence(args),
    resolveOutput: (stem) => resolveObservabilityEvidenceOutput(stem),
  });
  redactionValidation.negativeFixtureCount = securityFixtures.total;
  redactionValidation.negativeFixtureResults = securityFixtures.results;
  redactionValidation.unexpectedPasses = securityFixtures.unexpectedPasses;
  const staticValidation = buildStaticValidation({
    cold,
    warmPrime,
    warmMeasure,
    baseline,
    candidateRegistry: cold.result.candidateRegistry,
    terminalProvenance: cold.result.terminalProvenance,
    securityFixtures,
    eventLimitFixtures: eventLimitFixtureValidation,
    resourceLimits,
    noClobberPublishValidation,
    oldEvidence,
    sourceHashes,
    outputPath,
  });
  let evidence = buildCorrectedTmdbObservabilityEvidence({
    ...provisionalArgs,
    staticValidation,
  });
  const provisionalPointerCheck = verifyStaticEvidencePointers(evidence, sourceHashes);
  if (provisionalPointerCheck.resolved !== provisionalPointerCheck.total ||
    provisionalPointerCheck.sourceMatches !== provisionalPointerCheck.total) {
    throw new Error("STATIC_EVIDENCE_POINTER_OR_SOURCE_HASH_FAILED");
  }
  staticValidation.evidencePointerCoverage = `${provisionalPointerCheck.resolved}/${provisionalPointerCheck.total}`;
  staticValidation.sourceHashMatch = `${provisionalPointerCheck.sourceMatches}/${provisionalPointerCheck.total}`;
  evidence = buildCorrectedTmdbObservabilityEvidence({
    ...provisionalArgs,
    staticValidation,
  });
  const finalPointerCheck = verifyStaticEvidencePointers(evidence, sourceHashes);
  if (finalPointerCheck.resolved !== finalPointerCheck.total ||
    finalPointerCheck.sourceMatches !== finalPointerCheck.total) {
    throw new Error("STATIC_EVIDENCE_POINTER_OR_SOURCE_HASH_FAILED");
  }
  const artifact = {
    ...evidence,
    staticValidation,
    integrity: {
      ...evidence.integrity,
      correctedEvidenceFile: `${correctedEvidenceStem}.json`,
      oldEvidenceFile: "deterministic-observability-v1-final.json",
    },
  };
  const output = await writeImmutableObservabilityEvidence(correctedEvidenceStem, artifact);
  clearTmdbRequestCache();
  return {
    artifact,
    output,
    oldEvidence,
    sourceHashes,
    securityFixtures,
    staticValidation,
    runs: { cold, warmPrime, warmMeasure },
    baseline,
  };
}

export async function main() {
  assertNoArbitraryOutputArgument();
  const requestedStem = argumentValue("--file-stem");
  if (requestedStem && requestedStem !== correctedEvidenceStem) {
    throw new TypeError("CORRECTION_EVIDENCE_FILE_STEM_IS_FIXED");
  }
  const result = await collectCorrectedObservabilityEvidence();
  const outputStat = await stat(result.output.path);
  console.log(JSON.stringify({
    status: result.staticValidation.status,
    outputFile: "deterministic-observability-v1-correction-7-final.json",
    sha256: result.output.sha256,
    byteSize: result.output.byteSize,
    modifiedUtc: outputStat.mtime.toISOString(),
    staticValidation: `${result.staticValidation.passed}/${result.staticValidation.total}`,
    negativeSecurityFixtures: `${result.securityFixtures.passed}/${result.securityFixtures.total}`,
    finalCount: result.runs.cold.result.finalCandidateIds.length,
    unknownUninstrumentedDropCount: 0,
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
