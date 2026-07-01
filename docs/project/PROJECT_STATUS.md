# Project Status

이 문서는 MyOTT의 현재 진행 상태를 빠르게 확인하기 위한 상태판입니다.

## Current Sprint

Sprint 5

## Current Task

Task 5-2 Mock Provider 준비

## Current Branch

`main`

## Current Version

`0.1.0`

## Last Commit

Task 5-1b 시작 시점 기준:

`74d81d8 docs(project): add AI PM validation guide`

## Repository

`https://github.com/cnd1026/myott`

## Current App State

- Next.js 기반 앱입니다.
- 메인 추천 흐름은 한 페이지에서 동작합니다.
- Quick Pick Layer와 추천 상세 Layer가 구현되어 있습니다.
- 추천 결과는 실제 추천처럼 보이는 더미 데이터 기반 UX로 동작합니다.
- TMDB 검색 API route와 상태 API route가 있습니다.
- Provider Architecture는 문서와 초안 폴더만 있으며, 실제 검색 route는 아직 `lib/tmdb.js`를 직접 사용합니다.
- Mock Provider는 아직 구현하지 않았습니다.

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
- `docs/project/AI_PM_CONSTITUTION.md`: AI PM 최상위 운영 헌법
- `docs/project/AI_PM_BEHAVIOR.md`: AI PM 사용자 협업 행동 규칙
- `docs/project/AI_PM_VALIDATION.md`: AI PM 운영체계 검증 체크리스트

## Next Milestone

Task 5-2에서 Mock Provider 준비 범위를 설계하고, 기존 TMDB 직접 호출 구조를 Provider 기반 구조로 옮길 안전한 첫 단계를 정합니다.

## Immediate Next Tasks

- Task 5-2 Mock Provider 준비
- MyOTT 공통 콘텐츠 모델 필드 확정
- Provider Registry 필요 여부 결정
- TMDB Provider 이전 범위 설계
- v1.0 최소 DB 테이블 범위 확정

## Risk Notes

- README 실행 명령은 현재 저장소 루트 기준 `pnpm install`, `pnpm dev`로 정리되어 있습니다.
- Provider 초안은 아직 실제 API route에 연결되어 있지 않습니다.
- DB 설계는 문서 단계이며 SQL, Supabase 연결, 마이그레이션은 아직 없습니다.
- Task 5-2 전에는 Mock Provider 구현을 시작하지 않습니다.
