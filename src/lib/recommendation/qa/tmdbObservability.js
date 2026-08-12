export const TMDB_OBSERVABILITY_INTEGRITY_CODE = "TMDB_OBSERVABILITY_INTEGRITY_FAILED";

export const TMDB_OBSERVABILITY_LIMITS = Object.freeze({
  maximumEventCount: 512,
  maximumPayloadBytes: 2 * 1024 * 1024,
  maximumStringLength: 256,
  maximumArrayLength: 512,
  maximumLineageCandidateCount: 72,
});

export const TMDB_OBSERVABILITY_ACCEPTED_WORST_CASE = Object.freeze({
  eventCount: 240,
  payloadBytes: 73_615,
});

const TMDB_OBSERVABILITY_SCHEMA_VERSION = "myott.current-product-observability.v2";

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
const ARRIVAL_STAGES = new Set([
  "exact-popularity-page-1",
  "exact-rating-page-1",
  "exact-breadth-page-2",
  "semantic-thriller-popularity-page-1",
  "same-country-relaxed-popularity-page-1",
]);
const PRE_DETAIL_BINARY_STATES = new Set(["pass", "fail"]);
const PRE_DETAIL_COUNTRY_STATES = new Set(["pass", "fail", "unknown"]);
const POST_DETAIL_BINARY_STATES = new Set(["pass", "fail", "not-reached"]);
const POST_DETAIL_COUNTRY_STATES = new Set(["pass", "fail", "unknown", "not-reached"]);
const DETAIL_STATES = new Set([
  "ineligible-content-type",
  "ineligible-country",
  "selected-enriched",
  "selected-unresolved",
  "not-selected",
]);
const HARD_FILTER_DECISIONS = new Set(["pass", "fail", "not-reached"]);
const DEDUPE_DECISIONS = new Set([
  "kept",
  "duplicate-content",
  "duplicate-display-title",
  "duplicate-franchise",
  "not-reached",
]);
const RESULT_TIERS = new Set(["exact", "same-country-relaxed", "country-relaxed"]);
const FINAL_PATHS = new Set(["primary", "relaxed", "none"]);
const FINAL_DECISIONS = new Set(["selected", "not-selected"]);
const SAFE_CANDIDATE_REASONS = new Set([
  "selected",
  "country-mismatch",
  "content-type-mismatch",
  "genre-mismatch",
  "semantic-genre-insufficient",
  "ott-region-unavailable",
  "ott-streaming-tier-unavailable",
  "ott-provider-unknown",
  "ott-provider-mismatch",
  "runtime-unknown",
  "runtime-mismatch",
  "hard-filter-failed",
  "duplicate-content",
  "duplicate-display-title",
  "duplicate-franchise",
  "primary-limit-not-selected",
  "relaxed-limit-not-selected",
]);
const CANDIDATE_ID_PATTERN = /^tmdb:(?:movie|tv):[1-9]\d*$/;
const EVENT_FIELDS = new Map([
  ["request-start", new Set(["requestId", "requestKind", "endpointClass", "retryIndex"])],
  ["request-complete", new Set(["requestId", "requestKind", "endpointClass", "retryIndex", "statusClass"])],
  ["request-failed", new Set(["requestId", "requestKind", "endpointClass", "retryIndex", "statusClass"])],
  ["request-cache-hit", new Set(["requestId", "requestKind", "endpointClass"])],
  ["request-dedup-hit", new Set(["requestId", "requestKind", "endpointClass"])],
  ["candidate-pool-summary", new Set([
    "recallStageCount",
    "sourceResultCount",
    "normalizationCount",
    "arrivalCount",
    "stageCapExcludedCount",
    "distinctCount",
    "duplicateCount",
    "boundedCount",
    "poolExcludedCount",
  ])],
  ["stage-summary", new Set(["stage", "inputCount", "outputCount", "excludedCount"])],
  ["candidate-lineage", new Set([
    "candidateId",
    "arrivalStage",
    "preDetailSemantic",
    "preDetailCountry",
    "preDetailContentType",
    "detailState",
    "postDetailSemantic",
    "postDetailCountry",
    "postDetailContentType",
    "hardFilterDecision",
    "rankingInputOrdinal",
    "dedupeDecision",
    "resultTier",
    "finalPath",
    "finalDecision",
    "reason",
    "rank",
  ])],
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
const SAFE_FIELD_NAME_EXCEPTIONS = new Set(["finalPath"]);
const UNSAFE_STRING_PATTERN = /(https?:\/\/|bearer\s+|authorization\s*[:=]|api[_-]?key\s*[:=]|token\s*[:=]|cookie\s*[:=]|[a-z]:\\|\/users\/|[?&][^=\s]+=[^\s]*)/i;
const textEncoder = new TextEncoder();
const sessions = new WeakMap();
let fallbackSessionSequence = 0;

function isNonnegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 1;
}

function isSafeCandidateId(value) {
  if (typeof value !== "string" || !CANDIDATE_ID_PATTERN.test(value) || !/^[\x00-\x7f]+$/.test(value) ||
      textEncoder.encode(value).byteLength > 27) {
    return false;
  }
  const providerId = Number(value.slice(value.lastIndexOf(":") + 1));
  return isPositiveSafeInteger(providerId) && String(providerId) === value.slice(value.lastIndexOf(":") + 1);
}

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
  if (supplied.some((field) => SECRET_FIELD_PATTERN.test(field) && !SAFE_FIELD_NAME_EXCEPTIONS.has(field))) {
    fail(session, "event-emission");
  }
}

function assertCandidateLineageSemantics(session, fields) {
  const validEnums = isSafeCandidateId(fields.candidateId) &&
    ARRIVAL_STAGES.has(fields.arrivalStage) &&
    PRE_DETAIL_BINARY_STATES.has(fields.preDetailSemantic) &&
    PRE_DETAIL_COUNTRY_STATES.has(fields.preDetailCountry) &&
    PRE_DETAIL_BINARY_STATES.has(fields.preDetailContentType) &&
    DETAIL_STATES.has(fields.detailState) &&
    POST_DETAIL_BINARY_STATES.has(fields.postDetailSemantic) &&
    POST_DETAIL_COUNTRY_STATES.has(fields.postDetailCountry) &&
    POST_DETAIL_BINARY_STATES.has(fields.postDetailContentType) &&
    HARD_FILTER_DECISIONS.has(fields.hardFilterDecision) &&
    DEDUPE_DECISIONS.has(fields.dedupeDecision) &&
    RESULT_TIERS.has(fields.resultTier) &&
    FINAL_PATHS.has(fields.finalPath) &&
    FINAL_DECISIONS.has(fields.finalDecision) &&
    SAFE_CANDIDATE_REASONS.has(fields.reason) &&
    (fields.rankingInputOrdinal === null || isPositiveSafeInteger(fields.rankingInputOrdinal)) &&
    (fields.rank === null || isPositiveSafeInteger(fields.rank));
  if (!validEnums) fail(session, "event-emission");

  const detailIneligible = fields.detailState === "ineligible-content-type" ||
    fields.detailState === "ineligible-country";
  if (fields.detailState === "ineligible-content-type" && fields.preDetailContentType !== "fail") {
    fail(session, "event-emission");
  }
  if (fields.detailState === "ineligible-country" &&
      (fields.preDetailContentType !== "pass" || fields.preDetailCountry !== "fail")) {
    fail(session, "event-emission");
  }
  if (!detailIneligible && (fields.preDetailContentType !== "pass" || fields.preDetailCountry === "fail")) {
    fail(session, "event-emission");
  }

  if (detailIneligible) {
    const expectedReason = fields.detailState === "ineligible-content-type"
      ? "content-type-mismatch"
      : "country-mismatch";
    if (fields.postDetailSemantic !== "not-reached" || fields.postDetailCountry !== "not-reached" ||
        fields.postDetailContentType !== "not-reached" || fields.hardFilterDecision !== "not-reached" ||
        fields.rankingInputOrdinal !== null || fields.dedupeDecision !== "not-reached" ||
        fields.finalPath !== "none" || fields.finalDecision !== "not-selected" ||
        fields.reason !== expectedReason || fields.rank !== null) {
      fail(session, "event-emission");
    }
    return;
  }

  if (fields.postDetailSemantic === "not-reached" || fields.postDetailCountry === "not-reached" ||
      fields.postDetailContentType === "not-reached" || fields.hardFilterDecision === "not-reached") {
    fail(session, "event-emission");
  }
  if (fields.hardFilterDecision === "fail") {
    if (fields.rankingInputOrdinal !== null || fields.dedupeDecision !== "not-reached" ||
        fields.finalPath !== "none" || fields.finalDecision !== "not-selected" || fields.rank !== null ||
        ["selected", "duplicate-content", "duplicate-display-title", "duplicate-franchise",
          "primary-limit-not-selected", "relaxed-limit-not-selected"].includes(fields.reason)) {
      fail(session, "event-emission");
    }
    return;
  }
  if (fields.rankingInputOrdinal === null || fields.dedupeDecision === "not-reached") {
    fail(session, "event-emission");
  }
  if (fields.dedupeDecision !== "kept") {
    if (fields.reason !== fields.dedupeDecision || fields.finalPath !== "none" ||
        fields.finalDecision !== "not-selected" || fields.rank !== null) {
      fail(session, "event-emission");
    }
    return;
  }
  if (fields.finalDecision === "selected") {
    if (fields.reason !== "selected" || fields.finalPath === "none" || fields.rank === null ||
        (fields.finalPath === "relaxed") !== (fields.resultTier === "country-relaxed")) {
      fail(session, "event-emission");
    }
    return;
  }
  const expectedLimitReason = fields.resultTier === "country-relaxed"
    ? "relaxed-limit-not-selected"
    : "primary-limit-not-selected";
  if (fields.finalPath !== "none" || fields.rank !== null || fields.reason !== expectedLimitReason) {
    fail(session, "event-emission");
  }
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
       [fields.inputCount, fields.outputCount, fields.excludedCount].some((value) => !isNonnegativeSafeInteger(value)))) {
    fail(session, "event-emission");
  }
  if (type === "candidate-pool-summary") {
    const counts = [
      fields.recallStageCount,
      fields.sourceResultCount,
      fields.normalizationCount,
      fields.arrivalCount,
      fields.stageCapExcludedCount,
      fields.distinctCount,
      fields.duplicateCount,
      fields.boundedCount,
      fields.poolExcludedCount,
    ];
    const conserved = fields.sourceResultCount === fields.normalizationCount &&
      fields.normalizationCount === fields.arrivalCount + fields.stageCapExcludedCount &&
      fields.arrivalCount === fields.distinctCount + fields.duplicateCount &&
      fields.distinctCount === fields.boundedCount + fields.poolExcludedCount;
    if (counts.some((value) => !isNonnegativeSafeInteger(value)) || fields.recallStageCount > ARRIVAL_STAGES.size ||
        fields.boundedCount > TMDB_OBSERVABILITY_LIMITS.maximumLineageCandidateCount || !conserved) {
      fail(session, "event-emission");
    }
  }
  if (type === "candidate-lineage") assertCandidateLineageSemantics(session, fields);
  if (type === "candidate-decision" &&
      (!isSafeCandidateId(fields.candidateId) || fields.stage !== "final-selection" ||
       !CANDIDATE_DECISIONS.has(fields.decision) || !SAFE_CANDIDATE_REASONS.has(fields.reason) ||
       (fields.rank !== null && !isPositiveSafeInteger(fields.rank)) ||
       (fields.decision === "selected" && (fields.reason !== "selected" || fields.rank === null)) ||
       (fields.decision === "excluded" && (fields.reason === "selected" || fields.rank !== null)))) {
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
    candidatePoolSummaryCount: events.filter((event) => event.type === "candidate-pool-summary").length,
    candidateLineageCount: events.filter((event) => event.type === "candidate-lineage").length,
    selectedCandidateCount: events.filter((event) => event.type === "candidate-decision" && event.decision === "selected").length,
    excludedCandidateCount: events.filter((event) => event.type === "candidate-decision" && event.decision === "excluded").length,
  };
}

function assertLedgerRelations(session, events) {
  const starts = new Map();
  const terminals = new Set();
  const stages = new Set();
  const lineages = new Map();
  const candidateDecisions = new Map();
  let poolSummary = null;
  let cacheOrDedupCount = 0;
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
    if (["request-cache-hit", "request-dedup-hit"].includes(event.type)) cacheOrDedupCount += 1;
    if (event.type === "candidate-pool-summary") {
      if (poolSummary) fail(session, "payload-validation");
      poolSummary = event;
    }
    if (event.type === "stage-summary") {
      if (stages.has(event.stage)) fail(session, "payload-validation");
      stages.add(event.stage);
    }
    if (event.type === "candidate-lineage") {
      if (lineages.has(event.candidateId)) fail(session, "payload-validation");
      lineages.set(event.candidateId, event);
    }
    if (event.type === "candidate-decision") {
      if (candidateDecisions.has(event.candidateId)) fail(session, "payload-validation");
      candidateDecisions.set(event.candidateId, event);
    }
    if (event.type === "run-summary") runSummaryCount += 1;
  }
  if (starts.size !== terminals.size || stages.size !== TMDB_OBSERVABILITY_STAGES.length ||
      TMDB_OBSERVABILITY_STAGES.some((stage) => !stages.has(stage)) || runSummaryCount !== 1 ||
      !poolSummary || events.length > TMDB_OBSERVABILITY_ACCEPTED_WORST_CASE.eventCount || starts.size > 24 ||
      cacheOrDedupCount > 39 || lineages.size !== poolSummary.boundedCount ||
      candidateDecisions.size !== lineages.size) {
    fail(session, "payload-validation");
  }

  for (const [candidateId, lineage] of lineages) {
    const decision = candidateDecisions.get(candidateId);
    const expectedDecision = lineage.finalDecision === "selected" ? "selected" : "excluded";
    if (!decision || decision.decision !== expectedDecision || decision.reason !== lineage.reason ||
        decision.rank !== lineage.rank) {
      fail(session, "payload-validation");
    }
  }

  const rankingOrdinals = [...lineages.values()]
    .map((event) => event.rankingInputOrdinal)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  if (rankingOrdinals.some((value, index) => value !== index + 1)) fail(session, "payload-validation");
  for (const path of ["primary", "relaxed"]) {
    const ranks = [...lineages.values()]
      .filter((event) => event.finalPath === path)
      .map((event) => event.rank)
      .sort((left, right) => left - right);
    if (ranks.some((value, index) => value !== index + 1)) fail(session, "payload-validation");
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
    schemaVersion: TMDB_OBSERVABILITY_SCHEMA_VERSION,
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
      parsed.schemaVersion !== TMDB_OBSERVABILITY_SCHEMA_VERSION ||
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
    schemaVersion: TMDB_OBSERVABILITY_SCHEMA_VERSION,
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
