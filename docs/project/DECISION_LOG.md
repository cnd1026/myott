# Decision Log

이 문서는 MyOTT의 중요한 제품/기술 결정을 기록합니다.

## DL-001 Movie Table 폐기 -> Contents 채택

초기에는 영화 중심의 `movie` 테이블을 떠올릴 수 있었지만, MyOTT는 영화, 드라마, 애니를 함께 다룹니다. 장기적으로 만화, 웹툰, 소설, 게임, 음악까지 확장할 수 있으므로 단일 `contents` 중심 모델을 채택합니다.

## DL-002 회원가입 필수 폐기 -> 익명 추천

MyOTT는 첫 방문 사용자가 회원가입 없이도 추천을 받을 수 있어야 합니다. 로그인은 취향 저장, Watch Later, 추천 기록 같은 개인 기능을 위한 선택 기능으로 둡니다.

## DL-003 개인정보 과수집 폐기 -> 최소 수집

이름, 생년월일, 전화번호, 주소, 주민등록번호, 원본 IP, 민감정보는 추천 품질에 필수적이지 않습니다. MyOTT는 "필요한 데이터만 저장한다"를 데이터 철학으로 채택합니다.

## DL-004 직접 TMDB 의존 완화 -> Provider 구조

TMDB는 첫 번째 콘텐츠 Provider로 사용하지만, MyOTT 내부가 TMDB 응답 구조에 직접 묶이지 않도록 Provider(Adapter) 구조를 설계합니다. 향후 JustWatch, AniList, OpenLibrary, Steam을 추가할 수 있게 합니다.

## DL-005 다중 페이지 흐름보다 한 페이지 추천 흐름

MVP 추천 경험은 사용자가 들어와서 입력하고, 추천받고, 결과를 확인하는 흐름이 한 페이지 안에서 끝나야 합니다. 페이지 이동은 추천 집중도를 낮추므로 현재는 한 페이지 구조를 유지합니다.

## DL-006 실제 추천 이전에 더미 UX 완성

TMDB, Supabase, AI 추천을 붙이기 전에도 사용자가 추천 흐름을 이해할 수 있어야 합니다. 그래서 Sprint 2와 Sprint 3에서는 더미 데이터 기반 UX를 먼저 완성했습니다.

## DL-007 SQL 작성 전 문서 설계 우선

DB는 Content, AI, User/Session, Inventory 문서로 먼저 정리합니다. 실제 SQL, ERD, Supabase 연결은 도메인 경계와 MVP 테이블 범위를 좁힌 뒤 진행합니다.

## DL-008 AI는 개인정보를 학습하지 않음

MyOTT AI는 사용자의 이름, 전화번호, 주소, 생년월일, 원본 IP, 민감정보를 학습하지 않습니다. 익명화된 추천 패턴과 행동 통계, 콘텐츠 메타데이터를 중심으로 추천 품질을 개선합니다.

## DL-009 Watch Later는 v1 개인 기능 후보

Watch Later는 로그인 사용자가 추천 결과를 저장하고 다시 방문할 이유를 만드는 핵심 개인 기능입니다. v1 후보로 유지하되, 구현 전 저장 정책과 삭제 정책을 함께 검토합니다.

## DL-010 Community 기능은 v2 이후

댓글, 좋아요, 추천/비추천, Community Picks는 매력적인 확장 기능이지만 운영 정책과 신고/차단 설계가 필요합니다. v1에서는 추천과 개인화 경험을 우선합니다.

## DL-011 Project Memory System 도입

Sprint가 길어지고 문서가 늘어나면서 새 스레드가 프로젝트를 빠르게 이어받을 구조가 필요해졌습니다. `docs/project/` 아래에 상태, 이력, 결정, 운영 규칙, 협업 방식을 모으는 PMS를 도입합니다.

## DL-012 국가 선택을 Primary Recommendation Hard Constraint로 적용

Sprint 9 Founder QA에서 국가가 선택된 요청도 기존 progressive fallback이 외국 작품으로 결과 12개를 채울 수 있음을 확인했습니다. Recommendation Architecture v2.0부터 Candidate Collection과 Ranking을 분리하고, 선택 국가와 콘텐츠 타입을 primary `results`의 hard constraint로 적용합니다.

정확 후보가 부족하면 같은 국가 안에서 장르만 완화합니다. 국가가 완화된 후보는 `relaxedResults`로 분리하며 primary에 자동 병합하지 않습니다. 이는 결과 수보다 조건 신뢰성을 우선하는 Breaking Change입니다. Seed recommendations/similar도 같은 국가 정책을 적용하고, 부족분은 seed genre 기반 country-scoped Discover로 보충합니다.

## DL-013 추천 정확도와 외부 호출 예산을 함께 제한

Candidate 품질을 높이기 위해 TMDB 호출량을 무제한 늘리는 방식은 응답 지연과 Rate Limit 위험을 제품 신뢰 문제로 바꿉니다. Recommendation Architecture v2.1부터 요청당 전체 24회, 목록 8회, Detail 16회, 동시 4회의 application-level budget을 적용합니다.

Discover는 exact 조건을 단계적으로 실행하고 충분한 후보가 확보되면 조기 종료합니다. 동일 요청은 deduplicate하고, 짧은 TTL의 best-effort cache를 사용하며, 429와 일시 오류만 최대 두 번 재시도합니다. Primary는 exact 장르 후보를 최소 80% 유지하고 same-country-relaxed를 최대 20%로 제한합니다. 예산이 소진되면 확보한 TMDB 결과만 반환하며 Mock 또는 외국 작품으로 조용히 채우지 않습니다.

## DL-014 TMDB 예산을 Multi-Seed Recommendation Action 단위로 공유

Seed마다 별도 `/api/search`와 Request Context를 생성하면 개별 24회 제한을 지켜도 사용자 추천 동작 전체 호출량이 Seed 수에 비례해 증가합니다. Recommendation Architecture v2.2부터 실제 Submit은 단일 `POST /api/recommend/seeds`를 사용하고 모든 Search, Recommendations, Similar, Discover, Detail 요청이 하나의 Context와 24/8/16 예산을 공유합니다.

Seed는 Search, Recommendations, Similar, Discover phase 순으로 round-robin 처리합니다. 일부 Seed 실패나 전체 Deadline 도달 시 성공한 TMDB 결과를 유지하며 Mock과 혼합하지 않습니다. 처리하지 못한 Seed는 deferred, 검색 결과가 없는 Seed는 unresolved로 명시합니다. 개별 Fetch 8초, 전체 Action 15초, Retry-After 5초 상한을 적용하며 Live QA는 Product 경로의 Cold/Warm 실행을 분리합니다.

## DL-015 장르와 Seed 확인 상태를 공통 계약으로 관리

프런트와 서버가 장르 ID를 따로 유지하면 같은 `genre-sf`가 Movie `878`로만 해석되거나 TV `10765`를 누락하여 브라우저 결과가 Provider 직접 호출과 달라질 수 있습니다. Recommendation Architecture v2.3부터 `genreContract.js`를 Quick Pick, Option Metadata, TMDB Discover, Candidate Pipeline, Weight Engine, Mock Provider, Evaluator의 장르 Source of Truth로 사용합니다.

TMDB TV가 SF와 Fantasy를 `10765`로 결합하고 독립 Thriller 장르를 제공하지 않는 한계는 숨기지 않습니다. TV SF는 `provider-combined`, TV Thriller는 Crime/Mystery provider evidence 또는 제한된 semantic evidence로 구분하며 단순 Drama는 Thriller로 인정하지 않습니다.

자동완성으로 확인된 작품은 사용자 입력 문자열과 resolved TMDB metadata를 분리합니다. 입력창은 원문을 유지하고 서버는 confirmed ID로 Search를 생략합니다. 고정 Search 개수 대신 unresolved Seed가 사용하지 않은 Recommendation 예약을 뒤의 Seed Search에 재사용하며, 총 24/8/16 예산은 유지합니다. 기존 `titles`와 `results` 계약은 유지하므로 Breaking Change는 아닙니다.

## DL-016 Provider 장르와 Canonical Taxonomy를 분리

TMDB TV의 `10759`, `10765`, `10768`처럼 하나의 Provider ID가 복합 의미를 나타내는 경우, 연결된 모든 사용자 장르를 작품에 자동 부여하지 않습니다. Recommendation Architecture v2.4부터 Provider ID는 evidence로 보존하고 MyOTT의 Canonical, Combined, Semantic Specialized value를 별도 분류합니다.

TV Drama `18`은 로맨스 evidence가 없으면 로맨스로, Mystery `9648`은 공포 evidence가 없으면 공포로 판정하지 않습니다. TV 영화, 뉴스, 리얼리티, 토크, 소프는 `format-*`으로 이동하고 가족, 키즈, 애니메이션은 audience/style로 분리합니다. 기존 `genre-*` 입력은 alias migration으로 계속 지원하므로 Breaking Change는 아닙니다. 향후 사용자 취향 저장은 표시 label이나 Provider ID가 아니라 Canonical value를 기준으로 합니다.

## DL-017 TV Semantic Filter와 Scoring 책임을 분리

TV `10759`는 액션과 모험을 하나의 Provider 장르로 제공하므로 가장 높은 semantic score 하나만 남기는 방식은 동점 후보를 모두 탈락시키고 Action Recall을 과도하게 낮췄습니다. Recommendation Architecture v2.5부터 필터 통과는 선택 장르별 evidence를 독립적으로 판정하고, 점수 계산은 같은 specialization family에서 최고 strength 하나만 사용합니다.

정확 semantic 후보가 부족할 때는 Provider combined ID와 복수의 인접 evidence를 우선 사용합니다. 제한된 강한 모험 evidence는 Provider combined ID가 함께 있을 때만 Controlled Match로 허용하며 광범위한 `world` 단독은 제외합니다. 이는 장르를 완화한 결과가 아니며 일반 Drama나 반대쪽 세부 장르로 결과 수를 채우는 용도로 사용할 수 없습니다.

사용자 화면은 Provider 원문이 아니라 Canonical 한국어 label을 표시하고, 추천 이유는 실제로 match된 선택 옵션을 우선합니다. Primary 결과는 동일 TMDB ID와 동일 한국어 표시 제목을 중복 노출하지 않습니다. 기존 API `results`, Country Hard Constraint, Exact 80%, 24/8/16 요청 예산은 유지하므로 Breaking Change는 아닙니다.

## DL-018 Founder Preview Lifecycle과 Local Port Governance 표준화

Founder가 같은 주소에서 현재 Working Tree를 반복 확인할 수 있도록 `127.0.0.1:3000`을 고정 Preview Port로 사용합니다. Codex 임시 Server는 `3001-3100`만 신규 할당할 수 있으며 `3101`은 과거 Server 정리 대상일 뿐 신규 실행에는 사용하지 않습니다.

Process 종료는 Port 번호나 `node.exe` 이름이 아니라 현재 Repository Path, Next Dev Command, Process Tree, PID Start Time을 함께 확인한 경우에만 수행합니다. 소유권이 불명확한 Listener는 유지하고 BLOCKED로 보고합니다.

모든 코드 작업은 `founder:preflight`로 시작 환경을 준비하고 `founder:finalize`로 임시 Server 정리, 3000 Restart, Root/API 검증을 수행합니다. Build와 Check는 3000을 안전하게 일시 중지하고 성공/실패와 관계없이 복구를 시도합니다. 원래 검증 Exit Code는 Server 복구 성공으로 덮어쓰지 않습니다.

Runtime State, Lock, stdout/stderr는 Repository가 아니라 `%TEMP%\myott-founder-preview`에서 관리합니다. 일반 코드 변경은 Next.js HMR를 사용하고 Browser 강제 UI Automation 대신 Dev Client 재연결을 사용합니다. Product Recommendation Logic과 Recommendation Architecture v2.5에는 영향이 없습니다.

## DL-019 Founder Preview Cleanup과 QA Readiness를 실패 폐쇄형 Gate로 운영

Temporary MyOTT Server Cleanup은 Process 종료 호출의 성공만으로 완료하지 않습니다. `3001-3101`을 다시 조회해 `Failed`와 `RemainingOwned`가 모두 0일 때만 성공하며, Preflight와 Finalize는 이 실패를 warning으로 낮추지 않습니다. Unrelated Listener는 종료하지 않고 경고로만 유지합니다.

Repository ownership은 단순 path prefix가 아니라 argument 경계와 Next/pnpm dev command evidence를 함께 사용합니다. 따라서 `Myott-copy`, `Myott-old`, `Myott-test`, `Myott2`는 현재 Repository 소유로 판정하지 않습니다.

Port 3000 mutation은 모든 clone/worktree가 공유하는 `Local\MyOTTFounderPreview_Port3000` Mutex로 직렬화합니다. State와 Log는 Repository Path hash별 디렉터리로 분리하며 Legacy State는 ownership identity를 확인한 경우에만 migration합니다. 기존 Server adoption은 실제 Start Commit을 추측하지 않고 adoption 시점 Commit을 별도 기록합니다.

Founder QA 전에는 `founder:qa-ready`를 release gate로 사용합니다. 두 QA Checklist untracked 파일 외의 변경이 있으면 차단하고, Cleanup, 현재 Commit Restart, Root/API Verify, Remaining Owned 0이 모두 충족될 때만 `READY_FOR_FOUNDER_QA`를 반환합니다. Product Recommendation Logic과 Recommendation Architecture v2.5에는 영향이 없습니다.

## DL-020 추천 결과를 Submitted Snapshot과 Hard Filter에 고정

결과 생성 뒤 Draft 옵션만 바뀌었을 때 기존 카드 이유가 새 옵션을 참조하면 한 화면 안에서 카드, Detail, Related의 조건이 서로 달라집니다. Recommendation Architecture v2.6부터 추천 버튼을 누른 순간 Submitted Preference Snapshot과 Request ID를 생성하고, 결과와 모든 설명 계층을 해당 Session에 고정합니다. Draft가 달라지면 변경 안내를 표시하며 다시 추천하기 전에는 기존 결과를 재해석하지 않습니다.

Provider media type `movie/tv`와 display content type `movie/drama/animation`을 분리합니다. 콘텐츠 타입, 국가, 선택 OTT, 선택 런타임은 공통 hard-filter contract를 사용하며 unknown 또는 mismatch metadata로 Primary 수를 채우지 않습니다. KR OTT registry는 Netflix `8`, Disney Plus `337`, Amazon Prime Video `119`, Apple TV 구독 `350`을 사용하고 Apple TV Store `2`의 rent/buy evidence를 구독 일치로 취급하지 않습니다.

Related는 현재 content의 Provider media type과 TMDB ID를 endpoint identity로 사용하고 현재 작품과 제목 alias를 제거합니다. 추천과 Related 요청은 독립된 Abort/sequence gate에서 최신 응답만 commit합니다. 로컬 `?qa=1` diagnostics는 이 판정 근거를 Founder에게 노출하지만 credential은 redaction하고 production 상세 diagnostics는 비활성화합니다. 기존 `results` 배열과 24/8/16 예산을 유지하므로 Breaking Change는 아닙니다.

## DL-021 Hard Filter 기본값과 QA 증거 계약을 실패 폐쇄형으로 운영

OTT가 Hard Constraint인 상태에서 Netflix를 기본 선택하면 사용자가 선택하지 않은 제한이 모든 최초 요청에 숨어 들어갑니다. 초기 화면과 Reset은 OTT 미선택으로 고정하고, 직접 선택한 경우에만 Provider filter를 활성화합니다. Runtime은 Candidate gate, Weight Engine, Client Insight가 동일한 60분 이하/120분 이하/140분 이상 계약을 사용하며, Apple Provider 표시는 이름보다 ID `350`과 `2`를 우선합니다.

Recommendation Architecture v2.6은 API Shape를 유지하지만 결과 의미가 달라지는 Behavioral Breaking Change입니다. 저장 데이터 migration은 없으며 QA 기대값과 제품 결과 구성을 다시 검토합니다.

`CODEX_QA_PROTOCOL.md`를 MyOTT Codex QA의 canonical Source of Truth로 사용합니다. No Evidence, No PASS, QA Layer 분리, adversarial 검사, Stop-The-Line, Browser 보안 경계와 Final Commit 재실행을 모든 후속 Task에 적용합니다. Codex 기술 PASS는 Founder 제품 PASS를 대체하지 않습니다.
## DL-022 Runtime 범위는 전체 Domain coverage로 검증

이 결정은 DL-021의 `runtime-long` 140분 기준을 대체합니다.

`runtime-long`의 시작을 140분에서 120분으로 변경하고 label을 `긴 작품 (2시간 이상)`으로 명시합니다. 120분은 `runtime-medium`과 `runtime-long` 양쪽에 포함되는 의도된 사용자 intent overlap이며 러닝타임 UI는 single select입니다.

UI, option metadata, TMDB Discover, Candidate Hard Filter, Weight Engine과 diagnostics는 `RUNTIME_FILTERS`를 Source of Truth로 사용합니다. 숫자 범위 QA는 대표값만 검사하지 않고 1~300분 합집합과 교집합을 검사하며, gap과 의도하지 않은 overlap을 실패로 처리합니다.

Codex Browser의 trusted key input이 지원되지 않을 때 synthetic DOM event로 PASS를 만들지 않습니다. `FOUNDER-KEYBOARD-001` 수동 절차를 별도 증거로 사용합니다.
## DL-023 Recall은 호출량이 아니라 타입·Semantic·Detail 배분으로 개선

Recommendation Architecture v2.7은 전체 24회, List 8회, Detail 16회와 Shared Context 1개를 유지합니다. 정확 후보가 부족할 때 모든 요청에 page를 추가하지 않고 현재 exact 수, 선택 타입 coverage, semantic evidence 상태와 남은 예산으로 다음 Discover와 Detail 대상을 선택합니다.

복수 타입은 각 선택 타입의 initial exact 기회를 예약하고, Seed direct 결과에 없는 타입은 transferable Seed genre 기반 Cross-media Discover로 수집합니다. Cross-media 후보는 Detail 후 Seed 장르 근거를 다시 확인하며 무관한 인기 목록으로 타입 수를 채우지 않습니다. Final assembly는 score가 적용된 후보에서 identity dedupe를 수행한 뒤 type coverage와 franchise 다양성을 적용해 낮은 점수 중복이 높은 점수 후보를 제거하지 않게 합니다.

TV `10765`는 Provider Combined evidence만으로 `genre-sf`와 `genre-fantasy` 양쪽의 specialized exact가 되지 않습니다. 두 필터는 각각의 semantic evidence를 요구하며 combined 선택인 `genre-sf-fantasy`는 기존 Provider Combined 계약을 유지합니다.

Provider 후보 자체가 부족한 `provider-scarcity`와 page/detail/early-stop 때문에 후보를 놓친 `retrieval-recall-failure`를 diagnostics에서 분리합니다. 제공되지 않은 수치는 0으로 위장하지 않습니다. 기존 API `results` Shape는 유지되지만 후보 수집과 타입 분포가 달라지는 Behavioral Breaking Change이며 저장 데이터 migration은 없습니다.
## DL-024 Multi-seed Seed 대표성과 타입 Coverage를 하나의 Final Allocator로 보장

Multi-seed의 Common Candidate 우선 배치와 Seed별 round-robin을 타입 reservation과 순차 적용하면 앞 단계가 12개 슬롯을 소비해 뒤 단계의 전역 Content Type coverage를 무효화할 수 있습니다. Recommendation Architecture v2.7.1부터 global ranked exact pool을 identity/title dedupe한 뒤 Seed availability와 type availability를 함께 계산하고, 하나의 allocator가 두 예약을 동시에 충족합니다. 한 후보가 Seed와 타입을 함께 대표하면 슬롯은 한 번만 사용하며, 실제 exact pool이 없는 타입 후보는 만들지 않습니다.

Cross-media query에서 사용자 선택 장르는 검색 범위를 좁힐 수 있지만 Seed 관계의 증거를 대체할 수 없습니다. `crossMediaSeedTransferValues`와 `crossMediaSelectedGenreValues`를 별도 보존하고 Detail 후 두 계약을 모두 통과한 후보만 exact pool에 남깁니다. transferable Seed evidence가 없으면 Provider 요청을 시작하지 않고 skip reason을 기록합니다.

Diagnostics는 표시 Content Type `movie/drama/animation`과 Provider media type `movie/tv`를 구분하며, 실제 `tmdbGet`을 실행한 경우에만 cross-media issued count를 증가시킵니다. 기존 API `results` Shape, Hard Filter와 24/8/16 요청 예산은 유지하므로 v2.7.1의 추가 API Shape Breaking Change는 없습니다.

## DL-027 TV Romance Candidate Retrieval Lens and Option Compatibility Closure

Founder policy `MYOTT_TV_ROMANCE_RETRIEVAL_ASSOCIATION_POLICY_V1` Option A is implemented within the existing Product contract. TV Romance retains Drama provider genre `18` and `semanticRequired=true`; a bounded candidate-retrieval-only page-1 popularity lens uses TMDB keyword `328021` (`romantic relationship`). Retrieval membership does not create semantic Romance credit, and no new provider mapping or semantic inference is introduced.

The eight approved incompatible option/content combinations are blocked by the shared taxonomy contract at UI selection and submission. Existing `/api/recommend/options` unavailable `503`, legitimate empty, and TMDB success distinctions are preserved without route changes. Focused coverage and full recommendation unit validation pass; Product/TMDB Network and Full Matrix rerun remain `0`.

## DL-028 Founder Preview Network-Zero Lifecycle Correction

Founder Preview lifecycle verification is divided into two explicit modes. The
Network-zero mode uses read-only repository/state/process/listener ownership
inspection, `founder:selftest`, and a dry-run temporary cleanup inspection. It
does not call Root, Product API, TMDB, Browser/CDP, or external Network, and it
does not restart or terminate the existing Founder Preview.

Commands that can perform localhost HTTP health checks, including
`founder:status`, `preflight`, `ensure`, `finalize`, `verify`, `qa-ready`,
`check`, `build`, `start`, and `restart`, are not Network-zero evidence. HTTP
Preview validation remains a separate QA layer and must not be silently used to
close a Network-zero gate. Product behavior, port ownership, and existing
Founder Preview lifecycle contracts are otherwise unchanged.

## DL-029 Global-First Public Launch Foundation

MyOTT public launch foundation은 `GLOBAL_FIRST / FREE_FIRST / GUEST_FIRST / OPTIONAL_ACCOUNT`를 채택하고 User Growth를 first-class architecture concern으로 관리합니다. UI locale, content-provider region과 legal jurisdiction은 서로 독립된 값이며, UI 언어만으로 관할 또는 compliance를 추론하지 않습니다.

Privacy/legal 정책 metadata와 승인 lifecycle은 Product locale·growth 구현에서 분리합니다. Guest continuity는 최소 pseudonymous first-party 범위로 제한하고 account는 가치 경험 이후 선택 사항으로 유지합니다. 실제 locale, privacy, measurement, Security, Release와 Deployment는 각 후속 Gate 없이는 활성화하지 않습니다.

## DL-030 Guest Continuity And Optional Account Data Boundary

Core recommendation은 account-free로 유지하고 guest continuity는 무작위·비의미적 pseudonymous first-party ID와 목적에 필요한 bounded history만 사용합니다. Product continuity, analytics와 marketing은 별도 목적이며 한 목적의 identity나 consent를 다른 목적에 자동 재사용하지 않습니다.

Guest data를 account에 연결하는 것은 login의 자동 효과가 아닙니다. 이동 범위를 설명하고 사용자가 명시적으로 확인한 뒤 canonical content identity를 dedupe하며, explicit save·feedback·correction을 inferred activity보다 우선합니다. Merge 후 불필요한 guest-account linkage는 retire하거나 최소화하고, 실제 storage/Auth/consent/retention 기간은 별도 Gate 전에는 구현 또는 법률 정책으로 간주하지 않습니다.

## DL-031 SEO Indexability Launch Gate

Search indexability는 canonical host, production parity, exact build/runtime, metadata, robots, sitemap, active-locale hreflang, noindex origin, Security/Release와 Founder approval이 모두 검증될 때까지 `INDEXABILITY_HOLD`를 유지합니다. 현재 Production의 `x-robots-tag: noindex`는 source가 정확히 증명되기 전에는 제거하지 않습니다.

Indexable public host는 하나만 허용하며 preview와 noncanonical deployment는 duplicate index 대상이 되어서는 안 됩니다. Sitemap과 hreflang은 active, public, content-complete canonical locale만 광고하고, inactive English runtime이나 존재하지 않는 alternate를 노출하지 않습니다. 실제 activation과 rollback은 별도 Release/Production authority를 요구합니다.

## DL-032 Vendor-Neutral Growth Measurement Contract

Growth KPI의 목적, numerator, denominator, eligible population, identity와 UTC window를 Analytics vendor 선택 전에 Product contract로 고정합니다. Dashboard나 vendor default는 같은 KPI의 denominator를 조용히 바꿀 수 없으며 semantic/schema change는 versioned comparison boundary를 남깁니다.

Product continuity, Analytics, account와 marketing identity는 서로 자동 호환되지 않습니다. Raw user free text, direct/sensitive identifiers, precise location, raw IP와 fingerprint는 baseline Growth event에서 제외하고, persistent identity가 승인되지 않은 retention metric은 fingerprint로 보충하지 않고 `NOT_MEASURABLE`로 분류합니다. 실제 instrumentation은 별도 Privacy/Consent/Legal/Product Gate를 요구합니다.

## DL-033 Measurement Eligibility Is Resolved Before Dispatch

Growth Analytics는 strictly necessary Product processing과 분리하며, jurisdiction/privacy 또는 consent eligibility가 unresolved·denied·withdrawn·unsupported이면 nonessential event를 dispatch 전에 억제합니다. Pre-consent event replay와 fingerprint 기반 identity 보충은 금지하고, persistent retention metric은 separately eligible한 cross-session measurement identity가 없으면 `NOT_MEASURABLE`로 유지합니다.

Product continuity ID를 Analytics ID로, Analytics ID를 Product continuity ID로 자동 재사용하지 않습니다. Withdrawal은 future nonessential collection과 persistent Analytics identity refresh를 중지하며, Marketing identity/tracking은 current baseline 밖입니다. 실제 retention/deletion과 관할별 consent 처리는 별도 Policy/Legal/Implementation Gate를 요구합니다.

## DL-034 PostHog Cloud Session-Only Measurement Architecture

Founder가 Analytics provider로 `POSTHOG_CLOUD`, data region preference로 `EU_CLOUD_PREFERRED`를 선택했습니다. 이 결정은 provider selection과 docs-only architecture에 한정되며 account/project 생성, SDK 설치, runtime load, event transmission 또는 legal compliance를 승인하지 않습니다. Phase 1은 현재 loaded Product runtime에 한정된 session-only measurement이고 persistent Analytics ID, identify/person profiles, Product guest/account identity 재사용과 pre-consent SDK load/transmission을 금지합니다.

MyOTT canonical event taxonomy와 KPI가 provider보다 우선하며 PostHog는 exact 5-event projection만 담당합니다. Automatic capture와 `/flags`, remote refresh, replay/survey/heatmap/error/performance capture는 명시적으로 차단하고 EU Cloud 선택을 legal PASS로 해석하지 않습니다. 현재 browser SDK에서 withdrawal 시 ordinary/retry pending request를 지원된 public API로 폐기하는 계약이 입증되지 않았으므로 account/project activation과 SDK/runtime implementation은 `MYOTT_POSTHOG_BROWSER_SDK_WITHDRAWAL_PENDING_QUEUE_PROOF_V1` 전까지 차단합니다.

## DL-035 Phase 1 PostHog Transport는 MyOTT Direct Single-Event Capture를 사용

PostHog Cloud provider 선택은 유지하지만 Browser SDK는 supported public queue/retry discard가 없어 Phase 1 strict withdrawal contract에 사용할 수 없습니다. Phase 1 transport architecture는 `MYOTT_DIRECT_SINGLE_EVENT_CAPTURE`로 정하고, MyOTT가 exact EU Capture endpoint에 한 event씩 직접 전송하며 SDK, internal queue, retry, persistence, keepalive, sendBeacon과 unload flush를 사용하지 않습니다.

Eligibility는 identity/payload/network 전에 fail-closed로 확인하고, identity는 loaded runtime에만 존재하는 무작위 session ID로 제한합니다. 모든 event는 exact canonical five-event/property allowlist, `$process_person_profile: false`, `$geoip_disable: true`를 적용합니다. Withdrawal은 future dispatch를 차단한 뒤 MyOTT-owned active AbortController를 중단하지만 이미 dispatch된 bytes를 회수한다고 주장하지 않습니다.

이 결정은 docs-level architecture 선택이며 Analytics activation은 아닙니다. Account/project/token, exact EU project의 IP discard 설정, source-IP 및 send commit point legal review, deterministic implementation test, isolated CORS/browser proof와 bounded live ingestion proof가 별도 Gate를 통과하기 전에는 SDK 설치, runtime load, event transmission, Release 또는 Production을 허용하지 않습니다.

## DL-036 Phase 1 PostHog Transport는 MyOTT Same-Origin Privacy Relay를 사용

PM LAB/HQ metric-integrity addendum에 따라 `DL-035`의 direct browser transport는 기술적으로 feasible한 역사적 후보로 보존하되 Phase 1 current selection에서는 supersede합니다. Public project token suitability는 event authenticity가 아니며 client validation만으로 arbitrary direct Capture submission, property fabrication 또는 metric poisoning을 통제할 수 없습니다.

PostHog Cloud provider와 EU region preference는 유지하고, Phase 1 transport architecture로 `MYOTT_SAME_ORIGIN_PRIVACY_RELAY`를 선택합니다. Browser는 Product-owned consent/eligibility Gate 뒤 same-origin canonical endpoint만 호출하고, relay가 exact five-event/version/property schema를 최종 검증해 server-only token으로 PostHog EU single-event endpoint에 한 번만 전달합니다. Raw browser client IP는 PostHog에 의도적으로 전달하지 않으며 provider payload는 `$process_person_profile: false`와 `$geoip_disable: true`를 사용합니다.

Phase 1은 session-only, no-SDK, no-queue, no-retry, no-background-delivery, no-persistent-identity를 유지합니다. Relay는 schema와 provider provenance를 강화하지만 human authenticity, public-endpoint bots와 cross-instance replay를 완전히 제거하지 않으므로 audited/fraud-proof metric을 주장하지 않습니다. 이 결정은 architecture selection일 뿐 account/project/token, relay implementation, event transmission, Analytics activation, Security, Release 또는 Production을 승인하지 않습니다.

## DL-037 Phase 1 Consent Receipt와 Jurisdiction Signal은 Server에서 검증

Phase 1 privacy-choice persistence의 기술 architecture로 최소 `SERVER_VERIFIABLE_SIGNED_FIRST_PARTY_CONSENT_RECEIPT`를 선택합니다. Receipt는 consent/policy version과 bounded lifecycle만 담고 Product guest/account identity 또는 Analytics identity가 되지 않으며 PostHog로 전송하지 않습니다. 별도 signing secret, exact expiry, cookie 속성, stale allow-receipt rollback/replay와 withdrawal 처리는 후속 Security/Policy Gate가 필요합니다.

Jurisdiction input은 지원된 hosting request의 `SERVER_SIDE_TRANSIENT_COARSE_COUNTRY_HINT`만 기술 후보로 사용하고 raw IP, country hint, locale 또는 provider region을 Analytics eligibility나 법적 결론으로 직접 취급하지 않습니다. Country hint는 versioned provider-neutral policy registry를 거치며, 실제 country/legal mapping은 아직 0개입니다. Unknown, unsupported 또는 legal-review-required 상태는 nonessential Analytics를 fail-closed로 억제합니다.

Privacy Center는 계속 unmounted이고 Analytics는 inactive입니다. 현재 relay는 receipt와 jurisdiction policy를 최종 재검증하지 않으므로 runtime implementation, Legal review, Security review, browser/network proof, Release와 Deployment는 모두 별도 Gate입니다.

## DL-038 Phase 1 Legal Strategy는 Stateless Core와 Feature Reduction을 우선

한국, 일본, EU 회원국과 미국의 공식 법령·규제기관 자료를 Product architecture에 대조한 Founder decision packet의 meta-strategy로 `FREE_FIRST_FEATURE_REDUCTION_BEFORE_PAID_COUNSEL`을 채택 후보로 기록합니다. Phase 1 scope는 `KR / JP / EU / US`이며 non-EU EEA 국가는 검토 범위 밖입니다. 불확실성이 있으면 nonessential Analytics, persistent guest continuity, account와 persistent personalization을 순서대로 활성화하지 않고, 필요하면 region을 제한합니다. Core recommendation은 data minimization, 정확한 notice와 security control을 전제로 `STATELESS_RECOMMENDATION_ONLY` mode를 우선합니다.

이 기록은 개별 관할 compliance 결정이나 법률 인증이 아닙니다. 관할별 Analytics minimum, signed receipt 처리, PostHog processor/transfer, US state applicability와 Privacy Center notice는 계속 Legal/Founder Gate 대상이며, 다른 국가의 optional feature는 `REGION_DEFERRED`입니다. 유료 전문가 검토는 Analytics activation, persistent identity/account, profiling, 민감정보·아동·광고, regulator/acquisition/enterprise trigger 등 material scope가 생길 때 다시 엽니다. 실제 관할별 Product policy는 `MYOTT_PHASE1_JURISDICTION_POLICY_FOUNDER_DECISION_V1` 전까지 미선택입니다.

## DL-039 Founder Approves the Stateless Global-First Phase 1 Core

Founder는 2026-09-11 `OPTION_A_STATELESS_GLOBAL_FIRST_CORE`를 Phase 1 Product operating policy로 승인했습니다. 현재 검토 범위는 `KR / JP / EU / US`이고 non-EU EEA는 `OUT_OF_SCOPE / NOT_REVIEWED`입니다. Core stateless recommendation은 켜며 Analytics, persistent guest continuity, account, guest-to-account merge, persistent personalization과 Marketing은 끕니다.

이 결정은 Phase 1에 한정되며 영구적인 Analytics, Account 또는 personalization 금지나 관할별 법률 인증이 아닙니다. Optional capability는 official-source evidence, material user traction, revenue, demonstrable Product value, provider/infrastructure necessity 또는 별도 승인된 business trigger가 있을 때 다시 검토할 수 있습니다. `DL-038`은 이 승인 전의 research와 recommendation으로 보존합니다.
