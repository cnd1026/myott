import {
  FIXED_INPUT,
  OUTPUT_CONTRACT,
  V2_AUTHORIZATION_ID,
  V2_EVIDENCE_ROOT,
  V2_EVIDENCE_FILE_STEM,
  V2_CORRECTION_EVIDENCE_ROOT,
  V2_GOVERNANCE_DECISION_ID,
  assertExactFixedInput,
  freezeFixedInput,
} from "./inputContract.mjs";

export const CORRECTION_7_EVIDENCE_SHA256 =
  "ca11f3f9d0f23a867296a87e7d220a2d230c71802796adc347ed8e07d8c2e66c";
export const LIVE_NETWORK_HOST = "api.themoviedb.org";
export const LIVE_CONSUMPTION_BOUNDARY = "FIRST_ACTUAL_OUTBOUND_TMDB_REQUEST";
export { V2_EVIDENCE_ROOT, V2_CORRECTION_EVIDENCE_ROOT } from "./inputContract.mjs";
export const TRUST_AUTHORITY = "EXTERNAL_GOVERNANCE";
export const TECHNICAL_SINGLE_CONSUMPTION_SCOPE = "CURRENT_INTEGRATED_RUN_ONLY";

export const GOVERNANCE_EXECUTION_FIELDS = Object.freeze([
  "governanceDecisionId",
  "executionAuthorizationId",
  "executionState",
  "integratedRunAllowance",
  "fixedInput",
  "sourcePins",
  "runtimePins",
  "requestBudget",
  "concurrency",
  "retry",
  "allowedNetworkDestination",
  "consumptionBoundary",
  "automaticRetry",
  "evidenceRoot",
  "evidenceFileStem",
  "trustAuthority",
  "authenticityTechnicallyVerified",
  "technicalSingleConsumptionScope",
  "processRestartReuseTechnicallyPrevented",
]);

export const GOVERNANCE_EXECUTION_CONTRACT = Object.freeze({
  governanceDecisionId: V2_GOVERNANCE_DECISION_ID,
  executionAuthorizationId: V2_AUTHORIZATION_ID,
  executionState: "APPROVED",
  integratedRunAllowance: 1,
  fixedInput: FIXED_INPUT,
  requestBudget: Object.freeze({ ...OUTPUT_CONTRACT.requestBudget }),
  concurrency: OUTPUT_CONTRACT.concurrency,
  retry: OUTPUT_CONTRACT.retry,
  allowedNetworkDestination: Object.freeze({ protocol: "https", host: LIVE_NETWORK_HOST, port: 443 }),
  consumptionBoundary: LIVE_CONSUMPTION_BOUNDARY,
  automaticRetry: 0,
  evidenceRoot: V2_EVIDENCE_ROOT,
  evidenceFileStem: V2_EVIDENCE_FILE_STEM,
  trustAuthority: TRUST_AUTHORITY,
  authenticityTechnicallyVerified: false,
  technicalSingleConsumptionScope: TECHNICAL_SINGLE_CONSUMPTION_SCOPE,
  processRestartReuseTechnicallyPrevented: false,
});

function assertPlainRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must have a plain object prototype.`);
  }
}

function allOwnKeys(value) {
  return Reflect.ownKeys(value);
}

function exactKeys(value, expected, label) {
  const actual = allOwnKeys(value);
  if (actual.some((key) => typeof key !== "string")) throw new TypeError(`${label} contains a symbol property.`);
  const actualSorted = actual.sort();
  const required = [...expected].sort();
  if (actualSorted.length !== required.length || actualSorted.some((key, index) => key !== required[index])) {
    throw new TypeError(`${label} fields are not exact.`);
  }
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (value && typeof value === "object") {
    const clone = Object.create(null);
    for (const key of allOwnKeys(value)) {
      if (typeof key !== "string") throw new TypeError(`${String(key)} is not a supported field.`);
      clone[key] = deepClone(value[key]);
    }
    return clone;
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of allOwnKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function assertSha(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new TypeError(`${label} must be a lowercase SHA-256.`);
  }
}

function validateSourcePins(value, label) {
  assertPlainRecord(value, label);
  if (Object.keys(value).length === 0) throw new TypeError(`${label} cannot be empty.`);
  for (const [path, record] of Object.entries(value)) {
    if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) {
      throw new TypeError(`${label} contains an unsafe path.`);
    }
    assertPlainRecord(record, `${label}.${path}`);
    exactKeys(record, ["sha256", "byteSize"], `${label}.${path}`);
    assertSha(record.sha256, `${label}.${path}.sha256`);
    if (!Number.isSafeInteger(record.byteSize) || record.byteSize < 0) {
      throw new TypeError(`${label}.${path}.byteSize must be a non-negative integer.`);
    }
  }
}

function validateRuntimePins(value) {
  assertPlainRecord(value, "runtimePins");
  exactKeys(value, ["node", "browser"], "runtimePins");
  for (const name of ["node", "browser"]) {
    if (value[name] === "NOT_EXECUTED") continue;
    assertPlainRecord(value[name], `runtimePins.${name}`);
    exactKeys(value[name], ["path", "sha256", "byteSize", "version"], `runtimePins.${name}`);
    if (typeof value[name].path !== "string" || value[name].path.includes("..") || /[\u0000-\u001f]/.test(value[name].path)) {
      throw new TypeError(`runtimePins.${name}.path is invalid.`);
    }
    assertSha(value[name].sha256, `runtimePins.${name}.sha256`);
    if (!Number.isSafeInteger(value[name].byteSize) || value[name].byteSize < 0 || typeof value[name].version !== "string") {
      throw new TypeError(`runtimePins.${name} is invalid.`);
    }
  }
}

function validateDestination(value) {
  assertPlainRecord(value, "allowedNetworkDestination");
  exactKeys(value, ["protocol", "host", "port"], "allowedNetworkDestination");
  if (value.protocol !== GOVERNANCE_EXECUTION_CONTRACT.allowedNetworkDestination.protocol ||
    value.host !== GOVERNANCE_EXECUTION_CONTRACT.allowedNetworkDestination.host ||
    value.port !== GOVERNANCE_EXECUTION_CONTRACT.allowedNetworkDestination.port) {
    throw new TypeError("LIVE_V2_ALLOWED_DESTINATION_MISMATCH");
  }
}

export function createSyntheticGovernanceExecutionContract({ sourcePins = {}, runtimePins = { node: "NOT_EXECUTED", browser: "NOT_EXECUTED" } } = {}) {
  return {
    governanceDecisionId: GOVERNANCE_EXECUTION_CONTRACT.governanceDecisionId,
    executionAuthorizationId: GOVERNANCE_EXECUTION_CONTRACT.executionAuthorizationId,
    executionState: GOVERNANCE_EXECUTION_CONTRACT.executionState,
    integratedRunAllowance: GOVERNANCE_EXECUTION_CONTRACT.integratedRunAllowance,
    fixedInput: { ...FIXED_INPUT },
    sourcePins: deepClone(sourcePins),
    runtimePins: deepClone(runtimePins),
    requestBudget: { ...OUTPUT_CONTRACT.requestBudget },
    concurrency: OUTPUT_CONTRACT.concurrency,
    retry: OUTPUT_CONTRACT.retry,
    allowedNetworkDestination: { ...GOVERNANCE_EXECUTION_CONTRACT.allowedNetworkDestination },
    consumptionBoundary: LIVE_CONSUMPTION_BOUNDARY,
    automaticRetry: 0,
    evidenceRoot: V2_EVIDENCE_ROOT,
    evidenceFileStem: V2_EVIDENCE_FILE_STEM,
    trustAuthority: TRUST_AUTHORITY,
    authenticityTechnicallyVerified: false,
    technicalSingleConsumptionScope: TECHNICAL_SINGLE_CONSUMPTION_SCOPE,
    processRestartReuseTechnicallyPrevented: false,
  };
}

export function validateGovernanceExecutionContract(input) {
  assertPlainRecord(input, "governanceExecutionContract");
  exactKeys(input, GOVERNANCE_EXECUTION_FIELDS, "governanceExecutionContract");
  if (input.governanceDecisionId !== GOVERNANCE_EXECUTION_CONTRACT.governanceDecisionId ||
    input.executionAuthorizationId !== GOVERNANCE_EXECUTION_CONTRACT.executionAuthorizationId ||
    input.executionState !== GOVERNANCE_EXECUTION_CONTRACT.executionState ||
    input.integratedRunAllowance !== GOVERNANCE_EXECUTION_CONTRACT.integratedRunAllowance ||
    input.concurrency !== GOVERNANCE_EXECUTION_CONTRACT.concurrency ||
    input.retry !== GOVERNANCE_EXECUTION_CONTRACT.retry ||
    input.automaticRetry !== GOVERNANCE_EXECUTION_CONTRACT.automaticRetry ||
    input.consumptionBoundary !== GOVERNANCE_EXECUTION_CONTRACT.consumptionBoundary ||
    input.trustAuthority !== TRUST_AUTHORITY ||
    input.authenticityTechnicallyVerified !== false ||
    input.technicalSingleConsumptionScope !== TECHNICAL_SINGLE_CONSUMPTION_SCOPE ||
    input.processRestartReuseTechnicallyPrevented !== false) {
    throw new TypeError("LIVE_V2_GOVERNANCE_CONTRACT_CONSTANT_MISMATCH");
  }
  assertExactFixedInput(input.fixedInput, "governanceExecutionContract.fixedInput");
  validateSourcePins(input.sourcePins, "sourcePins");
  validateRuntimePins(input.runtimePins);
  assertPlainRecord(input.requestBudget, "requestBudget");
  exactKeys(input.requestBudget, ["total", "list", "detail", "aggregate"], "requestBudget");
  for (const [key, expected] of Object.entries(GOVERNANCE_EXECUTION_CONTRACT.requestBudget)) {
    if (input.requestBudget[key] !== expected) throw new TypeError("LIVE_V2_REQUEST_BUDGET_MISMATCH");
  }
  validateDestination(input.allowedNetworkDestination);
  if (input.evidenceRoot !== V2_EVIDENCE_ROOT || input.evidenceFileStem !== V2_EVIDENCE_FILE_STEM ||
    input.evidenceRoot.includes("..") || input.evidenceRoot.includes("\\") ||
    input.evidenceFileStem.includes("/") || input.evidenceFileStem.includes("\\")) {
    throw new TypeError("LIVE_V2_EVIDENCE_DESTINATION_INVALID");
  }
  return deepFreeze(deepClone(input));
}

export function governanceExecutionContractFieldSet() {
  return [...GOVERNANCE_EXECUTION_FIELDS];
}

export function expectedGovernanceConstants() {
  return deepFreeze(deepClone(GOVERNANCE_EXECUTION_CONTRACT));
}

// Compatibility aliases are structural only. They do not assert Founder authenticity.
export const AUTHORIZATION_CONTRACT = GOVERNANCE_EXECUTION_CONTRACT;
export const AUTHORIZATION_FIELDS = GOVERNANCE_EXECUTION_FIELDS;
export const validateAuthorizationArtifact = validateGovernanceExecutionContract;
export const createSyntheticAuthorization = createSyntheticGovernanceExecutionContract;
export const authorizationContractFieldSet = governanceExecutionContractFieldSet;
export const expectedAuthorizationConstants = expectedGovernanceConstants;
export const freezeAuthorization = freezeFixedInput;
