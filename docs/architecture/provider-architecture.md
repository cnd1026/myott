# Provider Architecture Draft

작성일: 2026-07-01

이 문서는 MyOTT가 특정 외부 서비스에 직접 의존하지 않고, Provider(Adapter) 구조로 콘텐츠 데이터를 가져오기 위한 설계 초안입니다. 이번 단계에서는 실제 기능 구현, API 연결 변경, TMDB 호출 이전 작업을 하지 않습니다.

## 1. 왜 Provider 구조를 사용하는가

현재 MyOTT는 TMDB를 중심으로 콘텐츠 검색과 상세 정보를 가져오는 방향으로 발전하고 있습니다. 하지만 서비스가 커지면 영상 콘텐츠뿐 아니라 애니, 책, 게임, 음악처럼 서로 다른 데이터 출처를 함께 다뤄야 합니다.

Provider 구조를 사용하면 MyOTT 내부 기능은 특정 외부 API의 모양을 직접 알 필요가 없습니다. MyOTT는 공통 인터페이스만 호출하고, 실제 외부 API 차이는 각 Provider가 흡수합니다.

향후 추가 가능성이 있는 Provider는 다음과 같습니다.

- JustWatch
- AniList
- OpenLibrary
- Steam

이 구조의 핵심 목표는 TMDB를 버리는 것이 아니라, TMDB를 MyOTT의 여러 콘텐츠 공급자 중 하나로 다룰 수 있게 만드는 것입니다.

## 2. Provider 인터페이스 개념

Provider는 외부 콘텐츠 출처를 MyOTT가 이해할 수 있는 공통 형태로 바꾸는 Adapter입니다.

설계 수준의 `ContentProvider` 개념은 다음과 같습니다.

| 메서드 | 역할 | 비고 |
| --- | --- | --- |
| `search()` | 사용자가 입력한 작품명이나 키워드로 콘텐츠를 검색합니다. | 검색 결과는 MyOTT 공통 콘텐츠 형태로 정규화합니다. |
| `getDetail()` | 특정 콘텐츠의 상세 정보를 가져옵니다. | 줄거리, 포스터, 장르, 감독, 배우 등 상세 Layer에 필요한 정보를 포함합니다. |
| `getRecommendations()` | 특정 콘텐츠나 취향 조건을 바탕으로 추천 후보를 가져옵니다. | AI 추천과 결합하기 전 외부 후보군을 가져오는 용도입니다. |
| `getTrending()` | Provider 기준 인기 콘텐츠를 가져옵니다. | 첫 방문, Quick Pick fallback, 홈 추천 후보로 활용할 수 있습니다. |

공통 요청과 응답은 MyOTT 내부 모델에 맞춰 정규화해야 합니다.

- 콘텐츠 ID
- 제목
- 콘텐츠 타입
- 장르
- 국가
- 포스터
- 줄거리
- 감독
- 주요 배우
- 제공 플랫폼
- 외부 출처와 외부 ID

## 3. TMDB Provider

`tmdb-provider`는 TMDB API를 MyOTT의 `ContentProvider` 개념에 맞춰 감싸는 Provider입니다.

역할은 다음과 같습니다.

- TMDB 검색 응답을 MyOTT 콘텐츠 모델로 변환합니다.
- 영화와 TV 응답 차이를 MyOTT의 `movie`, `series`, `animation` 타입으로 정리합니다.
- TMDB의 장르, 인물, 포스터, watch provider 정보를 MyOTT가 쓰기 쉬운 형태로 정규화합니다.
- API 키와 외부 호출 방식은 Provider 내부에 숨깁니다.
- MyOTT UI와 API route는 TMDB 세부 응답 구조에 직접 의존하지 않도록 합니다.

현재 `lib/tmdb.js`에 있는 직접 호출 구조는 이후 `tmdb-provider` 뒤로 이동하는 후보입니다. 이번 작업에서는 이동하지 않고, 설계 문서와 폴더 초안만 둡니다.

## 4. 향후 Provider

### JustWatch Provider

OTT 제공 여부와 지역별 스트리밍 가능 정보를 보강하는 후보입니다.

- OTT 플랫폼별 제공 여부
- 지역별 제공 정보
- 종료 예정 또는 제공 변경 정보

### AniList Provider

애니메이션과 애니 시리즈 정보를 보강하는 후보입니다.

- 애니 상세 메타데이터
- 시즌, 에피소드, 방영 상태
- 애니 특화 장르와 태그

### OpenLibrary Provider

책, 소설, 원작 정보를 확장할 때 사용할 수 있는 후보입니다.

- 도서 메타데이터
- 저자 정보
- 원작 기반 추천

### Steam Provider

게임 추천 확장 시 사용할 수 있는 후보입니다.

- 게임 메타데이터
- 플랫폼 정보
- 장르, 태그, 플레이타임 후보

## 5. 데이터 흐름

Provider 구조의 기본 흐름은 다음과 같습니다.

```text
사용자
↓
MyOTT
↓
Content Provider
↓
TMDB 또는 다른 외부 Provider
↓
MyOTT
↓
UI
```

예상 흐름은 다음과 같습니다.

1. 사용자가 작품명, 콘텐츠 타입, Quick Pick 필터를 선택합니다.
2. MyOTT API route 또는 서버 로직이 Provider Registry에서 필요한 Provider를 선택합니다.
3. 선택된 Provider가 외부 API를 호출합니다.
4. Provider가 외부 응답을 MyOTT 공통 콘텐츠 형태로 정규화합니다.
5. MyOTT 추천 로직은 정규화된 데이터만 사용합니다.
6. UI는 Provider 출처와 관계없이 같은 카드와 상세 Layer 구조로 결과를 표시합니다.

## 6. 장점

### 교체 가능

TMDB 응답 구조가 바뀌거나 다른 데이터 공급자를 추가해도 MyOTT 내부 UI와 추천 흐름을 크게 바꾸지 않아도 됩니다.

### 테스트 용이

Provider 인터페이스를 기준으로 mock provider를 만들 수 있습니다. 외부 API 연결 없이도 검색, 상세, 추천 후보 흐름을 테스트할 수 있습니다.

### 확장성

영상 콘텐츠에서 애니, 책, 게임, 음악으로 확장할 때 각 도메인 Provider를 추가하는 방식으로 넓힐 수 있습니다.

### 유지보수

외부 API 인증, 응답 정규화, 오류 처리, rate limit 대응을 Provider 내부에 모을 수 있습니다.

## 7. 폴더 구조 초안

이번 작업에서 추가하는 구조는 기능 구현이 아니라 설계 초안입니다.

```text
src/
  lib/
    providers/
      provider.js
      tmdb/
        index.js
        provider.js
```

역할은 다음과 같습니다.

| 파일 | 역할 |
| --- | --- |
| `src/lib/providers/provider.js` | `ContentProvider` 계약을 JSDoc 수준으로 설명합니다. |
| `src/lib/providers/tmdb/provider.js` | 향후 TMDB Provider가 담당할 책임을 기록합니다. |
| `src/lib/providers/tmdb/index.js` | 향후 TMDB Provider 공개 진입점 자리입니다. |

## 8. 구현 경계

- 이번 작업에서는 기존 `lib/tmdb.js`를 수정하지 않습니다.
- 이번 작업에서는 `app/api/search/route.js`를 수정하지 않습니다.
- 이번 작업에서는 Provider Registry를 구현하지 않습니다.
- 이번 작업에서는 TMDB API 연결 방식을 변경하지 않습니다.
- 이번 작업에서는 JustWatch, AniList, OpenLibrary, Steam을 실제로 연결하지 않습니다.

## 9. 다음 작업

- Task 5-2에서 Mock Provider 구현 전 최소 설계를 정리합니다.
- Task 5-3에서 Mock Provider를 실제로 구현할 수 있는지 검토합니다.
- 현재 `lib/tmdb.js`의 책임을 `tmdb-provider`로 옮길 최소 단계를 설계합니다.
- 외부 Provider별 실패 처리와 fallback 정책을 문서화합니다.

## 10. MyOTT 공통 콘텐츠 모델

Mock Provider와 TMDB Provider는 외부 출처가 달라도 MyOTT 내부에서 같은 콘텐츠 모델을 반환해야 합니다. 이 모델은 UI, 추천 카드, 상세 Layer, 향후 DB 저장 후보가 함께 이해할 수 있는 최소 단위입니다.

### 필수 필드

| 필드 | 타입 후보 | 목적 | 비고 |
| --- | --- | --- | --- |
| `id` | string | MyOTT 내부에서 사용하는 콘텐츠 식별자 | Mock Provider에서는 `mock-001`처럼 안정적인 문자열을 사용합니다. |
| `providerId` | string | 데이터를 제공한 Provider 식별자 | 예: `mock`, `tmdb` |
| `providerContentId` | string | 외부 Provider의 콘텐츠 ID | TMDB ID, Mock ID, 향후 AniList/Steam ID 등 |
| `title` | string | 사용자에게 표시할 제목 | 추천 카드와 상세 Layer의 기본 표시값 |
| `contentType` | string | 콘텐츠 타입 | `movie`, `series`, `animation`을 우선 사용합니다. |
| `genres` | string[] | 장르 목록 | Quick Pick, 카드 표시, 추천 이유에 사용합니다. |
| `poster` | string | 포스터 URL 또는 로컬/placeholder 경로 | 값이 없을 경우 빈 문자열 허용 |
| `overview` | string | 줄거리 또는 소개 | 상세 Layer에 표시합니다. |
| `releaseYear` | number | 공개 연도 | TMDB의 `release_date`, `first_air_date`에서 정규화합니다. |
| `country` | string | 제작 국가 또는 대표 국가 | Quick Pick 국가 필터와 연결됩니다. |
| `platforms` | string[] | 제공 OTT 또는 플랫폼 | 기존 `ott` 필드와 호환되는 개념입니다. |
| `source` | string | UI/API 응답 출처 표시 | 기존 응답의 `source`와 혼동되지 않도록 Provider 내부에서는 `providerId`를 우선합니다. |

### 권장 필드

| 필드 | 타입 후보 | 목적 | 비고 |
| --- | --- | --- | --- |
| `director` | string | 감독 또는 creator 표시 | 영화/시리즈 차이를 Provider가 정규화합니다. |
| `actors` | string[] | 주요 배우 | 카드와 상세 Layer에 사용합니다. |
| `runtime` | number | 러닝타임 또는 대표 에피소드 길이 | Quick Pick 러닝타임 필터와 연결 가능합니다. |
| `rating` | number | 외부 평점 또는 내부 표시용 점수 | Provider별 기준 차이를 문서화해야 합니다. |
| `moods` | string[] | 분위기 태그 | 기존 `mood` 배열과 호환됩니다. |
| `keywords` | string[] | 검색/추천 보조 키워드 | 추천 이유와 AI 후보 신호로 확장 가능합니다. |
| `recommendationReason` | string | 추천 이유 | Mock Provider에서는 샘플 문구를 넣을 수 있습니다. |

### 기존 필드 호환 메모

현재 `lib/tmdb.js`의 `normalizeTmdbItem()`은 아래 형태를 반환합니다.

- `tmdbId`
- `title`
- `type`
- `year`
- `country`
- `genres`
- `director`
- `actors`
- `rating`
- `runtime`
- `ott`
- `mood`
- `keywords`
- `synopsis`
- `poster`
- `source`

Provider 전환 시에는 기존 UI/API 소비를 한 번에 깨지 않기 위해 변환 레이어를 둡니다.

| 현재 필드 | 공통 모델 후보 | 전환 메모 |
| --- | --- | --- |
| `tmdbId` | `providerContentId` | `providerId: "tmdb"`와 함께 사용합니다. |
| `type` | `contentType` | 기존 UI가 `type`을 쓰는지 확인 후 호환 alias를 둘 수 있습니다. |
| `year` | `releaseYear` | 초기 전환에서는 `year`도 함께 반환할 수 있습니다. |
| `ott` | `platforms` | 기존 카드가 `ott`를 쓰면 adapter 응답에서 alias를 유지합니다. |
| `mood` | `moods` | 배열 형태를 유지하되 이름을 복수형으로 정리합니다. |
| `synopsis` | `overview` | 상세 Layer 호환을 위해 초기에는 둘 다 반환할 수 있습니다. |

## 11. Mock Provider 샘플 콘텐츠 구조

Mock Provider는 외부 API 연결 없이 Provider 구조와 UI/API 전환을 검증하기 위한 테스트용 Provider입니다. 실제 구현은 다음 Task에서 진행하며, 이번 Task에서는 반환 구조만 정의합니다.

### 샘플 검색 응답

```json
{
  "source": "mock",
  "providerId": "mock",
  "providerEnabled": true,
  "results": [
    {
      "id": "mock-001",
      "providerId": "mock",
      "providerContentId": "mock-001",
      "title": "라라랜드",
      "contentType": "movie",
      "genres": ["로맨스", "뮤지컬", "드라마"],
      "poster": "",
      "overview": "꿈과 사랑 사이에서 흔들리는 두 사람의 이야기.",
      "releaseYear": 2016,
      "country": "미국",
      "platforms": ["검색 필요"],
      "director": "데이미언 셔젤",
      "actors": ["라이언 고슬링", "엠마 스톤"],
      "runtime": 128,
      "rating": 8.0,
      "moods": ["moving", "romantic"],
      "keywords": ["음악", "꿈", "사랑"],
      "recommendationReason": "로맨스와 감성적인 분위기를 좋아하는 사용자에게 어울리는 샘플 추천입니다."
    }
  ]
}
```

### 샘플 상세 응답

```json
{
  "source": "mock",
  "providerId": "mock",
  "result": {
    "id": "mock-001",
    "providerId": "mock",
    "providerContentId": "mock-001",
    "title": "라라랜드",
    "contentType": "movie",
    "genres": ["로맨스", "뮤지컬", "드라마"],
    "poster": "",
    "overview": "꿈과 사랑 사이에서 흔들리는 두 사람의 이야기.",
    "releaseYear": 2016,
    "country": "미국",
    "platforms": ["검색 필요"],
    "director": "데이미언 셔젤",
    "actors": ["라이언 고슬링", "엠마 스톤"],
    "runtime": 128,
    "rating": 8.0,
    "moods": ["moving", "romantic"],
    "keywords": ["음악", "꿈", "사랑"],
    "recommendationReason": "로맨스와 감성적인 분위기를 좋아하는 사용자에게 어울리는 샘플 추천입니다."
  }
}
```

### Mock Provider 샘플 데이터 원칙

- 외부 API를 호출하지 않습니다.
- TMDB API key나 Supabase 설정을 요구하지 않습니다.
- 영화, 드라마, 애니 샘플을 최소 1개씩 둡니다.
- UI가 기대하는 기존 필드와 새 공통 모델 필드 사이의 alias 전략을 문서화한 뒤 구현합니다.
- 추천 알고리즘을 바꾸지 않고 Provider 응답 구조만 검증합니다.

## 12. 현재 직접 의존 구조 확인

현재 `app/api/search/route.js`는 TMDB 모듈을 직접 import합니다.

```js
import { hasTmdbKey, searchTmdb } from "../../../lib/tmdb";
```

현재 흐름은 다음과 같습니다.

```text
app/api/search/route.js
↓
lib/tmdb.js
↓
TMDB API
↓
normalizeTmdbItem()
↓
Response.json()
```

확인한 문제:

- API route가 Provider 인터페이스가 아니라 `lib/tmdb.js`의 함수명에 직접 의존합니다.
- `tmdbEnabled` 같은 응답 필드가 TMDB 전용 이름입니다.
- `normalizeTmdbItem()`이 Provider 공통 모델이 아니라 TMDB 응답 구조에 맞춰져 있습니다.
- Mock Provider를 붙이려면 API route가 특정 Provider 구현이 아니라 Provider 선택 레이어를 바라보는 구조가 필요합니다.

이번 Task에서는 이 구조를 수정하지 않습니다.

## 13. Mock Provider 전환 단계

다음 Task에서 안전하게 Mock Provider를 구현하기 위한 전환 단계는 다음과 같습니다.

### Step 1. Mock Provider 데이터 파일 추가

후보:

```text
src/lib/providers/mock/
  data.js
  provider.js
  index.js
```

역할:

- `data.js`: 샘플 콘텐츠 배열
- `provider.js`: `search`, `getDetail`, `getRecommendations`, `getTrending` 초안 구현
- `index.js`: mock provider export

### Step 2. 공통 모델 alias 전략 적용

Mock Provider는 공통 모델 필드를 우선 반환하되, 기존 UI/API 호환을 위해 필요한 alias를 함께 둘 수 있습니다.

초기 호환 alias 후보:

- `type` -> `contentType`
- `year` -> `releaseYear`
- `ott` -> `platforms`
- `mood` -> `moods`
- `synopsis` -> `overview`

### Step 3. API route 전환 범위 결정

`app/api/search/route.js`를 바로 크게 바꾸지 않고 아래 중 하나를 선택합니다.

Option A:

- API route가 mock provider를 직접 import합니다.
- 가장 단순하지만 Provider Registry 없이 Provider 선택 로직이 route에 남습니다.

Option B:

- 작은 `getDefaultProvider()` 함수를 둡니다.
- Registry라는 이름을 붙이지 않고도 route의 직접 의존을 줄일 수 있습니다.

Option C:

- Provider Registry를 도입합니다.
- 확장성은 좋지만 Task 5-2 다음 구현 범위가 커질 수 있습니다.

### Step 4. 기존 TMDB 동작 유지

Mock Provider 구현 후에도 기존 TMDB 검색 route가 깨지지 않아야 합니다.

검증 기준:

- API key가 없을 때도 mock/fallback 흐름이 안정적이어야 합니다.
- API key가 있을 때 TMDB 기존 동작을 유지하거나 명확한 Provider 선택 기준을 둬야 합니다.
- 응답 필드는 UI가 기대하는 형태와 호환되어야 합니다.

### Step 5. Local Test

Mock Provider 구현 Task에서는 최소한 아래를 확인합니다.

- `pnpm dev`
- `/api/search?q=라라랜드`
- API 응답에 mock 결과 포함 여부
- 기존 추천 페이지가 깨지지 않는지 확인
- console/runtime error 없음 확인

## 14. Provider Registry 판단

Task 5-2 결론:

Provider Registry는 이번 Task에서 구현하지 않습니다.

이유:

- 이번 Task의 목표는 Mock Provider 구현 전 최소 설계입니다.
- Registry를 함께 구현하면 Provider 선택 정책, fallback 우선순위, 환경변수 제어까지 범위가 커집니다.
- 아직 Mock Provider가 없으므로 Registry의 실제 필요 범위를 검증할 수 없습니다.

다음 Task 추천:

- Task 5-3에서는 Registry 전체 구현보다 `getDefaultProvider()` 또는 `mockProvider` 직접 연결 중 하나를 선택합니다.
- Provider가 2개 이상 실제 동작하기 시작하면 Registry를 별도 Task로 분리합니다.
- Registry 도입 시점에는 Provider 우선순위, fallback 정책, response metadata 이름을 함께 문서화합니다.

## 15. Task 5-3 후보

추천 Task:

```text
Sprint 5 - Task 5-3

목표
Mock Provider를 실제로 추가하고 API route 전환의 첫 단계를 구현한다.

수정 범위
- src/lib/providers/mock/
- 필요한 경우 provider export 파일
- app/api/search/route.js는 최소 변경만 허용
- CHANGELOG.md
- docs/dev-log.md

금지
- TMDB 기능 제거 금지
- Supabase 연결 금지
- SQL 작성 금지
- UI 구조 변경 금지
- 추천 알고리즘 변경 금지
- Provider Registry 대규모 구현 금지
```

## 16. MYOTT-S05-T03 구현 결과

Task MYOTT-S05-T03에서는 Mock Provider를 실제 런타임 코드로 추가하고 `/api/search`에 연결했습니다.

구현 파일:

```text
src/lib/providers/
  registry.js
  mock/
    data.js
    index.js
    provider.js
```

구현 결정:

- Mock Provider는 `search`, `getDetail`, `getRecommendations`, `getTrending` 메서드를 제공합니다.
- Mock Provider는 공통 콘텐츠 모델 필드를 반환합니다.
- 기존 API/UI 호환을 위해 `type`, `year`, `ott`, `mood`, `synopsis`, `genre`, `label`, `tags` alias를 함께 유지합니다.
- Provider Registry는 `getProvider`, `getFallbackProvider`, `listProviders`만 제공하는 최소 구현입니다.
- `/api/search`는 TMDB API key가 없거나 TMDB 검색이 실패하면 Mock Provider 결과로 fallback합니다.
- `app/page.jsx`와 CSS는 수정하지 않았습니다.

Registry 판단:

- Task 5-2에서는 Registry 구현을 보류했습니다.
- Task 5-3에서는 Provider 교체 가능성을 실제로 검증하기 위해 최소 Registry만 도입했습니다.
- Provider 우선순위, 환경변수 기반 provider 선택, TMDB Provider adapter 등록은 다음 Task로 분리합니다.

다음 Task 후보:

- TMDB Provider adapter 구현
- `lib/tmdb.js`를 Provider 인터페이스 뒤로 이동
- Provider Registry의 provider 선택 정책 문서화

## 17. MYOTT-S05-T04 구현 결과

Task MYOTT-S05-T04에서는 TMDB Provider Adapter를 실제 Registry 구조에 연결했습니다.

구현 파일:

```text
src/lib/providers/
  registry.js
  tmdb/
    index.js
    provider.js

app/api/search/route.js
```

구현 결정:

- `tmdbProvider`는 기존 `lib/tmdb.js`의 `searchTmdb`와 `hasTmdbKey`를 감싸는 adapter입니다.
- `/api/search`는 더 이상 `lib/tmdb.js`를 직접 import하지 않습니다.
- `/api/search`는 `getActiveProvider()`로 active provider를 선택합니다.
- TMDB key가 있으면 TMDB Provider가 active provider가 됩니다.
- TMDB key가 없으면 Mock Provider가 active provider가 됩니다.
- TMDB 검색 중 오류가 발생하면 Mock Provider로 fallback합니다.
- TMDB 결과는 Unified Content Model 필드(`providerId`, `providerContentId`, `contentType`, `releaseYear`, `platforms`, `moods`, `overview`)로 보강합니다.
- 기존 응답 호환을 위해 `type`, `year`, `ott`, `mood`, `synopsis`, `genre`, `label` alias를 유지합니다.

남은 범위:

- `lib/tmdb.js` 내부 정리와 TMDB detail/recommendation provider 확장은 다음 Task로 분리합니다.
- 환경변수 기반 provider 강제 선택 정책은 아직 도입하지 않았습니다.
- TMDB key 활성화 경로는 실제 key가 있는 Founder 환경에서 추가 확인합니다.
