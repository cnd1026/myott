# APS Migration Plan

이 문서는 공개 저장소 `cnd1026/myott`에 있는 APS 핵심 문서를 private repository로 분리하기 위한 준비 계획입니다.

이번 단계에서는 문서를 삭제하거나 Git history를 수정하지 않습니다. 공개 저장소의 README와 Project Memory System에서 APS 핵심 문서의 직접 노출을 줄이고, 다음 Task에서 private repository 이전을 진행할 수 있도록 범위를 정리합니다.

## 1. Private Repository로 이전할 문서

아래 문서는 APS 핵심 운영체계 문서로 분류합니다.

- `docs/project/AI_PM_BOOTSTRAP.md`
- `docs/project/AI_PM_CONSTITUTION.md`
- `docs/project/AI_PM_BEHAVIOR.md`
- `docs/project/AI_PM_VALIDATION.md`
- `docs/project/APS_STANDARD.md`

이전 이유:

- MyOTT에만 종속된 문서가 아니라 향후 여러 프로젝트에서 재사용할 수 있는 운영체계 자산입니다.
- 『AI와 함께 서비스를 만드는 방법』의 기반 자료로 확장될 수 있습니다.
- 공개 저장소에는 제품 개발에 필요한 최소 참조만 남기는 것이 관리와 보안 측면에서 더 적절합니다.

## 2. Public Repository에 남길 문서

아래 문서는 MyOTT 프로젝트 진행에 필요한 공개 Project Memory System 문서로 유지합니다.

- `docs/project/PROJECT_CONTEXT.md`
- `docs/project/PROJECT_STATUS.md`
- `docs/project/TASK_HISTORY.md`
- `docs/project/DEVELOPMENT_RULES.md`
- `docs/project/DECISION_LOG.md`
- `docs/project/FOUNDER_NOTES.md`
- `docs/project/AI_COLLABORATION.md`
- `docs/project/BOOK_STATUS.md`
- `docs/project/APS_PUBLIC_NOTICE.md`
- `docs/project/APS_MIGRATION_PLAN.md`

유지 이유:

- 공개 저장소의 현재 작업 상태를 이해하는 데 필요합니다.
- Sprint, Task, 결정, Founder Note, 협업 방식은 MyOTT의 개발 맥락입니다.
- APS 상세 문서 없이도 MyOTT 개발 흐름을 이어갈 수 있어야 합니다.

## 3. README 참조 방식

이전 준비 후 README는 APS 핵심 문서 링크를 직접 나열하지 않습니다.

README에서는 다음 두 문서를 중심으로 안내합니다.

- `docs/project/APS_PUBLIC_NOTICE.md`
- `docs/project/APS_MIGRATION_PLAN.md`

README 안내 원칙:

- MyOTT가 내부 APS 기반으로 개발된다는 점은 설명합니다.
- APS 상세 문서는 private repository로 이전 예정이라고 명시합니다.
- 공개 저장소에는 MyOTT 개발에 필요한 PMS 문서만 남긴다고 설명합니다.

## 4. 삭제 전 백업 필요 여부

삭제 전 백업은 필요합니다.

권장 절차:

1. Private repository를 생성합니다.
2. 이전 대상 APS 핵심 문서를 private repository에 복사합니다.
3. Private repository에서 문서가 정상적으로 열리는지 확인합니다.
4. 공개 저장소 README와 PMS가 private repository 이전 상태를 가리키는지 확인합니다.
5. 별도 Task에서 공개 저장소의 핵심 APS 문서 삭제 여부를 결정합니다.

주의:

- 이번 Task에서는 삭제하지 않습니다.
- 이번 Task에서는 Git history rewrite를 하지 않습니다.
- 공개 저장소에서 제거가 필요하더라도 별도 보안 Task로 분리합니다.

## 5. Private Repository 이름 후보

후보:

- `cnd1026/aps`
- `cnd1026/ai-project-system`

추천:

- 짧고 재사용 범위가 넓은 이름은 `cnd1026/aps`입니다.
- 외부에서 의미가 더 명확한 이름은 `cnd1026/ai-project-system`입니다.

결정 기준:

- APS를 브랜드처럼 운영할 경우 `cnd1026/aps`
- 책, 문서, 템플릿 저장소로 설명력을 우선할 경우 `cnd1026/ai-project-system`

## 6. 다음 Task

다음 Task 후보:

```text
MYOTT-SEC-02

목표
APS private repository를 생성하고 핵심 문서를 이전한다.

수정 범위
- private repository 문서 복사
- 공개 저장소 README/PMS 참조 업데이트

금지
- Git history rewrite
- force push
- filter-repo
- 공개 저장소 핵심 문서 즉시 삭제
```
