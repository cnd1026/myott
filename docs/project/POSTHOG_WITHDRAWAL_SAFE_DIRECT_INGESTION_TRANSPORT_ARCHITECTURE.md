# PostHog Withdrawal-Safe Direct Ingestion Transport Architecture

## Authority

- Task: `MYOTT_POSTHOG_WITHDRAWAL_SAFE_DIRECT_INGESTION_TRANSPORT_ARCHITECTURE_V1`
- Class: privacy architecture / official-source proof / docs-only
- Product base: `3789c3b1a134e16fcb0370a662a3511b62ce587f`
- Research date: 2026-09-10 KST
- Provider: `POSTHOG_CLOUD / SELECTED`
- Region preference: `EU_CLOUD_PREFERRED`
- Measurement phase: `PHASE_1_SESSION_ONLY`
- This document selects a future transport architecture. It does not create a PostHog account or project, install software, load Analytics runtime, use a project token, or send an event.

## Browser SDK Rejection Context

The pinned PostHog Browser SDK proof found no supported public API that discards both ordinary pending requests and retry-pending requests after consent withdrawal. Disabling batching avoids only the ordinary RequestQueue; transport failures can still enter RetryQueue. `before_send` is not re-evaluated on retry, and shutdown/unload flushes rather than discards queued data.

The PostHog Cloud provider remains selected, but the Browser SDK is not eligible for MyOTT Phase 1 under the strict withdrawal contract. MyOTT must own the complete dispatch lifecycle without depending on SDK queues, retries, unload behavior, persistence, or private internals.

## Official Capture API Snapshot

PostHog documents the public single-event Capture API as `POST /i/v0/e/`. EU Cloud uses the ingestion host `https://eu.i.posthog.com`; US Cloud uses `https://us.i.posthog.com`. The event body requires a project token (`api_key`), `event`, `distinct_id`, and may include `properties` and `timestamp`.

| Evidence | Exact snapshot |
| --- | --- |
| Capture/API/privacy documentation | Current official pages read 2026-09-10 KST; the pages do not publish one combined API version |
| Capture/IP/GeoIP implementation source | PostHog monorepo commit `4ddca7158b350614e317ae1cba1e46ebcb2bcdd5`, complete tree snapshot read 2026-09-10 |
| Rejected Browser SDK context | `posthog-js` `1.428.10`, commit `412c97ccf43b525e5a12606ba049eab14c440ed0`, as pinned by the predecessor proof |

Phase 1 uses exactly:

```text
POST https://eu.i.posthog.com/i/v0/e/
Content-Type: application/json
```

The Capture endpoint is a public ingestion endpoint and does not use a personal API key or a project secret API key. Its project token is an ingestion-routing token suitable for client-side capture, not a user or administrator authorization credential. It must still never be logged, emitted as an event property, copied into evidence, or confused with a server-side secret.

PostHog documents that a `200` response means the payload was received with an accepted shape and project token. It does not prove that the event was semantically valid, persisted, or visible in the target project, and a quota-limited project may still return `200`.

## Transport Options Considered

| Option | Withdrawal result | Decision |
| --- | --- | --- |
| PostHog Browser SDK | Hidden RequestQueue/RetryQueue and unload-send behavior cannot be publicly discarded | Rejected for Phase 1 |
| MyOTT-owned direct single-event `fetch` | No internal queue, no retry, active request can be aborted by MyOTT | Selected architecture |
| MyOTT same-origin relay | Can hide token and own server dispatch, but adds a server queue/security/operations boundary | Fallback only after an explicit trigger and separate architecture Gate |
| Private SDK queue mutation | Unsupported and upgrade-fragile | Prohibited |

## Eligibility Gate

Analytics eligibility is owned by MyOTT, not PostHog. A capture attempt is allowed only when all of the following are synchronously true:

- Analytics purpose is enabled.
- Legal-jurisdiction state is supported and resolved.
- Required consent is granted and not withdrawn.
- Runtime disable/kill state is false.
- The event name and version are on the canonical Phase 1 allowlist.
- Every property passes the exact schema allowlist and redaction rules.
- A valid EU project token is available through the separately approved activation path.

Eligibility is checked twice: at the adapter entry point and immediately before `fetch` creation. `UNKNOWN`, missing, stale, malformed, denied, withdrawn, or unsupported state fails closed without creating an identity, payload, preflight, or ingestion request.

Pre-consent storage and replay are prohibited. An event suppressed while ineligible is not queued for later transmission.

## Ephemeral Identity

Phase 1 uses a cryptographically random measurement-session identifier generated only after the first eligible event needs dispatch. It is held in memory for the current loaded Product runtime and is destroyed on withdrawal, runtime teardown, or reload.

The identifier:

- is never stored in cookies, localStorage, sessionStorage, IndexedDB, Cache Storage, URL state, or service-worker state;
- is never derived from a Product guest ID, account ID, content ID, referral value, IP address, user agent, locale, device property, or fingerprint;
- is never reused across loaded runtimes;
- is never joined to a Product continuity identity or account;
- is never passed to `identify`, alias, group, or person-profile APIs.

The same ephemeral value is used as PostHog `distinct_id` and the canonical `measurement_session_id` for one loaded runtime. This supports same-session funnel ordering only. It does not support returning-guest or cross-session retention measurement.

## Anonymous Event Contract

Every Phase 1 event must include:

```json
{
  "$process_person_profile": false,
  "$geoip_disable": true
}
```

`$process_person_profile: false` is mandatory because PostHog documents backend/API captures as identified by default unless person processing is explicitly disabled. The ephemeral `distinct_id` must never be used by an identified event; otherwise later events with that value can be associated with a person profile.

No `$set`, `$set_once`, `identify`, alias, group, or person property is allowed. Anonymous event configuration is an event-level property contract, not a substitute for eligibility, consent, or identity separation.

## Five-Event Projection

The provider projection is limited to the existing MyOTT canonical five-event allowlist. PostHog does not define event meaning.

| Canonical event | Version | Additional allowed properties |
| --- | --- | --- |
| `product_session_started` | `1` | `channel` |
| `recommendation_requested` | `1` | `selected_option_count`, `seed_count`, `content_type_values`, `request_mode` |
| `recommendation_succeeded` | `1` | `result_count`, `success_class`, optional coarse `latency_bucket` |
| `recommendation_failed` | `1` | `failure_class`, optional coarse `latency_bucket` |
| `result_detail_opened` | `1` | `content_type_value`, `result_position_bucket` |

All events also use the canonical envelope:

- `event_name`
- `event_version`
- `event_id`
- `occurred_at`
- `measurement_session_id`
- `measurement_identity_state = SESSION_ONLY`
- `ui_locale`
- `content_provider_region`
- `legal_jurisdiction_state`
- `surface`
- optional trusted `release_identity`

`ui_locale`, `content_provider_region`, and `legal_jurisdiction_state` remain independent dimensions.

## Payload Contract

The provider adapter converts one validated canonical event to one PostHog Capture API request. The outer payload is:

```json
{
  "api_key": "<project-token-from-approved-runtime-config>",
  "event": "<exact-canonical-event-name>",
  "distinct_id": "<ephemeral-measurement-session-id>",
  "timestamp": "<canonical-occurred-at>",
  "properties": {
    "$process_person_profile": false,
    "$geoip_disable": true,
    "event_version": 1,
    "event_id": "<canonical-event-id>",
    "measurement_session_id": "<same-ephemeral-id-as-distinct-id>",
    "measurement_identity_state": "SESSION_ONLY",
    "ui_locale": "<canonical-ui-locale>",
    "content_provider_region": "<canonical-provider-region>",
    "legal_jurisdiction_state": "<resolved-canonical-state>",
    "surface": "<canonical-surface>"
  }
}
```

The canonical `event_name` maps to the outer PostHog `event` field and `occurred_at` maps to `timestamp`; they are not duplicated as properties. The remaining canonical envelope and event-specific properties are copied only through explicit field tables. Optional `release_identity` is admitted only when supplied by a trusted release source. No object spread from Product, request, provider, browser, exception, URL, or user-input objects is permitted.

Prohibited data includes raw free text, recommendation inputs, titles, content/result/provider IDs unless separately approved, full URL/referrer/query, raw IP, precise location, user agent fingerprint material, Product guest/account IDs, credentials, provider payloads, stack traces, and raw error bodies.

## Fetch Request Shape

The future adapter uses the platform `fetch` API directly with this fixed shape:

```js
fetch("https://eu.i.posthog.com/i/v0/e/", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
  credentials: "omit",
  cache: "no-store",
  redirect: "error",
  referrerPolicy: "no-referrer",
  keepalive: false,
  signal: controller.signal,
});
```

No custom authorization header is used. The project token exists only in the request body required by the public ingestion contract. The implementation must not log request bodies or response bodies.

## No Queue / No Retry

The adapter has no queue. It sends at most one immediate request per eligible event and does not retain an event for delayed or repeated transmission.

The adapter has no retry for network errors, HTTP failures, timeouts, aborts, rate limits, online/offline changes, visibility changes, or reloads. It does not use background sync, service workers, IndexedDB, local persistence, scheduler callbacks, exponential backoff, or browser lifecycle flushes.

Failure is resolved locally as a bounded transport result and is not converted into another Analytics event. Product behavior continues without throwing transport errors into the recommendation experience.

## Withdrawal Model

Withdrawal performs this ordered transition:

1. Atomically mark Analytics eligibility as withdrawn/disabled.
2. Prevent creation of any new measurement identity, payload, controller, preflight, or ingestion request.
3. Abort every active MyOTT-owned controller.
4. Clear the active-controller registry and destroy the in-memory measurement-session identifier.
5. Do not flush, replay, persist, or report suppressed/aborted events.

The registry contains only active `AbortController` instances keyed by an internal request handle. It does not contain event payloads or a retry queue.

No event may be replayed after consent returns. Only future canonical events may enter the eligibility Gate, and any resulting session metrics remain consent-limited.

## Send Commit Point

MyOTT distinguishes three states:

| State | Meaning | Withdrawal behavior |
| --- | --- | --- |
| `NOT_DISPATCHED` | Eligibility/schema failed or `fetch` was not created | No network occurred; event is discarded |
| `ACTIVE_REQUEST` | `fetch` exists and may not yet have completed | AbortController is invoked; completion is not claimed as revocable |
| `DISPATCH_COMPLETED` | Browser/network has completed the request | Cannot be retracted; no retry or follow-up is created |

The privacy contract guarantees destruction of MyOTT-owned unsent/pending state. It does not falsely claim retroactive deletion of bytes already dispatched beyond browser control. Legal/product policy must accept or reject this explicit commit-point boundary before activation.

## AbortController Boundary

Each request gets a fresh controller registered before `fetch`. A `finally` path removes it from the registry. Withdrawal aborts every registered controller.

AbortController is best-effort cancellation of an active browser request. It proves that MyOTT retains no active request handle or later retry after withdrawal; it does not prove that the remote provider received zero bytes when abort races with network dispatch. This residual boundary is explicit and requires legal/privacy acceptance.

## Unload Policy

There is no `beforeunload`, `unload`, `pagehide`, `visibilitychange`, freeze, resume, online, or offline Analytics sender. The adapter does not call `sendBeacon`, does not set `keepalive: true`, and does not flush on navigation or bfcache lifecycle changes.

Normal page teardown may terminate an active non-keepalive request. MyOTT does not compensate with replay or retry.

## Response / Ingestion Semantics

Transport outcomes are classified separately:

- `SUPPRESSED`: no request created because eligibility/schema/config failed.
- `ABORTED`: active request was aborted or browser aborted it.
- `TRANSPORT_ACCEPTED`: HTTP `2xx`, including `200`; request reached the public endpoint contract.
- `TRANSPORT_REJECTED`: non-`2xx` response.
- `TRANSPORT_FAILED`: network/CORS/redirect/parse-independent failure.

`TRANSPORT_ACCEPTED` is not `INGESTION_PROVEN`. Actual project ingestion requires a later authorized proof using the PostHog project UI/API readback and an exact non-sensitive test event. Response bodies are not trusted as Product data and are not logged.

## IP / GeoIP Boundary

Three boundaries are kept distinct:

| Boundary | Phase 1 treatment |
| --- | --- |
| `TRANSPORT_SOURCE_IP` | Necessarily reaches the remote ingestion infrastructure as part of the network connection; legal review required |
| `EVENT_PROPERTY_IP` | Prohibited; MyOTT does not deliberately include `$ip` or a raw IP property, and the EU project must enable `anonymize_ips` / **Discard client IP data** |
| `GEOIP_DERIVED_PROPERTIES` | Every event includes `$geoip_disable: true` so PostHog's GeoIP transformation does not derive location properties |

Current official PostHog source shows capture receiving a client IP in processing context. Its GeoIP template bypasses enrichment when `$geoip_disable` is true. The official project setting controls whether new client IP data is discarded. EU organizations default IP capture off for new projects, but a default is not sufficient evidence for a specific project; activation must independently verify the project setting.

`EU_CLOUD_PREFERRED` is a data-region preference, not proof of GDPR, PIPA, CCPA, cross-border-transfer, processor/subprocessor, DPA, notice, or retention compliance.

`DIRECT_BROWSER_IP_PRIVACY_BOUNDARY = LEGAL_REVIEW_REQUIRED`.

## CORS / Network Boundary

Cross-origin JSON `fetch` can require a browser CORS preflight. A preflight is PostHog-directed external network and may occur immediately before the event POST, but only after both eligibility checks pass. No request is permitted pre-consent.

Current official endpoint documentation establishes the public browser-capable ingestion contract, but this Task did not execute browser, OPTIONS, or event traffic. The exact production origin, EU endpoint CORS response, redirect behavior, failure behavior, and one-request/no-retry ledger remain future isolated Browser/network proof requirements.

`DIRECT_BROWSER_CORS_COMPATIBILITY = FUTURE_LIVE_PROOF_REQUIRED`.

`DIRECT_BROWSER_CORS = FUTURE_LIVE_PROOF_REQUIRED`.

## Project Token Boundary

- `PROJECT_TOKEN = NOT_AVAILABLE`; no PostHog account or project exists and none is created by this Task.
- `PROJECT_INGESTION_TOKEN = INGESTION_ROUTING_TOKEN / NOT_USER_AUTHORIZATION / NOT_ADMIN_SECRET`.
- Classification: `INGESTION_ROUTING_TOKEN / NOT_USER_AUTHORIZATION / NOT_ADMIN_SECRET`.
- It grants capture routing to one project; it does not grant account, organization, project-administration, query, export, or deletion authority.
- No personal API key or project secret API key may enter browser code.
- The token must be supplied only by a separately approved public runtime configuration path.
- Token presence does not enable Analytics. Eligibility remains the dispatch authority.
- Token must be absent from logs, error reports, screenshots, test artifacts, event properties, URLs, and referrers.

## Provider Abstraction

Product code emits only canonical MyOTT events to a provider-neutral adapter interface. The PostHog adapter owns endpoint mapping and provider-required fields. Product modules must not import PostHog concepts or know the project token.

Replacing PostHog must not change canonical event names, versions, property meaning, KPI formulas, privacy eligibility, identity rules, or Product semantics.

## Phase 1 KPI Limits

The session-only architecture can support same-runtime activation and funnel metrics. It cannot measure:

- D1, D7, or D30 retention;
- returning-guest rate;
- cross-session retention;
- guest-to-account longitudinal conversion;
- WAU/MAU identity-based frequency across runtimes.

These are `NOT_MEASURABLE_IN_PHASE_1`, not zero. They may reopen only under a separately approved pseudonymous cross-session measurement identity contract.

## Free-first Boundary

Founder cost strategy remains `FREE_FIRST`, with domain-only paid baseline. The selected provider's free allowance is time-sensitive evidence and must be rechecked at activation/release. No account, purchase, plan upgrade, billing instrument, paid retention, or new infrastructure is authorized by this architecture.

## Future Module Plan

Future implementation, under a separate Task, may use a small boundary such as:

```text
src/lib/analytics/eligibility.js
src/lib/analytics/canonicalEventSchema.js
src/lib/analytics/sessionIdentity.js
src/lib/analytics/posthogDirectTransport.js
src/lib/analytics/analyticsAdapter.js
```

Responsibilities must remain separated:

- eligibility resolves consent/jurisdiction/runtime state;
- schema validates exact event versions and properties;
- session identity owns memory-only creation/destruction;
- transport owns one controller per single request and no retry;
- adapter projects canonical events without Product coupling.

No module is authorized for implementation by this document.

## Deterministic Test Plan

Future implementation acceptance must include independent expected fixtures for at least these 30 cases:

1. unresolved eligibility suppresses before identity creation;
2. denied consent suppresses before payload creation;
3. withdrawn state suppresses before fetch creation;
4. supported granted state allows one request;
5. second eligibility check blocks a state change immediately before fetch;
6. pre-consent event is never replayed after grant;
7. ephemeral identity is created only after first eligible dispatch;
8. identity remains stable within one loaded runtime;
9. identity changes after runtime reload;
10. identity is destroyed on withdrawal;
11. guest/account IDs are never reused;
12. all five event names and versions map exactly;
13. unknown event name fails closed;
14. unknown event version fails closed;
15. extra property fails schema validation;
16. raw free text and prohibited identifiers are rejected;
17. every event includes `$process_person_profile: false`;
18. every event includes `$geoip_disable: true`;
19. request uses the exact EU single-event endpoint;
20. request uses `credentials: omit` and `referrerPolicy: no-referrer`;
21. request uses `keepalive: false`;
22. no sendBeacon or lifecycle sender exists;
23. network failure creates no retry;
24. HTTP failure creates no retry;
25. CORS failure creates no retry;
26. withdrawal aborts all active controllers;
27. abort race creates no later retry or queue residue;
28. transport errors do not alter Product behavior;
29. `2xx` is classified as transport acceptance, not ingestion proof;
30. imports have no account, storage, browser lifecycle, or network side effects.

Tests must also prove semantic identity of canonical event payloads before and after provider projection, property allowlist/redaction, token non-observability, and zero persistence surfaces.

## Browser/Network Proof

A later isolated proof must use a task-owned browser profile and localhost-only Product runtime. It must record exact OPTIONS and POST requests, request count, headers without token disclosure, redirect count, response status, console/page errors, active-controller cleanup, and zero retry/unload traffic.

Required proof states include grant, deny, mid-session withdrawal before request, withdrawal during active request, navigation/pagehide, offline failure, CORS rejection, and network recovery. The Founder Preview on port 3000 must remain untouched.

No Browser/network proof was run in this Task.

## Live Ingestion Proof

After account/project activation is separately authorized, one bounded non-sensitive event may prove project ingestion only if all earlier Gates pass. Required evidence includes:

- exact EU project and verified **Discard client IP data** setting;
- exact test origin and CORS behavior;
- anonymous/no-person-profile result;
- absence of GeoIP-derived properties;
- exact allowed property set;
- project readback of the event;
- zero replay, retry, unload send, cookie, storage, identify, or person profile;
- cleanup/retention handling for the test record.

No live ingestion occurred in this Task.

## Fallback Relay Trigger

A same-origin MyOTT relay is not the default. It requires a new architecture Gate if any of these is proven:

- browser CORS blocks the exact EU public endpoint;
- public project-token exposure is rejected by Product/security policy;
- source-IP or legal boundary requires server mediation;
- browser AbortController cannot meet the accepted commit-point contract;
- project-side controls cannot verify required anonymization;
- direct browser transport cannot produce reliable bounded evidence.

The relay must not be treated as a shortcut. It introduces server security, abuse prevention, rate limiting, token custody, origin/CSRF controls, log redaction, queue/retry, hosting cost, retention, and operational ownership. None is authorized here.

## Legal Review Boundary

Activation requires legal/privacy review of transport source IP, EU processing and transfers, processor/subprocessor disclosures, DPA applicability, privacy notice content, retention, consent/withdrawal language, and the exact send commit point.

This architecture does not claim GDPR, PIPA, CCPA, or global privacy compliance. Cookieless or anonymous event configuration does not replace no-preconsent transmission or legal eligibility.

## Activation Gate

### Strict Architecture Matrix

| # | Required architecture property | Result |
| --- | --- | --- |
| 1 | No pre-consent SDK load or network | PASS: no SDK; eligibility before identity/payload/fetch |
| 2 | Session-only non-persistent identity | PASS: cryptographically random memory-only runtime ID |
| 3 | No Product/account identity reuse | PASS: explicit prohibition |
| 4 | Exact canonical five-event projection | PASS: fixed names, versions, and field tables |
| 5 | Exact property allowlist/redaction | PASS: explicit schema, no object spread |
| 6 | Anonymous/no-person-profile events | PASS: `$process_person_profile: false` mandatory |
| 7 | No internal queue | PASS: single immediate request only |
| 8 | No retry | PASS: every failure terminal locally |
| 9 | Withdrawal stops future dispatch | PASS: eligibility flips before controller abort |
| 10 | Pending MyOTT-owned work discarded | PASS: no payload queue; active controllers aborted and cleared |
| 11 | No unload/sendBeacon/background send | PASS: lifecycle senders and keepalive prohibited |
| 12 | No private SDK/internal dependency | PASS: direct platform fetch only |
| 13 | IP/GeoIP boundary acceptable or gated | PASS: source-IP legal Gate, project IP discard, `$geoip_disable` |
| 14 | CORS/network behavior explicit | PASS: exact endpoint and future isolated proof Gate |
| 15 | Provider-independent Product contract | PASS: canonical adapter boundary preserved |
| 16 | No activation implied | PASS: account/project/token/runtime/live proof remain separate |

`ARCHITECTURE_HARD_GATES = 16/16 PASS`.

`PHASE_1_POSTHOG_TRANSPORT_ARCHITECTURE = MYOTT_DIRECT_SINGLE_EVENT_CAPTURE`.

`DIRECT_INGESTION_ACTIVATION_READY = NO`.

Outstanding activation conditions:

1. Account/project creation and EU region must be separately authorized.
2. The actual project token/config path must be approved without secret/admin credentials in browser code.
3. **Discard client IP data** must be enabled and independently read back for the exact project.
4. Legal/privacy review must accept source-IP, cross-border, notice, retention, DPA, consent, and send-commit-point boundaries.
5. Exact implementation and 30-case deterministic tests must pass.
6. Isolated browser/CORS/network proof must pass with zero retry/unload traffic.
7. One separately authorized live ingestion proof must confirm anonymous/no-profile/no-GeoIP behavior and exact property allowlist.
8. Security, Release, Production, and Deployment remain separate Gates.

Next handoff: `MYOTT_POSTHOG_ACCOUNT_PROJECT_ACTIVATION_PREPARATION_V1`.

## Sources

- [PostHog Capture API](https://posthog.com/docs/api/capture)
- [PostHog API overview](https://posthog.com/docs/api/overview)
- [PostHog anonymous and identified events](https://posthog.com/docs/data/anonymous-vs-identified-events)
- [PostHog organization and IP capture settings](https://posthog.com/docs/settings/organizations)
- [Pinned PostHog project IP setting UI](https://github.com/PostHog/posthog/blob/4ddca7158b350614e317ae1cba1e46ebcb2bcdd5/frontend/src/scenes/settings/environment/IPCapture.tsx)
- [Pinned PostHog GeoIP transformation](https://github.com/PostHog/posthog/blob/4ddca7158b350614e317ae1cba1e46ebcb2bcdd5/nodejs/src/cdp/templates/_transformations/geoip/geoip.template.ts)
- [Pinned PostHog capture endpoint](https://github.com/PostHog/posthog/blob/4ddca7158b350614e317ae1cba1e46ebcb2bcdd5/rust/capture/src/v0_endpoint.rs)
- [Pinned PostHog analytics processing context](https://github.com/PostHog/posthog/blob/4ddca7158b350614e317ae1cba1e46ebcb2bcdd5/rust/capture/src/payload/analytics.rs)
- [MyOTT Browser SDK withdrawal proof](POSTHOG_BROWSER_SDK_WITHDRAWAL_PENDING_QUEUE_PROOF.md)
- [MyOTT session-only measurement architecture](POSTHOG_SESSION_ONLY_MEASUREMENT_IMPLEMENTATION_ARCHITECTURE.md)
- [MyOTT event taxonomy](GROWTH_MEASUREMENT_EVENT_TAXONOMY.md)
- [MyOTT privacy eligibility matrix](PRIVACY_CONSENT_MEASUREMENT_ELIGIBILITY_MATRIX.md)
- [MyOTT provider decision packet](FREE_FIRST_ANALYTICS_PROVIDER_DECISION_PACKET.md)
