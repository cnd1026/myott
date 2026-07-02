# Project Status

이 문서는 MyOTT의 현재 진행 상태를 빠르게 확인하기 위한 상태판입니다.

## Current Sprint

Sprint 6

## Current Task

MYOTT-S06-T04 MVP Readiness Review

## Current Branch

`main`

## Current Version

`0.1.0`

## Last Commit

MYOTT-S06-T03 시작 시점 기준:

`525902d refactor(ui): polish hero recommendation experience`

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
- 개발 환경에서는 Provider Status Indicator로 현재 data source와 fallback 여부를 확인할 수 있습니다.
- Sprint 6에서는 추천 결과를 더 빠른 결정을 돕는 Decision Card 형태로 개선합니다.
- 메인 화면 최상단에는 입력 없이 볼 수 있는 Hero Recommendation 3개가 표시됩니다.
- Hero Recommendation 문구와 CTA는 입력으로 자연스럽게 이어지도록 다듬어진 상태입니다.
- MVP Readiness Polish로 Hero, 입력, 결과 영역의 문구와 카드 균형을 최종 점검하는 단계입니다.

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

Decision Experience MVP를 마감하고 추천 결과 이해 시간을 줄입니다.

## Immediate Next Tasks

- MVP Readiness Founder Review
- 10초/30초 Time Validation
- Provider 검색 결과와 메인 추천 UX 연결 방식 검토
- TMDB key 환경에서 실제 Provider Badge Founder Review
- v1.0 최소 추천 경험과 DB 연동 시점 정리

## Risk Notes

- README 실행 명령은 현재 저장소 루트 기준 `pnpm install`, `pnpm dev`로 정리되어 있습니다.
- TMDB Provider Adapter는 기존 `lib/tmdb.js`를 감싸는 형태이며, `lib/tmdb.js` 자체를 제거하지는 않았습니다.
- 현재 환경에는 TMDB key가 없을 수 있으므로 TMDB 성공 경로는 Founder 환경에서 추가 확인이 필요합니다.
- MYOTT-S06-T04는 Provider Registry/API/TMDB/Mock Provider를 수정하지 않는 MVP polish 작업입니다.
- DB 설계는 문서 단계이며 SQL, Supabase 연결, 마이그레이션은 아직 없습니다.
- APS 핵심 운영 문서는 MyOTT public repository에서 제거되었고, Nd_core가 Source of Truth입니다.
- MyOTT public repository에는 APS 존재와 브랜드 참조만 유지합니다.
- Git history rewrite, force push, filter-repo는 이번 Task에서 사용하지 않습니다.

## Sprint 5 Retrospective

### What went well

- Provider Architecture, Mock Provider, TMDB Provider Adapter, fallback 흐름을 Sprint 안에서 연결했습니다.
- UI를 크게 흔들지 않고 Provider Foundation을 검증 가능한 구조로 만들었습니다.
- Dynamic Title Input과 Reset UX까지 정리해 Sprint 6의 추천 경험 개선에 필요한 기본 조작 흐름을 확보했습니다.

### Lessons Learned

- Provider 교체 가능성은 코드 구조만으로 충분하지 않고, 개발자가 현재 data source를 즉시 확인할 수 있어야 합니다.
- Mock Provider는 외부 API key가 없는 환경에서도 Local Verification을 이어가기 위한 필수 안전망입니다.
- 메인 추천 UX와 검색 Provider API는 아직 완전히 같은 흐름이 아니므로 Sprint 6에서 연결 기준을 신중히 정해야 합니다.

### Technical Debt

- TMDB 성공 경로는 유효한 key가 있는 Founder 환경에서 추가 검증이 필요합니다.
- Provider 선택 정책은 아직 환경변수로 강제 선택할 수 없습니다.
- 메인 추천 결과는 더미 추천 UX이며 Provider 검색 결과와 직접 통합되어 있지 않습니다.

### Parking Lot

- Provider 강제 선택 환경변수
- Provider별 latency/error badge
- 추천 결과와 Provider 검색 결과 통합
- TMDB detail/recommendation endpoint 확장

### Next Sprint

Sprint 6 Recommendation Experience
