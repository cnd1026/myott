# Privacy And Consent Measurement Eligibility Matrix

Status: PRODUCT PRIVACY/MEASUREMENT CONTRACT / NO RUNTIME IMPLEMENTATION

Task: `MYOTT_PRIVACY_CONSENT_MEASUREMENT_ELIGIBILITY_MATRIX_V1`

## 1. Authority And Current State

이 문서는 [Growth Measurement Event Taxonomy](GROWTH_MEASUREMENT_EVENT_TAXONOMY.md)의 event와 KPI를 실제 instrumentation 전에 privacy, consent, identity와 jurisdiction eligibility에 연결합니다. Product continuity와 retention은 [Guest Account Data Continuity Architecture](GUEST_ACCOUNT_DATA_CONTINUITY_ARCHITECTURE.md), global jurisdiction separation은 [Public Launch Global-First Architecture](PUBLIC_LAUNCH_GLOBAL_FIRST_ARCHITECTURE.md), acquisition 의미는 [SEO Indexability Launch Architecture](SEO_INDEXABILITY_LAUNCH_ARCHITECTURE.md)를 따릅니다.

```text
ANALYTICS_PROVIDER = NOT_SELECTED
MEASUREMENT_RUNTIME = NOT_IMPLEMENTED
CONSENT_RUNTIME = NOT_IMPLEMENTED
CURRENT_MEASUREMENT_IDENTITY = NONE
MARKETING_TRACKING = NOT_AUTHORIZED
CURRENT_ACTUAL_METRICS = NOT_COLLECTED / NOT_ASSERTED
MEASUREMENT_IMPLEMENTATION = DEFERRED / PRIVACY_AND_CONSENT_GATE_REQUIRED
```

이 문서는 analytics vendor, SDK, event emitter, consent banner, cookie, storage, database 또는 legal-country mapping을 구현하지 않습니다. Product architecture이며 법률 자문이나 compliance 인증이 아닙니다.

## 2. Governing Separations

```text
PRODUCT_CONTINUITY_IDENTITY
!= ANALYTICS_MEASUREMENT_IDENTITY
!= ACCOUNT_IDENTITY
!= MARKETING_IDENTITY

UI_LOCALE
!= CONTENT_PROVIDER_REGION
!= LEGAL_JURISDICTION

GROWTH_ANALYTICS
!= OPERATIONAL_TELEMETRY
!= SECURITY_LOGGING
```

`guest_id`를 Analytics subject ID로 직접 재사용하는 것은 금지합니다. Product continuity consent나 identity가 존재해도 Analytics eligibility가 자동 생성되지 않습니다. Operational/security logs도 Growth profiling에 자동 재사용하지 않습니다.

## 3. Consent Categories

| Category | Product purpose | Current baseline |
| --- | --- | --- |
| `STRICTLY_NECESSARY` | core service delivery에 실제 필요한 최소 처리 | Analytics를 포함하지 않음 |
| `PREFERENCES` | user-controlled Product preference/continuity | 별도 목적과 retention 필요 |
| `ANALYTICS` | Product usage와 Growth measurement | policy, jurisdiction와 consent Gate 전 비활성 |
| `MARKETING` | advertising, retargeting 또는 campaign identity | `NOT_CURRENT_BASELINE / NOT_AUTHORIZED` |

Growth 측정이 Product에 유용하다는 이유만으로 `STRICTLY_NECESSARY`가 되지 않습니다. Preferences, Analytics와 Marketing은 독립 category이며 하나의 허용이 다른 category를 허용하지 않습니다.

## 4. Consent State Model

| State | Meaning | Nonessential measurement |
| --- | --- | --- |
| `CONSENT_UNRESOLVED` | applicable requirement 또는 user choice가 확정되지 않음 | `OFF` |
| `NECESSARY_ONLY` | core service processing only | `OFF` |
| `PREFERENCES_ALLOWED` | approved preference purpose만 허용 | Analytics `OFF` |
| `ANALYTICS_ALLOWED` | applicable policy와 consent requirement를 충족 | approved Analytics subset만 candidate |
| `MARKETING_ALLOWED` | 별도 Marketing purpose가 명시적으로 허용됨 | current Product에서는 `NOT_ELIGIBLE` |
| `ANALYTICS_DENIED` | Analytics가 거절됨 | `OFF` |
| `CONSENT_WITHDRAWN` | 이전 Analytics permission이 철회됨 | future collection/identity refresh `OFF` |
| `UNSUPPORTED_STATE` | 상태를 안전하게 해석할 수 없음 | `OFF` |

이 상태는 모든 관할에 동일한 transition을 주장하는 선형 단계가 아닙니다. 실제 UI와 state transition은 별도 Product/Privacy/Legal Gate에서 정합니다.

## 5. Jurisdiction Review States

| State | Product architecture meaning | Default measurement behavior |
| --- | --- | --- |
| `JURISDICTION_UNKNOWN` | applicable policy가 결정되지 않음 | persistent Analytics와 Marketing `OFF`; session-only도 policy approval 필요 |
| `LEGAL_REVIEW_REQUIRED` | 법률/정책 판정이 아직 필요 | nonessential measurement `OFF` |
| `ANALYTICS_REQUIRES_EXPLICIT_OPT_IN` | approved Product policy가 explicit opt-in을 요구 | `ANALYTICS_ALLOWED` 전까지 `OFF` |
| `ANALYTICS_ALLOWED_UNDER_APPROVED_POLICY` | approved policy가 exact event/property/identity subset을 허용 | 그 subset만 candidate |
| `ANALYTICS_PROHIBITED_OR_UNSUPPORTED` | approved policy가 Analytics를 허용하지 않거나 지원 범위 밖 | Analytics, Marketing, persistent identity `OFF` |

Actual country-to-state mapping은 `FUTURE_LEGAL_REVIEW`입니다. UI locale, provider region, IP 또는 추정 geography로 관할 결론을 만들지 않습니다.

## 6. Eligibility Resolution

Future instrumentation은 dispatch 전에 다음을 모두 만족해야 합니다.

1. event와 purpose가 canonical registry에 존재
2. capability가 실제 Product에 구현됨
3. jurisdiction policy state가 exact event/property/identity를 허용
4. 필요한 consent category가 현재 허용됨
5. identity level이 metric 목적과 retention에 적합함
6. property allowlist/minimization을 통과함
7. suppression, withdrawal와 deletion/de-linking contract가 구현됨
8. 별도 implementation, Security, QA와 Release authority가 존재

하나라도 미충족이면 event는 전송하지 않습니다. `unknown = allowed` 또는 `collect now, decide later`는 금지합니다.

## 7. Analytics Identity Matrix

| Level | Purpose/persistence | Required eligibility | Metric capability | Prohibited uses | Current |
| --- | --- | --- | --- | --- | --- |
| `NONE` | Analytics identity와 event emission 없음 | none | none | metrics를 실제 수집값으로 주장 | `CURRENT DEFAULT` |
| `SESSION_ONLY` | bounded eligible session 안에서만 random ID 유지; session 종료 후 join 불가 | approved Analytics policy, applicable consent/jurisdiction state, session retention | request success/error, detail opens, successful-session, session mix | fingerprint, account link, guest ID reuse, advertising ID, cross-session cohort | `NOT_IMPLEMENTED` |
| `PSEUDONYMOUS_CROSS_SESSION` | first-party purpose-bounded random measurement ID | approved purpose, resolved jurisdiction policy, satisfied consent, retention and deletion/de-linking policy, no fingerprinting, required Security review | returning visitor, D1/D7/D30, WAU/MAU, identity-based acquisition and cross-session funnel | direct guest/account ID export, unrelated profiling, indefinite retention | `NOT_ELIGIBLE / NOT_IMPLEMENTED` |
| `ACCOUNT_LINKED` | account lifecycle measurement through purpose-specific pseudonymous link | account capability, explicit purpose/linkage, account/privacy/consent policy, retention/deletion, Security review | after-value conversion, approved cross-device account retention | email/name/auth token/raw provider identity, automatic login linkage | `NOT_ELIGIBLE / ACCOUNT NOT IMPLEMENTED` |
| `MARKETING_ATTRIBUTION_IDENTITY` | campaign/advertising attribution | separate Founder/Product/Privacy/Legal approval and exact Marketing consent | no current metric capability | retargeting, ad IDs or cross-site tracking under current baseline | `NOT_ELIGIBLE / NOT AUTHORIZED` |

```text
DIRECT_GUEST_ID_REUSE_FOR_ANALYTICS = PROHIBITED
ACCOUNT_ID_DIRECT_ANALYTICS_EXPORT = NOT_APPROVED
FINGERPRINT_DERIVED_IDENTITY = PROHIBITED
```

## 8. Event Eligibility Matrix

All canonical events remain `CURRENT_IMPLEMENTATION = NONE`. `Candidate` never means currently emitting or universally lawful.

| Event | Capability | Purpose | Session-only | Persistent Analytics | Account-linked | Consent candidate | Legal review | Property risk | Current implementation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `product_session_started` | current Product surface | eligible session denominator/channel mix | conditional candidate | only for first-seen/retention | no | Analytics | required by jurisdiction/policy | coarse channel, locale, region | `NONE` |
| `recommendation_requested` | current | request denominator and repeat-within-session | conditional candidate | only for cross-session repeat | no | Analytics | required | taxonomy counts; raw input prohibited | `NONE` |
| `recommendation_succeeded` | current | usable value outcome | conditional candidate | only for identity cohort metrics | no | Analytics | required | result counts; content IDs conditional | `NONE` |
| `recommendation_failed` | current | coarse Product failure outcome | conditional candidate | unnecessary by default | no | Analytics | required | coarse class only; raw error prohibited | `NONE` |
| `result_detail_opened` | current | result exploration | conditional candidate | only for approved cross-session behavior | no | Analytics | required | category/position preferred; content ID conditional | `NONE` |
| `share_action_invoked` | `TARGET_NOT_IMPLEMENTED` | user-invoked share intent | candidate after capability/policy | unnecessary by default | no | Analytics | required | no shared payload or personal destination | `NONE` |
| `referral_landing_started` | `TARGET_NOT_IMPLEMENTED` | opaque referral attribution | conditional candidate | only for longer approved attribution | no | Analytics | required | opaque token conditional | `NONE` |
| `watch_intent_saved` | `TARGET_NOT_IMPLEMENTED` | explicit save intent aggregate | insufficient for persistent save lifecycle | conditional after continuity policy | possible only after account capability | Preferences and/or Analytics by exact purpose | required | content identity behavior-sensitive | `NONE` |
| `recommendation_feedback_submitted` | `TARGET_NOT_IMPLEMENTED` | explicit feedback aggregate | conditional candidate | conditional if longitudinal purpose approved | no by default | Analytics | required | free text prohibited; bounded enum/count only | `NONE` |
| `account_offer_shown` | `TARGET_NOT_IMPLEMENTED` | after-value offer guardrail | conditional candidate | unnecessary by default | no | Analytics | required | pre-value pressure guardrail | `NONE` |
| `account_created_after_value` | `TARGET_NOT_IMPLEMENTED` | optional-account conversion | session correlation may be insufficient | conditional purpose-specific linkage | required for exact account lifecycle | Analytics plus account policy | required | direct account identifier prohibited | `NONE` |
| `guest_account_merge_confirmed` | `TARGET_NOT_IMPLEMENTED` | merge integrity/provenance | insufficient | conditional purpose-specific linkage | required | Preferences/account policy; Analytics only if separately approved | required | guest/account direct IDs prohibited | `NONE` |

Core count: `5 / 5 classified`. Future capability count: `7 / 7 classified`. No future event is marked active.

## 9. Session-Only Measurement Boundary

`SESSION_ONLY` expires with a bounded measurement session and cannot be joined across sessions. It uses no fingerprint, account linkage, guest continuity identifier, advertising ID or cross-site identifier.

After policy/consent eligibility, it may support request success/error rates, successful recommendation sessions, detail opens, within-session repeat and option/taxonomy mix. It cannot prove first-ever visitor status, returning guest, D1/D7/D30, WAU/MAU or cross-session exposure. Session-only is not automatically legal in every jurisdiction.

## 10. Property Eligibility Matrix

| Property class | Classification | Purpose limitation | Retention dependency | Legal/policy note |
| --- | --- | --- | --- | --- |
| `LOW_RISK_PRODUCT_STATE` | baseline candidate | stable feature/surface state only | session/aggregate | Analytics policy required |
| `CANONICAL_TAXONOMY` | baseline candidate | demand/outcome aggregate | session/aggregate | rare combination controls may apply |
| `COUNT_OR_BOOLEAN` | baseline candidate | minimum KPI outcome | session/aggregate | avoid hidden identity encoding |
| `UI_LOCALE` | baseline candidate | UI-language segmentation | session/aggregate | not jurisdiction |
| `PROVIDER_REGION` | baseline candidate | content availability segmentation | session/aggregate | not user country/location |
| `COARSE_SOURCE_CHANNEL` | baseline candidate | acquisition class | session/short Analytics | raw referrer not retained |
| `CANONICAL_CONTENT_ID` | conditional | explicit content-behavior purpose only | approved short/cohort | purpose and behavior sensitivity review required |
| `PSEUDONYMOUS_MEASUREMENT_ID` | conditional | approved session/cohort linkage | identity-specific | consent, jurisdiction, deletion/de-linking required |
| `ACCOUNT_LINK_REFERENCE` | conditional/high risk | exact approved account lifecycle only | account measurement | direct account ID export not approved |
| `REFERRAL_TOKEN` | conditional | bounded first-party referral attribution | session or approved attribution window | opaque/non-semantic; legal review required |
| `FREE_TEXT` | prohibited | none in Growth events | none | raw favorite/search/feedback text excluded |
| `DIRECT_IDENTIFIER` | prohibited | none | none | email, name, phone, address excluded |
| `PRECISE_LOCATION` | prohibited | none | none | coarse region must not derive precise location |
| `RAW_IP` | prohibited | none in Growth analytics | none | operational handling remains separate |
| `FULL_USER_AGENT_OR_FINGERPRINT` | prohibited | none | none | no device fingerprinting |
| `FULL_REFERRER_URL` | prohibited persistence; transient classification conditional | derive coarse channel only | `NONE / EPHEMERAL_ONLY` candidate | implementation/legal review required |
| `FULL_DESTINATION_URL_WITH_QUERY` | prohibited | none | none | query may contain private data/secrets |
| `PROVIDER_RAW_PAYLOAD` | prohibited | none | none | includes raw synopsis/content payload |
| `AUTH_OR_SECRET_DATA` | prohibited | none | none | tokens, credentials, session secrets excluded |

Baseline candidate means eligible for later review, not enabled. Canonical content IDs are not automatically safe merely because they are pseudonymous.

## 11. Hard Prohibitions

Baseline Growth events must not contain raw favorite/search/title input, raw free text, email, name, phone, address, precise location, long-term raw IP, device fingerprint, advertising ID, auth token, session secret, provider credential, raw TMDB/API payload, full provider synopsis or private/query-bearing URL.

## 12. Acquisition And Referral Boundary

Acquisition uses `DIRECT`, `ORGANIC_SEARCH`, `REFERRAL`, `ORGANIC_SOCIAL`, `OTHER` and `UNKNOWN`. Full referrer retention is not required. If implementation later inspects a URL transiently to classify a source, `RAW_VALUE_RETENTION = NONE / EPHEMERAL_ONLY` and separate legal/implementation review are required.

Future referral token requirements:

- opaque, random/non-semantic and first-party
- no email, account ID, guest ID, content history or precise identity
- purpose-bounded to referral attribution
- `SESSION_REFERRAL_ATTRIBUTION`: expires with approved bounded session/window
- `PERSISTENT_REFERRAL_ATTRIBUTION`: separately approved attribution window, retention, consent and deletion contract required

No referral capability or token is implemented here.

## 13. Content-Behavior Granularity

Use the least granular level sufficient for the approved KPI:

1. `AGGREGATE_COUNT_ONLY`
2. `EVENT_WITH_CONTENT_CATEGORY_ONLY`
3. `EVENT_WITH_CANONICAL_CONTENT_ID`
4. `PERSONAL_HISTORY_LINKED_CONTENT_ID`

Each higher level requires stronger purpose, identity, retention and privacy justification. Per-content behavioral history is not a default Analytics payload.

## 14. Metric Measurability Matrix

This matrix preserves the canonical numerator/denominator from the Growth taxonomy. `Session` means exact KPI can be computed with session-only identity; a similar but differently defined dashboard metric cannot borrow the canonical name.

| KPI | Session measurable | Persistent ID required | Account link required | Capability state | Consent eligibility | Jurisdiction eligibility | Current measurability |
| --- | --- | --- | --- | --- | --- | --- | --- |
| New Visitors | no | yes | no | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| New Visitor Sessions | no | yes | no | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| Organic Search Sessions | yes | no | no | current acquisition candidate | `ANALYTICS_ALLOWED` | approved policy required | `NOT_IMPLEMENTED / CHANNEL_LIMITED` |
| Organic Search Share | yes | no | no | current acquisition candidate | `ANALYTICS_ALLOWED` | approved policy required | `NOT_IMPLEMENTED / CHANNEL_LIMITED` |
| Referral Landing Sessions | conditional | no | no | `CAPABILITY_NOT_IMPLEMENTED` | `ANALYTICS_ALLOWED` | approved referral policy required | `NOT_AVAILABLE / CAPABILITY_NOT_IMPLEMENTED` |
| UI Locale Mix | yes | no | no | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_IMPLEMENTED` |
| Provider Region Mix | yes | no | no | current surface | `ANALYTICS_ALLOWED` | approved policy required; not user country | `NOT_IMPLEMENTED` |
| Activation Rate | no | yes | no | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| Successful Recommendation Rate | yes | no | no | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_IMPLEMENTED` |
| Successful Recommendation Sessions | yes | no | no | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_IMPLEMENTED` |
| Successful Recommendation Session Rate | yes | no | no | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_IMPLEMENTED` |
| Detail Open Rate | yes | no | no | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_IMPLEMENTED` |
| Save/Watch-intent Rate | no | yes | optional | `CAPABILITY_NOT_IMPLEMENTED` | Preferences and Analytics purpose both resolved | approved policy required | `NOT_AVAILABLE / CAPABILITY_NOT_IMPLEMENTED` |
| Returning Guest Rate | no | yes | no | continuity candidate only | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_AND_CONSENT_LIMITED` |
| D1 Retention | no | yes | no | continuity candidate only | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| D7 Retention | no | yes | no | continuity candidate only | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| D30 Retention | no | yes | no | continuity candidate only | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| WAU | no | yes | optional | continuity candidate only | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| MAU | no | yes | optional | continuity candidate only | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| WAU/MAU | no | yes | optional | continuity candidate only | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| Recommendation Repeat Rate | yes | no | no | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_IMPLEMENTED` |
| Duplicate Recommendation Rate | conditional | no | no | current surface | `ANALYTICS_ALLOWED` | content-ID policy review required | `NOT_IMPLEMENTED / CONTENT_ID_REVIEW_REQUIRED` |
| Duplicate Avoidance Applied Rate | no | yes | no | `CAPABILITY_NOT_IMPLEMENTED` | Preferences and Analytics purpose both resolved | approved policy required | `NOT_AVAILABLE / FEATURE_NOT_IMPLEMENTED` |
| Repeated Content Exposure Rate | no | yes | no | continuity candidate only | `ANALYTICS_ALLOWED` | content-history policy review required | `NOT_MEASURABLE / IDENTITY_LIMITED` |
| Guest-to-Account Conversion After Value | no | yes | yes | `CAPABILITY_NOT_IMPLEMENTED` | Analytics and account-link purpose resolved | approved policy required | `NOT_AVAILABLE / ACCOUNT_NOT_IMPLEMENTED` |
| Share Action Rate | conditional | no | no | `CAPABILITY_NOT_IMPLEMENTED` | `ANALYTICS_ALLOWED` | approved share policy required | `NOT_AVAILABLE / SHARE_NOT_IMPLEMENTED` |
| Referral Landing Rate | conditional | no | no | `CAPABILITY_NOT_IMPLEMENTED` | `ANALYTICS_ALLOWED` | approved referral policy required | `NOT_AVAILABLE / REFERRAL_NOT_IMPLEMENTED` |
| Referral Activation Rate | conditional | no | no | `CAPABILITY_NOT_IMPLEMENTED` | `ANALYTICS_ALLOWED` | approved referral policy required | `NOT_AVAILABLE / REFERRAL_NOT_IMPLEMENTED` |
| Referral Conversion | conditional | no | no | `CAPABILITY_NOT_IMPLEMENTED` | `ANALYTICS_ALLOWED` | approved referral policy required | `NOT_AVAILABLE / REFERRAL_NOT_IMPLEMENTED` |
| Overall Visitor/User Growth Rate | no | yes | optional | current surface | `ANALYTICS_ALLOWED` | approved policy required | `NOT_MEASURABLE / IDENTITY_LIMITED` |

Metric count: `30 / 30 classified`.

Consent-filtered metrics must expose `CONSENT_LIMITED`; jurisdiction-filtered metrics must expose `JURISDICTION_LIMITED`. Missing identity, capability or consent is not zero behavior. Canonical Activation Rate remains first-session/first-observed and therefore persistent-identity limited; session activation belongs to Successful Recommendation Session Rate.

## 15. Withdrawal, Denial And Identity Backflow

For `ANALYTICS_DENIED` or `CONSENT_WITHDRAWN`:

- stop future nonessential Analytics collection
- stop creating or refreshing persistent measurement identity
- do not silently re-enable
- apply future deletion/de-linking only under approved retention/privacy policy
- preserve core recommendation where technically feasible
- treat Product preference/continuity as a separate purpose

```text
ANALYTICS_ID must not recreate PRODUCT_CONTINUITY_ID
PRODUCT_CONTINUITY_ID must not recreate ANALYTICS_ID by default
LEGAL_SPECIFIC_WITHDRAWAL_HANDLING = LEGAL_REVIEW_REQUIRED
```

Resetting Product continuity cannot be bypassed through an Analytics identity, and declining Analytics cannot automatically remove core Product functionality.

## 16. Fail-Safe States

For `JURISDICTION_UNKNOWN`, `LEGAL_REVIEW_REQUIRED`, `ANALYTICS_PROHIBITED_OR_UNSUPPORTED`, `CONSENT_UNRESOLVED`, `ANALYTICS_DENIED`, `CONSENT_WITHDRAWN` or `UNSUPPORTED_STATE`, any disallowed nonessential measurement is suppressed before dispatch.

```text
NONESSENTIAL_MEASUREMENT = OFF
MARKETING = OFF
PERSISTENT_ANALYTICS_ID = OFF
PRECONSENT_EVENT_REPLAY = PROHIBITED
```

Analytics disablement alone does not block ordinary core recommendation unless a separate legal/Product Gate requires a broader service restriction.

## 17. Retention Dependency Classes

| Class | Intended use | Exact duration |
| --- | --- | --- |
| `SESSION_EPHEMERAL` | bounded session-only measurement | policy decision required |
| `SHORT_ANALYTICS` | short event-level quality/acquisition processing | policy/legal review required |
| `COHORT_MEASUREMENT` | approved D1/D7/D30 and WAU/MAU identity | policy/legal review required |
| `ACCOUNT_MEASUREMENT` | purpose-specific account lifecycle | account/privacy/legal review required |
| `AGGREGATE_DEIDENTIFIED` | thresholded purpose-limited aggregate | de-identification policy required |

Existing draft day counts are not promoted to final policy.

## 18. De-Identified Aggregate Boundary

Data may be treated as an aggregate candidate only when it has no direct identifier, no active pseudonymous subject key where unnecessary, sufficient grouping threshold, no raw free text, no small-group re-identification pattern and a purpose-limited schema. This does not declare legal anonymization.

```text
DEIDENTIFICATION_POLICY_REQUIRED = YES
```

## 19. Event Suppression Pipeline

```text
PRODUCT_EVENT_OCCURS
-> CLASSIFY_EVENT
-> RESOLVE_PRIVACY_AND_JURISDICTION_STATE
-> RESOLVE_CONSENT_STATE
-> RESOLVE_IDENTITY_ELIGIBILITY
-> REDACT_AND_MINIMIZE_PROPERTIES
-> SEND_OR_SUPPRESS
```

Eligibility is evaluated before dispatch. Suppressed events are not queued for later replay unless a future explicit policy authorizes an exact bounded behavior; current default is no replay.

## 20. Consent UI Boundary

A future Consent UI must represent necessary, preferences, analytics and marketing separately; support an initial choice where required, later change and withdrawal; avoid dark patterns; and never present optional Analytics as required for core recommendation. No visual or runtime UI is designed here.

## 21. Vendor-Neutral Provider Requirements

Any future first-party collector or Analytics provider comparison must evaluate:

- free-tier viability and cost after growth
- cookieless/session-only capability
- consent-aware pre-dispatch collection control
- client/server collection options without broadening scope
- custom versioned event/schema support
- property minimization and suppression
- retention controls and deletion/de-linking capability
- region/data-processing options where relevant
- exportability and vendor lock-in risk
- ability to avoid advertising/cross-site identity
- auditable event dedupe and quality-state handling

`FREE_FIRST` requires comparison with a first-party minimal collector and suitable free-tier candidates where appropriate. No provider is selected by this document.

## 22. Future Instrumentation Gate

Before measurement implementation:

1. exact event/property subset and owners approved
2. jurisdiction policy resolution source approved
3. consent category/state lifecycle approved
4. identity level and linkage purpose approved
5. retention, deletion/de-linking and withdrawal behavior approved
6. de-identification threshold and content-ID treatment approved
7. first-party/provider decision with Free-First evidence approved
8. pre-dispatch suppression, idempotency and no-replay behavior implemented
9. focused schema/privacy/Security QA completed
10. separate runtime, Release, Production and Deployment authority granted

## 23. Current State And Non-Goals

```text
ANALYTICS_PROVIDER = NOT_SELECTED
MEASUREMENT_RUNTIME = NOT_IMPLEMENTED
CONSENT_RUNTIME = NOT_IMPLEMENTED
MARKETING_TRACKING = NOT_AUTHORIZED
CURRENT_ACTUAL_METRICS = NOT_COLLECTED / NOT_ASSERTED
```

This contract does not implement analytics, consent UI, cookies, storage, database, auth, fingerprinting, Marketing, Product runtime changes, legal-country rules, Security execution, Main integration, Release, Production, Deployment or cost.
