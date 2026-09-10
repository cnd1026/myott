# Phase 1 Jurisdiction Official-Source Policy Matrix

Research snapshot: 2026-09-11 KST

## Executive Summary

MyOTT Phase 1의 가장 낮은 법률·비용·운영 위험 launch mode는 계정, 지속 Guest continuity, 지속 personalization과 nonessential Analytics를 끈 `STATELESS_RECOMMENDATION_ONLY`입니다. 한국, 일본, EU/EEA와 미국에 대해 이 mode는 현재 공식 자료상 core recommendation을 유지할 수 있는 보수적 Product 정책 후보이지만, 법률 자문이나 관할별 compliance 인증은 아닙니다.

Founder 결정을 기다리는 동안 네 검토 지역 모두에서 Analytics는 `ANALYTICS_OFF`로 유지합니다. Country hint는 legal jurisdiction이 아니며, 승인되지 않은 국가나 불명확한 신호는 optional data features를 활성화하지 않습니다.

## Founder Free-First Legal Strategy

1. 먼저 data surface와 optional feature를 줄입니다.
2. 공식 규제기관·법령 원문으로 bounded policy를 구성합니다.
3. 불확실한 관할은 region restriction 또는 optional feature disable로 처리합니다.
4. Product 가치와 매출 가능성이 실제로 법률 복잡성을 정당화할 때만 유료 전문가 검토를 엽니다.

`PAID_COUNSEL_NOW = NO`. 유료 검토를 미루는 것은 법률 의무가 없다는 뜻이 아니라, 현재 Phase 1에서 의무를 유발할 수 있는 optional processing을 실행하지 않는다는 뜻입니다.

## Scope / Non-Certification Boundary

- 검토 범위: South Korea, Japan, EU/EEA, United States common baseline, California overlay.
- 조사 대상: core stateless recommendation, guest continuity, Analytics, account, persistent personalization, consent receipt와 PostHog processor boundary.
- 이 문서는 법률 의견, 전세계 compliance 인증, GDPR/PIPA/APPI/CCPA PASS 또는 Production 승인 문서가 아닙니다.
- 적용 가능성은 실제 사용자 위치, 사업자 지위, 처리 목적, 데이터 흐름, 계약과 출시 사실에 따라 달라질 수 있습니다.
- 개별 관할 결론은 Founder Product policy 결정 전의 recommendation입니다.

## Current Product / Privacy Architecture

| Dimension | Current state |
| --- | --- |
| Core recommendation | Guest-first and account-free architecture |
| Analytics provider | PostHog Cloud selected, EU Cloud project, zero event |
| Analytics transport | MyOTT same-origin privacy relay implemented locally |
| Browser SDK | Phase 1 not eligible under strict withdrawal contract |
| Consent runtime | Provider-neutral fail-closed foundation ready |
| Privacy Center | Foundation ready, public mount 0 |
| Consent persistence | Signed first-party receipt architecture selected, implementation 0 |
| Jurisdiction mapping | Approved country mappings 0 |
| Product event wiring | 0 |
| Live Analytics | 0 |
| Build | Blocked by exact local dependency graph availability |

## Research Method

- Official statutes, regulators, government guidance and provider primary materials were preferred.
- Search-result summaries were not treated as authority when an official page was available.
- A version or hosting-region statement was not converted into a compliance conclusion.
- Facts not provable without account-specific, business-specific or legal analysis remain `NOT_PROVEN` or `LEGAL_REVIEW_REQUIRED`.
- No account login, live Product request, PostHog event, deployment or paid legal contact occurred.

## Official Primary Sources

| Jurisdiction | Authority | Source | Effective/update date | Accessed | Decision-relevant claim | Confidence | Limitation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| KR | Korea National Law Information Center | [Personal Information Protection Act](https://law.go.kr/LSW/lsInfoP.do?lsiSeq=270351) | Current law page; amendment effective 2026-09-11 shown | 2026-09-11 | Purpose, transparency, security and privacy-policy duties remain relevant to personal-information processing. | High | Applicability to each MyOTT datum still depends on facts. |
| KR | Korea National Law Information Center | [PIPA Article 28-8 overseas transfers](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334953) | Version effective 2025-10-02 shown | 2026-09-11 | Overseas transfer requires an applicable statutory basis; consent is one possible basis, not the only one. | High | Exact basis for MyOTT/PostHog is not selected here. |
| KR | Korea National Law Information Center | [Article 28-8 transfer notice items](https://law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1033215841) | Current official text | 2026-09-11 | Transfer notice may need categories, destination, timing/method, recipient, purpose/retention and refusal effects. | High | Final notice depends on actual activated flow. |
| KR | Korea National Law Information Center | [PIPA Article 38 rights procedure](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?ancYnChk=&chrClsCd=010202&lsJoLnkSeq=1022695287) | Current official text | 2026-09-11 | Rights procedures must be disclosed and should not be harder than collection procedures. | High | Does not decide exact MyOTT interface. |
| KR | Personal Information Protection Commission | [Overseas transfer overview](https://m.pipc.go.kr/np/default/page.do?mCode=D060040000) | Current regulator page | 2026-09-11 | Transfer basis, notices and safeguards require explicit review. | High | General guidance, not a MyOTT-specific ruling. |
| KR | Personal Information Protection Commission | [Privacy-policy overseas-transfer disclosure release](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=9969) | Current official release | 2026-09-11 | Privacy policies should identify direct foreign collection country and transfer legal basis where applicable. | Medium | Explanatory release, not full statutory analysis. |
| JP | Personal Information Protection Commission | [APPI General Guidelines](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/) | Law numbering noted through 2026-06-14 | 2026-09-11 | Specify and notify/publish use purposes; provide retained-data rights and appropriate safeguards. | High | Japanese regulator guidance; MyOTT factual applicability remains open. |
| JP | Personal Information Protection Commission | [Foreign Third Party Guidelines](https://www.ppc.go.jp/personalinfo/legal/guidelines_offshore/) | Partially revised 2025-12 | 2026-09-11 | Foreign transfer consent or an applicable alternative requires country/system/recipient safeguard information and ongoing measures where relevant. | High | Exact transfer role and route need legal review. |
| JP | Personal Information Protection Commission | [APPI FAQ](https://www.ppc.go.jp/personalinfo/faq/APPI_QA/) | Current regulator FAQ | 2026-09-11 | Cookie identifiers can be personal-related information; retention should follow necessity rather than an assumed universal period. | High | FAQ answers are scenario-dependent. |
| JP | Personal Information Protection Commission | [Foreign-transfer consent FAQ](https://www.ppc.go.jp/all_faq_index/faq2-q5-8/) | Current regulator FAQ | 2026-09-11 | Information provision before foreign-transfer consent is a distinct requirement. | High | Does not select a MyOTT transfer basis. |
| EU/EEA | European Union | [General Data Protection Regulation](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679) | Applicable since 2018-05-25 | 2026-09-11 | Lawfulness, transparency, purpose limitation, minimization, consent withdrawal, processor contracts and Chapter V transfers are separate duties. | High | ePrivacy and Member State rules also matter. |
| EU/EEA | European Union | [ePrivacy Directive](https://eur-lex.europa.eu/eli/dir/2002/58/oj?locale=en) | Consolidated official text | 2026-09-11 | Terminal storage/access generally requires clear information and consent unless strictly necessary. | High | National implementation varies. |
| EU/EEA | European Data Protection Board | [Guidelines 05/2020 on consent](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf) | Adopted 2020-05-04 | 2026-09-11 | Valid consent must be freely given, specific, informed and unambiguous; withdrawal must be available. | High | Guidance is not MyOTT-specific legal advice. |
| EU/EEA | European Data Protection Board | [Guidelines 2/2023 on ePrivacy Article 5(3)](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en) | Final 2024-10-16 | 2026-09-11 | Article 5(3) applies across storage/access techniques, not only traditional cookies. | High | Member State enforcement details differ. |
| US | Federal Trade Commission | [Privacy and Security](https://www.ftc.gov/business-guidance/privacy-security) | Current federal regulator hub | 2026-09-11 | Companies should honor privacy promises, minimize data and secure what they retain. | High | The United States has no single omnibus federal private-sector privacy regime equivalent to GDPR. |
| US | Federal Trade Commission | [Start with Security](https://www.ftc.gov/business-guidance/resources/start-security-guide-business) | Current business guidance | 2026-09-11 | Collect only necessary data and restrict access according to need. | High | General enforcement guidance. |
| US | Federal Trade Commission | [Privacy and Security Enforcement](https://www.ftc.gov/news-events/topics/protecting-consumer-privacy-security/privacy-security-enforcement) | Current enforcement hub | 2026-09-11 | Misleading privacy promises and inadequate safeguards can create enforcement exposure. | High | Does not replace state-law analysis. |
| US-CA | California Privacy Protection Agency | [CCPA FAQ](https://cppa.ca.gov/faq) | Revenue threshold effective 2025-01-01 shown | 2026-09-11 | Applicability depends on for-profit business facts and thresholds; browsing, geolocation and inferences can be personal information. | High | MyOTT threshold and business facts are not proven. |
| US-CA | California Privacy Protection Agency | [CCPA Regulations](https://cppa.ca.gov/regulations/) | Current regulator page | 2026-09-11 | Current statute/regulations and later amendments must be consulted for notice, rights and service-provider controls. | High | No MyOTT-specific determination. |
| US-CA | California Privacy Protection Agency | [CCPA statute effective 2026-01-01](https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf) | 2026-01-01 | 2026-09-11 | Service-provider/contractor relationships require written restrictions and purpose-proportionate processing. | High | Applicability and role assignment remain factual/legal questions. |
| US-CA | California Attorney General | [California Consumer Privacy Act](https://oag.ca.gov/privacy/ccpa) | Current official page | 2026-09-11 | Covered businesses face notice, access/deletion/correction and sale/share opt-out duties. | High | Coverage thresholds are not established for MyOTT. |
| Provider | PostHog | [Privacy policy](https://posthog.com/privacy) | Current provider policy | 2026-09-11 | PostHog describes EU hosting in Germany and transfer mechanisms including SCCs where applicable. | Medium | Provider statement is not MyOTT compliance proof. |
| Provider | PostHog | [Data Processing Addendum](https://posthog.com/dpa) | Current provider terms | 2026-09-11 | Customer is generally controller and PostHog processor; account-generated countersigned DPA, not preview text alone, is the operative artifact. | High | Execution/applicability remains unverified. |
| Provider | PostHog | [Subprocessors](https://posthog.com/subprocessors) | Updated 2026-06-12 | 2026-09-11 | EU Cloud uses AWS Germany for hosting while some infrastructure, including global edge services, can participate in transit. | High | List can change and must be rechecked before activation. |
| Provider | PostHog | [Data storage](https://posthog.com/docs/privacy/data-storage) | Current provider documentation | 2026-09-11 | EU data is stored in Frankfurt; IP discard prevents storage but transformations may use IP before discard. | High | `IP_DISCARD_ENABLED` is not zero transport-level IP processing. |

## Feature-Reduction Ladder

| Level | Product mode | Data surface | Phase 1 use |
| --- | --- | --- | --- |
| 1 | Stateless recommendation | Request-scoped preference and provider response only | Preferred launch core |
| 2 | Local UI preference only | Non-account local presentation settings | Allowed only after an exact privacy/storage contract |
| 3 | Session-only Analytics | Ephemeral measurement identity and five canonical events | Disabled until jurisdiction, consent, Security and activation Gates pass |
| 4 | Persistent continuity/account/personalization | Cross-session or identified state | Deferred |

Reduction order under uncertainty: Analytics off, persistence off, account off, then restrict the region before weakening privacy constraints.

## Supported Operating Modes

| Mode | Core recommendation | Guest continuity | Analytics | Account | Persistent personalization |
| --- | --- | --- | --- | --- | --- |
| `STATELESS_RECOMMENDATION_ONLY` | On | Off | Off | Off | Off |
| `SESSION_ANALYTICS_OPTIONAL` | On | Off | Opt-in and policy-gated | Off | Off |
| `PERSISTENT_GUEST_OPTIONAL` | On | Opt-in/policy-gated | Separately gated | Off | Limited |
| `ACCOUNT_OPTIONAL` | On | Separately gated | Separately gated | Explicit opt-in | Account-scoped only |

Only `STATELESS_RECOMMENDATION_ONLY` is recommended now.

## Phase 1 Feature Classification Contract

Allowed status values are:

- `ALLOWED_BY_CURRENT_PRODUCT_POLICY`
- `OPT_IN_REQUIRED`
- `FEATURE_DISABLED`
- `NOT_PROVEN`
- `LEGAL_REVIEW_REQUIRED`
- `REGION_DEFERRED`

These are Product policy classifications, not statements that a statute affirmatively permits every implementation detail.

## South Korea

`SUPPORTED_MODE = STATELESS_RECOMMENDATION_ONLY`
`CORE_STATELESS_RECOMMENDATION = SUPPORTED_WITH_REQUIREMENTS`

| Feature | Status | Basis / condition |
| --- | --- | --- |
| Core stateless recommendation | `ALLOWED_BY_CURRENT_PRODUCT_POLICY` | Keep request data bounded, publish accurate purposes/notices and apply security controls. |
| Guest continuity | `FEATURE_DISABLED` | Identity, retention, rights and consent/legal-basis details are not implemented. |
| Analytics | `FEATURE_DISABLED` | Overseas-transfer basis/notice, processor terms, consent and withdrawal implementation require review. |
| Account | `FEATURE_DISABLED` | Optional-account legal and operational controls are deferred. |
| Guest-to-account merge | `FEATURE_DISABLED` | Account and continuity remain off. |
| Persistent personalization | `FEATURE_DISABLED` | Retention, rights and purpose limitation contract absent. |
| Consent / signed receipt | `LEGAL_REVIEW_REQUIRED` | Cookie/storage classification, expiry, withdrawal and replay lifecycle unresolved. |
| Privacy Center requirements | `LEGAL_REVIEW_REQUIRED` | Purpose, categories, transfer, retention, rights/contact and change/withdraw controls need final drafting. |
| PostHog processor disclosure | `LEGAL_REVIEW_REQUIRED` | Entrustment/processor role and exact public disclosure require activated-flow review. |
| Cross-border / transfer review | `LEGAL_REVIEW_REQUIRED` | Exact Article 28-8 basis and notice path are not selected. |

`KR_ANALYTICS_LEGAL_MINIMUM = NOT_PROVEN`; `KR_ANALYTICS_POLICY_STATE = ANALYTICS_OFF`; `KR_PHASE1_PRODUCT_POLICY = ANALYTICS_OFF`.

## Japan

`SUPPORTED_MODE = STATELESS_RECOMMENDATION_ONLY`
`CORE_STATELESS_RECOMMENDATION = SUPPORTED_WITH_REQUIREMENTS`

| Feature | Status | Basis / condition |
| --- | --- | --- |
| Core stateless recommendation | `ALLOWED_BY_CURRENT_PRODUCT_POLICY` | Specify purpose, minimize retained data and provide accurate public information. |
| Guest continuity | `FEATURE_DISABLED` | Personal-related/personal-data classification and retention/right handling remain unresolved. |
| Analytics | `FEATURE_DISABLED` | Foreign-transfer role, information provision, consent/alternative basis and provider safeguards require review. |
| Account | `FEATURE_DISABLED` | Account-linked data and cross-border processing are not approved. |
| Guest-to-account merge | `FEATURE_DISABLED` | Account and continuity remain off. |
| Persistent personalization | `FEATURE_DISABLED` | Purpose, retention and user-right mechanics are not implemented. |
| Consent / signed receipt | `LEGAL_REVIEW_REQUIRED` | Receipt classification, duration, integrity and deletion treatment unresolved. |
| Privacy Center requirements | `LEGAL_REVIEW_REQUIRED` | Purpose, categories, foreign transfer, retention, rights/contact and consent controls need final drafting. |
| PostHog processor disclosure | `LEGAL_REVIEW_REQUIRED` | Provider role and disclosed safeguards require activated-flow review. |
| Cross-border / transfer review | `LEGAL_REVIEW_REQUIRED` | Exact APPI foreign-transfer condition and information path are not selected. |

`JP_ANALYTICS_LEGAL_MINIMUM = NOT_PROVEN`; `JP_ANALYTICS_POLICY_STATE = ANALYTICS_OFF`; `JP_PHASE1_PRODUCT_POLICY = ANALYTICS_OFF`.

## EU / EEA

`SUPPORTED_MODE = STATELESS_RECOMMENDATION_ONLY`
`CORE_STATELESS_RECOMMENDATION = SUPPORTED_WITH_REQUIREMENTS`

| Feature | Status | Basis / condition |
| --- | --- | --- |
| Core stateless recommendation | `ALLOWED_BY_CURRENT_PRODUCT_POLICY` | Use minimization, transparency, security and a documented lawful basis for any personal-data processing. |
| Guest continuity | `FEATURE_DISABLED` | Persistent identifier/storage and lawful-basis/rights details are deferred. |
| Analytics | `FEATURE_DISABLED` | Nonessential terminal storage/access uses explicit opt-in as the conservative minimum; GDPR lawful basis, withdrawal, processor and transfer controls also remain. |
| Account | `FEATURE_DISABLED` | Account processing, rights and retention implementation are deferred. |
| Guest-to-account merge | `FEATURE_DISABLED` | Account and continuity remain off. |
| Persistent personalization | `FEATURE_DISABLED` | Profiling/lawful basis/minimization and rights require a separate Gate. |
| Consent / signed receipt | `LEGAL_REVIEW_REQUIRED` | Proof, expiry, integrity, cookie/storage status and withdrawal propagation unresolved. |
| Privacy Center requirements | `LEGAL_REVIEW_REQUIRED` | Controller identity, purposes, bases, recipients/transfers, retention, rights and withdrawal need final drafting. |
| PostHog processor disclosure | `LEGAL_REVIEW_REQUIRED` | Article 28 role/DPA, subprocessors and public notice require activated-flow review. |
| Cross-border / transfer review | `LEGAL_REVIEW_REQUIRED` | Chapter V mechanism and actual subprocessor/transit path are not finally verified. |

`EU_EEA_NONESSENTIAL_TERMINAL_ACCESS = EXPLICIT_OPT_IN_REQUIRED`; `EU_EEA_ANALYTICS_POLICY_STATE = ANALYTICS_OFF`; `EU_EEA_PHASE1_PRODUCT_POLICY = ANALYTICS_OFF`. GDPR and ePrivacy are distinct layers, and Member State implementation can add variation.

## United States Common Baseline

`SUPPORTED_MODE = STATELESS_RECOMMENDATION_ONLY`
`CORE_STATELESS_RECOMMENDATION = SUPPORTED_WITH_REQUIREMENTS`

| Feature | Status | Basis / condition |
| --- | --- | --- |
| Core stateless recommendation | `ALLOWED_BY_CURRENT_PRODUCT_POLICY` | Make accurate disclosures, collect only needed data and apply reasonable safeguards. |
| Guest continuity | `FEATURE_DISABLED` | State-law coverage and rights/notice details have not been mapped. |
| Analytics | `FEATURE_DISABLED` | State applicability, notice, opt-out/consent and sensitive-data boundaries are incomplete. |
| Account | `FEATURE_DISABLED` | State coverage, rights and retention mechanics are deferred. |
| Guest-to-account merge | `FEATURE_DISABLED` | Account and continuity remain off. |
| Persistent personalization | `FEATURE_DISABLED` | Profiling/targeted-advertising classifications are not reviewed. |
| Consent / signed receipt | `LEGAL_REVIEW_REQUIRED` | State-specific treatment and retention have not been mapped. |
| Privacy Center requirements | `LEGAL_REVIEW_REQUIRED` | Notice, rights, state applicability, retention and opt-out/consent content need final drafting. |
| PostHog processor disclosure | `LEGAL_REVIEW_REQUIRED` | Service-provider/contractor role and contract/disclosure facts require review if a state law applies. |
| Cross-border / transfer review | `NOT_PROVEN` | No uniform US transfer rule is asserted; federal, state, contract and provider facts remain separate. |

`US_COMMON_ANALYTICS_LEGAL_MINIMUM = NOT_PROVEN`; `US_ANALYTICS_POLICY_STATE = ANALYTICS_OFF`; `US_PHASE1_PRODUCT_POLICY = ANALYTICS_OFF`.

## California Overlay

CCPA applicability is `NOT_PROVEN`: the required revenue, processing-volume, sale/share and business-status facts have not been established. If covered, notice-at-collection/privacy-policy, consumer rights, sale/share handling and service-provider contractual restrictions need an implementation Gate. Phase 1 Product policy remains `ANALYTICS_OFF`, account off and persistent personalization off, so no CCPA non-applicability claim is needed to preserve the stateless core.

## Other US States Boundary

`US_OTHER_STATE_MAPPING = DEFERRED_OK_FOR_STATELESS_NO_ANALYTICS_NO_ACCOUNT_PHASE1_ONLY`.

This means optional data features are disabled while mapping is incomplete. It does not mean other state laws do not apply. Any state-targeted launch, Analytics activation, account, persistent identifier, sale/share, targeted advertising, sensitive data or material scale triggers a fresh state-law mapping Gate.

## Non-Target Jurisdictions

Non-target countries are `REGION_DEFERRED` for optional data features. Analytics, guest persistence, account and persistent personalization remain off. A future country signal may map to a reviewed stateless policy only after Founder approval; unknown, unsupported or review-required results remain fail-closed.

## Core Stateless Recommendation Matrix

| Region | Status | Required Product controls |
| --- | --- | --- |
| KR | `ALLOWED_BY_CURRENT_PRODUCT_POLICY` | Data minimization, accurate notice, bounded retention, security |
| JP | `ALLOWED_BY_CURRENT_PRODUCT_POLICY` | Purpose specification/publication, minimization, security |
| EU/EEA | `ALLOWED_BY_CURRENT_PRODUCT_POLICY` | Lawful-basis documentation, transparency, minimization, security |
| US | `ALLOWED_BY_CURRENT_PRODUCT_POLICY` | Accurate representations, minimization, reasonable safeguards |
| Other | `REGION_DEFERRED` | No optional feature activation; explicit future review |

## Guest Continuity Matrix

| Region | Phase 1 | Reopen condition |
| --- | --- | --- |
| KR | `FEATURE_DISABLED` | Identity, purpose, retention, rights and transfer review |
| JP | `FEATURE_DISABLED` | Data classification, purpose, retention, transfer review |
| EU/EEA | `FEATURE_DISABLED` | Lawful basis, storage, rights, retention and ePrivacy review |
| US | `FEATURE_DISABLED` | State mapping, notice, rights and retention review |

## Analytics Matrix

| Region | Legal minimum conclusion | MyOTT Phase 1 policy |
| --- | --- | --- |
| KR | `NOT_PROVEN` | `FEATURE_DISABLED` |
| JP | `NOT_PROVEN` | `FEATURE_DISABLED` |
| EU/EEA | `OPT_IN_REQUIRED` for conservative nonessential terminal-access baseline, plus GDPR Gates | `FEATURE_DISABLED` |
| US | `NOT_PROVEN`; federal representations/security plus state overlays | `FEATURE_DISABLED` |

The relay implementation, EU project and token configuration do not activate Analytics or establish compliance.

## Account Matrix

All reviewed regions: `FEATURE_DISABLED`. Account remains optional and is not a Phase 1 launch blocker. Reopening requires purpose, data inventory, user rights, deletion/export, retention, Auth security and jurisdiction policy.

## Persistent Personalization Matrix

All reviewed regions: `FEATURE_DISABLED`. MyOTT must not infer that Product value requires persistent profiling. Reopening requires an explicit Product value case and separate privacy/legal/security review.

## Consent / Signed Receipt Matrix

| Question | Current status |
| --- | --- |
| Architecture selected | Server-verifiable signed first-party consent receipt |
| Runtime implementation | `FEATURE_DISABLED` |
| Signing secret | Not created |
| Cookie/storage classification | `LEGAL_REVIEW_REQUIRED` |
| Exact expiry/retention | `LEGAL_REVIEW_REQUIRED` |
| Withdrawal and stale-allow replay | Security and implementation review required |
| Receipt in PostHog payload | Prohibited |
| Guest/account/Analytics identity | Receipt must not become any of these identities |

## Jurisdiction Signal Boundary

- Vercel request country hint is an approximate, IP-derived technical signal.
- `COUNTRY_HINT != LEGAL_JURISDICTION`.
- `UI_LOCALE`, `PROVIDER_REGION`, timezone and `Accept-Language` cannot grant legal eligibility.
- Raw IP and country hint are not persisted by MyOTT for Analytics.
- Registry output must be versioned and provider-neutral.
- Unknown, unsupported and review-required outputs keep nonessential Analytics off.

## PostHog Processor Boundary

- PostHog remains a provider projection; MyOTT owns event meaning, property policy, eligibility and KPI definitions.
- EU Cloud hosting does not itself establish GDPR, PIPA, APPI or US compliance.
- PostHog's DPA preview is not a countersigned operative DPA.
- Subprocessor and transfer lists are time-sensitive and require pre-activation readback.
- IP discard means no provider storage of the IP under the documented setting, not zero transit or pre-discard processing.
- No live event, SDK, Product event wiring or deployment consumption is authorized.

## Privacy Center Route Requirements

Before public mount, a Privacy Center must provide jurisdiction-appropriate, accessible, equal-status allow/deny/withdraw controls where Analytics can be offered; explain session-only/no-persistent-Analytics-ID behavior; expose effective policy state separately from the user's choice; provide current provider/transfer disclosures as required; and remain useful when Analytics is unavailable. The current unmounted copy/model foundation is not proof of a compliant public notice.

| Future route | Current status | Required content categories |
| --- | --- | --- |
| `/privacy/kr` | `LEGAL_REVIEW_REQUIRED` | Product purpose/data, stateless mode, receipt, Analytics/provider, overseas transfer, retention, choice change, rights/contact |
| `/privacy/jp` | `LEGAL_REVIEW_REQUIRED` | Use purpose/data, stateless mode, receipt, Analytics/provider, foreign transfer, retention, choice change, rights/contact |
| `/privacy/eu` | `LEGAL_REVIEW_REQUIRED` | Controller, purposes/bases, data, terminal access, receipt, processor/transfers, retention, withdrawal and rights/contact |
| `/privacy/us` | `LEGAL_REVIEW_REQUIRED` | Notice categories, use/disclosure, state applicability, provider role, retention, choices and rights/contact |
| `/privacy/global` | `LEGAL_REVIEW_REQUIRED` | Reviewed scopes, unreviewed-region limitations, intentionally disabled collection/storage, expansion policy and authority links |

`PRIVACY_CENTER_ROUTE_IMPLEMENTATION = 0`; `PRIVACY_CENTER_PUBLIC_MOUNT = 0`.

## Retention / Deletion Questions

The following are unresolved and must not be guessed:

- Exact server log and relay metadata retention.
- PostHog project retention and deletion readback at activation time.
- Signed receipt expiry and deletion lifecycle.
- Whether a valid prior allow receipt can be replayed after withdrawal or policy revision.
- Rights-request intake, identity verification and response flow by jurisdiction.
- Provider/subprocessor deletion propagation and contractual timelines.

## Feature-Reduction Outcomes

| Region | Level 1 stateless | Level 2 local preference | Level 3 session Analytics | Level 4 persistence/account |
| --- | --- | --- | --- | --- |
| KR | Yes | Yes, only under a future exact storage contract | No | No |
| JP | Yes | Yes, only under a future exact storage contract | No | No |
| EU/EEA | Yes | Yes, only under a future exact storage/ePrivacy contract | No | No |
| US | Yes | Yes, only under a future state-aware contract | No | No |

The table records a Product risk-reduction recommendation, not statutory permission.

## Paid-Counsel Future Trigger Matrix

| Trigger | Paid review state |
| --- | --- |
| Stateless launch with optional data features off | Hold |
| Analytics activation in any target jurisdiction | Reconsider; required if official-source mapping remains ambiguous |
| Signed consent receipt public implementation | Reconsider for retention, proof and jurisdiction treatment |
| Account or guest-account merge | Reconsider |
| Persistent personalization/profiling | Reconsider |
| New state/country launch with meaningful traffic | Reconsider |
| Regulator inquiry, complaint, acquisition diligence or material enterprise contract | Open |
| Sale/share, targeted advertising, sensitive data or children's use | Open before implementation |

## Founder Product Policy Options

1. **Option A: Stateless global-first core.** Keep Analytics, guest continuity, accounts and persistent personalization off. Lowest current complexity and recommended.
2. **Option B: Region-bounded Analytics pilot.** Select one reviewed jurisdiction, complete legal/consent/Security/runtime/browser Gates, then activate only there.
3. **Option C: Persistent growth features.** Add guest/account/personalization only after a Product-value case and paid specialist review where warranted.

## Recommended Phase 1 Operating Policy

`RECOMMENDATION = OPTION_A_STATELESS_GLOBAL_FIRST_CORE`.

- Reviewed launch policy: `STATELESS_RECOMMENDATION_ONLY`.
- Analytics: off.
- Guest continuity: off.
- Account: off.
- Persistent personalization: off.
- Jurisdiction registry: only Founder-approved mappings; otherwise fail closed for optional features.
- Privacy Center: remain unmounted until persistence, policy and build/runtime Gates pass.
- Paid counsel: not required now for this deliberately reduced operating mode, but future triggers above remain binding.

This recommendation preserves Product usefulness while deferring optional processing. Founder approval is required before it becomes binding Product policy.

## Known Unknowns

- MyOTT operating entity, establishment, revenue, user-volume and exact launch-country facts.
- Whether California or another US state threshold applies.
- Exact Korean/Japanese transfer basis and notices for the activated PostHog flow.
- EU/EEA Member State ePrivacy variations and precise lawful basis by processing step.
- DPA execution, subprocessor/transfer readback and project retention at activation time.
- Server/hosting log fields and retention in the deployed architecture.
- Signed consent receipt legal classification, expiry, deletion and replay protection.
- Final Privacy Center notice, rights procedure and contact identity.
- Children/minor audience facts, sensitive-data processing, advertising or sale/share facts.
- Production parity, final build, Security Seal and deployment evidence.
