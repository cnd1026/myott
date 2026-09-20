export const CANONICAL_EVENT_VERSION = 1;

export const ANALYTICS_ENUMS = Object.freeze({
  channels: Object.freeze(["DIRECT", "ORGANIC_SEARCH", "REFERRAL", "ORGANIC_SOCIAL", "OTHER", "UNKNOWN"]),
  contentTypes: Object.freeze(["movie", "drama", "animation"]),
  failureClasses: Object.freeze(["VALIDATION_REJECTED", "NO_RESULT", "PRODUCT_ERROR", "PROVIDER_UNAVAILABLE", "UNKNOWN"]),
  jurisdictionStates: Object.freeze(["RESOLVED"]),
  latencyBuckets: Object.freeze(["LT_250_MS", "250_TO_999_MS", "1_TO_3_99_S", "GE_4_S"]),
  providerRegions: Object.freeze(["KR"]),
  requestModes: Object.freeze(["OPTIONS", "SEEDS"]),
  resultPositionBuckets: Object.freeze(["FIRST", "TOP_3", "TOP_6", "BEYOND_6"]),
  successClasses: Object.freeze(["USABLE_RESULT"]),
  surfaces: Object.freeze(["RECOMMENDATION"]),
  uiLocales: Object.freeze(["ko-KR", "en-US"]),
});

const integer = (minimum, maximum) => Object.freeze({ type: "integer", minimum, maximum });
const enumValue = (values) => Object.freeze({ type: "enum", values });
const enumArray = (values, minimumItems, maximumItems) => Object.freeze({
  type: "enumArray",
  values,
  minimumItems,
  maximumItems,
  unique: true,
});

export const CANONICAL_EVENT_REGISTRY = Object.freeze({
  product_session_started: Object.freeze({
    eventName: "product_session_started",
    eventVersion: CANONICAL_EVENT_VERSION,
    requiredProperties: Object.freeze({
      channel: enumValue(ANALYTICS_ENUMS.channels),
    }),
    optionalProperties: Object.freeze({}),
  }),
  recommendation_requested: Object.freeze({
    eventName: "recommendation_requested",
    eventVersion: CANONICAL_EVENT_VERSION,
    requiredProperties: Object.freeze({
      selected_option_count: integer(0, 100),
      seed_count: integer(0, 3),
      content_type_values: enumArray(ANALYTICS_ENUMS.contentTypes, 1, 3),
      request_mode: enumValue(ANALYTICS_ENUMS.requestModes),
    }),
    optionalProperties: Object.freeze({}),
  }),
  recommendation_succeeded: Object.freeze({
    eventName: "recommendation_succeeded",
    eventVersion: CANONICAL_EVENT_VERSION,
    requiredProperties: Object.freeze({
      result_count: integer(1, 100),
      success_class: enumValue(ANALYTICS_ENUMS.successClasses),
    }),
    optionalProperties: Object.freeze({
      latency_bucket: enumValue(ANALYTICS_ENUMS.latencyBuckets),
    }),
  }),
  recommendation_failed: Object.freeze({
    eventName: "recommendation_failed",
    eventVersion: CANONICAL_EVENT_VERSION,
    requiredProperties: Object.freeze({
      failure_class: enumValue(ANALYTICS_ENUMS.failureClasses),
    }),
    optionalProperties: Object.freeze({
      latency_bucket: enumValue(ANALYTICS_ENUMS.latencyBuckets),
    }),
  }),
  result_detail_opened: Object.freeze({
    eventName: "result_detail_opened",
    eventVersion: CANONICAL_EVENT_VERSION,
    requiredProperties: Object.freeze({
      content_type_value: enumValue(ANALYTICS_ENUMS.contentTypes),
      result_position_bucket: enumValue(ANALYTICS_ENUMS.resultPositionBuckets),
    }),
    optionalProperties: Object.freeze({}),
  }),
});

export const CANONICAL_EVENT_NAMES = Object.freeze(Object.keys(CANONICAL_EVENT_REGISTRY));

export function isCanonicalEventName(value) {
  return typeof value === "string" && Object.hasOwn(CANONICAL_EVENT_REGISTRY, value);
}

export function canonicalEventDefinition(eventName) {
  return isCanonicalEventName(eventName) ? CANONICAL_EVENT_REGISTRY[eventName] : null;
}
