import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createAnalyticsClient } from "./analyticsClient.js";
import {
  ANALYTICS_CONSENT_STATE,
  ANALYTICS_ELIGIBILITY,
  ANALYTICS_MEASUREMENT_IDENTITY_STATE,
  ANALYTICS_POLICY_STATE,
  ANALYTICS_RUNTIME_ENVIRONMENT,
  LEGAL_JURISDICTION_STATE,
  resolveAnalyticsEligibility,
} from "./eligibility.js";
import {
  ANALYTICS_WITHDRAWAL_CONTRACT,
  createAnalyticsConsentEligibilityRuntime,
} from "./consentEligibilityRuntime.js";

const ELIGIBLE_STATE = Object.freeze({
  runtimeEnvironment: ANALYTICS_RUNTIME_ENVIRONMENT.PRODUCTION,
  productPolicy: ANALYTICS_POLICY_STATE.ENABLED,
  jurisdictionState: LEGAL_JURISDICTION_STATE.ALLOWED,
  consentState: ANALYTICS_CONSENT_STATE.ALLOWED,
  measurementIdentityState: ANALYTICS_MEASUREMENT_IDENTITY_STATE.SESSION_ONLY,
});

const CONTEXT = Object.freeze({
  uiLocale: "ko-KR",
  contentProviderRegion: "KR",
  legalJurisdictionState: "RESOLVED",
  surface: "RECOMMENDATION",
});

const EVENT = Object.freeze({
  eventName: "product_session_started",
  properties: Object.freeze({ channel: "DIRECT" }),
  context: CONTEXT,
});

const UUIDS = Object.freeze([
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
]);

function createHarness({ fetchImpl } = {}) {
  const bodies = [];
  const uuidCalls = [];
  const uuids = [...UUIDS];
  const client = createAnalyticsClient({
    fetchImpl: fetchImpl || (async (_url, options) => {
      bodies.push(JSON.parse(options.body));
      return { ok: true };
    }),
    randomUuid: () => {
      const value = uuids.shift();
      uuidCalls.push(value);
      return value;
    },
    now: () => "2026-09-10T12:00:00.000Z",
  });
  const runtime = createAnalyticsConsentEligibilityRuntime({ analyticsClient: client });
  return { runtime, client, bodies, uuidCalls };
}

test("initial runtime is fail closed", () => {
  assert.equal(createHarness().runtime.getSnapshot().eligibility, ANALYTICS_ELIGIBILITY.SUPPRESS_UNRESOLVED);
});

test("initial runtime creates no ephemeral Analytics ID", () => {
  const { client, uuidCalls } = createHarness();
  assert.equal(client.getRuntimeState().hasMeasurementSessionId, false);
  assert.equal(uuidCalls.length, 0);
});

test("unresolved jurisdiction is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, jurisdictionState: LEGAL_JURISDICTION_STATE.UNKNOWN }), ANALYTICS_ELIGIBILITY.SUPPRESS_JURISDICTION);
});

test("unsupported jurisdiction is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, jurisdictionState: LEGAL_JURISDICTION_STATE.PROHIBITED_OR_UNSUPPORTED }), ANALYTICS_ELIGIBILITY.SUPPRESS_JURISDICTION);
});

test("legal-review-required jurisdiction is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, jurisdictionState: LEGAL_JURISDICTION_STATE.REVIEW_REQUIRED }), ANALYTICS_ELIGIBILITY.SUPPRESS_JURISDICTION);
});

test("disabled Analytics policy is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, productPolicy: ANALYTICS_POLICY_STATE.DISABLED }), ANALYTICS_ELIGIBILITY.SUPPRESS_POLICY);
});

test("denied Analytics consent is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, consentState: ANALYTICS_CONSENT_STATE.DENIED }), ANALYTICS_ELIGIBILITY.SUPPRESS_DENIED);
});

test("withdrawn Analytics consent is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, consentState: ANALYTICS_CONSENT_STATE.WITHDRAWN }), ANALYTICS_ELIGIBILITY.SUPPRESS_WITHDRAWN);
});

test("preview environment is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, runtimeEnvironment: ANALYTICS_RUNTIME_ENVIRONMENT.PREVIEW }), ANALYTICS_ELIGIBILITY.SUPPRESS_NON_PRODUCTION);
});

test("development environment is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, runtimeEnvironment: ANALYTICS_RUNTIME_ENVIRONMENT.DEVELOPMENT }), ANALYTICS_ELIGIBILITY.SUPPRESS_NON_PRODUCTION);
});

test("QA environment is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, runtimeEnvironment: ANALYTICS_RUNTIME_ENVIRONMENT.QA }), ANALYTICS_ELIGIBILITY.SUPPRESS_NON_PRODUCTION);
});

test("test environment is suppressed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, runtimeEnvironment: ANALYTICS_RUNTIME_ENVIRONMENT.TEST }), ANALYTICS_ELIGIBILITY.SUPPRESS_NON_PRODUCTION);
});

test("preferences consent alone never enables Analytics", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, consentState: ANALYTICS_CONSENT_STATE.PREFERENCES_ALLOWED }), ANALYTICS_ELIGIBILITY.SUPPRESS_UNRESOLVED);
});

test("marketing state never enables Phase 1 Analytics", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, consentState: ANALYTICS_CONSENT_STATE.MARKETING_ALLOWED }), ANALYTICS_ELIGIBILITY.SUPPRESS_UNRESOLVED);
});

test("all required dimensions allow eligibility", () => {
  assert.equal(resolveAnalyticsEligibility(ELIGIBLE_STATE), ANALYTICS_ELIGIBILITY.ELIGIBLE);
});

test("eligible transition generates no Analytics event", () => {
  const { runtime, bodies } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  assert.equal(bodies.length, 0);
});

test("eligible transition does not create an ID", () => {
  const { runtime, client, uuidCalls } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  assert.equal(client.getRuntimeState().hasMeasurementSessionId, false);
  assert.equal(uuidCalls.length, 0);
});

test("first eligible dispatch creates a memory-only ephemeral ID", async () => {
  const { runtime, client, bodies } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  assert.equal((await runtime.capture(EVENT)).status, "ACCEPTED");
  assert.equal(client.getRuntimeState().hasMeasurementSessionId, true);
  assert.equal(bodies[0].measurement_session_id, UUIDS[0]);
});

test("ephemeral ID is not a guest or account identity", async () => {
  const { runtime, bodies } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  await runtime.capture({ ...EVENT, guestId: "guest-1", accountId: "account-1" });
  assert.equal("guest_id" in bodies[0], false);
  assert.equal("account_id" in bodies[0], false);
});

test("ineligible runtime performs no relay fetch", async () => {
  let fetches = 0;
  const { runtime } = createHarness({ fetchImpl: async () => { fetches += 1; return { ok: true }; } });
  assert.equal((await runtime.capture(EVENT)).status, "SUPPRESSED");
  assert.equal(fetches, 0);
});

test("withdrawal immediately prevents future dispatch", async () => {
  const { runtime, bodies } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  await runtime.capture(EVENT);
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.WITHDRAWN });
  const result = await runtime.capture(EVENT);
  assert.equal(result.status, "SUPPRESSED");
  assert.equal(bodies.length, 1);
});

test("withdrawal aborts every active client request", async () => {
  let signal;
  const { runtime, client } = createHarness({
    fetchImpl: async (_url, options) => {
      signal = options.signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    },
  });
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  const pending = runtime.capture(EVENT);
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.WITHDRAWN });
  assert.equal(signal.aborted, true);
  assert.equal(client.getRuntimeState().activeRequestCount, 0);
  assert.deepEqual(await pending, { status: "DROPPED", reason: "ABORTED" });
});

test("withdrawal retires the ephemeral Analytics ID", async () => {
  const { runtime, client } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  await runtime.capture(EVENT);
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.WITHDRAWN });
  assert.equal(client.getRuntimeState().hasMeasurementSessionId, false);
});

test("withdrawal creates no replay queue", () => {
  const source = readFileSync(new URL("./consentEligibilityRuntime.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(?:eventQueue|pendingEvents|replayEvents|offlineBuffer)\b/);
});

test("re-consent does not replay previous events", async () => {
  const { runtime, bodies } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  await runtime.capture(EVENT);
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.WITHDRAWN });
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.ALLOWED });
  assert.equal(bodies.length, 1);
});

test("re-consent does not restore the old ephemeral ID", async () => {
  const { runtime, client } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  await runtime.capture(EVENT);
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.WITHDRAWN });
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.ALLOWED });
  assert.equal(client.getRuntimeState().hasMeasurementSessionId, false);
});

test("first future event after re-consent receives a new ID", async () => {
  const { runtime, bodies } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  await runtime.capture(EVENT);
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.WITHDRAWN });
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.ALLOWED });
  await runtime.capture(EVENT);
  assert.notEqual(bodies[0].measurement_session_id, bodies[1].measurement_session_id);
});

test("denial after eligibility applies the same future-send block", async () => {
  const { runtime, bodies } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  await runtime.capture(EVENT);
  runtime.applyPrivacyState({ consentState: ANALYTICS_CONSENT_STATE.DENIED });
  await runtime.capture(EVENT);
  assert.equal(bodies.length, 1);
});

test("already accepted server and remote events are not classified as revoked", () => {
  assert.equal(ANALYTICS_WITHDRAWAL_CONTRACT.SERVER_REQUEST_ALREADY_ACCEPTED, "NOT_REVOKED_BY_CLIENT_ABORT");
  assert.equal(ANALYTICS_WITHDRAWAL_CONTRACT.REMOTE_ALREADY_ACCEPTED_EVENT, "NOT_REVOKED");
  assert.equal(ANALYTICS_WITHDRAWAL_CONTRACT.IN_FLIGHT_ABORT, "CLIENT_SIDE_BEST_EFFORT");
});

test("runtime reset returns to fail-closed state and retires identity", async () => {
  const { runtime, client } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  await runtime.capture(EVENT);
  const snapshot = runtime.resetRuntime();
  assert.equal(snapshot.eligibility, ANALYTICS_ELIGIBILITY.SUPPRESS_UNRESOLVED);
  assert.equal(client.getRuntimeState().hasMeasurementSessionId, false);
});

test("unsupported policy fails closed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, productPolicy: "OTHER" }), ANALYTICS_ELIGIBILITY.SUPPRESS_UNSUPPORTED);
});

test("unsupported consent fails closed", () => {
  assert.equal(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, consentState: ANALYTICS_CONSENT_STATE.UNSUPPORTED }), ANALYTICS_ELIGIBILITY.SUPPRESS_UNSUPPORTED);
});

test("provider token presence is not consent authority", () => {
  assert.notEqual(resolveAnalyticsEligibility({ ...ELIGIBLE_STATE, consentState: ANALYTICS_CONSENT_STATE.UNRESOLVED, tokenPresent: true }), ANALYTICS_ELIGIBILITY.ELIGIBLE);
});

test("UI locale cannot grant Analytics eligibility", () => {
  const runtime = createHarness().runtime;
  runtime.applyPrivacyState({ uiLocale: "en-US" });
  assert.notEqual(runtime.getSnapshot().eligibility, ANALYTICS_ELIGIBILITY.ELIGIBLE);
});

test("provider region cannot grant Analytics eligibility", () => {
  const runtime = createHarness().runtime;
  runtime.applyPrivacyState({ providerRegion: "KR" });
  assert.notEqual(runtime.getSnapshot().eligibility, ANALYTICS_ELIGIBILITY.ELIGIBLE);
});

test("eligibility and runtime source contain no PostHog requirement", () => {
  const source = ["./eligibility.js", "./consentEligibilityRuntime.js"]
    .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /posthog/i);
});

test("runtime uses no cookie or browser storage", () => {
  const source = readFileSync(new URL("./consentEligibilityRuntime.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB|caches)\b|document\.cookie/);
});

test("runtime uses no DB or persistent-state API", () => {
  const source = readFileSync(new URL("./consentEligibilityRuntime.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(?:database|indexedDB|CacheStorage|BroadcastChannel|ServiceWorker)\b/);
});

test("runtime contains no preconsent queue, retry, or delayed dispatch", () => {
  const source = readFileSync(new URL("./consentEligibilityRuntime.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(?:queueMicrotask|setTimeout|setInterval|sendBeacon|retry)\b/);
});

test("Product feature event wiring remains absent", () => {
  const page = readFileSync(new URL("../../../app/page.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /api\/analytics\/event|createAnalyticsClient|product_session_started|recommendation_requested|result_detail_opened/);
});

test("deterministic tests require no external network", async () => {
  const { runtime, bodies } = createHarness();
  runtime.applyPrivacyState(ELIGIBLE_STATE);
  await runtime.capture(EVENT);
  assert.equal(bodies.length, 1);
});
