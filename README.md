# SceneSense / MovieMind DNA

AI 취향 분석형 영화/드라마/애니 추천 웹앱입니다.

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
- 클라이언트 추천 로직: `public/app.js`
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
