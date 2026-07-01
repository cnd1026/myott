# AI Collaboration

이 문서는 MyOTT에서 Product Owner, GPT, Codex가 어떻게 협업하는지 정의합니다.

## 1. Product Owner

역할:

- 제품 방향을 결정합니다.
- Sprint와 Task 목표를 제시합니다.
- 우선순위와 금지사항을 정합니다.
- 최종 제품 감각과 철학을 유지합니다.

책임:

- "무엇을 만들 것인가"를 정합니다.
- MVP와 Parking Lot의 경계를 결정합니다.
- Founder Note와 제품 철학의 최종 기준을 잡습니다.

## 2. GPT

역할:

- 제품 기획, 문서 초안, 사고 정리를 돕습니다.
- 사용자 여정, 기능 범위, 정책, 운영 규칙을 구조화합니다.
- 창업자의 생각을 명확한 문서와 Task로 바꾸는 파트너 역할을 합니다.

책임:

- 아이디어를 Sprint/Task 단위로 정리합니다.
- 제품 철학과 사용자 경험을 언어로 다듬습니다.
- Codex가 실행할 수 있는 요구사항을 선명하게 만듭니다.

## 3. Codex

역할:

- 코드와 문서를 실제 파일로 반영합니다.
- 로컬 프로젝트 상태를 확인합니다.
- 구현, 테스트, 커밋, 푸시를 수행합니다.
- 기존 변경사항을 되돌리지 않고 현재 작업과 조심스럽게 합칩니다.

책임:

- 작업 전 현재 파일과 Git 상태를 확인합니다.
- 수정 범위를 지킵니다.
- 금지된 작업을 하지 않습니다.
- 완료 후 커밋 해시, 테스트 결과, 남은 리스크를 보고합니다.

## 4. 협업 방식

기본 흐름:

1. Product Owner가 Sprint/Task를 정의합니다.
2. GPT 또는 Codex가 요구사항을 구조화합니다.
3. Codex가 로컬 상태를 확인합니다.
4. Codex가 필요한 파일을 수정합니다.
5. Codex가 검토와 테스트를 수행합니다.
6. Codex가 커밋하고 푸시합니다.
7. PMS와 기록 문서를 업데이트합니다.

## 5. 역할 분리 원칙

- Product Owner는 방향을 정합니다.
- GPT는 생각을 정리합니다.
- Codex는 저장소에 반영합니다.

다만 실제 작업에서는 세 역할이 자연스럽게 겹칠 수 있습니다. 중요한 것은 결정의 근거와 결과를 문서에 남기는 것입니다.

## 6. 좋은 Task의 조건

좋은 Task는 다음을 포함합니다.

- 목표
- 요구사항
- 수정 범위
- 금지사항
- 완료 조건
- 추천 커밋 메시지
- 필요한 경우 Local Test 조건

## 7. Codex 작업 원칙

- 기존 기능을 불필요하게 수정하지 않습니다.
- 문서 작업과 기능 작업을 가능한 한 분리합니다.
- 큰 구조 변경 전에는 먼저 설계 문서를 만듭니다.
- 테스트가 필요한 작업은 로컬에서 확인합니다.
- 커밋 전 변경 범위를 확인합니다.

## 8. PMS와 AI 협업

PMS는 AI가 프로젝트를 이어받기 위한 기억 장치입니다.

새 스레드나 새 작업자는 먼저 다음 문서를 읽습니다.

- `docs/project/APS_PUBLIC_NOTICE.md`
- `docs/project/PROJECT_CONTEXT.md`
- `docs/project/PROJECT_STATUS.md`
- `docs/project/TASK_HISTORY.md`
- `docs/project/DECISION_LOG.md`
- `README.md`

APS 핵심 운영 문서는 private Platform repository `cnd1026/Nd_core`를 Source of Truth로 둡니다.

그 다음 현재 Task 요구사항을 확인하고 작업합니다.
