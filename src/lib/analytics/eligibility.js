export const ANALYTICS_ELIGIBILITY = Object.freeze({
  ELIGIBLE: "ELIGIBLE",
  INELIGIBLE: "INELIGIBLE",
});

export const ANALYTICS_ELIGIBILITY_INPUT = Object.freeze({
  runtimeEnvironment: "PRODUCTION",
  productPolicy: "ANALYTICS_ENABLED",
  jurisdictionState: "ANALYTICS_ALLOWED_UNDER_APPROVED_POLICY",
  consentState: "ANALYTICS_ALLOWED",
  measurementIdentityState: "SESSION_ONLY",
});

export function resolveAnalyticsEligibility(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return ANALYTICS_ELIGIBILITY.INELIGIBLE;
  }

  const eligible = Object.entries(ANALYTICS_ELIGIBILITY_INPUT)
    .every(([key, expected]) => input[key] === expected);

  return eligible
    ? ANALYTICS_ELIGIBILITY.ELIGIBLE
    : ANALYTICS_ELIGIBILITY.INELIGIBLE;
}

export function isAnalyticsEligible(input) {
  return resolveAnalyticsEligibility(input) === ANALYTICS_ELIGIBILITY.ELIGIBLE;
}
