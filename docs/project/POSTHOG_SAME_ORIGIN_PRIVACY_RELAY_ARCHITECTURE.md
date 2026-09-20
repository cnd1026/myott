# PostHog Same-Origin Privacy Relay Architecture

## Authority

- Task: `MYOTT_POSTHOG_SAME_ORIGIN_PRIVACY_RELAY_ARCHITECTURE_V1`
- Class: privacy-aware / metric-integrity / docs-only architecture
- Product base: `6cc08ffa8ba021303a332679b5ff6fd63315987e`
- Research date: 2026-09-10 KST
- Provider: `POSTHOG_CLOUD / SELECTED`
- Region preference: `EU_CLOUD_PREFERRED`
- Measurement phase: `PHASE_1_SESSION_ONLY`
- New official network research: `0`; this Task reuses the accepted pinned PostHog evidence recorded by the two predecessor proofs.
- This document selects an architecture only. It does not create an account/project, install an SDK, create or write a token, add a route, run a server, or send an event.

Contract references:

- [Growth Measurement Event Taxonomy](GROWTH_MEASUREMENT_EVENT_TAXONOMY.md)
- [Privacy Consent Measurement Eligibility Matrix](PRIVACY_CONSENT_MEASUREMENT_ELIGIBILITY_MATRIX.md)
- [Free-First Analytics Provider Decision Packet](FREE_FIRST_ANALYTICS_PROVIDER_DECISION_PACKET.md)
- [PostHog Session-Only Measurement Architecture](POSTHOG_SESSION_ONLY_MEASUREMENT_IMPLEMENTATION_ARCHITECTURE.md)
- [PostHog Browser SDK Withdrawal Proof](POSTHOG_BROWSER_SDK_WITHDRAWAL_PENDING_QUEUE_PROOF.md)
- [PostHog Direct Ingestion Transport Architecture](POSTHOG_WITHDRAWAL_SAFE_DIRECT_INGESTION_TRANSPORT_ARCHITECTURE.md)
- [Guest Account Data Continuity Architecture](GUEST_ACCOUNT_DATA_CONTINUITY_ARCHITECTURE.md)
- [Decision Log](DECISION_LOG.md)

## Direct Browser Review Addendum

The direct single-event design remains technically feasible and remains useful evidence for the provider payload and withdrawal boundaries. It is not selected for Phase 1 after the PM LAB/HQ metric-integrity addendum.

```text
DIRECT_BROWSER = TECHNICALLY_FEASIBLE / NOT_SELECTED_FOR_PHASE_1
PUBLIC_CLIENT_EVENT_SPOOFING = POSSIBLE
DIRECT_BROWSER_BUYER_GRADE_METRIC_INTEGRITY = NOT_PROVEN
POSTHOG_PROJECT_TOKEN_PUBLIC_SUITABILITY != MYOTT_EVENT_AUTHENTICITY
DIRECT_BROWSER_IP_PRIVACY_BOUNDARY = LEGAL_REVIEW_REQUIRED
```

Client-side schema validation cannot stop an attacker from using an exposed project token to call the provider Capture endpoint directly. The public token's documented ingestion suitability does not authenticate a Product action or a human user.

`DL-035` is preserved as the historical technical-feasibility decision. Its current-state interpretation as the selected Phase 1 transport is superseded only by the bounded decision in this document and `DL-036`.

## Current Transport Candidates

| Candidate | Privacy | Integrity | Cost/complexity | Disposition |
| --- | --- | --- | --- | --- |
| PostHog Browser SDK | Hidden queue/retry and unload-send behavior fail strict withdrawal | Provider endpoint and SDK enrichment remain client-side | Low code, unacceptable withdrawal contract | Rejected for Phase 1 |
| Direct browser single-event Capture | No SDK queue/retry; browser IP reaches provider; token is public | Arbitrary direct provider submissions can bypass Product validation | Lowest operational complexity | Technically feasible, not selected |
| MyOTT same-origin relay | Browser IP stays at MyOTT hosting boundary; server sends only minimized payload | Server schema enforcement and hidden provider token materially reduce direct provider abuse | One function invocation and provider request per event; more operations | Selected Phase 1 architecture |

## Threat Model

The relay design addresses these threats without claiming that a public web endpoint proves human activity:

| Threat | Relay treatment | Residual limitation |
| --- | --- | --- |
| Arbitrary direct PostHog Capture | Project token remains server-only and Product code contains no provider endpoint | Token disclosure through unrelated operational failure remains a Security concern |
| Fabricated canonical event names | Exact server allowlist rejects unknown names before forwarding | An attacker can still fabricate an allowed event through the public relay |
| Fabricated or privacy-sensitive properties | Server reconstructs an exact per-event property set | Allowed values can still be dishonestly supplied unless independently derivable |
| Repeated identical requests | UUID/event ID shape and optional warm-instance duplicate observation | Cross-instance durable dedupe requires storage and is not baseline |
| High-volume event poisoning | Small body, exact schema, origin/host checks and future platform abuse controls | Headers are spoofable; no fraud-proof or human-authenticity claim |
| Cross-origin browser abuse | Exact origin policy, JSON content type and no permissive CORS | Non-browser clients can forge headers |
| Same-origin bots/automation | Server schema and bounded enum/count validation | Automation operating the Product surface can still produce valid-shaped events |
| Spoofed acquisition/referral state | Only bounded canonical channel enums; no raw URL/referrer | A client claim is not independently authenticated |

No raw user text, stable identity, fingerprint, or client IP is introduced to strengthen Analytics authenticity.

## Privacy Boundary

The privacy path is:

```text
canonical Product event
-> client Analytics eligibility
-> client canonical sanitizer
-> same-origin relay
-> server schema/property enforcement
-> PostHog provider projection
-> PostHog EU single-event endpoint
```

The relay is defense in depth. It does not replace the client consent Gate and does not collect suppressed events for later review. Server validation guarantees shape and minimization of forwarded data, not the truth of a public client's consent claim or behavior.

No cookies, localStorage, sessionStorage, IndexedDB, database, KV, durable queue, persistent Analytics identity, fingerprint, or account linkage is part of Phase 1.

## Raw IP Boundary

```text
TRANSPORT_CLIENT_IP_SEEN_BY_MYOTT_HOSTING = PLATFORM_OPERATIONAL_BOUNDARY
RAW_CLIENT_IP_FORWARDED_TO_POSTHOG = NO
POSTHOG_EVENT_IP_PROPERTY = NO
POSTHOG_GEOIP_DERIVATION = DISABLED_BY_PROVIDER_PROPERTY
```

The relay must never copy inbound `forwarded`, `x-forwarded-for`, `x-real-ip`, `client-ip`, `cf-connecting-ip`, or equivalent headers into the outbound request, event body, logs, or provider properties. It builds a fresh outbound header set containing only the required content type.

PostHog observes the relay/server network egress identity rather than an intentionally forwarded browser IP. Every provider event still includes `$geoip_disable: true`, and the exact EU project must enable and independently prove **Discard client IP data**. MyOTT hosting may process source IP operationally before the route executes; platform logs, retention, access, subprocessors, and legal disclosures remain separate activation Gates.

`EU_CLOUD_PREFERRED` is not a legal-compliance result.

## Consent / Eligibility

Before any browser request to the relay, the Product-owned Gate must synchronously resolve jurisdiction, Analytics consent, Product policy, and runtime environment to `ELIGIBLE`. Every unresolved, missing, denied, withdrawn, unsupported, malformed, or disabled state fails closed.

```text
INELIGIBLE_BROWSER_TO_RELAY_REQUEST = 0
INELIGIBLE_RELAY_TO_POSTHOG_REQUEST = 0
PRECONSENT_QUEUE = 0
PRECONSENT_REPLAY = 0
```

Eligibility is checked at canonical-event entry and immediately before same-origin `fetch`. No deliberate asynchronous gap may exist between the final check and invocation. Events occurring before consent are dropped and never replayed after consent is granted.

The relay rejects requests missing the bounded eligibility-state fields required by the future schema, but it must not describe a client-provided consent claim as authenticated. A later policy may introduce server-verifiable state only through a separate Privacy/Legal architecture Gate.

## Client Adapter

Product features call a provider-neutral `analyticsClient` with a canonical event. The client adapter owns:

- the first and final eligibility checks;
- exact canonical event/version and property allowlisting;
- ephemeral runtime measurement identity creation after eligibility;
- one same-origin request per event;
- active request AbortControllers only;
- nonfatal local status handling.

The client must not know the PostHog endpoint, project token, `$process_person_profile`, `$geoip_disable`, PostHog response body, or provider-specific error. It does not send inbound browser headers to the relay as event data.

## Same-Origin Relay

The repository uses Next.js App Router API handlers at `app/api/**/route.js`, `Response.json`, and explicit `Cache-Control` response headers. The future repository-consistent route is:

```text
POST /api/analytics/event
app/api/analytics/event/route.js
```

The endpoint accepts one canonical event per request. It rejects every other HTTP method, requires `application/json`, enforces an actual decoded body ceiling of `8192` bytes, performs no caching, and returns only a coarse local status. It never passes through a PostHog response body, token, internal error, or provider metadata.

The request path is synchronous at the application level: validate, project, make one outbound fetch, settle. There is no accepted-work acknowledgment followed by background delivery.

## Server Schema Enforcement

The server does not trust arbitrary Product JavaScript objects. It parses into a new object and validates:

- exact event name and version;
- UUID-shaped `event_id` and ephemeral `measurement_session_id`;
- valid UTC `occurred_at`;
- exact `SESSION_ONLY` identity state;
- bounded locale, provider-region, jurisdiction-state and surface enums;
- event-specific required fields and types;
- bounded integer, boolean, array length and enum values;
- body size and nesting depth;
- absence of unknown properties;
- absence of raw text, URLs/queries, identifiers, provider payloads and token-like values.

Unknown event, version, property, missing required property, invalid type, out-of-range value, oversized body, invalid JSON, or prohibited value causes rejection with `POSTHOG_FORWARD_COUNT = 0`.

The relay constructs a fresh provider payload from validated fields. Object spread from the inbound payload, request headers, cookies, URL, exception, environment, or provider response is prohibited.

## Five-Event Allowlist

Common required canonical fields remain `event_name`, `event_version`, `event_id`, `occurred_at`, `measurement_session_id`, `measurement_identity_state`, `ui_locale`, `content_provider_region`, `legal_jurisdiction_state`, and `surface`. Trusted `release_identity` is optional only when the server can inject or verify it from deployment configuration.

| Event | Version | Required event fields | Optional event fields |
| --- | --- | --- | --- |
| `product_session_started` | `1` | `channel` | none |
| `recommendation_requested` | `1` | `selected_option_count`, `seed_count`, `content_type_values`, `request_mode` | none |
| `recommendation_succeeded` | `1` | `result_count`, `success_class` | coarse `latency_bucket` |
| `recommendation_failed` | `1` | `failure_class` | coarse `latency_bucket` |
| `result_detail_opened` | `1` | `content_type_value`, `result_position_bucket` | none |

`EVENT_ALLOWLIST_COUNT = 5`. Every future event and all PostHog automatic events remain disabled.

## Project Token Boundary

The PostHog project ingestion token exists only in a future server-side environment binding. It is never accepted from the browser, included in a client bundle, exposed through a `NEXT_PUBLIC_*` variable, rendered into HTML, returned by the route, placed in a URL, or copied to logs/evidence.

```text
PROJECT_TOKEN_BROWSER_EXPOSURE = 0
PERSONAL_API_KEY_CLIENT_OR_SERVER_USE = 0
PROJECT_SECRET_API_KEY_CLIENT_USE = 0
CURRENT_PROJECT_TOKEN = NOT_AVAILABLE
```

Even though the Capture project token is a public ingestion-routing token rather than administrator authorization, server isolation is selected to reduce direct provider abuse and improve portability. It is not treated as proof that a relay request represents a real user action.

## Provider Payload

The relay alone constructs:

```json
{
  "api_key": "<server-only-project-token>",
  "event": "<canonical-event-name>",
  "distinct_id": "<ephemeral-measurement-session-id>",
  "timestamp": "<canonical-occurred-at>",
  "properties": {
    "$process_person_profile": false,
    "$geoip_disable": true,
    "event_version": 1,
    "event_id": "<canonical-event-id>",
    "measurement_session_id": "<same-ephemeral-id>",
    "measurement_identity_state": "SESSION_ONLY",
    "ui_locale": "<validated-locale>",
    "content_provider_region": "<validated-region>",
    "legal_jurisdiction_state": "<validated-state>",
    "surface": "<validated-surface>"
  }
}
```

The canonical event name maps to outer `event`; `occurred_at` maps to `timestamp`. Event-specific fields are copied from explicit tables. Provider-only fields are server-injected. `$set`, `$set_once`, `$identify`, `$create_alias`, groups, pageview, replay, survey, heatmap, error and performance events are prohibited.

The outbound server fetch targets only `https://eu.i.posthog.com/i/v0/e/`, uses one JSON POST, fresh headers, no inbound credentials, no redirect acceptance, no queue, no retry, no batch and no delayed delivery.

## Identity

`distinct_id` is a cryptographically random, non-semantic measurement-session ID created in browser memory only after Analytics becomes eligible. It remains stable only within the current loaded runtime and is destroyed on withdrawal or reload.

The relay validates its bounded shape but does not persist it, transform it into a stable server identity, join it to source IP, or associate it with Product guest/account/provider identity. It never generates cross-session linkage or a person profile.

```text
PERSISTENT_ANALYTICS_ID = 0
GUEST_ID_REUSE = 0
ACCOUNT_ID_REUSE = 0
FINGERPRINTING = 0
PERSON_PROFILE = 0
```

## No Queue / No Retry

```text
RELAY_QUEUE = 0
RELAY_RETRY = 0
BACKGROUND_JOB = 0
DURABLE_QUEUE = 0
POSTHOG_RETRY = 0
BATCHING = 0
EVENT_STORAGE = 0
```

The relay performs one immediate outbound attempt. Network, timeout, `429`, `5xx`, abort, provider rejection or malformed provider response is terminal for that event. It does not use `setTimeout`, exponential backoff, online recovery, service workers, cron, workflow, Vercel Queue, database or KV replay.

Measurement loss is classified `TRANSPORT_LOSS_LIMITED`; privacy determinism has priority over Analytics completeness.

## Withdrawal Semantics

Withdrawal changes client eligibility to suppress first, prevents all future relay calls, aborts active browser-to-relay controllers, clears the handle registry and destroys the memory-only measurement ID.

```text
POST_WITHDRAWAL_NEW_DISPATCH = 0
CLIENT_TO_RELAY_ABORT = BEST_EFFORT
SERVER_REQUEST_ALREADY_ACCEPTED = NOT_REVOKED_BY_CLIENT_ABORT
REMOTE_ALREADY_ACCEPTED_EVENT = NOT_REVOKED
```

The future relay should check the incoming request abort signal before provider dispatch and may link it to an outbound AbortController when the supported runtime proves that behavior. This is best-effort only. Once the relay has accepted and forwarded an event, browser abort cannot be described as remote deletion or non-ingestion proof.

There is no pending application queue and no later retry. Returning consent does not replay earlier events.

## Replay / Idempotency

Canonical `event_id` remains a random provider-independent occurrence ID. The relay validates format and preserves it. Because legitimate application retry is zero, repeated identical IDs are anomalous.

An optional small warm-instance memory set may reject recently repeated event IDs as defense in depth, but it is not durable, global, or reliable across serverless instances and must not be represented as complete replay protection.

```text
BASELINE_REPLAY_DEFENSE = SCHEMA_AND_ANOMALY_SIGNAL_ONLY
CROSS_INSTANCE_REPLAY_PREVENTION = NOT_PROVEN
STORAGE_DEPENDENT_INTEGRITY_ENHANCEMENT = DURABLE_DEDUPE / NOT_BASELINE
```

DB/KV/storage is not silently approved. If buyer diligence or abuse evidence later requires durable dedupe, a separate privacy, cost, retention and infrastructure Gate must select it.

## Abuse Controls

Baseline controls that require no persistent identity or paid dependency:

- `POST` only and exact `application/json` media type;
- exact production `Host` and configured `Origin` validation;
- no permissive CORS response;
- `Sec-Fetch-Site`/Fetch Metadata checks as defense in depth only;
- actual `8192`-byte decoded body limit;
- strict depth, array, count and enum bounds;
- exact event/property schema and token-like-value rejection;
- no provider response pass-through;
- security-safe coarse rejection counters without request body logging;
- platform-level request limits only after supported free capability is independently proven.

Origin, Host and Fetch Metadata headers are not unspoofable authentication. In-application IP fingerprinting, persistent rate-limit identity, cookies and device fingerprinting are prohibited. Durable distributed rate limiting is a future infrastructure decision, not hidden baseline functionality.

A short-lived signed measurement grant is not selected for baseline. If issued solely from a client consent claim, arbitrary clients can obtain one and its authenticity gain is limited. It also adds another endpoint and lifecycle. Reconsideration requires a separate decision showing material benefit without persistence or pre-consent network.

## Metric Integrity

The relay creates three distinct evidence classes:

```text
SCHEMA_INTEGRITY = STRONGER_WITH_SERVER_RELAY
PROVIDER_ENDPOINT_ABUSE = STRONGLY_REDUCED
PROVENANCE_INTEGRITY = RELAY_ACCEPTED_AND_SERVER_VALIDATED_ONLY
HUMAN_AUTHENTICITY = NOT_FULLY_PROVEN
```

A PostHog event bearing the hidden project token can be attributed to the relay adapter rather than arbitrary direct browser code, provided token isolation is proven. It shows that the server accepted a valid-shaped canonical event. It does not prove that the underlying action was performed by a unique human, that a public client told the truth, or that bots were absent.

The relay materially improves metric integrity over direct browser ingestion by closing direct provider submission without the token, enforcing schemas server-side and centralizing provider projection. Allowed-event fabrication, replay, automation and volume poisoning remain explicit limitations.

## Buyer/Acquirer Evidence Boundary

Evidence levels are:

1. `UNTRUSTED_CLIENT_ONLY`: direct client/provider event with no server enforcement.
2. `SERVER_SCHEMA_VALIDATED`: exact route schema and property policy passed.
3. `SERVER_PROVENANCE_VALIDATED`: provider event reconciles to the relay-owned projection and protected token path.
4. `ABUSE_LIMITED`: approved rate/anomaly controls and replay limitations have current evidence.
5. `BUYER_DILIGENCE_USABLE_WITH_DISCLOSED_LIMITATIONS`: event definitions/version, relay evidence, volume reconciliation and bot/replay limitations are packaged together.

No current metric reaches these runtime evidence levels because Analytics is not implemented. Future metrics must not be called audited, fraud-proof, bot-free, human-verified, or buyer-grade without the corresponding evidence.

Minimum future external-diligence evidence includes active server relay, exact schema test results, proof that Product code has no direct PostHog endpoint/token, event-volume anomaly monitoring, provider/raw-event reconciliation, preserved metric definitions/version, and explicit bot/replay/source limitations.

## Provider Portability

Browser Product code targets only the MyOTT canonical endpoint/interface. PostHog endpoint, token, anonymous properties, GeoIP control and response semantics live in the server adapter.

```text
PROVIDER_PORTABILITY = BETTER_THAN_DIRECT_PROVIDER_COUPLING
```

A future provider replacement changes the relay adapter, not canonical event names, versions, property meanings, KPI formulas, consent eligibility, identity contract or Product feature code.

## FREE_FIRST Cost

Baseline demand is one existing-hosting function invocation and at most one outbound provider request per eligible event. It requires no new paid service, database, KV, queue, worker, SDK or package.

```text
FREE_FIRST_FIT = PASS_CANDIDATE
NEW_PAID_INFRASTRUCTURE = 0
STORAGE_DEPENDENCY = 0
PAID_DEPENDENCY = 0
```

This is not an unlimited-free guarantee. Current Vercel Hobby allowance and PostHog free terms are time-sensitive and must be freshly checked before activation and Release. Reopen cost disposition when projected or observed eligible-event volume approaches 70% of the then-current monthly function, transfer or provider allowance, or when rate/abuse control requires a paid capability.

## Operational Complexity

The relay is more complex than direct browser capture. It adds an API route, server schema module, server-only environment binding, provider adapter, outbound failure handling, deployment/runtime tests, abuse observation, token rotation procedures, hosting-log privacy review and Security review.

It deliberately avoids a database, KV, queue, retry worker and SDK, keeping the bounded Phase 1 surface small. Operational ownership and failure monitoring remain real costs and must not be hidden behind the provider abstraction.

## Direct-vs-Relay Comparison

| Criterion | Direct browser | Same-origin relay |
| --- | --- | --- |
| Browser raw IP to PostHog | Yes at transport boundary | No intentional forwarding; PostHog sees relay egress |
| Project token exposure | Browser-visible ingestion token | Server-only |
| Direct provider spoofing | Possible with exposed token | Strongly reduced if token isolation holds |
| Property enforcement | Client-only, bypassable | Server final allowlist and reconstruction |
| Withdrawal | No queue/retry; active browser abort best-effort | No queue/retry; future calls stop, accepted server work not retroactively revoked |
| Provider portability | Client knows provider endpoint/fields | Client uses MyOTT canonical endpoint |
| Free-first | Lowest invocation cost | One function invocation per eligible event; no paid storage baseline |
| Operational complexity | Lower | Higher due to route, token, validation, monitoring and Security review |
| Metric integrity | Client-shaped; direct provider abuse possible | Server-schema and relay provenance, but bot/human authenticity unresolved |
| External diligence | `NOT_PROVEN` | Candidate after runtime, abuse and reconciliation evidence |

`SAME_ORIGIN_PRIVACY_RELAY = SELECTED_PHASE_1_TRANSPORT_ARCHITECTURE`.

## Future Implementation Modules

Architecture-only candidate paths:

```text
src/lib/analytics/canonicalEvents.js
src/lib/analytics/eligibility.js
src/lib/analytics/propertyPolicy.js
src/lib/analytics/analyticsClient.js
src/lib/analytics/serverEventSchema.js
src/lib/analytics/providers/posthogRelayAdapter.js
app/api/analytics/event/route.js
```

The Product/client layer owns eligibility and canonical events. The route owns HTTP policy and failure isolation. The server schema owns validation. The provider adapter alone knows PostHog. No code or dependency is authorized here.

## Future Tests

Future implementation acceptance requires independent fixtures for at least:

1. ineligible client makes zero relay calls;
2. unknown jurisdiction makes zero relay calls;
3. denied consent makes zero relay calls;
4. withdrawn state makes zero future relay calls;
5. pre-consent events are never replayed;
6. only the exact five event names pass;
7. unknown event and version are rejected before provider fetch;
8. missing required and unknown properties are rejected;
9. raw text, URL/query and provider payload are rejected;
10. guest/account IDs and token-like content are rejected;
11. oversized body is rejected before provider fetch;
12. wrong method and content type are rejected;
13. wrong/missing Origin, Host and cross-site metadata policy is enforced;
14. spoofable headers are not treated as authentication;
15. project token is absent from client bundle, input and response;
16. server inserts provider-only anonymous/GeoIP fields;
17. inbound forwarding/IP headers never enter outbound headers/body;
18. no queue, retry, delayed job, sendBeacon or unload sender exists;
19. `429`, `5xx`, network and abort failures each produce zero retry;
20. PostHog failure is nonfatal to Product behavior;
21. withdrawal aborts active browser request handles;
22. already accepted server work is not falsely reported revoked;
23. provider URL and response semantics are isolated to server adapter;
24. canonical event name/version/identity and KPI meaning are preserved;
25. ephemeral identity is created only after eligibility and never persisted;
26. duplicate event ID limitation is classified accurately across instances;
27. valid allowed-event fabrication is detected as a residual limitation;
28. no source IP/body/token appears in application logs or evidence;
29. one accepted event creates at most one provider request;
30. route imports have no account, storage, queue or network side effects.

## Future Browser/Network Proof

Separate authorization must prove:

- before eligibility: relay request `0`, PostHog request `0`;
- eligible browser: same-origin `/api/analytics/event` only;
- browser direct PostHog, SDK asset, flags, remote config and automatic event requests `0`;
- relay outbound host/path: exact EU `/i/v0/e/` only;
- one browser event produces at most one provider POST and no retry;
- exact minimized payload and server-injected provider fields;
- raw client forwarding/IP headers absent from outbound request;
- project token absent from browser/network-visible relay input and response;
- cookies and browser persistence `0`;
- withdrawal/navigation/offline/provider-failure behavior;
- safe QA cases for unknown schema, replay and bounded abuse;
- task-owned runtime/profile cleanup and Founder Preview preservation.

Live PostHog event transmission, browser automation and server execution are not authorized in this Task.

## Activation Gate

| # | Relay architecture hard gate | Result |
| --- | --- | --- |
| 1 | No PostHog Browser SDK | PASS |
| 2 | No pre-consent relay request | PASS: client fail-closed Gate |
| 3 | No pre-consent PostHog request | PASS: relay is never invoked |
| 4 | Exact five-event server allowlist | PASS |
| 5 | Server final property/schema enforcement | PASS |
| 6 | Browser project-token exposure zero | PASS: server-only boundary |
| 7 | Raw browser client IP not intentionally forwarded | PASS: fresh outbound header/body allowlist |
| 8 | No persistent Analytics identity | PASS |
| 9 | No guest/account identity reuse | PASS |
| 10 | `$process_person_profile=false` server projection | PASS |
| 11 | GeoIP suppression architecture | PASS: `$geoip_disable=true` plus project-setting proof Gate |
| 12 | No relay queue | PASS |
| 13 | No relay retry | PASS |
| 14 | Withdrawal not overstated | PASS: accepted/remote work explicitly non-revocable |
| 15 | No background/unload delivery | PASS |
| 16 | Analytics failure isolated from Product | PASS |
| 17 | Provider abstraction preserved | PASS |
| 18 | No new paid baseline infrastructure | PASS: baseline adds no paid service; current allowance still requires activation readback |
| 19 | Spoofing materially lower than direct browser | PASS: token isolation and server enforcement; public-relay residual disclosed |
| 20 | Bot/human-authenticity limits disclosed | PASS |

```text
RELAY_ARCHITECTURE_HARD_GATES = 20/20 PASS
RELAY_ACTIVATION_READY = NO
```

Outstanding activation conditions:

1. Account/project creation and EU region require separate Founder authority.
2. Exact server-only token/config handling and rotation require Security review.
3. Exact EU project's IP-discard setting requires independent readback.
4. MyOTT hosting source-IP logs, retention and legal boundaries require review.
5. Current Vercel Hobby function/transfer limits and abuse-control capabilities require fresh readback.
6. Implementation and the 30-case deterministic suite must pass.
7. Isolated browser/network proof must show direct PostHog request zero and one-shot relay behavior.
8. Bounded live ingestion must prove anonymous/no-profile/no-GeoIP and exact property projection.
9. Metric anomaly/reconciliation evidence and bot/replay limitations must exist before external diligence use.
10. Security, Release, Production and Deployment remain separate Gates.

## Decision / Supersession

```text
ANALYTICS_PROVIDER = POSTHOG_CLOUD / SELECTED
POSTHOG_BROWSER_SDK_PHASE_1 = NOT_ELIGIBLE
DIRECT_BROWSER = TECHNICALLY_FEASIBLE / NOT_SELECTED_FOR_PHASE_1
SAME_ORIGIN_PRIVACY_RELAY = PREFERRED / SELECTED_PHASE_1_ARCHITECTURE
PHASE_1_TRANSPORT = MYOTT_SAME_ORIGIN_PRIVACY_RELAY
ANALYTICS_RUNTIME = NOT_IMPLEMENTED
EVENT_SEND = 0
ACTIVATION = NOT_AUTHORIZED
```

`DL-036` supersedes only the current transport-selection meaning of `DL-035`; it does not delete or invalidate the direct path's technical evidence. PostHog Cloud remains the provider. Phase 1 remains session-only, no-SDK, no-queue, no-retry and no persistent identity.

Next handoff: `MYOTT_POSTHOG_ACCOUNT_PROJECT_ACTIVATION_PREPARATION_V1`.
