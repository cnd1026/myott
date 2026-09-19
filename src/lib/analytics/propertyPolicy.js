import {
  ANALYTICS_ENUMS,
  CANONICAL_EVENT_REGISTRY,
  canonicalEventDefinition,
} from "./canonicalEvents.js";

const COMMON_REQUIRED_FIELDS = Object.freeze({
  event_name: Object.freeze({ type: "eventName" }),
  event_version: Object.freeze({ type: "eventVersion" }),
  event_id: Object.freeze({ type: "uuid" }),
  occurred_at: Object.freeze({ type: "utcTimestamp" }),
  measurement_session_id: Object.freeze({ type: "uuid" }),
  measurement_identity_state: Object.freeze({ type: "literal", value: "SESSION_ONLY" }),
  ui_locale: Object.freeze({ type: "enum", values: ANALYTICS_ENUMS.uiLocales }),
  content_provider_region: Object.freeze({ type: "enum", values: ANALYTICS_ENUMS.providerRegions }),
  legal_jurisdiction_state: Object.freeze({ type: "enum", values: ANALYTICS_ENUMS.jurisdictionStates }),
  surface: Object.freeze({ type: "enum", values: ANALYTICS_ENUMS.surfaces }),
});

export const PROHIBITED_ANALYTICS_FIELDS = Object.freeze([
  "raw_text",
  "favorite_work",
  "search_text",
  "title",
  "cast",
  "director",
  "synopsis",
  "overview",
  "recommendation_prose",
  "email",
  "name",
  "phone",
  "guest_id",
  "account_id",
  "precise_location",
  "raw_ip",
  "fingerprint",
  "referrer",
  "url",
  "query",
  "provider_payload",
  "stack",
  "credentials",
  "token",
  "api_key",
  "distinct_id",
  "$process_person_profile",
  "$geoip_disable",
]);

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isValidUtcTimestamp(value) {
  if (typeof value !== "string" || !UTC_TIMESTAMP.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function validateValue(value, rule, eventName) {
  switch (rule.type) {
    case "eventName":
      return typeof value === "string" && Object.hasOwn(CANONICAL_EVENT_REGISTRY, value);
    case "eventVersion":
      return Number.isInteger(value)
        && value === CANONICAL_EVENT_REGISTRY[eventName]?.eventVersion;
    case "uuid":
      return typeof value === "string" && UUID_V4.test(value);
    case "utcTimestamp":
      return isValidUtcTimestamp(value);
    case "literal":
      return value === rule.value;
    case "enum":
      return typeof value === "string" && rule.values.includes(value);
    case "integer":
      return Number.isInteger(value) && value >= rule.minimum && value <= rule.maximum;
    case "enumArray":
      return Array.isArray(value)
        && value.length >= rule.minimumItems
        && value.length <= rule.maximumItems
        && value.every((item) => typeof item === "string" && rule.values.includes(item))
        && (!rule.unique || new Set(value).size === value.length);
    default:
      return false;
  }
}

function failure(code, field = null) {
  return Object.freeze({ ok: false, code, field });
}

export function validateCanonicalEvent(input) {
  if (!isPlainObject(input)) return failure("INVALID_EVENT_OBJECT");

  const definition = canonicalEventDefinition(input.event_name);
  if (!definition) return failure("UNKNOWN_EVENT", "event_name");

  const schema = {
    ...COMMON_REQUIRED_FIELDS,
    ...definition.requiredProperties,
    ...definition.optionalProperties,
  };
  const allowedKeys = new Set(Object.keys(schema));

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      const prohibited = PROHIBITED_ANALYTICS_FIELDS.includes(key.toLowerCase());
      return failure(prohibited ? "PROHIBITED_PROPERTY" : "UNKNOWN_PROPERTY", key);
    }
  }

  for (const [key, rule] of Object.entries(COMMON_REQUIRED_FIELDS)) {
    if (!Object.hasOwn(input, key)) return failure("MISSING_REQUIRED_PROPERTY", key);
    if (!validateValue(input[key], rule, input.event_name)) return failure("INVALID_PROPERTY", key);
  }

  for (const [key, rule] of Object.entries(definition.requiredProperties)) {
    if (!Object.hasOwn(input, key)) return failure("MISSING_REQUIRED_PROPERTY", key);
    if (!validateValue(input[key], rule, input.event_name)) return failure("INVALID_PROPERTY", key);
  }

  for (const [key, rule] of Object.entries(definition.optionalProperties)) {
    if (Object.hasOwn(input, key) && !validateValue(input[key], rule, input.event_name)) {
      return failure("INVALID_PROPERTY", key);
    }
  }

  const event = {};
  for (const key of Object.keys(schema)) {
    if (Object.hasOwn(input, key)) {
      event[key] = Array.isArray(input[key]) ? [...input[key]] : input[key];
    }
  }

  return Object.freeze({ ok: true, event: Object.freeze(event) });
}
