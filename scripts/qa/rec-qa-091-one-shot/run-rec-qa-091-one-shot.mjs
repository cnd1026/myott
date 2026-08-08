import { lstat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  BASE_COMMIT,
  FIXED_INPUT,
  GOVERNANCE_BOUNDARY,
  PACKAGE_JSON_SHA256,
  PINNED_SOURCE_PINS,
  PNPM_LOCK_SHA256,
  REQUEST_BUDGET,
  TMDB_BASE_URL,
  assertFixedInput,
  collectRuntimePins,
  directExecutionIdentity,
  environmentPresence,
  validateEnvironment,
  validateExecArgv,
  validateGovernanceExecutionContract,
  validateInvocation,
  validateRepositoryPins,
  validateRuntimePins,
} from "./runtimeContract.mjs";
import { createOneShotTransport } from "./networkPolicy.mjs";
import { RequestLifecycleReducer, createRequestLifecycleContext } from "./requestLifecycle.mjs";
import { assembleRawEvidence } from "./evidenceAssembler.mjs";

const EXPECTED_REPOSITORY = Object.freeze({
  branch: "main",
  head: BASE_COMMIT,
  originMain: BASE_COMMIT,
  packageJsonSHA256: PACKAGE_JSON_SHA256,
  pnpmLockSHA256: PNPM_LOCK_SHA256,
});

// A future execution authorization supplies this object through a separately pinned source change.
// Keeping it absent here makes this source implementation fail closed without creating live authority.
const FUTURE_GOVERNANCE_EXECUTION_CONTRACT = null;

function safeFailureCode(error) {
  return /^[A-Z0-9_]{1,100}$/.test(error?.code || "") ? error.code : "ONE_SHOT_EXECUTION_FAILED";
}

function assertDirectExecution() {
  const invocation = validateInvocation({ moduleUrl: import.meta.url, expectedScriptPath: fileURLToPath(import.meta.url) });
  if (!invocation.ok) {
    const error = new Error("ONE_SHOT_INVOCATION_INVALID");
    error.code = "ONE_SHOT_INVOCATION_INVALID";
    throw error;
  }
  return invocation;
}

async function assertPreflight() {
  assertDirectExecution();
  const argvResult = validateExecArgv(process.execArgv);
  if (!argvResult.ok) throw Object.assign(new Error("NODE_EXEC_ARGV_INJECTION"), { code: "NODE_EXEC_ARGV_INJECTION" });
  const environment = validateEnvironment();
  if (!environment.ok) throw Object.assign(new Error("ONE_SHOT_ENVIRONMENT_INJECTION"), { code: "ONE_SHOT_ENVIRONMENT_INJECTION" });
  assertFixedInput(FIXED_INPUT);
  const runtime = await collectRuntimePins();
  const repository = validateRepositoryPins(runtime.repository, EXPECTED_REPOSITORY);
  if (!repository.ok) throw Object.assign(new Error("ONE_SHOT_REPOSITORY_PIN_MISMATCH"), { code: "ONE_SHOT_REPOSITORY_PIN_MISMATCH" });
  const runtimeResult = validateRuntimePins(runtime, { requireSourcePins: true, expectedSourcePins: PINNED_SOURCE_PINS });
  if (!runtimeResult.ok) throw Object.assign(new Error("ONE_SHOT_RUNTIME_PIN_MISMATCH"), { code: "ONE_SHOT_RUNTIME_PIN_MISMATCH" });
  return { runtime, environment };
}

async function assertOutputContract(contract) {
  const outputPath = await import("../../../src/lib/recommendation/qa/tmdbObservabilityOutput.mjs").then(({ resolveObservabilityEvidenceOutput }) => resolveObservabilityEvidenceOutput(contract.evidenceFileStem));
  const existing = await lstat(outputPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (existing) throw Object.assign(new Error("OUTPUT_ALREADY_EXISTS"), { code: "OUTPUT_ALREADY_EXISTS" });
  return outputPath;
}

async function executeOneShot({ runtime, governanceExecutionContract }) {
  const contractValidation = validateGovernanceExecutionContract(governanceExecutionContract);
  if (!contractValidation.ok) throw Object.assign(new Error("GOVERNANCE_EXECUTION_CONTRACT_INVALID"), { code: "GOVERNANCE_EXECUTION_CONTRACT_INVALID" });
  await assertOutputContract(governanceExecutionContract);
  const environment = environmentPresence();
  if (!Object.values(environment.credentialPresence).some(Boolean)) {
    throw Object.assign(new Error("ONE_SHOT_CREDENTIAL_MISSING"), { code: "ONE_SHOT_CREDENTIAL_MISSING" });
  }
  if (governanceExecutionContract.allowedNetworkDestination !== TMDB_BASE_URL.replace(/\/3$/, "")) {
    throw Object.assign(new Error("TMDB_DESTINATION_NOT_ALLOWED"), { code: "TMDB_DESTINATION_NOT_ALLOWED" });
  }

  // Product modules are intentionally reached only after all fail-closed checks above.
  const nativeFetch = globalThis.fetch;
  if (typeof nativeFetch !== "function") throw Object.assign(new Error("ONE_SHOT_NATIVE_FETCH_REQUIRED"), { code: "ONE_SHOT_NATIVE_FETCH_REQUIRED" });
  const [{ createTmdbRequestContext }, product, observability] = await Promise.all([
    import("../../../src/lib/providers/tmdb/requestContext.js"),
    import("../../../lib/tmdb.js"),
    import("../../../src/lib/recommendation/qa/tmdbObservability.js"),
  ]);
  if (globalThis.fetch !== nativeFetch) throw Object.assign(new Error("LIVE_V2_RUNTIME_TRANSPORT_INTEGRITY_FAILED"), { code: "LIVE_V2_RUNTIME_TRANSPORT_INTEGRITY_FAILED" });
  const session = observability.createTmdbObservabilitySession({
    runId: "REC-QA-091-ONE-SHOT-LIVE-INTEGRATED-RUN",
    runMode: "cold",
    sourceComponent: "scripts/qa/rec-qa-091-one-shot/run-rec-qa-091-one-shot.mjs",
  });
  const reducer = new RequestLifecycleReducer();
  let transport;
  const baseContext = createTmdbRequestContext({
    apiKey: Object.keys(environment.credentialPresence).find((key) => environment.credentialPresence[key]) ? process.env[Object.keys(environment.credentialPresence).find((key) => environment.credentialPresence[key])] : undefined,
    language: "ko-KR",
    region: "US",
    baseUrl: TMDB_BASE_URL,
    fetchImpl: (...args) => transport.fetch(...args),
    observer: session,
    diagnosticLimits: REQUEST_BUDGET,
    diagnosticRetry: 0,
  });
  const lifecycle = createRequestLifecycleContext({ reducer, baseContext, runId: "REC-QA-091-ONE-SHOT-LIVE-INTEGRATED-RUN", runMode: "cold" });
  transport = createOneShotTransport({
    nativeFetch,
    getCurrentRequest: lifecycle.getCurrentRequest,
    lifecycle,
    integratedRunId: "REC-QA-091-ONE-SHOT-LIVE-INTEGRATED-RUN",
    runtimeIntegrityCheck: () => globalThis.fetch === nativeFetch,
  });
  const discovery = await product.discoverTmdb({
    filters: ["country-us", "genre-horror"],
    contentTypes: ["drama"],
    limit: FIXED_INPUT.limit,
    requestContext: lifecycle.requestContext,
    detailLimit: 0,
    candidateSource: "rec-qa-091-one-shot-live",
  });
  const diagnostic = await product.diagnoseTmdbCandidateUniverse({
    session,
    candidates: discovery.candidates || [],
    filters: ["country-us", "genre-horror"],
    contentTypes: ["drama"],
    limit: FIXED_INPUT.limit,
    requestContext: lifecycle.requestContext,
    diagnosticMode: "product-plan",
  });
  const observabilityLedger = JSON.parse(observability.finalizeTmdbObservabilitySession(session));
  const rawEvidence = assembleRawEvidence({
    dataSource: "ONE_SHOT_LIVE_RUN",
    executionIdentity: directExecutionIdentity(import.meta.url, process.argv),
    runtimePins: runtime.node,
    repositoryPins: runtime.repository,
    sourceInventory: runtime.sourceInventory.records,
    fixedInput: FIXED_INPUT,
    runs: {
      cold: {
        runId: "REC-QA-091-ONE-SHOT-LIVE-INTEGRATED-RUN",
        runMode: "cold",
        productDiagnostics: { ...discovery.diagnostics, requestContext: baseContext.diagnostics() },
        lifecycleEvents: reducer.events(),
        controllerEvents: transport.events(),
        observabilityEvents: observabilityLedger.events,
        logicalRequestLedger: reducer.logicalRequestLedger(),
        outboundAttemptLedger: transport.attempts(),
        candidateRegistry: diagnostic.candidateRegistry || [],
        terminalProvenance: diagnostic.terminalProvenance || [],
        rankingProvenance: diagnostic.rankingProvenance || [],
        finalCandidateIds: diagnostic.finalCandidateIds || [],
        excludedCandidateIds: (diagnostic.excludedCandidates || []).map((item) => item.candidateId).filter(Boolean),
        cacheEvidence: reducer.logicalRequestLedger().filter((record) => record.cacheRelation === "HIT"),
      },
    },
    rawObservations: { externalNetworkAttempts: 0, liveTmdbAttempts: 1 },
    outputContract: { writer: "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs", futureLiveEvidenceCreated: false },
  });
  return rawEvidence;
}

async function main() {
  const preflight = await assertPreflight();
  const evidence = await executeOneShot({ runtime: preflight.runtime, governanceExecutionContract: FUTURE_GOVERNANCE_EXECUTION_CONTRACT });
  process.stdout.write(`${JSON.stringify({ status: "RAW_EVIDENCE_READY", dataSource: evidence.dataSource, runnerVerdict: false })}\n`);
}

const directIdentity = directExecutionIdentity();
if (directIdentity.isDirect) {
  main().catch((error) => {
    process.stderr.write(`${safeFailureCode(error)}\n`);
    process.exitCode = 1;
  });
}
