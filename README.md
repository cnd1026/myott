# SceneSense / MovieMind DNA

AI 취향 분석형 영화/드라마/애니 추천 웹앱입니다.

## 실행

```powershell
cd outputs\ai-screen-recommender
python server.py
```

브라우저에서 `http://127.0.0.1:5173/`을 엽니다.

## TMDb API 연결

1. TMDb에서 API 키를 발급받습니다.
2. `.env.example`을 복사해 `.env`를 만듭니다.
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
