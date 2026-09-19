import {
  ANALYTICS_CONSENT_STATE,
  ANALYTICS_ELIGIBILITY,
  ANALYTICS_MEASUREMENT_IDENTITY_STATE,
  ANALYTICS_POLICY_STATE,
  ANALYTICS_RUNTIME_ENVIRONMENT,
  LEGAL_JURISDICTION_STATE,
  resolveAnalyticsEligibility,
} from "./eligibility.js";

const PRIVACY_STATE_KEYS = Object.freeze([
  "runtimeEnvironment",
  "productPolicy",
  "jurisdictionState",
  "consentState",
  "measurementIdentityState",
]);

export const INITIAL_ANALYTICS_PRIVACY_STATE = Object.freeze({
  runtimeEnvironment: ANALYTICS_RUNTIME_ENVIRONMENT.UNRESOLVED,
  productPolicy: ANALYTICS_POLICY_STATE.UNRESOLVED,
  jurisdictionState: LEGAL_JURISDICTION_STATE.UNKNOWN,
  consentState: ANALYTICS_CONSENT_STATE.UNRESOLVED,
  measurementIdentityState: ANALYTICS_MEASUREMENT_IDENTITY_STATE.SESSION_ONLY,
});

export const ANALYTICS_WITHDRAWAL_CONTRACT = Object.freeze({
  POST_WITHDRAWAL_NEW_DISPATCH: 0,
  IN_FLIGHT_ABORT: "CLIENT_SIDE_BEST_EFFORT",
  SERVER_REQUEST_ALREADY_ACCEPTED: "NOT_REVOKED_BY_CLIENT_ABORT",
  REMOTE_ALREADY_ACCEPTED_EVENT: "NOT_REVOKED",
  PRECONSENT_EVENT_REPLAY: "PROHIBITED",
});

function copyPrivacyState(state) {
  return Object.freeze(Object.fromEntries(
    PRIVACY_STATE_KEYS.map((key) => [key, state[key]]),
  ));
}

export function createAnalyticsConsentEligibilityRuntime({ analyticsClient } = {}) {
  let privacyState = INITIAL_ANALYTICS_PRIVACY_STATE;
  let eligibility = resolveAnalyticsEligibility(privacyState);

  function getSnapshot() {
    return Object.freeze({
      ...copyPrivacyState(privacyState),
      eligibility,
    });
  }

  function applyPrivacyState(update = {}) {
    const previousEligibility = eligibility;
    const nextState = { ...privacyState };

    if (update && typeof update === "object" && !Array.isArray(update)) {
      for (const key of PRIVACY_STATE_KEYS) {
        if (Object.hasOwn(update, key)) nextState[key] = update[key];
      }
    }

    privacyState = copyPrivacyState(nextState);
    eligibility = resolveAnalyticsEligibility(privacyState);

    if (
      previousEligibility === ANALYTICS_ELIGIBILITY.ELIGIBLE
      && eligibility !== ANALYTICS_ELIGIBILITY.ELIGIBLE
    ) {
      analyticsClient?.withdraw?.();
    } else if (
      previousEligibility !== ANALYTICS_ELIGIBILITY.ELIGIBLE
      && eligibility === ANALYTICS_ELIGIBILITY.ELIGIBLE
    ) {
      analyticsClient?.resume?.();
    }

    return getSnapshot();
  }

  async function capture(event = {}) {
    if (eligibility !== ANALYTICS_ELIGIBILITY.ELIGIBLE || !analyticsClient?.capture) {
      return Object.freeze({ status: "SUPPRESSED", reason: eligibility });
    }

    return analyticsClient.capture({
      ...event,
      eligibility: privacyState,
    });
  }

  function resetRuntime() {
    privacyState = INITIAL_ANALYTICS_PRIVACY_STATE;
    eligibility = resolveAnalyticsEligibility(privacyState);
    analyticsClient?.withdraw?.();
    return getSnapshot();
  }

  return Object.freeze({
    getSnapshot,
    applyPrivacyState,
    capture,
    resetRuntime,
  });
}
