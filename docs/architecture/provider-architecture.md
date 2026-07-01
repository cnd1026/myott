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

- 현재 `lib/tmdb.js`의 책임을 `tmdb-provider`로 옮길 최소 단계를 설계합니다.
- MyOTT 공통 콘텐츠 모델의 필수 필드를 정리합니다.
- Provider Registry가 필요한 시점과 범위를 결정합니다.
- 외부 Provider별 실패 처리와 fallback 정책을 문서화합니다.
