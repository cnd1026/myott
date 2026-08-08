const FORBIDDEN_KEYS = new Set([
  "adapterFactory",
  "adapter",
  "fetchImpl",
  "transport",
  "consumptionRecorder",
  "modulePath",
  "endpoint",
  "url",
  "URL",
  "fixtureAdapter",
  "testAdapter",
  "requestHook",
  "redirectHandler",
  "arbitrary",
]);

export const V2_TASK_ID = "MYOTT-S09-006A2D1A";
export const V2_FINDING_ID = "REC-QA-091";
export const V2_ARCHITECTURE_VERSION = "2.0";
export const V2_PACKAGE_ID = "REC-QA-091-NEW-BROWSER-EXECUTION-AUTHORIZATION-PACKAGE-V2";
export const V2_AUTHORIZATION_ID = "FOUNDER_AUTHORIZATION_REC_QA_091_BOUNDED_SERVER_SIDE_LIVE_PROBE_V2";
export const V2_GOVERNANCE_DECISION_ID = "FOUNDER_DECISION_REC_QA_091_LIVE_AUTH_TRUST_MODEL_GOVERNANCE_EXTERNAL";
export const V2_EVIDENCE_ROOT = "qa-evidence/REC-QA-091/OBSERVABILITY_V1";
export const V2_EVIDENCE_FILE_STEM = "rec-qa-091-live-probe-v2-external-governance-run-1-final";
export const V2_CORRECTION_EVIDENCE_ROOT = "qa-evidence/REC-QA-091/LIVE_ENTRYPOINT_ARCHITECTURE_V2";
export const V2_CORRECTION_EVIDENCE_FILE_STEM = "live-entrypoint-architecture-v2-external-governance-correction-1-final";

export const FIXED_INPUT = Object.freeze({
  country: "us",
  semanticGenre: "horror",
  contentType: "drama",
  providerMediaType: "tv",
  limit: 12,
});

export const OUTPUT_CONTRACT = Object.freeze({
  expectedMinimum: 8,
  requestBudget: Object.freeze({ total: 24, list: 8, detail: 16, aggregate: 72 }),
  concurrency: 4,
  retry: 0,
  threeRunModes: Object.freeze(["cold", "warm-prime", "warm-measure"]),
});

export const LIVE_INPUT_FIELDS = Object.freeze(["governanceExecutionContract"]);

function allOwnKeys(value) {
  return Reflect.ownKeys(value);
}

function isObjectLike(value) {
  return value !== null && (typeof value === "object" || typeof value === "function");
}

function assertPlainRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must have a plain object prototype.`);
  }
}

function assertDeepInputShape(value, label = "input", seen = new WeakSet()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) throw new TypeError(`${label} contains a cyclic value.`);
  seen.add(value);
  if (Array.isArray(value)) {
    for (const key of allOwnKeys(value)) {
      if (typeof key !== "string" || !/^\d+$/.test(key)) {
        throw new TypeError(`LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED:${String(key)}`);
      }
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED:inherited");
    }
  }
  for (const key of allOwnKeys(value)) {
    if (typeof key !== "string") throw new TypeError(`LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED:${String(key)}`);
    if (FORBIDDEN_KEYS.has(key)) throw new TypeError(`LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED:${key}`);
    assertDeepInputShape(value[key], `${label}.${key}`, seen);
  }
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (value && typeof value === "object") {
    const clone = Object.create(null);
    for (const key of allOwnKeys(value)) {
      if (typeof key !== "string") throw new TypeError(`LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED:${String(key)}`);
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

function exactKeys(value, expected, label) {
  const actual = allOwnKeys(value);
  if (actual.some((key) => typeof key !== "string")) {
    throw new TypeError(`${label} contains a symbol property.`);
  }
  const actualSorted = actual.sort();
  const required = [...expected].sort();
  const unexpected = actualSorted.find((key) => !required.includes(key));
  if (unexpected) throw new TypeError(`LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED:${unexpected}`);
  if (actualSorted.length !== required.length || actualSorted.some((key, index) => key !== required[index])) {
    throw new TypeError(`${label} keys must be exactly ${required.join(",")}.`);
  }
}

export function cloneFixedInput() {
  return deepClone(FIXED_INPUT);
}

export function assertExactFixedInput(value, label = "fixedInput") {
  assertPlainRecord(value, label);
  exactKeys(value, Object.keys(FIXED_INPUT), label);
  if (value.country !== FIXED_INPUT.country ||
    value.semanticGenre !== FIXED_INPUT.semanticGenre ||
    value.contentType !== FIXED_INPUT.contentType ||
    value.providerMediaType !== FIXED_INPUT.providerMediaType ||
    value.limit !== FIXED_INPUT.limit ||
    typeof value.limit !== "number" || !Number.isSafeInteger(value.limit)) {
    throw new TypeError(`${label} does not match the fixed product input.`);
  }
  return value;
}

export function freezeFixedInput(value) {
  assertExactFixedInput(value);
  return deepFreeze(deepClone(value));
}

export function validateStrictLiveInput(input, { offlineEnvelope = false } = {}) {
  if (!isObjectLike(input) || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("LIVE_V2_INPUT_MUST_BE_OBJECT");
  }
  assertDeepInputShape(input);
  const expectedFields = offlineEnvelope
    ? ["governanceExecutionContract", "fixedInput", "credentialPresence", "outputContract"]
    : LIVE_INPUT_FIELDS;
  exactKeys(input, expectedFields, "liveInput");
  assertPlainRecord(input.governanceExecutionContract, "governanceExecutionContract");
  if (offlineEnvelope) {
    assertPlainRecord(input.credentialPresence, "credentialPresence");
    assertPlainRecord(input.outputContract, "outputContract");
    assertExactFixedInput(input.fixedInput);
    exactKeys(input.credentialPresence, ["available"], "credentialPresence");
    if (typeof input.credentialPresence.available !== "boolean") {
      throw new TypeError("LIVE_V2_CREDENTIAL_PRESENCE_INVALID");
    }
    if (input.credentialPresence.available !== true) {
      throw new TypeError("LIVE_V2_CREDENTIAL_MISSING");
    }
    exactKeys(input.outputContract, ["expectedMinimum", "requestBudget"], "outputContract");
    if (input.outputContract.expectedMinimum !== OUTPUT_CONTRACT.expectedMinimum) {
      throw new TypeError("LIVE_V2_OUTPUT_CONTRACT_INVALID");
    }
    assertPlainRecord(input.outputContract.requestBudget, "outputContract.requestBudget");
    exactKeys(input.outputContract.requestBudget, ["total", "list", "detail"], "outputContract.requestBudget");
    if (input.outputContract.requestBudget.total !== OUTPUT_CONTRACT.requestBudget.total ||
      input.outputContract.requestBudget.list !== OUTPUT_CONTRACT.requestBudget.list ||
      input.outputContract.requestBudget.detail !== OUTPUT_CONTRACT.requestBudget.detail) {
      throw new TypeError("LIVE_V2_OUTPUT_CONTRACT_MISMATCH");
    }
  }
  return deepFreeze(deepClone(input));
}

export function createSyntheticLiveInput({ governanceExecutionContract, authorizationArtifact, credentialAvailable = true } = {}) {
  return deepFreeze({
    governanceExecutionContract: deepClone(governanceExecutionContract || authorizationArtifact),
    fixedInput: cloneFixedInput(),
    credentialPresence: { available: credentialAvailable },
    outputContract: {
      expectedMinimum: OUTPUT_CONTRACT.expectedMinimum,
      requestBudget: {
        total: OUTPUT_CONTRACT.requestBudget.total,
        list: OUTPUT_CONTRACT.requestBudget.list,
        detail: OUTPUT_CONTRACT.requestBudget.detail,
      },
    },
  });
}

export function listForbiddenInputKeys() {
  return [...FORBIDDEN_KEYS];
}
