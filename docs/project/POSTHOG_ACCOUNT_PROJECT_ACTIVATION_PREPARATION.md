# PostHog Account And Project Activation Preparation

## Authority / Current State

- Task: `MYOTT_POSTHOG_ACCOUNT_PROJECT_ACTIVATION_PREPARATION_V1`
- Research snapshot: `2026-09-10 KST`
- Base commit: `2a296b2da28e13686f62d0c02c0e1cb79d81ddd4`
- This document prepares a Founder-controlled, empty PostHog Cloud EU account/project. It does not create or activate either one.
- `ANALYTICS_PROVIDER = POSTHOG_CLOUD / SELECTED`
- `ANALYTICS_RUNTIME = NOT_IMPLEMENTED`
- `POSTHOG_ACCOUNT = NOT_CREATED`
- `POSTHOG_PROJECT = NOT_CREATED`
- `POSTHOG_PROJECT_TOKEN = NOT_CREATED`
- `EVENT_SEND = 0`
- `ACTIVATION = NOT_AUTHORIZED`

The following states remain independent and unchanged:

- `BUILD = BLOCKED / EXACT_LOCAL_DEPENDENCY_GRAPH_NOT_AVAILABLE`
- `SECURITY_RELEASE_GATE = BLOCKED / SAFE_HOLD`
- `INDEXABILITY = HOLD`
- `ENGLISH_RUNTIME = DEFERRED`

## Provider / Transport Selection

- Provider: `POSTHOG_CLOUD / SELECTED`
- Data region target: `EU_CLOUD`
- Phase 1 transport: `MYOTT_SAME_ORIGIN_PRIVACY_RELAY`
- Browser SDK: `NOT_ELIGIBLE_PHASE_1`
- Direct browser transport: `TECHNICALLY_FEASIBLE / NOT_SELECTED`
- Measurement phase: `PHASE_1_SESSION_ONLY`
- Persistent analytics identity: `PROHIBITED`

Account/project creation is infrastructure preparation only. It does not authorize the SDK, relay, consent runtime, Vercel environment changes, or event transmission.

## Official Research Snapshot

| Claim | Current classification | Official evidence | Confidence | Reverify after creation |
| --- | --- | --- | --- | --- |
| Signup exposes US and EU data-region choices | `CONFIRMED_CURRENT` | [PostHog signup](https://app.posthog.com/signup), [PostHog pricing](https://posthog.com/pricing) | High | Yes, capture the selected account region without credentials |
| Cloud EU is hosted in Frankfurt | `CONFIRMED_CURRENT` | [Controlling data storage](https://posthog.com/docs/privacy/data-storage) | High | Yes |
| A new account organization comes with a default project | `CONFIRMED_CURRENT` | [Projects](https://posthog.com/docs/settings/projects) | High | Yes |
| Cross-region project migration is not a free self-service correction | `CONFIRMED_CURRENT` | [Projects](https://posthog.com/docs/settings/projects) | High | No unless migration is contemplated |
| Free plan includes 1M analytics events/month | `CONFIRMED_CURRENT` | [PostHog pricing](https://posthog.com/pricing) | High, time-sensitive | Yes |
| Free plan has no card, is not a trial, includes one project and one-year retention | `CONFIRMED_CURRENT` | [PostHog pricing](https://posthog.com/pricing) | High, time-sensitive | Yes |
| Free-plan usage stops at free limits | `CONFIRMED_CURRENT` | [PostHog pricing](https://posthog.com/pricing) | High, time-sensitive | Yes |
| EU organizations default new projects to IP capture disabled | `CONFIRMED_CURRENT` | [Organizations](https://posthog.com/docs/settings/organizations), [Projects](https://posthog.com/docs/settings/projects) | High | Yes, project override can differ |
| Project IP discard prevents raw IP storage but may still allow pre-discard GeoIP/bot processing | `CONFIRMED_CURRENT` | [Controlling data storage](https://posthog.com/docs/privacy/data-storage) | High | Yes |
| Capture endpoints are public POST endpoints using a project token | `CONFIRMED_CURRENT` | [Capture API](https://posthog.com/docs/api/capture), [API overview](https://posthog.com/docs/api) | High | Yes |
| `$process_person_profile: false` creates anonymous-event processing when the ID has not already been identified | `CONFIRMED_CURRENT` | [Anonymous vs identified events](https://posthog.com/docs/data/anonymous-vs-identified-events), [Capture API](https://posthog.com/docs/api/capture) | High | Yes |
| Vercel variables can be scoped separately to Production, Preview, and Development | `CONFIRMED_CURRENT` | [Vercel environment variables](https://vercel.com/docs/environment-variables) | High | Reverify before environment mutation |
| `NEXT_PUBLIC_` makes a Next.js variable browser-available | `CONFIRMED_CURRENT` | [Vercel framework environment variables](https://vercel.com/docs/environment-variables/framework-environment-variables) | High | No |
| PostHog Cloud can be a data processor and a DPA may be required | `CONFIRMED_CURRENT / LEGAL_REVIEW_REQUIRED` | [PostHog GDPR guidance](https://posthog.com/docs/privacy/gdpr-compliance) | High for provider statement; legal applicability unresolved | Yes |

The `$geoip_disable` provider transformation behavior remains pinned to the previously accepted PostHog source snapshot `4ddca7158b350614e317ae1cba1e46ebcb2bcdd5`, including [`geoip.template.ts`](https://github.com/PostHog/posthog/blob/4ddca7158b350614e317ae1cba1e46ebcb2bcdd5/nodejs/src/cdp/templates/_transformations/geoip/geoip.template.ts). It disables GeoIP enrichment for that event; it is not evidence that the transport source IP was never received or retained. Reverify this property against current provider behavior before the first live event.

Pricing, plan limits, retention, and dashboard controls are provider evidence as of the research date, not immutable Product Canon.

## Account Ownership

- Organization target: `ND Studio` controlled.
- Project target: `MyOTT` (the automatically created default project may be renamed).
- Founder-controlled access and recovery must exist before collaborators are added.
- MFA/2FA should be enabled if the account surface supports it; exact availability and UI are `NOT_PROVEN_WITHOUT_ACCOUNT`.
- Future collaborators use least privilege. No disposable developer-owned account is acceptable.
- Email, password, recovery codes, MFA seeds, and full tokens must never enter repository files or evidence packets.

## EU Region Selection

The region choice appears at signup, and account creation creates an organization with a default project. The Founder must select EU before completing signup and before any event ingestion. Expected provider endpoints are the EU Cloud family, including `https://eu.i.posthog.com` for ingestion.

Cross-region movement is not an acceptable correction plan: PostHog documents same-region moves as self-service, while cross-region moves require Scale or Enterprise and provider engineering support. Therefore:

- `EU_PROJECT_CREATION_PATH = PROVEN`
- EU selection must be checked before account submission.
- The resulting project/instance region must be read back before any token configuration.
- If the UI does not clearly show EU, stop without creating or instrumenting the project.

## Zero-Data Project Creation

PostHog documents automatic creation of a default project with a new organization. Project creation and token issuance are not event capture. The zero-data procedure is therefore feasible when the Founder stops before instrumentation:

1. Create only the Founder-controlled EU account and its default project.
2. Rename the organization/project if offered without enabling a product.
3. Skip or defer every SDK, snippet, wizard, data source, import, test event, and sample-event step.
4. Do not open the Product site with any generated snippet installed.
5. Read back project privacy and plan state only.

Exact onboarding button labels are `NOT_PROVEN_WITHOUT_PROJECT`. If the current onboarding cannot be skipped without sending or importing data, stop and return that blocker. Do not guess a button label and do not send a test event to make onboarding complete.

- `ZERO_EVENT_CREATION = FEASIBLE`
- `TEST_EVENT_SENT = 0` required.
- `EVENT_COUNT_GENERATED_BY_MYOTT = 0` expected.

## Free-First / Billing

Current official pricing states:

- Product Analytics: `1M events/month` free.
- Free plan: `1 project`, `1-year data retention`, unlimited team members, community support.
- `No credit card`, `not a trial`.
- Usage stops at free-tier limits.

These facts are `CONFIRMED_CURRENT` as of `2026-09-10` and must be reverified at manual creation. They do not authorize a card, trial, paid add-on, billing limit increase, or upgrade.

- `FREE_FIRST_CREATION = PASS`
- `POSTHOG_PAID_UPGRADE = NOT_AUTHORIZED`
- `BILLING_METHOD_ENTRY = NOT_AUTHORIZED`
- `AUTO_UPGRADE = NOT_AUTHORIZED`
- `PAID_ADDON = NOT_AUTHORIZED`

If the account flow requires a card, paid plan, auto-renewing trial, or mandatory paid add-on, stop before accepting it.

## Project Setting Inventory

| Control | Classification | Required target/readback |
| --- | --- | --- |
| Data region | `ORG_CREATION_SELECTION / PROJECT_READBACK_REQUIRED` | EU Cloud |
| Organization IP default | `ORG_SETTING` | IP capture disabled |
| Project IP capture | `PROJECT_SETTING` | `Discard client IP data` enabled |
| `$geoip_disable` | `EVENT_PROPERTY_CONTROL` | `true` on every forwarded event, subject to pre-live revalidation |
| Person profile processing | `EVENT_PROPERTY_CONTROL` | `$process_person_profile: false` on every forwarded event |
| Retention | `PLAN/PROJECT_READBACK_REQUIRED` | exact current readback; expected one year on free plan |
| Autocapture | `PROJECT_SETTING + SDK_CONTROL` | no SDK; applicable project control read back and left off |
| Heatmaps | `PROJECT_SETTING + SDK_CONTROL` | off/not configured; exact default `NOT_PROVEN_WITHOUT_PROJECT` |
| Session replay | `PRODUCT/SDK_CONTROL` | off/not configured; exact default `NOT_PROVEN_WITHOUT_PROJECT` |
| Surveys | `PRODUCT_CONTROL` | no survey/runtime; exact default `NOT_PROVEN_WITHOUT_PROJECT` |
| Feature flags | `PRODUCT_CONTROL` | no flags/runtime/request; exact default `NOT_PROVEN_WITHOUT_PROJECT` |
| Automatic pageview/pageleave/error/performance collection | `SDK_ONLY` for the rejected Browser SDK path | no SDK and no collection |
| Authorized domains/cross-domain settings | `NOT_PROVEN_WITHOUT_PROJECT / NOT_REQUIRED_BY_SELECTED_RELAY` | record only if exposed; do not enable |
| Pipelines/integrations/destinations | `NOT_PROVEN_WITHOUT_PROJECT` | none intentionally enabled; read back after creation |

No dashboard toggle is considered verified until the exact project exists and the Founder returns the readback.

## IP / GeoIP

Two controls are required and must not be conflated:

1. The MyOTT relay must not forward raw browser IP or forwarding headers to PostHog. PostHog will see the relay transport's source context, not an intentionally propagated browser address.
2. The PostHog project must enable `Discard client IP data`. Official docs state that this prevents client IP storage on events, while transformations can still use the address before discard.

Every provider payload also targets `$geoip_disable: true` to suppress GeoIP enrichment. This property does not prove raw transport IP disposal, so project-level discard remains mandatory.

- `RAW_BROWSER_CLIENT_IP_FORWARD_TO_POSTHOG = NO`
- `POSTHOG_CLIENT_IP_DATA_POLICY = DISCARD / MINIMIZE`
- `POST_CREATION_READBACK_REQUIRED = YES`

## Anonymous Event / Person Processing

Every event sent by the future relay must include `$process_person_profile: false`. MyOTT must never use `identify`, `alias`, person properties, group identity, or a stable cross-session analytics ID in Phase 1.

PostHog notes that a distinct ID previously used for an identified event is still treated as identified. MyOTT therefore uses only runtime-ephemeral session IDs in a zero-data project and never reuses an identified value.

- `PERSISTENT_ANALYTICS_ID = PROHIBITED`
- `PERSON_PROFILES = NEVER`
- `IDENTIFY = PROHIBITED`

## Token Classification

PostHog describes each project as having a distinct write-only project token. Public capture endpoints use this token but do not treat it as private-API authentication. Private PostHog APIs instead require a personal API key or another supported private authorization mechanism.

- `POSTHOG_PROJECT_TOKEN = INGESTION_ROUTING_TOKEN / WRITE_ONLY_PROJECT_TOKEN`
- `POSTHOG_PROJECT_TOKEN != PERSONAL_API_KEY`
- `POSTHOG_PROJECT_TOKEN != ADMIN_SECRET`
- `POSTHOG_PROJECT_TOKEN_VALIDITY != EVENT_AUTHENTICITY`

The token does not prevent public-client spoofing or prove a human event. The selected relay adds schema and property enforcement, not fraud-proof identity.

## Server-Only Token Handling

MyOTT intentionally keeps the project token server-side even though PostHog's public capture interface can use it client-side. This supports provider isolation, abuse reduction, and metric integrity.

- Future variable: `POSTHOG_PROJECT_TOKEN`.
- Prohibited variable: `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`.
- Prohibited locations: client JavaScript, HTML, URL/query strings, committed docs, screenshots, logs, evidence packets.
- Evidence may state `TOKEN_PRESENT = YES` and `TOKEN_VALUE = REDACTED / NOT_REPORTED` only.
- If a fingerprint is later required, compute a one-way hash locally without persisting plaintext.
- EU ingestion origin is an adapter allowlist constant, not arbitrary request input.

- `TOKEN_SERVER_ONLY_ARCHITECTURE = READY`

## Vercel Environment Boundary

Vercel supports environment-specific variables and exposes Next.js variables prefixed with `NEXT_PUBLIC_` to browser code. Future configuration therefore uses a server-only Secret scoped to Production only.

Required future contract:

- `POSTHOG_PROJECT_TOKEN`: Vercel `Secret`, Production scope only.
- Preview: token absent and analytics fail closed.
- Development/local: token absent and analytics fail closed.
- Runtime also verifies the intended production environment; token presence alone does not authorize capture.
- Any Vercel environment change applies only to a new deployment and needs a separate configuration/release Gate.
- No `vercel env pull`; no token material in `.env*` under this preparation.

No Vercel environment was read or changed in this task.

## Environment Separation

The current free plan documents one project. MyOTT therefore prepares one production-intended project and suppresses all Preview, Development, and QA analytics. It does not assume that three projects are free merely because PostHog generally recommends environment separation.

Environment state is a MyOTT eligibility input, not inferred from the project token. No event may be sent from a preview, local server, Browser QA, or test run.

## Relay Security Preparation

The later relay implementation remains separately gated and must prove:

- POST-only same-origin route.
- JSON content type and a small request-body limit.
- Exact canonical five-event allowlist and exact property schemas.
- Product-owned eligibility and consent checks immediately before dispatch.
- Origin/host checks without trusting arbitrary forwarding headers.
- No raw browser IP forwarding.
- Server-only project token and fixed EU ingestion origin.
- No arbitrary provider payload/host, queue, retry, unload send, or background flush.
- Rate/abuse controls without fingerprinting or persistent analytics identity.

## Abuse / Metric Integrity Boundary

The same-origin relay improves schema integrity, redaction, and provider isolation. It does not prove human authenticity or eliminate same-origin scripted abuse. Initial controls may remain stateless: strict body/schema limits, coarse request controls, anomaly monitoring, and duplicate observation by ephemeral event ID.

- `METRIC_INTEGRITY = LIMITED_BY_PUBLIC_CLIENT_ABUSE`
- No DB, KV, queue, fingerprint, or persistent ID is authorized by this preparation.

## Legal / DPA Boundary

PostHog Cloud EU selection is not a legal compliance certification. PostHog's GDPR guidance describes Cloud as a processor relationship for which a DPA may be required. The following remain separate legal review items:

- Processor and subprocessor disclosure.
- DPA applicability and execution.
- Cross-border transfer implications.
- Privacy-notice language.
- Retention and deletion obligations.
- Jurisdiction applicability, including GDPR, PIPA, and CCPA.
- Hosting-layer receipt of client IP.

`LEGAL_REVIEW_REQUIRED` remains active. No document may claim GDPR, PIPA, CCPA, or global privacy PASS.

## Consent Dependency

`MYOTT_PRIVACY_CONSENT_STATE` remains the authority. PostHog account/project state and any provider consent mechanism are not canonical consent.

Because `CONSENT_RUNTIME = NOT_IMPLEMENTED`, an empty project does not authorize events. Analytics activation requires Product-owned eligibility/consent implementation and all subsequent runtime/network proof Gates.

## Founder Manual Creation Packet

### Safe to do

1. Open the official PostHog signup surface and confirm the destination is PostHog-controlled.
2. Select `EU (Frankfurt)` before submitting account creation.
3. Create the account under Founder/ND Studio control without entering payment details.
4. Confirm the automatically created organization/project is in EU Cloud.
5. Rename the organization to an ND Studio-controlled display name and the project to `MyOTT` if offered.
6. Skip/defer all instrumentation and product onboarding.
7. Read back the plan, region, IP-discard, retention, automatic-product, integration, and token-presence state.
8. Return only non-sensitive evidence using the template below.

### Stop / do not execute

- Do not add a card, start a paid/auto-renewing trial, upgrade, or add a paid product.
- Do not install an SDK, snippet, integration, destination, data source, or package.
- Do not send a test/sample event or import data.
- Do not enable autocapture, replay, surveys, heatmaps, flags, web analytics, error capture, or remote configuration.
- Do not create a personal API key or expose/copy the project token into chat, source, screenshots, logs, or browser config.
- Do not configure Vercel or MyOTT.
- Stop if EU selection is absent/ambiguous, a card is mandatory, or onboarding cannot be deferred without data transmission.

The exact onboarding UI labels are intentionally not prescribed because they are `NOT_PROVEN_WITHOUT_PROJECT` and may change.

## Evidence Receipt Template

```text
ACCOUNT_CREATED = YES / NO
PROJECT_CREATED = YES / NO
EU_REGION_SELECTED = YES / NO
PROJECT_NAME = <non-sensitive display name>
ORG_NAME = <non-sensitive display name>
FREE_PLAN_ACTIVE = YES / NO / NOT_PROVEN
PAYMENT_METHOD_REQUIRED = YES / NO
PAID_TRIAL_OR_ADDON_ACCEPTED = NO
TOKEN_PRESENT = YES / NO
TOKEN_VALUE = REDACTED / NOT_REPORTED
IP_DISCARD_SETTING = <exact readback / NOT_PROVEN>
PERSON_PROFILE_RELEVANT_SETTING = <exact readback / NOT_APPLICABLE>
RETENTION = <exact readback / NOT_PROVEN>
AUTOCAPTURE = <exact readback / NOT_APPLICABLE>
SESSION_REPLAY = <exact readback / NOT_APPLICABLE>
HEATMAPS = <exact readback / NOT_APPLICABLE>
SURVEYS = <exact readback / NOT_APPLICABLE>
FEATURE_FLAGS = <exact readback / NOT_APPLICABLE>
PIPELINES_INTEGRATIONS = <exact readback / NOT_PROVEN>
TEST_EVENT_SENT = 0
SDK_INSTALLED = 0
EVENT_COUNT_GENERATED_BY_MYOTT = 0
SCREENSHOTS_CONTAINING_CREDENTIALS_OR_FULL_TOKEN = 0
```

## Activation Gate

Preparation verdict:

- `EU_PROJECT_CREATION_PATH = PROVEN`
- `FREE_FIRST_CREATION = PASS`
- `ZERO_EVENT_CREATION = FEASIBLE`
- `TOKEN_SERVER_ONLY_ARCHITECTURE = READY`
- `POST_CREATION_PRIVACY_READBACK = DEFINED`
- `ACCOUNT_PROJECT_CREATION_READY = YES`

`YES` authorizes only a future explicit Founder manual account/project creation action under the packet above. It does not authorize instrumentation, environment configuration, runtime implementation, event ingestion, or Analytics activation.

Post-creation progression requires all of the following before any event:

1. EU region and free-plan readback.
2. Project IP-discard and applicable automatic-feature readback.
3. Redacted token-presence receipt.
4. Separate server-secret configuration Gate.
5. Relay implementation and deterministic QA.
6. Product consent/eligibility runtime.
7. Browser/network zero-preconsent proof.
8. Explicitly authorized single live-event proof.
9. Provider readback and separate activation decision.

## Post-Creation Sequence

```text
ACCOUNT_PROJECT_CREATION
-> ZERO_EVENT_SETTINGS_READBACK
-> TOKEN_SERVER_SIDE_CONFIG_GATE
-> SAME_ORIGIN_RELAY_IMPLEMENTATION
-> DETERMINISTIC_QA
-> CONSENT_ELIGIBILITY_RUNTIME
-> BROWSER_NETWORK_PROOF
-> EXPLICIT_SINGLE_LIVE_TEST_EVENT
-> POSTHOG_PROJECT_READBACK
-> ANALYTICS_ACTIVATION_DECISION
```

These stages must not be compressed into account creation.

## Known Unknowns

- Exact current onboarding button labels and whether every wizard surface exposes a skip control: `NOT_PROVEN_WITHOUT_PROJECT`.
- Actual created organization/project region and URL: `POST_CREATION_READBACK_REQUIRED`.
- Actual project override for IP discard: `POST_CREATION_READBACK_REQUIRED`.
- Exact defaults for replay, heatmaps, surveys, flags, pipelines, integrations, and cross-domain controls: `NOT_PROVEN_WITHOUT_PROJECT`.
- Exact free-plan and retention readback at creation time: `POST_CREATION_READBACK_REQUIRED` because pricing is time-sensitive.
- MFA/2FA availability and recovery configuration for the created account: `NOT_PROVEN_WITHOUT_ACCOUNT`.
- DPA, subprocessor, transfer, and jurisdiction obligations: `LEGAL_REVIEW_REQUIRED`.
- The project token value and token existence: `NOT_CREATED / NOT_REPORTED` in this task.
- Current `$geoip_disable` behavior at first live ingestion: pre-live source/provider revalidation required.

None of these unknowns authorizes a test event. The future Founder action must stop if a mandatory zero-data, EU, or free-first condition is contradicted.
