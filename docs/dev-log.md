# Development Log

개발 과정에서의 작업 내용, 결정, 아쉬운 점, 다음 개선 사항을 날짜별로 기록합니다.

## 2026-07-01 - MYOTT-SEC-01

### 오늘 작업

- APS 공개 안내 문서 `APS_PUBLIC_NOTICE.md`를 추가했습니다.
- APS private repository 이전 계획 문서 `APS_MIGRATION_PLAN.md`를 추가했습니다.
- README에서 APS 핵심 문서 직접 링크 노출을 줄이고 공개 안내/이전 계획 중심으로 정리했습니다.
- `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `CHANGELOG.md`, `docs/dev-log.md`를 보안 정리 Task 기준으로 업데이트했습니다.

### 결정한 것

- APS 핵심 문서는 공개 저장소에서 바로 삭제하지 않습니다.
- Git history rewrite, force push, filter-repo는 이번 Task에서 사용하지 않습니다.
- APS 상세 운영 문서는 private repository로 이전하고, 공개 저장소에는 MyOTT 진행에 필요한 최소 PMS 문서만 유지합니다.

### 아쉬운 점

- APS 핵심 문서 파일은 아직 공개 저장소에 남아 있습니다.
- Private repository가 아직 생성되지 않아 실제 이전은 다음 Task로 분리했습니다.
- 과거 공개 이력 정리 여부는 별도 보안 판단이 필요합니다.

### 다음 개선

- `cnd1026/aps` 또는 `cnd1026/ai-project-system` 중 private repository 이름을 결정합니다.
- Private repository를 만들고 APS 핵심 문서를 백업/이전합니다.
- 이전 완료 후 공개 저장소에서 어떤 문서를 제거할지 별도 Task로 검토합니다.

## 2026-07-01 - MYOTT-S50-T01

### 오늘 작업

- `docs/project/APS_STANDARD.md` 문서를 새로 작성했습니다.
- Task ID 규칙과 Codex Mode 기준을 문서화했습니다.
- `TASK_HISTORY.md`에 기존 Sprint와 Foundation 작업의 Task ID를 소급 적용했습니다.
- `DEVELOPMENT_RULES.md`, `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, README를 APS 표준 기준으로 동기화했습니다.

### 결정한 것

- 기본 Task ID 형식은 `MYOTT-S{SPRINT}-T{TASK}`로 둡니다.
- Foundation Sprint는 `MYOTT-FND-T01`, Pre-Sprint는 `MYOTT-PRE-T01` 형식을 사용합니다.
- Sprint 5.0 Standardization은 `MYOTT-S50-T01` 형식을 사용합니다.
- Codex Mode는 LOW, MEDIUM, HIGH, VERY HIGH로 구분하고 작업 위험도와 검증 수준을 나타냅니다.

### 아쉬운 점

- 과거 커밋 메시지 자체에는 Task ID가 포함되어 있지 않아 `TASK_HISTORY.md`에서 소급 매핑했습니다.
- Task Template과 Review Template은 아직 별도 문서로 분리하지 않았습니다.
- MYOTT-S50-T01 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.

### 다음 개선

- `TASK_HISTORY.md`에 MYOTT-S50-T01 커밋 해시를 다음 작업 때 반영합니다.
- 새 Task부터 Task ID를 요청/문서/완료 보고에 기본 포함합니다.
- Task Template과 Review Template을 APS 기준으로 분리할지 검토합니다.

## 2026-07-01 - Task 5-2

### 오늘 작업

- Provider Architecture 문서에 MyOTT 공통 콘텐츠 모델 필수 필드와 권장 필드를 정리했습니다.
- Mock Provider 샘플 검색/상세 응답 구조를 정의했습니다.
- `app/api/search/route.js`가 현재 `lib/tmdb.js`의 `hasTmdbKey`, `searchTmdb`를 직접 사용하는 구조를 확인했습니다.
- Mock Provider 구현을 위한 전환 단계와 Provider Registry 판단을 문서화했습니다.

### 결정한 것

- Task 5-2에서는 Mock Provider를 실제로 구현하지 않습니다.
- Provider Registry도 이번 Task에서는 구현하지 않고, Mock Provider 구현 후 Provider가 2개 이상 실제 동작할 때 별도 Task로 검토합니다.
- 다음 구현 Task에서는 `src/lib/providers/mock/` 후보 구조를 기준으로 진행합니다.
- 기존 UI/API 호환을 위해 `type`, `year`, `ott`, `mood`, `synopsis` alias 전략을 검토합니다.

### 아쉬운 점

- 실제 Mock Provider 파일은 아직 만들지 않았습니다.
- API route 전환 방식은 Option A/B/C로 정리했지만 최종 구현안은 다음 Task에서 결정해야 합니다.
- Task 5-2 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.

### 다음 개선

- `TASK_HISTORY.md`에 Task 5-2 커밋 해시를 다음 작업 때 반영합니다.
- Task 5-3에서 Mock Provider를 실제로 추가합니다.
- Mock Provider 구현 후 `/api/search` 응답과 추천 페이지 호환성을 로컬에서 검증합니다.

## 2026-07-01 - Task 5-1b

### 오늘 작업

- README, PROJECT_CONTEXT, PROJECT_STATUS, TASK_HISTORY를 현재 프로젝트 상태에 맞게 동기화했습니다.
- Foundation Sprint F-01 ~ F-05 완료 상태를 반영했습니다.
- Current Sprint를 Sprint 5로, Current Task를 Task 5-2 Mock Provider 준비로 정리했습니다.
- README 실행 방법을 현재 저장소 루트 기준으로 수정했습니다.

### 결정한 것

- Task 5-2 전에는 Mock Provider 구현을 시작하지 않고 PMS 상태부터 맞춥니다.
- Last Commit은 Task 5-1b 시작 시점 기준 `74d81d8 docs(project): add AI PM validation guide`로 기록합니다.
- Sprint 5의 다음 실행 단위는 Mock Provider 준비이며, TMDB 직접 연동을 늘리지 않는 방향을 유지합니다.

### 아쉬운 점

- Task 5-1b는 자기 자신의 최종 커밋 해시를 문서 안에 정확히 반영할 수 없어 다음 기록 업데이트에서 반영해야 합니다.
- README의 프로젝트 이름은 아직 SceneSense / MovieMind DNA와 MyOTT가 함께 쓰이고 있어, 별도 네이밍 정리 Task가 필요할 수 있습니다.
- Mock Provider의 구체적인 파일 구조와 테스트 방식은 아직 설계하지 않았습니다.

### 다음 개선

- `TASK_HISTORY.md`에 Task 5-1b 커밋 해시를 다음 작업 때 반영합니다.
- Task 5-2에서 Mock Provider 준비 범위와 금지 범위를 명확히 정리합니다.
- Provider Architecture와 현재 `lib/tmdb.js` 사이의 이전 단계를 설계합니다.

## 2026-07-01 - Task F-05

### 오늘 작업

- `docs/project/AI_PM_VALIDATION.md` 문서를 새로 작성했습니다.
- 새로운 AI PM이 PMS 운영체계를 따르는지 확인하는 필수 체크리스트를 정리했습니다.
- Review 품질, Architecture 판단, Documentation 판단, 장기 유지보수, MVP 보호, Parking Lot, Decision Log, Founder Note, Book 연결 평가 항목을 만들었습니다.
- README와 PMS 관련 문서에 Validation 문서를 연결했습니다.

### 결정한 것

- AI PM Validation은 Pass, Fail, Score 방식으로 평가합니다.
- 100점 기준 배점을 두고 PMS 확인, Review 품질, Architecture 판단, Documentation 판단, 장기 유지보수 판단을 핵심 평가 영역으로 둡니다.
- 새 AI PM은 Constitution, Behavior, Validation, Bootstrap, Project Context 순서로 운영체계를 이해해야 합니다.
- F-04 커밋 `6a7bdab`은 `TASK_HISTORY.md`에 완료 상태로 반영했습니다.

### 아쉬운 점

- 아직 Task Template과 Review Template은 별도 문서로 분리하지 않았습니다.
- Validation 점수를 실제로 적용하는 예시 리뷰는 아직 만들지 않았습니다.
- F-05 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.

### 다음 개선

- `TASK_HISTORY.md`에 F-05 커밋 해시를 다음 작업 때 반영합니다.
- AI PM Validation 기준으로 Task Template과 Review Template을 설계할지 검토합니다.
- TMDB Provider 이전 설계를 Validation 기준에 맞춰 리뷰합니다.

## 2026-07-01 - Task F-04

### 오늘 작업

- `docs/project/AI_PM_BEHAVIOR.md` 문서를 새로 작성했습니다.
- AI PM의 리뷰 방식, 사용자 아이디어를 대하는 방식, 브레이크 기준, 칭찬 기준, 반대 의견 기준을 정리했습니다.
- Book 연동 관점에서 Founder Note, Decision Log, ADR 후보를 찾는 행동 규칙을 추가했습니다.
- README와 PMS 관련 문서에 Behavior 문서를 연결했습니다.

### 결정한 것

- AI PM Behavior는 성격 문서가 아니라 실제 협업 행동 규칙으로 둡니다.
- 리뷰는 잘한 점, 개선점, 이유, 다음 방향 순서로 정리합니다.
- 칭찬은 단순한 긍정이 아니라 왜 잘했는지 설명하는 방식으로 합니다.
- 반대 의견은 근거와 대안을 함께 제시할 때만 냅니다.
- MVP 지연, 기술부채 증가, 확장성 훼손, 개인정보 원칙 위반, Task 없는 개발에는 브레이크를 겁니다.

### 아쉬운 점

- 아직 ADR 문서 체계가 없어서 ADR 후보를 실제로 기록할 별도 위치는 마련하지 않았습니다.
- F-04 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.
- AI PM Behavior를 실제 Task 템플릿과 Review 템플릿으로 분리하는 작업은 남아 있습니다.

### 다음 개선

- `TASK_HISTORY.md`에 F-04 커밋 해시를 다음 작업 때 반영합니다.
- ADR 폴더와 작성 규칙을 별도 Task로 검토합니다.
- Task/Review 템플릿을 AI PM Behavior 기준으로 표준화합니다.

## 2026-07-01 - Task F-03

### 오늘 작업

- `docs/project/AI_PM_CONSTITUTION.md` 문서를 새로 작성했습니다.
- AI PM의 최상위 운영 원칙을 전문, 10개 조항, 마지막 조항으로 정리했습니다.
- README의 Project Memory System 목록에 Constitution 문서를 추가했습니다.
- Bootstrap, Project Status, Task History, AI Collaboration, Book Status 문서에 Constitution 연결을 반영했습니다.

### 결정한 것

- AI PM Constitution은 기술 문서가 아니라 프로젝트 운영 헌법으로 둡니다.
- AI PM은 장기 유지보수, 설계 없는 구현 금지, Documentation First, Architecture First, MVP 보호를 최상위 원칙으로 따릅니다.
- 사용자의 의견은 항상 존중하지만 무조건 동의하지 않고, 장단점과 이유를 객관적으로 설명합니다.
- 중요한 결정은 Founder Note, Decision Log, ADR 중 하나에 남기는 원칙을 유지합니다.

### 아쉬운 점

- ADR 문서 체계는 아직 실제로 만들지 않았고 별도 Task가 필요합니다.
- F-03 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.
- Constitution을 다른 새 프로젝트에 적용하는 템플릿화 작업은 아직 하지 않았습니다.

### 다음 개선

- `TASK_HISTORY.md`에 F-03 커밋 해시를 다음 작업 때 반영합니다.
- ADR 폴더와 작성 규칙을 만들지 검토합니다.
- TMDB Provider 이전 설계를 Constitution 원칙에 맞춰 진행합니다.

## 2026-07-01 - Task F-02

### 오늘 작업

- `docs/project/AI_PM_BOOTSTRAP.md` 문서를 새로 작성했습니다.
- 새 ChatGPT 채팅에서 사용할 AI PM Bootstrap System v1.0의 역할, 응답 순서, 개발 원칙, 금지사항을 정리했습니다.
- README의 Project Memory System 섹션에 Bootstrap 문서 링크를 추가했습니다.
- `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 F-02 상태에 맞게 업데이트했습니다.

### 결정한 것

- 새 ChatGPT 채팅에서는 `AI_PM_BOOTSTRAP.md`를 첫 번째 문서로 사용합니다.
- AI PM은 Project Manager, Software Architect, Technical Reviewer, Documentation Manager, Product Advisor 역할을 맡되 구현보다 설계와 리뷰를 우선합니다.
- Product Owner는 최종 의사결정과 우선순위, Codex는 구현과 테스트, 커밋/푸시를 담당하는 구조를 유지합니다.
- 중요한 결정은 Founder Note, Decision Log, ADR 중 하나에 기록하는 원칙을 둡니다.

### 아쉬운 점

- ADR 폴더는 아직 만들지 않았고, 필요 시 별도 Task로 검토해야 합니다.
- AI PM v2의 Task 템플릿과 Review 체크리스트는 아직 상세화하지 않았습니다.
- F-02 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.

### 다음 개선

- `TASK_HISTORY.md`에 F-02 커밋 해시를 다음 작업 때 반영합니다.
- AI PM v2에서 Task 템플릿과 Review 체크리스트를 구체화합니다.
- TMDB Provider 이전 설계를 Bootstrap 응답 순서에 맞춰 진행합니다.

## 2026-07-01 - Task F-01

### 오늘 작업

- `docs/project/` 폴더를 만들고 Project Memory System(PMS) 문서 8개를 작성했습니다.
- 프로젝트 맥락, 현재 상태, 작업 이력, 의사결정, Founder Note, 개발 규칙, AI 협업 방식, Book Status를 분리해 정리했습니다.
- README에 PMS 소개와 각 문서 링크를 추가했습니다.
- README의 Current Sprint를 Foundation Sprint로 업데이트했습니다.

### 결정한 것

- 긴 프로젝트를 이어가기 위해 PMS를 공식 운영 문서로 사용합니다.
- 새 Codex 스레드는 먼저 `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `DECISION_LOG.md`, README를 확인하는 흐름으로 둡니다.
- 중요한 제품/기술 결정은 `DECISION_LOG.md`, 창업자 관점의 원칙은 `FOUNDER_NOTES.md`에 기록합니다.
- F-01 문서 안의 Last Commit은 작업 시작 시점 기준 `365c9dd`로 남기고, 실제 F-01 커밋 해시는 완료 보고와 다음 기록 업데이트에서 반영합니다.

### 아쉬운 점

- PMS 문서가 처음 생성된 상태라 다음 Task부터 실제 운영하면서 더 다듬어야 합니다.
- README의 실행 경로는 과거 경로가 남아 있어 별도 Task에서 현재 프로젝트 루트 기준으로 점검이 필요합니다.
- Task 템플릿과 Review 체크리스트는 아직 별도 표준 문서로 분리하지 않았습니다.

### 다음 개선

- TMDB Provider 이전 설계를 시작하기 전 PMS 문서를 기준으로 현재 상태를 다시 확인합니다.
- `TASK_HISTORY.md`에 F-01 커밋 해시를 후속 기록 때 반영합니다.
- 개발 규칙에 Task 템플릿과 Review 체크리스트를 추가할지 검토합니다.

## 2026-07-01 - Task 5-1

### 오늘 작업

- `docs/architecture/provider-architecture.md` 문서를 새로 작성했습니다.
- TMDB를 직접 호출하는 구조에서 Provider(Adapter) 구조로 확장하기 위한 방향을 정리했습니다.
- `src/lib/providers/` 아래에 Provider 계약 초안과 TMDB Provider 자리표시자를 추가했습니다.
- README의 Current Sprint를 Sprint 5 진행 상태로 업데이트했습니다.

### 결정한 것

- MyOTT 내부는 특정 외부 API 대신 `ContentProvider` 개념에 의존하는 방향으로 설계합니다.
- TMDB는 제거 대상이 아니라 첫 번째 Provider로 감싸는 대상으로 둡니다.
- 현재 프로젝트가 JavaScript 기반이므로 Provider 초안은 TypeScript 파일이 아니라 JSDoc 기반 JS 파일로 작성합니다.
- 이번 작업에서는 기존 `lib/tmdb.js`, API route, UI 동작을 수정하지 않습니다.

### 아쉬운 점

- Provider Registry, fallback 순서, 오류 처리 정책은 아직 구현하지 않았습니다.
- MyOTT 공통 콘텐츠 모델의 필수 필드는 더 구체화해야 합니다.
- 기존 TMDB 호출 코드를 실제 Provider로 옮기는 작업은 다음 단계로 남겨두었습니다.

### 다음 개선

- `lib/tmdb.js`를 `tmdb-provider`로 옮길 수 있는 최소 리팩터링 단계를 나눕니다.
- Provider별 응답 실패와 빈 결과 fallback 정책을 문서화합니다.
- 테스트용 mock provider가 필요한지 검토합니다.

## 2026-07-01 - Task 4-4d

### 오늘 작업

- `docs/database/database-inventory.md` 문서를 새로 작성했습니다.
- 지금까지 설계한 Content, User/Session, AI/Recommendation, Community 도메인의 테이블 후보를 한곳에 모았습니다.
- 후보 테이블별 MVP 필수 여부와 출시 버전을 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4d 완료 상태로 업데이트했습니다.

### 결정한 것

- 이전 문서의 `recommendation_log`는 인벤토리 기준으로 `recommendation_requests`에 통합해 검토합니다.
- `comment`, `user_comments`는 `comments`로, `vote`, `content_votes`는 `votes`로 통합해 Community Domain 후보로 둡니다.
- v1은 추천, 콘텐츠, OTT 필터, 로그인, 취향 저장, Watch Later 중심으로 두고, 댓글/알림/커뮤니티 기능은 v2 이후로 분리합니다.
- 이번 작업에서는 SQL, ERD, Supabase 연결, TMDB 연결, 코드 수정을 하지 않습니다.

### 아쉬운 점

- 아직 각 테이블의 실제 컬럼 타입, 제약 조건, 인덱스는 정하지 않았습니다.
- `content_details`, `external_content_ids`, `content_aliases`처럼 v1 선택 후보의 구현 시점은 더 좁혀야 합니다.
- 이벤트 테이블은 개인정보 동의와 보관 정책이 더 구체화된 뒤 결정해야 합니다.

### 다음 개선

- Database Inventory를 기준으로 v1.0 최소 테이블 목록을 확정합니다.
- TMDB 응답 필드를 Content Domain 후보와 매핑합니다.
- User Preference와 AI Preference Vector의 경계를 다시 정리합니다.

## 2026-07-01 - Task 4-4c

### 오늘 작업

- `docs/database/user-domain.md` 문서를 새로 작성했습니다.
- 익명 세션, 로그인 사용자, 취향 저장, Watch Later, 추천 기록, 알림 후보 테이블을 정리했습니다.
- User Domain이 절대로 저장하지 않을 정보를 Data Policy에 맞춰 다시 명시했습니다.
- README의 Sprint 4 진행률을 Task 4-4c 완료 상태로 업데이트했습니다.

### 결정한 것

- MyOTT는 회원가입 없이 추천을 사용할 수 있게 설계합니다.
- 로그인 사용자는 취향 저장, Watch Later, 추천 기록, 알림 같은 개인 기능을 사용할 수 있게 둡니다.
- 인증 자체는 Supabase Auth가 담당하고, MyOTT DB에는 필요한 최소 사용자 상태만 저장하는 방향으로 둡니다.
- 이번 작업에서는 SQL, ERD, Supabase 연결, TMDB 연결, 코드/UI 수정을 하지 않습니다.

### 아쉬운 점

- `users`와 Supabase Auth 사이의 정확한 필드 경계는 실제 구현 전 더 구체화해야 합니다.
- 익명 세션 데이터를 로그인 계정에 연결할지 여부는 아직 제품 정책 결정이 필요합니다.
- 알림 채널은 email, push, in_app 후보만 적었고 v1.0 범위는 아직 정하지 않았습니다.

### 다음 개선

- User Domain과 AI Domain의 추천 요청/로그 테이블 이름을 정렬합니다.
- v1.0 최소 User/Session 테이블을 추립니다.
- 익명 세션 보관 기간과 로그인 전환 정책을 Data Policy와 함께 확정합니다.

## 2026-07-01 - Task 4-4b

### 오늘 작업

- `docs/database/ai-domain.md` 문서를 새로 작성했습니다.
- AI 추천 시스템이 사용하는 데이터와 저장하는 데이터 후보를 분리했습니다.
- AI가 절대로 저장하지 않는 개인정보 범위를 명시했습니다.
- 추천 이유 생성, 유사 사용자 추천, 취향 DNA, 날씨 추천, OTT 종료 예정 추천, 신규 공개 추천 확장 방향을 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4b 완료 상태로 업데이트했습니다.

### 결정한 것

- MyOTT AI는 개인정보를 학습하지 않습니다.
- AI Domain은 익명 행동 데이터와 콘텐츠 메타데이터를 중심으로 추천 품질을 개선합니다.
- 추천 로그, 추천 결과, 피드백, 취향 벡터, 콘텐츠 유사도는 후보 테이블로 문서화하되 실제 DB는 만들지 않습니다.
- 이번 작업에서는 SQL, ERD, Supabase 연결, TMDB 연결, 코드/UI 수정을 하지 않습니다.

### 아쉬운 점

- 추천 요청 테이블 이름이 기존 문서의 `recommendation_requests`와 `recommendation_log`로 나뉘어 있어 이후 통합 결정이 필요합니다.
- `preference_vector`를 태그 기반으로 시작할지 수치 벡터로 시작할지는 아직 정하지 않았습니다.
- 추천 이유 생성에 사용할 안전한 입력 범위는 더 구체화해야 합니다.

### 다음 개선

- AI Domain과 User Journey 문서의 이벤트/테이블 후보 이름을 정렬합니다.
- v1.0에서 필요한 AI 추천 로그 최소 범위를 정합니다.
- Watch Later, 좋아요, 싫어요 신호가 취향 DNA에 반영되는 규칙을 문서화합니다.

## 2026-07-01 - Task 4-4a

### 오늘 작업

- `docs/database/content-domain.md` 문서를 새로 작성했습니다.
- 콘텐츠 도메인의 역할과 설계 경계를 정리했습니다.
- 작품, 장르, 인물, OTT 플랫폼, 국가, 언어, 컬렉션 후보 테이블을 초안으로 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4a 완료 상태로 업데이트했습니다.

### 결정한 것

- 이번 작업에서는 SQL, ERD, Supabase 연결, TMDB 연결, 코드 수정을 하지 않습니다.
- Content Domain은 사용자 개인정보와 분리된 콘텐츠 메타데이터 중심으로 설계합니다.
- 외부 ID와 내부 ID는 분리하고, 장르/국가/언어/플랫폼은 참조 데이터로 관리하는 방향을 둡니다.

### 아쉬운 점

- 컬럼은 아직 초안이며 타입, 제약 조건, 인덱스는 정하지 않았습니다.
- 다국어 제목과 줄거리, 타입별 상세 테이블 분리 여부는 아직 결정하지 않았습니다.
- OTT 제공 정보의 출처와 갱신 주기는 별도 설계가 필요합니다.

### 다음 개선

- TMDB 응답 필드와 Content Domain 컬럼 후보를 매핑합니다.
- v1.0에 필요한 최소 콘텐츠 테이블만 추립니다.
- Recommendation Domain과 User Domain DB 초안을 이어서 작성합니다.

## 2026-07-01 - Task 4-3

### 오늘 작업

- `docs/data-policy.md` 문서를 새로 작성했습니다.
- 저장하지 않을 데이터, 익명 저장 가능 데이터, 로그인 사용자 데이터의 경계를 정리했습니다.
- 저장 기간, 계정 삭제, 익명 통계, AI 학습 정책을 제안 수준으로 문서화했습니다.
- README의 Sprint 4 진행률을 Task 4-3 완료 상태로 업데이트했습니다.

### 결정한 것

- MyOTT의 데이터 철학은 "필요한 데이터만 저장한다"로 둡니다.
- 이름, 생년월일, 전화번호, 주소, 주민등록번호, 원본 IP, 민감정보는 기본적으로 저장하지 않습니다.
- AI 추천은 개인정보 원본이 아니라 익명화된 추천 패턴과 행동 통계를 활용하는 방향으로 설계합니다.
- 이번 작업에서는 DB 생성, Supabase 연결, TMDB 연결, 코드/UI 수정을 하지 않습니다.

### 아쉬운 점

- 저장 기간은 아직 제안 수준이며 실제 법률 검토와 운영 정책에 따라 조정해야 합니다.
- 계정 삭제 시 댓글을 함께 삭제할지 익명화할지는 추가 제품 결정이 필요합니다.
- 국가별 규제 대응은 체크리스트 수준으로만 정리했고 세부 준수 요건은 별도 검토가 필요합니다.

### 다음 개선

- v1.0 최소 데이터 모델을 Data Policy 기준으로 다시 좁힙니다.
- 개인정보 처리방침 초안과 이용약관 초안을 별도 문서로 분리할지 검토합니다.
- 익명 세션 보관, 로그인 전환, 백업 삭제 정책을 더 구체화합니다.

## 2026-07-01 - Task 4-2

### 오늘 작업

- `docs/user-journey-data-flow.md` 문서를 새로 작성했습니다.
- 첫 방문부터 다시 방문과 취향 기반 추천 개선까지 사용자 여정을 단계별로 정리했습니다.
- 각 단계에서 발생할 수 있는 데이터 후보와 테이블 후보를 함께 적었습니다.
- README의 Sprint 4 진행률을 Task 4-2 완료 상태로 업데이트했습니다.

### 결정한 것

- 익명 사용자도 추천은 사용할 수 있게 두고, 장기 취향 저장과 나중에 볼래는 로그인 사용자 기능으로 분리합니다.
- 저장해야 할 데이터와 저장하지 않을 데이터를 문서에서 명확히 구분합니다.
- 이번 작업에서는 DB 생성, Supabase 연결, TMDB 연결, UI 변경을 하지 않습니다.

### 아쉬운 점

- 후보 테이블 이름은 정리했지만 컬럼, 관계, 보관 기간은 아직 정하지 않았습니다.
- 나중에 볼래를 익명 세션에서 임시 지원할지 여부는 아직 결정하지 않았습니다.
- 추천 개선을 위한 이벤트 수집 범위는 개인정보 정책과 함께 더 좁혀야 합니다.

### 다음 개선

- v1.0에 실제로 필요한 최소 테이블만 추려 데이터 모델 초안을 작성합니다.
- TMDB 응답 필드를 `contents`, `content_details`, `content_aliases` 후보와 매핑합니다.
- 익명 세션과 로그인 전환 시 데이터 이전 정책을 정리합니다.

## 2026-07-01 - Task 4-1

### 오늘 작업

- MyOTT 전체 기능 범위를 정리하는 `docs/service-architecture.md` 초안을 작성했습니다.
- 현재 기능, v1.0, v2.0, v3.0+ 기능을 단계별로 분리했습니다.
- 기능별로 필요한 DB 후보를 간단히 적었습니다.
- README에 Sprint 4 시작 상태를 반영했습니다.

### 결정한 것

- 이번 작업에서는 DB 구현, Supabase 연결, 마이그레이션을 하지 않습니다.
- Sprint 4는 기능 구현보다 서비스 구조와 데이터 범위를 먼저 문서화하는 방향으로 시작합니다.
- 장기 확장 대상은 만화, 웹툰, 소설, 게임, 음악으로 열어두되 v1.0 범위와 분리합니다.

### 아쉬운 점

- DB 이름은 아직 초안 수준이라 실제 스키마, 컬럼, 관계는 정하지 않았습니다.
- v1.0에서 어떤 기능을 먼저 출시할지 우선순위는 더 좁혀야 합니다.
- 추천 로그와 취향 저장은 개인정보 보관 정책도 함께 고민해야 합니다.

### 다음 개선

- TMDB API 응답을 어떤 내부 필드로 저장할지 매핑 문서를 작성합니다.
- v1.0 최소 데이터 모델과 Supabase 테이블 후보를 분리해 정리합니다.
- README의 Sprint 진행률을 Sprint 4 작업이 쌓일 때마다 갱신합니다.

## 2026-07-01 - Task 3-5

### 오늘 작업

- Quick Pick 선택값에 따라 서로 다른 더미 추천 결과가 나오도록 추천 결과 생성을 개선했습니다.
- SF, 로맨스, 스릴러 추천 세트를 추가하고 카드/상세 Layer에 같은 정보 구조가 표시되도록 정리했습니다.
- 작품 입력값이 있으면 추천 이유에 입력 작품명을 연결했습니다.
- 추천 실행 시 Quick Pick Layer를 닫아 상세 Layer와 동시에 꼬이지 않도록 했습니다.

### 결정한 것

- TMDb, Supabase, 로그인은 이번 작업에서 연결하지 않습니다.
- 추천 결과는 여전히 더미 데이터지만, Quick Pick 태그와 콘텐츠 타입으로 화면 결과를 다르게 보여줍니다.
- 포스터는 실제 이미지 대신 텍스트 기반 포스터 영역으로 유지해 MVP UI 흐름을 먼저 완성합니다.

### 아쉬운 점

- 실제 포스터 이미지는 아직 없고, 더미 포스터 텍스트로만 표현합니다.
- 추천 점수와 정렬 기준은 임시 태그 매칭이므로 실제 추천 알고리즘은 아닙니다.
- 모바일 실기기 터치 감각과 접근성 포커스 관리는 추가 확인이 필요합니다.

### 다음 개선

- TMDb 연동 전 추천 데이터 필드와 API 응답 매핑을 정리합니다.
- Quick Pick 태그를 실제 장르/국가/러닝타임 조건으로 변환하는 기준을 정의합니다.
- Sprint 3 MVP UI 완료 후 Sprint 4 범위를 별도 문서로 정리합니다.

## 2026-06-30 - Task 3-4b

### 오늘 작업

- Task 3-4 이후 발생한 로컬 500 오류와 React runtime 오류 가능성을 점검했습니다.
- `app/page.jsx`를 React state 기반 클라이언트 컴포넌트로 정리했습니다.
- 추천 카드 표시, 상세 Layer 열기/닫기, Quick Pick 열기/닫기 상태를 React 이벤트로 복구했습니다.
- CSS 단위 오류가 다시 생기지 않았는지 검색했습니다.

### 결정한 것

- 추천 카드와 상세 Layer는 외부 스크립트의 `innerHTML` 조작 대신 React state로 관리합니다.
- 더미 데이터, 추천 필터 기준, 추천 알고리즘은 변경하지 않습니다.
- Quick Pick 선택 상태는 Layer를 닫아도 유지하고, 상세 Layer를 열 때는 Quick Pick을 닫아 충돌을 막습니다.

### 아쉬운 점

- 상세 Layer의 포커스 트랩과 포커스 복귀 처리는 아직 별도 개선으로 남아 있습니다.
- 현재 썸네일은 실제 이미지가 아니라 텍스트 기반 더미 영역입니다.
- 이전 스크립트 구조를 정리하면서 페이지 코드가 커졌으므로, 이후 컴포넌트 분리가 필요할 수 있습니다.

### 다음 개선

- 상세 Layer 접근성, 포커스 관리, 모바일 스크롤 감각을 추가 점검합니다.
- 실제 TMDb 연동 전 더미 데이터 구조를 API 응답 구조와 맞출 준비를 합니다.
- `app/page.jsx`가 더 커지면 카드, Quick Pick, 상세 Layer를 작은 컴포넌트로 분리합니다.

## 2026-06-30 - Task 3-4

### 오늘 작업

- 추천 결과 카드에 썸네일, 제목, 타입, 장르, 감독, 주요 배우, 추천 이유를 다시 표시했습니다.
- 카드 클릭 시 열리는 상세 정보 Layer를 추가했습니다.
- 상세 Layer의 X 버튼, 배경 클릭, ESC 닫기 동작을 구현했습니다.
- Quick Pick Layer와 상세 Layer가 동시에 꼬이지 않는지 로컬 클릭 테스트로 확인했습니다.

### 결정한 것

- 현재는 더미 데이터를 유지하고, TMDb API 연결은 하지 않습니다.
- 추천 알고리즘은 변경하지 않고 결과 표시 UI와 상세 Layer만 확장합니다.
- 상세 Layer는 Quick Pick과 별도 overlay/state로 분리합니다.

### 아쉬운 점

- 썸네일은 아직 실제 이미지가 아니라 텍스트 기반 더미 영역입니다.
- 상세 Layer의 포커스 트랩과 키보드 접근성은 추가 개선 여지가 있습니다.
- 카드 정보 구조는 복구했지만 실제 데이터 연동 전까지는 콘텐츠 풍부함에 한계가 있습니다.

### 다음 개선

- 상세 Layer 접근성, 포커스 관리, 모바일 스크롤 감각을 점검합니다.
- 실제 이미지 또는 TMDb poster 데이터를 연결할 때 필요한 필드 구조를 정리합니다.
- Quick Pick 선택값과 추천 카드 표시를 연결하는 다음 작업 범위를 정의합니다.

## 2026-06-30 - Task 3-3c

### 오늘 작업

- Quick Pick Layer가 첫 진입 시 닫혀 있도록 CSS 우선순위를 수정했습니다.
- 추천 옵션 버튼, X 버튼, 배경 오버레이, ESC 키 닫기 동작을 로컬 클릭 테스트로 확인했습니다.
- Quick Pick 필터 선택 후 닫았다 다시 열었을 때 선택 상태가 유지되는지 확인했습니다.
- `pnpm build`와 `node --check public/app.js`로 컴파일과 스크립트 문법을 검증했습니다.

### 결정한 것

- 초기 닫힘 문제는 UI 구조 변경 없이 `.quick-pick-overlay.hidden` CSS 규칙으로 해결합니다.
- 추천 버튼 활성화 조건은 기존대로 작품 입력값 또는 Quick Pick 선택값 중 하나가 있으면 활성화되도록 유지합니다.
- 추천 알고리즘과 더미 결과 데이터는 변경하지 않습니다.

### 아쉬운 점

- 이번 테스트는 로컬 Chrome 기반 자동 클릭 테스트이며, 실제 모바일 기기 터치 테스트는 아직 남아 있습니다.
- Quick Pick 선택값은 아직 결과 정렬이나 필터링에는 반영되지 않습니다.
- Layer 포커스 트랩 같은 접근성 보강은 별도 작업으로 남겨두었습니다.

### 다음 개선

- Quick Pick 선택값을 더미 추천 결과나 향후 TMDb 검색 조건에 연결할지 정의합니다.
- 모바일 실기기에서 X 버튼, 배경 오버레이, 시트 스크롤 감각을 확인합니다.
- Layer 접근성 개선 범위를 별도 태스크로 분리합니다.

## 2026-06-30 - Task 3-3b

### 오늘 작업

- 전체 CSS 소스에서 `숫자 + 공백 + 단위` 패턴을 검색했습니다.
- CSS 단위 오류가 발견되지 않아 CSS 파일은 수정하지 않았습니다.
- 의존성 확인과 로컬 dev 서버 실행을 통해 프로젝트 실행 상태를 검증했습니다.
- Task 3-3b 기록을 CHANGELOG와 개발일지에 추가했습니다.
- Local Test는 `pnpm install` 후 `pnpm dev --hostname 127.0.0.1 --port 3001`로 진행했고, `http://127.0.0.1:3001/`에서 `GET / 200` 응답과 컴파일 완료를 확인했습니다.

### 결정한 것

- 기능 동작, UI 구조, 추천 로직은 변경하지 않습니다.
- README는 이번 태스크 수정 범위에서 제외합니다.
- CSS 수정 대상이 없을 때는 불필요한 no-op 스타일 변경을 만들지 않습니다.

### 아쉬운 점

- 자동 브라우저 클릭 테스트까지는 포함하지 않고, 로컬 서버 응답과 컴파일 상태 확인에 집중했습니다.
- Quick Pick의 실제 추천 반영은 아직 다음 태스크로 남아 있습니다.
- 현재 기록은 날짜 기준으로 누적되고 있어 Sprint 3 전체 요약은 별도 정리가 필요할 수 있습니다.

### 다음 개선

- Quick Pick 필터를 추천 결과와 연결하는 기준을 정의합니다.
- 모바일 실기기에서 Bottom Sheet 스크롤과 하단 버튼 위치를 확인합니다.
- Sprint 3 완료 시점에 README, CHANGELOG, 개발일지를 함께 정리합니다.

## 2026-06-30

### 오늘 작업

- Task 3-2 기록을 CHANGELOG와 개발일지에 보완했습니다.
- `008d72e` 커밋에서 추가한 Quick Pick 필터 레이어, 추천 옵션 버튼, 버튼 활성화 조건을 기록했습니다.
- CSS 단위 표기 오류를 전체 CSS 파일 대상으로 점검했습니다.

### 결정한 것

- Task 3-2b에서는 기능 동작과 UI 구조를 변경하지 않고 기록 보완과 CSS 점검만 진행합니다.
- 현재 CSS에는 공백이 끼어 있는 잘못된 단위 표기가 없어 별도 CSS 수정은 하지 않습니다.
- Quick Pick 선택값은 아직 더미 결과를 직접 바꾸지 않고, 추천 시작 조건을 보완하는 UI 상태로만 유지합니다.

### 아쉬운 점

- Quick Pick 옵션이 실제 추천 품질에 반영되는 단계는 아직 구현되지 않았습니다.
- Bottom Sheet의 세부 사용감은 실제 모바일 화면에서 추가 확인이 필요합니다.
- Sprint 3 문서 구조는 아직 Sprint 2처럼 별도 묶음으로 정리되지 않았습니다.

### 다음 개선

- Quick Pick 선택값을 추천 로직에 연결할지, 또는 TMDb 연동 이후 필터로 사용할지 결정합니다.
- 모바일 환경에서 추천 옵션 레이어의 높이, 닫기 동작, 체크 영역을 점검합니다.
- Sprint 3 작업이 더 쌓이면 CHANGELOG와 개발일지를 Sprint 단위로 정리합니다.

## Sprint 2 - 2026-06-29

### 오늘 작업

- `4d59d6c` 프로젝트 초기 작업 이후의 추천 페이지 방향을 Sprint 2 기준으로 정리했습니다.
- `7324872` Task 2-1에서 추천 페이지 기본 UI와 한 페이지 더미 추천 흐름을 구현했습니다.
- `7491eeb` Task 2-2에서 README를 프로젝트 대시보드 형태로 개선하고 Current Sprint를 표시했습니다.
- Task 2-3에서 Sprint 2 작업 기록을 CHANGELOG와 개발일지에 묶어 정리했습니다.

### 결정한 것

- Sprint 2는 추천 페이지 UX 완성과 한 페이지 구조 유지를 중심으로 진행합니다.
- 현재 단계에서는 TMDb API와 Supabase를 연결하지 않고, 더미 데이터로 추천 흐름을 검증합니다.
- 진행 상황은 README의 Current Sprint 체크리스트와 문서 기록으로 함께 관리합니다.

### 아쉬운 점

- 추천 결과는 아직 실제 데이터나 추천 알고리즘이 아닌 더미 데이터에 머물러 있습니다.
- 브라우저에서 사용자가 느끼는 세부 UX는 추가 확인과 조정이 필요합니다.
- 기존 TMDb API Route는 남아 있지만 Sprint 2 UI 흐름에서는 아직 사용하지 않습니다.

### 다음 개선

- Sprint 2 완료 후 추천 페이지 UX를 실제 화면에서 다시 점검합니다.
- Task 2-3 커밋 해시까지 README나 기록 문서에 필요하면 추가 반영합니다.
- TMDb API 연동 준비를 다음 태스크로 분리하고, 더미 데이터에서 실제 데이터로 넘어가는 기준을 정합니다.

## 2026-06-29

### 오늘 작업

- Task 2-1 요구사항에 맞춰 추천 페이지 기본 UI를 구현했습니다.
- 영화, 드라마, 애니 체크박스와 작품 입력창 3개, 추천받기 버튼을 한 페이지에 배치했습니다.
- 추천받기 버튼을 누르면 페이지 이동 없이 더미 추천 결과가 아래에 표시되도록 만들었습니다.
- README, CHANGELOG, 개발 로그를 이번 태스크 기준으로 업데이트했습니다.

### 결정한 것

- 이번 태스크에서는 UI만 구현하고 TMDb API와 Supabase 연결은 하지 않기로 했습니다.
- 결과 데이터는 고정 더미 배열을 사용하고, 체크박스 선택값으로만 필터링합니다.
- 기존 고급 추천 분석 흐름은 현재 기본 UI 범위에 맞지 않아 단순한 입력과 결과 표시 흐름으로 줄였습니다.

### 아쉬운 점

- 아직 실제 추천 알고리즘은 없고 더미 결과만 표시합니다.
- 체크박스와 입력값은 기본 흐름 확인용이며, 세부 취향 분석은 다음 단계에서 다시 설계해야 합니다.
- 브라우저 수동 QA 전까지 실제 클릭 경험의 세부 느낌은 추가 확인이 필요합니다.

### 다음 개선

- 브라우저에서 입력, 체크박스, 추천받기 버튼, 결과 표시 흐름을 확인합니다.
- 더미 결과 카드의 정보 구조를 사용자가 비교하기 쉽게 개선합니다.
- 다음 태스크에서 추천 로직 또는 외부 데이터 연결 범위를 별도로 정의합니다.

## 2026-06-29 이전 스프린트

### 오늘 작업

- 추천 페이지를 한 페이지 UI로 정리했습니다.
- 작품 입력, 추천 버튼, 결과 확인이 같은 화면에서 이어지도록 사용자 흐름을 단순화했습니다.
- README에 Current Sprint 섹션을 추가하고 CHANGELOG와 개발 로그를 업데이트했습니다.

### 결정한 것

- 이번 스프린트에서는 실제 데이터 연동보다 추천 화면과 사용자 흐름 완성을 우선합니다.
- 실제 TMDb 키가 없어도 로컬 더미 카탈로그로 결과를 볼 수 있는 상태를 유지합니다.
- 랜딩 전용 입력 흐름은 제거하고, 추천 도구 화면을 첫 화면으로 사용합니다.

### 아쉬운 점

- 아직 브라우저에서 세부 카드, 비교, 저장 같은 보조 액션까지 충분히 QA하지 못했습니다.
- 추천 결과 품질은 여전히 더미 카탈로그와 간단한 유사도 계산에 의존합니다.
- TMDb 키가 없는 상태에서는 실제 최신 작품 검색 흐름을 검증할 수 없습니다.

### 다음 개선

- 로컬 브라우저에서 추천 버튼 이후 결과 카드가 안정적으로 표시되는지 확인합니다.
- 필터와 보기 전환이 추천 결과에 자연스럽게 연결되도록 다듬습니다.
- TMDb 키 설정 후 외부 데이터 기반 입력 흐름을 검증합니다.

## 2026-06-26

### 오늘 작업

- 기존 단순 웹페이지 형태의 앱을 Next.js 프로젝트 구조로 이전했습니다.
- 앱 화면, 전역 CSS, 클라이언트 추천 로직, TMDb API Route를 각각의 역할에 맞게 배치했습니다.
- TMDb API 키를 `.env.local` 또는 Vercel 환경변수에서만 읽도록 서버 API Route 기반으로 정리했습니다.

### 결정한 것

- GitHub 저장소 `cnd1026/myott`를 기준으로 이후 작업을 이어가기로 했습니다.
- TMDb 연동은 클라이언트에서 직접 호출하지 않고 Next.js API Route를 통해 처리하기로 했습니다.
- API 키가 없거나 검색에 실패하면 기존 로컬 데모 DB로 fallback하는 방식을 유지하기로 했습니다.

### 아쉬운 점

- 아직 실제 TMDb API 키를 넣은 상태에서 전체 검색 흐름을 충분히 검증하지 못했습니다.
- Vercel production 환경에서 환경변수와 API Route가 정상 동작하는지 확인이 남아 있습니다.
- 추천 결과 품질은 임시 변환 로직에 기대고 있어, 이후 데이터 정규화와 추천 기준 개선이 필요합니다.

### 다음 개선

- TMDb 키를 설정하고 `/api/status`, `/api/search`를 로컬에서 먼저 검증합니다.
- Vercel에 환경변수를 등록하고 production 배포를 확인합니다.
- TMDb 결과의 장르, 키워드, OTT 제공처 정보를 추천 알고리즘에 더 정교하게 반영합니다.
