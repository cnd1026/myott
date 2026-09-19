# Free-First Analytics Provider Decision Packet

## Executive Recommendation

- `RESEARCH_AS_OF = 2026-09-10 KST`
- `OFFICIAL_SOURCE_URL_COUNT = 42`
- `OFFICIAL_DOMAINS = vercel.com, cloudflare.com, posthog.com, github.com/PostHog, umami.is, github.com/umami-software, support.google.com, developers.google.com, marketingplatform.google.com, plausible.io`
- `RECOMMENDED_PRIMARY_CANDIDATE = POSTHOG_CLOUD`
- `RECOMMENDED_FALLBACK_CANDIDATE = FIRST_PARTY_MINIMAL_COLLECTOR`
- `FOUNDER_PROVIDER_SELECTION = REQUIRED / NOT_YET_MADE`
- `ANALYTICS_PROVIDER = NOT_SELECTED`
- `ANALYTICS_RUNTIME = NOT_IMPLEMENTED`

PostHog Cloud is the strongest researched managed candidate and can presently satisfy all eight MyOTT hard gates only under a deliberately restrictive configuration: do not load the SDK until measurement is eligible, disable automatic capture and recording, use memory-only or disabled persistence, never identify a person, disable GeoIP enrichment, enforce a property allowlist before send, and send only the five canonical Product events. Its Product Analytics free tier currently covers 1,000,000 events per month.

This is a recommendation, not a provider selection or implementation approval. PostHog's ordinary JavaScript defaults do not meet the MyOTT baseline: autocapture, pageviews, pageleave, durable browser persistence and several optional capture surfaces must be explicitly disabled. PostHog cookieless mode is also excluded because it uses a server-generated identity hash.

The first-party minimal collector is the fallback control because it gives MyOTT exact schema and identity control. It is not currently eligible for implementation: storage, retention cleanup, deletion, backup, query/reporting and security ownership have not been approved, and its real infrastructure cost is not proven.

GA4 is a conditional eligible alternative, not the preferred fallback: Basic Consent Mode can provide no transmission while consent is off, and a zero cookie-expiration setting can constrain the client identifier to the browser session. Its defaults are materially broader, Advanced Consent Mode transmits cookieless pings when consent is denied, and the Google reporting/identity model adds more configuration and migration risk. Vercel and Cloudflare remain potentially useful supporting traffic/performance analytics, but neither supplies the five canonical Product events under the current free baseline. Umami and Plausible use request-derived visitor/session hashes that conflict with the no-fingerprinting/request-hash baseline. Plausible Cloud also requires payment after its trial.

## Current Canonical Constraints

| Constraint | Current contract |
| --- | --- |
| Core events | `product_session_started`, `recommendation_requested`, `recommendation_succeeded`, `recommendation_failed`, `result_detail_opened` |
| Event schema | Canonical MyOTT names and properties remain provider-independent |
| Immediate identity | `SESSION_ONLY` or no persistent Analytics identity |
| Persistent Analytics identity | `NOT_AUTHORIZED` |
| Product continuity identity | Must remain separate from Analytics identity |
| Eligibility off | No SDK load/no send is preferred; no nonessential transmission |
| Pre-consent replay | `PROHIBITED` |
| Raw data | Favorite/search/free text, direct identifiers, precise location, fingerprints, full sensitive URL/query, provider payload and secrets prohibited |
| Autocapture/replay/heatmaps | Off and not required |
| Marketing/advertising identity | Off and not authorized |
| Cost | `FREE_FIRST`; paid baseline remains domain only |
| Longitudinal KPIs | D1/D7/D30 and WAU/MAU remain identity-limited/not measurable until a later Gate |

The constraints come from `GROWTH_MEASUREMENT_EVENT_TAXONOMY.md`, `PRIVACY_CONSENT_MEASUREMENT_ELIGIBILITY_MATRIX.md`, `GUEST_ACCOUNT_DATA_CONTINUITY_ARCHITECTURE.md`, `PUBLIC_LAUNCH_GLOBAL_FIRST_ARCHITECTURE.md`, `SEO_INDEXABILITY_LAUNCH_ARCHITECTURE.md` and `docs/data-policy.md`.

## Research Method / As-of Date

- `RESEARCH_AS_OF = 2026-09-10 KST`
- Sources were limited to official vendor documentation, pricing, privacy/terms, changelog and official GitHub material.
- No account, login, OAuth, trial, payment, contact, SDK installation or event transmission was used.
- Pricing and hosted-plan capabilities are a dated research snapshot, not timeless Product Canon.
- A vendor statement such as "anonymous" was not accepted without examining the documented identity mechanism.
- Missing exact plan limits, retention or supported privacy controls are marked `NOT_PROVEN`.

## Hard Gate Matrix

Legend: `PASS` means an officially supported configuration can meet the gate; `PARTIAL` means material evidence or an approved dependency is missing; `FAIL` means the current service model conflicts with the gate.

| Candidate | H1 suppress before dispatch | H2 no mandatory fingerprint/cross-session identity | H3 five canonical events | H4 exclude raw/direct data | H5 marketing off | H6 continuity ID separate | H7 no backlog/replay | H8 free-first V1 | Current baseline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FIRST_PARTY_MINIMAL_COLLECTOR` | PASS by design | PASS by design | PASS by design | PASS by design | PASS by design | PASS by design | PASS by design | PARTIAL: DB/ops/cost unapproved | PARTIAL |
| `VERCEL_WEB_ANALYTICS` | PASS with gated load | FAIL: incoming-request hash | FAIL: custom events require Pro/Enterprise | PASS with redaction/manual data | PASS | PASS | PASS | FAIL for the required Product event system | NO |
| `CLOUDFLARE_WEB_ANALYTICS` | PASS with gated beacon | PASS: no fingerprinting claim | FAIL: custom events not supported | PASS for its fixed beacon | PASS | PASS | PASS | PASS | NO |
| `POSTHOG_CLOUD` | PASS with no-load-until-eligible and opt-out default | PASS only with memory/disabled persistence and no cookieless mode | PASS | PASS with strict allowlist/`before_send` | PASS | PASS with no identify/person profiles | PASS with no-load gate | PASS: 1M Product Analytics events/month | YES, CONDITIONAL |
| `UMAMI_CLOUD` | PASS with gated script | FAIL: visitor/session hash uses request IP and user agent | PASS | PARTIAL: default payload is broader than MyOTT allowlist | PASS | PASS if identify is unused | PASS | PARTIAL: Hobby free, exact monthly cap not proven | NO |
| `UMAMI_SELF_HOSTED` | PASS with gated script | FAIL: same request-derived session identity | PASS | PARTIAL: same tracker payload boundary | PASS | PASS if identify is unused | PASS | PARTIAL: software is open source; infrastructure/ops cost is not zero or proven | NO |
| `GOOGLE_ANALYTICS_4` | PASS only with Basic Consent Mode/no tag before consent | PASS only with `cookie_expires: 0`, no User-ID and no Advanced-mode pings | PASS | PASS with explicit custom events and prohibited-property controls | PASS only with advertising features/signals off | PASS with no Product continuity/User-ID mapping | PASS only in Basic mode | PASS: Standard service is no-charge | YES, CONDITIONAL |
| `PLAUSIBLE_CLOUD` | PASS with gated script | FAIL: daily identifier derives from IP and user agent | PASS; custom properties require Business | PASS with explicit events | PASS | PASS | PASS | FAIL: paid after 30-day trial | NO |

### Exact gate failures

- Vercel fails H2 and H3: it hashes request information for visitor identity, and free Hobby does not provide custom events.
- Cloudflare fails H3: its current Web Analytics FAQ says custom events are not yet supported.
- Umami Cloud and Self-hosted fail H2: the implementation's visitor/session mechanism derives a hash from website/host, IP and user agent even though the product describes this as privacy-preserving and non-fingerprinting.
- GA4 passes only conditionally: Basic Consent Mode must block the tag while ineligible; `cookie_expires: 0` must constrain the client cookie to the browser session; User-ID, Google signals, advertising features and Advanced-mode denied-state pings remain off. The ordinary two-year cookie default is not acceptable.
- Plausible fails H2 and H8: it uses a daily IP/user-agent-derived identifier and has no permanent free cloud plan.
- First-party remains `PARTIAL`, not `PASS`, because its persistence and operating model is not approved or costed.

## Provider Comparison Matrix

| Candidate | Free fit | Five-event fit | Privacy fit | Suppression | Identity model | Data/export | Operational burden | Commercial trigger | Evidence confidence | Decision class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| First-party minimal | Vendor fee can be zero; total cost not proven | Exact by design | Exact by design | Server/client Gate owned by MyOTT | None/session-only by design | Exact schema; reporting must be built | Highest | Storage/security/operations approval | High for design, low for cost/ops | `RECOMMENDED_FALLBACK_CANDIDATE` |
| Vercel Web Analytics | Hobby includes 50K events, but not custom Product events | No on Hobby | Request-hash conflict | Gated load possible | Request hash, 24-hour session | Panel CSV limited; aggregate API; raw streams via Drains | Low | Pro/Enterprise for custom events | High | `NOT_ELIGIBLE_CURRENT_BASELINE` |
| Cloudflare Web Analytics | Free | No custom events | Strong fixed-beacon privacy posture | Gated beacon possible | No fingerprinting claimed | Dashboard/API sampled after seven-day unsampled window | Low | Reopen if custom events ship | High | `NOT_ELIGIBLE_CURRENT_BASELINE` |
| PostHog Cloud | 1M Product Analytics events/month | Yes | Fits only with strict non-default configuration | No-load + opt-out default + explicit opt-in | Memory/session-only possible; cookieless hash excluded | Query/API available; exact free retention remains `NOT_PROVEN` | Medium | Usage beyond free allowance or later paid capability | Medium-high | `RECOMMENDED_PRIMARY_CANDIDATE` |
| Umami Cloud | Hobby free; exact cap `NOT_PROVEN` | Yes | Request-derived session hash conflicts | Gated script possible | Request hash; optional distinct ID | CSV export and REST API | Low-medium | Free cap/paid threshold must be re-proven | Medium-high | `NOT_ELIGIBLE_CURRENT_BASELINE` |
| Umami Self-hosted | License cost low/free; infra not free by assumption | Yes | Same session-hash conflict | Gated script possible | Request hash; optional distinct ID | Full DB/API control | High: PostgreSQL, backup, updates, security | Hosting/database/ops | Medium-high | `NOT_ELIGIBLE_CURRENT_BASELINE` |
| GA4 | Standard service no-charge | Yes | Conditional session-only fit, with broader defaults | Basic mode can suppress all; Advanced sends pings | Session-only client ID possible with zero expiry; no User-ID | UI/Data API; BigQuery export with separate cost exposure | Medium-high | BigQuery/360 or changed identity policy | High | `ELIGIBLE_BUT_NOT_PREFERRED` |
| Plausible Cloud | No permanent free plan | Yes; properties require Business | Daily request-derived identifier conflicts | Gated script possible | Daily IP/UA-derived identifier | Aggregate CSV; Stats API Business; raw export Enterprise | Low | Payment after trial | High | `PAID_FUTURE_BENCHMARK` |

## Cost Matrix

The scenarios below are event-volume comparisons, not forecasts. `Included` means the cited current plan allowance covers the scenario; it does not override hard-gate failure.

| Candidate | 10K | 50K | 100K | 500K | 1M | What counts / paid trigger |
| --- | --- | --- | --- | --- | --- | --- |
| First-party minimal | `NOT_PROVEN` | `NOT_PROVEN` | `NOT_PROVEN` | `NOT_PROVEN` | `NOT_PROVEN` | Vendor fee may be zero, but storage, queries, retention, backup and operations are not costed |
| Vercel Hobby | Included for pageview events | Included for pageview events | Above included Hobby allowance | Above included Hobby allowance | Above included Hobby allowance | 50K events/month; required custom Product events are Pro/Enterprise-only, so these are not V1 capability costs |
| Cloudflare Web Analytics | Free but incapable | Free but incapable | Free but incapable | Free but incapable | Free but incapable | Web Analytics is free; custom Product events are unavailable |
| PostHog Cloud | Included | Included | Included | Included | Included | First 1M Product Analytics events/month free; subsequent usage currently starts at `$0.00005/event` |
| Umami Cloud Hobby | Free plan exists; cap `NOT_PROVEN` | `NOT_PROVEN` | `NOT_PROVEN` | `NOT_PROVEN` | `NOT_PROVEN` | Website hit, custom event and every stored event-data property each count as an event |
| Umami Self-hosted | Infra-dependent | Infra-dependent | Infra-dependent | Infra-dependent | Infra-dependent | PostgreSQL, hosting, backup, availability and patching costs are owner-dependent |
| GA4 Standard | No-charge service | No-charge service | No-charge service | No-charge service | No-charge service | Product limits apply; BigQuery storage/query can create separate cost |
| Plausible Cloud | Paid after trial | Paid after trial | Paid after trial | Paid after trial | Paid after trial | Exact current plan price for each scenario is `NOT_PROVEN`; 30-day trial is not a free baseline |

## Privacy / Identity Matrix

| Candidate | Default identity/capture | Disable-able/acceptable mode | MyOTT prohibited-data control |
| --- | --- | --- | --- |
| First-party minimal | None until designed | Exact session-only aggregate design | Server schema allowlist; reject unknown properties |
| Vercel | Request-hash visitor, automatic pageviews; URL/referrer/device/coarse geo | `beforeSend` can redact, but hash is intrinsic | Partial; H2 remains failed |
| Cloudflare | Fixed pageview/RUM beacon; browser/device/country/referrer metrics | No cookies/local storage/fingerprint claimed | Fixed collection, not five-event Product schema |
| PostHog | Autocapture/pageview/pageleave and durable cookie+localStorage defaults | Explicit manual capture, `persistence: memory` or `disable_persistence`, `person_profiles: never`, recording off | `before_send`, property denylist and a MyOTT-owned allowlist; do not use identify or cookieless mode |
| Umami | Automatic pageviews and default hostname/language/referrer/screen/title/url; request-derived session hash | Auto pageview/auto track can be disabled; custom payload possible | Partial; request hash remains mandatory for normal session/visitor behavior |
| GA4 | `_ga` client ID defaults to two years; default collection includes approximate geo/device data | Basic consent no-load/no-send, `cookie_expires: 0`, no User-ID/signals/ads, custom-only events | Explicit parameter policy and granular data controls required |
| Plausible | No cookie, but daily IP/UA-derived identifier | Event script can be gated | Custom event control; identity mechanism remains incompatible |

No vendor receives raw favorite-work text, raw search/free text, names, email, phone, precise location, full sensitive URL/query, provider payload, auth data or secrets under this packet. No collection was enabled.

## Event Capability Matrix

| Candidate | Canonical names | Version/boolean/count/taxonomy properties | Limits/material caveats | API/export |
| --- | --- | --- | --- | --- |
| First-party minimal | Exact | Exact by design | Requires storage/schema implementation | Must be built |
| Vercel Hobby | No custom events | Not available | Custom data max 255 chars on paid custom events; scalar values | Aggregate API; limited CSV; raw stream via Drains |
| Cloudflare | No | No | Pageview/RUM only; custom events not supported | Sampled dashboard/API after short raw window |
| PostHog | Yes | Yes | Enforce MyOTT's smaller allowlist rather than vendor maximums | Product queries/API available; raw/export retention terms need selection-time confirmation |
| Umami Cloud/Self-hosted | Yes | Yes | Name max 50; strings max 500; objects max 50 properties; cloud billing counts properties separately | REST API; Cloud CSV export; self-host DB access |
| GA4 | Yes | Yes | Event name under 40 characters; 25 parameters/event; Standard custom-dimension limits | Reports/Data API; BigQuery event export |
| Plausible | Yes | Properties on Business | Custom properties are not in base paid tier | Aggregate CSV; Stats API Business; raw export Enterprise |

All five MyOTT event names fit the documented name limits where custom events are supported. Vendor dashboards do not replace the canonical 30 KPI definitions.

## Consent Suppression Matrix

| Candidate | Eligibility-off behavior required by MyOTT | Classification |
| --- | --- | --- |
| First-party minimal | Do not invoke client/server dispatch | `NO_TRANSMISSION`, design-controlled |
| Vercel | Do not load/initialize until eligible | `NO_TRANSMISSION` possible, but other gates fail |
| Cloudflare | Do not load beacon until eligible | `NO_TRANSMISSION` possible, but H3 fails |
| PostHog | Do not load before eligible; initialize opted out; explicit opt-in only after eligibility; never queue/replay preconsent events | `NO_TRANSMISSION` possible, conditional |
| Umami | Do not load tracker before eligible; disable automatic pageview/track | `NO_TRANSMISSION` possible, but H2 fails |
| GA4 Basic | Block tags until consent interaction | `NO_TRANSMISSION` |
| GA4 Advanced | Tags load and denied-state cookieless pings are sent | `COOKIELESS_TRANSMISSION`, rejected |
| Plausible | Do not load script before eligible | `NO_TRANSMISSION` possible, but H2/H8 fail |

## Data Control / Region / Retention Matrix

| Candidate | Region | Retention/deletion | Export/control | Confidence |
| --- | --- | --- | --- | --- |
| First-party minimal | Owner-selected, not implemented | Must be designed and operated | Highest schema portability | High on design; low on operations/cost |
| Vercel | Platform processing; exact selectable analytics region `NOT_PROVEN` | Session hash discarded after 24h; reporting retention not fully proven | Aggregate API/CSV/Drains by plan | Medium |
| Cloudflare | Global service; selectable analytics region `NOT_PROVEN` | Unsampled data seven days, approximate aggregate retained; six months accessible | Dashboard/API | High for cited behavior |
| PostHog Cloud | US Virginia or EU Frankfurt | Exact free-plan event retention/deletion SLA `NOT_PROVEN` in this snapshot | Query/API; DPA/subprocessor materials available | Medium-high |
| Umami Cloud | US or EU | Exact Hobby retention `NOT_PROVEN` | Full CSV export and REST API | High except retention/limit |
| Umami Self-hosted | Owner-selected | Indefinite until manual deletion by default | PostgreSQL/API; highest direct control | High |
| GA4 | Global Google service; property-level region selection `NOT_PROVEN` | Standard event/user data retention up to 14 months | UI, Data API, BigQuery export | High |
| Plausible Cloud | Official privacy/security materials; exact selectable region `NOT_PROVEN` here | Contract/plan dependent | Aggregate CSV, paid APIs/raw export | Medium |

These are vendor capabilities, not a declaration of GDPR, PIPA or CCPA compliance for MyOTT. Jurisdiction-specific legal review remains separate.

## Weighted Ranking

Only hard-gate-passing candidates receive a full score. Raw scores are 0-5; weighted points sum to 100.

| Eligible candidate | Privacy 25 | Event/KPI 20 | Free 15 | Data/export 10 | Ops 10 | Region/retention 10 | Extensibility 10 | Weighted total | Confidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| PostHog Cloud, strict profile | 4.0 | 5.0 | 5.0 | 4.0 | 3.5 | 3.5 | 5.0 | 87/100 | Medium-high |
| GA4, Basic/session-only strict profile | 3.0 | 4.5 | 5.0 | 3.5 | 3.0 | 3.5 | 4.5 | 74/100 | Medium-high |

First-party is excluded from numeric ranking because H8 and its infrastructure/operations are not proven. Every other managed candidate fails at least one absolute privacy, event or free-first gate.

## Primary Candidate

`POSTHOG_CLOUD / RECOMMENDED_PRIMARY_CANDIDATE`

Why it leads:

- All five canonical Product events and their explicit properties can be captured.
- Product Analytics has a 1M-event monthly free allowance.
- No-load-before-eligibility, opt-out-by-default, manual capture, memory/disabled persistence, person-profile suppression and before-send rejection are supported controls.
- US and EU Cloud endpoints are available.
- Event query/export surfaces preserve migration options better than pageview-only systems.

Non-negotiable selection conditions:

- Do not use PostHog's recommended defaults without an audited explicit config.
- Do not use cookieless mode, `identify`, persistent storage, session replay, heatmaps, autocapture, pageviews, pageleave, rage/dead-click capture, surveys, flags, error capture or performance capture in V1.
- Disable GeoIP enrichment for every event and reject any enriched location property outside the canonical allowlist.
- Load nothing and send nothing while eligibility is unknown/off; do not replay suppressed events.
- Permit only the five canonical names and a versioned property allowlist. Reject unknown properties before transport.
- Do not map Product continuity identity into PostHog identity.
- Re-verify exact retention/deletion/export terms, region choice and current pricing at Founder selection/implementation Gate.

## Fallback Candidate

`FIRST_PARTY_MINIMAL_COLLECTOR / RECOMMENDED_FALLBACK_CANDIDATE`

This fallback maximizes schema, identity, retention and migration control. It is deliberately not labeled immediately implementable. Before it can pass, a separate architecture task must choose and cost storage, define aggregate/session-only identifiers, retention deletion, backup, access control, abuse protection, reporting and operational ownership. Current DB implementation is not approved.

## Rejected / Deferred Candidates

- `VERCEL_WEB_ANALYTICS`: rejected as primary because Hobby lacks custom Product events and visitor identity uses an incoming-request hash. It may later support traffic analytics if separately authorized.
- `CLOUDFLARE_WEB_ANALYTICS`: rejected as primary because custom events are not supported. It may later support pageview/performance analytics.
- `UMAMI_CLOUD`: rejected under the no-request-hash identity rule; exact current Hobby event cap is also not proven.
- `UMAMI_SELF_HOSTED`: rejected for the same identity mechanism plus disproportionate PostgreSQL/backup/security/availability burden.
- `GOOGLE_ANALYTICS_4`: eligible but not preferred. Only Basic Consent Mode plus a session-expiring client cookie, custom-only event collection, advertising/signals off and no User-ID can fit; Advanced mode is not acceptable.
- `PLAUSIBLE_CLOUD`: retained only as a privacy-oriented paid benchmark; request-derived daily identity and immediate post-trial payment conflict with current gates.

## Implementation Shape Preview

No implementation is authorized by this packet.

### PostHog Cloud, conditional shape

1. A provider-neutral MyOTT analytics adapter owns the canonical five event names and property schema.
2. A privacy eligibility resolver runs before any SDK import or network initialization.
3. Eligible sessions initialize one explicit strict profile: memory/disabled persistence, person profiles never, every automatic capture/recording surface off, and no cookieless mode.
4. A property allowlist serializes only canonical booleans/counts/taxonomy, `ui_locale`, approved coarse provider region/source and release identity. Unknown fields are rejected.
5. The adapter never calls `identify`; Product continuity and account identifiers are never passed.
6. Revocation disables capture and clears in-memory state; no earlier suppressed event is replayed.
7. A build/package/config change, privacy evidence, provider project/region choice and network QA would each require a separate approved implementation Task.

### GA4, conditional second-place shape

1. A consent controller applies Basic Consent Mode and prevents tag loading until measurement is eligible; Advanced Consent Mode is prohibited.
2. Configuration sets `cookie_expires: 0`, does not set User-ID, and keeps Google signals, ads personalization, advertising destinations and enhanced measurement off.
3. The same provider-neutral MyOTT adapter maps only the canonical five names and approved parameters.
4. URL/query, user-provided text, direct identifiers and granular location/device fields are excluded or disabled before transport.
5. Revocation prevents future transmission and does not replay suppressed events.
6. Exact data settings, session-cookie behavior, export limits and advertising isolation require focused evidence before any installation.

The first-party fallback receives no implementation sketch because it has not passed H8. Its next eligible action would be a docs-only architecture task proving storage and operating cost, schema enforcement, retention/deletion, backup, security, reporting and shutdown controls.

## Migration / Exit Strategy

- `LOCK_IN_RISK = MEDIUM` for PostHog-specific configuration and query surfaces; low for event naming if the adapter boundary is maintained.
- `EXPORT_PATH = PostHog query/API/export capability; exact free-plan raw export and retention must be re-verified at selection time.`
- `MIGRATION_DIFFICULTY = LOW_TO_MEDIUM` if Product code emits only canonical MyOTT envelopes through a provider-neutral adapter.
- Canonical event names, event versions, prohibited-property rules and 30 KPI formulas remain MyOTT-owned.
- Provider-generated identity, autocapture event names, person profiles and dashboard-defined KPI semantics must not enter Product contracts.
- A future provider change replaces only the adapter/transport and any external reporting layer, not Product event meaning.

## Unknowns / Legal Review

- PostHog exact free-plan retention, deletion/export entitlements, selected US/EU processing implications and current DPA/subprocessor review remain selection-time requirements.
- Umami Cloud's exact current Hobby event limit and retention are not published in the official static material reviewed here.
- Vercel's exact Web Analytics reporting retention and region selection are not fully proven in this snapshot.
- GA4's legal/operational fit for MyOTT is not established by Google product claims.
- No provider has been certified here for GDPR, PIPA, CCPA or any launch jurisdiction.
- Commercial-use plan consequences must be rechecked when MyOTT moves beyond the current noncommercial beta direction.

## Founder Decision

1. Approve PostHog Cloud as the selected provider candidate for a separate, non-executing implementation architecture Gate under the strict profile above, or hold selection?
2. If PostHog is selected, choose the proposed data region for legal review: EU Cloud or US Cloud?
3. If PostHog is held, authorize only a first-party minimal collector architecture/cost proof, with no DB or runtime implementation?

`FOUNDER_PROVIDER_SELECTION = REQUIRED / NOT_YET_MADE`

## Sources

All sources were accessed on `2026-09-10`. Confidence reflects whether the cited page directly states the material claim.

| Provider | Official source | Source type | Relevant claim | Confidence |
| --- | --- | --- | --- | --- |
| Vercel | https://vercel.com/docs/analytics/custom-events | Docs | Custom events require Pro/Enterprise; custom-data constraints | High |
| Vercel | https://vercel.com/docs/analytics/privacy-policy | Privacy docs | Request-hash visitor model, 24-hour session, collected fields, redaction hook | High |
| Vercel | https://vercel.com/docs/analytics/using-web-analytics | Docs | Web Analytics reporting and CSV behavior | High |
| Vercel | https://vercel.com/changelog/web-analytics-api | Changelog | Aggregate API and raw-event Drains distinction | High |
| Vercel | https://vercel.com/changelog/up-to-80-pricing-reduction-for-web-analytics | Changelog/pricing | Hobby 50K and Product pricing snapshot | High |
| Cloudflare | https://developers.cloudflare.com/web-analytics/faq/ | Docs/FAQ | No custom events, retention/sampling, SPA and query behavior | High |
| Cloudflare | https://developers.cloudflare.com/use-cases/performance/monitoring/ | Docs | Free, cookie-free Web Analytics and Core Web Vitals | High |
| Cloudflare | https://blog.cloudflare.com/web-analytics-vitals-explorer/ | Official blog | No cookies/local storage/fingerprinting posture | Medium-high |
| PostHog | https://posthog.com/ | Official product/pricing page | Product Analytics 1M free monthly events and overage rate | High |
| PostHog | https://posthog.com/docs/libraries/js/config | SDK docs | Capture defaults, persistence, cookieless hash, opt-out, `before_send`, person profiles | High |
| PostHog | https://posthog.com/docs/privacy/data-collection | Privacy docs | Collection opt-in/opt-out controls | High |
| PostHog | https://posthog.com/docs/product-analytics/capture-events | Product docs | Custom events and property capture | High |
| PostHog | https://posthog.com/docs/data/anonymous-vs-identified-events | Identity docs | Anonymous/identified event and identity behavior | High |
| PostHog | https://posthog.com/docs/product-analytics/surfaces/api | API docs | Query/API access | Medium-high |
| PostHog | https://github.com/PostHog/posthog-plugin-geoip | Official GitHub | Per-event `$geoip_disable` enrichment control | High |
| PostHog | https://trust.posthog.com/ | Trust center | DPA, subprocessors and security review surfaces | Medium-high |
| Umami | https://docs.umami.is/docs | Docs | Cloud/self-host, custom events, API and privacy claims | High |
| Umami | https://docs.umami.is/docs/tracker-functions | Tracker docs | Automatic payload, custom events/data and optional identify | High |
| Umami | https://docs.umami.is/docs/cloud/faq | Cloud FAQ | Hobby free, usage accounting, US/EU servers and export | High |
| Umami | https://docs.umami.is/docs/cloud/export-data | Cloud docs | CSV export scope | High |
| Umami | https://docs.umami.is/docs/faq | Docs/FAQ | PostgreSQL and self-hosted retention | High |
| Umami | https://docs.umami.is/docs/api/events | API docs | Event/property API access | High |
| Umami | https://github.com/umami-software/umami/discussions/2106 | Official GitHub maintainer evidence | Visitor/session hash inputs include website/host, IP and user agent | Medium-high |
| Google | https://support.google.com/analytics/answer/10000067?hl=en | Consent docs | Basic no-send versus Advanced cookieless-ping behavior | High |
| Google | https://support.google.com/analytics/answer/11593727?hl=en | Collection docs | `_ga` client ID and default geo/device collection | High |
| Google | https://support.google.com/analytics/answer/11397207?hl=en | Cookie docs | Default two-year user/session cookies | High |
| Google | https://developers.google.com/analytics/devguides/collection/ga4/reference/config | Configuration docs | `cookie_expires: 0` session-cookie behavior | High |
| Google | https://support.google.com/analytics/answer/12229021?hl=en | Event docs | Custom-event naming and parameter limits | High |
| Google | https://support.google.com/analytics/answer/14240153?hl=en | Limits docs | Standard custom dimensions/metrics | High |
| Google | https://support.google.com/analytics/answer/12229528?hl=en | Retention docs | Standard retention controls | High |
| Google | https://marketingplatform.google.com/about/analytics/terms/us/ | Terms | Standard Analytics service offered without charge | High |
| Google | https://support.google.com/analytics/answer/9358801 | Export docs | BigQuery export and separate resource implications | High |
| Google | https://support.google.com/analytics/answer/9317657 | Export docs | UI/Data API export surfaces | High |
| Plausible | https://plausible.io/docs/register-account | Account docs | 30-day trial | High |
| Plausible | https://plausible.io/docs/trial-to-paid | Billing docs | Trial-to-paid lifecycle | High |
| Plausible | https://plausible.io/terms | Terms | Payment required after trial | High |
| Plausible | https://plausible.io/docs/custom-event-goals | Event docs | Custom events and billable event counting | High |
| Plausible | https://plausible.io/docs/custom-props/introduction | Product docs | Custom properties require Business | High |
| Plausible | https://plausible.io/docs/events-api | API docs | User-agent/IP inputs used for visitor calculation | High |
| Plausible | https://plausible.io/security | Security/privacy | Daily rotating IP/user-agent-derived identifier | High |
| Plausible | https://plausible.io/docs/export-stats | Export docs | Aggregate CSV and raw export plan boundary | High |
| Plausible | https://plausible.io/docs/stats-api | API docs | Stats API Business-plan boundary | High |

## Current Product State And Invariance

- `ANALYTICS_PROVIDER = NOT_SELECTED`
- `ANALYTICS_RUNTIME = NOT_IMPLEMENTED`
- `CURRENT_ANALYTICS_IDENTITY = NONE`
- `PERSISTENT_ANALYTICS_IDENTITY = NOT_AUTHORIZED`
- `MARKETING_TRACKING = OFF / NOT_AUTHORIZED`
- `PRECONSENT_EVENT_REPLAY = PROHIBITED`
- `PRIVATE_CONTINUITY_WRITE = 0`
- No SDK, package, cookie, storage, DB, auth, event send, Vercel setting, Product runtime, Security, Main, Release, Production or Deployment mutation was performed.
