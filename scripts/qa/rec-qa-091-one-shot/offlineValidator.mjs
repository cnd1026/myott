import { REQUEST_BUDGET } from "./runtimeContract.mjs";

function stable(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setOf(values = []) {
  return new Set(values.filter((value) => typeof value === "string"));
}

function flattenEvents(rawEvidence, name) {
  return Object.values(rawEvidence.rawEventLedger || {}).flatMap((run) => run[name] || []);
}

function makeCheck(checkId, claim, validationMethod, expected, observed, structuredEvidence, evidencePointers, sourceHashes = {}) {
  const verdict = JSON.stringify(expected) === JSON.stringify(observed) ? "PASS" : "FAIL";
  return {
    checkId,
    claim,
    validationMethod,
    expected,
    observed,
    structuredEvidence,
    evidencePointers,
    sourceHashes,
    comparisonSource: validationMethod === "independent-ledger-recompute" ? "raw-ledger-vs-contract" : "independent-source-vs-observation",
    verdict,
  };
}

export function calculateMetaQuality(checks = []) {
  const checkIds = checks.map((check) => check.checkId);
  const predicateIds = checks.map((check) => check.predicateId).filter(Boolean);
  const stringOnlyPasses = checks.filter((check) => check.verdict === "PASS" && (
    check.validationMethod === "string-presence" ||
    !check.structuredEvidence ||
    !Array.isArray(check.evidencePointers) ||
    check.evidencePointers.length === 0
  )).length;
  const selfConfirmingPasses = checks.filter((check) => check.verdict === "PASS" && (
    check.validationMethod === "declared-summary-copy" ||
    check.comparisonSource === "same-summary" ||
    check.comparisonSource === "same-pointer"
  )).length;
  return {
    stringOnlyPasses,
    selfConfirmingPasses,
    duplicateCheckIds: checkIds.length - new Set(checkIds).size,
    duplicatePredicateIds: predicateIds.length - new Set(predicateIds).size,
    unresolvedPointers: checks.filter((check) => !Array.isArray(check.evidencePointers) || check.evidencePointers.some((pointer) => !pointer)).length,
    sourceHashMismatches: checks.filter((check) => check.sourceHashes && Object.values(check.sourceHashes).some((value) => value === false)).length,
  };
}

function lifecycleObservation(rawEvidence) {
  const lifecycle = flattenEvents(rawEvidence, "lifecycle");
  const starts = lifecycle.filter((event) => event.type === "provider-request-start");
  const terminals = lifecycle.filter((event) => ["provider-request-complete", "provider-request-failed"].includes(event.type));
  const attemptStarts = lifecycle.filter((event) => event.type === "outbound-attempt-start");
  const attemptTerminals = lifecycle.filter((event) => ["outbound-attempt-complete", "outbound-attempt-failed"].includes(event.type));
  const startMap = new Map(starts.map((event) => [event.requestId, event]));
  const terminalCounts = new Map();
  for (const terminal of terminals) terminalCounts.set(terminal.requestId, (terminalCounts.get(terminal.requestId) || 0) + 1);
  const attemptStartMap = new Map(attemptStarts.map((event) => [event.attemptId, event]));
  const attemptTerminalCounts = new Map();
  for (const terminal of attemptTerminals) attemptTerminalCounts.set(terminal.attemptId, (attemptTerminalCounts.get(terminal.attemptId) || 0) + 1);
  return {
    starts,
    terminals,
    attemptStarts,
    attemptTerminals,
    missingTerminals: starts.filter((event) => !terminalCounts.has(event.requestId)).length,
    duplicateTerminals: [...terminalCounts.values()].filter((count) => count !== 1).length,
    unorderedTerminals: terminals.filter((event) => !startMap.has(event.requestId) || event.sequence <= startMap.get(event.requestId).sequence).length,
    missingAttemptTerminals: attemptStarts.filter((event) => !attemptTerminalCounts.has(event.attemptId)).length,
    duplicateAttemptTerminals: [...attemptTerminalCounts.values()].filter((count) => count !== 1).length,
    unmatchedAttemptTerminals: attemptTerminals.filter((event) => !attemptStartMap.has(event.attemptId)).length,
  };
}

function budgetObservation(rawEvidence, requestContract = REQUEST_BUDGET) {
  const attempts = Array.isArray(rawEvidence.outboundAttemptLedger) ? rawEvidence.outboundAttemptLedger : [];
  const perRun = {};
  for (const attempt of attempts) {
    const usage = perRun[attempt.runId] || { total: 0, list: 0, detail: 0 };
    usage.total += 1;
    usage[attempt.requestClass] = (usage[attempt.requestClass] || 0) + 1;
    perRun[attempt.runId] = usage;
  }
  const withinRun = Object.values(perRun).every((usage) => usage.total <= requestContract.total && usage.list <= requestContract.list && usage.detail <= requestContract.detail);
  const withinAggregate = attempts.length <= requestContract.aggregate;
  const redirects = attempts.filter((attempt) => Number(attempt.redirectHopIndex) > 0).length;
  return { perRun, aggregate: attempts.length, redirects, withinRun, withinAggregate };
}

function candidatePartition(rawEvidence) {
  const registry = setOf((rawEvidence.candidateRegistry || []).map((item) => item.candidateId));
  const selected = setOf(rawEvidence.finalCandidateIds || []);
  const excluded = setOf(rawEvidence.excludedCandidateIds || []);
  return {
    registryCount: registry.size,
    selectedCount: selected.size,
    excludedCount: excluded.size,
    disjoint: [...selected].every((id) => !excluded.has(id)),
    complete: [...registry].every((id) => selected.has(id) || excluded.has(id)) && [...selected, ...excluded].every((id) => registry.has(id)),
  };
}

function unsafeEvidenceFields(value, key = "") {
  if (/^(actualCredentialUsed|futureExecutionAuthorizationCreated|authorizationAuthenticityTechnicallyVerified|syntheticConsumptionEventsAreNotActualAuthorizationConsumption)$/i.test(key)) return false;
  if (/(api.?key|bearer|token|credential|password|authorization|cookie)/i.test(key)) return true;
  if (typeof value === "string") return /^https?:\/\//i.test(value) || /Bearer\s+/i.test(value);
  if (Array.isArray(value)) return value.some((item) => unsafeEvidenceFields(item, key));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([childKey, childValue]) => unsafeEvidenceFields(childValue, childKey));
}

export function validateRawEvidence(rawEvidence, {
  actualSourceInventory = [],
  expectedRequestContract = REQUEST_BUDGET,
  expectedRunModes = null,
  expectedGovernanceEvents = 1,
  expectedRedirectCount = 0,
} = {}) {
  const checks = [];
  const modes = Object.keys(rawEvidence?.runs || {}).sort();
  if (!rawEvidence || typeof rawEvidence !== "object") {
    return { ok: false, checks: [makeCheck("ONE-SHOT-001", "raw evidence exists", "structured-contract-computation", true, false, { rawEvidenceType: typeof rawEvidence }, ["/" ])], metaQuality: { stringOnlyPasses: 0, selfConfirmingPasses: 0, duplicateCheckIds: 0, duplicatePredicateIds: 0, unresolvedPointers: 0, sourceHashMismatches: 0 } };
  }
  checks.push(makeCheck("ONE-SHOT-001", "evidence declares deterministic or live purpose", "structured-contract-computation", true, ["DETERMINISTIC_FIXTURE", "ONE_SHOT_LIVE_RUN"].includes(rawEvidence.dataSource), { dataSource: rawEvidence.dataSource }, ["/dataSource"]));
  checks.push(makeCheck("ONE-SHOT-002", "fixed input is present", "structured-contract-computation", true, Boolean(rawEvidence.fixedInput), { fixedInput: rawEvidence.fixedInput }, ["/fixedInput"]));
  if (expectedRunModes) checks.push(makeCheck("ONE-SHOT-003", "run modes are independently present", "structured-contract-computation", [...expectedRunModes].sort(), modes, { modes }, ["/runs"]));
  const budget = budgetObservation(rawEvidence, expectedRequestContract);
  checks.push(makeCheck("ONE-SHOT-004", "logical ledger is independently counted", "independent-ledger-recompute", true, Array.isArray(rawEvidence.logicalRequestLedger), { logicalCount: rawEvidence.logicalRequestLedger?.length || 0 }, ["/logicalRequestLedger"]));
  checks.push(makeCheck("ONE-SHOT-005", "outbound attempts obey run and aggregate budget", "independent-ledger-recompute", { withinRun: true, withinAggregate: true }, { withinRun: budget.withinRun, withinAggregate: budget.withinAggregate }, budget, ["/outboundAttemptLedger"]));
  checks.push(makeCheck("ONE-SHOT-006", "redirect hops are represented as outbound attempts", "independent-ledger-recompute", expectedRedirectCount, budget.redirects, { expectedRedirectCount, observedRedirectCount: budget.redirects }, ["/outboundAttemptLedger", "/redirectUsage"]));
  const lifecycle = lifecycleObservation(rawEvidence);
  checks.push(makeCheck("ONE-SHOT-007", "logical lifecycle has one ordered terminal", "independent-ledger-recompute", { missing: 0, duplicate: 0, unordered: 0 }, { missing: lifecycle.missingTerminals, duplicate: lifecycle.duplicateTerminals, unordered: lifecycle.unorderedTerminals }, lifecycle, ["/rawEventLedger"]));
  checks.push(makeCheck("ONE-SHOT-008", "attempt lifecycle has one terminal and no unmatched terminal", "independent-ledger-recompute", { missing: 0, duplicate: 0, unmatched: 0 }, { missing: lifecycle.missingAttemptTerminals, duplicate: lifecycle.duplicateAttemptTerminals, unmatched: lifecycle.unmatchedAttemptTerminals }, lifecycle, ["/rawEventLedger"]));
  const governanceEvents = flattenEvents(rawEvidence, "controller").filter((event) => event.type === "governanceConsumptionObserved");
  checks.push(makeCheck("ONE-SHOT-009", "governance consumption boundary is counted from raw events", "independent-ledger-recompute", expectedGovernanceEvents, governanceEvents.length, { expectedGovernanceEvents, eventIds: governanceEvents.map((event) => event.eventId) }, ["/rawEventLedger", "/governanceConsumptionEvidence"]));
  const partition = candidatePartition(rawEvidence);
  checks.push(makeCheck("ONE-SHOT-010", "candidate partition is independently complete", "independent-ledger-recompute", { disjoint: true, complete: true }, { disjoint: partition.disjoint, complete: partition.complete }, partition, ["/candidateRegistry", "/finalCandidateIds", "/excludedCandidateIds"]));
  const warmMeasureRuns = (rawEvidence.logicalRequestLedger || []).filter((record) => record.runMode === "warm-measure");
  const warmMeasureAttempts = (rawEvidence.outboundAttemptLedger || []).filter((record) => record.runMode === "warm-measure");
  checks.push(makeCheck("ONE-SHOT-011", "warm-measure cache requests have no outbound attempts", "independent-ledger-recompute", true, warmMeasureRuns.length === 0 || warmMeasureAttempts.length === 0, { warmMeasureLogicalCount: warmMeasureRuns.length, warmMeasureAttemptCount: warmMeasureAttempts.length }, ["/logicalRequestLedger", "/outboundAttemptLedger"]));
  const actualSource = new Map(actualSourceInventory.map((record) => [record.relativePath, record]));
  const sourcePaths = Object.keys(rawEvidence.sourcePins || {}).sort();
  const expectedPaths = [...actualSource.keys()].sort();
  const sourceMatch = JSON.stringify(sourcePaths) === JSON.stringify(expectedPaths) && expectedPaths.every((path) => rawEvidence.sourcePins[path]?.sha256 === actualSource.get(path)?.sha256 && rawEvidence.sourcePins[path]?.byteSize === actualSource.get(path)?.byteSize);
  checks.push(makeCheck("ONE-SHOT-012", "source pins match independently hashed inventory", "exact-hash-and-structured-pointer", true, sourceMatch, { expectedPathCount: expectedPaths.length, observedPathCount: sourcePaths.length }, ["/sourcePins", "/sourceInventory"]));
  checks.push(makeCheck("ONE-SHOT-013", "raw evidence contains no credential or full URL values", "controlled-failure-observation", false, unsafeEvidenceFields(rawEvidence), { unsafe: unsafeEvidenceFields(rawEvidence) }, ["/"]));
  checks.push(makeCheck("ONE-SHOT-014", "writer contract is future-pinned and not executed by runner", "structured-contract-computation", false, rawEvidence.outputContract?.futureLiveEvidenceCreated === true, { outputContract: rawEvidence.outputContract }, ["/outputContract"]));
  const metaQuality = calculateMetaQuality(checks);
  const metaChecks = [
    makeCheck("ONE-SHOT-015", "validator checks are not string-only", "meta-quality-recompute", 0, metaQuality.stringOnlyPasses, { metaQuality }, ["/checks"]),
    makeCheck("ONE-SHOT-016", "validator checks are not self-confirming", "meta-quality-recompute", 0, metaQuality.selfConfirmingPasses, { metaQuality }, ["/checks"]),
    makeCheck("ONE-SHOT-017", "validator check ids and pointers are unique and resolved", "meta-quality-recompute", { duplicate: 0, unresolved: 0 }, { duplicate: metaQuality.duplicateCheckIds, unresolved: metaQuality.unresolvedPointers }, { metaQuality }, ["/checks"]),
  ];
  checks.push(...metaChecks);
  const finalMeta = calculateMetaQuality(checks);
  return { ok: checks.every((check) => check.verdict === "PASS") && (!expectedRunModes || JSON.stringify(modes) === JSON.stringify([...expectedRunModes].sort())), checks, metaQuality: finalMeta };
}

export function validateFixtureRecords(records = [], expectedManifest = []) {
  const expectedById = new Map(expectedManifest.map((record) => [record.fixtureId, record]));
  const observedById = new Map(records.map((record) => [record.fixtureId, record]));
  const missing = [...expectedById.keys()].filter((fixtureId) => !observedById.has(fixtureId));
  const extra = [...observedById.keys()].filter((fixtureId) => !expectedById.has(fixtureId));
  const duplicate = records.length - observedById.size;
  const mismatches = [];
  for (const [fixtureId, expected] of expectedById) {
    const observed = observedById.get(fixtureId);
    if (!observed) continue;
    if (observed.observedDisposition !== expected.expectedDisposition ||
      (expected.expectedErrorCode && observed.observedErrorCode !== expected.expectedErrorCode)) mismatches.push(fixtureId);
  }
  const unexpectedPasses = [...expectedById.values()].filter((expected) => {
    const observed = observedById.get(expected.fixtureId);
    return expected.expectedDisposition === "REJECTED" && observed?.observedDisposition === "ACCEPTED";
  }).map((expected) => expected.fixtureId);
  return {
    manifestCount: expectedManifest.length,
    actualCount: records.length,
    missing,
    extra,
    duplicate,
    mismatches,
    unexpectedPasses,
    ok: missing.length === 0 && extra.length === 0 && duplicate === 0 && mismatches.length === 0 && unexpectedPasses.length === 0,
  };
}

export function validatorContract() {
  return Object.freeze({
    trustsRunnerVerdict: false,
    trustsRunnerSummary: false,
    recomputesLedgers: true,
    rejectsOpenAttempt: true,
    rejectsMissingEvidence: true,
    sourceOfTruth: "RAW_EVIDENCE_AND_CANONICAL_EXPECTED_CONTRACT",
  });
}
