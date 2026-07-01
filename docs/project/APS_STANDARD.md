# APS Operating Standard v1.0

APS는 AI Project System의 약자이며, MyOTT에서 Sprint, Task, Codex Mode, Review, 기록 방식을 일관되게 운영하기 위한 표준 체계입니다.

이 문서는 Sprint 5.0 Standardization의 기준 문서입니다.

## 1. 목적

- 모든 Task가 고유 ID를 가지게 합니다.
- Codex Mode 기준을 명확히 합니다.
- Sprint, Task, Commit, Review, 문서 기록을 같은 방식으로 남깁니다.
- 새 PM이나 새 Codex 스레드가 프로젝트 상태를 빠르게 이어받게 합니다.
- MyOTT뿐 아니라 향후 프로젝트에도 재사용 가능한 운영 기준을 만듭니다.

## 2. Task ID 규칙

기본 형식:

```text
MYOTT-S{SPRINT}-T{TASK}
```

예:

- `MYOTT-S05-T01`
- `MYOTT-S05-T01B`
- `MYOTT-S50-T01`

## 3. Sprint Code 규칙

| Sprint 유형 | 표기 | 예시 |
| --- | --- | --- |
| 일반 Sprint | 두 자리 숫자 | Sprint 5 -> `S05` |
| 소수점/표준화 Sprint | 숫자를 이어 붙임 | Sprint 5.0 -> `S50` |
| Foundation Sprint | `FND` | Foundation Sprint -> `MYOTT-FND-T01` |
| Pre-Sprint | `PRE` | Pre-Sprint -> `MYOTT-PRE-T01` |

## 4. Task Code 규칙

| Task 유형 | 표기 | 예시 |
| --- | --- | --- |
| 기본 Task | `T01`, `T02` | Task 5-1 -> `MYOTT-S05-T01` |
| 보완 Task | 알파벳 suffix | Task 5-1b -> `MYOTT-S05-T01B` |
| Foundation Task | `T01`부터 증가 | F-05 -> `MYOTT-FND-T05` |
| Pre-Sprint Task | `T01`부터 증가 | Next.js 전환 -> `MYOTT-PRE-T03` |

규칙:

- Task ID는 문서, 커밋 기록, Review에서 가능한 한 함께 표시합니다.
- 과거 Task는 `TASK_HISTORY.md`에서 소급 적용합니다.
- 새 Task를 시작할 때는 사용자 요청의 Task ID를 우선합니다.
- 사용자가 Task ID를 주지 않으면 APS 규칙에 따라 제안합니다.

## 5. Codex Mode 기준

Codex Mode는 작업의 위험도, 범위, 검증 수준을 나타냅니다.

| Mode | 기준 | 예시 | 기대 행동 |
| --- | --- | --- | --- |
| LOW | 단순 문서 수정, 작은 UI 조정, 위험 낮음 | README 체크 상태 수정 | 빠르게 확인하고 최소 변경 |
| MEDIUM | UI/UX 일부 변경, 상태 로직 조정, 제한적 테스트 필요 | Layer UX 개선 | 관련 파일 확인, 로컬 테스트 권장 |
| HIGH | 구조 변경 준비, API route 영향 가능성, 문서/코드 정합성 중요 | Provider 전환 설계, PMS 동기화 | 현재 구조 확인, diff 검토, 기록 업데이트 |
| VERY HIGH | 아키텍처, 개인정보, DB, 운영체계, 장기 정책 영향 | Data Policy, DB Domain, APS 표준 | Documentation First, 의사결정 기록, 광범위한 정합성 검토 |

## 6. Codex Mode 적용 규칙

- 사용자가 Mode를 지정하면 그 기준을 따른다.
- Mode가 없으면 변경 범위와 위험도를 보고 Codex가 보수적으로 판단한다.
- DB, 개인정보, Provider, 인증, AI 추천, 운영체계 작업은 기본적으로 HIGH 이상으로 본다.
- VERY HIGH 작업은 구현보다 설계와 기록을 우선한다.
- 문서만 수정하는 HIGH/VERY HIGH 작업도 Git Review와 문서 정합성 검토를 수행한다.

## 7. Task 기록 필드

`TASK_HISTORY.md`의 기본 필드:

- Task ID
- Task
- Commit
- Review
- 상태

상태 값:

- `예정`
- `진행 중`
- `완료`
- `보류`
- `Parking Lot`

## 8. Commit and Review 규칙

- 커밋 메시지는 기존 Conventional Commit 스타일을 유지합니다.
- Task 완료 후 가능하면 Commit Hash를 `TASK_HISTORY.md`에 반영합니다.
- 자기 자신을 커밋하기 전에는 `This sync commit` 또는 `Current task`로 임시 표시할 수 있습니다.
- 완료 보고에는 Commit Hash, Push 여부, Review를 포함합니다.

## 9. APS와 PMS 관계

APS는 운영 규칙이고, PMS는 프로젝트 기억 시스템입니다.

- APS: Task ID, Codex Mode, Review, 기록 방식의 표준
- PMS: 현재 상태, 결정, 이력, Founder Note, 협업 문서의 저장소

따라서 APS 변경은 다음 문서와 함께 동기화합니다.

- `README.md`
- `docs/project/PROJECT_STATUS.md`
- `docs/project/TASK_HISTORY.md`
- `docs/project/DEVELOPMENT_RULES.md`
- `CHANGELOG.md`
- `docs/dev-log.md`

## 10. 다음 개선

- Task Template 문서를 별도로 만들지 검토합니다.
- Review Template 문서를 별도로 만들지 검토합니다.
- ADR 체계를 도입할 경우 Task ID와 연결합니다.
- Sprint 5 이후 새 Task부터 Task ID를 기본 표기로 사용합니다.
