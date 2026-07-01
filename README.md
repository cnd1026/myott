# SceneSense / MovieMind DNA

SceneSense / MovieMind DNA는 좋아했던 영화, 드라마, 애니를 바탕으로 취향을 분석하고 추천 결과를 보여주는 웹앱입니다. 현재는 추천 페이지의 기본 UX를 먼저 완성하고 있으며, 외부 데이터 연동 전에도 더미 데이터로 전체 흐름을 확인할 수 있도록 개발 중입니다.

## 🚀 Current Sprint

### Sprint 4

- [x] Task 4-1 서비스 아키텍처 문서 초안
- [x] Task 4-2 User Journey / Data Flow 문서
- [x] Task 4-3 데이터 정책 / Privacy Design
- [x] Task 4-4a Content Domain DB 설계 초안

## Current Goal

- MyOTT 전체 기능 범위 문서화
- 사용자 여정과 데이터 흐름 정리
- 개인정보 최소 수집 원칙 정리
- Content Domain 데이터 모델 초안 정리
- 다음 단계: TMDB 필드 매핑과 v1.0 최소 테이블 범위 정리

## 실행

```powershell
cd outputs\ai-screen-recommender
pnpm install
pnpm dev
```

브라우저에서 `http://127.0.0.1:3000/`을 엽니다.

이제 앱은 Next.js 구조로 동작합니다.

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
