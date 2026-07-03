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

## Sprint 8

| Task ID | Task | Commit | Review | 상태 |
| --- | --- | --- | --- | --- |
| MYOTT-S08-T01 | Task 8-1 TMDB 실제 검색 결과 연결 | `47872e9` | 입력 작품이 있으면 `/api/search` Provider 결과를 Decision Card/Detail Layer 데이터로 사용하고, 실패 시 기존 Mock 추천으로 fallback. UI/Provider Registry 구조 유지. | 완료 |
| MYOTT-S08-T01B | Task 8-1b TMDB 검색 결과 프론트 바인딩 보정 | `2fd2cba` | `/api/search`의 `results` 배열을 화면 카드 상태에 직접 반영하고, Provider metadata를 같은 응답 기준으로 dev 표시. Provider/API/UI 구조 유지. | 완료 |
| MYOTT-S08-T02 | Task 8-2 TMDB Result Mapping 개선 | This implementation commit | TMDB 제목/타입/연도/평점/장르/포스터 정규화와 검색 관련도 정렬을 보강. 기존 Decision Card/Detail Layer 구조와 Mock fallback 유지. | 완료 |

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
