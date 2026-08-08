import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIXED_INPUT, OUTPUT_CONTRACT, V2_EVIDENCE_FILE_STEM, V2_EVIDENCE_ROOT } from "./inputContract.mjs";
import { GOVERNANCE_EXECUTION_FIELDS } from "./authorizationContract.mjs";
import { collectV2SourceGraph } from "./sourceInventory.mjs";
import { canonicalExpectedContract, canonicalFixtureManifest } from "./canonicalExpectedContract.mjs";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const REQUIRED_CHECK_FIELDS = Object.freeze([
  "checkId", "claim", "validationMethod", "expected", "observed", "structuredEvidence",
  "evidencePointers", "sourceHashes", "verdict",
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function getPointer(root, pointer) {
  if (pointer === "") return root;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) throw new Error("JSON_POINTER_INVALID");
  return pointer.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, key) => {
      if (value === null || value === undefined || !Object.hasOwn(value, key)) throw new Error("JSON_POINTER_UNRESOLVED");
      return value[key];
    }, root);
}

function groupByRun(records) {
  return records.reduce((groups, record) => {
    (groups[record.runId] ||= []).push(record);
    return groups;
  }, {});
}

function independentSourceRecord(sourceInventory, sourcePath) {
  const record = sourceInventory.find((entry) => entry.relativePath === sourcePath);
  if (!record) throw new Error(`SOURCE_INVENTORY_MISSING:${sourcePath}`);
  return record;
}

async function sourceHashMismatches(sourceInventory, claimedInventory = sourceInventory) {
  const claimed = new Map(claimedInventory.map((record) => [record.relativePath, record]));
  let mismatches = 0;
  for (const record of sourceInventory) {
    const claimedRecord = claimed.get(record.relativePath);
    const actual = hashBytes(await readFile(resolve(REPOSITORY_ROOT, record.relativePath)));
    if (!claimedRecord || actual !== record.sha256 || actual !== claimedRecord.sha256 || record.byteSize !== claimedRecord.byteSize) mismatches += 1;
  }
  if (claimed.size !== sourceInventory.length) mismatches += Math.abs(claimed.size - sourceInventory.length);
  return mismatches;
}

function pointerFailures(checks, rawEvidence) {
  let failures = 0;
  for (const check of checks) {
    for (const pointer of check.evidencePointers) {
      try { getPointer(rawEvidence, pointer); } catch { failures += 1; }
    }
  }
  return failures;
}

function calculateMeta(checks, unresolvedPointers, sourceMismatches) {
  const checkIds = checks.map((check) => check.checkId);
  const predicateIds = checks.map((check) => `${check.claim}|${check.validationMethod}|${check.evidencePointers.join(",")}`);
  return {
    stringOnlyPasses: checks.filter((check) => check.verdict === "PASS" &&
      (!check.structuredEvidence || Object.keys(check.structuredEvidence).length === 0 || check.evidencePointers.length === 0)).length,
    selfConfirmingPasses: checks.filter((check) => check.verdict === "PASS" &&
      (check.structuredEvidence?.selfConfirming === true || check.structuredEvidence?.samePointerComparison === true)).length,
    duplicateCheckIds: checkIds.length - new Set(checkIds).size,
    duplicatePredicateIds: predicateIds.length - new Set(predicateIds).size,
    unresolvedPointers,
    sourceHashMismatches: sourceMismatches,
  };
}

export function calculateMetaQuality(checks, { unresolvedPointers = 0, sourceHashMismatches = 0 } = {}) {
  return calculateMeta(checks, unresolvedPointers, sourceHashMismatches);
}

function expectedErrorMatches(record, manifestRecord) {
  if (!manifestRecord.expectedErrorCodePrefix) return record.observedErrorCode == null;
  return String(record.observedErrorCode || "").startsWith(manifestRecord.expectedErrorCodePrefix);
}

function fixtureComparison(records) {
  const manifest = canonicalFixtureManifest();
  const expectedById = new Map(manifest.map((record) => [record.fixtureId, record]));
  const counts = new Map();
  for (const record of records) counts.set(record.fixtureId, (counts.get(record.fixtureId) || 0) + 1);
  const missing = manifest.filter((record) => !counts.has(record.fixtureId)).map((record) => record.fixtureId);
  const extra = records.filter((record) => !expectedById.has(record.fixtureId)).map((record) => record.fixtureId);
  const duplicate = [...counts.entries()].filter(([, count]) => count !== 1).map(([id]) => id);
  const errors = records.filter((record) => {
    const expected = expectedById.get(record.fixtureId);
    return expected && (record.expectedDisposition !== expected.expectedDisposition ||
      record.observedDisposition !== expected.expectedDisposition || !expectedErrorMatches(record, expected));
  }).map((record) => record.fixtureId);
  const countErrors = records.filter((record) => {
    const expected = expectedById.get(record.fixtureId);
    return expected && (record.attemptCount !== expected.expectedAttemptCount ||
      record.consumptionEventCount !== expected.expectedConsumptionEventCount);
  }).map((record) => record.fixtureId);
  const unexpectedPasses = records.filter((record) => {
    const expected = expectedById.get(record.fixtureId);
    return expected?.expectedDisposition === "REJECTED" && record.observedDisposition !== "REJECTED";
  }).map((record) => record.fixtureId);
  return {
    manifestCount: manifest.length,
    actualCount: records.length,
    missing,
    extra,
    duplicate,
    errors: [...new Set([...errors, ...countErrors])],
    countErrors,
    unexpectedPasses,
  };
}

function setFrom(records) {
  return new Set((records || []).map((record) => record?.candidateId).filter(Boolean));
}

function sortedSet(set) {
  return [...set].sort();
}

function diagnosticCausality(rawEvidence, registryIds) {
  const runResults = Object.entries(rawEvidence.threeRunEvidence || {}).map(([runMode, run]) => {
    const totals = run.providerTotalResultsByTask || {};
    const pages = run.fetchedPagesByTask || {};
    const captures = run.capturedListResponses || [];
    const expectedPairs = Object.entries(pages).flatMap(([task, taskPages]) =>
      (Array.isArray(taskPages) ? taskPages : []).map((page) => `${task}|${page}`));
    const observedPairs = captures.flatMap((capture) =>
      (Array.isArray(capture.taskIdentities) ? capture.taskIdentities : []).map((task) => `${task}|${capture.page}`));
    const totalsMatch = Object.entries(totals).every(([task, total]) => captures.some((capture) =>
      capture.taskIdentities?.includes(task) && capture.totalResults === total));
    const pagesMatch = stable([...expectedPairs].sort()) === stable([...observedPairs].sort());
    const captureIds = new Set(captures.flatMap((capture) => capture.candidateIds || []));
    return {
      runMode,
      diagnosticsPresent: Object.keys(totals).length > 0 && Object.keys(pages).length > 0,
      totalsMatch,
      pagesMatch,
      candidateIdsMatch: stable(sortedSet(captureIds)) === stable(sortedSet(registryIds)),
      captureCount: captures.length,
      expectedPairs,
      observedPairs,
    };
  });
  return {
    runs: runResults,
    pass: runResults.length === 3 && runResults.every((run) => run.diagnosticsPresent && run.totalsMatch && run.pagesMatch && run.candidateIdsMatch),
  };
}

export async function validateExternalGovernanceEvidence(rawEvidence, {
  expectedContract: _expectedContract = canonicalExpectedContract(),
  sourceInventory: claimedSourceInventory = rawEvidence.sourceInventory || [],
  negativeFixtureRecords: claimedNegativeRecords = [],
} = {}) {
  const checks = [];
  const expected = canonicalExpectedContract();
  const sourceGraph = await collectV2SourceGraph();
  const actualSourceInventory = sourceGraph.records;
  const sourcePath = "scripts/qa/rec-qa-091-live-v2/independentValidator.mjs";
  const source = independentSourceRecord(actualSourceInventory, sourcePath);
  const sourceHashes = { [sourcePath]: source.sha256 };

  function makeCheck({ checkId, claim, validationMethod, expected, observed, structuredEvidence, evidencePointers }) {
    const check = {
      checkId, claim, validationMethod, expected: clone(expected), observed: clone(observed),
      structuredEvidence: clone(structuredEvidence), evidencePointers: [...evidencePointers],
      sourceHashes: { ...sourceHashes },
      verdict: stable(expected) === stable(observed) ? "PASS" : "FAIL",
    };
    if (Object.keys(check).sort().join("|") !== [...REQUIRED_CHECK_FIELDS].sort().join("|")) throw new Error("CHECK_RECORD_FIELD_CONTRACT_INVALID");
    checks.push(check);
    return check;
  }

  const records = Array.isArray(rawEvidence.negativeFixtureRecords) ? rawEvidence.negativeFixtureRecords : claimedNegativeRecords;
  const fixture = fixtureComparison(records);
  makeCheck({
    checkId: "V2-001",
    claim: "the complete canonical negative fixture manifest executes exactly once per fixture",
    validationMethod: "runtime-negative-fixture",
    expected: { missing: [], extra: [], duplicate: [], errors: [], countErrors: [], unexpectedPasses: 0 },
    observed: { missing: fixture.missing, extra: fixture.extra, duplicate: fixture.duplicate, errors: fixture.errors, countErrors: fixture.countErrors, unexpectedPasses: fixture.unexpectedPasses.length },
    structuredEvidence: { manifestCount: fixture.manifestCount, actualCount: fixture.actualCount, fixtureIds: records.map((record) => record.fixtureId) },
    evidencePointers: ["/negativeFixtureRecords"],
  });

  const expectedPreflight = expected.preflightOrder;
  const acceptedPreflight = (rawEvidence.preflightEvidence || []).find((record) => record.fixtureId === "valid-offline") ||
    (rawEvidence.preflightEvidence || []).find((record) => record.disposition === "ACCEPTED");
  makeCheck({
    checkId: "V2-002",
    claim: "offline preflight reaches governance validation only after all earlier controls",
    validationMethod: "controlled-failure-observation",
    expected: [...expectedPreflight],
    observed: acceptedPreflight?.trace || [],
    structuredEvidence: { fixtureId: acceptedPreflight?.fixtureId || null, trace: acceptedPreflight?.trace || [] },
    evidencePointers: ["/preflightEvidence"],
  });

  const controllerEvents = Object.values(rawEvidence.rawEventLedger || {}).flatMap((run) => run.controller || []);
  const firstConsumption = controllerEvents.find((event) => event.type === "governance-consumption");
  const firstAttempt = controllerEvents.find((event) => event.type === "outbound-attempt-start");
  makeCheck({
    checkId: "V2-003",
    claim: "governance consumption is one raw event before the first outbound attempt and matches the evidence record",
    validationMethod: "independent-ledger-recompute",
    expected: { controllerCount: 1, evidenceCount: 1, beforeFirstAttempt: true, evidenceMatchesRaw: true },
    observed: { controllerCount: controllerEvents.filter((event) => event.type === "governance-consumption").length, evidenceCount: (rawEvidence.governanceConsumptionEvidence || []).length, beforeFirstAttempt: Boolean(firstConsumption && firstAttempt && firstConsumption.sequence < firstAttempt.sequence), evidenceMatchesRaw: stable(rawEvidence.governanceConsumptionEvidence || []) === stable(controllerEvents.filter((event) => event.type === "governance-consumption")) },
    structuredEvidence: { consumption: firstConsumption, firstAttemptSequence: firstAttempt?.sequence ?? null },
    evidencePointers: ["/governanceConsumptionEvidence", "/rawEventLedger/cold/controller"],
  });

  const logical = Array.isArray(rawEvidence.logicalRequestLedger) ? rawEvidence.logicalRequestLedger : [];
  const attempts = Array.isArray(rawEvidence.outboundAttemptLedger) ? rawEvidence.outboundAttemptLedger : [];
  const runGroups = groupByRun(logical);
  const attemptGroups = groupByRun(attempts);
  const runModes = ["cold", "warm-prime", "warm-measure"];
  const runIds = Object.fromEntries(Object.values(rawEvidence.threeRunEvidence || {}).map((run) => [run.runMode, run.runId]));
  makeCheck({ checkId: "V2-004", claim: "logical request counts are recomputed per phase", validationMethod: "independent-ledger-recompute", expected: { cold: 17, "warm-prime": 17, "warm-measure": 17 }, observed: Object.fromEntries(runModes.map((mode) => [mode, runGroups[runIds[mode]]?.length || 0])), structuredEvidence: { runIds, ledgerCount: logical.length }, evidencePointers: ["/logicalRequestLedger"] });
  const ledgerConsistency = logical.every((record) => {
    const actual = attempts.filter((attempt) => attempt.logicalRequestId === record.logicalRequestId).map((attempt) => attempt.attemptId).sort();
    return record.attemptCount === actual.length && stable([...record.outboundAttemptIds].sort()) === stable(actual);
  });
  makeCheck({ checkId: "V2-005", claim: "actual outbound attempts and logical ledger references are recomputed per phase", validationMethod: "independent-ledger-recompute", expected: { cold: 17, "warm-prime": 0, "warm-measure": 0, ledgerConsistency: true }, observed: { ...Object.fromEntries(runModes.map((mode) => [mode, attemptGroups[runIds[mode]]?.length || 0])), ledgerConsistency }, structuredEvidence: { attemptIds: attempts.map((attempt) => attempt.attemptId), logicalCount: logical.length }, evidencePointers: ["/outboundAttemptLedger", "/logicalRequestLedger"] });

  const perRunBudget = Object.fromEntries(runModes.map((mode) => {
    const group = attemptGroups[runIds[mode]] || [];
    return [mode, { total: group.length, list: group.filter((record) => record.requestClass === "list").length, detail: group.filter((record) => record.requestClass === "detail").length }];
  }));
  makeCheck({ checkId: "V2-006", claim: "run and aggregate budgets obey the fixed ceilings", validationMethod: "independent-ledger-recompute", expected: { perRun: true, aggregate: true }, observed: { perRun: Object.values(perRunBudget).every((usage) => usage.total <= 24 && usage.list <= 8 && usage.detail <= 16), aggregate: attempts.length <= 72 }, structuredEvidence: { perRunBudget, aggregate: attempts.length }, evidencePointers: ["/requestContract", "/outboundAttemptLedger"] });

  const lifecycleEvents = Object.values(rawEvidence.rawEventLedger || {}).flatMap((run) => run.lifecycle || []);
  const starts = lifecycleEvents.filter((event) => event.type === "provider-request-start");
  const terminals = lifecycleEvents.filter((event) => ["provider-request-complete", "provider-request-failed"].includes(event.type));
  const terminalCounts = terminals.reduce((counts, event) => ((counts[event.requestId] = (counts[event.requestId] || 0) + 1), counts), {});
  const attemptStarts = controllerEvents.filter((event) => event.type === "outbound-attempt-start");
  const attemptTerminals = controllerEvents.filter((event) => ["outbound-attempt-complete", "outbound-attempt-failed"].includes(event.type));
  const attemptTerminalCounts = attemptTerminals.reduce((counts, event) => ((counts[event.attemptId] = (counts[event.attemptId] || 0) + 1), counts), {});
  const startMap = new Map(starts.map((event) => [event.requestId, event]));
  makeCheck({ checkId: "V2-007", claim: "each logical request has one ordered terminal and no open attempt", validationMethod: "independent-ledger-recompute", expected: { missing: 0, duplicate: 0, unordered: 0, openAttempts: 0 }, observed: { missing: starts.filter((event) => !terminalCounts[event.requestId]).length, duplicate: Object.values(terminalCounts).filter((count) => count !== 1).length, unordered: terminals.filter((terminal) => !startMap.has(terminal.requestId) || terminal.sequence <= startMap.get(terminal.requestId).sequence).length, openAttempts: attemptStarts.filter((event) => !attemptTerminalCounts[event.attemptId]).length }, structuredEvidence: { startCount: starts.length, terminalCount: terminals.length }, evidencePointers: ["/rawEventLedger/cold/lifecycle", "/logicalRequestLedger"] });
  const unmatchedAttemptTerminals = attemptTerminals.filter((event) => !attemptStarts.some((start) => start.attemptId === event.attemptId)).length;
  makeCheck({ checkId: "V2-008", claim: "each outbound attempt has exactly one terminal and no unmatched terminal exists", validationMethod: "independent-ledger-recompute", expected: { missing: 0, duplicate: 0, unmatched: 0 }, observed: { missing: attemptStarts.filter((event) => !attemptTerminalCounts[event.attemptId]).length, duplicate: Object.values(attemptTerminalCounts).filter((count) => count !== 1).length, unmatched: unmatchedAttemptTerminals }, structuredEvidence: { attemptStartCount: attemptStarts.length, attemptTerminalCount: attemptTerminals.length }, evidencePointers: ["/rawEventLedger/cold/controller", "/outboundAttemptLedger"] });

  const finalIds = new Set(Object.values(rawEvidence.threeRunEvidence || {}).flatMap((run) => run.finalCandidateIds || []));
  const registryRecords = rawEvidence.candidateRegistry || [];
  const registryIds = new Set(registryRecords.map((item) => item.candidateId));
  const provenanceRecords = rawEvidence.terminalProvenance || [];
  const rankingRecords = rawEvidence.rankingProvenance || [];
  const provenanceIds = setFrom(provenanceRecords);
  const rankingIds = setFrom(rankingRecords);
  const selectedIds = new Set(registryRecords.filter((item) => item.selected === true && item.assemblyExclusion !== true).map((item) => item.candidateId));
  const excludedIds = new Set(registryRecords.filter((item) => item.assemblyExclusion === true || item.selected === false).map((item) => item.candidateId));
  const finalByRun = Object.values(rawEvidence.threeRunEvidence || {}).map((run) => new Set(run.finalCandidateIds || []));
  const partitionObserved = {
    finalExact: finalByRun.length === 3 && finalByRun.every((ids) => stable(sortedSet(ids)) === stable(sortedSet(selectedIds))),
    excludedExact: stable(sortedSet(new Set([...registryIds].filter((id) => excludedIds.has(id))))) === stable(sortedSet(excludedIds)),
    disjoint: [...selectedIds].every((id) => !excludedIds.has(id)),
    registryComplete: selectedIds.size + excludedIds.size === registryIds.size,
    terminalExact: provenanceIds.size === registryIds.size && provenanceRecords.length === provenanceIds.size && stable(sortedSet(provenanceIds)) === stable(sortedSet(registryIds)),
    rankingExact: rankingIds.size === registryIds.size && rankingRecords.length === rankingIds.size && stable(sortedSet(rankingIds)) === stable(sortedSet(registryIds)),
    noExtraneousFinal: [...finalIds].every((id) => registryIds.has(id)),
  };
  makeCheck({ checkId: "V2-009", claim: "candidate registry, final/excluded partition, terminal provenance, and ranking provenance are exact", validationMethod: "independent-ledger-recompute", expected: { finalExact: true, excludedExact: true, disjoint: true, registryComplete: true, terminalExact: true, rankingExact: true, noExtraneousFinal: true }, observed: partitionObserved, structuredEvidence: { registry: registryIds.size, selected: selectedIds.size, excluded: excludedIds.size, final: finalIds.size, provenance: provenanceIds.size, ranking: rankingIds.size }, evidencePointers: ["/candidateRegistry", "/terminalProvenance", "/rankingProvenance", "/threeRunEvidence"] });
  const eventCounts = Object.fromEntries(Object.entries(rawEvidence.rawEventLedger || {}).map(([runMode, run]) => [runMode, (run.observability || []).length]));
  makeCheck({ checkId: "V2-010", claim: "observability event limits remain inside per-run and aggregate ceilings", validationMethod: "independent-ledger-recompute", expected: { perRun: true, aggregate: true }, observed: { perRun: Object.values(eventCounts).every((count) => count <= 512), aggregate: Object.values(eventCounts).reduce((sum, count) => sum + count, 0) <= 1536 }, structuredEvidence: { eventCounts, aggregate: Object.values(eventCounts).reduce((sum, count) => sum + count, 0) }, evidencePointers: ["/rawEventLedger"] });

  const expectedPaths = actualSourceInventory.map((record) => record.relativePath).sort();
  const observedPaths = Object.keys(rawEvidence.sourcePins || {}).sort();
  const claimedPaths = claimedSourceInventory.map((record) => record.relativePath).sort();
  const inventoryMatch = stable(expectedPaths) === stable(observedPaths) && stable(expectedPaths) === stable(claimedPaths) && actualSourceInventory.every((record) => rawEvidence.sourcePins[record.relativePath]?.sha256 === record.sha256 && rawEvidence.sourcePins[record.relativePath]?.byteSize === record.byteSize);
  const requiredSourceGraphDiagnostics = {
    missingRoots: sourceGraph.diagnostics.missingRoots,
    unresolvedLocalImports: sourceGraph.diagnostics.unresolvedLocalImports,
    duplicatePaths: sourceGraph.diagnostics.duplicatePaths,
  };
  const expectedSourceGraphDiagnostics = {
    missingRoots: [],
    unresolvedLocalImports: [],
    duplicatePaths: [],
  };
  const claimedSourceGraphDiagnostics = rawEvidence.sourceInventoryDiagnostics || {};
  const sourceHashesMatch = await sourceHashMismatches(actualSourceInventory, claimedSourceInventory) === 0;
  const sourceGraphDiagnosticsMatch = stable(requiredSourceGraphDiagnostics) === stable({
    missingRoots: claimedSourceGraphDiagnostics.missingRoots || [],
    unresolvedLocalImports: claimedSourceGraphDiagnostics.unresolvedLocalImports || [],
    duplicatePaths: claimedSourceGraphDiagnostics.duplicatePaths || [],
  });
  makeCheck({
    checkId: "V2-011",
    claim: "complete transitive source inventory matches independently read current bytes and has no unresolved local imports",
    validationMethod: "exact-hash-and-structured-pointer",
    expected: { inventoryMatch: true, sourceGraphDiagnostics: expectedSourceGraphDiagnostics },
    observed: { inventoryMatch: inventoryMatch && sourceHashesMatch && stable(requiredSourceGraphDiagnostics) === stable(expectedSourceGraphDiagnostics), sourceGraphDiagnostics: sourceGraphDiagnosticsMatch ? requiredSourceGraphDiagnostics : {
      missingRoots: claimedSourceGraphDiagnostics.missingRoots || [],
      unresolvedLocalImports: claimedSourceGraphDiagnostics.unresolvedLocalImports || [],
      duplicatePaths: claimedSourceGraphDiagnostics.duplicatePaths || [],
    } },
    structuredEvidence: {
      expectedPathCount: expectedPaths.length,
      observedPathCount: observedPaths.length,
      expectedPaths,
      sourceGraphDiagnostics: sourceGraph.diagnostics,
      sourceHashesMatch,
    },
    evidencePointers: ["/sourceInventory", "/sourcePins", "/sourceInventoryDiagnostics"],
  });

  makeCheck({ checkId: "V2-012", claim: "all canonical fixture records have exact disposition, error class, and resource counts", validationMethod: "runtime-negative-fixture", expected: { missing: [], extra: [], duplicate: [], errors: [], countErrors: [], unexpectedPasses: 0 }, observed: { missing: fixture.missing, extra: fixture.extra, duplicate: fixture.duplicate, errors: fixture.errors, countErrors: fixture.countErrors, unexpectedPasses: fixture.unexpectedPasses.length }, structuredEvidence: { manifestCount: fixture.manifestCount, actualCount: fixture.actualCount }, evidencePointers: ["/negativeFixtureRecords"] });
  makeCheck({ checkId: "V2-013", claim: "external governance is explicit without technical authenticity claims", validationMethod: "structured-contract-computation", expected: expected.trustModel, observed: rawEvidence.trustModel, structuredEvidence: { governanceFields: GOVERNANCE_EXECUTION_FIELDS }, evidencePointers: ["/trustModel", "/governanceExecutionContract"] });
  makeCheck({ checkId: "V2-014", claim: "fixed input and request contract are exact", validationMethod: "structured-contract-computation", expected: { fixedInput: FIXED_INPUT, requestContract: { total: 24, list: 8, detail: 16, aggregate: 72, concurrency: 4, retry: 0 } }, observed: { fixedInput: rawEvidence.fixedInput, requestContract: rawEvidence.requestContract }, structuredEvidence: { contractSource: "canonical-expected-contract" }, evidencePointers: ["/fixedInput", "/requestContract"] });
  makeCheck({ checkId: "V2-015", claim: "deterministic fixture execution made no external calls", validationMethod: "controlled-failure-observation", expected: { externalNetworkAttempts: 0, liveTmdbAttempts: 0, browserAttempts: 0, cdpAttempts: 0, serverAttempts: 0, portBinds: 0 }, observed: { externalNetworkAttempts: rawEvidence.rawObservations.externalNetworkAttempts, liveTmdbAttempts: rawEvidence.rawObservations.liveTmdbAttempts, browserAttempts: rawEvidence.rawObservations.browserAttempts, cdpAttempts: rawEvidence.rawObservations.cdpAttempts, serverAttempts: rawEvidence.rawObservations.serverAttempts, portBinds: rawEvidence.rawObservations.portBinds }, structuredEvidence: { dataSource: rawEvidence.dataSource }, evidencePointers: ["/rawObservations"] });
  makeCheck({ checkId: "V2-016", claim: "existing V1 and product mutation observations remain unchanged", validationMethod: "controlled-failure-observation", expected: { existingV1EvidencePreserved: true, productSourceModified: false, productRunnerModified: false }, observed: { existingV1EvidencePreserved: rawEvidence.rawObservations.existingV1EvidencePreserved, productSourceModified: rawEvidence.rawObservations.productSourceModified, productRunnerModified: rawEvidence.rawObservations.productRunnerModified }, structuredEvidence: { mutationScope: "V2-only" }, evidencePointers: ["/rawObservations"] });
  makeCheck({ checkId: "V2-017", claim: "warm requests are cache hits with zero attempts and consumption", validationMethod: "independent-ledger-recompute", expected: { attemptCount: 0, consumptionCount: 0, cacheRelation: "HIT" }, observed: { attemptCount: attempts.filter((attempt) => attempt.runMode !== "cold").length, consumptionCount: controllerEvents.filter((event) => event.type === "governance-consumption" && event.runMode !== "cold").length, cacheRelation: logical.filter((record) => record.runMode !== "cold").every((record) => record.cacheRelation === "HIT") ? "HIT" : "UNKNOWN" }, structuredEvidence: { warmLogicalCount: logical.filter((record) => record.runMode !== "cold").length }, evidencePointers: ["/logicalRequestLedger", "/rawEventLedger/warm-prime/lifecycle", "/rawEventLedger/warm-measure/lifecycle"] });

  const futureOutput = rawEvidence.outputIntegrity || {};
  makeCheck({ checkId: "V2-018", claim: "future live output is fixed to the Correction-7 writer root and stem", validationMethod: "structured-contract-computation", expected: { root: V2_EVIDENCE_ROOT, fileStem: V2_EVIDENCE_FILE_STEM, writer: "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs", collisionChecked: true, directFinalWrite: false, existingDestinationDeleted: false }, observed: { root: futureOutput.futureLiveRootRelative, fileStem: futureOutput.futureLiveFileStem, writer: futureOutput.futureLiveWriter, collisionChecked: futureOutput.collisionChecked === true, directFinalWrite: futureOutput.directFinalWrite, existingDestinationDeleted: futureOutput.existingDestinationDeleted }, structuredEvidence: { liveWriterNotInvoked: rawEvidence.dataSource === "DETERMINISTIC_FIXTURE", outputIntegrity: futureOutput }, evidencePointers: ["/outputIntegrity", "/governanceExecutionContract"] });
  const captureExpectation = rawEvidence.dataSource === "DETERMINISTIC_FIXTURE" ? { source: "fixture-transport", captured: false } : { source: "sealed-transport-response-clone", captured: true };
  const captureObserved = rawEvidence.dataSource === "DETERMINISTIC_FIXTURE" ? { source: "fixture-transport", captured: (rawEvidence.listPayloadCaptures || []).length > 0 } : { source: "sealed-transport-response-clone", captured: (rawEvidence.listPayloadCaptures || []).length > 0 };
  makeCheck({ checkId: "V2-019", claim: "list payload source is mode-specific and cannot silently reuse fixture calls in live mode", validationMethod: "exported-api-shape-and-behavior", expected: captureExpectation, observed: captureObserved, structuredEvidence: { captureCount: (rawEvidence.listPayloadCaptures || []).length, runModes: Object.keys(rawEvidence.threeRunEvidence || {}) }, evidencePointers: ["/listPayloadCaptures", "/threeRunEvidence"] });
  const qualityBeforeMeta = calculateMeta(checks, pointerFailures(checks, { ...rawEvidence, negativeFixtureRecords: records }), 0);
  makeCheck({ checkId: "V2-020", claim: "validator meta-quality metrics are calculated from check records", validationMethod: "independent-ledger-recompute", expected: { stringOnlyPasses: 0, selfConfirmingPasses: 0, duplicateCheckIds: 0, duplicatePredicateIds: 0 }, observed: { stringOnlyPasses: qualityBeforeMeta.stringOnlyPasses, selfConfirmingPasses: qualityBeforeMeta.selfConfirmingPasses, duplicateCheckIds: qualityBeforeMeta.duplicateCheckIds, duplicatePredicateIds: qualityBeforeMeta.duplicatePredicateIds }, structuredEvidence: { checkCountBeforeMeta: checks.length }, evidencePointers: ["/negativeFixtureRecords", "/sourceInventory"] });

  const registryProviderIds = new Set(registryRecords.map((item) => item.providerId).filter((id) => id !== undefined && id !== null));
  const causality = diagnosticCausality(rawEvidence, registryProviderIds);
  makeCheck({ checkId: "V2-021", claim: "provider diagnostics, requested pages, captured list responses, and candidate IDs are causally linked per run", validationMethod: "independent-ledger-recompute", expected: true, observed: causality.pass, structuredEvidence: causality, evidencePointers: ["/providerTotalResultsByTask", "/fetchedPagesByTask", "/capturedListResponses", "/candidateRegistry"] });

  const unresolvedPointers = pointerFailures(checks, { ...rawEvidence, negativeFixtureRecords: records });
  const sourceMismatches = await sourceHashMismatches(actualSourceInventory, claimedSourceInventory);
  const meta = calculateMeta(checks, unresolvedPointers, sourceMismatches);
  return {
    total: checks.length,
    passed: checks.filter((check) => check.verdict === "PASS").length,
    failed: checks.filter((check) => check.verdict !== "PASS").length,
    checks,
    meta,
    status: checks.every((check) => check.verdict === "PASS") && Object.values(meta).every((value) => value === 0) ? "PASS" : "FAIL",
  };
}

export const validateArchitectureEvidence = validateExternalGovernanceEvidence;

export function requiredCheckFields() {
  return [...REQUIRED_CHECK_FIELDS];
}
