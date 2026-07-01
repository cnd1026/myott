# Project Status

이 문서는 MyOTT의 현재 진행 상태를 빠르게 확인하기 위한 상태판입니다.

## Current Sprint

Foundation Sprint

## Current Task

Task F-02 AI PM Bootstrap System v1.0 문서 작성

## Current Branch

`main`

## Current Version

`0.1.0`

## Last Commit

F-02 시작 시점 기준:

`07a6a10 docs(project): create Project Memory System`

## Repository

`https://github.com/cnd1026/myott`

## Current App State

- Next.js 기반 앱입니다.
- 메인 추천 흐름은 한 페이지에서 동작합니다.
- Quick Pick Layer와 추천 상세 Layer가 구현되어 있습니다.
- 추천 결과는 실제 추천처럼 보이는 더미 데이터 기반 UX로 동작합니다.
- TMDB 검색 API route와 상태 API route가 있습니다.
- Provider Architecture는 문서와 초안 폴더만 있으며, 실제 검색 route는 아직 `lib/tmdb.js`를 직접 사용합니다.

## Current Documentation State

- `CHANGELOG.md`: 주요 변경 기록
- `docs/dev-log.md`: 개발일지
- `docs/service-architecture.md`: 서비스 기능 로드맵
- `docs/user-journey-data-flow.md`: 사용자 여정과 데이터 흐름
- `docs/data-policy.md`: 데이터 저장/개인정보 보호 설계
- `docs/database/`: DB 도메인 설계와 인벤토리
- `docs/architecture/provider-architecture.md`: Provider 구조 설계
- `docs/project/`: Project Memory System
- `docs/project/AI_PM_BOOTSTRAP.md`: 새 ChatGPT 채팅용 AI PM Bootstrap 문서

## Next Milestone

Provider 기반 구조로 TMDB 호출을 점진적으로 옮길 수 있는 최소 리팩터링 계획을 세웁니다.

## Immediate Next Tasks

- TMDB Provider 이전 범위 설계
- MyOTT 공통 콘텐츠 모델 필드 확정
- Provider Registry 필요 여부 결정
- v1.0 최소 DB 테이블 범위 확정
- README 실행 경로 점검

## Risk Notes

- README 실행 명령에는 과거 경로인 `outputs\ai-screen-recommender`가 남아 있어 실제 현재 루트 실행 방식과 맞는지 점검이 필요합니다.
- Provider 초안은 아직 실제 API route에 연결되어 있지 않습니다.
- DB 설계는 문서 단계이며 SQL, Supabase 연결, 마이그레이션은 아직 없습니다.
