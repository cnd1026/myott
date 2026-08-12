export const TMDB_OBSERVABILITY_INTEGRITY_CODE = "TMDB_OBSERVABILITY_INTEGRITY_FAILED";

export const TMDB_OBSERVABILITY_LIMITS = Object.freeze({
  maximumEventCount: 512,
  maximumPayloadBytes: 2 * 1024 * 1024,
  maximumStringLength: 256,
  maximumArrayLength: 512,
});

export const TMDB_OBSERVABILITY_STAGES = Object.freeze([
  "retrieval",
  "normalization",
  "semantic-classification",
  "detail-enrichment",
  "hard-filter",
  "ranking",
  "final-selection",
]);

const SAFE_ERROR_STAGES = new Set([
  "session-creation",
  "context-binding",
  "event-emission",
  "finalization",
  "payload-validation",
]);
const ENDPOINT_CLASSES = new Set([
  "discover-movie",
  "discover-tv",
  "genre-movie",
  "genre-tv",
  "search-multi",
  "movie-detail",
  "tv-detail",
  "movie-recommendations",
  "tv-recommendations",
  "movie-similar",
  "tv-similar",
  "unknown-safe-endpoint",
]);
const REQUEST_KINDS = new Set(["list", "detail"]);
const REQUEST_STATUS_CLASSES = new Set([
  "success",
  "retryable-http-error",
  "http-error",
  "fetch-timeout",
  "deadline-exceeded",
  "transport-error",
  "payload-error",
]);
const CANDIDATE_DECISIONS = new Set(["selected", "excluded"]);
const EVENT_FIELDS = new Map([
  ["request-start", new Set(["requestId", "requestKind", "endpointClass", "retryIndex"])],
  ["request-complete", new Set(["requestId", "requestKind", "endpointClass", "retryIndex", "statusClass"])],
  ["request-failed", new Set(["requestId", "requestKind", "endpointClass", "retryIndex", "statusClass"])],
  ["request-cache-hit", new Set(["requestId", "requestKind", "endpointClass"])],
  ["request-dedup-hit", new Set(["requestId", "requestKind", "endpointClass"])],
  ["stage-summary", new Set(["stage", "inputCount", "outputCount", "excludedCount"])],
  ["candidate-decision", new Set(["candidateId", "stage", "decision", "reason", "rank"])],
  ["run-summary", new Set([
    "requestBudget",
    "listRequestBudget",
    "detailRequestBudget",
    "concurrencyLimit",
    "retryLimit",
    "fetchTimeoutMs",
    "recommendationDeadlineMs",
    "requestsUsed",
    "listRequestsUsed",
    "detailRequestsUsed",
    "cacheHits",
    "retryCount",
    "deadlineExceeded",
  ])],
]);
const SECRET_FIELD_PATTERN = /(authorization|api.?key|bearer|token|credential|secret|cookie|header|query|url|path|raw|payload|response|errorMessage)/i;
const UNSAFE_STRING_PATTERN = /(https?:\/\/|bearer\s+|authorization\s*[:=]|api[_-]?key\s*[:=]|token\s*[:=]|cookie\s*[:=]|[a-z]:\\|\/users\/|[?&][^=\s]+=[^\s]*)/i;
const textEncoder = new TextEncoder();
const sessions = new WeakMap();
let fallbackSessionSequence = 0;

export class TmdbObservabilityIntegrityError extends Error {
  constructor(stage = "payload-validation") {
    super("TMDB QA observability integrity validation failed.");
    this.name = "TmdbObservabilityIntegrityError";
    this.code = TMDB_OBSERVABILITY_INTEGRITY_CODE;
    this.stage = SAFE_ERROR_STAGES.has(stage) ? stage : "payload-validation";
  }
}

function fail(session, stage) {
  const state = sessions.get(session);
  if (state) state.failed = true;
  throw new TmdbObservabilityIntegrityError(stage);
}

function sessionState(session, stage = "context-binding") {
  if (!session || (typeof session !== "object" && typeof session !== "function")) {
    throw new TmdbObservabilityIntegrityError(stage);
  }
  const state = sessions.get(session);
  if (!state || state.failed) throw new TmdbObservabilityIntegrityError(stage);
  return state;
}

function nextOpaqueSessionId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `tmdb-qa-${uuid}`;
  fallbackSessionSequence += 1;
  return `tmdb-qa-process-${fallbackSessionSequence}`;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeScalar(session, field, value) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) fail(session, "event-emission");
    return value;
  }
  if (typeof value !== "string") fail(session, "event-emission");
  if (value.length > TMDB_OBSERVABILITY_LIMITS.maximumStringLength ||
      /[\u0000-\u001f\u007f]/.test(value) || UNSAFE_STRING_PATTERN.test(value)) {
    fail(session, "event-emission");
  }
  return value;
}

function normalizeValue(session, field, value) {
  if (!Array.isArray(value)) return normalizeScalar(session, field, value);
  if (value.length > TMDB_OBSERVABILITY_LIMITS.maximumArrayLength) fail(session, "event-emission");
  return value.map((entry) => normalizeScalar(session, field, entry));
}

function assertExactFields(session, type, fields) {
  const allowed = EVENT_FIELDS.get(type);
  if (!allowed || !isPlainObject(fields)) fail(session, "event-emission");
  const supplied = Object.keys(fields);
  if (supplied.length !== allowed.size || supplied.some((field) => !allowed.has(field)) ||
      [...allowed].some((field) => !Object.hasOwn(fields, field))) {
    fail(session, "event-emission");
  }
  if (supplied.some((field) => SECRET_FIELD_PATTERN.test(field))) fail(session, "event-emission");
}

function assertEventSemantics(session, type, fields) {
  const requestEvent = type.startsWith("request-");
  if (requestEvent) {
    if (!/^request-[1-9]\d*$/.test(fields.requestId) || !REQUEST_KINDS.has(fields.requestKind) ||
        !ENDPOINT_CLASSES.has(fields.endpointClass)) {
      fail(session, "event-emission");
    }
  }
  if (["request-start", "request-complete", "request-failed"].includes(type) &&
      (!Number.isSafeInteger(fields.retryIndex) || fields.retryIndex < 0 || fields.retryIndex > 2)) {
    fail(session, "event-emission");
  }
  if (["request-complete", "request-failed"].includes(type) && !REQUEST_STATUS_CLASSES.has(fields.statusClass)) {
    fail(session, "event-emission");
  }
  if (type === "stage-summary" &&
      (!TMDB_OBSERVABILITY_STAGES.includes(fields.stage) ||
       [fields.inputCount, fields.outputCount, fields.excludedCount].some((value) => !Number.isSafeInteger(value) || value < 0))) {
    fail(session, "event-emission");
  }
  if (type === "candidate-decision" &&
      (!/^tmdb:(?:movie|tv):[1-9]\d*$/.test(fields.candidateId) || fields.stage !== "final-selection" ||
       !CANDIDATE_DECISIONS.has(fields.decision) || typeof fields.reason !== "string" ||
       (fields.rank !== null && (!Number.isSafeInteger(fields.rank) || fields.rank < 1)))) {
    fail(session, "event-emission");
  }
  if (type === "run-summary") {
    const exactPolicy = fields.requestBudget === 24 && fields.listRequestBudget === 8 &&
      fields.detailRequestBudget === 16 && fields.concurrencyLimit === 4 && fields.retryLimit === 2 &&
      fields.fetchTimeoutMs === 8_000 && fields.recommendationDeadlineMs === 15_000;
    const safeUsage = [
      fields.requestsUsed,
      fields.listRequestsUsed,
      fields.detailRequestsUsed,
      fields.cacheHits,
      fields.retryCount,
    ].every((value) => Number.isSafeInteger(value) && value >= 0);
    if (!exactPolicy || !safeUsage || typeof fields.deadlineExceeded !== "boolean") {
      fail(session, "event-emission");
    }
  }
}

function payloadBytes(value) {
  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    return typeof serialized === "string" ? textEncoder.encode(serialized).byteLength : Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function summarizeEvents(events) {
  return {
    eventCount: events.length,
    requestAttemptCount: events.filter((event) => event.type === "request-start").length,
    requestCompleteCount: events.filter((event) => event.type === "request-complete").length,
    requestFailureCount: events.filter((event) => event.type === "request-failed").length,
    cacheHitCount: events.filter((event) => event.type === "request-cache-hit").length,
    dedupHitCount: events.filter((event) => event.type === "request-dedup-hit").length,
    stageCount: events.filter((event) => event.type === "stage-summary").length,
    selectedCandidateCount: events.filter((event) => event.type === "candidate-decision" && event.decision === "selected").length,
    excludedCandidateCount: events.filter((event) => event.type === "candidate-decision" && event.decision === "excluded").length,
  };
}

function assertLedgerRelations(session, events) {
  const starts = new Map();
  const terminals = new Set();
  const stages = new Set();
  const candidates = new Set();
  let runSummaryCount = 0;
  for (const event of events) {
    if (event.type === "request-start") {
      if (starts.has(event.requestId)) fail(session, "payload-validation");
      starts.set(event.requestId, event);
    }
    if (["request-complete", "request-failed"].includes(event.type)) {
      const start = starts.get(event.requestId);
      if (!start || terminals.has(event.requestId) || start.sequence >= event.sequence ||
          start.requestKind !== event.requestKind || start.endpointClass !== event.endpointClass ||
          start.retryIndex !== event.retryIndex) {
        fail(session, "payload-validation");
      }
      terminals.add(event.requestId);
    }
    if (event.type === "stage-summary") {
      if (stages.has(event.stage)) fail(session, "payload-validation");
      stages.add(event.stage);
    }
    if (event.type === "candidate-decision") {
      if (candidates.has(event.candidateId)) fail(session, "payload-validation");
      candidates.add(event.candidateId);
    }
    if (event.type === "run-summary") runSummaryCount += 1;
  }
  if (starts.size !== terminals.size || stages.size !== TMDB_OBSERVABILITY_STAGES.length ||
      TMDB_OBSERVABILITY_STAGES.some((stage) => !stages.has(stage)) || runSummaryCount !== 1) {
    fail(session, "payload-validation");
  }
}

export function createTmdbObservabilitySession(...args) {
  if (args.length) throw new TmdbObservabilityIntegrityError("session-creation");
  const session = Object.freeze(Object.create(null));
  sessions.set(session, {
    sessionId: nextOpaqueSessionId(),
    events: [],
    failed: false,
    finalized: null,
  });
  return session;
}

export function assertTmdbObservabilitySession(session) {
  const state = sessionState(session);
  if (state.finalized) throw new TmdbObservabilityIntegrityError("context-binding");
  return session;
}

export function tmdbObservabilitySessionFailed(session) {
  return Boolean(sessions.get(session)?.failed);
}

export function tmdbObservabilitySessionMetadata(session) {
  const state = sessionState(session);
  return Object.freeze({ sessionId: state.sessionId, eventCount: state.events.length });
}

export function emitTmdbObservabilityEvent(session, type, fields = {}) {
  const state = sessionState(session, "event-emission");
  if (state.finalized || state.events.length >= TMDB_OBSERVABILITY_LIMITS.maximumEventCount) {
    fail(session, "event-emission");
  }
  assertExactFields(session, type, fields);
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([field, value]) => [field, normalizeValue(session, field, value)]),
  );
  assertEventSemantics(session, type, normalizedFields);
  const event = { sequence: state.events.length + 1, type, ...normalizedFields };
  const candidate = {
    schemaVersion: "myott.current-product-observability.v1",
    sessionId: state.sessionId,
    events: [...state.events, event],
  };
  if (payloadBytes(candidate) > TMDB_OBSERVABILITY_LIMITS.maximumPayloadBytes) {
    fail(session, "event-emission");
  }
  state.events.push(Object.freeze(event));
  return event.sequence;
}

export function validateTmdbObservabilityEvidence(input) {
  if (payloadBytes(input) > TMDB_OBSERVABILITY_LIMITS.maximumPayloadBytes) {
    throw new TmdbObservabilityIntegrityError("payload-validation");
  }
  let parsed;
  try {
    parsed = typeof input === "string" ? JSON.parse(input) : JSON.parse(JSON.stringify(input));
  } catch {
    throw new TmdbObservabilityIntegrityError("payload-validation");
  }
  const rootKeys = Object.keys(parsed || {}).sort();
  if (rootKeys.join("|") !== ["events", "schemaVersion", "sessionId", "summary"].sort().join("|") ||
      parsed.schemaVersion !== "myott.current-product-observability.v1" ||
      !/^tmdb-qa-(?:[0-9a-f-]{36}|process-[1-9]\d*)$/.test(parsed.sessionId) ||
      !Array.isArray(parsed.events) || parsed.events.length > TMDB_OBSERVABILITY_LIMITS.maximumEventCount) {
    throw new TmdbObservabilityIntegrityError("payload-validation");
  }
  const validationSession = Object.freeze(Object.create(null));
  sessions.set(validationSession, {
    sessionId: parsed.sessionId,
    events: [],
    failed: false,
    finalized: null,
  });
  try {
    for (const [index, event] of parsed.events.entries()) {
      if (!isPlainObject(event) || event.sequence !== index + 1 || typeof event.type !== "string") {
        fail(validationSession, "payload-validation");
      }
      const { sequence, type, ...fields } = event;
      emitTmdbObservabilityEvent(validationSession, type, fields);
      if (sequence !== index + 1) fail(validationSession, "payload-validation");
    }
    assertLedgerRelations(validationSession, parsed.events);
    if (JSON.stringify(parsed.summary) !== JSON.stringify(summarizeEvents(parsed.events))) {
      fail(validationSession, "payload-validation");
    }
    return deepFreeze(parsed);
  } finally {
    sessions.delete(validationSession);
  }
}

export function finalizeTmdbObservabilitySession(session) {
  const state = sessionState(session, "finalization");
  if (state.finalized) return state.finalized;
  assertLedgerRelations(session, state.events);
  const evidence = {
    schemaVersion: "myott.current-product-observability.v1",
    sessionId: state.sessionId,
    events: state.events.map((event) => ({ ...event })),
    summary: summarizeEvents(state.events),
  };
  if (payloadBytes(evidence) > TMDB_OBSERVABILITY_LIMITS.maximumPayloadBytes) {
    fail(session, "finalization");
  }
  state.finalized = validateTmdbObservabilityEvidence(evidence);
  return state.finalized;
}
