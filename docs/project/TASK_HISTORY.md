# Task History

이 문서는 Sprint별 Task, Commit, Review, 상태를 기록합니다.

## Security Maintenance

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-SEC-01 | APS 문서 공개 범위 정리 및 private repo 이전 준비 | `e09ab50` | APS 공개 안내와 이전 계획을 추가하고 README/PMS의 핵심 APS 문서 직접 노출을 완화. | 완료 |
| APS-003 | APS 핵심 운영 문서 public repo 제거 | `d26272b` | APS 핵심 운영 문서 5개를 MyOTT에서 제거하고 Nd_core를 Source of Truth로 명시. | 완료 |

## Foundation Sprint

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-FND-T01 | F-01 Project Memory System 구축 | `07a6a10` | PMS 문서 8개와 README/기록 파일 업데이트. | 완료 |
| MYOTT-FND-T02 | F-02 AI PM Bootstrap System v1.0 문서 작성 | `5d11898` | 새 ChatGPT 채팅용 공식 Bootstrap 문서 추가. | 완료 |
| MYOTT-FND-T03 | F-03 AI PM Constitution v1.0 작성 | `d6884e5` | AI PM이 지켜야 할 최상위 운영 원칙 문서화. | 완료 |
| MYOTT-FND-T04 | F-04 AI PM Behavior 문서 작성 | `6a7bdab` | AI PM의 리뷰, 칭찬, 반대, 브레이크 행동 규칙 문서화. | 완료 |
| MYOTT-FND-T05 | F-05 AI PM Validation 문서 작성 | `74d81d8` | 새로운 AI PM이 운영체계를 따르는지 검증하는 체크리스트 문서화. | 완료 |

## Sprint 5

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S05-T01 | Task 5-1 Provider Architecture 설계 | `365c9dd` | 문서와 Provider 초안 폴더만 생성. 기존 기능 미수정. | 완료 |
| MYOTT-S05-T01B | Task 5-1b Project Memory System 동기화 | `2416d76` | Foundation Sprint 완료 상태, Sprint 5 현재 상태, README 실행 방법을 동기화. | 완료 |
| MYOTT-S05-T02 | Task 5-2 Mock Provider 준비 | `4c2dd4c` | Mock Provider 구현 전 공통 모델, 샘플 구조, 전환 단계, Registry 판단을 문서화. | 완료 |
| MYOTT-S05-T03 | Task 5-3 Mock Provider 구현 및 로컬 검증 | `46b5904` | Mock Provider, 최소 Provider Registry, `/api/search` fallback 연결. UI/CSS 미수정. | 완료 |
| MYOTT-S05-T04 | Task 5-4 TMDB Provider Adapter 연결 | `a88d17a` | TMDB Provider를 Registry에 연결하고 `/api/search`의 직접 TMDB 의존을 제거. UI/CSS 미수정. | 완료 |
| MYOTT-S05-T05 | Task 5-5 동적 작품 입력 및 초기화 UX | `4a614c1` | 마지막 작품 입력 시 새 입력창을 추가하고 전체/옵션 초기화 버튼을 추가. Provider 구조 미수정. | 완료 |
| MYOTT-S05-T06 | Task 5-6 Provider Status Indicator | `aba7b4e` | 개발 환경에서 현재 Provider와 fallback 여부를 확인하는 작은 상태 배지를 추가. Registry 구조 미수정. | 완료 |

## Sprint 6

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S06-T01 | Task 6-1 Decision Card MVP | `2402da7` | 추천 카드에서 추천 이유를 최상단에 배치하고 장르, 러닝타임, 평점, OTT만 남겨 빠른 결정을 돕도록 개선. Provider 구조 미수정. | 완료 |
| MYOTT-S06-T02 | Task 6-2 Hero Recommendation MVP | `de28d9d` | 메인 화면 최상단에 입력 없이 확인 가능한 Hero Recommendation 3개를 추가하고 DecisionCard를 재사용. Provider 구조 미수정. | 완료 |
| MYOTT-S06-T03 | Task 6-3 Hero Recommendation Micro UX Polish | `525902d` | Hero 문구, 추천 이유, CTA, 안내 문구, 카드 간격을 다듬어 추천에서 입력으로 이어지는 흐름을 개선. 기능 추가 없음. | 완료 |
| MYOTT-S06-T04 | Task 6-4 MVP Readiness Polish | `9040931` | Hero, 입력, 결과 영역의 문구와 카드 균형을 점검하고 모바일 흐름을 다듬음. Provider/API/아키텍처 미수정. | 완료 |
| MYOTT-S06-T05 | Task 6-5 Decision Experience Final Polish | `7050c82` | 카드 상세 보기 affordance와 상세 Layer 정보 계층을 다듬어 추천에서 상세 확인까지의 마지막 UX 마찰을 줄임. Provider/API/아키텍처 미수정. | 완료 |

## Sprint 9

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S09-001 | Recommendation Architecture v1 | `b8747c8` | Recommendation Flow, Feature, Signal, Weight, Score, Fallback Strategy, QA Dataset, Evolution Roadmap을 문서화. Sprint 10 구현 기준 마련. | 완료 |
| MYOTT-S09-002 | Recommendation QA Dataset | `ddfc3eb` | Founder QA와 향후 자동 테스트에 재사용할 JSON dataset 12개 케이스 생성. Architecture Test Strategy에 canonical dataset 링크 추가. | 완료 |
| MYOTT-S09-003 | Recommendation QA Dataset Evaluator | `041260a` | QA Dataset case와 추천 결과 배열을 비교하는 순수 평가 유틸리티 추가. pass/fail, score, matchRatio, failIf reason 반환. | 완료 |
| MYOTT-S09-004 | Recommendation Weight Engine | `58ba203` | Signal + Weight 기반 scoreDetail 순수 유틸리티와 조정 가능한 weight config 추가. UI/API 대규모 연결 없이 Architecture 구현 위치 연결. | 완료 |
| MYOTT-S09-005 | Weight Engine Ranking Integration | `이번 커밋` | provider result ranking 단계에 Weight Engine을 연결하고 모든 추천 결과에 scoreDetail을 추가. finalScore 우선 정렬과 legacyScore tie-break 유지. | 완료 |
| MYOTT-S09-DOC-001 | Company Documentation Standard | `이번 커밋` | ROADMAP 생성, Prompt Guide v1.4의 AI Execution Profile/Session Review 표준, Recommendation Architecture v1.1 versioning rule 추가. 제품 코드 미수정. | 완료 |
| MYOTT-S09-DOC-002 | AI Execution Profile Platform Alignment | `이번 커밋` | Prompt Guide v1.4.1에서 ChatGPT/Codex Profile을 분리하고 Session Review의 Target Platform/Reason 기준 및 ROADMAP 기록을 보정. 제품 코드 미수정. | 완료 |
| MYOTT-S09-006 | Country-integrity Candidate Generation | `이번 커밋` | Candidate Collection과 Ranking을 분리하고 국가 hard constraint, primary/relaxed tier, seed discover supplement, franchise deduplication, QA evaluator 기준을 적용. Founder TMDB 품질 QA 대기. | 완료 |
| MYOTT-S09-006A | Candidate quality and TMDB request budget | `이번 커밋` | 24/8/16 request budget, progressive fetch, cache/dedup/retry, exact 80% ratio, seed scoring, 20-case deterministic/live QA runner 적용. Founder Live TMDB QA 대기. | 완료 |
| MYOTT-S09-006A1 | Shared Multi-Seed Request Budget | `이번 커밋` | 단일 Multi-Seed API, Shared Context, 15초 deadline, Seed phase scheduling, 부분 성공, 24-case QA와 Product 경로 Cold/Warm Live Runner 적용. Founder QA 대기. | 완료 |
| MYOTT-S09-006A2 | Adaptive Seed Resolution & Unified Genre Contract | `이번 커밋` | 공통 장르 계약, TV semantic 장르, confirmed Seed와 입력 언어 보존, Adaptive Search Budget Recycling, Seed Coverage/Empty State, 31-case QA 적용. Founder QA 대기. | 완료 |
| MYOTT-S09-006A2A | Genre Taxonomy Classification & Semantic Pair Audit | `이번 커밋` | Provider/Canonical 장르 분리, shared TV ID semantic specialization, format/audience/style 분류, seed metric 보정, 48-case QA 적용. Founder QA 대기. | 완료 |
| MYOTT-S09-006A2B | TV Semantic Recall & Korean Genre Presentation | `이번 커밋` | Action/Adventure filtering과 scoring 분리, controlled combined 보강, 한국어 장르 표시와 선택 이유 우선순위, 표시 제목 중복 방지, 60-case QA 적용. Founder QA 대기. | 완료 |
| MYOTT-S09-006A2C | Submitted Preference Snapshot & Hard Filter Integrity | `4f1d12f` | Submitted Session 고정, Provider/display 타입 분리, KR OTT와 런타임 Hard Filter, Related identity, latest-response gate, 로컬 QA diagnostics, 81-case QA 적용. Founder QA 대기. | 완료 |
| MYOTT-S09-006A2C1 | Hard Filter Defaults, Provider Label Integrity & Codex QA Protocol | `이번 커밋` | 초기 OTT/Runtime scoring/Apple Provider label 보정, Browser Console 회귀 제거, QA Protocol v1.0과 Prompt Guide v1.5.0 적용. Founder Browser QA 대기. | 완료 |
| MYOTT-S09-OPS-001 | Persistent Founder Preview Server Automation | `이번 커밋` | 3000 Founder Preview lifecycle, 3001-3101 cleanup governance, ownership-safe Process control, TEMP State/Lock, Safe Build/Check, 22-case self-test를 표준화. 제품 코드 미수정. | 완료 |
| MYOTT-S09-OPS-001A | Founder Preview Failure Propagation, Ownership Boundary & QA Readiness Hardening | `이번 커밋` | Cleanup 실패 전파, exact repository boundary, global 3000 mutex, repository별 runtime migration, adoption semantics, founder:qa-ready gate, 59-case self-test를 적용. 제품 코드 미수정. | 완료 |

## Sprint 8

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S08-T01 | Task 8-1 TMDB 실제 검색 결과 연결 | `47872e9` | 입력 작품이 있으면 `/api/search` Provider 결과를 Decision Card/Detail Layer 데이터로 사용하고, 실패 시 기존 Mock 추천으로 fallback. UI/Provider Registry 구조 유지. | 완료 |
| MYOTT-S08-T01B | Task 8-1b TMDB 검색 결과 프론트 바인딩 보정 | `2fd2cba` | `/api/search`의 `results` 배열을 화면 카드 상태에 직접 반영하고, Provider metadata를 같은 응답 기준으로 dev 표시. Provider/API/UI 구조 유지. | 완료 |
| MYOTT-S08-T02 | Task 8-2 TMDB Result Mapping 개선 | `7a532a8` | TMDB 제목/타입/연도/평점/장르/포스터 정규화와 검색 관련도 정렬을 보강. 기존 Decision Card/Detail Layer 구조와 Mock fallback 유지. | 완료 |
| MYOTT-S08-T03 | Task 8-3 TMDB 결과 커버리지와 이미지 개선 | `c0473d1` | 여러 입력값의 TMDB 결과를 병합하고 8개까지 중복 제거, backdrop 우선 카드 이미지, Quick Pick 보조 반영. Hero는 Mock 고정 Known Issue 유지. | 완료 |
| MYOTT-S08-T04 | Task 8-4 TMDB Recommendations / Similar 기반 추천 | `ee7098b` | 입력 작품을 seed로 찾고 TMDB recommendations 우선, similar fallback으로 추천 결과를 반환. Seed 원본 제외, multi-input 병합, Mock fallback 유지. | 완료 |
| MYOTT-S08-T05 | Task 8-5 TMDB Option Metadata 기반 | `6116a34` | TMDB movie/tv 장르 metadata를 추천옵션 연결 가능한 형태로 정규화하고 `/api/options` fallback route 추가. 기존 UI/추천 흐름 유지. | 완료 |
| MYOTT-S08-T06 | Task 8-6 TMDB 작품명 자동완성 | `54850ae` | `/api/suggest`와 입력창별 300ms debounce 자동완성을 추가. 후보 선택 시 정확한 TMDB 제목 입력, 기존 추천 흐름 유지. | 완료 |
| MYOTT-S08-T06A | Task 8-6A 자동완성 닫힘 UX 정리 | `6f45773` | 외부 클릭, ESC, 입력창 focus 전환, 추천 submit 시 후보창이 닫히도록 정리. API/Provider 구조 유지. | 완료 |
| MYOTT-S08-T07 | Task 8-7 Multi-seed option scoring | `b31795c` | 여러 seed 반복, seed genre overlap, Quick Pick, 콘텐츠 타입, TMDB popularity/rating을 반영한 rule-based score 정렬 추가. UI 구조 유지. | 완료 |
| MYOTT-S08-T08 | Task 8-8 Recommendation Insight | `8c4c916` | 실제 scoring signal을 최대 3개의 짧은 Insight bullet로 변환해 Detail Layer에 표시. score 비노출, 과장 근거 없음. | 완료 |
| MYOTT-S08-T09 | Task 8-9 전체 입력/옵션 재계산 | `8af4968` | 동적 입력 전체를 다시 수집하고 결과 목표를 12개로 확대. OTT/type scoring과 개발 포트/TMDB TLS 조사 기록 추가. | 완료 |
| MYOTT-S08-T09A | Task 8-9A seed 이유 문구와 multi-seed 균형 보정 | `9d3bdcc` | ko-KR 을/를 helper, seed title cleanup, multi-seed 라운드로빈 보정, 자동완성 150ms/cache 적용. | 완료 |
| MYOTT-S08-T10 | Task 8-10 loading/options/related recommendation UX | `0e26861` | 추천 상태 분리, Detail Related Picks, `/api/options` metadata Quick Pick 연결, genre/country option scoring 반영. | 완료 |
| MYOTT-S08-T10A | Task 8-10A Quick Pick UX and option recommendation polish | `7ff87cd` | Quick Pick 검색/Grid/chip label 개선, option-only Provider 추천, Related Picks 독립 strip 분리. | 완료 |
| MYOTT-S08-T10B | Task 8-10B Related Picks and Quick Pick filter polish | `0a9a0cd` | 현재 작품 기준 Related API, carousel controls, 장르 더보기/접기, 글로벌 국가 옵션, 선택 필터 chip 추가. | 완료 |
| MYOTT-S08-T10C | Task 8-10C Recommendation option interaction rule polish | `134cab8` | Related Picks drag/swipe UX, 검색 clear button, option group 공통 expand rule, visual polish 적용. | 완료 |
| MYOTT-S08-T10D | Task 8-10D Related card and content type filtering bugfix | `439171b` | Related 카드 높이 안정화, 긴 제목 clamp, content type mapping 점검, animation discover 쏠림 완화. | 완료 |
| MYOTT-S08-T10E | Task 8-10E Content type enforcement and related card layout bugfix | `c1f5a95` | 콘텐츠 타입 후보 수집/감산 강화, 드라마+일본 애니 쏠림 완화, Related 카드 텍스트 영역 안정화. | 완료 |
| MYOTT-S08-T10F | Task 8-10F Recommendation reliability and QA finalization | `b983506` | 콘텐츠 타입별 TMDB 후보 수집 분리, content diversity, Related 클릭/카드 레이아웃, 장르 정렬/SF 라벨/OTT 표시 보강. | 완료 |
| MYOTT-S08-BUG-001 | Sprint 8 Detail Layer interaction and OTT provider accuracy | `70c79e1` | Related Picks drag/click 충돌을 분리하고, 선택한 OTT option을 실제 제공처처럼 표시하지 않도록 provider 표시를 안전화. | 완료 |
| MYOTT-S08-BUG-001B | Re-fix Related Picks interaction and OTT Provider display | `a3da385` | Founder Local QA 재현 기준으로 pointer capture를 제거하고 mouse drag/click guard로 Related Picks 상호작용을 재수정. selected OTT와 actual provider 표시 분리 유지. | 완료 |
| MYOTT-S08-BUG-002 | Narrow filter progressive fallback | `1530fbb` | 콘텐츠 타입은 hard filter로 유지하고 genre/country만 단계적으로 완화해 강한 조건에서도 결과 수를 보강. fallback 안내 Insight와 Mock QA 샘플 추가. | 완료 |
| MYOTT-S08-BUG-003 | Runtime filter enforcement | `062454c` | runtime option을 TMDB discover와 scoring에 연결하고 Mock fallback에서도 runtime 조건을 유지. short/long 결과 차이 smoke 확인. | 완료 |
| MYOTT-S08-BUG-004 | Provider detail and related card UX polish | `9b9163f` | TMDB watch provider 보강, selected OTT와 actual provider 표시 분리 유지, 비동작 상세 문구 제거, Related Picks 텍스트 clamp 개선. | 완료 |
| MYOTT-S08-BUG-005 | Related Picks loading state stabilization | `d68ed40` | selectedDetail 변경 시 stale related data를 비우고 loading/success/empty/error 상태로 분리. skeleton strip과 실패 안내 추가. | 완료 |
| MYOTT-S08-BUG-006 | Recommendation source integrity and fallback flow | `93e7f4f` | API response에 dataSource/fallbackUsed/fallbackReason을 추가하고 UI의 로컬 Mock 자동 보강을 제거. TMDB 결과와 Mock fallback 혼합 방지. | 완료 |
| MYOTT-S08-BUG-007 | Country filter integrity | `9266894` | 국가 옵션을 search/discover/provider/fallback 경로에 연결하고 country-first hard filter 및 fallback 순서 적용. relaxed fallback scoring 보정. | 완료 |

## Sprint 7

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S07-T01 | Task 7-1 Recommendation Confidence Foundation | `cf6ba39` | 상세 Layer에 실제 데이터로 오해되지 않는 추천 신뢰 단서 UI를 추가. Provider/API/추천 알고리즘 미수정. | 완료 |
| MYOTT-S07-T02 | Task 7-2 Recommendation Trust Signals | `d26aa53` | Recommendation Confidence 영역을 Trust Signal 슬롯 구조로 개선. 실제 데이터처럼 보이는 표현 없이 상세 Layer 신뢰 정보 계층 정리. | 완료 |
| MYOTT-S07-T03 | Task 7-3 Recommendation Trust Polish | `6390938` | 카드 CTA, Trust Signal, OTT 확인 정보의 시각적 우선순위를 다듬어 마지막 선택 흐름을 개선. Provider/API/추천 알고리즘 미수정. | 완료 |

## Sprint 5.0 Standardization

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S50-T01 | APS 운영체계 표준화 | `8b816f7` | Task ID 규칙, Codex Mode 기준, 기존 Task ID 소급 적용. | 완료 |

## Sprint 4

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S04-T01 | Task 4-1 서비스 아키텍처 문서 초안 | `4177b9e` | 전체 기능 범위와 v1/v2/v3 로드맵 문서화. | 완료 |
| MYOTT-S04-T02 | Task 4-2 User Journey / Data Flow 문서 | `5bad9d2` | 사용자 여정, 행동 데이터, 후보 테이블 정리. | 완료 |
| MYOTT-S04-T03 | Task 4-3 데이터 정책 / Privacy Design | `d695d3a` | 최소 수집, 삭제 정책, AI 학습 정책 정리. | 완료 |
| MYOTT-S04-T04A | Task 4-4a Content Domain DB 설계 | `1639a4e` | 콘텐츠 도메인 후보 테이블 문서화. SQL 없음. | 완료 |
| MYOTT-S04-T04B | Task 4-4b AI Recommendation Domain 설계 | `372be9a` | AI 추천 데이터 후보와 비저장 개인정보 범위 정리. | 완료 |
| MYOTT-S04-T04C | Task 4-4c User / Session Domain 설계 | `bca9fc8` | 익명 세션, 사용자, 취향, Watch Later 후보 정리. | 완료 |
| MYOTT-S04-T04D | Task 4-4d Database Inventory | `2b76875` | 모든 DB 후보를 인벤토리로 통합. | 완료 |

## Sprint 3

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S03-T01 | Task 3-1 추천 User Flow 개선 | `6ca848f` | 서비스 소개부터 결과 확인까지 한 페이지 흐름 정리. | 완료 |
| MYOTT-S03-T02 | Task 3-2 Quick Pick Layer 추가 | `008d72e` | 작품 입력 없이 필터 기반 추천 시작 가능. | 완료 |
| MYOTT-S03-T02B | Task 3-2b Quick Pick 기록/CSS 정리 | `c78ab3e` | 기록 보완과 CSS 단위 오류 정리. | 완료 |
| MYOTT-S03-T03 | Task 3-3 Quick Pick 모바일 UX 개선 | `2d19fc2` | 모바일 Layer, 필터 개수 표시, 선택 상태 유지 개선. | 완료 |
| MYOTT-S03-T03B | Task 3-3b CSS 단위 정상화/로컬 실행 확인 | `ca3637c` | CSS 단위 정리와 로컬 실행 검증 기록. | 완료 |
| MYOTT-S03-T03C | Task 3-3c Quick Pick Layer 상호작용 수정 | `337695a` | 초기 닫힘, X/오버레이/ESC 닫기 동작 수정. | 완료 |
| MYOTT-S03-T04 | Task 3-4 추천 카드/상세 Layer 복구 | `de23f3e` | 카드 정보와 상세 Layer 복구. 이후 런타임 이슈 발생. | 완료 |
| MYOTT-S03-T04B | Task 3-4b 상세 Layer 런타임 오류 해결 | `a44eec9` | 500 오류와 React error 해결. | 완료 |
| MYOTT-S03-T05 | Task 3-5 추천 결과 경험 완성 | `471f28e` | Quick Pick/입력값에 따라 더미 추천 결과를 다르게 표시. | 완료 |

## Sprint 2

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S02-T00 | 프로젝트 초기 작업 | `4d59d6c` | 추천 페이지 Sprint 기반 개발 시작. | 완료 |
| MYOTT-S02-T01 | Task 2-1 추천 페이지 기본 UI | `7324872` | 체크박스, 입력창 3개, 추천 버튼, 더미 결과 구현. | 완료 |
| MYOTT-S02-T02 | Task 2-2 README 대시보드 개선 | `7491eeb` | Current Sprint와 Current Goal 섹션 추가. | 완료 |
| MYOTT-S02-T03 | Task 2-3 Sprint 2 작업 기록 | `abfadfb` | CHANGELOG와 dev-log에 Sprint 2 기록 반영. | 완료 |

## Pre-Sprint / Migration

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-PRE-T01 | 초기 SceneSense 추천 앱 | `8062dd2` | 단순 추천 앱 초기 상태. | 완료 |
| MYOTT-PRE-T02 | Git ignore 정리 | `1ecf07a` | Git 관리 제외 파일 정리. | 완료 |
| MYOTT-PRE-T03 | Next.js 구조 전환 | `7f2a0af` | 단순 웹페이지에서 Next.js + API Route 구조로 전환. | 완료 |

## 운영 규칙

- 완료된 Task는 커밋 해시와 함께 기록합니다.
- 모든 Task는 APS Task ID를 함께 기록합니다.
- 런타임 오류나 회귀가 있었던 Task는 Review에 후속 조치 내용을 남깁니다.
- 현재 진행 중 Task는 커밋 생성 전까지 `Current task`로 표시하고, 다음 기록 업데이트 때 실제 해시를 반영합니다.
