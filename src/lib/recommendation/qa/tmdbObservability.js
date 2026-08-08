export const TMDB_OBSERVABILITY_TRACE_STAGES = Object.freeze([
  "input",
  "provider-task-created",
  "provider-page-response",
  "raw-candidate",
  "normalized-candidate",
  "dedup-candidate",
  "semantic-genre-evaluation",
  "hard-filter-evaluation",
  "detail-budget-selection",
  "ranking-input",
  "ranking-score",
  "diversity-or-coverage-evaluation",
  "final-selection",
  "final-exclusion",
  "cache-state",
  "request-budget-summary",
  "run-summary",
]);

export const TMDB_OBSERVABILITY_DROP_REASONS = Object.freeze([
  "duplicate-identity",
  "duplicate-title",
  "franchise-dedup",
  "media-type-mismatch",
  "country-mismatch",
  "provider-mismatch",
  "semantic-genre-insufficient",
  "metadata-missing",
  "runtime-mismatch",
  "detail-budget-not-selected",
  "ranking-below-other-candidates",
  "diversity-or-coverage-reservation",
  "final-limit",
  "unknown-uninstrumented-drop",
]);

const LEGACY_STAGE_BY_EVENT = Object.freeze({
  "retrieval-row": "raw-candidate",
  "duplicate-decision": "dedup-candidate",
  "preliminary-decision": "hard-filter-evaluation",
  "detail-order": "detail-budget-selection",
  "detail-budget": "detail-budget-selection",
  "detail-request-result": "cache-state",
  "normalized-evaluation": "semantic-genre-evaluation",
  "exclusion-decision": "final-exclusion",
  "final-eligibility": "final-selection",
});

const LEGACY_EVENT_TYPES = Object.freeze([
  "retrieval-row",
  "duplicate-decision",
  "preliminary-decision",
  "detail-order",
  "detail-budget",
  "detail-request-result",
  "normalized-evaluation",
  "exclusion-decision",
  "final-eligibility",
]);

const SUMMARY_EVENT_TYPES = TMDB_OBSERVABILITY_TRACE_STAGES;

const CANDIDATE_FIELDS = Object.freeze([
  "candidateId",
  "provider",
  "providerId",
  "canonicalId",
  "tmdbId",
  "title",
  "originalTitle",
  "providerMediaType",
  "normalizedContentType",
  "originCountryCodes",
  "providerGenreIds",
  "providerGenreNames",
  "canonicalGenreValues",
  "semanticHorrorEvidence",
  "semanticConfidence",
  "hardFilterStatus",
  "detailOrderIndex",
  "budgetDecision",
  "finalEligibility",
  "exclusionStage",
  "exclusionReason",
  "traceDropReason",
  "identityCompleteness",
  "missingIdentityFields",
  "rankingScore",
  "scoreComponents",
  "rankBeforeAssembly",
  "rankAfterAssembly",
  "selected",
]);

const REQUEST_FIELDS = Object.freeze([
  "endpointPath",
  "requestKind",
  "providerMediaType",
  "tmdbId",
  "requestSource",
  "httpStatus",
  "terminalResult",
  "elapsedMs",
  "retryCount",
]);

const SUMMARY_FIELDS = Object.freeze([
  "schemaVersion",
  "taskId",
  "findingId",
  "runId",
  "runMode",
  "dataSource",
  "sourceComponent",
  "provider",
  "providerMediaType",
  "sourceTaskId",
  "page",
  "totalResults",
  "inputCount",
  "outputCount",
  "retainedCandidateIds",
  "excludedCandidateIds",
  "exclusionReasons",
  "productScoreThreshold",
  "candidateUniverseSource",
  "cacheIdentity",
  "cacheHit",
  "cacheMiss",
  "cacheWrite",
  "cacheEntryAge",
  "reusedFinalResult",
  "recomputedPipeline",
  "requestBudgetTotal",
  "requestBudgetList",
  "requestBudgetDetail",
  "requestConcurrency",
  "requestsUsed",
  "listRequestsUsed",
  "detailRequestsUsed",
  "cacheHits",
  "retryCount",
  "productDetailLimit",
  "diagnosticDetailLimit",
  "finalCandidateIds",
  "status",
]);

const EVENT_FIELD_ALLOWLIST = new Map([
  ["retrieval-row", new Set(CANDIDATE_FIELDS)],
  ["duplicate-decision", new Set(CANDIDATE_FIELDS)],
  ["preliminary-decision", new Set(CANDIDATE_FIELDS)],
  ["detail-order", new Set(CANDIDATE_FIELDS)],
  ["detail-budget", new Set(CANDIDATE_FIELDS)],
  ["detail-request-result", new Set(REQUEST_FIELDS)],
  ["normalized-evaluation", new Set(CANDIDATE_FIELDS)],
  ["exclusion-decision", new Set(CANDIDATE_FIELDS)],
  ["final-eligibility", new Set(CANDIDATE_FIELDS)],
  ...SUMMARY_EVENT_TYPES.map((type) => [type, new Set(SUMMARY_FIELDS)]),
]);

export const TMDB_OBSERVABILITY_LIMITS = Object.freeze({
  maximumEventCount: 512,
  maximumCandidateRegistry: 512,
  maximumNestingDepth: 32,
  maximumEvidenceBytes: 2 * 1024 * 1024,
  maximumStringLength: 2_000,
  maximumPayloadBytes: 2 * 1024 * 1024,
});

export const TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT = Object.freeze({
  eventLimitScope: "PER_RUN_AND_AGGREGATE",
  maximumEventCountPerRun: 512,
  maximumRunCount: 3,
  maximumAggregateEventCount: 1536,
  runModes: Object.freeze(["cold", "warm-prime", "warm-measure"]),
});

const SECRET_KEY_PATTERN =
  /(?:authorization|api[_-]?key|apikey|bearer|token|secret|credential|password|cookie|session|header|query|process\.env|access[_-]?key|refresh[_-]?token|client[_-]?secret|stringifiederror|raw(?:response|payload|json)|overview|synopsis|cast|crew|image(?:url)?|fullurl)/i;
const FULL_URL_PATTERN = /\b(?:https?|file):\/\//i;
const QUERY_STRING_PATTERN = /\?(?:[^#\s]*=|[^#\s]*&)/;
const AUTHORIZATION_VALUE_PATTERN = /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{4,}/i;
const SECRET_ASSIGNMENT_PATTERN =
  /\b(?:api[_-]?key|apikey|access[_-]?key|access[_-]?token|authorization|bearer|token|cookie|session|secret|password|credential|refresh[_-]?token|client[_-]?secret)\s*[:=]\s*\S+/i;
const PROCESS_ENV_VALUE_PATTERN = /\bprocess\.env(?:\.|\[)/i;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/;
const SECRET_PREFIX_PATTERN = /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b/i;
const ABSOLUTE_PERSONAL_PATH_PATTERN =
  /(?:\b[A-Za-z]:[\\/]|(?:^|\s)\\\\[^\\]+[\\/]|\/(?:Users|home|root)\/)/i;
const TRAVERSAL_PATH_PATTERN = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const ENDPOINT_PATH_PATTERN = /^\/[a-z0-9._~/-]+$/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]+/g;
const SAFE_EVIDENCE_SECRET_SHAPED_FIELDS = new Set(["secretShapedOutputCount"]);
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const validSessions = new WeakSet();
const sessionState = new WeakMap();
const textEncoder = new TextEncoder();

function traceStageForEvent(type) {
  return LEGACY_STAGE_BY_EVENT[type] || type;
}

function failSession(session, message) {
  const state = sessionState.get(session);
  if (state) state.failed = true;
  throw new TypeError(message);
}

function sessionFor(session) {
  if (!session || (typeof session !== "object" && typeof session !== "function") || !validSessions.has(session)) {
    throw new TypeError("A valid opaque TMDB observability session is required.");
  }
  const state = sessionState.get(session);
  if (state.failed) throw new TypeError("The TMDB observability session is closed after a validation failure.");
  return state;
}

function normalizeString(session, value, fieldName) {
  const normalized = value.replace(CONTROL_CHARACTER_PATTERN, " ").replace(/\s+/g, " ").trim();
  if (normalized.length > TMDB_OBSERVABILITY_LIMITS.maximumStringLength) {
    failSession(session, `TMDB observability string limit exceeded for ${fieldName}.`);
  }
  if (
    FULL_URL_PATTERN.test(normalized) ||
    QUERY_STRING_PATTERN.test(normalized) ||
    AUTHORIZATION_VALUE_PATTERN.test(normalized) ||
    SECRET_ASSIGNMENT_PATTERN.test(normalized) ||
    PROCESS_ENV_VALUE_PATTERN.test(normalized) ||
    JWT_PATTERN.test(normalized) ||
    SECRET_PREFIX_PATTERN.test(normalized) ||
    ABSOLUTE_PERSONAL_PATH_PATTERN.test(normalized) ||
    TRAVERSAL_PATH_PATTERN.test(normalized)
  ) {
    failSession(session, `Unsafe or credential-shaped TMDB observability value rejected for ${fieldName}.`);
  }
  if (fieldName === "endpointPath" && (
    !ENDPOINT_PATH_PATTERN.test(normalized) ||
    normalized.includes("..") ||
    normalized.includes("\\")
  )) {
    failSession(session, "TMDB observability endpointPath must be a repository-safe path.");
  }
  return normalized;
}

function normalizeValue(session, value, fieldName) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) failSession(session, `Non-finite number rejected for ${fieldName}.`);
    return value;
  }
  if (typeof value === "string") return normalizeString(session, value, fieldName);
  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      if (entry !== null && !["boolean", "number", "string"].includes(typeof entry)) {
        failSession(session, `Unsafe nested value rejected for ${fieldName}[${index}].`);
      }
      return normalizeValue(session, entry, `${fieldName}[${index}]`);
    });
  }
  failSession(session, `Unsafe object serialization rejected for ${fieldName}.`);
}

function stableCopy(value) {
  if (Array.isArray(value)) return value.map(stableCopy);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableCopy(value[key])]),
  );
}

function deterministicPayload(events) {
  return JSON.stringify(stableCopy({ events }));
}

export function createTmdbObservabilitySession({
  runId = "legacy-observability-run",
  runMode = "legacy",
  sourceComponent = "src/lib/recommendation/qa/tmdbObservability.js",
} = {}) {
  if (typeof runId !== "string" || !runId.trim() || typeof runMode !== "string" || !runMode.trim()) {
    throw new TypeError("TMDB observability session requires a non-empty runId and runMode.");
  }
  if (typeof sourceComponent !== "string" || !sourceComponent.trim() || sourceComponent.includes("\\") || sourceComponent.includes("..")) {
    throw new TypeError("TMDB observability sourceComponent must be a repository-relative path.");
  }
  const session = Object.freeze(Object.create(null));
  validSessions.add(session);
  sessionState.set(session, {
    events: [],
    failed: false,
    finalized: false,
    serialized: "",
    runId: runId.trim(),
    runMode: runMode.trim(),
    sourceComponent: sourceComponent.trim(),
  });
  return session;
}

export function assertTmdbObservabilitySession(session) {
  const state = sessionFor(session);
  if (state.finalized) {
    throw new TypeError("A finalized TMDB observability session cannot be activated.");
  }
  return session;
}

export function tmdbObservabilitySessionMetadata(session) {
  const state = sessionFor(session);
  return {
    runId: state.runId,
    runMode: state.runMode,
    sourceComponent: state.sourceComponent,
  };
}

export function emitTmdbObservabilityEvent(session, type, fields = {}) {
  const state = sessionFor(session);
  if (state.finalized) failSession(session, "A finalized TMDB observability session cannot accept events.");
  if (!EVENT_FIELD_ALLOWLIST.has(type)) {
    failSession(session, `Unknown TMDB observability event type: ${String(type)}`);
  }
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    failSession(session, "TMDB observability event fields must be a plain object.");
  }
  if (state.events.length >= TMDB_OBSERVABILITY_LIMITS.maximumEventCount) {
    failSession(session, "TMDB observability event-count limit exceeded.");
  }

  const allowedFields = EVENT_FIELD_ALLOWLIST.get(type);
  const normalizedFields = {};
  for (const fieldName of Object.keys(fields).sort()) {
    if (SECRET_KEY_PATTERN.test(fieldName)) {
      failSession(session, `Secret-shaped TMDB observability field rejected: ${fieldName}`);
    }
    if (!allowedFields.has(fieldName)) {
      failSession(session, `Unknown field for TMDB observability event ${type}: ${fieldName}`);
    }
    if (fields[fieldName] === undefined) continue;
    normalizedFields[fieldName] = normalizeValue(session, fields[fieldName], fieldName);
  }

  const candidateId = typeof normalizedFields.candidateId === "string"
    ? normalizedFields.candidateId
    : Number.isSafeInteger(normalizedFields.tmdbId) && ["movie", "tv"].includes(normalizedFields.providerMediaType)
      ? `tmdb:${normalizedFields.providerMediaType}:${normalizedFields.tmdbId}`
      : null;
  const event = Object.freeze({
    sequence: state.events.length,
    type,
    stage: traceStageForEvent(type),
    ...normalizedFields,
    eventId: `${state.runId}:event:${state.events.length}`,
    sourceComponent: normalizedFields.sourceComponent || state.sourceComponent,
    candidateId,
    inputCount: Number.isSafeInteger(normalizedFields.inputCount) ? normalizedFields.inputCount : 0,
    outputCount: Number.isSafeInteger(normalizedFields.outputCount) ? normalizedFields.outputCount : 0,
    retainedCandidateIds: Array.isArray(normalizedFields.retainedCandidateIds)
      ? [...normalizedFields.retainedCandidateIds]
      : [],
    excludedCandidateIds: Array.isArray(normalizedFields.excludedCandidateIds)
      ? [...normalizedFields.excludedCandidateIds]
      : [],
    exclusionReasons: Array.isArray(normalizedFields.exclusionReasons)
      ? [...normalizedFields.exclusionReasons]
      : [],
    runId: state.runId,
    runMode: state.runMode,
  });
  const nextEvents = [...state.events, event];
  const serialized = deterministicPayload(nextEvents);
  if (textEncoder.encode(serialized).byteLength > TMDB_OBSERVABILITY_LIMITS.maximumPayloadBytes) {
    failSession(session, "TMDB observability total-payload limit exceeded.");
  }
  state.events.push(event);
  return event.sequence;
}

export function finalizeTmdbObservabilitySession(session) {
  const state = sessionFor(session);
  if (!state.finalized) {
    state.serialized = deterministicPayload(state.events);
    state.finalized = true;
  }
  return state.serialized;
}

export function tmdbObservabilityEventCount(session) {
  return sessionFor(session).events.length;
}

export function validateTmdbObservabilityLedger(serialized) {
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new TypeError("TMDB observability ledger must be valid JSON.");
  }
  if (!parsed || !Array.isArray(parsed.events)) {
    throw new TypeError("TMDB observability ledger requires an events array.");
  }
  if (parsed.events.length > TMDB_OBSERVABILITY_LIMITS.maximumEventCount) {
    throw new TypeError("EVENT_LIMIT_EXCEEDED.");
  }
  const sequences = new Set();
  const eventIds = new Set();
  parsed.events.forEach((event, index) => {
    if (!event || typeof event.eventId !== "string" || !event.eventId || eventIds.has(event.eventId) ||
      !Number.isSafeInteger(event.sequence) || sequences.has(event.sequence)) {
      throw new TypeError("TMDB observability ledger has a duplicate or invalid event sequence.");
    }
    if (event.sequence !== index || !TMDB_OBSERVABILITY_TRACE_STAGES.includes(event.stage) ||
      typeof event.runId !== "string" || !event.runId || typeof event.runMode !== "string" || !event.runMode ||
      typeof event.sourceComponent !== "string" || !event.sourceComponent ||
      !Number.isSafeInteger(event.inputCount) || !Number.isSafeInteger(event.outputCount) ||
      !Array.isArray(event.retainedCandidateIds) || !Array.isArray(event.excludedCandidateIds) ||
      !Array.isArray(event.exclusionReasons)) {
      throw new TypeError("TMDB observability ledger has an invalid event order or stage.");
    }
    sequences.add(event.sequence);
    eventIds.add(event.eventId);
  });
  return parsed;
}

export function assertTmdbObservabilityBehaviorInvariant(baseline, observed) {
  const baselineJson = JSON.stringify(stableCopy(baseline));
  const observedJson = JSON.stringify(stableCopy(observed));
  if (baselineJson !== observedJson) {
    throw new TypeError("TMDB observability changed the Product behavior snapshot.");
  }
  return true;
}

function safeEvidenceValue(value, fieldPath = "evidence", depth = 0, seen = new WeakSet()) {
  if (depth > TMDB_OBSERVABILITY_LIMITS.maximumNestingDepth) {
    throw new TypeError(`MAX_DEPTH_EXCEEDED for ${fieldPath}.`);
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`Non-finite evidence value rejected for ${fieldPath}.`);
    return value;
  }
  if (typeof value === "string") {
    if (SECRET_KEY_PATTERN.test(fieldPath) && !fieldPath.endsWith(".secretShapedOutputCount")) {
      throw new TypeError(`Secret-shaped evidence field rejected: ${fieldPath}`);
    }
    const normalized = value.replace(CONTROL_CHARACTER_PATTERN, " ").replace(/\s+/g, " ").trim();
    if (normalized.length > TMDB_OBSERVABILITY_LIMITS.maximumStringLength) {
      throw new TypeError(`TMDB observability string limit exceeded for ${fieldPath}.`);
    }
    if (
      FULL_URL_PATTERN.test(normalized) ||
      QUERY_STRING_PATTERN.test(normalized) ||
      AUTHORIZATION_VALUE_PATTERN.test(normalized) ||
      SECRET_ASSIGNMENT_PATTERN.test(normalized) ||
      PROCESS_ENV_VALUE_PATTERN.test(normalized) ||
      JWT_PATTERN.test(normalized) ||
      SECRET_PREFIX_PATTERN.test(normalized) ||
      ABSOLUTE_PERSONAL_PATH_PATTERN.test(normalized) ||
      TRAVERSAL_PATH_PATTERN.test(normalized)
    ) {
      throw new TypeError(`Unsafe or credential-shaped evidence value rejected for ${fieldPath}.`);
    }
    return normalized;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError(`CIRCULAR_REFERENCE_REJECTED for ${fieldPath}.`);
    seen.add(value);
    const result = value.map((entry, index) => safeEvidenceValue(entry, `${fieldPath}[${index}]`, depth + 1, seen));
    seen.delete(value);
    return result;
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`Unsafe evidence value rejected for ${fieldPath}.`);
  }
  if (seen.has(value)) throw new TypeError(`CIRCULAR_REFERENCE_REJECTED for ${fieldPath}.`);
  seen.add(value);
  const result = Object.fromEntries(Object.keys(value).sort().map((key) => {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) {
      throw new TypeError(`FORBIDDEN_OBJECT_KEY_REJECTED for ${fieldPath}.${key}.`);
    }
    if (SECRET_KEY_PATTERN.test(key) && !SAFE_EVIDENCE_SECRET_SHAPED_FIELDS.has(key)) {
      throw new TypeError(`Secret-shaped evidence field rejected: ${fieldPath}.${key}`);
    }
    return [key, safeEvidenceValue(value[key], `${fieldPath}.${key}`, depth + 1, seen)];
  }));
  seen.delete(value);
  return result;
}

function candidateIdFromEvent(event) {
  if (typeof event.candidateId === "string" && event.candidateId) return event.candidateId;
  if (Number.isSafeInteger(event.tmdbId) && ["movie", "tv"].includes(event.providerMediaType)) {
    return `tmdb:${event.providerMediaType}:${event.tmdbId}`;
  }
  return "";
}

function validateStageSummaries(stages) {
  if (!Array.isArray(stages)) throw new TypeError("TMDB observability evidence requires stage summaries.");
  const byStage = new Map();
  for (const entry of stages) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError("TMDB observability stage summary must be an object.");
    }
    if (!TMDB_OBSERVABILITY_TRACE_STAGES.includes(entry.stage) || byStage.has(entry.stage)) {
      throw new TypeError("TMDB observability evidence has an invalid or duplicate stage summary.");
    }
    if (!Number.isSafeInteger(entry.inputCount) || !Number.isSafeInteger(entry.outputCount) ||
      entry.inputCount < 0 || entry.outputCount < 0) {
      throw new TypeError("TMDB observability stage counts must be non-negative integers.");
    }
    if (!Number.isSafeInteger(entry.sequence) || entry.sequence !== TMDB_OBSERVABILITY_TRACE_STAGES.indexOf(entry.stage)) {
      throw new TypeError("TMDB observability stage summary requires the canonical deterministic sequence.");
    }
    if (typeof entry.sourceComponent !== "string" || !entry.sourceComponent.trim()) {
      throw new TypeError("TMDB observability stage summary requires a source component.");
    }
    const retainedCandidateIds = Array.isArray(entry.retainedCandidateIds) ? entry.retainedCandidateIds : [];
    const excludedCandidateIds = Array.isArray(entry.excludedCandidateIds) ? entry.excludedCandidateIds : [];
    const exclusionReasons = Array.isArray(entry.exclusionReasons) ? entry.exclusionReasons : [];
    if (retainedCandidateIds.some((id) => typeof id !== "string" || !id) ||
      excludedCandidateIds.some((id) => typeof id !== "string" || !id) ||
      exclusionReasons.some((reason) => !TMDB_OBSERVABILITY_DROP_REASONS.includes(reason))) {
      throw new TypeError("TMDB observability stage summary contains an invalid candidate ID or drop reason.");
    }
    if (retainedCandidateIds.length && retainedCandidateIds.length !== entry.outputCount) {
      throw new TypeError("TMDB observability stage output count does not match retained candidate IDs.");
    }
    if (entry.stage === "final-exclusion" && excludedCandidateIds.length !== entry.outputCount) {
      throw new TypeError("TMDB observability final-exclusion count does not match excluded candidate IDs.");
    }
    if (excludedCandidateIds.length > entry.inputCount) {
      throw new TypeError("TMDB observability stage excludes more candidates than it receives.");
    }
    if (excludedCandidateIds.length && !exclusionReasons.length) {
      throw new TypeError("TMDB observability stage exclusions require a stable drop reason.");
    }
    byStage.set(entry.stage, {
      stage: entry.stage,
      inputCount: entry.inputCount,
      outputCount: entry.outputCount,
      retainedCandidateIds: [...retainedCandidateIds],
      excludedCandidateIds: [...excludedCandidateIds],
      exclusionReasons: [...exclusionReasons],
      sourceComponent: entry.sourceComponent,
      sequence: entry.sequence,
    });
  }
  if (byStage.size !== TMDB_OBSERVABILITY_TRACE_STAGES.length) {
    throw new TypeError("TMDB observability evidence is missing a required trace stage.");
  }
  return TMDB_OBSERVABILITY_TRACE_STAGES.map((stage) => byStage.get(stage));
}

export function buildTmdbObservabilityEvidence({
  session,
  run,
  productContract,
  requestBudget,
  cache,
  stages,
  candidates,
  finalCandidateIds,
  excludedCandidates,
  summary,
} = {}) {
  const serialized = finalizeTmdbObservabilitySession(session);
  const parsed = validateTmdbObservabilityLedger(serialized);
  const normalizedStages = validateStageSummaries(stages);
  if (!Array.isArray(candidates) || !Array.isArray(finalCandidateIds) || !Array.isArray(excludedCandidates)) {
    throw new TypeError("TMDB observability evidence candidate fields must be arrays.");
  }
  if (candidates.length > TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry ||
    finalCandidateIds.length > TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry ||
    excludedCandidates.length > TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry) {
    throw new TypeError("CANDIDATE_LIMIT_EXCEEDED.");
  }
  if (!requestBudget || typeof requestBudget !== "object" ||
    requestBudget.total !== 24 || requestBudget.list !== 8 || requestBudget.detail !== 16 ||
    requestBudget.concurrency !== 4 || requestBudget.retryCount !== 0 ||
    requestBudget.requestsUsed > 24 || requestBudget.listRequestsUsed > 8 ||
    requestBudget.detailRequestsUsed > 16) {
    throw new TypeError("REQUEST_CONTRACT_INVALID: expected 24/8/16, concurrency 4, retry 0.");
  }
  const normalizedCandidates = safeEvidenceValue(candidates, "candidates");
  const candidateIds = new Set(normalizedCandidates.map((candidate) => candidate?.candidateId).filter(Boolean));
  if (candidateIds.size !== normalizedCandidates.length || [...candidateIds].some((id) => typeof id !== "string")) {
    throw new TypeError("TMDB observability evidence candidate registry is incomplete or duplicated.");
  }
  if (finalCandidateIds.some((id) => !candidateIds.has(id))) {
    throw new TypeError("TMDB observability evidence final candidate is absent from the registry.");
  }
  const finalIds = new Set(finalCandidateIds);
  if (finalIds.size !== finalCandidateIds.length) {
    throw new TypeError("TMDB observability evidence final candidate registry is duplicated.");
  }
  const excludedIds = new Set(excludedCandidates.map((candidate) => candidate?.candidateId).filter(Boolean));
  if (excludedIds.size !== excludedCandidates.length) {
    throw new TypeError("TMDB observability evidence excluded candidate registry is duplicated.");
  }
  if ([...finalIds].some((id) => excludedIds.has(id))) {
    throw new TypeError("TMDB observability evidence final and excluded candidate sets overlap.");
  }
  if (candidateIds.size !== finalIds.size + excludedIds.size ||
    [...candidateIds].some((id) => !finalIds.has(id) && !excludedIds.has(id))) {
    throw new TypeError("TMDB observability evidence final and excluded sets do not cover the registry.");
  }
  for (const candidate of excludedCandidates) {
    if (!candidateIds.has(candidate?.candidateId) || !TMDB_OBSERVABILITY_DROP_REASONS.includes(candidate?.traceDropReason)) {
      throw new TypeError("TMDB observability evidence exclusion is incomplete.");
    }
    if (candidate.traceDropReason === "unknown-uninstrumented-drop" && !candidate.exclusionReason) {
      throw new TypeError("TMDB observability unknown drop requires an explicit explanation.");
    }
  }
  const eventStages = new Set(parsed.events.map((event) => event.stage));
  if (!TMDB_OBSERVABILITY_TRACE_STAGES.every((stage) => eventStages.has(stage))) {
    throw new TypeError("TMDB observability event ledger is missing a required trace stage.");
  }

  const normalizedEvidence = safeEvidenceValue({
    schemaVersion: "myott.qa-observability.v1",
    taskId: run?.taskId,
    findingId: run?.findingId,
    runId: run?.runId,
    runMode: run?.runMode,
    generatedAt: run?.generatedAt,
    repositoryCommit: run?.repositoryCommit,
    repositoryDirtyState: run?.repositoryDirtyState,
    input: run?.input,
    productContract,
    requestBudget,
    cache,
    stages: normalizedStages,
    candidates: normalizedCandidates,
    finalCandidateIds: [...finalCandidateIds],
    excludedCandidates: safeEvidenceValue(excludedCandidates, "excludedCandidates"),
    redactionValidation: {
      status: "PASS",
      secretShapedOutputCount: 0,
    },
    integrity: {
      eventCount: parsed.events.length,
      requiredStageCount: TMDB_OBSERVABILITY_TRACE_STAGES.length,
      candidateRegistryCount: normalizedCandidates.length,
    },
    summary,
  }, "evidence");
  const serializedEvidence = JSON.stringify(normalizedEvidence);
  if (textEncoder.encode(serializedEvidence).byteLength > TMDB_OBSERVABILITY_LIMITS.maximumEvidenceBytes) {
    throw new TypeError("EVIDENCE_BYTE_LIMIT_EXCEEDED.");
  }
  return normalizedEvidence;
}

function comparableStageSummary(entry) {
  return {
    stage: entry.stage,
    sequence: TMDB_OBSERVABILITY_TRACE_STAGES.indexOf(entry.stage),
    inputCount: entry.inputCount,
    outputCount: entry.outputCount,
    retainedCandidateIds: [...entry.retainedCandidateIds],
    excludedCandidateIds: [...entry.excludedCandidateIds],
    exclusionReasons: [...entry.exclusionReasons],
    sourceComponent: entry.sourceComponent,
  };
}

export function summarizeTmdbObservabilityLedger(serialized) {
  const parsed = validateTmdbObservabilityLedger(serialized);
  const summaryEvents = new Map();
  for (const event of parsed.events) {
    if (SUMMARY_EVENT_TYPES.includes(event.type)) {
      if (summaryEvents.has(event.stage)) {
        throw new TypeError(`Duplicate raw summary event for ${event.stage}.`);
      }
      summaryEvents.set(event.stage, event);
    }
  }
  if (summaryEvents.size !== TMDB_OBSERVABILITY_TRACE_STAGES.length) {
    throw new TypeError("Raw Event Ledger cannot reconstruct all 17 stage summaries.");
  }
  return TMDB_OBSERVABILITY_TRACE_STAGES.map((stage) => comparableStageSummary(summaryEvents.get(stage)));
}

function validateTerminalProvenance(terminalProvenance, candidateRegistry, finalCandidateIds) {
  if (!Array.isArray(terminalProvenance) || terminalProvenance.length !== candidateRegistry.length) {
    throw new TypeError("TERMINAL_PROVENANCE_INCOMPLETE.");
  }
  const registryIds = new Set(candidateRegistry.map((candidate) => candidate.candidateId));
  const finalIds = new Set(finalCandidateIds);
  const provenanceIds = new Set();
  for (const entry of terminalProvenance) {
    if (!entry || typeof entry !== "object" || typeof entry.candidateId !== "string" ||
      provenanceIds.has(entry.candidateId) || !registryIds.has(entry.candidateId) ||
      typeof entry.rankingInput !== "boolean" || typeof entry.selected !== "boolean" ||
      typeof entry.terminalStage !== "string" || typeof entry.terminalReason !== "string" ||
      !entry.terminalStage || !entry.terminalReason) {
      throw new TypeError("TERMINAL_PROVENANCE_INVALID.");
    }
    if (entry.selected !== finalIds.has(entry.candidateId)) {
      throw new TypeError("TERMINAL_PROVENANCE_SELECTION_MISMATCH.");
    }
    if (entry.rankingInput) {
      if (!Number.isFinite(entry.score) || !Array.isArray(entry.scoreComponents) ||
        typeof entry.tier !== "string" || !Number.isSafeInteger(entry.rankBeforeAssembly) ||
        entry.rankBeforeAssembly < 1 ||
        (!Number.isSafeInteger(entry.rankAfterAssembly) && entry.assemblyExclusion !== true)) {
        throw new TypeError("RANKING_TERMINAL_PROVENANCE_INCOMPLETE.");
      }
    } else if (entry.score !== null || entry.rankBeforeAssembly !== null ||
      entry.rankAfterAssembly !== null || typeof entry.exclusionStage !== "string" ||
      typeof entry.exclusionReason !== "string" || !entry.exclusionStage || !entry.exclusionReason) {
      throw new TypeError("PRE_RANKING_TERMINAL_PROVENANCE_INCOMPLETE.");
    }
    if (entry.terminalReason === "unknown-uninstrumented-drop") {
      throw new TypeError("UNKNOWN_TERMINAL_PROVENANCE.");
    }
    provenanceIds.add(entry.candidateId);
  }
  if (provenanceIds.size !== registryIds.size) throw new TypeError("TERMINAL_PROVENANCE_REGISTRY_MISMATCH.");
  return terminalProvenance;
}

function validateCorrectedRunRecords(runs) {
  const requiredModes = ["cold", "warm-prime", "warm-measure"];
  if (!Array.isArray(runs) || runs.length !== requiredModes.length) {
    throw new TypeError("THREE_RUN_MODE_CONTRACT_INVALID.");
  }
  const seenModes = new Set();
  const seenIds = new Set();
  for (const run of runs) {
    if (!run || typeof run.runId !== "string" || !run.runId || typeof run.runMode !== "string" ||
      !requiredModes.includes(run.runMode) || seenModes.has(run.runMode) || seenIds.has(run.runId) ||
      !run.result || typeof run.ledger !== "string") {
      throw new TypeError("THREE_RUN_MODE_CONTRACT_INVALID.");
    }
    const metadata = tmdbObservabilitySessionMetadata(run.session);
    if (metadata.runId !== run.runId || metadata.runMode !== run.runMode) {
      throw new TypeError("RUN_METADATA_MISMATCH.");
    }
    const ledger = validateTmdbObservabilityLedger(run.ledger);
    if (ledger.events.some((event) => event.runId !== run.runId || event.runMode !== run.runMode)) {
      throw new TypeError("RAW_LEDGER_RUN_METADATA_MISMATCH.");
    }
    const reconstructed = summarizeTmdbObservabilityLedger(run.ledger);
    const actualStages = validateStageSummaries(run.result.traceStages).map(comparableStageSummary);
    if (JSON.stringify(reconstructed) !== JSON.stringify(actualStages)) {
      throw new TypeError("LEDGER_SUMMARY_RECOMPUTATION_MISMATCH.");
    }
    const requestBudget = run.result.traceSummary?.requestBudget;
    if (!requestBudget || requestBudget.total !== 24 || requestBudget.list !== 8 ||
      requestBudget.detail !== 16 || requestBudget.concurrency !== 4 || requestBudget.retryCount !== 0) {
      throw new TypeError("REQUEST_CONTRACT_INVALID: expected 24/8/16, concurrency 4, retry 0.");
    }
    const cache = run.result.traceSummary?.cache;
    if (!cache || typeof cache.cacheHit !== "boolean" || typeof cache.cacheMiss !== "boolean" ||
      typeof cache.cacheWrite !== "boolean" || typeof cache.reusedFinalResult !== "boolean" ||
      typeof cache.recomputedPipeline !== "boolean" ||
      typeof run.result.traceSummary.candidateUniverseSource !== "string" ||
      !Array.isArray(run.result.finalCandidateIds)) {
      throw new TypeError("RUN_CACHE_AND_RESULT_CONTRACT_INVALID.");
    }
    seenModes.add(run.runMode);
    seenIds.add(run.runId);
  }
  if (seenModes.size !== requiredModes.length) throw new TypeError("THREE_RUN_MODE_CONTRACT_INVALID.");
  return runs;
}

export function validateCorrectedEventLimitContract(runs, resourceLimits) {
  const contract = TMDB_OBSERVABILITY_EVENT_LIMIT_CONTRACT;
  if (!Array.isArray(runs) || runs.length !== contract.maximumRunCount ||
    !resourceLimits || typeof resourceLimits !== "object" ||
    resourceLimits.status !== "PASS" ||
    resourceLimits.eventLimitScope !== contract.eventLimitScope ||
    resourceLimits.maximumEventCountPerRun !== contract.maximumEventCountPerRun ||
    resourceLimits.maximumRunCount !== contract.maximumRunCount ||
    resourceLimits.maximumAggregateEventCount !== contract.maximumAggregateEventCount ||
    Object.hasOwn(resourceLimits, "maximumEventCount")) {
    throw new TypeError("EVENT_LIMIT_CONTRACT_DECLARATION_INVALID.");
  }
  const expectedModes = [...contract.runModes].sort();
  const runCounts = {};
  for (const mode of contract.runModes) {
    const run = runs.find((candidate) => candidate?.runMode === mode);
    if (!run || typeof run.ledger !== "string") {
      throw new TypeError("EVENT_LIMIT_RUN_MODE_INVALID.");
    }
    let parsed;
    try {
      parsed = JSON.parse(run.ledger);
    } catch {
      throw new TypeError("EVENT_LIMIT_LEDGER_JSON_INVALID.");
    }
    if (!parsed || !Array.isArray(parsed.events)) {
      throw new TypeError("EVENT_LIMIT_LEDGER_EVENTS_INVALID.");
    }
    runCounts[mode] = parsed.events.length;
    if (parsed.events.length > contract.maximumEventCountPerRun) {
      throw new TypeError("EVENT_LIMIT_PER_RUN_EXCEEDED.");
    }
  }
  if (Object.keys(runCounts).sort().join("|") !== expectedModes.join("|")) {
    throw new TypeError("EVENT_LIMIT_RUN_MODE_INVALID.");
  }
  const actualAggregateEventCount = Object.values(runCounts).reduce((sum, count) => sum + count, 0);
  if (actualAggregateEventCount > contract.maximumAggregateEventCount) {
    throw new TypeError("EVENT_LIMIT_AGGREGATE_EXCEEDED.");
  }
  if (!resourceLimits.actualEventCountByRun || typeof resourceLimits.actualEventCountByRun !== "object" ||
    Array.isArray(resourceLimits.actualEventCountByRun) ||
    Object.keys(resourceLimits.actualEventCountByRun).sort().join("|") !== expectedModes.join("|") ||
    contract.runModes.some((mode) => resourceLimits.actualEventCountByRun[mode] !== runCounts[mode])) {
    throw new TypeError("EVENT_LIMIT_RUN_COUNT_DECLARATION_MISMATCH.");
  }
  if (resourceLimits.actualAggregateEventCount !== actualAggregateEventCount) {
    throw new TypeError("EVENT_LIMIT_AGGREGATE_DECLARATION_MISMATCH.");
  }
  return {
    ...resourceLimits,
    actualEventCountByRun: { ...runCounts },
    actualAggregateEventCount,
  };
}

export function buildCorrectedTmdbObservabilityEvidence({
  taskId,
  findingId,
  validationPurpose,
  input,
  productContract,
  runs,
  candidateRegistry,
  finalCandidateIds,
  excludedCandidates,
  terminalProvenance,
  rankingProvenance,
  sourceHashes,
  redactionValidation,
  outputBoundaryValidation,
  resourceLimits,
  eventLimitFixtureValidation,
  noClobberPublishValidation,
  staticValidation,
  integrity,
} = {}) {
  if (validationPurpose !== "EVENT_LIMIT_AND_IMMUTABLE_OUTPUT_CORRECTION") {
    throw new TypeError("CORRECTION_VALIDATION_PURPOSE_REQUIRED.");
  }
  validateCorrectedRunRecords(runs);
  const validatedResourceLimits = validateCorrectedEventLimitContract(runs, resourceLimits);
  const validatedProvenance = validateTerminalProvenance(
    terminalProvenance,
    candidateRegistry,
    finalCandidateIds,
  );
  if (JSON.stringify(validatedProvenance) !== JSON.stringify(rankingProvenance)) {
    throw new TypeError("RANKING_PROVENANCE_MISMATCH.");
  }
  if (!Array.isArray(candidateRegistry) || !Array.isArray(finalCandidateIds) || !Array.isArray(excludedCandidates) ||
    candidateRegistry.length > TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry ||
    finalCandidateIds.length > TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry ||
    excludedCandidates.length > TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry) {
    throw new TypeError("CANDIDATE_REGISTRY_LIMIT_EXCEEDED.");
  }
  const registryIds = new Set(candidateRegistry.map((candidate) => candidate?.candidateId).filter(Boolean));
  const finalIds = new Set(finalCandidateIds);
  const excludedIds = new Set(excludedCandidates.map((candidate) => candidate?.candidateId).filter(Boolean));
  if (registryIds.size !== candidateRegistry.length || finalIds.size !== finalCandidateIds.length ||
    excludedIds.size !== excludedCandidates.length ||
    [...finalIds].some((id) => !registryIds.has(id)) ||
    [...excludedIds].some((id) => !registryIds.has(id)) ||
    [...finalIds].some((id) => excludedIds.has(id)) ||
    registryIds.size !== finalIds.size + excludedIds.size ||
    [...registryIds].some((id) => !finalIds.has(id) && !excludedIds.has(id))) {
    throw new TypeError("CORRECTED_CANDIDATE_REGISTRY_COVERAGE_INVALID.");
  }
  if (excludedCandidates.some((candidate) =>
    !TMDB_OBSERVABILITY_DROP_REASONS.includes(candidate?.traceDropReason) ||
    candidate.traceDropReason === "unknown-uninstrumented-drop" ||
    !candidate.exclusionReason)) {
    throw new TypeError("CORRECTED_CANDIDATE_EXCLUSION_PROVENANCE_INVALID.");
  }
  const cold = runs.find((run) => run.runMode === "cold");
  const requestBudget = cold.result.traceSummary.requestBudget;
  const baseEvidence = {
    schemaVersion: "myott.qa-observability.v1.correction-2",
    taskId,
    findingId,
    validationPurpose,
    dataSource: "DETERMINISTIC_FIXTURE",
    input,
    productContract,
    threeRunEvidence: Object.fromEntries(runs.map((run) => [run.runMode, {
      runId: run.runId,
      runMode: run.runMode,
      cache: run.result.traceSummary.cache,
      candidateUniverseSource: run.result.traceSummary.candidateUniverseSource,
      finalCandidateIds: run.result.finalCandidateIds,
      requestBudget: run.result.traceSummary.requestBudget,
    }])),
    rawEventLedger: Object.fromEntries(runs.map((run) => [run.runMode, JSON.parse(run.ledger).events])),
    stageSummaries: Object.fromEntries(runs.map((run) => [run.runMode, run.result.traceStages])),
    candidateRegistry,
    terminalProvenance: validatedProvenance,
    rankingProvenance,
    requestContractValidation: {
      expected: { total: 24, list: 8, detail: 16, concurrency: 4, retryCount: 0 },
      actual: requestBudget,
      status: requestBudget.total === 24 && requestBudget.list === 8 && requestBudget.detail === 16 &&
        requestBudget.concurrency === 4 && requestBudget.retryCount === 0 ? "PASS" : "FAIL",
    },
    finalCandidateIds,
    excludedCandidates,
    redactionValidation,
    outputBoundaryValidation,
    resourceLimits: validatedResourceLimits,
    eventLimitFixtureValidation,
    noClobberPublishValidation,
    raceFixtureValidation: noClobberPublishValidation ? {
      status: noClobberPublishValidation.destinationRacePreserved && noClobberPublishValidation.existingDestinationRejected
        ? "PASS" : "FAIL",
      destinationRacePreserved: noClobberPublishValidation.destinationRacePreserved,
      existingDestinationRejected: noClobberPublishValidation.existingDestinationRejected,
    } : null,
    concurrentWriterValidation: noClobberPublishValidation ? {
      status: noClobberPublishValidation.concurrentSingleWinner ? "PASS" : "FAIL",
      singleWinner: noClobberPublishValidation.concurrentSingleWinner,
    } : null,
    staticValidation,
    integrity: {
      ...integrity,
      sourceHashCount: Object.keys(sourceHashes || {}).length,
      runCount: runs.length,
      rawLedgerEventCount: runs.reduce((sum, run) => sum + JSON.parse(run.ledger).events.length, 0),
      sourceHashes,
    },
  };
  const normalized = safeEvidenceValue(baseEvidence, "correctedEvidence");
  if (normalized.requestContractValidation.status !== "PASS" ||
    normalized.redactionValidation.unexpectedPasses !== 0 ||
    normalized.outputBoundaryValidation.status !== "PASS" ||
    normalized.resourceLimits.status !== "PASS" ||
    normalized.eventLimitFixtureValidation?.status !== "PASS" ||
    normalized.noClobberPublishValidation?.status !== "PASS" ||
    normalized.staticValidation?.status !== "PASS") {
    throw new TypeError("CORRECTED_EVIDENCE_VALIDATION_FAILED.");
  }
  const serialized = JSON.stringify(normalized);
  if (textEncoder.encode(serialized).byteLength > TMDB_OBSERVABILITY_LIMITS.maximumEvidenceBytes) {
    throw new TypeError("EVIDENCE_BYTE_LIMIT_EXCEEDED.");
  }
  return normalized;
}
