import { FIXED_INPUT, OUTPUT_CONTRACT, V2_EVIDENCE_ROOT, V2_EVIDENCE_FILE_STEM } from "./inputContract.mjs";

const reject = (fixtureId, category, expectedErrorCodePrefix) => ({
  fixtureId,
  category,
  expectedDisposition: "REJECTED",
  expectedErrorCodePrefix,
});

const accept = (fixtureId, category) => ({
  fixtureId,
  category,
  expectedDisposition: "ACCEPTED",
  expectedErrorCodePrefix: null,
});

const EXPECTED_CONTROLLER_COUNTS = Object.freeze({
  "redirect-no-redirect": [1, 1],
  "redirect-redirect-1": [2, 1],
  "redirect-redirect-3": [4, 1],
  "redirect-redirect-4": [4, 1],
  "redirect-non-tmdb": [1, 1],
  "redirect-ip": [1, 1],
  "redirect-userinfo": [1, 1],
  "budget-list-9": [8, 1],
  "budget-detail-17": [16, 1],
  "budget-aggregate-73": [72, 1],
  "redirect-budget-list-9": [8, 1],
  "redirect-budget-detail-17": [16, 1],
  "redirect-budget-total-25": [24, 1],
  "redirect-budget-list-redirect-9": [8, 1],
  "redirect-budget-detail-redirect-17": [16, 1],
  "redirect-budget-total-redirect-25": [23, 1],
  "consumption-after-outbound-failure": [1, 1],
});

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function withExpectedCounts(record) {
  const [expectedAttemptCount, expectedConsumptionEventCount] = EXPECTED_CONTROLLER_COUNTS[record.fixtureId] || [0, 0];
  return { ...record, expectedAttemptCount, expectedConsumptionEventCount };
}

const strictUnknown = [
  "adapterFactory", "adapter", "fetchImpl", "transport", "consumptionRecorder", "modulePath",
  "endpoint", "url", "URL", "fixtureAdapter", "testAdapter", "requestHook", "redirectHandler", "unknownField",
].map((key) => reject(`strict-unknown-${key}`, "Strict Input", "LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED"));

const strictRecords = [
  ...strictUnknown,
  reject("strict-missing-fixed-input", "Fixed Input", "LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED"),
  reject("strict-nested-extra", "Strict Input", "LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED"),
  reject("strict-inherited-key", "Strict Input", "LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED"),
  reject("strict-prototype-like-key", "Strict Input", "LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED"),
  reject("strict-symbol-key", "Strict Input", "LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED"),
  reject("strict-non-enumerable-key", "Strict Input", "LIVE_V2_UNKNOWN_INPUT_FIELD_REJECTED"),
];

const governanceRecords = [
  reject("governance-missing-field", "Governance Contract", "governanceExecutionContract fields are not exact"),
  reject("governance-unknown-field", "Governance Contract", "governanceExecutionContract fields are not exact"),
  reject("governance-authenticity-claim", "Governance Contract", "LIVE_V2_GOVERNANCE_CONTRACT_CONSTANT_MISMATCH"),
  reject("governance-process-persistence-claim", "Governance Contract", "LIVE_V2_GOVERNANCE_CONTRACT_CONSTANT_MISMATCH"),
  reject("governance-budget-mismatch", "Governance Contract", "LIVE_V2_REQUEST_BUDGET_MISMATCH"),
  reject("governance-fixed-input-mismatch", "Governance Contract", "governanceExecutionContract.fixedInput"),
];

const bindingRecords = [
  "adapterFactory", "adapter", "fetchImpl", "transport", "consumptionRecorder", "modulePath",
  "endpoint", "url", "fixtureAdapter", "testAdapter",
].map((key) => reject(`binding-${key}`, "Binding Override", "LIVE_V2_CALLER_INJECTION_REJECTED"));

const allowlistRecords = Array.from({ length: 8 }, (_, index) => reject(`allowlist-${index + 1}`, "Allowlist", "TMDB_DESTINATION_NOT_ALLOWED"));

const redirectRecords = [
  accept("redirect-no-redirect", "Redirect"),
  accept("redirect-redirect-1", "Redirect"),
  accept("redirect-redirect-3", "Redirect"),
  reject("redirect-redirect-4", "Redirect", "TMDB_REDIRECT_HOP_LIMIT_EXCEEDED"),
  reject("redirect-non-tmdb", "Redirect", "TMDB_DESTINATION_NOT_ALLOWED"),
  reject("redirect-ip", "Redirect", "TMDB_DESTINATION_NOT_ALLOWED"),
  reject("redirect-userinfo", "Redirect", "TMDB_DESTINATION_NOT_ALLOWED"),
];

const baseRecords = [
  reject("runtime-transport-mutation", "Runtime Transport Mutation", "LIVE_V2_RUNTIME_TRANSPORT_INTEGRITY_FAILED"),
  reject("budget-list-9", "Run Budget", "REQUEST_BUDGET_EXCEEDED"),
  reject("budget-detail-17", "Run Budget", "REQUEST_BUDGET_EXCEEDED"),
  reject("budget-aggregate-73", "Aggregate Budget", "REQUEST_BUDGET_EXCEEDED"),
  accept("consumption-after-outbound-failure", "Consumption"),
  reject("lifecycle-attempt-without-start", "Lifecycle", "UNKNOWN_REQUEST_ID"),
  reject("lifecycle-terminal-without-start", "Lifecycle", "UNKNOWN_REQUEST_ID"),
  reject("lifecycle-complete-with-open-attempt", "Lifecycle", "REQUEST_TERMINAL_WITH_OPEN_ATTEMPT"),
  reject("lifecycle-duplicate-terminal", "Lifecycle", "ATTEMPT_TERMINAL_PAIR_INVALID"),
  reject("lifecycle-complete-then-failed", "Lifecycle", "REQUEST_TERMINAL_DUPLICATE_OR_INVALID"),
  accept("cache-hit-after-start", "Cache Hit"),
  reject("cache-hit-second-terminal", "Cache Hit", "REQUEST_TERMINAL_DUPLICATE_OR_INVALID"),
  accept("validator-meta-quality", "Validator Meta-quality"),
  reject("output-existing-destination", "Output Boundary", "LIVE_V2_EVIDENCE_DESTINATION_EXISTS"),
  reject("output-traversal-stem", "Output Boundary", "LIVE_V2_EVIDENCE_FILE_STEM_INVALID"),
];

const correctionRecords = [
  reject("redirect-budget-list-9", "Redirect Budget", "REQUEST_BUDGET_EXCEEDED"),
  reject("redirect-budget-detail-17", "Redirect Budget", "REQUEST_BUDGET_EXCEEDED"),
  reject("redirect-budget-total-25", "Redirect Budget", "REQUEST_BUDGET_EXCEEDED"),
  reject("redirect-budget-list-redirect-9", "Redirect Budget", "REQUEST_BUDGET_EXCEEDED"),
  reject("redirect-budget-detail-redirect-17", "Redirect Budget", "REQUEST_BUDGET_EXCEEDED"),
  reject("redirect-budget-total-redirect-25", "Redirect Budget", "REQUEST_BUDGET_EXCEEDED"),
  reject("lifecycle-duplicate-start", "Lifecycle", "REQUEST_START_DUPLICATE_OR_INVALID"),
  reject("lifecycle-failed-with-open-attempt", "Lifecycle", "REQUEST_TERMINAL_WITH_OPEN_ATTEMPT"),
  reject("lifecycle-failed-then-complete", "Lifecycle", "REQUEST_TERMINAL_DUPLICATE_OR_INVALID"),
  reject("lifecycle-terminal-request-mismatch", "Lifecycle", "UNKNOWN_REQUEST_ID"),
  accept("output-concurrent-single-winner", "Output Boundary"),
  reject("output-sync-failure-cleanup", "Output Boundary", "SYNTHETIC_SYNC_FAILURE"),
  reject("output-reparse-root", "Output Boundary", "LIVE_V2_EVIDENCE_ROOT_REPARSE_POINT"),
  reject("live-list-capture-not-from-fixture-calls", "Live Capture", "LIVE_V2_LIVE_CAPTURE_REQUIRED"),
  reject("live-output-root-mismatch", "Output Boundary", "LIVE_V2_EVIDENCE_DESTINATION_INVALID"),
];

const preflightRecords = [
  reject("preflight-missing-credential", "Preflight Ordering", "LIVE_V2_CREDENTIAL_MISSING"),
  reject("preflight-governance-unknown-field", "Preflight Ordering", "governanceExecutionContract fields are not exact"),
  reject("preflight-fixed-input-mismatch", "Preflight Ordering", "fixedInput"),
];

const responseCaptureRecords = [
  accept("capture-empty-results", "Response Clone Bound"),
  accept("capture-normal-20", "Response Clone Bound"),
  accept("capture-exact-boundary", "Response Clone Bound"),
  reject("capture-boundary-plus-one", "Response Clone Bound", "LIVE_V2_LIST_RESPONSE_RESOURCE_LIMIT_EXCEEDED"),
  reject("capture-oversized-body", "Response Clone Bound", "LIVE_V2_LIST_RESPONSE_RESOURCE_LIMIT_EXCEEDED"),
  reject("capture-malformed-results", "Response Clone Bound", "LIVE_V2_LIST_RESPONSE_INVALID"),
  reject("capture-non-array-results", "Response Clone Bound", "LIVE_V2_LIST_RESPONSE_INVALID"),
  reject("capture-invalid-json", "Response Clone Bound", "LIVE_V2_LIST_RESPONSE_INVALID_JSON"),
  reject("capture-clone-failure", "Response Clone Bound", "LIVE_V2_LIST_RESPONSE_CLONE_FAILED"),
];

const liveBoundaryRecords = [
  reject("live-low-level-global-fetch", "Live API Boundary", "LIVE_V2_LIVE_CONTROLLER_PRECONDITION_REQUIRED"),
  reject("live-caller-transport", "Live API Boundary", "LIVE_V2_LIVE_CONTROLLER_PRECONDITION_REQUIRED"),
  reject("live-preflight-bypass", "Live API Boundary", "LIVE_V2_LIVE_CONTROLLER_PRECONDITION_REQUIRED"),
];

export const CANONICAL_FIXTURE_MANIFEST = deepFreeze([
  ...strictRecords,
  ...governanceRecords,
  ...bindingRecords,
  ...baseRecords.slice(0, 1),
  ...allowlistRecords,
  ...redirectRecords,
  ...baseRecords.slice(1),
  ...correctionRecords,
  ...preflightRecords,
  ...responseCaptureRecords,
  ...liveBoundaryRecords,
].map(withExpectedCounts));

export const CANONICAL_EXPECTED_CONTRACT = deepFreeze({
  trustModel: Object.freeze({
    authorizationTrustModel: "EXTERNAL_GOVERNANCE",
    authorizationAuthenticityTechnicallyVerified: false,
    authorizationAuthenticityAuthority: "FOUNDER_HQ_PROCEDURE",
    technicalSingleConsumptionScope: "CURRENT_INTEGRATED_RUN_ONLY",
    processRestartReuseTechnicallyPrevented: false,
  }),
  fixedInput: Object.freeze({ ...FIXED_INPUT }),
  requestBudget: Object.freeze({ ...OUTPUT_CONTRACT.requestBudget }),
  concurrency: OUTPUT_CONTRACT.concurrency,
  retry: OUTPUT_CONTRACT.retry,
  preflightOrder: Object.freeze([
    "strict-live-api-shape",
    "repository-source-runtime-pin",
    "fixed-input",
    "output-collision",
    "credential-presence",
    "immutable-tmdb-allowlist",
    "governance-execution-contract",
  ]),
  futureOutput: Object.freeze({
    root: V2_EVIDENCE_ROOT,
    fileStem: V2_EVIDENCE_FILE_STEM,
    dataSource: "LIVE_TMDB",
  }),
  fixtureManifest: CANONICAL_FIXTURE_MANIFEST,
});

export function canonicalFixtureManifest() {
  return CANONICAL_FIXTURE_MANIFEST.map((record) => ({ ...record }));
}

export function canonicalExpectedContract() {
  return CANONICAL_EXPECTED_CONTRACT;
}
