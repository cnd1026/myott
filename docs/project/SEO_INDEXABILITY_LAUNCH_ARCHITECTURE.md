# SEO Indexability Launch Architecture

Status: PRODUCT LAUNCH CONTRACT / INDEXABILITY HOLD

Task: `MYOTT_SEO_INDEXABILITY_LAUNCH_CONTRACT_V1`

## 1. Authority And Scope

이 문서는 [Public Launch Global-First Architecture](PUBLIC_LAUNCH_GLOBAL_FIRST_ARCHITECTURE.md)의 SEO 및 acquisition 방향을 launch-time operating contract로 구체화합니다. Guest와 privacy 경계는 [Guest Account Data Continuity Architecture](GUEST_ACCOUNT_DATA_CONTINUITY_ARCHITECTURE.md)를 따릅니다.

```text
INDEXABILITY_STATE = INDEXABILITY_HOLD
NOINDEX_REMOVAL = NOT_AUTHORIZED
PRODUCTION_INDEXABLE = NO
```

이 문서는 robots, sitemap, canonical metadata, locale route, redirect, domain, Vercel, Search Console 또는 analytics를 구현하거나 변경하지 않습니다. Security, Build, Release, Production과 Deployment Gate도 통과시키지 않습니다.

## 2. Current Evidence Boundary

| Evidence | Classification |
| --- | --- |
| Historically accepted remote Main | `620496c637510327f6616937c5e292f302a0fbf7` |
| Current local docs candidate base | `0bc266a060e58915939a3d602c189b20c993d9fc` / not asserted remote |
| Historically accepted production source | `70bb4c13aa253d3e02e3736fa784d8d5be89a227` |
| Production `/` response | HTTP `200` with `x-robots-tag: noindex`, previously observed |
| Noindex source | `VERCEL_MANAGED_HEADER_LIKELY / EXACT_PLATFORM_CONDITION_NOT_FULLY_PROVEN` |
| Product-code noindex origin | `NOT_EVIDENCED` by current narrow source inspection |
| Public sitemap or robots implementation | `NOT_PROVEN` |
| Localized canonical/hreflang runtime | `NOT_PROVEN` |
| Canonical custom production domain | `PENDING_FOUNDER_SELECTION_OR_PURCHASE` |
| English public runtime | `NOT_ACTIVATED` |
| Exact build | `BLOCKED / EXACT_LOCAL_DEPENDENCY_GRAPH_NOT_AVAILABLE` |
| Security release gate | `BLOCKED / SAFE_HOLD` |

Remote Main, local candidate와 production artifact는 서로 다른 lifecycle identity입니다. 이 문서는 parity를 추론하거나 local commit을 remote 또는 deployed state로 표현하지 않습니다.

## 3. Indexability State Machine

### 3.1 States

| State | Meaning |
| --- | --- |
| `INDEXABILITY_HOLD` | noindex와 non-indexable launch posture를 유지하며 prerequisite를 준비 |
| `LAUNCH_INDEXABILITY_READY` | activation evidence가 모두 검증됐으나 Production 변경은 아직 미실행 |
| `PRODUCTION_INDEXABLE` | 별도 Release/Production 승인으로 canonical production indexing이 활성화됨 |
| `INDEXABILITY_ROLLBACK` | 심각한 issue로 indexing signal을 승인된 prior-safe state로 되돌리는 중 |

현재 `x-robots-tag: noindex`는 즉시 고쳐야 할 Product defect가 아니라 launch hold입니다.

```text
INDEXABILITY_HOLD
-> LAUNCH_INDEXABILITY_READY
-> PRODUCTION_INDEXABLE
```

첫 transition은 Section 18의 모든 evidence가 충족될 때만 가능하고, 두 번째 transition에는 별도 Founder Release/Indexability 및 Production authority가 필요합니다.

## 4. Preview And Production Separation

Development, Test, QA, preview와 noncanonical Vercel deployment는 indexed public duplicate가 되지 않아야 합니다.

```text
PREVIEW_INDEXABILITY = NOINDEX
PRODUCTION_ELIGIBILITY = SEPARATE_GATE
```

`noindex`와 robots는 security boundary가 아닙니다. Secret, private data, internal endpoint와 authorization은 access control로 보호하며 search crawler behavior에 의존하지 않습니다.

## 5. Canonical Host

Indexability activation 전에 하나의 public canonical host를 선택하고 소유·routing 상태를 검증합니다.

```text
FREE_FIRST_PAID_BASELINE = DOMAIN_ONLY
DOMAIN_PURCHASE = NOT_EXECUTED / NOT_ASSUMED
CANONICAL_CUSTOM_DOMAIN = PENDING_FOUNDER_SELECTION_OR_PURCHASE
PRODUCTION_INDEXABILITY_ACTIVATION = HOLD
```

이 문서는 domain을 선택하거나 가상의 host를 hard-code하지 않습니다. 현재 `vercel.app` host는 technical infrastructure로 존재할 수 있지만 custom host가 canonical로 채택된 뒤 deployment-specific URL을 canonical로 사용하지 않습니다.

## 6. Host Duplication Policy

```text
ONE_PUBLIC_CANONICAL_HOST = REQUIRED
MULTIPLE_INDEXED_DUPLICATE_HOSTS = PROHIBITED
```

Custom host activation 시 canonical signals는 해당 host를 가리켜야 합니다. Noncanonical host의 redirect, canonical 또는 noindex 전략은 Vercel domain behavior, API behavior, preview alias, health check와 rollback을 검증한 뒤 선택합니다. 검증 없이 platform-wide redirect를 적용하지 않습니다.

## 7. Locale URL Phases

### Phase A: Current

- `/`는 current Korean compatibility path입니다.
- `en-US` public runtime은 `NOT_ACTIVATED`입니다.
- inactive English route에 canonical, sitemap 또는 hreflang claim을 만들지 않습니다.

### Phase B: Locale Activation Ready

`/ko-KR/...`와 `/en-US/...` route family는 각각 완전한 locale runtime과 route validation이 PASS한 뒤에만 public canonical 후보가 됩니다. Locale prefix를 이해하는 pure routing foundation만으로 searchable locale page가 존재한다고 간주하지 않습니다.

## 8. Canonical URL Policy

Canonical URL은 다음 조건을 모두 충족해야 합니다.

- absolute production URL
- selected canonical host 사용
- normalized path와 deliberate trailing-slash policy
- tracking/query variant를 독립 canonical page로 만들지 않는 stable query treatment
- preview 및 deployment-specific URL 제외
- locale activation state와 일치

구현은 launch-time `CANONICAL_ORIGIN` 결정에서 host를 받아야 하며 현재 문서에 임의 origin을 고정하지 않습니다.

## 9. Legacy Root

```text
LEGACY_ROOT = /
CURRENT_ROLE = KOREAN_PUBLIC_COMPATIBILITY_PATH
```

Locale-prefixed runtime이 활성화될 때 `/`의 역할은 다음 중 하나로 명시적으로 선택합니다.

- `DEFAULT_LOCALE_COMPATIBILITY_ENTRY`
- `LOCALE_ENTRY_GATEWAY`
- `REDIRECT_TO_CANONICAL_DEFAULT_LOCALE`

그 전에는 `/ko-KR`이 `/`를 대체한다고 주장하거나 redirect를 만들지 않습니다. 두 경로가 동등한 public content를 제공하게 되면 duplicate indexing을 방지하는 하나의 canonical policy가 필요합니다.

## 10. Hreflang

Hreflang은 `ACTIVE / PUBLIC / CONTENT_COMPLETE / CANONICAL`인 locale page에만 emit합니다. Future initial tags는 `ko-KR`과 `en-US`이며 각 page는 self-reference와 유효한 alternate cross-reference를 모두 제공해야 합니다.

```text
INACTIVE_EN_US_HREFLANG = PROHIBITED
BROKEN_OR_NONEXISTENT_ALTERNATE = PROHIBITED
```

## 11. X-Default

```text
X_DEFAULT_TARGET = ACTIVATION_GATE_DECISION
```

`x-default`는 실제 `/` 역할과 일치해야 합니다. Locale gateway, default Korean route 또는 다른 승인된 neutral entry 중 실제 구현을 검증한 뒤 선택하며, canonical behavior와 모순되는 target을 가리키지 않습니다.

## 12. Robots Policy

Public canonical page는 launch activation 이후에만 crawling eligibility를 가집니다. Preview, test, dev와 noncanonical deployment는 indexing 대상으로 광고하지 않습니다. API, QA route와 internal operational endpoint는 public search content가 아닙니다.

Actual `robots.txt` 또는 route 구현은 별도 runtime Task입니다. Robots directive는 data access control 또는 secret protection을 대신하지 않습니다.

## 13. X-Robots-Tag And Noindex Origin

현재 Production의 `x-robots-tag: noindex`를 유지합니다. 제거 전에 active source를 다음 class 중 하나로 정확히 증명합니다.

- `PRODUCT_CODE`
- `VERCEL_PLATFORM_BEHAVIOR`
- `DEPLOYMENT_CONFIGURATION`
- `OTHER`

```text
NOINDEX_ORIGIN = PROVEN_BEFORE_REMOVAL
CURRENT_NO_INDEX_ORIGIN = NOT_FULLY_PROVEN
```

Platform header가 남은 상태에서 HTML metadata만 `index`로 바꾸는 등 서로 모순되는 signal을 만들지 않습니다. Header, HTML metadata와 robots behavior를 동일 production artifact에서 함께 검증합니다.

## 14. Sitemap

Future sitemap은 canonical host의 public, successful, supported, indexable route만 포함합니다. 다음 항목은 제외합니다.

- preview/deployment URL
- API, QA와 dev route
- inactive locale route
- duplicate query variant
- noncanonical host URL
- failed, redirected-away 또는 noindex page

Localized page가 활성화되면 sitemap route set과 hreflang alternate graph가 일치해야 합니다. English runtime activation 전에는 `en-US` URL을 광고하지 않습니다.

## 15. Metadata And Social Share

현재 message catalog는 locale별 title/description foundation을 제공하지만 runtime English activation이나 canonical metadata를 입증하지 않습니다. Future active locale metadata는 다음을 지원해야 합니다.

- title and description
- canonical URL
- valid locale alternates
- Open Graph locale, title, description, URL
- share URL
- 적절한 asset이 존재할 때만 `og:image`
- 필요한 경우 정확한 Twitter/X card equivalents

Current local source의 `<html lang="ko">`는 current Korean runtime과 일치합니다. Production parity는 별도로 증명해야 합니다. Social metadata readiness는 search indexability PASS와 동일하지 않습니다.

## 16. Structured Data And Search Onboarding

Structured data는 `OPTIONAL_FUTURE_SEO_ENHANCEMENT`입니다. 실제 Product가 정확히 뒷받침하는 경우에만 `WebSite` 또는 `Organization` 같은 schema를 검토합니다. SEO를 위해 Review, Rating, Movie, TVSeries 또는 Recommendation claim을 만들지 않습니다.

Indexability activation 후 Google Search Console과 Bing Webmaster Tools는 `FREE_FIRST`와 호환 가능한 운영 후보입니다. 이 문서에서는 account connection, domain verification, sitemap submission 또는 network request를 수행하지 않습니다.

## 17. Build And Security Relation

```text
BUILD = BLOCKED / EXACT_LOCAL_DEPENDENCY_GRAPH_NOT_AVAILABLE
SECURITY_BLOCKS_RELEASE = YES
ACTUAL_PUBLIC_INDEXABILITY_ACTIVATION = NOT_CURRENTLY_AUTHORIZED
```

Build와 Security는 runtime activation prerequisite입니다. 이 docs architecture는 허용되지만 build environment를 재시도하거나 Security review/scan을 다시 열지 않습니다.

## 18. Indexability Activation Gate

`LAUNCH_INDEXABILITY_READY`에는 다음 evidence가 모두 필요합니다.

| Gate | Required state |
| --- | --- |
| `CANONICAL_HOST_SELECTED` | `YES` |
| `PRODUCTION_SOURCE_IDENTITY` | `PROVEN` |
| `PRODUCTION_CANDIDATE_PARITY` | `PROVEN` |
| `EXACT_BUILD_VALIDATION` | `PASS` |
| `REQUIRED_RUNTIME_ROUTE_VALIDATION` | `PASS` |
| `ACTIVE_LOCALE_PAGES_COMPLETE` | `PASS` |
| `CANONICAL_METADATA` | `VERIFIED` |
| `ROBOTS_POLICY` | `VERIFIED` |
| `SITEMAP` | `VERIFIED` |
| `HREFLANG_FOR_ACTIVE_LOCALES` | `VERIFIED` |
| `NOINDEX_ORIGIN` | `PROVEN` |
| `SECURITY_RELEASE_GATE` | `SUFFICIENT_FOR_PUBLIC_RELEASE` |
| `FOUNDER_RELEASE_INDEXABILITY_APPROVAL` | `YES` |

한 항목이라도 충족되지 않으면 `INDEXABILITY_HOLD`를 유지합니다. `LAUNCH_INDEXABILITY_READY`도 그 자체로 Production mutation authority가 아닙니다.

## 19. Rollback

심각한 duplicate indexing, broken canonical, invalid locale signal 또는 release defect가 확인되면 승인된 Release process에서 `INDEXABILITY_ROLLBACK`을 실행할 수 있어야 합니다.

Conceptual rollback은 다음을 포함할 수 있습니다.

- verified noindex restoration
- broken sitemap exposure removal
- invalid alternate-locale signal removal
- prior valid canonical policy restoration
- approved release artifact rollback

Rollback은 preview를 indexable하게 만들거나 unknown noindex source 위에 충돌하는 directive를 추가해서는 안 됩니다. 이 문서는 rollback을 실행하지 않습니다.

## 20. Organic Growth Measurement

Future measurement contract 후보는 다음과 같습니다.

- Organic Search Sessions
- Search Landing Activation Rate
- Indexed Canonical Page Count
- Search Impression/Click Trend
- Locale Search Mix
- Country Search Mix
- Organic Share of New Visitors

```text
CURRENT_ACTUAL_METRICS = NOT_COLLECTED / NOT_ASSERTED
ANALYTICS_IMPLEMENTATION = 0
```

Metric event, consent, retention과 Search Console data handling에는 별도 Measurement/Privacy Gate가 필요합니다.

## 21. Free-First And Diligence Boundary

Baseline SEO architecture에는 paid SEO tool 또는 Vercel Pro가 필요하지 않습니다. `DOMAIN_ONLY`는 현재 허용 가능한 paid baseline 방향일 뿐 purchase 실행이나 특정 domain 승인이 아닙니다. Paid ads도 이 범위에 없습니다.

Canonical domain ownership, duplicate-host prevention, locale architecture, metadata ownership, index policy, organic metric definitions와 공개된 blockers는 future diligence를 명확하게 합니다. 이는 buyer package, valuation 또는 거래 승인이 아닙니다.

## 22. Evidence Classification

### Currently Proven

- accepted historical production `/` HTTP `200` and `x-robots-tag: noindex`
- current local source에서 explicit Product-code noindex origin 미발견
- current Korean runtime source의 `<html lang="ko">`와 localized metadata foundation
- remote Main, local candidate와 production source identity가 서로 다름

### Launch Required

- canonical host selection and ownership
- exact production source/candidate parity
- exact build, route, metadata, robots, sitemap와 active-locale validation
- noindex origin proof, sufficient Security/Release gate와 Founder approval

### Deferred Implementation

- robots, sitemap, canonical/hreflang, locale runtime, redirect와 social metadata wiring
- Search Console/Bing onboarding, structured data와 organic analytics

### Not Proven

- exact current platform source of `x-robots-tag: noindex`
- custom canonical domain ownership
- public sitemap/robots route and localized canonical graph
- Production parity with current local candidate
- build, Security and Release readiness

## 23. Non-Goals

이 contract는 Product/runtime/public files, middleware, Next/Vercel configuration, package/lock, domain, Search Console, analytics, Security, Main, Release, Production, Deployment 또는 비용을 변경하지 않습니다.
