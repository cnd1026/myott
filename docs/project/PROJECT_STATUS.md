# Project Status

이 문서는 MyOTT의 현재 진행 상태를 빠르게 확인하기 위한 상태판입니다.

## Current Sprint

Sprint 5

## Current Task

MYOTT-S05-T05 Dynamic Title Inputs and Reset Actions

## Current Branch

`main`

## Current Version

`0.1.0`

## Last Commit

MYOTT-S05-T05 시작 시점 기준:

`a88d17a feat(provider): add tmdb provider adapter`

## Repository

`https://github.com/cnd1026/myott`

## Current App State

- Next.js 기반 앱입니다.
- 메인 추천 흐름은 한 페이지에서 동작합니다.
- Quick Pick Layer와 추천 상세 Layer가 구현되어 있습니다.
- 추천 결과는 실제 추천처럼 보이는 더미 데이터 기반 UX로 동작합니다.
- TMDB 검색 API route와 상태 API route가 있습니다.
- Provider Architecture는 Mock Provider와 TMDB Provider Adapter가 Registry에 연결된 상태입니다.
- `/api/search`는 Provider Registry를 통해 active provider를 선택합니다.
- TMDB API key가 있으면 TMDB Provider를 사용하고, key가 없거나 TMDB 검색이 실패하면 Mock Provider 결과로 fallback합니다.
- 메인 추천 UI는 동적 작품 입력창과 전체/옵션 초기화 UX를 포함합니다.

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
- APS 핵심 운영 문서의 Source of Truth는 private Platform repository `cnd1026/Nd_core`입니다.

## Next Milestone

Provider 기반 외부 데이터 연결 구조를 안정화합니다.

## Immediate Next Tasks

- TMDB key 환경에서 실제 검색 Founder Review
- 동적 작품 입력 UX Founder Review
- Provider Registry 확장 기준 정리
- Provider 선택 정책 환경변수화 여부 검토
- v1.0 최소 DB 테이블 범위 확정

## Risk Notes

- README 실행 명령은 현재 저장소 루트 기준 `pnpm install`, `pnpm dev`로 정리되어 있습니다.
- TMDB Provider Adapter는 기존 `lib/tmdb.js`를 감싸는 형태이며, `lib/tmdb.js` 자체를 제거하지는 않았습니다.
- 현재 환경에는 TMDB key가 없을 수 있으므로 key 활성화 경로는 Founder 환경에서 추가 확인이 필요합니다.
- MYOTT-S05-T05는 Provider, API route, TMDB, Mock Provider 구조를 수정하지 않는 UI 상태 관리 작업입니다.
- DB 설계는 문서 단계이며 SQL, Supabase 연결, 마이그레이션은 아직 없습니다.
- APS 핵심 운영 문서는 MyOTT public repository에서 제거되었고, Nd_core가 Source of Truth입니다.
- MyOTT public repository에는 APS 존재와 브랜드 참조만 유지합니다.
- Git history rewrite, force push, filter-repo는 이번 Task에서 사용하지 않습니다.
