import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ANALYTICS_CONSENT_STATE,
  ANALYTICS_ELIGIBILITY,
  ANALYTICS_MEASUREMENT_IDENTITY_STATE,
  ANALYTICS_POLICY_STATE,
  ANALYTICS_RUNTIME_ENVIRONMENT,
  LEGAL_JURISDICTION_STATE,
  resolveAnalyticsEligibility,
} from "../analytics/eligibility.js";
import { createAnalyticsConsentEligibilityRuntime } from "../analytics/consentEligibilityRuntime.js";
import {
  PRIVACY_CENTER_MESSAGE_CATALOGS,
  getPrivacyCenterMessage,
  validateMessageCatalogs,
} from "../i18n/messageCatalog.js";
import {
  ANALYTICS_CHOICE_ACTIONS,
  PRIVACY_CATEGORIES,
  applyAnalyticsChoice,
  createPrivacyCenterViewModel,
  describeAnalyticsEffectiveState,
} from "./privacyCenterModel.js";

const ALLOWABLE_STATE = Object.freeze({
  runtimeEnvironment: ANALYTICS_RUNTIME_ENVIRONMENT.PRODUCTION,
  productPolicy: ANALYTICS_POLICY_STATE.ENABLED,
  jurisdictionState: LEGAL_JURISDICTION_STATE.ALLOWED,
  consentState: ANALYTICS_CONSENT_STATE.UNRESOLVED,
  measurementIdentityState: ANALYTICS_MEASUREMENT_IDENTITY_STATE.SESSION_ONLY,
});

const EXPECTED_PRIVACY_KEYS = Object.freeze([
  "privacyCenter.title", "privacyCenter.description", "privacyCenter.close",
  "privacyCenter.necessary.title", "privacyCenter.necessary.description", "privacyCenter.necessary.required",
  "privacyCenter.preferences.title", "privacyCenter.preferences.description", "privacyCenter.preferences.notImplemented",
  "privacyCenter.analytics.title", "privacyCenter.analytics.description", "privacyCenter.analytics.allow",
  "privacyCenter.analytics.deny", "privacyCenter.analytics.withdraw", "privacyCenter.analytics.pendingPolicy",
  "privacyCenter.analytics.sessionOnly", "privacyCenter.marketing.title", "privacyCenter.marketing.description",
  "privacyCenter.marketing.notInUse", "privacyCenter.persistenceNotice", "privacyCenter.currentChoice",
  "privacyCenter.effectiveState", "privacyCenter.choice.unresolved", "privacyCenter.choice.allowed",
  "privacyCenter.choice.denied", "privacyCenter.choice.withdrawn", "privacyCenter.effective.eligible",
  "privacyCenter.effective.suppressed",
]);

test("exactly four canonical privacy categories exist", () => {
  assert.deepEqual(Object.values(PRIVACY_CATEGORIES), ["STRICTLY_NECESSARY", "PREFERENCES", "ANALYTICS", "MARKETING"]);
  assert.equal(createPrivacyCenterViewModel().categories.length, 4);
});

test("Analytics is never classified as strictly necessary", () => {
  const model = createPrivacyCenterViewModel();
  const necessary = model.categories.find(({ id }) => id === PRIVACY_CATEGORIES.STRICTLY_NECESSARY);
  assert.equal(necessary.eligibilityMeaning, "DOES_NOT_INCLUDE_ANALYTICS");
});

test("marketing is inactive and has no active toggle", () => {
  const marketing = createPrivacyCenterViewModel().categories.find(({ id }) => id === PRIVACY_CATEGORIES.MARKETING);
  assert.equal(marketing.status, "NOT_IN_USE");
  assert.equal(marketing.userControl, "NOT_AVAILABLE");
  assert.equal(marketing.actions, undefined);
});

test("initial Analytics choice is unresolved", () => {
  const analytics = createPrivacyCenterViewModel().categories.find(({ id }) => id === PRIVACY_CATEGORIES.ANALYTICS);
  assert.equal(analytics.status, ANALYTICS_CONSENT_STATE.UNRESOLVED);
});

test("ALLOW maps only the consent dimension", () => {
  const state = { ...ALLOWABLE_STATE, uiLocale: "ko-KR", providerRegion: "KR", guestId: "guest", accountId: "account" };
  const result = applyAnalyticsChoice(state, ANALYTICS_CHOICE_ACTIONS.ALLOW);
  assert.deepEqual(result.privacyState, { ...state, consentState: ANALYTICS_CONSENT_STATE.ALLOWED });
});

test("DENY maps to the canonical denied state", () => {
  assert.equal(applyAnalyticsChoice(ALLOWABLE_STATE, ANALYTICS_CHOICE_ACTIONS.DENY).privacyState.consentState, ANALYTICS_CONSENT_STATE.DENIED);
});

test("WITHDRAW maps to the canonical withdrawn state", () => {
  assert.equal(applyAnalyticsChoice(ALLOWABLE_STATE, ANALYTICS_CHOICE_ACTIONS.WITHDRAW).privacyState.consentState, ANALYTICS_CONSENT_STATE.WITHDRAWN);
});

test("unsupported actions fail without changing state", () => {
  const result = applyAnalyticsChoice(ALLOWABLE_STATE, "ENABLE_MARKETING");
  assert.equal(result.ok, false);
  assert.equal(result.privacyState, ALLOWABLE_STATE);
});

test("ALLOW cannot override unresolved jurisdiction", () => {
  const state = { ...ALLOWABLE_STATE, jurisdictionState: LEGAL_JURISDICTION_STATE.UNKNOWN };
  const next = applyAnalyticsChoice(state, ANALYTICS_CHOICE_ACTIONS.ALLOW).privacyState;
  assert.equal(resolveAnalyticsEligibility(next), ANALYTICS_ELIGIBILITY.SUPPRESS_JURISDICTION);
});

test("ALLOW cannot override disabled Analytics policy", () => {
  const state = { ...ALLOWABLE_STATE, productPolicy: ANALYTICS_POLICY_STATE.DISABLED };
  const next = applyAnalyticsChoice(state, ANALYTICS_CHOICE_ACTIONS.ALLOW).privacyState;
  assert.equal(resolveAnalyticsEligibility(next), ANALYTICS_ELIGIBILITY.SUPPRESS_POLICY);
});

test("ALLOW cannot override a non-production runtime", () => {
  const state = { ...ALLOWABLE_STATE, runtimeEnvironment: ANALYTICS_RUNTIME_ENVIRONMENT.PREVIEW };
  const next = applyAnalyticsChoice(state, ANALYTICS_CHOICE_ACTIONS.ALLOW).privacyState;
  assert.equal(resolveAnalyticsEligibility(next), ANALYTICS_ELIGIBILITY.SUPPRESS_NON_PRODUCTION);
});

test("preferences choice does not enable Analytics", () => {
  assert.notEqual(resolveAnalyticsEligibility({ ...ALLOWABLE_STATE, consentState: ANALYTICS_CONSENT_STATE.PREFERENCES_ALLOWED }), ANALYTICS_ELIGIBILITY.ELIGIBLE);
});

test("marketing state does not enable Analytics", () => {
  assert.notEqual(resolveAnalyticsEligibility({ ...ALLOWABLE_STATE, consentState: ANALYTICS_CONSENT_STATE.MARKETING_ALLOWED }), ANALYTICS_ELIGIBILITY.ELIGIBLE);
});

test("Privacy Center action creates no Analytics event", () => {
  let captures = 0;
  const runtime = createAnalyticsConsentEligibilityRuntime({ analyticsClient: { capture: () => { captures += 1; }, withdraw() {}, resume() {} } });
  runtime.applyPrivacyState(applyAnalyticsChoice(ALLOWABLE_STATE, ANALYTICS_CHOICE_ACTIONS.ALLOW).privacyState);
  assert.equal(captures, 0);
});

test("Privacy Center action creates no measurement ID", () => {
  applyAnalyticsChoice(ALLOWABLE_STATE, ANALYTICS_CHOICE_ACTIONS.ALLOW);
  createPrivacyCenterViewModel({ privacyState: ALLOWABLE_STATE });
  const source = readFileSync(new URL("./privacyCenterModel.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /randomUUID|measurement_session_id|measurementSessionId/);
});

test("ko-KR privacy messages are complete", () => {
  assert.deepEqual(Object.keys(PRIVACY_CENTER_MESSAGE_CATALOGS["ko-KR"]).sort(), [...EXPECTED_PRIVACY_KEYS].sort());
  assert.equal(Object.values(PRIVACY_CENTER_MESSAGE_CATALOGS["ko-KR"]).every((value) => value.trim()), true);
});

test("en-US privacy messages are complete", () => {
  assert.deepEqual(Object.keys(PRIVACY_CENTER_MESSAGE_CATALOGS["en-US"]).sort(), [...EXPECTED_PRIVACY_KEYS].sort());
  assert.equal(Object.values(PRIVACY_CENTER_MESSAGE_CATALOGS["en-US"]).every((value) => value.trim()), true);
});

test("privacy locale key and placeholder parity is preserved", () => {
  assert.equal(validateMessageCatalogs(PRIVACY_CENTER_MESSAGE_CATALOGS, EXPECTED_PRIVACY_KEYS).valid, true);
});

test("supported locale lookup never silently falls back", () => {
  assert.equal(getPrivacyCenterMessage("en-US", "privacyCenter.analytics.allow"), "Allow product analytics");
  assert.throws(() => getPrivacyCenterMessage("en-US", "privacyCenter.missing"), /MISSING_PRIVACY_CENTER_MESSAGE_KEY:en-US/);
});

test("accessibility message keys are present", () => {
  for (const key of ["privacyCenter.title", "privacyCenter.close", "privacyCenter.analytics.allow", "privacyCenter.analytics.deny", "privacyCenter.analytics.withdraw", "privacyCenter.currentChoice", "privacyCenter.effectiveState"]) {
    assert.equal(EXPECTED_PRIVACY_KEYS.includes(key), true, key);
  }
});

test("allow and deny actions have equal semantic emphasis", () => {
  const actions = createPrivacyCenterViewModel().categories.find(({ id }) => id === PRIVACY_CATEGORIES.ANALYTICS).actions;
  assert.equal(actions.find(({ id }) => id === ANALYTICS_CHOICE_ACTIONS.ALLOW).emphasis, "EQUAL");
  assert.equal(actions.find(({ id }) => id === ANALYTICS_CHOICE_ACTIONS.DENY).emphasis, "EQUAL");
});

test("user choice and effective eligibility remain distinct", () => {
  const state = applyAnalyticsChoice({ ...ALLOWABLE_STATE, jurisdictionState: LEGAL_JURISDICTION_STATE.UNKNOWN }, ANALYTICS_CHOICE_ACTIONS.ALLOW).privacyState;
  const model = createPrivacyCenterViewModel({ locale: "en-US", privacyState: state });
  assert.equal(model.currentChoice, "Allowed");
  assert.equal(model.effectiveState.eligibility, ANALYTICS_ELIGIBILITY.SUPPRESS_JURISDICTION);
});

test("effective-state description uses the existing resolver", () => {
  assert.equal(describeAnalyticsEffectiveState({ ...ALLOWABLE_STATE, consentState: ANALYTICS_CONSENT_STATE.ALLOWED }, "en-US").eligibility, ANALYTICS_ELIGIBILITY.ELIGIBLE);
});

test("deny transition is accepted safely by the consent runtime", () => {
  const runtime = createAnalyticsConsentEligibilityRuntime();
  const next = applyAnalyticsChoice(ALLOWABLE_STATE, ANALYTICS_CHOICE_ACTIONS.DENY).privacyState;
  assert.equal(runtime.applyPrivacyState(next).eligibility, ANALYTICS_ELIGIBILITY.SUPPRESS_DENIED);
});

test("withdraw transition is accepted safely by the consent runtime", () => {
  const runtime = createAnalyticsConsentEligibilityRuntime();
  const next = applyAnalyticsChoice(ALLOWABLE_STATE, ANALYTICS_CHOICE_ACTIONS.WITHDRAW).privacyState;
  assert.equal(runtime.applyPrivacyState(next).eligibility, ANALYTICS_ELIGIBILITY.SUPPRESS_WITHDRAWN);
});

test("Privacy Center model has no provider-specific Product coupling", () => {
  const sources = ["./privacyCenterModel.js", "../i18n/messages/ko-KR.js", "../i18n/messages/en-US.js"]
    .map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(sources, /posthog/i);
});

test("Privacy Center copy makes no legal compliance claim", () => {
  const copy = Object.values(PRIVACY_CENTER_MESSAGE_CATALOGS).flatMap(Object.values).join("\n");
  assert.doesNotMatch(copy, /\b(?:GDPR|PIPA|CCPA|compliant|certified)\b|법적\s*준수|규정\s*준수/i);
});

test("model contains no cookie or localStorage use", () => {
  const source = readFileSync(new URL("./privacyCenterModel.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /document\.cookie|\blocalStorage\b/);
});

test("model contains no sessionStorage or DB use", () => {
  const source = readFileSync(new URL("./privacyCenterModel.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bsessionStorage\b|\bindexedDB\b|\bdatabase\b/);
});

test("model contains no network or event dispatch", () => {
  const source = readFileSync(new URL("./privacyCenterModel.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|\.capture\s*\(/);
});

test("model contains no jurisdiction inference", () => {
  const source = readFileSync(new URL("./privacyCenterModel.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /geoip|accept-language|timezone|countryLookup/i);
});

test("current Product UI contains no Privacy Center mount", () => {
  const source = ["../../../app/page.jsx", "../../../app/layout.jsx"]
    .map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(source, /privacyCenterModel|privacyCenter\.|PrivacyCenter/);
});

test("view model explicitly remains unmounted and non-durable", () => {
  const model = createPrivacyCenterViewModel();
  assert.equal(model.publicMount, false);
  assert.equal(model.persistence, "MEMORY_ONLY_RUNTIME_NOT_DURABLE");
});

test("preferences persistence is explicitly not implemented", () => {
  const preferences = createPrivacyCenterViewModel().categories.find(({ id }) => id === PRIVACY_CATEGORIES.PREFERENCES);
  assert.equal(preferences.implementationState, "PERSISTENCE_NOT_IMPLEMENTED");
});
