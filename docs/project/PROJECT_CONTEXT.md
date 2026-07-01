# Project Context

이 문서는 새 Codex 스레드나 새 작업자가 MyOTT를 바로 이어받기 위한 프로젝트 맥락 문서입니다.

## 프로젝트 소개

MyOTT는 사용자가 좋아하는 영화, 드라마, 애니를 입력하거나 Quick Pick 필터를 선택하면 취향에 맞는 작품을 추천받는 OTT 추천 서비스입니다. 현재 서비스 이름은 README에서 `SceneSense / MovieMind DNA`로도 표현되어 있으며, 프로젝트 내부에서는 `MyOTT`를 제품명으로 사용합니다.

현재 앱은 Next.js 기반으로 동작하며, 추천 UX는 더미 데이터와 일부 TMDB 검색 연결을 바탕으로 MVP 화면 흐름을 검증하는 단계입니다.

## 목표

- 사용자가 작품명을 몰라도 취향 조건만으로 추천을 받을 수 있게 합니다.
- 추천 카드와 상세 Layer를 통해 추천 이유를 이해할 수 있게 합니다.
- TMDB, AI 추천, OTT 필터, 로그인, 취향 저장을 v1.0 출시 범위로 설계합니다.
- 장기적으로 영상 콘텐츠를 넘어 만화, 웹툰, 소설, 게임, 음악 추천으로 확장합니다.

## 현재 Sprint

Security Maintenance

현재 Task:

- APS-003 APS 핵심 운영 문서 public repo 제거

직전 Sprint:

- Foundation Sprint - Project Memory System 구축

최근 완료 작업:

- Task 5-1 Provider Architecture 설계
- Task 5-1b Project Memory System 동기화
- Task 5-2 Mock Provider 준비

## 현재 구조

```text
app/
  api/
    search/route.js
    status/route.js
  globals.css
  layout.jsx
  page.jsx
lib/
  tmdb.js
src/
  lib/
    providers/
      provider.js
      tmdb/
        index.js
        provider.js
docs/
  architecture/
  database/
  project/
```

핵심 파일:

- `app/page.jsx`: 메인 추천 UI와 상태 관리
- `app/globals.css`: 전역 UI 스타일
- `app/api/search/route.js`: 검색 API route
- `app/api/status/route.js`: TMDB 상태 API route
- `lib/tmdb.js`: 현재 TMDB 직접 호출 로직
- `src/lib/providers/`: Provider 구조 초안
- `docs/`: 제품, 데이터, 아키텍처, 작업 기록 문서
- `docs/project/APS_PUBLIC_NOTICE.md`: MyOTT의 APS public reference 안내

## 핵심 철학

- 한 페이지 안에서 추천 흐름을 완성합니다.
- 사용자는 회원가입 없이도 추천을 받을 수 있어야 합니다.
- 로그인은 취향 저장, Watch Later, 추천 기록 같은 개인 기능을 위한 선택 기능입니다.
- MyOTT는 "필요한 데이터만 저장한다"는 원칙을 따릅니다.
- 개인정보는 AI 학습 대상이 아닙니다.
- 큰 기능은 구현 전에 문서로 먼저 설계합니다.
- TMDB 하나에 직접 의존하지 않고 Provider(Adapter) 구조로 확장합니다.
- MyOTT는 내부 AI Project System(APS)을 기반으로 운영되며, APS 핵심 운영 문서의 Source of Truth는 private Platform repository `cnd1026/Nd_core`입니다.

## MVP 범위

v1.0 MVP 후보:

- 추천 UX
- 작품 입력 기반 추천
- Quick Pick 기반 추천
- 추천 카드
- 상세 Layer
- TMDB 기반 콘텐츠 검색/상세 후보
- Provider 기반 외부 데이터 접근 구조
- OTT 필터
- 로그인
- 취향 저장
- Watch Later

MVP에서 후순위:

- 댓글
- 좋아요
- 추천/비추천
- Community Picks
- OTT 종료 예정
- 신규 공개 예정
- 공개 프로필
- 친구 추천
- 공유 링크

## 현재 GitHub

- Repository: `https://github.com/cnd1026/myott`
- Main Branch: `main`
- Last Known Public APS Remove Commit before APS-003: `e09ab50 docs(security): prepare APS migration to private repository`

## Parking Lot

- Community 기능 정책
- 댓글/신고/차단 운영 정책
- 추천/비추천 피드백 UI
- Provider Registry 구현 시점
- TMDB Provider 실제 이전 범위
- JustWatch, AniList, OpenLibrary, Steam 연결 여부
- 익명 세션과 로그인 계정 연결 정책
- Taste DNA 시각화
- 만화, 웹툰, 소설, 게임, 음악 확장

## 다음 목표

- PMS 문서를 기준으로 새 작업 시작 전 현재 상태를 빠르게 파악합니다.
- APS 핵심 운영 문서는 `cnd1026/Nd_core`를 Source of Truth로 둡니다.
- Public MyOTT에는 APS의 존재와 제품 개발에 필요한 최소 참조만 유지합니다.
- MyOTT Product Development를 재개합니다.
- TMDB 직접 호출 구조를 Provider 구조로 옮기는 최소 리팩터링 계획을 세웁니다.
- v1.0 최소 DB 테이블 범위를 Database Inventory 기준으로 확정합니다.
- MyOTT 공통 콘텐츠 모델의 필수 필드를 정리합니다.
