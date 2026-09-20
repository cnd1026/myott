# Growth Measurement Event Taxonomy

Status: PRODUCT MEASUREMENT CONTRACT / NO ANALYTICS IMPLEMENTATION

Task: `MYOTT_GROWTH_MEASUREMENT_EVENT_TAXONOMY_V1`

## 1. Authority And Current State

이 문서는 [Public Launch Global-First Architecture](PUBLIC_LAUNCH_GLOBAL_FIRST_ARCHITECTURE.md)의 acquisition-to-data-network-effect funnel을 측정 가능한 Product contract로 구체화합니다. Identity, consent와 retention은 [Guest Account Data Continuity Architecture](GUEST_ACCOUNT_DATA_CONTINUITY_ARCHITECTURE.md)를 따르고 organic search 의미는 [SEO Indexability Launch Architecture](SEO_INDEXABILITY_LAUNCH_ARCHITECTURE.md)를 따릅니다.

```text
CURRENT_ANALYTICS_IMPLEMENTATION = NONE / NOT_IMPLEMENTED
ANALYTICS_PROVIDER = NOT_SELECTED
CURRENT_ACTUAL_GROWTH_METRICS = NOT_COLLECTED / NOT_ASSERTED
D1_D7_D30_ACTUAL = NOT_AVAILABLE
WAU_MAU_ACTUAL = NOT_AVAILABLE
MEASUREMENT_IMPLEMENTATION = DEFERRED / PRIVACY_AND_CONSENT_GATE_REQUIRED
```

QA case counts, test passes, Browser receipts와 repository activity는 Growth metric이 아닙니다. 이 contract는 event emitter, SDK, identity, storage, cookie, database, consent UI 또는 dashboard를 구현하지 않습니다.

## 2. Funnel And Measurement Layers

```text
ACQUISITION
-> ACTIVATION
-> RETENTION
-> REFERRAL
-> DATA_NETWORK_EFFECT
```

| Funnel | Decision question | Measurement boundary |
| --- | --- | --- |
| `ACQUISITION` | 어떤 privacy-safe channel과 locale에서 eligible session이 시작되는가 | arbitrary full referrer 또는 cross-site identity 불필요 |
| `ACTIVATION` | first eligible session이 실제 usable recommendation value에 도달하는가 | button click을 success로 간주하지 않음 |
| `RETENTION` | 승인된 continuity identity가 다시 value를 얻는가 | cross-session identity 미승인 시 retention은 측정 불가 |
| `REFERRAL` | user-invoked share/referral이 landing과 activation으로 이어지는가 | completion proof와 opaque bounded referral identity 필요 |
| `DATA_NETWORK_EFFECT` | 충분히 집계·비식별화된 signal이 Product 판단에 기여하는가 | 개인 profile을 aggregate라고 부르지 않음 |

## 3. Measurement Identity

```text
PRODUCT_CONTINUITY_IDENTITY
!= ANALYTICS_MEASUREMENT_IDENTITY
!= ACCOUNT_IDENTITY
!= MARKETING_IDENTITY
```

Guest continuity identity가 존재해도 Analytics tracking은 자동으로 허용되지 않습니다. Measurement identity state는 다음과 같습니다.

| State | Meaning | Eligibility |
| --- | --- | --- |
| `MEASUREMENT_DISABLED` | event runtime과 persistent measurement가 비활성 | current default |
| `SESSION_ONLY` | 한 eligible measurement session 안에서만 연결 | policy/consent review 후 candidate |
| `PSEUDONYMOUS_CONTINUITY_ALLOWED` | D1/D7/D30 같은 cross-session cohort 계산 가능 | explicit Product/privacy/jurisdiction approval required |
| `ACCOUNT_LINKED_MEASUREMENT_ALLOWED` | account-linked metric을 목적 범위 안에서 계산 | explicit account/privacy/consent approval required |

Measurement identity는 random, first-party, purpose-bounded여야 합니다. Product continuity 또는 account ID를 그대로 복사하는 대신 approved linkage/pseudonymization contract를 별도로 정의합니다. 정확한 관할별 eligibility는 `LEGAL_REVIEW_REQUIRED`입니다.

## 4. Canonical Event Naming And Versioning

- Canonical event name은 `lower_snake_case` semantic name입니다.
- UI color, component name, source line, React component 또는 analytics vendor 이름을 포함하지 않습니다.
- UI layout 변경만으로 event를 새로 만들거나 이름을 바꾸지 않습니다.
- 모든 event는 `event_name`과 positive integer `event_version`을 가집니다.
- Optional property 추가처럼 기존 consumer 의미를 보존하는 변화는 non-breaking입니다.
- Required property, eligibility, outcome meaning 또는 schema type을 바꾸는 변화는 breaking이며 version을 올립니다.
- Breaking semantic change는 같은 version으로 조용히 재사용하지 않습니다.
- Future emitter는 한 logical occurrence에 stable `event_id`를 한 번 생성하고 retry에도 같은 값을 재사용해야 합니다. Collector/aggregate는 `event_id`로 idempotent dedupe하며 timestamp 근접성만으로 서로 다른 event를 합치지 않습니다.

## 5. Minimum Event Envelope

| Property | Contract |
| --- | --- |
| `event_name` | canonical registry name |
| `event_version` | event-specific schema version |
| `event_id` | random occurrence identifier for retry/idempotency dedupe; user/account/continuity identity가 아님 |
| `occurred_at` | UTC timestamp |
| `measurement_session_id` | eligibility가 허용한 first-party session identifier; Product continuity ID와 동일하다고 가정하지 않음 |
| `measurement_identity_state` | disabled/session/pseudonymous/account-linked eligibility state |
| `ui_locale` | UI locale only |
| `content_provider_region` | provider availability region only |
| `legal_jurisdiction_state` | `UNKNOWN`, `RESOLVED`, `LEGAL_REVIEW_REQUIRED` 또는 `UNSUPPORTED`; locale/region에서 추론 금지 |
| `surface` | stable Product surface classification |
| `release_identity` | exact Product release/commit identity가 runtime에서 신뢰 가능할 때만 |

`UI_LOCALE`, `CONTENT_PROVIDER_REGION`과 `LEGAL_JURISDICTION`은 독립적입니다. `country`라는 ambiguous property를 canonical envelope에 사용하지 않습니다. UI locale로 timezone 또는 precise geography를 추론하지 않습니다.

## 6. Property Policy

### 6.1 Allowlist Candidates

- counts and booleans
- canonical taxonomy IDs와 content type values
- result count와 selected option count
- source/channel classification
- UI locale와 provider region
- success/failure class
- coarse latency bucket when decision-useful
- stable feature state

Canonical content ID는 목적과 retention을 명시한 별도 review 없이는 Analytics property로 자동 포함하지 않습니다. Metric이 count/outcome으로 계산되면 per-content history보다 aggregate property를 우선합니다.

### 6.2 Prohibited By Default

- raw favorite-work, search 또는 user-entered title text
- raw synopsis, recommendation prose 또는 provider payload
- actor/director names
- full referrer URL 또는 query-bearing destination URL
- email, name, phone 또는 direct identity
- precise location, raw IP, full user-agent fingerprint
- advertising ID, cross-site identifier, auth token 또는 credential
- stack trace, raw API body 또는 secret-bearing error text

## 7. Acquisition Channel Taxonomy

| Channel | Meaning |
| --- | --- |
| `DIRECT` | no eligible external acquisition classification |
| `ORGANIC_SEARCH` | approved search-origin classification without storing arbitrary full referrer |
| `REFERRAL` | approved opaque first-party referral attribution |
| `ORGANIC_SOCIAL` | approved coarse social source class |
| `OTHER` | known but not separately canonicalized source class |
| `UNKNOWN` | evidence insufficient |

```text
PAID_ACQUISITION = NOT_CURRENT_BASELINE
```

Future paid classes may extend this taxonomy only through a separate commercial/privacy Gate.

## 8. Canonical Raw Event Registry

All event versions begin at `1`. `CORE_V1_EVENT` means contract priority, not current emission.

### 8.1 Core V1 Events

| Event | Purpose | Minimum event-specific properties | Current state |
| --- | --- | --- | --- |
| `product_session_started` | eligible Product session denominator | `channel`, `surface` | `CORE_V1_EVENT / NOT_IMPLEMENTED` |
| `recommendation_requested` | recommendation intent and request denominator | `selected_option_count`, `seed_count`, canonical `content_type_values`, `request_mode` | `CORE_V1_EVENT / NOT_IMPLEMENTED` |
| `recommendation_succeeded` | usable recommendation value | `result_count`, `success_class`, optional `latency_bucket` | `CORE_V1_EVENT / NOT_IMPLEMENTED` |
| `recommendation_failed` | coarse Product failure outcome | `failure_class`, optional `latency_bucket` | `CORE_V1_EVENT / NOT_IMPLEMENTED` |
| `result_detail_opened` | post-result detail engagement | canonical `content_type_value`, `result_position_bucket`; content ID excluded by default | `CORE_V1_EVENT / NOT_IMPLEMENTED` |

### 8.2 Future Capability Events

| Event | Required capability | Current state |
| --- | --- | --- |
| `share_action_invoked` | user-facing share action | `TARGET_NOT_IMPLEMENTED` |
| `referral_landing_started` | approved opaque referral entry | `TARGET_NOT_IMPLEMENTED` |
| `watch_intent_saved` | save/watch-later capability | `TARGET_NOT_IMPLEMENTED` |
| `recommendation_feedback_submitted` | explicit feedback capability | `TARGET_NOT_IMPLEMENTED` |
| `account_offer_shown` | after-value optional-account offer | `TARGET_NOT_IMPLEMENTED` |
| `account_created_after_value` | optional account creation after qualifying value | `TARGET_NOT_IMPLEMENTED` |
| `guest_account_merge_confirmed` | explicit merge confirmation | `TARGET_NOT_IMPLEMENTED` |

`share_completed`는 platform-independent completion evidence가 정의되기 전에는 canonical event가 아닙니다. Account, save, share 또는 referral capability를 현재 active라고 표현하지 않습니다.

```text
NOT_NEEDED_EVENTS =
  activated_user
  returning_guest
  d1_returned / d7_returned / d30_returned
  arbitrary_click
  dashboard_metric_viewed
  share_completed (until independently provable completion exists)
```

이 값들은 derived state, implementation detail 또는 현재 증명 불가능한 outcome이므로 raw client event로 만들지 않습니다.

## 9. Derived Concepts, Not Raw Events

다음은 raw client event가 아니라 eligible raw events와 identity를 계산한 결과입니다.

- `ACTIVATED_SUBJECT`: qualifying first eligible session에서 success를 달성한 eligible subject
- `SUCCESSFUL_RECOMMENDATION_SESSION`: 하나 이상의 qualifying success를 포함한 session
- `RETURNING_GUEST`: approved continuity identity가 later eligible session에 다시 나타난 상태
- `D1_RETURNED`, `D7_RETURNED`, `D30_RETURNED`: deterministic UTC cohort state
- `NEW_VISITOR`: approved identity의 first-observed eligible state
- `WAU`, `MAU`: distinct eligible identity aggregates

Dashboard가 숫자를 필요로 한다는 이유로 derived state event를 추가하지 않습니다.

## 10. Recommendation Success And Failure

```text
SUCCESSFUL_RECOMMENDATION =
  request completed
  AND usable_result_count > 0
  AND not Product error state
```

Button click이나 request 시작만으로 success가 아닙니다. `SUCCESSFUL_RECOMMENDATION_SESSION`은 하나 이상의 qualifying `recommendation_succeeded`를 가진 eligible session입니다.

| Failure class | Meaning |
| --- | --- |
| `VALIDATION_REJECTED` | input/selection contract가 Product validation에서 거부됨 |
| `NO_RESULT` | request completed without usable result |
| `PRODUCT_ERROR` | Product-owned processing failure |
| `PROVIDER_UNAVAILABLE` | coarse provider availability failure |
| `UNKNOWN` | safe classification evidence insufficient |

Growth event에는 stack, raw message, provider body 또는 credential을 넣지 않습니다. Operational error telemetry는 Growth measurement와 별도입니다.

## 11. Deterministic Time And Cohort Contract

- `occurred_at`와 aggregate computation은 UTC를 기준으로 합니다.
- D1, D7, D30은 subject의 first qualifying UTC cohort date 다음 각각 1, 7, 30번째 UTC calendar date의 eligible activity입니다.
- WAU는 evaluation instant까지의 trailing 7 UTC days, MAU는 trailing 30 UTC days의 distinct eligible identities입니다.
- Growth rate는 길이가 같은 연속 window끼리 비교합니다.
- UI locale와 provider region은 segmentation이며 timezone이 아닙니다.
- Cross-session identity가 승인되지 않으면 D1/D7/D30, Returning Guest, WAU/MAU와 unique-user growth는 `NOT_MEASURABLE`입니다.

## 12. First-Class KPI Contracts

`Current` 값은 analytics runtime이 없는 현재 상태를 나타냅니다. `ID`는 minimum identity requirement입니다.

| KPI | Purpose | Numerator | Denominator | Eligible population | ID | Window | Allowed segmentation | Source events | Current / limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| New Visitors | new subject volume | first-observed eligible identities | all eligible identities | consent-eligible Product subjects | pseudonymous continuity | UTC day/week/month | locale, provider region, channel | session start + derived first-seen | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| New Visitor Sessions | first-session volume | sessions belonging to first-observed identities | all eligible sessions | eligible sessions with approved identity | pseudonymous continuity | UTC day/week/month | locale, region, channel | session start | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| Organic Search Sessions | search acquisition volume | sessions classified `ORGANIC_SEARCH` | all attributable sessions | eligible session starts | session-only | UTC day/week/month | locale, region | session start | `NOT_IMPLEMENTED / CHANNEL_LIMITED` |
| Organic Search Share | organic acquisition mix | organic-search sessions | all attributable sessions | eligible session starts | session-only | UTC day/week/month | locale, region | session start | `NOT_IMPLEMENTED / CHANNEL_LIMITED` |
| Referral Landing Sessions | referral landing volume | referral landing sessions | all eligible sessions | approved referral landings | session-only + opaque referral | UTC day/week/month | locale, region | referral landing, session start | `NOT_AVAILABLE / CAPABILITY_NOT_IMPLEMENTED` |
| UI Locale Mix | UI language mix | sessions per `ui_locale` | sessions with valid locale | eligible session starts | session-only | UTC day/week/month | channel, region | session start | `NOT_IMPLEMENTED` |
| Provider Region Mix | availability-region mix | sessions per provider region | sessions with valid provider region | eligible session starts | session-only | UTC day/week/month | locale, channel | session start | `NOT_IMPLEMENTED`; not user country |
| Activation Rate | first-session value completion | first eligible sessions with success | all first eligible sessions | first-observed eligible subjects | pseudonymous continuity | cohort date | locale, region, channel | session start, request, success | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| Successful Recommendation Rate | request quality | successful recommendation requests | completed recommendation requests | eligible completed requests | session-only | UTC day/week/month | locale, region, request mode | request, success, failure | `NOT_IMPLEMENTED` |
| Successful Recommendation Sessions | session value volume | sessions with >=1 success | all eligible sessions | eligible sessions | session-only | UTC day/week/month | locale, region, channel | session start, success | `NOT_IMPLEMENTED` |
| Successful Recommendation Session Rate | session value rate | sessions with >=1 success | all eligible sessions | eligible sessions | session-only | UTC day/week/month | locale, region, channel | session start, success | `NOT_IMPLEMENTED` |
| Detail Open Rate | result exploration | successful sessions with >=1 detail open | successful recommendation sessions | eligible successful sessions | session-only | UTC day/week/month | locale, region, content type | success, detail open | `NOT_IMPLEMENTED` |
| Save/Watch-intent Rate | explicit save intent | successful sessions with save | successful recommendation sessions | sessions where save exists | eligible persistent identity | UTC day/week/month | locale, region | success, watch intent | `NOT_AVAILABLE / CAPABILITY_NOT_IMPLEMENTED` |
| Returning Guest Rate | return behavior | eligible returning guest identities | eligible guest identities in cohort | consent-approved guest cohort | pseudonymous continuity | defined cohort window | locale, region, acquisition cohort | session start + derived return | `NOT_MEASURABLE / IDENTITY_AND_CONSENT_LIMITED` |
| D1 Retention | next-day return | cohort identities active on UTC D1 | eligible D0 cohort identities | consent-approved D0 cohort | pseudonymous continuity | D1 UTC date | locale, region, channel | session start + derived cohort | `NOT_MEASURABLE` |
| D7 Retention | seventh-day return | cohort identities active on UTC D7 | eligible D0 cohort identities | consent-approved D0 cohort | pseudonymous continuity | D7 UTC date | locale, region, channel | session start + derived cohort | `NOT_MEASURABLE` |
| D30 Retention | thirtieth-day return | cohort identities active on UTC D30 | eligible D0 cohort identities | consent-approved D0 cohort | pseudonymous continuity | D30 UTC date | locale, region, channel | session start + derived cohort | `NOT_MEASURABLE` |
| WAU | weekly active scale | distinct eligible identities with session | 1 (count metric) | approved measurable identities | pseudonymous/account | trailing 7 UTC days | locale, region, identity class | session start | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| MAU | monthly active scale | distinct eligible identities with session | 1 (count metric) | approved measurable identities | pseudonymous/account | trailing 30 UTC days | locale, region, identity class | session start | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| WAU/MAU | engagement frequency | WAU distinct identities | MAU distinct identities | same identity-eligible population | pseudonymous/account | aligned trailing 7/30 days | locale, region | session start | `NOT_MEASURABLE`; numerator subset required |
| Recommendation Repeat Rate | repeat request behavior | sessions with >=2 requests | sessions with >=1 request | eligible request sessions | session-only | UTC day/week/month | locale, region, request mode | recommendation requested | `NOT_IMPLEMENTED` |
| Duplicate Recommendation Rate | within-response duplication | duplicate canonical identities within responses | all result exposures in measured responses | eligible successful responses | session-only; ID review for content keys | UTC day/week/month | locale, region, content type | success outcome extension | `NOT_IMPLEMENTED / CONTENT_ID_REVIEW_REQUIRED` |
| Duplicate Avoidance Applied Rate | avoidance mechanism use | eligible requests where bounded avoidance applied | requests with non-empty approved prior history | continuity-approved requests | pseudonymous continuity | UTC day/week/month | locale, region | request outcome extension | `NOT_AVAILABLE / FEATURE_NOT_IMPLEMENTED` |
| Repeated Content Exposure Rate | cross-session repeated exposure | result exposures already in approved bounded history | all eligible result exposures | continuity-approved identities | pseudonymous continuity | approved history window | locale, region, content type | success outcome extension | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| Guest-to-Account Conversion After Value | optional-account value conversion | guests creating account after qualifying success | guest identities that first received qualifying success | value-receiving eligible guests | explicit guest/account measurement linkage | cohort window | locale, region, channel | success, account created | `NOT_AVAILABLE / ACCOUNT_NOT_IMPLEMENTED` |
| Share Action Rate | user share intent | successful sessions with share invoked | successful recommendation sessions | sessions where share exists | session-only | UTC day/week/month | locale, region | success, share invoked | `NOT_AVAILABLE / SHARE_NOT_IMPLEMENTED` |
| Referral Landing Rate | share-to-landing delivery | eligible referral landing sessions | eligible share-action sessions with approved opaque referral identity | approved share/referral sessions | session-only + opaque referral | attribution window | locale, region | share invoked, referral landing | `NOT_AVAILABLE / REFERRAL_NOT_IMPLEMENTED` |
| Referral Activation Rate | referred Product value | referral landing sessions with qualifying recommendation success | eligible referral landing sessions | approved referral sessions | session-only + opaque referral | attribution window | locale, region | referral landing, success | `NOT_AVAILABLE / REFERRAL_NOT_IMPLEMENTED` |
| Referral Conversion | referral value completion | referral landing sessions with success | eligible referral landing sessions | approved referral sessions | session-only + opaque referral | attribution window | locale, region | referral landing, success | `NOT_AVAILABLE / REFERRAL_NOT_IMPLEMENTED` |
| Overall Visitor/User Growth Rate | equal-window scale change | current-window eligible subjects minus prior-window subjects | prior-window eligible subjects | same identity-eligible population | pseudonymous/account | equal UTC windows | locale, region, channel | session start | `NOT_MEASURABLE / IDENTITY_LIMITED`; zero denominator handled explicitly |

Formula count: `30 / 30 COMPLETE`. `Referral Conversion` is the V1 business name for the same qualifying-success outcome as `Referral Activation Rate`; it may diverge only through a versioned metric-contract decision. Dashboard aliases may not change numerator, denominator, eligibility, identity or window without a metric-contract change.

## 13. Event-To-Metric Mapping

| Event | Derived state | KPI consumers |
| --- | --- | --- |
| `product_session_started` | session, first-seen, returning, UTC cohort | acquisition mix, activation denominator, retention, WAU/MAU, growth |
| `recommendation_requested` | request count, repeated-request session | success rate denominator, repeat rate |
| `recommendation_succeeded` | successful recommendation/session, activation | activation, success, detail/save/share denominators, referral conversion |
| `recommendation_failed` | completed failed request, coarse failure trend | success rate, failure-class trend |
| `result_detail_opened` | engaged successful session | detail-open rate, aggregate detail demand |
| `share_action_invoked` | share-intent session | share-action and referral-landing rates |
| `referral_landing_started` | attributable referral session | referral landing, activation and conversion |
| `watch_intent_saved` | explicit save-intent session | save/watch-intent rate and future aggregate |
| `account_created_after_value` | after-value account conversion | guest-to-account conversion |
| `recommendation_feedback_submitted` | explicit feedback aggregate candidate | future quality metrics after approval |
| `account_offer_shown` | optional-account offer exposure | guardrail review; no signup-pressure optimization by default |
| `guest_account_merge_confirmed` | explicit merge provenance | merge integrity only; not a growth KPI by itself |

## 14. Duplicate Avoidance And Account Guardrail

Repeat-avoidance metrics prefer boolean/count outcomes over exporting full personal content history. Any canonical content identity property requires separate purpose, retention and consent review. No recommendation engine, ranking, eligibility or history implementation changes here.

```text
PRE_VALUE_SIGNUP_PRESSURE = PROHIBITED_PRODUCT_PATTERN
```

Guest-to-account conversion denominator starts only after qualifying Product value. Landing visitors are not the denominator, and conversion targets must not create signup walls or forced registration.

## 15. Referral Contract

`SHARE_ACTION_INVOKED` is distinct from future independently provable `SHARE_COMPLETED`. Native share invocation cannot be called completion without reliable platform evidence.

`REFERRAL_LANDING_RATE` measures eligible landing delivery from approved share-action sessions. `REFERRAL_ACTIVATION_RATE` measures qualifying recommendation success after an eligible referral landing. `REFERRAL_CONVERSION` is intentionally equal to that activation outcome in V1; a later downstream conversion goal must version the metric instead of silently changing its denominator.

Future referral identifiers must be opaque, first-party, non-semantic, non-personal and bounded to referral attribution. They must not become account, continuity, marketing or cross-site identity.

## 16. Privacy-Safe Data Network Effect

Future aggregate families may include taxonomy demand mix, recommendation success by taxonomy, locale/provider-region demand, detail-open aggregate, save intent when implemented, popular option combinations, unresolved favorite-work rate and coarse failure trend.

Aggregate publication/use requires approved thresholding, rare-cohort suppression and de-identification where appropriate. Raw entered titles, individual trajectories and small re-identifiable cohorts are excluded. Provider region is not user country.

## 17. Privacy And Consent Eligibility Matrix

| Event/metric class | Session-only candidate | Persistent identity | Policy decision | Legal review | Marketing |
| --- | --- | --- | --- | --- | --- |
| core request/success/failure/detail events | `SESSION_ONLY_SAFE_CANDIDATE` | not required for session metrics | `ANALYTICS_POLICY_DECISION_REQUIRED` | jurisdiction dependent | `NOT_APPLICABLE` |
| acquisition channel and locale/region mix | `SESSION_ONLY_SAFE_CANDIDATE` | not required for session mix | `ANALYTICS_POLICY_DECISION_REQUIRED` | referrer/source treatment review | `NOT_APPLICABLE` |
| D1/D7/D30, Returning Guest, WAU/MAU | insufficient | `PERSISTENT_IDENTITY_REQUIRED` | `ANALYTICS_POLICY_DECISION_REQUIRED` | `LEGAL_REVIEW_REQUIRED` | `NOT_APPLICABLE` |
| account conversion | insufficient | explicit guest/account linkage required | account/analytics policy required | `LEGAL_REVIEW_REQUIRED` | `NOT_APPLICABLE` |
| referral attribution | bounded session candidate | only if attribution window requires | referral/privacy policy required | `LEGAL_REVIEW_REQUIRED` | `NOT_APPLICABLE` |
| aggregate data network effect | source-event dependent | not required after sufficient de-identification | aggregation policy required | threshold/use review | `NOT_APPLICABLE` |

Missing consent or identity yields unavailable/limited measurement, not zero behavior. No jurisdiction-wide legal exemption is declared.

## 18. Performance And Operational Boundary

`latency_bucket` may be added only when a Product decision uses a coarse bounded value. Exact traces, stack, provider payload, infrastructure logs and high-cardinality technical diagnostics belong to `OPERATIONAL_TELEMETRY`, not `PRODUCT_GROWTH_METRIC`.

## 19. Measurement Quality States

- `MEASURABLE`: formula inputs, identity and eligibility are proven
- `PARTIALLY_MEASURABLE`: bounded subset is valid and limitation is explicit
- `NOT_MEASURABLE`: required identity/evidence unavailable
- `NOT_IMPLEMENTED`: event/runtime does not exist
- `IDENTITY_LIMITED`: identity scope prevents claimed uniqueness/cohort
- `CONSENT_LIMITED`: eligible population excludes unapproved subjects
- `SAMPLE_OR_DATA_QUALITY_LIMITED`: sample, missingness or attribution quality is insufficient

Dashboards must expose the applicable quality state. Missing measurement is not zero activity and must not be rendered as such.

## 20. Vendor And Schema Governance

```text
ANALYTICS_PROVIDER = NOT_SELECTED
```

Google Analytics, PostHog, Plausible, Vercel Analytics, Mixpanel, Amplitude와 다른 vendor는 이 contract에서 선택하지 않습니다. Future comparison은 Product taxonomy에 mapping해야 하며 vendor defaults로 KPI를 재정의하지 않습니다. `FREE_FIRST` remains required.

Each future schema record should identify:

- `EVENT_OWNER`: Product owner of semantic event meaning
- `METRIC_OWNER`: owner of formula and decision use
- `SCHEMA_VERSION`: event/metric contract version
- `DEPRECATION_STATE`: active, deprecated with replacement, or retired

New property는 allowlist, purpose와 retention review를 거칩니다. Event deprecation은 replacement와 comparison boundary를 기록합니다. Semantic or metric formula change는 version/history boundary를 남기며 historical series를 조용히 연결하지 않습니다.

## 21. Instrumentation Gate

Analytics implementation 전에 다음이 필요합니다.

1. exact Core event subset and Product owners approved
2. identity state and linkage purpose selected
3. jurisdiction/privacy/consent eligibility matrix approved
4. retention and deletion policy approved
5. property allowlist and content-ID treatment approved
6. vendor or first-party storage decision with `FREE_FIRST` evidence
7. duplicate emission/idempotency and retry contract
8. schema/metric validation and no-secret evidence
9. user controls and policy text where required
10. separate implementation, QA, Security and Release authority

## 22. Diligence Value

Stable KPI formulas, event provenance, privacy boundaries, identity semantics, reproducible UTC cohorts, schema versioning, organic/referral attribution and explicit unmeasurable states reduce diligence ambiguity. This is not a buyer package, valuation, legal representation or measured growth claim.

## 23. Non-Goals

This contract does not select a vendor or implement analytics SDK, event runtime, cookie, storage, database, auth, tracking, marketing, Product behavior, recommendation semantics, Security execution, Main integration, Release, Production, Deployment or cost.
