# Development Rules

이 문서는 MyOTT 프로젝트 운영 규칙을 정리합니다.

## 1. Sprint 기반

- 큰 작업은 Sprint 단위로 묶습니다.
- Sprint는 현재 목표와 다음 마일스톤을 README와 PMS에 반영합니다.
- Sprint가 바뀌면 README의 Current Sprint와 Current Goal을 업데이트합니다.

## 2. Task 기반

- 모든 작업은 Task 단위로 진행합니다.
- Task에는 목표, 요구사항, 수정 범위, 금지사항, 완료 조건을 둡니다.
- Task 완료 후 커밋과 푸시를 기본으로 합니다.

## 3. Git Review

- 커밋 전 `git status`로 변경 범위를 확인합니다.
- 가능한 경우 `git diff --check`로 문서/코드 whitespace 문제를 확인합니다.
- 기능 작업은 로컬 테스트 결과를 함께 기록합니다.
- 문서 작업은 금지된 구현 변경이 섞이지 않았는지 확인합니다.

## 4. Local Test

- UI, 동작, API route를 수정한 작업은 로컬 실행과 클릭 테스트를 수행합니다.
- 문서만 수정한 작업은 로컬 앱 실행을 필수로 하지 않습니다.
- 테스트 명령과 결과는 요청이 있을 경우 완료 보고에 포함합니다.

## 5. Parking Lot

- 지금 당장 구현하지 않을 아이디어는 Parking Lot에 둡니다.
- Parking Lot은 버리는 목록이 아니라, 아직 정책과 우선순위가 정해지지 않은 목록입니다.
- v1 범위를 보호하기 위해 v2/v3/Parking Lot을 명확히 나눕니다.

## 6. Documentation First

- DB, 개인정보, Provider, AI 추천처럼 제품 구조에 큰 영향을 주는 작업은 문서로 먼저 설계합니다.
- 문서 설계 전에는 SQL, Supabase 연결, 새 외부 API 연결을 시작하지 않습니다.
- 결정이 바뀌면 DECISION_LOG와 관련 설계 문서를 함께 업데이트합니다.

## 7. Changelog and Dev Log

- 의미 있는 기능, 구조, 정책, 문서 변경은 `CHANGELOG.md`와 `docs/dev-log.md`에 기록합니다.
- `CHANGELOG.md`에는 변경 내용, 이유, 다음 작업을 기록합니다.
- `docs/dev-log.md`에는 오늘 작업, 결정한 것, 아쉬운 점, 다음 개선을 기록합니다.

## 8. Commit Message

현재 사용 중인 커밋 메시지 스타일:

- `feat(ui): ...`
- `fix(ui): ...`
- `docs: ...`
- `docs(db): ...`
- `docs(architecture): ...`
- `docs(project): ...`

Foundation Sprint F-01 추천 커밋:

- `docs(project): create Project Memory System`

## 9. 금지사항 기본값

Task에서 금지한 범위는 반드시 지킵니다.

자주 등장하는 금지사항:

- TMDB 연결 추가 금지
- Supabase 연결 금지
- DB 생성 금지
- SQL 작성 금지
- 추천 알고리즘 변경 금지
- UI 구조 변경 금지
- 로그인 기능 추가 금지

## 10. PMS 업데이트 규칙

- Sprint가 바뀌면 `PROJECT_CONTEXT.md`와 `PROJECT_STATUS.md`를 업데이트합니다.
- Task가 끝나면 `TASK_HISTORY.md`에 커밋 해시와 상태를 반영합니다.
- 중요한 제품/기술 결정은 `DECISION_LOG.md`에 추가합니다.
- 창업자 관점의 원칙이나 제품 철학은 `FOUNDER_NOTES.md`에 추가합니다.
