# Guest Account Data Continuity Architecture

Status: PRODUCT ARCHITECTURE CONTRACT / IMPLEMENTATION NOT AUTHORIZED

Task: `MYOTT_GUEST_CONTINUITY_OPTIONAL_ACCOUNT_DATA_BOUNDARY_V1`

## 1. Authority And Scope

이 문서는 MyOTT의 Guest에서 Returning Guest, Optional Account로 이어지는 Product 데이터 경계를 정의합니다. [Public Launch Global-First Architecture](PUBLIC_LAUNCH_GLOBAL_FIRST_ARCHITECTURE.md)의 `FREE_FIRST / GLOBAL_FIRST / GUEST_FIRST / OPTIONAL_ACCOUNT` 방향을 구체화하고, [Data Policy](../data-policy.md)와 [User and Session Domain](../database/user-domain.md)의 초안을 Product 운영 계약에 맞게 조정합니다.

```text
CORE_RECOMMENDATION_REQUIRES_ACCOUNT = NO
ACCOUNT_REQUIRED_FOR_CORE_RECOMMENDATION = NO
CURRENT_ACTUAL_METRICS = NOT_COLLECTED / NOT_ASSERTED
```

이 문서는 DB, Supabase, Auth, cookie, storage, analytics, tracking, Security, Release, Production 또는 Deployment 구현을 승인하지 않습니다. 기존 문서의 보관 기간과 테이블·컬럼은 명시적으로 승인된 경우를 제외하고 `CURRENT_DESIGN_CANDIDATE`입니다.

## 2. Guest-First Product Contract

Guest는 계정 생성 없이 다음 핵심 흐름을 완료할 수 있어야 합니다.

1. Product 열기
2. OTT, 콘텐츠 타입과 선호 조건 선택
3. 좋아하는 작품 입력
4. 추천 요청과 결과 수신
5. 결과 및 상세 확인
6. 추천 반복

핵심 가치 전에 signup wall이나 social login을 강제하지 않습니다. 계정 제안은 거절하거나 건너뛸 수 있어야 하며, 시각적 또는 언어적 dark pattern으로 계정 생성을 강요하지 않습니다.

## 3. Guest Identity

```text
GUEST_ID = RANDOM / NON_SEMANTIC / PSEUDONYMOUS / FIRST_PARTY
```

Guest ID는 MyOTT continuity 범위에서만 의미가 있는 무작위 식별자입니다. 이름, 이메일, IP, device fingerprint, 위치, account identity 또는 provider identity를 인코딩하지 않습니다.

다음 방식은 금지합니다.

- device/browser 신호로 deterministic fingerprint 생성
- cross-site identity 생성 또는 공유
- 제3자 식별자와 숨은 linkage 구성
- guest ID로 국적, 거주지 또는 법적 관할 추론

Guest ID는 익명성의 법적 판정을 자동으로 뜻하지 않습니다. 다른 데이터와 결합 가능성이 있으면 pseudonymous data로 다루고 적용 정책을 별도로 검토합니다.

## 4. Purpose Separation

Guest identity와 연결 가능한 데이터는 목적별로 분리합니다.

| Purpose domain | Allowed use | Boundary |
| --- | --- | --- |
| `PRODUCT_CONTINUITY` | `SESSION_CONTINUITY`, `RECENT_RECOMMENDATION_HISTORY`, `SEEN_RESULT_AVOIDANCE`, `REPEAT_RECOMMENDATION_REDUCTION` | 핵심 기능과 명확히 승인된 continuity에만 사용 |
| `USER_EXPLICIT_SAVE_IF_GUEST_SAVE_IS_LATER_APPROVED` | 사용자가 직접 저장을 선택한 경우의 미래 기능 | 현재 미구현이며 별도 Product/Privacy Gate 필요 |
| `ANALYTICS_MEASUREMENT` | 승인된 event contract에 따른 미래 집계 | continuity 저장을 analytics 동의로 간주하지 않음 |
| `MARKETING` | 현재 baseline 없음 | 별도 명시적 승인과 관할별 검토 없이는 사용 금지 |

한 목적의 식별자나 record를 다른 목적으로 자동 재사용하지 않습니다. 특히 `PRODUCT_CONTINUITY`는 `ANALYTICS_MEASUREMENT` 또는 `MARKETING`의 포괄적 근거가 아닙니다.

## 5. Minimum Guest Data

승인된 구현은 선택된 목적에 필요한 최소 category만 채택해야 합니다.

| Candidate category | Purpose | Current status |
| --- | --- | --- |
| `guest_id`, `created_at`, `last_active_at` | bounded continuity lifecycle | `TARGET / NOT_IMPLEMENTED` |
| submitted preference snapshot 또는 normalized reference | 사용자가 제출한 추천 context 유지 | `TARGET / NOT_IMPLEMENTED` |
| recent recommendation content identities | 반복 결과 감소 | `TARGET / NOT_IMPLEMENTED` |
| recent opened/detail content identities | 이미 확인한 결과 회피 | `TARGET / NOT_IMPLEMENTED` |
| explicit feedback | 해당 기능이 별도 승인·구현된 경우 | `CONDITIONAL TARGET / NOT_IMPLEMENTED` |
| locale preference | persistence가 별도 승인된 경우 | `CONDITIONAL TARGET / NOT_IMPLEMENTED` |
| consent state와 policy version | 적용 정책상 필요한 경우 | `LEGAL_REVIEW_REQUIRED / NOT_IMPLEMENTED` |

기본 수집 대상에는 장기 raw IP, precise location, full user-agent fingerprint, 연락처, 이름, 이메일, 전화번호, 주소 또는 민감 특성을 포함하지 않습니다. 자유 입력은 개인정보가 포함될 수 있으므로 저장 범위와 필터링을 구현 Gate에서 별도로 검토합니다.

## 6. Retention Classes

기간보다 class와 삭제 trigger를 먼저 확정합니다.

| Class | Purpose | Identity level | Deletion trigger | Account merge | Review dependency |
| --- | --- | --- | --- | --- | --- |
| `EPHEMERAL_REQUEST` | 현재 요청 처리 | request-scoped 또는 비식별 | 요청 완료, 오류 종료 또는 짧은 기술적 expiry | `NO`가 기본 | operational/privacy review |
| `SHORT_GUEST_CONTINUITY` | 재방문 continuity와 bounded repeat avoidance | pseudonymous guest | user reset, expiry 또는 purpose 종료 | explicit confirmation 후 `POSSIBLE` | storage/consent/legal review |
| `PRODUCT_HISTORY` | 명시적으로 보존된 추천·저장·feedback history | guest 또는 account scoped | user deletion, account deletion 또는 승인된 expiry | explicit merge에서 `POSSIBLE` | Product/privacy/legal review |
| `AGGREGATE_ANALYTICS` | 승인된 집계 measurement | sufficiently de-identified aggregate | metric purpose 종료, threshold failure 또는 policy expiry | `NO` | measurement/consent/legal review |
| `ACCOUNT_PERSONAL_DATA` | optional account 기능 | account linked | user deletion, account deletion 또는 purpose 종료 | merge destination | Auth/privacy/legal review |
| `SECURITY_OPERATIONAL_LOG` | abuse, integrity와 incident 대응 | 최소 operational identity | security retention expiry 또는 incident hold 종료 | `NO` | Security/legal/operations review |

[Data Policy](../data-policy.md)의 30일·90일 등 기존 기간은 `CURRENT_DESIGN_CANDIDATE`이며 `FINAL_POLICY`가 아닙니다. 실제 기간, backup 처리, 관할별 예외와 삭제 주기는 Legal/Privacy 승인 없이는 확정하지 않습니다.

## 7. Repeat Avoidance

Privacy-safe repeat avoidance는 다음 bounded identity set을 후보로 사용합니다.

- 최근 추천된 canonical content ID
- 최근 opened/detail canonical content ID
- 별도 구현된 경우 사용자가 명시한 `already seen`
- 별도 구현된 경우 사용자가 명시한 `dislike` 또는 `not interested`

History는 retention class와 최대 범위를 가져야 하며 영구 behavioral surveillance가 되어서는 안 됩니다. Expiry와 user reset 후에는 더 이상 개인 continuity 판단에 사용하지 않습니다. 이 문서는 추천 engine, score, rank, eligibility, hard filter 또는 request budget을 변경하지 않습니다.

## 8. Optional Account And Minimum Account Data

Account는 사용자가 추천 가치를 경험한 뒤 선택할 수 있습니다. 현재 account-only 후보는 모두 구현 약속이 아니라 다음 상태입니다.

```text
LONGER_RECOMMENDATION_HISTORY = TARGET / NOT_IMPLEMENTED
SAVE_OR_WATCH_LATER = TARGET / NOT_IMPLEMENTED
TASTE_PROFILE = TARGET / NOT_IMPLEMENTED
CROSS_DEVICE_CONTINUITY = TARGET / NOT_IMPLEMENTED
LONG_TERM_PREFERENCE_MEMORY = TARGET / NOT_IMPLEMENTED
ACCOUNT_MANAGED_DELETION_OR_EXPORT = TARGET / NOT_IMPLEMENTED
OPTIONAL_ALERTS = TARGET / NOT_IMPLEMENTED
```

Account data ownership은 분리합니다.

| Boundary | Responsibility |
| --- | --- |
| `AUTH_PROVIDER_DATA` | credential, provider subject와 인증 lifecycle; 가능한 한 auth provider가 소유 |
| `MYOTT_SERVICE_PROFILE_DATA` | MyOTT 기능에 필요한 최소 internal account ID와 명시적 service state |

MyOTT Product data에 이메일 원문을 불필요하게 복제하지 않습니다. 실명, 생년월일, 전화번호와 주소는 기본 account 요건이 아니며 미래의 별도 승인 기능 또는 법적 요구가 있을 때만 검토합니다.

## 9. Guest-To-Account Merge Lifecycle

```text
GUEST_ACTIVE
-> ACCOUNT_CREATED_OR_SIGNED_IN
-> MERGE_OFFERED
-> USER_CONFIRMED_MERGE
-> MERGE_EXECUTED
-> OLD_GUEST_LINKAGE_RETIRED_OR_MINIMIZED
```

Login만으로 merge하지 않습니다. `MERGE_OFFERED`는 이동할 데이터 category, 목적, 보존 영향과 거절 가능한 범위를 설명해야 합니다. 사용자가 확인한 뒤에만 merge를 실행하고, 거절한 경우 guest data는 기존 retention 계약을 따릅니다.

Merge는 canonical content ID 기준으로 history를 dedupe합니다. 명시적 save와 feedback은 inferred activity보다 우선하며, double counting을 막는 데 필요한 최소 provenance만 유지합니다. Merge 완료 후 불필요한 장기 guest-to-account linkage는 retire하거나 최소화합니다.

### 9.1 Deterministic Conflict Rules

| Conflict | Precedence |
| --- | --- |
| account explicit save vs guest inferred interest | account explicit save |
| explicit dislike/not-interested vs inferred click | explicit dislike/not-interested |
| explicit user correction vs inferred preference | explicit user correction |
| same canonical content ID in both histories | one deduplicated history identity |

이 precedence는 데이터 소유권과 merge 결과에만 적용됩니다. 추천 score, rank, eligibility 또는 evidence qualification을 새로 정의하지 않습니다.

## 10. Reset, Deletion And Export

Architecture는 다음 control을 지원할 수 있어야 합니다.

- guest local/continuity reset
- account recommendation history deletion
- account deletion
- preference reset
- 적용 가능한 범위의 data export

Guest ID를 사용자가 잃거나 제거한 뒤에는 해당 continuity를 식별·복구하지 못할 수 있으며 이를 복구 가능하다고 약속하지 않습니다. Account deletion은 account와 직접 연결된 personal linkage를 끊어야 합니다. Aggregate는 충분히 de-identified되고 적용 정책이 허용하는 경우에만 남길 수 있으며, 개인별 history를 aggregate라고 부르지 않습니다.

구체적 사용자 권리, 응답 기한, backup deletion과 관할별 예외는 `LEGAL_REVIEW_REQUIRED`입니다. 이 문서는 법률 준수를 선언하지 않습니다.

## 11. Locale, Region, Jurisdiction And Consent

```text
UI_LOCALE != CONTENT_PROVIDER_REGION
UI_LOCALE != LEGAL_JURISDICTION
CONTENT_PROVIDER_REGION != LEGAL_JURISDICTION
```

Guest ID로 jurisdiction을 추론하지 않습니다. Jurisdiction resolution은 별도 계약이며, 알 수 없는 관할은 non-essential tracking을 자동 승인하지 않습니다.

| Consent category | Design treatment |
| --- | --- |
| `STRICTLY_NECESSARY` | core ephemeral recommendation 제공에 필요한 최소 state 후보; 보편적 법률 면제 주장은 하지 않음 |
| `PREFERENCES` | persistent locale/guest continuity를 포함할 수 있으나 목적 설명, control과 관할별 판단 필요 |
| `ANALYTICS` | 별도 measurement policy와 consent determination 전에는 활성화하지 않음 |
| `MARKETING` | 현재 `FREE_FIRST` baseline 밖이며 별도 명시적 승인 필요 |

Persistent guest continuity의 정확한 category와 consent treatment는 관할에 따라 달라질 수 있으므로 `LEGAL_REVIEW_REQUIRED`입니다.

## 12. Growth Measurement Boundary

Future measurement contract는 다음 지표를 지원할 수 있습니다.

- Returning Guest Rate
- D1/D7/D30
- Recommendation Repeat Rate
- Duplicate Avoidance Quality
- Guest-to-Account Conversion after value

Raw identity, cross-site tracking 또는 advertising fingerprinting은 지표의 전제조건이 아닙니다. Event schema, denominator, consent, retention과 data quality는 별도 Measurement Gate에서 결정합니다.

```text
CURRENT_ACTUAL_METRICS = NOT_COLLECTED / NOT_ASSERTED
ANALYTICS_IMPLEMENTATION = 0
```

## 13. Aggregate Data Network Effect

Future aggregate 후보는 개인 history와 별도 store/purpose로 관리합니다.

- locale 및 기간별 genre demand
- search trend
- detail-open aggregate
- 기능이 승인된 경우 save/watch-intent aggregate
- popular filter combinations

Aggregate 사용 또는 공개 전에는 적절한 threshold, rare-segment suppression과 de-identification을 검토합니다. 개인별 profile, pseudonymous trajectory 또는 재식별 가능한 소규모 segment는 aggregate data가 아닙니다.

## 14. Buyer And Acquirer Readiness

이 경계는 data provenance, 최소 data liability, retention class, guest/account identity 분리, explicit merge, deletion/export와 growth metric 정의를 검토 가능하게 합니다. 이는 buyer package, valuation, 법적 진술 또는 거래 승인이 아닙니다.

## 15. Implementation Sequence And Gates

1. `GUEST_DATA_CONTRACT`: exact schema/API/data owner 정의; Product Architecture Gate
2. `STORAGE_CONSENT_DECISION`: storage surface, consent category, retention과 jurisdiction 처리; Privacy/Legal/Founder Gate
3. `GUEST_CONTINUITY_IMPLEMENTATION`: pseudonymous ID와 reset/expiry 구현; Security/Privacy/Product Gate
4. `REPEAT_AVOIDANCE_INTEGRATION`: bounded history를 recommendation contract에 연결; Recommendation Architecture와 QA Gate
5. `OPTIONAL_ACCOUNT_ARCHITECTURE_GATE`: account value, auth provider와 minimum profile 확정; Auth/DB/Privacy/Founder Gate
6. `AUTH_ACCOUNT_IMPLEMENTATION`: approved Auth와 account controls 구현; Security/Auth/DB Gate
7. `GUEST_ACCOUNT_MERGE`: explicit offer, confirmation, dedupe와 linkage retirement 구현; Privacy/Product QA Gate
8. `MEASUREMENT`: event taxonomy와 aggregate pipeline 구현; Measurement/Consent/Legal Gate

각 단계는 별도 Task와 authority가 필요합니다. 앞 단계의 문서 완료가 뒤 단계의 구현 승인을 의미하지 않습니다.

## 16. Reconciliation

### Preserved Existing Direction

- account-free recommendation과 optional account
- 최소 pseudonymous first-party guest continuity
- UI locale, provider region과 legal jurisdiction 분리
- 최소 수집, 짧은 guest retention과 user-controlled transition
- actual growth metrics 미수집·미주장

### Newly Canonicalized Detail

- continuity, analytics와 marketing의 목적 분리
- retention class별 identity, deletion, merge와 review dependency
- bounded repeat-avoidance history
- explicit guest-to-account lifecycle, conflict precedence와 linkage retirement
- reset/deletion/export 및 privacy-safe aggregate 경계

### Draft Not Promoted

- Data Policy의 30일·90일 등 기간
- User Domain의 table/column, Supabase Auth와 storage 후보
- guest save, Watch Later, Taste profile, alerts와 analytics 기능

### Legal Review Required

- 관할별 consent category와 persistent continuity 처리
- 최종 retention/deletion/export/backup policy
- aggregate de-identification threshold와 security log retention
- 실제 privacy notice, terms와 사용자 권리 운영 절차

## 17. Non-Goals

이 contract는 runtime code, DB, SQL, Supabase, Auth, cookie, local storage, analytics, tracking, recommendation semantics, provider behavior, Security execution, Main integration, Release, Production, Deployment 또는 비용을 변경하지 않습니다.
