# Changelog

프로젝트의 주요 변경 사항을 날짜별로 기록합니다.

## 2026-07-01 - Task F-05

### 변경 내용

- `docs/project/AI_PM_VALIDATION.md` 문서를 새로 추가했습니다.
- 새로운 AI PM이 MyOTT 운영체계를 얼마나 잘 따르는지 검증하는 체크리스트를 작성했습니다.
- Review 품질, Architecture 판단, Documentation 판단, 장기 유지보수, MVP 보호, Parking Lot, Decision Log, Founder Note, Book 연결 평가 기준을 문서화했습니다.
- README의 Project Memory System 목록에 Validation 문서를 추가했습니다.
- `AI_PM_BOOTSTRAP.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 Validation 문서 기준에 맞게 업데이트했습니다.
- F-04 커밋 `6a7bdab`을 `TASK_HISTORY.md`에 완료 상태로 반영했습니다.

### 이유

- Constitution과 Behavior가 실제 AI PM 응답 품질로 이어지는지 검증할 기준이 필요했기 때문입니다.
- 새 ChatGPT 채팅이나 새 AI PM이 PMS, MVP 보호, Documentation First, 장기 유지보수 원칙을 지키는지 판단할 수 있어야 했습니다.
- 향후 AI Development System을 표준화하기 위해 Pass, Fail, Score 기준을 미리 정리할 필요가 있었습니다.

### 다음 작업

- F-05 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- 필요 시 Task Template과 Review Template을 AI PM Validation 기준으로 분리합니다.
- TMDB Provider 실제 이전 범위를 PMS 원칙과 Validation 기준에 맞춰 설계합니다.

## 2026-07-01 - Task F-04

### 변경 내용

- `docs/project/AI_PM_BEHAVIOR.md` 문서를 새로 추가했습니다.
- AI PM의 리뷰 방식, 사용자 아이디어를 대하는 방식, 브레이크를 거는 기준, 칭찬과 반대 의견의 기준을 문서화했습니다.
- Book 연동 관점에서 Founder Note, Decision Log, ADR 후보를 찾는 행동 규칙을 정리했습니다.
- README의 Project Memory System 목록에 Behavior 문서를 추가했습니다.
- `AI_PM_BOOTSTRAP.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 Behavior 문서 기준에 맞게 업데이트했습니다.
- F-03 커밋 `d6884e5`를 `TASK_HISTORY.md`에 완료 상태로 반영했습니다.

### 이유

- Constitution이 최상위 원칙이라면, 실제 대화와 리뷰에서 AI PM이 어떻게 행동해야 하는지도 별도 기준이 필요했기 때문입니다.
- 사용자의 아이디어를 존중하되 장단점과 대안을 객관적으로 설명하는 협업 방식을 명확히 하기 위해서입니다.
- MVP 지연, 기술부채 증가, 확장성 훼손, 개인정보 원칙 위반 같은 상황에서 언제 브레이크를 걸지 기준을 남기기 위해서입니다.

### 다음 작업

- F-04 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- 필요 시 ADR 문서 체계와 Task/Review 템플릿을 별도 Task로 설계합니다.
- TMDB Provider 실제 이전 범위를 PMS 원칙에 맞춰 설계합니다.

## 2026-07-01 - Task F-03

### 변경 내용

- `docs/project/AI_PM_CONSTITUTION.md` 문서를 새로 추가했습니다.
- AI PM이 지켜야 할 최상위 운영 원칙을 Preamble과 10개 조항으로 정리했습니다.
- README의 Project Memory System 목록에 Constitution 문서를 추가했습니다.
- `AI_PM_BOOTSTRAP.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 Constitution 기준에 맞게 업데이트했습니다.
- F-02 커밋 `5d11898`을 `TASK_HISTORY.md`에 완료 상태로 반영했습니다.

### 이유

- MyOTT뿐 아니라 향후 모든 프로젝트에 적용할 AI PM 운영 원칙을 명문화할 필요가 있었기 때문입니다.
- 빠른 구현보다 장기 유지보수, Documentation First, Architecture First, MVP 보호를 우선하는 기준을 최상위에 두기 위해서입니다.
- AI가 사용자의 의견을 존중하되 무조건 동의하지 않고 객관적으로 장단점을 설명하는 협업 원칙을 분명히 하기 위해서입니다.

### 다음 작업

- F-03 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- 필요 시 ADR 문서 체계를 별도 Task로 설계합니다.
- TMDB Provider 실제 이전 범위를 Constitution과 Bootstrap 원칙에 맞춰 설계합니다.

## 2026-07-01 - Task F-02

### 변경 내용

- `docs/project/AI_PM_BOOTSTRAP.md` 문서를 새로 추가했습니다.
- 새 ChatGPT 채팅에서 첫 번째로 읽는 AI PM Bootstrap System v1.0을 정리했습니다.
- AI, Product Owner, Codex의 역할과 응답 순서, 개발 원칙, 금지사항, Book 연동 방식을 문서화했습니다.
- README의 Project Memory System 목록에 Bootstrap 문서를 추가했습니다.
- `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 Bootstrap 문서 기준에 맞게 업데이트했습니다.

### 이유

- 새 채팅이 시작될 때 프로젝트 맥락을 놓치지 않고 같은 운영 방식으로 이어가기 위한 공식 첫 문서가 필요했기 때문입니다.
- AI PM은 구현보다 설계, 리뷰, 문서화, Task 정리를 우선해야 하므로 역할 경계를 명확히 해야 했습니다.
- MyOTT 개발 과정이 향후 AI Development System과 책으로도 이어질 수 있어 중요한 결정의 기록 위치를 정리할 필요가 있었습니다.

### 다음 작업

- F-02 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- AI PM v2에서 Task 템플릿과 Review 체크리스트를 표준화합니다.
- TMDB Provider 실제 이전 범위를 Provider Architecture 기준으로 설계합니다.

## 2026-07-01 - Task F-01

### 변경 내용

- `docs/project/` 폴더를 새로 추가했습니다.
- Project Memory System(PMS) 문서 8개를 생성했습니다.
- `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `DECISION_LOG.md`, `FOUNDER_NOTES.md`, `DEVELOPMENT_RULES.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`에 현재 프로젝트 맥락과 운영 규칙을 정리했습니다.
- README에 Project Memory System 소개와 문서 링크를 추가했습니다.
- README의 Current Sprint를 Foundation Sprint / Task F-01 기준으로 업데이트했습니다.

### 이유

- Sprint와 문서가 늘어나면서 새 Codex 스레드가 프로젝트를 바로 이어받을 수 있는 기억 시스템이 필요했기 때문입니다.
- 제품 결정, 작업 이력, Founder Note, 운영 규칙이 여러 문서에 흩어지지 않도록 기준 위치를 만들기 위해서입니다.
- 장기 프로젝트에서 AI 협업 품질을 유지하려면 현재 상태와 다음 목표를 명확히 남겨야 합니다.

### 다음 작업

- F-01 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- TMDB Provider 실제 이전 범위를 PMS와 Provider Architecture 기준으로 설계합니다.
- v1.0 MVP 최소 DB 범위를 Database Inventory 기준으로 확정합니다.

## 2026-07-01 - Task 5-1

### 변경 내용

- `docs/architecture/provider-architecture.md` 문서를 새로 추가했습니다.
- TMDB 직접 의존을 줄이고 Provider(Adapter) 기반으로 외부 콘텐츠 공급자를 확장하는 구조를 설계했습니다.
- `ContentProvider`의 `search`, `getDetail`, `getRecommendations`, `getTrending` 메서드 개념을 문서화했습니다.
- `src/lib/providers/` 아래에 Provider 계약과 TMDB Provider 자리표시자 파일을 추가했습니다.
- README의 Current Sprint를 Sprint 5 / Task 5-1 기준으로 업데이트했습니다.

### 이유

- MyOTT가 TMDB 하나에만 묶이지 않고 JustWatch, AniList, OpenLibrary, Steam 같은 외부 Provider를 추가할 수 있어야 하기 때문입니다.
- 외부 API 응답 구조를 UI와 추천 흐름에서 분리해 유지보수성과 테스트 용이성을 높이기 위해서입니다.
- 실제 Provider 이전을 시작하기 전에 공통 계약과 폴더 구조를 먼저 합의할 필요가 있었습니다.

### 다음 작업

- 현재 `lib/tmdb.js`의 책임을 TMDB Provider로 옮길 최소 단계를 설계합니다.
- MyOTT 공통 콘텐츠 모델의 필수 필드를 확정합니다.
- Provider Registry와 fallback 정책이 필요한 시점을 결정합니다.

## 2026-07-01 - Task 4-4d

### 변경 내용

- `docs/database/database-inventory.md` 문서를 새로 추가했습니다.
- Content, User/Session, AI/Recommendation, Community, 장기 콘텐츠 확장 도메인의 테이블 후보를 한곳에 정리했습니다.
- `recommendation_log`, `recommendation_result`, `user_session`, `comment`, `vote`처럼 문서마다 다르게 쓰인 후보명을 인벤토리 기준 이름으로 정리했습니다.
- 각 테이블 후보별 목적, 도메인, MVP 필수 여부, 출시 버전, 필요한 이유, MVP 제외 사유, 향후 확장 가능성을 문서화했습니다.
- README의 Sprint 4 진행률을 Task 4-4d 완료 상태로 업데이트했습니다.

### 이유

- 개별 도메인 문서가 늘어나면서 v1.0에서 실제로 필요한 테이블과 후순위 후보를 구분할 기준표가 필요했기 때문입니다.
- SQL 작성 전 Content, User, AI, Community 도메인의 책임 경계를 한 번 더 정리해야 했습니다.
- MVP에서 제외되는 후보의 이유를 남겨 향후 범위가 다시 커질 때 판단 근거로 삼기 위해서입니다.

### 다음 작업

- Database Inventory를 기준으로 v1.0 필수 테이블 범위를 최종 축소합니다.
- TMDB 응답 필드를 Content Domain 후보 테이블과 매핑합니다.
- `user_preferences`, `preference_tags`, `preference_vectors`의 책임 경계를 정리합니다.

## 2026-07-01 - Task 4-4c

### 변경 내용

- `docs/database/user-domain.md` 문서를 새로 추가했습니다.
- User Domain과 Anonymous Session Domain의 역할을 정리했습니다.
- `anonymous_sessions`, `users`, `user_preferences`, `watch_later`, `recommendation_requests`, `recommendation_results`, `recommendation_feedback`, `notification_settings`, `notification_queue` 후보를 문서화했습니다.
- Supabase Auth는 인증을 담당하고 MyOTT는 필요한 최소 사용자 정보만 저장하는 방향을 기록했습니다.
- README의 Sprint 4 진행률을 Task 4-4c 완료 상태로 업데이트했습니다.

### 이유

- 회원가입 없이 추천을 사용할 수 있는 구조와 로그인 후 개인 기능을 제공하는 구조를 분리해야 했기 때문입니다.
- 취향 저장, Watch Later, 추천 기록, 알림 기능이 어떤 사용자 데이터에 의존하는지 DB 구현 전에 정리할 필요가 있었습니다.
- Data Policy의 최소 수집 원칙을 User Domain 설계에도 반영하기 위해서입니다.

### 다음 작업

- `recommendation_requests`와 AI Domain의 `recommendation_log` 이름을 통일할지 결정합니다.
- `user_preferences`와 `preference_vector`의 책임 범위를 정리합니다.
- v1.0에서 필요한 User/Session 최소 테이블 범위를 좁힙니다.

## 2026-07-01 - Task 4-4b

### 변경 내용

- `docs/database/ai-domain.md` 문서를 새로 추가했습니다.
- AI Domain의 역할과 개인정보 비학습 원칙을 정리했습니다.
- 추천 요청, 추천 결과, 클릭, Quick Pick, 검색, Watch Later, 좋아요, 싫어요, 이미 본 작품 등 AI가 사용할 데이터 후보를 문서화했습니다.
- `recommendation_log`, `recommendation_feedback`, `preference_vector`, `taste_dna`, `content_similarity` 등 AI 저장 데이터 후보와 필요한 이유를 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4b 완료 상태로 업데이트했습니다.

### 이유

- AI 추천 품질을 높이기 위해 필요한 데이터와 절대 저장하지 않을 개인정보를 분리해야 했기 때문입니다.
- 추천 로그, 클릭, 피드백, 취향 벡터가 어떤 역할을 하는지 DB 구현 전에 합의할 필요가 있었습니다.
- Data Policy의 최소 수집 원칙을 AI 추천 도메인 설계에도 반영하기 위해서입니다.

### 다음 작업

- AI Domain 후보 테이블과 User Journey 문서의 이벤트 후보 이름을 맞춥니다.
- 추천 요청과 추천 결과 테이블의 v1.0 최소 범위를 좁힙니다.
- 추천 이유 생성에 사용할 안전한 입력 범위를 정리합니다.

## 2026-07-01 - Task 4-4a

### 변경 내용

- `docs/database/content-domain.md` 문서를 새로 추가했습니다.
- Content Domain의 개요와 설계 경계를 정리했습니다.
- `contents`, `genres`, `content_genres`, `people`, `content_people`, `ott_platforms`, `content_platforms`, `countries`, `languages`, `collections` 테이블 후보를 문서화했습니다.
- 각 테이블별 목적, 주요 컬럼 초안, 필요한 이유, 향후 확장 가능성을 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4a 완료 상태로 업데이트했습니다.

### 이유

- TMDB 연동과 실제 DB 설계 전에 콘텐츠 메타데이터의 기준 구조를 먼저 합의하기 위해서입니다.
- 추천 카드와 상세 Layer에 필요한 작품, 장르, 인물, OTT 제공 정보를 분리해 설계할 필요가 있었습니다.
- 사용자 데이터와 콘텐츠 메타데이터를 분리해 개인정보 최소 수집 원칙을 유지하기 위해서입니다.

### 다음 작업

- TMDB 응답 필드를 Content Domain 후보 컬럼과 매핑합니다.
- v1.0에서 꼭 필요한 콘텐츠 테이블만 다시 좁힙니다.
- User Domain과 Recommendation Domain의 DB 초안을 별도 문서로 정리합니다.

## 2026-07-01 - Task 4-3

### 변경 내용

- `docs/data-policy.md` 문서를 새로 추가했습니다.
- MyOTT의 데이터 철학을 "필요한 데이터만 저장한다"는 원칙으로 정리했습니다.
- 저장하지 않을 데이터, 익명으로 저장 가능한 데이터, 로그인 사용자만 저장하는 데이터를 구분했습니다.
- 저장 기간, 계정 삭제 시 데이터 처리, AI 학습 정책, 향후 개인정보 규제 검토 항목을 문서화했습니다.
- README의 Sprint 4 진행률을 Task 4-3 완료 상태로 업데이트했습니다.

### 이유

- 추천 품질을 높이면서도 불필요한 개인정보 수집을 피하는 기준이 필요했기 때문입니다.
- Supabase, 로그인, 취향 저장을 구현하기 전에 어떤 데이터는 저장하지 않을지 먼저 정해야 합니다.
- 향후 개인정보 처리방침과 이용약관, AI 추천 정책으로 이어질 제품 원칙을 세우기 위해서입니다.

### 다음 작업

- Data Policy를 기준으로 v1.0 최소 데이터 모델 후보를 좁힙니다.
- 익명 세션과 로그인 전환 시 데이터 이전 정책을 더 구체화합니다.
- TMDB 연동 데이터와 사용자 데이터가 섞이지 않도록 내부 필드 경계를 정리합니다.

## 2026-07-01 - Task 4-2

### 변경 내용

- `docs/user-journey-data-flow.md` 문서를 새로 추가했습니다.
- 첫 방문부터 추천, 상세 Layer, 나중에 볼래, 다시 방문, 취향 기반 추천 개선까지 핵심 사용자 여정을 정리했습니다.
- 각 단계에서 발생하는 사용자 행동 데이터와 향후 DB 후보를 문서화했습니다.
- 익명 사용자와 로그인 사용자의 가능 기능과 저장 범위를 구분했습니다.
- README의 Sprint 4 진행률을 Task 4-2 완료 상태로 업데이트했습니다.

### 이유

- 실제 DB 구현 전에 어떤 사용자 행동을 저장할지, 어떤 데이터는 저장하지 않을지 기준을 먼저 세우기 위해서입니다.
- 추천 경험이 로그인 없이도 가능하되, 취향 저장과 나중에 볼래는 로그인 사용자 기능으로 분리할 필요가 있었습니다.
- 향후 Supabase 테이블 설계로 이어질 후보 목록을 기능 흐름 기준으로 정리하기 위해서입니다.

### 다음 작업

- User Journey 문서의 후보 테이블을 바탕으로 v1.0 최소 데이터 모델을 좁힙니다.
- TMDB 연동 시 `contents`, `content_details`, `content_aliases`에 필요한 필드를 정리합니다.
- 저장하지 않을 데이터와 익명 세션 보관 정책을 더 구체화합니다.

## 2026-07-01 - Task 4-1

### 변경 내용

- `docs/service-architecture.md` 문서를 새로 추가해 MyOTT의 기능 로드맵을 정리했습니다.
- 현재 기능, v1.0 출시 기능, v2.0 출시 후 기능, v3.0+ 장기 목표를 단계별로 나눴습니다.
- 각 기능에 필요한 DB 후보 이름을 간단히 기록했습니다.
- README의 Current Sprint를 Sprint 4 시작 상태로 업데이트했습니다.

### 이유

- TMDB, AI 추천, 로그인, 취향 저장처럼 외부 연결과 DB가 필요한 작업에 들어가기 전 기능 범위를 먼저 정리하기 위해서입니다.
- 댓글, 좋아요, 추천 피드백, Community Picks 같은 이후 확장 기능이 현재 MVP와 섞이지 않도록 단계 구분이 필요했습니다.
- 실제 DB 구현 전에 필요한 데이터 개념만 문서로 합의하기 위해서입니다.

### 다음 작업

- TMDB 연동에 필요한 데이터 필드와 API 응답 매핑을 정리합니다.
- v1.0에서 실제로 구현할 최소 DB 범위를 다시 좁힙니다.
- Supabase 연결 전 인증, 추천 기록, 취향 저장 정책을 문서로 확정합니다.

## 2026-07-01 - Task 3-5

### 변경 내용

- Quick Pick 선택값에 따라 더미 추천 결과가 다르게 표시되도록 개선했습니다.
- 로맨스, SF, 스릴러 장르 선택 시 각각 다른 추천 카드 묶음이 우선 표시되도록 더미 데이터를 확장했습니다.
- 작품 입력값이 있을 때 추천 이유가 입력한 작품명과 연결되어 보이도록 정리했습니다.
- 추천 카드와 상세 Layer에 포스터형 썸네일, 제목, 장르, 감독, 배우, 줄거리, 추천 이유가 이어지도록 유지했습니다.
- Quick Pick Layer와 상세 Layer가 동시에 열리지 않도록 추천 실행과 상세 열기 흐름을 정리했습니다.

### 이유

- Sprint 3 MVP UI의 추천 결과가 항상 같은 목록으로 보이면 실제 추천 경험처럼 느껴지기 어렵기 때문입니다.
- TMDb 연동 전에도 사용자가 선택한 옵션과 입력한 작품이 결과에 반영되는 흐름을 확인할 필요가 있었습니다.
- 이후 실제 추천 API나 검색 API를 붙일 때 사용할 카드 정보 구조를 더 명확히 만들기 위해서입니다.

### 다음 작업

- Quick Pick 필터와 콘텐츠 타입 선택이 실제 TMDb 검색 조건으로 이어질 수 있도록 데이터 계약을 정리합니다.
- 상세 Layer 포커스 관리와 접근성을 개선합니다.
- Sprint 3 MVP UI 완료 기준을 README에 반영할지 검토합니다.

## 2026-06-30 - Task 3-4b

### 변경 내용

- 추천 페이지의 `String.raw` HTML 주입과 외부 `public/app.js` DOM 조작 의존을 제거했습니다.
- 더 이상 로드하지 않는 이전 DOM 조작 스크립트 `public/app.js`를 삭제했습니다.
- 추천 입력, Quick Pick, 추천 결과, 상세 Layer 상태를 `app/page.jsx`의 React state 기반 렌더링으로 정리했습니다.
- 추천 카드 클릭 상세 Layer, X 버튼, 배경 클릭, ESC 닫기 동작을 React 이벤트로 복구했습니다.
- Quick Pick Layer와 상세 Layer가 동시에 열리지 않도록 상세 열기 시 Quick Pick을 닫도록 유지했습니다.
- CSS 단위 오류가 다시 생기지 않았는지 확인했습니다.

### 이유

- Task 3-4 이후 로컬 500 오류와 React hydration/runtime 오류가 발생해 Next 렌더링 구조를 안정화할 필요가 있었습니다.
- React가 렌더링한 화면을 외부 스크립트가 직접 수정하면 hydration과 클라이언트 상태가 충돌할 수 있기 때문입니다.
- 상세 Layer 기능을 유지하면서 이후 확장 가능한 Next.js 구조로 되돌리기 위해서입니다.

### 다음 작업

- 더미 추천 데이터와 실제 API 데이터가 같은 카드 구조를 사용할 수 있도록 데이터 필드를 정리합니다.
- 상세 Layer 포커스 관리와 접근성을 별도 작업에서 보강합니다.
- Quick Pick 선택값을 추천 조건으로 연결할 범위를 정의합니다.

## 2026-06-30 - Task 3-4

### 변경 내용

- 더미 추천 결과 카드를 확장 가능한 형태로 복구했습니다.
- 카드에 썸네일 영역, 제목, 콘텐츠 타입, 장르, 감독, 주요 배우, 추천 이유를 표시했습니다.
- 추천 카드를 클릭하면 별도 상세 정보 Layer가 열리도록 추가했습니다.
- 상세 Layer에는 썸네일, 제목, 장르, 감독, 주요 배우, 줄거리, 추천 이유를 표시했습니다.
- 상세 Layer는 X 버튼, 배경 클릭, ESC 키로 닫히도록 구현하고 Quick Pick Layer와 충돌하지 않도록 분리했습니다.

### 이유

- 추천 결과가 단순 텍스트 카드에 머물면 이후 TMDb 데이터 확장과 상세 UX로 이어가기 어렵기 때문입니다.
- 사용자가 추천 결과를 훑고, 관심 있는 항목을 눌러 더 많은 정보를 확인하는 기본 흐름이 필요했습니다.
- Quick Pick Layer와 상세 Layer가 동시에 꼬이지 않도록 오버레이 상태를 분리할 필요가 있었습니다.

### 다음 작업

- 상세 Layer 접근성과 포커스 이동을 보강합니다.
- 더미 썸네일 영역을 실제 이미지 데이터와 연결할 준비를 합니다.
- Quick Pick 필터 선택값을 추천 결과에 반영하는 기준을 정의합니다.

## 2026-06-30 - Task 3-3c

### 변경 내용

- Quick Pick Layer가 첫 진입 시 보이는 문제를 수정했습니다.
- `.quick-pick-overlay.hidden` 규칙을 추가해 Overlay 전용 숨김 상태가 `.quick-pick-overlay` 표시 규칙에 덮이지 않도록 했습니다.
- 추천 옵션 버튼, X 버튼, 배경 오버레이, ESC 키 닫기 동작을 로컬 클릭 테스트로 확인했습니다.
- Quick Pick 필터 선택 후 Layer를 닫았다 다시 열어도 선택 상태와 추천 버튼 활성화 상태가 유지되는지 확인했습니다.

### 이유

- 기존 `.hidden` 규칙이 Quick Pick Overlay의 `display: grid` 규칙보다 먼저 선언되어 초기 닫힘 상태가 깨질 수 있었기 때문입니다.
- 사용자가 추천 옵션을 명시적으로 열고 닫는 흐름이 안정적으로 동작해야 합니다.
- Quick Pick 선택값은 추천 시작 조건에 영향을 주므로 Layer를 닫아도 상태가 유지되어야 합니다.

### 다음 작업

- Quick Pick 선택값을 실제 추천 결과 필터링에 반영할지 별도 태스크에서 결정합니다.
- 모바일 실기기에서 Layer 터치 영역과 스크롤 감각을 추가 확인합니다.
- Sprint 3 완료 시점에 README와 개발 기록을 다시 정리합니다.

## 2026-06-30 - Task 3-3b

### 변경 내용

- 프로젝트 소스 CSS 전체에서 숫자와 단위 사이 공백이 있는 표기를 점검했습니다.
- `10 px`, `760 px`, `82 vh`, `1 fr`, `180 deg` 형태의 CSS 단위 오류는 발견되지 않았습니다.
- `CHANGELOG.md`와 `docs/dev-log.md`에 Task 3-3b 작업 및 로컬 실행 확인 기록을 추가했습니다.

### 이유

- Quick Pick 작업 이후 CSS 단위 오류가 누적되었는지 확인하고, 로컬 실행 상태를 명확히 남기기 위해서입니다.
- UI 구조나 기능 동작을 바꾸지 않고 스타일 표기 안정성과 개발 기록만 정리할 필요가 있었습니다.
- 다음 작업 전에 현재 프로젝트가 로컬에서 정상 실행되는지 기준점을 만들기 위해서입니다.

### 다음 작업

- Quick Pick 선택값을 실제 추천 조건으로 연결할지 별도 태스크에서 결정합니다.
- Sprint 3 작업 기록을 필요 시 Sprint 단위로 다시 정리합니다.
- TMDb API 연동 전 현재 더미 추천 UX를 모바일에서 한 번 더 점검합니다.

## 2026-06-30

### 변경 내용

- `008d72e`: Task 3-2로 Quick Pick 필터 레이어 UI를 추가했습니다.
- 추천 옵션 버튼, Bottom Sheet 형태의 옵션 레이어, 장르/국가/분위기/러닝타임 체크 항목을 구현했습니다.
- 작품 입력창이 모두 비어 있어도 Quick Pick 옵션이 하나 이상 선택되면 추천받기 버튼이 활성화되도록 UI 상태를 보완했습니다.
- CSS 단위 표기 오류를 점검했으며, 현재 CSS 파일에는 `760 px`, `12 px`, `82 vh` 같은 잘못된 단위 표기가 남아 있지 않음을 확인했습니다.

### 이유

- 사용자가 작품명을 모르는 상태에서도 추천 흐름을 시작할 수 있어야 하기 때문입니다.
- 추천 페이지의 진입 장벽을 낮추기 위해 입력 기반 흐름에 빠른 옵션 선택 흐름을 추가했습니다.
- Task 3-2 작업 기록과 CSS 점검 결과가 문서에 누락되어 보완이 필요했습니다.

### 다음 작업

- Quick Pick 선택값이 실제 추천 로직에 어떻게 반영될지 별도 태스크에서 정의합니다.
- 모바일에서 Bottom Sheet의 사용감과 체크 옵션 간격을 실제 화면 기준으로 점검합니다.
- README의 Sprint 진행 상태도 다음 문서 정리 태스크에서 최신 상태로 맞춥니다.

## Sprint 2 - 2026-06-29

### 변경 내용

- `4d59d6c`: 프로젝트 초기 작업을 정리하고 추천 페이지를 한 페이지 흐름으로 다듬었습니다.
- `7324872`: Task 2-1로 영화, 드라마, 애니 체크박스와 작품 입력창 3개, 추천받기 버튼, 더미 결과 영역을 구현했습니다.
- `7491eeb`: Task 2-2로 README 상단을 프로젝트 대시보드 형태로 개선하고 Current Sprint 섹션을 추가했습니다.
- Task 2-3으로 Sprint 2의 작업 기록을 `CHANGELOG.md`와 `docs/dev-log.md`에 정리했습니다.

### 이유

- Sprint 2의 목표가 추천 페이지 UX를 먼저 완성하고 한 페이지 구조를 유지하는 것이기 때문입니다.
- 기능 구현, README 대시보드, 작업 기록을 분리해 프로젝트 진행 상황을 한눈에 확인할 필요가 있었습니다.
- TMDb API 연동 전에 더미 데이터 기반 추천 흐름과 문서화 체계를 안정화해야 했습니다.

### 다음 작업

- Task 2-3 완료 커밋까지 반영한 뒤 Sprint 2 체크리스트를 최신 상태로 유지합니다.
- 추천 페이지의 더미 결과 카드 UX를 검토하고 필요한 보완점을 정리합니다.
- 다음 단계에서 TMDb API 연동 준비 범위를 별도 태스크로 정의합니다.

## 2026-06-29

### 변경 내용

- Task 2-1 범위에 맞춰 추천 페이지를 기본 UI 중심으로 단순화했습니다.
- 영화, 드라마, 애니 체크박스와 작품 입력창 3개, 추천받기 버튼을 추가했습니다.
- 추천 결과는 외부 API 없이 더미 데이터로만 페이지 아래에 출력되도록 구현했습니다.
- 기존의 고급 추천 분석 UI와 클라이언트 TMDb 호출 흐름은 이번 UI 범위에서 제외했습니다.

### 이유

- 현재 목표가 추천 기능 완성이 아니라 기본 사용자 흐름과 화면 뼈대 구현이기 때문입니다.
- TMDb API와 Supabase 연결 전에 한 페이지 추천 UI가 먼저 안정적으로 보여야 합니다.
- 더미 결과만으로 입력, 추천 버튼, 결과 표시 흐름을 빠르게 확인할 수 있어야 합니다.

### 다음 작업

- 체크박스 선택 상태에 따라 더미 결과가 올바르게 필터링되는지 브라우저에서 확인합니다.
- 기본 UI가 안정화되면 추천 결과 카드의 정보 구조와 시각적 완성도를 개선합니다.
- 외부 데이터 연결은 별도 태스크에서 진행합니다.

## 2026-06-29 이전 스프린트

### 변경 내용

- 추천 페이지를 랜딩 화면과 결과 화면으로 나누지 않고 한 페이지에서 입력, 추천, 결과 확인이 가능하도록 정리했습니다.
- 샘플 입력 버튼과 기본 더미 입력값을 유지해 실제 TMDb 키 없이도 추천 흐름을 바로 확인할 수 있게 했습니다.
- README에 Current Sprint 섹션을 추가하고 이번 스프린트 목표를 명시했습니다.

### 이유

- 이번 스프린트의 핵심 목표가 실제 데이터 연동보다 사용자 흐름 완성이기 때문입니다.
- 사용자가 앱에 들어오자마자 입력 패널과 결과 영역을 동시에 보고 추천 행동을 이해할 수 있어야 합니다.
- 이후 TMDb, Vercel, Supabase 연동 전에도 데모 가능한 화면이 필요했습니다.

### 다음 작업

- 브라우저에서 입력, 추천 버튼, 결과 카드, 필터 동작을 확인합니다.
- TMDb 키를 설정한 뒤 실제 검색 결과와 로컬 더미 추천이 함께 동작하는지 검증합니다.
- 현재 스프린트가 완료되면 다음 스프린트 목표를 README에 갱신합니다.

## 2026-06-26

### 변경 내용

- 단순 웹페이지 구조를 Next.js 앱 구조로 전환했습니다.
- 화면은 `app/page.jsx`, 전역 스타일은 `app/globals.css`, 클라이언트 추천 로직은 `public/app.js`로 정리했습니다.
- TMDb 검색과 상태 확인을 Next.js API Route인 `app/api/search/route.js`, `app/api/status/route.js`로 분리했습니다.

### 이유

- TMDb API 키를 브라우저에 노출하지 않고 서버 환경변수로만 관리하기 위해서입니다.
- Vercel 배포와 이후 Supabase 같은 외부 서비스 연동을 안정적으로 진행할 수 있는 구조가 필요했습니다.
- 단일 정적 페이지보다 화면, API, 환경변수 관리 책임을 분리하는 편이 유지보수에 유리했습니다.

### 다음 작업

- `.env.local` 또는 Vercel 환경변수에 TMDb 키를 설정합니다.
- 실제 TMDb 검색 결과가 앱 추천 흐름에 자연스럽게 반영되는지 확인합니다.
- Vercel 배포 후 production 환경에서 `/api/status`와 `/api/search`를 검증합니다.
