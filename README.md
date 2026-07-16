# SceneSense / MovieMind DNA

SceneSense / MovieMind DNA는 좋아했던 영화, 드라마, 애니를 바탕으로 취향을 분석하고 추천 결과를 보여주는 웹앱입니다. 현재는 추천 페이지의 기본 UX를 먼저 완성하고 있으며, Provider 구조를 통해 TMDB 실제 검색 결과와 Mock fallback을 같은 흐름에서 확인할 수 있도록 개발 중입니다.

## 🚀 Current Sprint

### Sprint 8

- [x] MYOTT-S08-T01 Task 8-1 TMDB 실제 검색 결과 연결
- [x] MYOTT-S08-T01B Task 8-1b TMDB 검색 결과 프론트 바인딩 보정
- [x] MYOTT-S08-T02 Task 8-2 TMDB Result Mapping 개선
- [x] MYOTT-S08-T03 Task 8-3 TMDB 결과 커버리지와 이미지 개선
- [x] MYOTT-S08-T04 Task 8-4 TMDB Recommendations / Similar 기반 추천
- [x] MYOTT-S08-T05 Task 8-5 TMDB Option Metadata 기반
- [x] MYOTT-S08-T06 Task 8-6 TMDB 작품명 자동완성
- [x] MYOTT-S08-T06A Task 8-6A 자동완성 닫힘 UX 정리
- [x] MYOTT-S08-T07 Task 8-7 Multi-seed option scoring
- [x] MYOTT-S08-T08 Task 8-8 Recommendation Insight
- [x] MYOTT-S08-T09 Task 8-9 전체 입력/옵션 재계산
- [x] MYOTT-S08-T09A Task 8-9A seed 이유 문구와 multi-seed 균형 보정
- [x] MYOTT-S08-T10 Task 8-10 loading/options/related recommendation UX

### Sprint 7 Completed

- [x] MYOTT-S07-T01 Task 7-1 Recommendation Confidence Foundation
- [x] MYOTT-S07-T02 Task 7-2 Recommendation Trust Signals
- [x] MYOTT-S07-T03 Task 7-3 Recommendation Trust Polish

### Sprint 6 Completed

- [x] MYOTT-S06-T01 Task 6-1 Decision Card MVP
- [x] MYOTT-S06-T02 Task 6-2 Hero Recommendation MVP
- [x] MYOTT-S06-T03 Task 6-3 Hero Recommendation Micro UX Polish
- [x] MYOTT-S06-T04 Task 6-4 MVP Readiness Polish
- [x] MYOTT-S06-T05 Task 6-5 Decision Experience Final Polish

### Sprint 5 Completed

- [x] MYOTT-S50-T01 APS 운영체계 표준화
- [x] MYOTT-SEC-01 APS 문서 공개 범위 정리 및 private repo 이전 준비
- [x] APS-003 APS 핵심 운영 문서 public repo 제거
- [x] MYOTT-S05-T01 Task 5-1 Provider Architecture 설계
- [x] MYOTT-S05-T01B Task 5-1b Project Memory System 동기화
- [x] MYOTT-S05-T02 Task 5-2 Mock Provider 준비
- [x] MYOTT-S05-T03 Task 5-3 Mock Provider 구현
- [x] MYOTT-S05-T04 Task 5-4 TMDB Provider Adapter 연결
- [x] MYOTT-S05-T05 Task 5-5 동적 작품 입력 및 초기화 UX
- [x] MYOTT-S05-T06 Task 5-6 Provider Status Indicator

## Current Goal

- Real Data Integration
- 현재 Recommendation Flow를 유지한 TMDB 실제 검색 결과 연결
- 다음 작업: Founder 환경에서 실제 콘텐츠 결과와 Mock fallback 비교 검증

## Project Memory System

Built with APS.

MyOTT is developed using APS, an internal AI Project System. Core APS documentation is maintained in the private company Platform repository. This public repository keeps only the product context needed to understand and continue MyOTT development.

- [APS_PUBLIC_NOTICE.md](docs/project/APS_PUBLIC_NOTICE.md): MyOTT와 APS의 공개 저장소 참조 범위 안내
- [PROJECT_CONTEXT.md](docs/project/PROJECT_CONTEXT.md): 프로젝트 전체 맥락과 다음 목표
- [PROJECT_STATUS.md](docs/project/PROJECT_STATUS.md): 현재 Sprint, Task, Branch, Version, Last Commit
- [TASK_HISTORY.md](docs/project/TASK_HISTORY.md): Sprint별 Task, Commit, Review, 상태
- [DECISION_LOG.md](docs/project/DECISION_LOG.md): 중요한 제품/기술 결정
- [FOUNDER_NOTES.md](docs/project/FOUNDER_NOTES.md): 창업자 관점의 원칙과 메모
- [DEVELOPMENT_RULES.md](docs/project/DEVELOPMENT_RULES.md): Sprint, Task, Git, Local Test 운영 규칙
- [AI_COLLABORATION.md](docs/project/AI_COLLABORATION.md): Product Owner, GPT, Codex 협업 방식
- [BOOK_STATUS.md](docs/project/BOOK_STATUS.md): MyOTT Bible과 AI Development System 진행 상태

## 실행

```powershell
pnpm install
pnpm founder:preflight
```

Founder Preview는 `http://127.0.0.1:3000/`에서 유지합니다.

```powershell
# 현재 Preview 상태
pnpm founder:status

# 테스트, QA, Build 후 Preview 자동 복구
pnpm founder:check

# 작업 종료 시 임시 Server 정리와 최종 Preview 검증
pnpm founder:finalize
```

일반 코드 변경은 Next.js Fast Refresh로 반영합니다. Codex 임시 Server는 `3001-3100`만 사용하며 `3101` 이상에는 새 Server를 열지 않습니다. Process 소유권을 확인하지 않은 종료는 금지합니다.

상세 운영 기준은 [FOUNDER_PREVIEW_OPERATIONS.md](docs/project/FOUNDER_PREVIEW_OPERATIONS.md)를 참고합니다.

현재 앱은 저장소 루트에서 Next.js 구조로 동작합니다.

- 화면: `app/page.jsx`
- 전역 스타일: `app/globals.css`
- 추천 UI 상태: `app/page.jsx`
- TMDb 검색 API: `app/api/search/route.js`
- TMDb 자동완성 API: `app/api/suggest/route.js`
- TMDb 옵션 metadata API: `app/api/options/route.js`
- TMDb 상태 API: `app/api/status/route.js`
- Provider Registry: `src/lib/providers/registry.js`
- Mock Provider: `src/lib/providers/mock/`

## TMDb API 연결

1. TMDb에서 API 키를 발급받습니다.
2. `.env.example`을 복사해 `.env.local`을 만듭니다.
3. 아래 값 중 하나를 입력합니다.

```text
TMDB_API_KEY=your_tmdb_v3_api_key_here
# 또는
TMDB_BEARER_TOKEN=your_tmdb_v4_read_access_token_here
```

4. 서버를 다시 시작합니다.

`/api/status`에서 `tmdbEnabled`가 `true`면 실시간 검색이 활성화된 상태입니다.

## 동작 방식

- API 키가 있으면 `/api/search`가 입력 작품을 seed로 찾아 TMDb recommendations/similar 결과를 가져옵니다.
- `/api/suggest`는 작품 입력 중 TMDb 검색 후보를 반환하고, 실패 시 빈 후보를 반환해 입력 흐름을 유지합니다.
- `/api/options`는 TMDb 장르 metadata를 추천옵션에 연결 가능한 형태로 정규화하고, 실패 시 fallback 옵션을 유지합니다.
- API 키가 없거나 TMDb 검색에 실패하면 Provider Registry를 통해 Mock Provider 결과로 fallback합니다.
- 입력한 제목이 TMDb/로컬 DB에 없으면 앱 화면에 안내가 표시됩니다.
- TMDb 키는 Next.js API Route에서만 읽으며 브라우저 번들에는 노출하지 않습니다.

## 개발 기록 규칙

- 기능, 구조, 배포 설정, 외부 서비스 연동처럼 프로젝트 흐름에 영향을 주는 변경을 하면 `CHANGELOG.md`와 `docs/dev-log.md`를 함께 업데이트합니다.
- `CHANGELOG.md`에는 날짜별로 변경 내용, 이유, 다음 작업을 간단히 기록합니다.
- `docs/dev-log.md`에는 날짜별로 오늘 작업, 결정한 것, 아쉬운 점, 다음 개선을 기록합니다.
- 단순 오타 수정처럼 의미 있는 작업 흐름 변화가 없는 경우에는 기록을 생략할 수 있습니다.
