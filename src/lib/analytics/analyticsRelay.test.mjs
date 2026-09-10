import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CANONICAL_EVENT_NAMES,
  CANONICAL_EVENT_REGISTRY,
} from "./canonicalEvents.js";
import {
  ANALYTICS_ELIGIBILITY,
  isAnalyticsEligible,
  resolveAnalyticsEligibility,
} from "./eligibility.js";
import { createAnalyticsClient } from "./analyticsClient.js";
import { validateCanonicalEvent } from "./propertyPolicy.js";
import {
  POSTHOG_EU_EVENT_ENDPOINT,
  forwardPosthogEvent,
  projectPosthogEvent,
} from "./providers/posthogRelay.js";
import {
  ANALYTICS_BODY_LIMIT_BYTES,
  handleAnalyticsRelay,
} from "./server/relayHandler.js";

const TEST_TOKEN = "TEST_ONLY_PROJECT_TOKEN_DO_NOT_USE";
const UUIDS = Object.freeze({
  event: "11111111-1111-4111-8111-111111111111",
  session: "22222222-2222-4222-8222-222222222222",
  secondEvent: "33333333-3333-4333-8333-333333333333",
});

const ELIGIBLE = Object.freeze({
  runtimeEnvironment: "PRODUCTION",
  productPolicy: "ANALYTICS_ENABLED",
  jurisdictionState: "ANALYTICS_ALLOWED_UNDER_APPROVED_POLICY",
  consentState: "ANALYTICS_ALLOWED",
  measurementIdentityState: "SESSION_ONLY",
});

const CONTEXT = Object.freeze({
  uiLocale: "ko-KR",
  contentProviderRegion: "KR",
  legalJurisdictionState: "RESOLVED",
  surface: "RECOMMENDATION",
});

function canonicalEvent(eventName = "recommendation_requested", overrides = {}) {
  const eventFields = {
    product_session_started: { channel: "DIRECT" },
    recommendation_requested: {
      selected_option_count: 2,
      seed_count: 1,
      content_type_values: ["movie"],
      request_mode: "SEEDS",
    },
    recommendation_succeeded: {
      result_count: 4,
      success_class: "USABLE_RESULT",
    },
    recommendation_failed: { failure_class: "NO_RESULT" },
    result_detail_opened: {
      content_type_value: "movie",
      result_position_bucket: "TOP_3",
    },
  };

  return {
    event_name: eventName,
    event_version: 1,
    event_id: UUIDS.event,
    occurred_at: "2026-09-10T12:00:00.000Z",
    measurement_session_id: UUIDS.session,
    measurement_identity_state: "SESSION_ONLY",
    ui_locale: "ko-KR",
    content_provider_region: "KR",
    legal_jurisdiction_state: "RESOLVED",
    surface: "RECOMMENDATION",
    ...eventFields[eventName],
    ...overrides,
  };
}

function relayRequest(body, {
  method = "POST",
  contentType = "application/json",
  origin = "https://myott.example",
  host = "myott.example",
  fetchSite = "same-origin",
  contentLength,
} = {}) {
  const headers = new Headers({
    "Content-Type": contentType,
    Origin: origin,
    Host: host,
    "Sec-Fetch-Site": fetchSite,
  });
  if (contentLength !== undefined) headers.set("Content-Length", String(contentLength));

  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") init.body = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("https://myott.example/api/analytics/event", init);
}

test("registry contains exactly the five approved canonical events", () => {
  assert.deepEqual(CANONICAL_EVENT_NAMES, [
    "product_session_started",
    "recommendation_requested",
    "recommendation_succeeded",
    "recommendation_failed",
    "result_detail_opened",
  ]);
});

test("every canonical event has version and explicit property schemas", () => {
  for (const definition of Object.values(CANONICAL_EVENT_REGISTRY)) {
    assert.equal(definition.eventVersion, 1);
    assert.equal(typeof definition.requiredProperties, "object");
    assert.equal(typeof definition.optionalProperties, "object");
  }
});

test("all five canonical event fixtures validate", () => {
  for (const eventName of CANONICAL_EVENT_NAMES) {
    assert.equal(validateCanonicalEvent(canonicalEvent(eventName)).ok, true, eventName);
  }
});

test("unknown events are rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent("unknown_event")).code, "UNKNOWN_EVENT");
});

test("missing event versions are rejected", () => {
  const event = canonicalEvent();
  delete event.event_version;
  assert.equal(validateCanonicalEvent(event).field, "event_version");
});

test("wrong event versions are rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { event_version: 2 })).field, "event_version");
});

test("unknown properties fail closed", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { unexpected: true })).code, "UNKNOWN_PROPERTY");
});

test("raw free text is rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { raw_text: "private input" })).code, "PROHIBITED_PROPERTY");
});

test("favorite-work input is rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { favorite_work: "private input" })).code, "PROHIBITED_PROPERTY");
});

test("guest IDs are rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { guest_id: UUIDS.session })).code, "PROHIBITED_PROPERTY");
});

test("account IDs are rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { account_id: "account-1" })).code, "PROHIBITED_PROPERTY");
});

test("browser-supplied provider tokens are rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { api_key: TEST_TOKEN })).code, "PROHIBITED_PROPERTY");
});

test("browser-supplied provider controls are rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { "$geoip_disable": false })).code, "PROHIBITED_PROPERTY");
});

test("invalid event-specific types are rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { seed_count: "1" })).field, "seed_count");
});

test("duplicate canonical content types are rejected", () => {
  const event = canonicalEvent(undefined, { content_type_values: ["movie", "movie"] });
  assert.equal(validateCanonicalEvent(event).field, "content_type_values");
});

test("unapproved canonical values are rejected", () => {
  const event = canonicalEvent(undefined, { content_type_values: ["tv"] });
  assert.equal(validateCanonicalEvent(event).field, "content_type_values");
});

test("malformed UUIDs are rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { event_id: "not-an-id" })).field, "event_id");
});

test("noncanonical UTC timestamps are rejected", () => {
  assert.equal(validateCanonicalEvent(canonicalEvent(undefined, { occurred_at: "2026-09-10" })).field, "occurred_at");
});

test("eligible state requires every Product-owned gate", () => {
  assert.equal(resolveAnalyticsEligibility(ELIGIBLE), ANALYTICS_ELIGIBILITY.ELIGIBLE);
  assert.equal(isAnalyticsEligible(ELIGIBLE), true);
});

test("ineligible runtime suppresses client relay fetch", async () => {
  let calls = 0;
  const client = createAnalyticsClient({ fetchImpl: async () => { calls += 1; return { ok: true }; } });
  const result = await client.capture({ eventName: "product_session_started", properties: { channel: "DIRECT" }, context: CONTEXT, eligibility: { ...ELIGIBLE, runtimeEnvironment: "PREVIEW" } });
  assert.equal(result.status, "SUPPRESSED");
  assert.equal(calls, 0);
});

test("unknown jurisdiction suppresses client relay fetch", async () => {
  let calls = 0;
  const client = createAnalyticsClient({ fetchImpl: async () => { calls += 1; return { ok: true }; } });
  await client.capture({ eventName: "product_session_started", properties: { channel: "DIRECT" }, context: CONTEXT, eligibility: { ...ELIGIBLE, jurisdictionState: "JURISDICTION_UNKNOWN" } });
  assert.equal(calls, 0);
});

test("denied consent suppresses client relay fetch", async () => {
  let calls = 0;
  const client = createAnalyticsClient({ fetchImpl: async () => { calls += 1; return { ok: true }; } });
  await client.capture({ eventName: "product_session_started", properties: { channel: "DIRECT" }, context: CONTEXT, eligibility: { ...ELIGIBLE, consentState: "ANALYTICS_DENIED" } });
  assert.equal(calls, 0);
});

test("eligible client sends one provider-neutral same-origin request", async () => {
  const calls = [];
  const uuids = [UUIDS.session, UUIDS.event];
  const client = createAnalyticsClient({
    fetchImpl: async (...args) => { calls.push(args); return { ok: true }; },
    randomUuid: () => uuids.shift(),
    now: () => "2026-09-10T12:00:00.000Z",
  });
  const result = await client.capture({ eventName: "product_session_started", properties: { channel: "DIRECT" }, context: CONTEXT, eligibility: ELIGIBLE });
  assert.equal(result.status, "ACCEPTED");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/analytics/event");
  assert.equal(calls[0][1].credentials, "omit");
  assert.equal(JSON.parse(calls[0][1].body).event_version, 1);
});

test("client creates one memory-only session ID and fresh event IDs", async () => {
  const bodies = [];
  const uuids = [UUIDS.session, UUIDS.event, UUIDS.secondEvent];
  const client = createAnalyticsClient({
    fetchImpl: async (_url, options) => { bodies.push(JSON.parse(options.body)); return { ok: true }; },
    randomUuid: () => uuids.shift(),
    now: () => "2026-09-10T12:00:00.000Z",
  });
  await client.capture({ eventName: "product_session_started", properties: { channel: "DIRECT" }, context: CONTEXT, eligibility: ELIGIBLE });
  await client.capture({ eventName: "product_session_started", properties: { channel: "DIRECT" }, context: CONTEXT, eligibility: ELIGIBLE });
  assert.equal(bodies[0].measurement_session_id, bodies[1].measurement_session_id);
  assert.notEqual(bodies[0].event_id, bodies[1].event_id);
});

test("withdrawal prevents every later client dispatch", async () => {
  let calls = 0;
  const client = createAnalyticsClient({ fetchImpl: async () => { calls += 1; return { ok: true }; } });
  client.withdraw();
  const result = await client.capture({ eventName: "product_session_started", properties: { channel: "DIRECT" }, context: CONTEXT, eligibility: ELIGIBLE });
  assert.equal(result.status, "SUPPRESSED");
  assert.equal(calls, 0);
});

test("withdrawal aborts active browser-to-relay request handles", async () => {
  let observedSignal;
  const uuids = [UUIDS.session, UUIDS.event];
  const client = createAnalyticsClient({
    fetchImpl: async (_url, options) => {
      observedSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    },
    randomUuid: () => uuids.shift(),
    now: () => "2026-09-10T12:00:00.000Z",
  });
  const capture = client.capture({ eventName: "product_session_started", properties: { channel: "DIRECT" }, context: CONTEXT, eligibility: ELIGIBLE });
  client.withdraw();
  assert.equal(observedSignal.aborted, true);
  assert.deepEqual(await capture, { status: "DROPPED", reason: "ABORTED" });
});

test("wrong HTTP method is rejected before provider fetch", async () => {
  let calls = 0;
  const response = await handleAnalyticsRelay(relayRequest(null, { method: "GET" }), { projectToken: TEST_TOKEN, fetchImpl: async () => { calls += 1; } });
  assert.equal(response.status, 405);
  assert.equal(calls, 0);
});

test("wrong content type is rejected before provider fetch", async () => {
  let calls = 0;
  const response = await handleAnalyticsRelay(relayRequest(canonicalEvent(), { contentType: "text/plain" }), { projectToken: TEST_TOKEN, fetchImpl: async () => { calls += 1; } });
  assert.equal(response.status, 415);
  assert.equal(calls, 0);
});

test("cross-origin requests are rejected before provider fetch", async () => {
  let calls = 0;
  const response = await handleAnalyticsRelay(relayRequest(canonicalEvent(), { origin: "https://other.example" }), { projectToken: TEST_TOKEN, fetchImpl: async () => { calls += 1; } });
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test("cross-site fetch metadata is rejected before provider fetch", async () => {
  let calls = 0;
  const response = await handleAnalyticsRelay(relayRequest(canonicalEvent(), { fetchSite: "cross-site" }), { projectToken: TEST_TOKEN, fetchImpl: async () => { calls += 1; } });
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test("declared oversized requests are rejected before body parsing", async () => {
  let calls = 0;
  const response = await handleAnalyticsRelay(relayRequest(canonicalEvent(), { contentLength: ANALYTICS_BODY_LIMIT_BYTES + 1 }), { projectToken: TEST_TOKEN, fetchImpl: async () => { calls += 1; } });
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test("decoded oversized requests are rejected", async () => {
  let calls = 0;
  const body = JSON.stringify({ payload: "x".repeat(ANALYTICS_BODY_LIMIT_BYTES) });
  const response = await handleAnalyticsRelay(relayRequest(body), { projectToken: TEST_TOKEN, fetchImpl: async () => { calls += 1; } });
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test("malformed JSON is rejected", async () => {
  let calls = 0;
  const response = await handleAnalyticsRelay(relayRequest("{"), { projectToken: TEST_TOKEN, fetchImpl: async () => { calls += 1; } });
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("missing server token disables analytics without forwarding", async () => {
  let calls = 0;
  const response = await handleAnalyticsRelay(relayRequest(canonicalEvent()), { projectToken: "", fetchImpl: async () => { calls += 1; } });
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { status: "DISABLED", reason: "CONFIG_MISSING" });
  assert.equal(calls, 0);
});

test("accepted event produces exactly one provider request", async () => {
  let calls = 0;
  const response = await handleAnalyticsRelay(relayRequest(canonicalEvent()), { projectToken: TEST_TOKEN, fetchImpl: async () => { calls += 1; return { ok: true }; } });
  assert.equal(response.status, 202);
  assert.equal(calls, 1);
});

test("provider failure is nonfatal and is never retried", async () => {
  let calls = 0;
  const response = await handleAnalyticsRelay(relayRequest(canonicalEvent()), { projectToken: TEST_TOKEN, fetchImpl: async () => { calls += 1; throw new Error("synthetic provider failure"); } });
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { status: "DROPPED", reason: "PROVIDER_UNAVAILABLE" });
  assert.equal(calls, 1);
});

test("provider projection injects anonymous and GeoIP controls", () => {
  const payload = projectPosthogEvent(canonicalEvent(), TEST_TOKEN);
  assert.equal(payload.properties.$process_person_profile, false);
  assert.equal(payload.properties.$geoip_disable, true);
});

test("provider projection preserves canonical event identity and version", () => {
  const event = canonicalEvent();
  const payload = projectPosthogEvent(event, TEST_TOKEN);
  assert.equal(payload.event, event.event_name);
  assert.equal(payload.properties.event_version, event.event_version);
  assert.equal(payload.properties.event_id, event.event_id);
  assert.equal(payload.distinct_id, event.measurement_session_id);
});

test("provider transport uses the fixed EU endpoint and one JSON POST", async () => {
  const calls = [];
  await forwardPosthogEvent({ event: canonicalEvent(), projectToken: TEST_TOKEN, fetchImpl: async (...args) => { calls.push(args); return { ok: true }; } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], POSTHOG_EU_EVENT_ENDPOINT);
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(calls[0][1].headers, { "Content-Type": "application/json" });
  assert.equal(calls[0][1].redirect, "error");
  assert.equal("keepalive" in calls[0][1], false);
});

test("incoming browser IP headers never enter provider request", async () => {
  const calls = [];
  const request = relayRequest(canonicalEvent());
  request.headers.set("X-Forwarded-For", "203.0.113.10");
  request.headers.set("CF-Connecting-IP", "203.0.113.11");
  await handleAnalyticsRelay(request, { projectToken: TEST_TOKEN, fetchImpl: async (...args) => { calls.push(args); return { ok: true }; } });
  const serialized = JSON.stringify(calls[0]);
  assert.equal(serialized.includes("203.0.113.10"), false);
  assert.equal(serialized.includes("203.0.113.11"), false);
  assert.deepEqual(calls[0][1].headers, { "Content-Type": "application/json" });
});

test("provider token never appears in relay response", async () => {
  const response = await handleAnalyticsRelay(relayRequest(canonicalEvent()), { projectToken: TEST_TOKEN, fetchImpl: async () => ({ ok: true }) });
  assert.equal((await response.text()).includes(TEST_TOKEN), false);
});

test("route surface exports POST and no alternate method", async () => {
  const route = await import("../../../app/api/analytics/event/route.js");
  assert.equal(typeof route.POST, "function");
  assert.equal("GET" in route, false);
  assert.equal("PUT" in route, false);
});

test("implementation contains no queue, retry, delayed, beacon, or storage mechanism", () => {
  const paths = [
    "src/lib/analytics/analyticsClient.js",
    "src/lib/analytics/providers/posthogRelay.js",
    "src/lib/analytics/server/relayHandler.js",
    "app/api/analytics/event/route.js",
  ];
  const source = paths.map((path) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB|sendBeacon|setTimeout|setInterval)\b/);
  assert.doesNotMatch(source, /\b(?:queueMicrotask|BroadcastChannel|SharedWorker|ServiceWorker)\b/);
  assert.doesNotMatch(source, /\.identify\s*\(|posthog-js|from\s+["']posthog/);
});

test("package manifest contains no PostHog SDK dependency", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  assert.equal(Object.keys(dependencies).some((name) => name.toLowerCase().includes("posthog")), false);
});
