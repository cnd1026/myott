# SceneSense / MovieMind DNA

SceneSense / MovieMind DNA는 좋아했던 영화, 드라마, 애니를 바탕으로 취향을 분석하고 추천 결과를 보여주는 웹앱입니다. 현재는 추천 페이지의 기본 UX를 먼저 완성하고 있으며, 외부 데이터 연동 전에도 더미 데이터로 전체 흐름을 확인할 수 있도록 개발 중입니다.

## 🚀 Current Sprint

### Security Maintenance

- [x] MYOTT-S50-T01 APS 운영체계 표준화
- [x] MYOTT-SEC-01 APS 문서 공개 범위 정리 및 private repo 이전 준비

## Current Goal

- APS 핵심 문서의 공개 노출 범위 정리
- 공개 저장소에는 MyOTT 진행에 필요한 최소 PMS 문서 유지
- 다음 작업: APS private repository 생성 및 핵심 문서 이전

## Project Memory System

MyOTT는 긴 Sprint와 여러 Codex 스레드를 안정적으로 이어가기 위해 Project Memory System(PMS)을 사용합니다. MyOTT는 내부 AI Project System(APS)을 기반으로 개발되며, APS 상세 문서는 private repository로 이전 예정입니다.

- [APS_PUBLIC_NOTICE.md](docs/project/APS_PUBLIC_NOTICE.md): MyOTT와 APS의 공개 저장소 참조 범위 안내
- [APS_MIGRATION_PLAN.md](docs/project/APS_MIGRATION_PLAN.md): APS 핵심 문서 private repository 이전 계획
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
pnpm dev
```

브라우저에서 `http://127.0.0.1:3000/`을 엽니다.

현재 앱은 저장소 루트에서 Next.js 구조로 동작합니다.

- 화면: `app/page.jsx`
- 전역 스타일: `app/globals.css`
- 추천 UI 상태: `app/page.jsx`
- TMDb 검색 API: `app/api/search/route.js`
- TMDb 상태 API: `app/api/status/route.js`

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

- API 키가 있으면 `/api/search`가 TMDb의 영화/TV 검색 결과를 가져와 앱 카탈로그에 임시 반영합니다.
- API 키가 없거나 검색에 실패하면 기존 로컬 데모 DB로 fallback합니다.
- 입력한 제목이 TMDb/로컬 DB에 없으면 앱 화면에 안내가 표시됩니다.
- TMDb 키는 Next.js API Route에서만 읽으며 브라우저 번들에는 노출하지 않습니다.

## 개발 기록 규칙

- 기능, 구조, 배포 설정, 외부 서비스 연동처럼 프로젝트 흐름에 영향을 주는 변경을 하면 `CHANGELOG.md`와 `docs/dev-log.md`를 함께 업데이트합니다.
- `CHANGELOG.md`에는 날짜별로 변경 내용, 이유, 다음 작업을 간단히 기록합니다.
- `docs/dev-log.md`에는 날짜별로 오늘 작업, 결정한 것, 아쉬운 점, 다음 개선을 기록합니다.
- 단순 오타 수정처럼 의미 있는 작업 흐름 변화가 없는 경우에는 기록을 생략할 수 있습니다.
