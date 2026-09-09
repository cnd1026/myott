# Public Launch Global-First Architecture

Status: FOUNDATION CONTRACT / ARCHITECTURE ONLY

Task: `MYOTT_GLOBAL_FIRST_PUBLIC_LAUNCH_FOUNDATION_CONTRACT_V1`

## 1. Authority And Scope

MyOTT의 public launch foundation은 다음 원칙을 함께 채택합니다.

- `FREE_FIRST`: 유료 기능이나 신규 비용을 launch 전제조건으로 만들지 않습니다.
- `GLOBAL_FIRST`: 한 국가의 UI, 콘텐츠 지역, 법적 관할을 전 세계 기본값으로 일반화하지 않습니다.
- `GUEST_FIRST`: 계정 생성 없이 추천 가치를 먼저 경험할 수 있어야 합니다.
- `OPTIONAL_ACCOUNT`: 계정은 가치 경험 이후의 선택이며 추천 사용의 선행조건이 아닙니다.
- `USER_GROWTH_FIRST_CLASS`: 획득, 활성화, 유지, 추천, 데이터 네트워크 효과를 제품 설계의 명시적 축으로 다룹니다.
- `ACQUISITION_READY`: 검색, 공유, locale URL과 측정 계약을 구현 가능한 구조로 준비하되 이 문서만으로 활성화하지 않습니다.

이 문서는 설계 정본이며 구현, 실제 법률 검토, Security Seal, Release, Production 또는 Deployment 승인이 아닙니다. 현재 Security Seal과 Release 경계는 그대로 유지합니다.

## 2. Current State Boundary

| State | Exact identity / classification |
| --- | --- |
| Current production source | `70bb4c13aa253d3e02e3736fa784d8d5be89a227` |
| Remote Main | `620496c637510327f6616937c5e292f302a0fbf7` |
| Local attribution candidate | `44a99e471a0a4b0bad052dfe3c1ce459dc06aaf1` |
| Security Seal | `BLOCKED / SAFE_HOLD` |
| Current-Main Security coverage | `NOT_PROVEN` |
| Release / Production / Deployment | `HOLD / HOLD / HOLD` |

세 source identity는 서로 다른 lifecycle 상태입니다. Local attribution candidate를 remote 또는 deployed 상태로 표현하지 않습니다.

## 3. Locale, Content Region, And Jurisdiction

### 3.1 Independent Concepts

| Concept | Responsibility | Must not imply |
| --- | --- | --- |
| `UI_LOCALE` | UI 언어, 숫자·날짜 표시, localized route와 metadata | 법적 관할 또는 콘텐츠 제공 가능 지역 |
| `CONTENT_PROVIDER_REGION` | OTT/watch-provider 가용성과 콘텐츠 지역 선택 | 사용자의 국적, 거주지 또는 법적 관할 |
| `LEGAL_JURISDICTION` | 적용 가능한 privacy/legal disclosure resolver의 입력 | UI 언어만으로 확정된 법적 결론 |

`UI_LOCALE != LEGAL_JURISDICTION`은 필수 계약입니다. 콘텐츠 지역 역시 두 값과 독립적으로 변경할 수 있어야 합니다.

### 3.2 UI Locale Resolution

`UI_LOCALE` precedence는 다음과 같습니다.

1. 사용자의 명시적 manual override
2. locale route 또는 URL
3. 저장된 locale preference
4. `Accept-Language`
5. 제품 fallback locale

Manual locale control은 항상 접근 가능해야 합니다. 자동 감지는 편의 기능이며 사용자의 명시적 선택을 덮어쓰지 않습니다.

### 3.3 Content Provider Region

`CONTENT_PROVIDER_REGION`은 명시적 사용자 선택과 최소 저장 preference로 관리합니다. Precise location, IP 기반 정밀 위치, background geolocation 또는 법적 관할 추론을 요구하지 않습니다.

## 4. Jurisdiction And Privacy Center

### 4.1 Jurisdiction Resolver States

Legal content는 다음 상태 중 하나로만 분류합니다.

- `RESOLVED`: 승인된 근거로 관할이 결정됨
- `USER_SELECTED`: 사용자가 관할 또는 지역을 명시적으로 선택함
- `DEFAULT_MINIMAL`: 비필수 처리를 활성화하지 않는 최소 기본 상태
- `LEGAL_REVIEW_REQUIRED`: 적용 텍스트 또는 요구사항에 법률 검토가 필요함
- `UNSUPPORTED_JURISDICTION`: 승인된 launch support 범위 밖임

관할을 알 수 없을 때는 `DEFAULT_MINIMAL` 또는 `LEGAL_REVIEW_REQUIRED`로 fail-safe합니다. UI locale이나 콘텐츠 지역을 근거로 법적 준수를 추정하지 않습니다.

### 4.2 Privacy Center Metadata

Privacy Center의 모든 정책 항목은 다음 metadata를 가져야 합니다.

| Field | Contract |
| --- | --- |
| `jurisdiction` | 적용 대상으로 검토된 관할 또는 명시적 미확정 상태 |
| `policy_type` | privacy, cookie, terms 등 정책 종류 |
| `locale` | 표시 언어이며 관할과 독립 |
| `policy_version` | 변경 추적 가능한 버전 |
| `effective_date` | 승인된 효력 발생일 |
| `official_source` | 공식 원문 또는 검토 근거 |
| `legal_review_status` | draft, required, approved 등 정확한 상태 |

이 metadata는 국가별 법률 문구를 제공하거나 compliance를 주장하지 않습니다. 법적 텍스트와 관할별 승인에는 별도 Legal/Founder Gate가 필요합니다.

## 5. Consent And Retention

### 5.1 Consent Categories

| Category | Default launch treatment |
| --- | --- |
| Strictly necessary | 서비스 제공에 필요한 최소 범위만 사용 |
| Preferences | 목적과 저장 범위를 설명하고 사용자가 제어 가능 |
| Analytics | 명시적 정책과 필요한 consent Gate 전에는 활성화하지 않음 |
| Marketing | Baseline launch 범위가 아니며 별도 명시적 승인 필요 |

Marketing consent나 tracking을 public launch baseline으로 간주하지 않습니다. 관할이 불명확하면 strictly necessary 외 처리는 기본 비활성입니다.

### 5.2 Retention Classes

Retention은 [Data Policy](../data-policy.md)의 기존 draft를 참조하며 다음 class로 분리합니다.

- guest/session continuity
- recommendation and interaction records
- preference records
- account-linked records
- security and operational logs
- consent and policy-version records

현재 문서에 있는 retention 기간은 제안 상태이며 승인된 법률 정책이 아닙니다. 실제 기간, 삭제 주기와 관할별 예외는 Privacy/Legal review 후 별도 결정합니다.

## 6. Guest And Optional Account Boundary

### 6.1 Guest Identity

Guest continuity는 pseudonymous first-party identifier를 사용하고 다음 경계를 지킵니다.

- raw IP를 장기 식별자로 저장하지 않음
- cross-site identifier를 만들거나 공유하지 않음
- 목적에 필요한 최소 저장만 사용
- 추천 continuity와 이미 본 항목·반복 결과 회피에 한정
- reset/delete와 expiry lifecycle을 명시

Guest 추천은 [User and Session Domain](../database/user-domain.md)의 anonymous-session 방향을 따릅니다. 이 문서는 실제 identifier implementation이나 저장소를 선택하지 않습니다.

### 6.2 Optional Account

Account 제안은 사용자가 추천 가치를 경험한 뒤에만 나타나며, 계정은 추천 요청의 전제조건이 아닙니다. 최소 정보, 명확한 목적, skip 가능한 흐름을 유지합니다.

### 6.3 Guest-To-Account Transition

전환은 다음 계약을 모두 충족해야 합니다.

1. 사용자의 명시적 action
2. 이동·결합되는 데이터에 대한 사전 설명
3. guest/account 중복 identity와 추천 history의 deterministic dedupe
4. save-history preference의 명시적 선택
5. delete/export/privacy lifecycle 연결

자동 계정 결합이나 조용한 tracking 확대는 허용하지 않습니다.

## 7. Unsupported Jurisdiction Behavior

`UNSUPPORTED_JURISDICTION`에서는 최소 기능과 최소 필수 저장만 제공합니다. 비필수 analytics, marketing, silent profiling 또는 관할 미확정 상태의 동의 확대를 수행하지 않습니다. 지원 여부와 필요한 다음 단계를 사용자에게 명확히 표시하는 별도 Product/Legal 설계가 필요합니다.

## 8. SEO And Acquisition Readiness

Public launch 전 다음 foundation이 필요합니다.

- localized URL strategy
- locale별 canonical URL
- 정확한 `hreflang`
- locale-aware sitemap
- robots/indexability 정책
- localized title, description과 metadata
- locale-aware Open Graph/share metadata
- verified custom domain

현재 상태는 다음과 같이 기록합니다.

```text
CURRENT_PRODUCTION_X_ROBOTS_TAG = NOINDEX
CURRENT_CLASSIFICATION = VERCEL_MANAGED_HEADER_LIKELY / EXACT_CONDITION_NOT_FULLY_PROVEN
```

이 문서는 `noindex`를 제거하지 않습니다. Public launch에는 custom-domain 기준 indexability와 실제 response header를 별도 검증해야 합니다.

## 9. User Growth Funnel Contract

| Layer | Horizon | Cost class | Privacy impact | Product mechanism | Primary KPI |
| --- | --- | --- | --- | --- | --- |
| Acquisition | NOW | FREE | Low when server logs remain minimal | localized routes, metadata, share-ready pages | New Visitors, Organic Search Share, Country/Locale Mix |
| Activation | NOW | FREE | Strictly necessary session state only | guest-first recommendation completion and detail exploration | Recommendation Activation Rate, Successful Recommendation Session Rate, Detail Open Rate |
| Retention | NEXT | FREE | Preference/continuity consent and retention review | pseudonymous continuity, duplicate avoidance, optional save intent | D1/D7/D30, Returning Guest Rate, Duplicate Avoidance Quality |
| Referral | NEXT | FREE | shared payload minimization and abuse review | user-initiated share/referral entrypoints | Share Rate, Referral Conversion |
| Data Network Effect | LATER | POSSIBLE_COST | High; aggregation, consent and deletion guarantees required | privacy-preserving aggregate learning after explicit Gate | WAU/MAU, Growth Rate, recommendation quality deltas |

Growth is a first-class architecture concern, but no analytics collector, tracking identifier, referral system or paid infrastructure is authorized by this contract.

## 10. KPI Definition Contract

The foundation defines, but does not collect or assert, these KPIs:

- New Visitors
- Recommendation Activation Rate
- Successful Recommendation Session Rate
- Detail Open Rate
- Save/Watch-intent Rate
- D1/D7/D30
- Returning Guest Rate
- Guest-to-Account Conversion after value
- Share Rate
- Referral Conversion
- Organic Search Share
- Country/Locale Mix
- Duplicate Avoidance Quality
- WAU/MAU
- Growth Rate

```text
CURRENT_ACTUAL_METRICS = NOT_COLLECTED / NOT_ASSERTED
```

Metric formulas, event schema, consent treatment, retention and data quality checks require a separate Measurement Gate.

## 11. Buyer And Acquirer Readiness

Buyer-readiness preparation is limited to category definition:

- product and market narrative
- source/dependency and license inventory
- architecture and operational documentation
- privacy, consent and retention evidence
- security status and unresolved coverage
- growth KPI definitions and later verified measurements
- domain, SEO and distribution assets
- repository, release and deployment provenance

This is not a buyer package, valuation, diligence response, legal representation or commercial transaction authorization.

## 12. Directional Implementation Sequence

1. FOUNDATION CONTRACT
2. I18N/LOCALE FOUNDATION
3. SEO METADATA FOUNDATION
4. GUEST CONTINUITY DESIGN
5. PRIVACY/CONSENT DECISION
6. OPTIONAL ACCOUNT
7. MEASUREMENT
8. SHARE/REFERRAL
9. ADVANCED DATA NETWORK EFFECT

이 순서는 현재 evidence에 기반한 방향이며 각 단계의 Architecture, Privacy, Security, Cost와 Founder Gate 결과에 따라 재정렬할 수 있습니다.

## 13. Non-Goals And Gates

이 contract는 다음을 수행하거나 승인하지 않습니다.

- translation 또는 locale runtime implementation
- i18n dependency 선택·설치
- DB/Auth/cookie/analytics/guest identifier 구현
- SEO code 변경 또는 `noindex` 제거
- 법률 문구 작성 또는 compliance 선언
- Security Seal 실행·우회
- Main integration, Release, Production 또는 Deployment
- 신규 비용, license contact 또는 commercial commitment

다음 구현 후보는 `MYOTT_I18N_LOCALE_FOUNDATION_V1`이며 별도 Task Manifest와 Gate가 필요합니다.
