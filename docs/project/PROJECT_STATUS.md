# Project Status

이 문서는 MyOTT의 현재 진행 상태를 빠르게 확인하기 위한 상태판입니다.

## Current Sprint

Security Maintenance

## Current Task

MYOTT-SEC-01 APS 문서 공개 범위 정리 및 private repo 이전 준비

## Current Branch

`main`

## Current Version

`0.1.0`

## Last Commit

MYOTT-SEC-01 시작 시점 기준:

`8b816f7 docs(project): standardize APS operating system`

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
- `docs/project/APS_PUBLIC_NOTICE.md`: 공개 저장소의 APS 참조 범위 안내
- `docs/project/APS_MIGRATION_PLAN.md`: APS 핵심 문서 private repository 이전 계획

## Next Milestone

APS private repository를 생성하고 핵심 문서를 이전합니다.

## Immediate Next Tasks

- APS private repository 생성
- APS 핵심 문서 복사 및 백업 확인
- 공개 저장소 README/PMS 참조 정리 후속 작업
- Task 5-2 커밋 해시 반영
- Mock Provider 실제 구현 Task 재개 여부 확인
- TMDB Provider 이전 범위 설계
- v1.0 최소 DB 테이블 범위 확정

## Risk Notes

- README 실행 명령은 현재 저장소 루트 기준 `pnpm install`, `pnpm dev`로 정리되어 있습니다.
- Provider 초안은 아직 실제 API route에 연결되어 있지 않습니다.
- DB 설계는 문서 단계이며 SQL, Supabase 연결, 마이그레이션은 아직 없습니다.
- MYOTT-SEC-01에서는 APS 핵심 문서를 삭제하지 않고 공개 참조 범위만 정리합니다.
- Git history rewrite, force push, filter-repo는 이번 Task에서 사용하지 않습니다.
