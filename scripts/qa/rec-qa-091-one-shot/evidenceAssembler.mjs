import {
  EVIDENCE_PURPOSE,
  GOVERNANCE_AUTHORITY,
  GOVERNANCE_BOUNDARY,
  TECHNICAL_PERSISTENCE_SCOPE,
} from "./runtimeContract.mjs";

const SECRET_KEY = /(api.?key|bearer|token|credential|password|authorization|cookie|header|query|url)/i;
const SAFE_URL_KEY = /safeEndpointIdentity|outputContract/i;
const SAFE_SECURITY_METADATA_KEY = /^(actualCredentialUsed|futureExecutionAuthorizationCreated|authorizationAuthenticityTechnicallyVerified|syntheticConsumptionEventsAreNotActualAuthorizationConsumption)$/;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitize(value, key = "") {
  if (SECRET_KEY.test(key) && !SAFE_URL_KEY.test(key) && !SAFE_SECURITY_METADATA_KEY.test(key)) return undefined;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) || /Bearer\s+/i.test(value)) return undefined;
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item, key)).filter((item) => item !== undefined);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    const safeValue = sanitize(childValue, childKey);
    if (safeValue !== undefined) result[childKey] = safeValue;
  }
  return result;
}

function sourcePinsFromInventory(sourceInventory = []) {
  return Object.fromEntries(sourceInventory.map((record) => [record.relativePath, {
    sha256: record.sha256,
    byteSize: record.byteSize,
    role: record.role,
    mutableInScope: record.mutableInScope,
  }]));
}

function flattenRunValues(runs, selector) {
  return Object.values(runs || {}).flatMap((run) => selector(run) || []);
}

export function assembleRawEvidence({
  dataSource = "ONE_SHOT_LIVE_RUN",
  executionIdentity = {},
  runtimePins = {},
  repositoryPins = {},
  sourceInventory = [],
  fixedInput,
  runs = {},
  rawObservations = {},
  outputContract = {},
} = {}) {
  if (!fixedInput || typeof fixedInput !== "object") throw new TypeError("ONE_SHOT_EVIDENCE_FIXED_INPUT_REQUIRED");
  const safeRuns = sanitize(runs);
  const rawEventLedger = Object.fromEntries(Object.entries(safeRuns).map(([runMode, run]) => [runMode, {
    runId: run.runId,
    runMode: run.runMode,
    lifecycle: run.lifecycleEvents || [],
    controller: run.controllerEvents || [],
    observability: run.observabilityEvents || [],
  }]));
  const logicalRequestLedger = flattenRunValues(safeRuns, (run) => run.logicalRequestLedger);
  const outboundAttemptLedger = flattenRunValues(safeRuns, (run) => run.outboundAttemptLedger);
  const governanceConsumptionEvidence = flattenRunValues(safeRuns, (run) => (
    (run.controllerEvents || []).filter((event) => event.type === "governanceConsumptionObserved")
  ));
  return sanitize({
    schemaVersion: "1.0",
    purpose: EVIDENCE_PURPOSE,
    dataSource,
    trustBoundary: "TRUSTED_LOCAL_ONE_SHOT_PROCESS",
    executionIdentity,
    runtimePins,
    repositoryPins: {
      branch: repositoryPins.branch,
      head: repositoryPins.head,
      originMain: repositoryPins.originMain,
      packageJson: repositoryPins.packageJson,
      pnpmLock: repositoryPins.pnpmLock,
      dirtyPathClassification: repositoryPins.dirtyPathClassification,
    },
    sourceInventory,
    sourcePins: sourcePinsFromInventory(sourceInventory),
    fixedInput: clone(fixedInput),
    governance: {
      trustAuthority: "EXTERNAL_GOVERNANCE",
      authority: GOVERNANCE_AUTHORITY,
      boundary: GOVERNANCE_BOUNDARY,
      technicalPersistenceScope: TECHNICAL_PERSISTENCE_SCOPE,
      authorizationAuthenticityTechnicallyVerified: false,
      processRestartReuseTechnicallyPrevented: false,
      syntheticConsumptionEventsAreNotActualAuthorizationConsumption: dataSource === "DETERMINISTIC_FIXTURE",
    },
    governanceConsumptionEvidence,
    requestContract: {
      logicalRequestLedger: true,
      outboundAttemptLedger: true,
      redirectMode: "manual",
    },
    runs: safeRuns,
    logicalRequestLedger,
    outboundAttemptLedger,
    rawEventLedger,
    productDiagnostics: flattenRunValues(safeRuns, (run) => [run.productDiagnostics]).filter(Boolean),
    capturedListResponses: flattenRunValues(safeRuns, (run) => run.capturedListResponses),
    candidateRegistry: flattenRunValues(safeRuns, (run) => run.candidateRegistry),
    terminalProvenance: flattenRunValues(safeRuns, (run) => run.terminalProvenance),
    rankingProvenance: flattenRunValues(safeRuns, (run) => run.rankingProvenance),
    finalCandidateIds: flattenRunValues(safeRuns, (run) => run.finalCandidateIds),
    excludedCandidateIds: flattenRunValues(safeRuns, (run) => run.excludedCandidateIds),
    cacheEvidence: flattenRunValues(safeRuns, (run) => [run.cacheEvidence]).filter(Boolean),
    outputContract: {
      writer: outputContract.writer || "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs",
      futureLiveEvidenceCreated: false,
      futureLivePathPinnedBySeparateAuthorization: true,
    },
    rawObservations: {
      externalNetworkAttempts: Number(rawObservations.externalNetworkAttempts || 0),
      liveTmdbAttempts: Number(rawObservations.liveTmdbAttempts || 0),
      browserAttempts: Number(rawObservations.browserAttempts || 0),
      cdpAttempts: Number(rawObservations.cdpAttempts || 0),
      serverAttempts: Number(rawObservations.serverAttempts || 0),
      portBinds: Number(rawObservations.portBinds || 0),
      v1Consumption: Number(rawObservations.v1Consumption || 0),
      productSourceModified: false,
      productRequestContextModified: false,
      productRunnerModified: false,
      reusableV2Modified: false,
      correction7WriterModified: false,
    },
  });
}

export function assembleImplementationEvidence({
  rawEvidence,
  fixtureRecords = [],
  offlineValidation = null,
  testResults = {},
  sourceInventory = [],
  runtimeContract,
} = {}) {
  if (!rawEvidence || rawEvidence.dataSource !== "DETERMINISTIC_FIXTURE") throw new TypeError("IMPLEMENTATION_EVIDENCE_FIXTURE_ONLY");
  return sanitize({
    ...clone(rawEvidence),
    purpose: EVIDENCE_PURPOSE,
    dataSource: "DETERMINISTIC_FIXTURE",
    deterministicImplementation: true,
    sourceInventory,
    runtimeContract,
    fixtureRecords,
    offlineValidation,
    testResults,
    actualCredentialUsed: false,
    liveTmdbResponseCaptured: false,
    futureExecutionAuthorizationCreated: false,
  });
}

export function evidenceContract() {
  return Object.freeze({
    runnerProducesRawEvidenceOnly: true,
    validatorRunsSeparately: true,
    dataSource: "DETERMINISTIC_FIXTURE",
    futureLiveEvidenceCreatedDuringImplementation: false,
    credentialValuesStored: false,
    fullUrlQueryHeaderStored: false,
  });
}
