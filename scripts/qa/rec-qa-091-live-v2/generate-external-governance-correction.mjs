import { readFile } from "node:fs/promises";
import { assembleExternalGovernanceEvidence, v2EvidenceOutputContract, writeImmutableV2Evidence, writeImmutableV2EvidenceForTest } from "./evidenceAssembler.mjs";
import { collectOfflinePreflightEvidence, runOfflineFixtureForArchitecture } from "./entrypoint.mjs";
import { validateExternalGovernanceEvidence } from "./independentValidator.mjs";
import { createSyntheticLiveInput } from "./inputContract.mjs";
import { createSyntheticGovernanceExecutionContract } from "./authorizationContract.mjs";
import { runNegativeFixtureSuite } from "./negativeFixtures.mjs";
import { collectV2SourceGraph } from "./sourceInventory.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sourceGraph = await collectV2SourceGraph();
const sourceInventory = sourceGraph.records;
const finalEvidenceStem = process.env.MYOTT_V2_FINAL_EVIDENCE_STEM || "live-entrypoint-v2-final-evidence-boundary-correction-1-final";
const sourcePins = Object.fromEntries(sourceInventory.map((record) => [record.relativePath, { sha256: record.sha256, byteSize: record.byteSize }]));
const governanceExecutionContract = createSyntheticGovernanceExecutionContract({ sourcePins });
const validInput = createSyntheticLiveInput({ governanceExecutionContract });
const preflightEvidence = await collectOfflinePreflightEvidence();
const preflightNegativeRecords = preflightEvidence
  .filter((record) => record.fixtureId !== "valid-offline")
  .map((record) => ({
    fixtureId: `preflight-${record.fixtureId}`,
    category: "Preflight Ordering",
    inputMutation: record.fixtureId,
    expectedDisposition: "REJECTED",
    observedDisposition: record.disposition,
    observedErrorCode: record.errorCode || null,
    bindingCount: record.bindingCount,
    attemptCount: record.attemptCount,
    consumptionEventCount: record.consumptionEventCount,
    observed: { trace: record.trace },
    verdict: record.disposition === "REJECTED" ? "PASS" : "FAIL",
  }));
const negativeFixtureRecords = [
  ...preflightNegativeRecords,
  ...(await runNegativeFixtureSuite({ validInput, governanceExecutionContract })),
];
const execution = await runOfflineFixtureForArchitecture();
execution.preflightEvidence = preflightEvidence;
execution.negativeFixtureRecords = negativeFixtureRecords;
execution.sourceInventoryDiagnostics = sourceGraph.diagnostics;
execution.validationPurpose = "LIVE_V2_FINAL_EVIDENCE_AND_BOUNDARY_CORRECTION_V1";

const tempRoot = await mkdtemp(join(tmpdir(), "myott-v2-output-contract-"));
let outputIntegrity;
try {
  const first = await writeImmutableV2EvidenceForTest({ root: tempRoot, stem: "race-sentinel", value: { version: 1 } });
  let collisionCode = null;
  try { await writeImmutableV2EvidenceForTest({ root: tempRoot, stem: "race-sentinel", value: { version: 2 } }); } catch (error) { collisionCode = error.message; }
  let traversalCode = null;
  try { await writeImmutableV2EvidenceForTest({ root: tempRoot, stem: "../escape", value: { version: 1 } }); } catch (error) { traversalCode = error.message; }
  outputIntegrity = {
    writerContract: "correction-7-immutable-no-clobber-compatible",
    rootRelative: v2EvidenceOutputContract().rootRelative,
    fileStem: finalEvidenceStem,
    existingDestinationDeleted: false,
    directFinalWrite: false,
    futureLiveRootRelative: "qa-evidence/REC-QA-091/OBSERVABILITY_V1",
    futureLiveFileStem: "rec-qa-091-live-probe-v2-external-governance-run-1-final",
    futureLiveWriter: "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs",
    collisionChecked: true,
    publishedFinalEvidence: false,
    raceSentinelPreserved: first.sha256,
    existingDestinationRejection: collisionCode,
    traversalRejection: traversalCode,
  };
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

const rawEvidence = assembleExternalGovernanceEvidence({ ...execution, outputIntegrity }, sourceInventory, sourceGraph.diagnostics);
const independentValidation = await validateExternalGovernanceEvidence(rawEvidence, {
  sourceInventory,
  negativeFixtureRecords,
});
if (independentValidation.status !== "PASS") {
  throw new Error(`V2_EXTERNAL_GOVERNANCE_VALIDATION_FAILED:${JSON.stringify({ failed: independentValidation.failed, meta: independentValidation.meta })}`);
}

const finalEvidence = {
  ...rawEvidence,
  outputIntegrity,
  independentValidation,
  evidenceStatus: "INDEPENDENT_VALIDATION_PASS",
  finalStatus: "REC_QA_091_LIVE_V2_FINAL_EVIDENCE_AND_BOUNDARY_CORRECTION_IMPLEMENTED_AND_VALIDATED",
};
const written = await writeImmutableV2Evidence(finalEvidence, finalEvidenceStem);
const persisted = JSON.parse(await readFile(written.path, "utf8"));
console.log(JSON.stringify({
  path: written.path,
  sha256: written.sha256,
  byteSize: written.byteSize,
  sourceInventoryCount: sourceInventory.length,
  negativeFixtureCount: negativeFixtureRecords.length,
  independentValidation: { total: independentValidation.total, passed: independentValidation.passed, failed: independentValidation.failed, meta: independentValidation.meta },
  runs: execution.runs.map((run) => ({ runMode: run.runMode, logical: run.logicalRequestLedger.length, outbound: run.outboundAttemptLedger.length })),
  persistedKeys: Object.keys(persisted).length,
}));
