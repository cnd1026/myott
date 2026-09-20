# PostHog Session-Only Measurement Implementation Architecture

## 1. Authority And Current State

This document is the implementation architecture for
`MYOTT_POSTHOG_SESSION_ONLY_MEASUREMENT_IMPLEMENTATION_ARCHITECTURE_V1`.
It projects the canonical MyOTT measurement contract onto the Founder-selected
provider without authorizing provider activation.

```text
ANALYTICS_PROVIDER = POSTHOG_CLOUD / SELECTED
POSTHOG_DATA_REGION = EU_CLOUD_PREFERRED
SELECTION_SCOPE = PROVIDER_SELECTION_ONLY
MEASUREMENT_PHASE = PHASE_1_SESSION_ONLY
ANALYTICS_RUNTIME = NOT_IMPLEMENTED
POSTHOG_ACCOUNT = NOT_CREATED
POSTHOG_PROJECT = NOT_CREATED
SDK = NOT_INSTALLED
EVENT_SEND = 0
```

The canonical event and KPI meanings remain in
[Growth Measurement Event Taxonomy](GROWTH_MEASUREMENT_EVENT_TAXONOMY.md).
Eligibility remains in
[Privacy Consent Measurement Eligibility Matrix](PRIVACY_CONSENT_MEASUREMENT_ELIGIBILITY_MATRIX.md).
Provider selection evidence remains in
[Free-First Analytics Provider Decision Packet](FREE_FIRST_ANALYTICS_PROVIDER_DECISION_PACKET.md).
Identity separation remains in
[Guest Account Data Continuity Architecture](GUEST_ACCOUNT_DATA_CONTINUITY_ARCHITECTURE.md),
and global Product boundaries remain in
[Public Launch Global-First Architecture](PUBLIC_LAUNCH_GLOBAL_FIRST_ARCHITECTURE.md).
The concise durable decision is recorded in [Decision Log](DECISION_LOG.md),
while repository data handling remains governed by
[Data Policy](../data-policy.md).

## 2. Founder Constraints

- `NO_PRECONSENT_TRANSMISSION = REQUIRED`.
- `NO_PRECONSENT_POSTHOG_SDK_LOAD = REQUIRED`.
- PostHog is a provider projection, not the authority for event names, KPI
  formulas, privacy eligibility, consent, or identity.
- Phase 1 has no persistent Analytics identity and never reuses Product guest,
  account, marketing, device, or continuity identifiers.
- Automatic capture, flags, replay, surveys, heatmaps, error capture,
  performance capture, person profiles, and server-side capture are disabled.
- EU Cloud is a region preference, not a legal-compliance result.
- Free-first remains binding. Paid upgrade and overage authority are absent.

## 3. Official PostHog Evidence Snapshot

`RESEARCH_AS_OF = 2026-09-10 KST`.

| Official source | Relevant current evidence | Architecture consequence |
| --- | --- | --- |
| [JavaScript configuration](https://posthog.com/docs/libraries/js/config) | Browser defaults include automatic capture, pageview capture, persistence, person behavior, and optional remotely controlled features. `disable_persistence`, `advanced_disable_flags`, and the individual capture controls are supported. | Every privacy-relevant option is explicit; vendor defaults are not accepted. |
| [JavaScript usage](https://posthog.com/docs/libraries/js/usage) | `before_send` may return `null` to reject an event. Browser capture is batched by default. | A second fail-closed outbound guard is required and request batching is disabled. |
| [Privacy and data collection](https://posthog.com/docs/privacy/data-collection) | Vendor opt-out normally assumes the SDK is loaded; cookieless collection still transmits data. Opt-out state can use browser storage. | MyOTT resolves eligibility before import and does not use cookieless mode or PostHog storage as consent authority. |
| [Identifying users](https://posthog.com/docs/product-analytics/identify) | The browser SDK normally creates an anonymous distinct ID and can persist it; `identify` links activity to a stable identity. | Phase 1 supplies only a runtime-scoped transport ID and does not expose `identify`. |
| [Official browser package source](https://github.com/PostHog/posthog-js/tree/main/packages/browser) | Upstream `main` observed package version `1.428.10`; capture is enriched before `before_send`; ordinary and retry queues flush on unload. | The observed source is evidence, not a selected dependency. Exact SDK pin and payload tests remain mandatory. |
| [`posthog-core.ts`](https://github.com/PostHog/posthog-js/blob/main/packages/browser/src/posthog-core.ts), [`request-queue.ts`](https://github.com/PostHog/posthog-js/blob/main/packages/browser/src/request-queue.ts), [`retry-queue.ts`](https://github.com/PostHog/posthog-js/blob/main/packages/browser/src/retry-queue.ts) | Current source does not prove a supported public API that discards both queued and retrying capture requests on withdrawal. `shutdown()` flushes rather than discards. | Withdrawal-safe pending-request disposal is an activation blocker. |

Current supported replacements and distinctions:

- Use `advanced_disable_flags: true`; `advanced_disable_feature_flags` does not
  prove that `/flags` is absent.
- Do not use deprecated `advanced_disable_decide`.
- `remote_config_refresh_interval_ms: 0` disables periodic refresh only. It is
  not proof that initial remote configuration or asset requests are absent.
- Use `disable_persistence: true` for the strongest documented no-browser-
  storage boundary. `persistence: "memory"` is only an alternative requiring
  separate proof.
- `cookieless_mode` is prohibited because transmission still occurs.

The exact minimum transport-property set, initial post-init request set,
backend-derived GeoIP behavior, and withdrawal-safe pending-queue disposal are
not proven until a specific SDK version and project are tested.

## 4. No-Preconsent Gate

The dependency direction is strict:

```text
Product facts
  -> resolveAnalyticsEligibility (provider-neutral, synchronous, fail-closed)
  -> only ELIGIBLE may dynamically import the provider module
  -> construct PostHogSessionOnlyAdapter
  -> posthog.init
  -> canonical event projection
```

No top-level PostHog import, snippet, tag-manager loader, eager provider
component, preload, preconnect, or provider endpoint request is permitted.

The resolver accepts only explicit Product-owned facts:

```js
resolveAnalyticsEligibility({
  jurisdictionState,
  consentState,
  analyticsPolicyState,
  runtimeEnvironment,
})
```

It returns exactly one of:

| State | Meaning | SDK import/init/send |
| --- | --- | --- |
| `ELIGIBLE` | policy, jurisdiction, consent, and canonical production runtime all permit Analytics | may proceed |
| `SUPPRESS_UNRESOLVED` | any required fact is missing or unknown | `0 / 0 / 0` |
| `SUPPRESS_DENIED` | consent or policy denies Analytics | `0 / 0 / 0` |
| `SUPPRESS_WITHDRAWN` | consent was withdrawn | `0 / 0 / 0` for new activity |
| `SUPPRESS_UNSUPPORTED` | jurisdiction or policy state is unsupported | `0 / 0 / 0` |
| `SUPPRESS_NON_PRODUCTION` | development, test, QA, preview, or noncanonical runtime | `0 / 0 / 0` |

Unknown enum values and exceptions resolve to suppression. The resolver has no
PostHog dependency and performs no network or storage operation.

```text
INELIGIBLE_OR_UNKNOWN:
SDK_IMPORT = 0
SDK_INIT = 0
POSTHOG_REQUEST_COUNT = 0
EVENT_SEND = 0
```

This intentionally diverges from a vendor pattern that always loads the SDK
with capture opted out. MyOTT requires zero module evaluation and zero PostHog
request before eligibility.

## 5. Session Identity Model

`MEASUREMENT_SESSION = CURRENT_LOADED_PRODUCT_DOCUMENT_OR_APP_RUNTIME`.

After eligibility, MyOTT may generate two independent random values in memory:

- `measurement_session_id`: canonical session-only measurement envelope ID.
- `POSTHOG_EPHEMERAL_TRANSPORT_ID`: provider-required `distinct_id` only.

Both are random, non-semantic, Analytics-purpose-only, and discarded on full
reload. They are never written to cookie, `localStorage`, `sessionStorage`, DB,
URL, log, or Product state. They are never derived from or joined to a guest
continuity ID, account ID, device ID, marketing ID, content ID, IP address, or
fingerprint.

Tabs, reloads, browser restarts, devices, days, guest sessions, and accounts are
not joined. Consequently Phase 1 cannot measure cross-session retention.

`disable_persistence: true` is the required candidate because current official
configuration documentation explicitly disables cookies, session storage, and
local storage. `persistence: "memory"` may be reconsidered only if a pinned SDK
test proves a necessary advantage with an equally strict storage result.

## 6. Safe Configuration Target

The future adapter may initialize only after `ELIGIBLE` and only after an exact
SDK version is approved. The candidate configuration is:

```js
const posthogSessionOnlyConfig = {
  api_host: "https://eu.i.posthog.com",
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  capture_dead_clicks: false,
  rageclick: false,
  capture_exceptions: false,
  capture_heatmaps: false,
  capture_performance: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_web_experiments: true,
  disable_external_dependency_loading: true,
  person_profiles: "never",
  disable_persistence: true,
  advanced_disable_flags: true,
  remote_config_refresh_interval_ms: 0,
  request_batching: false,
  before_send: failClosedPostHogEventGuard,
};
```

No token is defined by this architecture. The project token, exact environment
name, and deployment injection mechanism require later Gates. Possession of a
token never bypasses eligibility.

Explicitly unused: `cookieless_mode`, tracing headers, feature flags, session
replay, surveys, heatmaps, web experiments, exception capture, performance
capture, autocapture, automatic pageview/pageleave, `identify`, aliases, groups,
and person-property APIs.

## 7. Flags And Remote Configuration

`advanced_disable_flags: true` is required because current official docs state
that it completely disables the `/flags` call. Merely disabling feature-flag
evaluation is insufficient.

`remote_config_refresh_interval_ms: 0` disables periodic refresh. Because this
does not prove absence of every initial configuration or asset request, future
Browser/network verification must show the exact post-init request inventory.
Any `/flags`, replay, survey, heatmap, remote script, or configuration request
outside the approved EU ingestion family fails activation.

## 8. Provider Abstraction

The smallest future dependency graph is:

```text
Product feature code
  -> AnalyticsClient
     -> AnalyticsEligibilityGate
     -> CanonicalEventRegistry
     -> AnalyticsPropertyPolicy
     -> AnalyticsProviderAdapter
        -> PostHogSessionOnlyAdapter
```

Product code calls only canonical methods exposed by `AnalyticsClient`.
PostHog-specific symbols are confined to its adapter. The adapter interface
does not expose `identify`, `alias`, groups, person properties, flags, replay,
surveys, registration of long-lived properties, or raw provider capture.

Changing provider must not change event names, versions, formulas, eligible
population, identity, or privacy policy.

## 9. Exact Phase 1 Event Allowlist

Only these events may cross the provider boundary:

1. `product_session_started`
2. `recommendation_requested`
3. `recommendation_succeeded`
4. `recommendation_failed`
5. `result_detail_opened`

All use `event_version = 1` initially. Every future canonical event and every
PostHog automatic event, including `$pageview`, `$pageleave`, `$autocapture`,
dead/rage click, `$exception`, replay, survey, heatmap, and flag events, is
disabled and rejected.

## 10. Canonical Envelope And Property Schemas

Every accepted event has this canonical envelope before provider projection:

| Property | Requirement | Validation |
| --- | --- | --- |
| `event_name` | required | exact five-event allowlist |
| `event_version` | required | integer, exact registered version (`1`) |
| `event_id` | required | fresh random event UUID for idempotency, never identity |
| `occurred_at` | required | valid UTC timestamp generated at canonical emission |
| `measurement_session_id` | required | current in-memory session UUID |
| `measurement_identity_state` | required | exact `SESSION_ONLY` |
| `ui_locale` | required | canonical supported UI locale; no jurisdiction inference |
| `content_provider_region` | required | canonical provider-region value; no locale inference |
| `legal_jurisdiction_state` | required | canonical resolved state supplied by privacy policy |
| `surface` | required | bounded stable Product surface enum |
| `release_identity` | optional | exact release/commit only when runtime evidence is trusted |

The provider projection retains canonical `event_name` and `event_version`.
Provider aliases are dashboard presentation only.

### 10.1 `product_session_started`

- Required event-specific: `channel`.
- Optional event-specific: none.
- Allowed `channel`: bounded canonical channel classification only; values must
  come from the Product registry approved at implementation time.
- Prohibited: full referrer, current URL/query, campaign text, search terms,
  landing-page free text, cross-site IDs.

### 10.2 `recommendation_requested`

- Required event-specific: `selected_option_count`, `seed_count`,
  `content_type_values`, `request_mode`.
- Counts: non-negative bounded integers.
- `content_type_values`: deduplicated canonical values only, never display text.
- `request_mode`: exact canonical enum approved by the Product contract.
- Prohibited: favorite titles, search strings, seed titles/IDs, raw options,
  recommendation prose, provider payload, request body.

### 10.3 `recommendation_succeeded`

- Required event-specific: `result_count`, `success_class`.
- Optional event-specific: `latency_bucket` only when a Product decision uses a
  coarse bounded bucket.
- `result_count`: non-negative bounded integer and usable-result semantics from
  the canonical KPI contract.
- Prohibited: result IDs/titles, rank list, synopsis, recommendation reason,
  score, provider response, exact latency.

### 10.4 `recommendation_failed`

- Required event-specific: `failure_class`.
- Optional event-specific: `latency_bucket` under the same coarse rule.
- Allowed failure classes: `VALIDATION_REJECTED`, `NO_RESULT`,
  `PRODUCT_ERROR`, `PROVIDER_UNAVAILABLE`, `UNKNOWN`.
- Prohibited: stack trace, exception message, raw API body, URL, credentials,
  provider payload, user input, exact latency.

### 10.5 `result_detail_opened`

- Required event-specific: `content_type_value`, `result_position_bucket`.
- `content_type_value`: canonical content type only.
- `result_position_bucket`: bounded aggregate position class defined before
  implementation; exact rank or result ID is prohibited by default.
- Prohibited: content/provider ID, title, cast, director, synopsis, availability,
  recommendation prose, exact position.

For any field whose enum is not already fixed in the canonical taxonomy,
implementation must add a bounded Product registry before transmission. The
adapter must not infer or invent a value.

## 11. Property Policy And Auto-Property Redaction

Layer 1 validates the canonical envelope before calling the provider. Layer 2
validates the enriched PostHog event in `before_send`.

Allowed canonical values are counts, booleans, canonical taxonomy/content-type
values, coarse source/channel, UI locale, provider region, success/failure
class, coarse latency bucket, and stable feature state where explicitly listed.

Always reject raw favorite/search/title text, synopsis, recommendation prose,
provider payload, person names, full URL/query/referrer, email/name/phone,
precise location, raw IP, full user-agent fingerprint, advertising/cross-site
IDs, credentials, auth headers, stack traces, and secret-bearing error values.

Current PostHog enrichment requires a pinned-version payload inventory:

| Class | Policy |
| --- | --- |
| Canonical event properties above | `ALLOW` after schema validation |
| `token`, ephemeral `distinct_id`, `$process_person_profile = false` | `ALLOW` only as transport fields, never canonical Product semantics |
| Proven delivery metadata such as pinned `$lib`, `$lib_version`, insert/timestamp fields | `ALLOW` only after exact SDK/version payload proof |
| URL, path, query, referrer, UTM/campaign, browser/device/OS/language/screen, feature flags, replay/session/window/device IDs, automatic event properties | `DROP_OR_REJECT_BEFORE_SEND` |
| Exact minimum SDK transport set and provider/backend-added GeoIP fields | `NOT_PROVEN` until pinned project/SDK Browser proof |

Unknown Product property means reject the event. Unknown provider-added
property also means reject unless it appears in the exact version-pinned
transport allowlist. The guard must not blindly strip every transport field,
because doing so could create an unreviewed SDK behavior; it uses a tested,
versioned transport schema.

## 12. Before-Send Fail-Closed Guard

Current official usage and source support `before_send` returning `null` to
drop an event before it reaches the request queue. The guard performs:

1. Re-read current in-memory MyOTT eligibility; anything except `ELIGIBLE`
   returns `null`.
2. Reject an event not in the exact five-event registry.
3. Reject an unregistered event version.
4. Reject missing, extra, malformed, or out-of-range canonical properties.
5. Reject prohibited raw text, identity, URL, location, fingerprint, credential,
   secret, stack, or provider payload.
6. Reject unknown provider auto-properties not in the pinned transport schema.
7. Return a newly projected event only after all checks pass.

Sanitizing an unknown event into an allowed event is prohibited. Guard failure
is local suppression, not an Analytics event.

## 13. Consent Authority And Mid-Session Consent

`MYOTT_PRIVACY_CONSENT_STATE` is the sole consent authority. PostHog opt-out
storage is not a consent database. `posthog.opt_out_capturing()` is not the
primary boundary because current official behavior may persist its state in
cookie or local storage.

An event occurring while ineligible is dropped before import/capture and is
never queued or replayed. If consent becomes eligible later in the same runtime,
only future events may transmit. The adapter does not fabricate
`product_session_started` after the actual start. Resulting denominators are
classified `CONSENT_LIMITED`.

## 14. Withdrawal And Pending Queue Blocker

On withdrawal:

1. MyOTT sets in-memory eligibility to `SUPPRESS_WITHDRAWN` synchronously.
2. Every new canonical capture is suppressed.
3. `before_send` suppresses any not-yet-queued event.
4. No persistent identity exists and no event may later be replayed.

This is not sufficient proof for an event already accepted into an SDK queue.
Current upstream source shows an ordinary request queue and a retry queue.
`opt_out_capturing()` does not prove both queues are cleared, and `shutdown()`
flushes queued work on unload rather than discarding it. Setting
`request_batching: false` avoids the normal batch queue but does not by itself
prove that failed requests cannot remain in the retry queue.

Therefore:

```text
WITHDRAWAL_PENDING_QUEUE_SAFETY = NOT_PROVEN / ACTIVATION_BLOCKER
```

Before account/project activation or SDK installation, a pinned-SDK PoC/source
Gate must prove one of:

- a supported public API discards all pending ordinary and retry requests;
- an approved integration mode guarantees no nonessential request remains
  pending after withdrawal; or
- a separately approved provider-adapter transport design owns cancellation
  without bypassing PostHog or MyOTT privacy contracts.

No private SDK field mutation is an acceptable production contract.

## 15. EU Cloud, IP, And Legal Boundary

Future project creation must select EU Cloud before project creation and verify
the EU ingestion host afterward. IP capture/GeoIP controls must be disabled at
the available organization and project levels and verified with actual payload
and provider-setting evidence. The exact behavior is currently
`NOT_PROVEN / PROJECT_NOT_CREATED`.

UI locale, content-provider region, legal jurisdiction, and PostHog data region
remain independent. No precise location is sent.

`EU_CLOUD_PREFERRED` is not GDPR, PIPA, CCPA, or global privacy compliance.
Processor/subprocessor disclosure, cross-border transfer, jurisdiction,
privacy notice, DPA, and retention remain `LEGAL_REVIEW_REQUIRED`.

## 16. Phase 1 Measurability

KPI formulas do not change.

### Session measurable after eligible implementation

- UI Locale Mix.
- Provider Region Mix.
- Successful Recommendation Rate.
- Successful Recommendation Sessions and Session Rate.
- Detail Open Rate.
- Recommendation Repeat Rate.
- Organic Search Sessions/Share only after bounded channel classification is
  implemented and approved.

### Consent-limited session measurable

- The same session metrics for events occurring after eligibility.
- Sessions becoming eligible after start have no reconstructed start event and
  must use an explicit consent-limited denominator.

### Not measurable in Phase 1

- New Visitors and New Visitor Sessions.
- Activation Rate whose canonical denominator requires first-observed identity.
- Returning Guest Rate.
- D1, D7, and D30 retention.
- WAU, MAU, and identity-based WAU/MAU.
- Cross-session retention and repeated exposure.
- Guest-to-account longitudinal conversion.

These are `NOT_MEASURABLE`, never zero.

### Capability not implemented

- Referral/share metrics.
- Save/watch-intent metrics.
- Account conversion.
- Duplicate-avoidance metrics requiring unimplemented history/capability.
- Data-network-effect metrics not proven from sufficiently aggregated input.

## 17. Free-First Usage Safety

The exact five-event allowlist and disabled automatic event families bound event
volume. Before activation, the project must re-read current official free-tier
limits and over-limit behavior, configure a warning threshold below the free
allowance where supported, and define a local kill switch. Reaching a warning
or free-tier boundary suppresses optional Analytics rather than opening paid
authority. Purchase, card entry, paid upgrade, or overage acceptance requires a
new Founder Gate.

## 18. Future EU Project-Creation Checklist

This checklist is not authority to execute:

- Reconfirm official free-tier, retention, and over-limit behavior.
- Create/select EU Cloud before the project is created; verify region afterward.
- Verify ingestion host is the approved EU host.
- Disable and verify IP capture/GeoIP controls.
- Verify autocapture, pageview, pageleave, dead/rage click capture are off.
- Verify replay, surveys, heatmaps, exceptions, performance, web experiments,
  feature flags, remote assets, and external dependency loading are off.
- Verify person profiles are `never`; identify, alias, and groups remain absent.
- Verify the five-event allowlist and volume warning/stop controls.
- Review DPA applicability, privacy notice, processors/subprocessors,
  cross-border transfer, retention, and applicable jurisdictions.
- Record exact project settings without secrets.

## 19. Future Module Architecture

Proposed paths and responsibilities:

- `src/lib/analytics/canonicalEvents.js`: immutable event/version registry and
  per-event canonical schemas.
- `src/lib/analytics/eligibility.js`: provider-neutral fail-closed resolver.
- `src/lib/analytics/propertyPolicy.js`: canonical property validation,
  prohibited-value checks, and redaction/rejection reasons.
- `src/lib/analytics/analyticsClient.js`: Product-facing API; suppression and
  dynamic-provider lifecycle owner.
- `src/lib/analytics/providers/posthogSessionOnly.js`: PostHog import/init,
  transport projection, pinned auto-property schema, and outbound guard.

Dependency direction is one-way from Product to `analyticsClient` to contracts
to the provider adapter. Provider code may not import Product feature modules.
There is no server-side PostHog path in Phase 1.

## 20. Future Deterministic Test Gate

Before any event transmission is approved, tests must prove:

1. Ineligible state does not import the PostHog module.
2. Ineligible state creates zero PostHog requests.
3. Unknown jurisdiction creates zero load and network.
4. Denied consent creates zero load and network.
5. Withdrawal suppresses every future capture.
6. Exactly five event names are accepted.
7. Unknown events are rejected.
8. Unknown properties are rejected.
9. Raw user free text is rejected.
10. Guest/account/marketing IDs are rejected.
11. No PostHog cookie, local storage, or session storage is created.
12. No `/flags` request occurs.
13. No initial or periodic remote configuration request occurs unexpectedly.
14. No pageview, pageleave, or autocapture event occurs.
15. No replay, survey, heatmap, error, or performance event occurs.
16. Person profiles remain `never`.
17. Identify, alias, group, and person-property APIs are unavailable.
18. Only the approved EU ingestion host is contacted after eligibility.
19. Preconsent events are neither queued nor replayed.
20. Mid-session consent does not fabricate prior events.
21. Cross-session metrics remain unavailable.
22. Development, test, QA, preview, and noncanonical runtimes do not transmit.
23. Provider projection preserves canonical event names and versions.
24. The pinned auto-property guard rejects every unapproved property.
25. Withdrawal safely discards or prevents every pending/retry request.

Tests must include known-bad controls and inspect actual browser storage and
network. No expected payload may be generated from implementation internals.

## 21. Future Browser And Network Proof

Use a task-owned isolated browser/profile and an approved local Product runtime.
Before consent, `POSTHOG_REQUEST_COUNT = 0`. After eligible consent, only the
approved EU ingestion request family and exact five-event payloads may appear.

The evidence ledger must separately record SDK/static assets, ingestion,
`/flags`, remote config, replay, surveys, heatmaps, errors/performance, and all
third-party requests. Payload inspection must prove prohibited properties and
identifiers absent. Storage inspection must prove cookies, local storage, and
session storage absent. Withdrawal must be tested with deterministic pending
and retry states, not arbitrary sleep.

This Browser execution is not authorized by this document.

## 22. Legal Review Boundary

Before activation, legal/policy review must determine jurisdiction-specific
consent applicability, processor/subprocessor disclosures, cross-border
transfer, privacy-notice wording, DPA applicability/execution, and retention.
This architecture does not certify GDPR, PIPA, CCPA, or any global regime.

Marketing remains off. Product Analytics consent does not authorize marketing,
account linking, persistent profiling, or Product continuity reuse.

## 23. Implementation Gate

Architecture canonicalization may close now, but runtime activation may not.

```text
ARCHITECTURE = READY
POSTHOG_ACCOUNT_PROJECT_ACTIVATION = BLOCKED
SDK_INSTALLATION = BLOCKED
RUNTIME_INSTRUMENTATION = BLOCKED
EVENT_TRANSMISSION = BLOCKED
BLOCKER = WITHDRAWAL_PENDING_QUEUE_SAFETY_NOT_PROVEN
```

The next task is
`MYOTT_POSTHOG_BROWSER_SDK_WITHDRAWAL_PENDING_QUEUE_PROOF_V1`.
It must pin a candidate SDK version and prove supported cancellation/discard
semantics without account creation, Product instrumentation, or event
transmission to a real project. If that proof fails, a new Founder/Architecture
decision is required; the blocker must not be waived by project settings.

## 24. Non-Goals And Invariance

This document creates no account/project, installs no package, loads no SDK,
sends no event, stores no identifier, modifies no runtime, performs no Browser
run, and changes no Product, Security, Release, Production, Deployment, or
Private Continuity state.
