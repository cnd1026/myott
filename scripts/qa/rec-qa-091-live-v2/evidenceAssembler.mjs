import { createHash } from "node:crypto";
import { access, link, lstat, mkdir, open, realpath, stat, unlink } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  CORRECTION_7_EVIDENCE_SHA256,
  LIVE_CONSUMPTION_BOUNDARY,
  TECHNICAL_SINGLE_CONSUMPTION_SCOPE,
  TRUST_AUTHORITY,
} from "./authorizationContract.mjs";
import {
  FIXED_INPUT,
  OUTPUT_CONTRACT,
  V2_ARCHITECTURE_VERSION,
  V2_CORRECTION_EVIDENCE_FILE_STEM,
  V2_CORRECTION_EVIDENCE_ROOT,
  V2_EVIDENCE_FILE_STEM,
  V2_EVIDENCE_ROOT,
  V2_FINDING_ID,
  V2_TASK_ID,
} from "./inputContract.mjs";
import { collectV2SourceInventory, collectV2SourcePins } from "./sourceInventory.mjs";
import {
  resolveObservabilityEvidenceOutput,
  writeImmutableObservabilityEvidence,
} from "../../../src/lib/recommendation/qa/tmdbObservabilityOutput.mjs";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const EVIDENCE_ROOT_RELATIVE = V2_CORRECTION_EVIDENCE_ROOT;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function correctionEvidenceRoot() {
  const localAppData = process.env.LOCALAPPDATA || resolve(homedir(), "AppData", "Local");
  return resolve(localAppData, "MyOTT", "qa-evidence", "REC-QA-091", "LIVE_ENTRYPOINT_ARCHITECTURE_V2");
}

function assertSafeStem(stem) {
  if (typeof stem !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(stem) || stem.includes("..")) {
    throw new TypeError("LIVE_V2_EVIDENCE_FILE_STEM_INVALID");
  }
}

function assertContained(root, target) {
  const relation = relative(root, target);
  if (!relation || relation.startsWith("..") || isAbsolute(relation)) throw new TypeError("LIVE_V2_EVIDENCE_OUTPUT_OUTSIDE_ROOT");
}

async function assertRealContainedRoot(root) {
  const normalizedRoot = resolve(root);
  try {
    await mkdir(normalizedRoot, { recursive: true });
  } catch (error) {
    if (error?.code === "EEXIST") throw new TypeError("LIVE_V2_EVIDENCE_ROOT_REPARSE_POINT");
    throw error;
  }
  const rootStat = await lstat(normalizedRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new TypeError("LIVE_V2_EVIDENCE_ROOT_REPARSE_POINT");
  const resolvedRoot = await realpath(normalizedRoot);
  if (resolvedRoot.toLowerCase() !== normalizedRoot.toLowerCase()) throw new TypeError("LIVE_V2_EVIDENCE_ROOT_REPARSE_POINT");
  return normalizedRoot;
}

export function resolveV2EvidenceOutput(stem = V2_CORRECTION_EVIDENCE_FILE_STEM, root = correctionEvidenceRoot()) {
  assertSafeStem(stem);
  const normalizedRoot = resolve(root);
  const target = resolve(normalizedRoot, `${stem}.json`);
  assertContained(normalizedRoot, target);
  return target;
}

export async function writeImmutableV2Evidence(value, stem = V2_CORRECTION_EVIDENCE_FILE_STEM) {
  return writeImmutableV2EvidenceForTest({ value, stem, root: correctionEvidenceRoot() });
}

export async function writeImmutableV2EvidenceForTest({ value, stem, root, beforePublish = null }) {
  const normalizedRoot = await assertRealContainedRoot(root);
  const target = resolveV2EvidenceOutput(stem, normalizedRoot);
  try {
    await lstat(target);
    throw new Error("LIVE_V2_EVIDENCE_DESTINATION_EXISTS");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const bytes = Buffer.from(JSON.stringify(value), "utf8");
  const temporary = resolve(normalizedRoot, `.${stem}.${process.pid}.${Date.now()}.tmp`);
  assertContained(normalizedRoot, temporary);
  const temporaryDirectory = await realpath(dirname(temporary));
  if (temporaryDirectory.toLowerCase() !== normalizedRoot.toLowerCase()) throw new TypeError("LIVE_V2_EVIDENCE_ROOT_REPARSE_POINT");
  let handle;
  let linked = false;
  try {
    handle = await open(temporary, "wx");
    await handle.write(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    if (beforePublish) await beforePublish(target, temporary);
    await link(temporary, target);
    linked = true;
    return { path: target, sha256: hashBytes(bytes), byteSize: bytes.byteLength };
  } finally {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporary).catch(() => {});
  }
}

export async function resolveFutureV2LiveEvidenceOutput() {
  return resolveObservabilityEvidenceOutput(V2_EVIDENCE_FILE_STEM);
}

export async function writeFutureV2LiveEvidence(value) {
  return writeImmutableObservabilityEvidence(V2_EVIDENCE_FILE_STEM, value);
}

function runSummary(run) {
  const parsedLedger = JSON.parse(run.ledger);
  return {
    runId: run.runId,
    runMode: run.runMode,
    cache: clone(run.result.traceSummary.cache),
    candidateUniverseSource: run.result.traceSummary.candidateUniverseSource,
    finalCandidateIds: clone(run.result.finalCandidateIds),
    requestBudget: clone(run.result.traceSummary.requestBudget),
    eventCount: parsedLedger.events.length,
    bindingInvocationCount: run.bindingInvocationCount,
    calls: run.mode === "fixture" ? clone(run.calls || []) : undefined,
    listPayload: clone(run.listPayload),
    listPayloadCaptures: clone(run.listPayloadCaptures || []),
    capturedListResponses: clone(run.capturedListResponses || []),
    providerTotalResultsByTask: clone(run.productDiagnostics?.providerTotalResultsByTask || {}),
    fetchedPagesByTask: clone(run.productDiagnostics?.fetchedPagesByTask || {}),
  };
}

function unionById(records) {
  const seen = new Set();
  return records.filter((record) => {
    const id = record?.candidateId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function assembleExternalGovernanceEvidence(execution, sourceInventory = [], sourceInventoryDiagnostics = null) {
  const runs = execution.runs || [];
  const allAttempts = runs.flatMap((run) => run.outboundAttemptLedger || []);
  const allLogical = runs.flatMap((run) => run.logicalRequestLedger.map((logical) => {
    const requestAttempts = allAttempts.filter((attempt) => attempt.logicalRequestId === logical.logicalRequestId);
    return {
      ...logical,
      redirectCount: requestAttempts.filter((attempt) => attempt.redirectHopIndex > 0).length,
      outboundAttemptIds: requestAttempts.map((attempt) => attempt.attemptId),
    };
  }));
  const sourcePins = Object.fromEntries(sourceInventory.map((record) => [record.relativePath, {
    sha256: record.sha256,
    byteSize: record.byteSize,
  }]));
  const governanceExecutionContract = clone(execution.governanceExecutionContract || {});
  const controllerEvents = runs.flatMap((run) => run.controllerEvents || []);
  const integratedRunId = execution.integratedRunId || "REC-QA-091-V2-INTEGRATED-RUN";
  return {
    schemaVersion: "myott.qa.live-entrypoint.v2.external-governance-minimal-correction",
    architectureVersion: V2_ARCHITECTURE_VERSION,
    taskId: V2_TASK_ID,
    findingId: V2_FINDING_ID,
    integratedRunId,
    governanceDecisionId: governanceExecutionContract.governanceDecisionId || null,
    executionAuthorizationId: governanceExecutionContract.executionAuthorizationId || null,
    consumptionBoundary: governanceExecutionContract.consumptionBoundary || null,
    dataSource: execution.mode === "live" ? "LIVE_TMDB" : "DETERMINISTIC_FIXTURE",
    validationPurpose: execution.validationPurpose || "LIVE_V2_MINIMAL_CORRECTION_V1",
    trustModel: {
      authorizationTrustModel: TRUST_AUTHORITY,
      authorizationAuthenticityTechnicallyVerified: false,
      authorizationAuthenticityAuthority: "FOUNDER_HQ_PROCEDURE",
      technicalSingleConsumptionScope: TECHNICAL_SINGLE_CONSUMPTION_SCOPE,
      processRestartReuseTechnicallyPrevented: false,
    },
    sourceInventory: clone(sourceInventory),
    sourceInventoryDiagnostics: clone(sourceInventoryDiagnostics || execution.sourceInventoryDiagnostics || {
      missingRoots: [],
      unresolvedLocalImports: [],
      duplicatePaths: [],
      dynamicImports: [],
      nodeBuiltinImports: [],
      externalImports: [],
    }),
    sourcePins,
    runtimePins: clone(execution.runtimePins || { node: "NOT_EXECUTED", browser: "NOT_EXECUTED" }),
    fixedInput: clone(execution.fixedInput || FIXED_INPUT),
    governanceExecutionContract,
    governanceConsumptionEvidence: clone(execution.governanceConsumptionEvidence || controllerEvents.filter((event) => event.type === "governance-consumption")),
    requestContract: {
      total: OUTPUT_CONTRACT.requestBudget.total,
      list: OUTPUT_CONTRACT.requestBudget.list,
      detail: OUTPUT_CONTRACT.requestBudget.detail,
      aggregate: OUTPUT_CONTRACT.requestBudget.aggregate,
      concurrency: OUTPUT_CONTRACT.concurrency,
      retry: OUTPUT_CONTRACT.retry,
    },
    eventContract: {
      logicalStartType: "provider-request-start",
      logicalTerminalTypes: ["provider-request-complete", "provider-request-failed"],
      attemptStartType: "outbound-attempt-start",
      attemptTerminalTypes: ["outbound-attempt-complete", "outbound-attempt-failed"],
      maximumRedirectHops: 3,
    },
    preflightEvidence: clone(execution.preflightEvidence || []),
    negativeFixtureRecords: clone(execution.negativeFixtureRecords || []),
    threeRunEvidence: Object.fromEntries(runs.map((run) => [run.runMode, runSummary(run)])),
    logicalRequestLedger: allLogical.map(clone),
    outboundAttemptLedger: allAttempts.map(clone),
    rawEventLedger: Object.fromEntries(runs.map((run) => [run.runMode, {
      observability: JSON.parse(run.ledger).events,
      lifecycle: clone(run.lifecycleEvents),
      controller: clone(run.controllerEvents || []),
    }])),
    listPayloadCaptures: clone(runs.flatMap((run) => run.listPayloadCaptures || [])),
    capturedListResponses: clone(runs.flatMap((run) => run.capturedListResponses || [])),
    providerTotalResultsByTask: Object.fromEntries(runs.map((run) => [run.runMode, clone(run.productDiagnostics?.providerTotalResultsByTask || {})])),
    fetchedPagesByTask: Object.fromEntries(runs.map((run) => [run.runMode, clone(run.productDiagnostics?.fetchedPagesByTask || {})])),
    candidateRegistry: unionById(runs.flatMap((run) => run.candidateRegistry || [])).map(clone),
    terminalProvenance: unionById(runs.flatMap((run) => run.terminalProvenance || [])).map(clone),
    rankingProvenance: unionById(runs.flatMap((run) => run.rankingProvenance || [])).map(clone),
    cacheEvidence: Object.fromEntries(runs.map((run) => [run.runMode, {
      cache: clone(run.result.traceSummary.cache),
      calls: (run.calls || []).map(({ path }) => path),
      requestDiagnostics: {
        requestsUsed: run.result.productSnapshot.requestPlan.requestsUsed,
        cacheHits: run.result.productSnapshot.cache.cacheHits,
      },
      logicalRequests: run.logicalRequestLedger.map(clone),
    }])),
    outputIntegrity: clone(execution.outputIntegrity || {
      writerContract: "correction-7-immutable-no-clobber-compatible",
      rootRelative: EVIDENCE_ROOT_RELATIVE,
      fileStem: V2_CORRECTION_EVIDENCE_FILE_STEM,
      callerAbsoluteOutput: false,
      existingDestinationDeleted: false,
      directFinalWrite: false,
      futureLiveRootRelative: V2_EVIDENCE_ROOT,
      futureLiveFileStem: V2_EVIDENCE_FILE_STEM,
      futureLiveWriter: "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs",
      publishedFinalEvidence: false,
    }),
    rawObservations: {
      correction7EvidenceSHA256: CORRECTION_7_EVIDENCE_SHA256,
      existingV1EvidencePreserved: true,
      productSourceModified: false,
      productRunnerModified: false,
      externalNetworkAttempts: execution.externalNetworkAttempts ?? 0,
      liveTmdbAttempts: execution.liveTmdbAttempts ?? 0,
      browserAttempts: 0,
      cdpAttempts: 0,
      serverAttempts: 0,
      portBinds: 0,
      authorizationConsumption: execution.authorizationConsumption ?? 0,
      rawEventCount: allLogical.length + allAttempts.length,
    },
  };
}

export const assembleRawV2Evidence = assembleExternalGovernanceEvidence;
export { collectV2SourceInventory, collectV2SourcePins };

export function v2EvidenceOutputContract() {
  return Object.freeze({
    root: correctionEvidenceRoot(),
    rootRelative: EVIDENCE_ROOT_RELATIVE,
    fileStem: V2_CORRECTION_EVIDENCE_FILE_STEM,
    immutable: true,
    noClobber: true,
    existingDestinationDelete: false,
  });
}

export function futureLiveEvidenceOutputContract() {
  return Object.freeze({
    rootRelative: V2_EVIDENCE_ROOT,
    fileStem: V2_EVIDENCE_FILE_STEM,
    writer: "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs",
    immutable: true,
    noClobber: true,
  });
}
