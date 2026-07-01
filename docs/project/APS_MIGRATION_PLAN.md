# APS Migration Plan

이 문서는 공개 저장소 `cnd1026/myott`에 있던 APS 핵심 문서를 private Platform repository로 분리한 migration 기록입니다.

APS-003 기준으로 MyOTT public repository에서는 APS 핵심 운영 문서를 제거했고, Source of Truth는 `cnd1026/Nd_core`입니다. Git history rewrite, force push, filter-repo는 사용하지 않았습니다.

## 1. Nd_core로 이전된 문서

아래 문서는 APS 핵심 운영체계 문서로 분류되며, 현재 private Platform repository `cnd1026/Nd_core`의 `aps/` 폴더에서 관리합니다.

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

README는 APS 핵심 문서 링크를 직접 나열하지 않습니다.

README에서는 다음 문서를 중심으로 안내합니다.

- `docs/project/APS_PUBLIC_NOTICE.md`

README 안내 원칙:

- MyOTT가 내부 APS 기반으로 개발된다는 점은 설명합니다.
- APS 상세 문서는 private Platform repository에서 관리한다고 명시합니다.
- 공개 저장소에는 MyOTT 개발에 필요한 PMS 문서만 남긴다고 설명합니다.

## 4. 백업 및 Remove 상태

APS 핵심 문서는 Nd_core에 복사 및 검증된 뒤 MyOTT public repository에서 제거되었습니다.

완료된 절차:

1. Nd_core private Platform repository를 생성했습니다.
2. APS 핵심 문서를 Nd_core에 복사했습니다.
3. Source/Target 해시 비교로 내용을 검증했습니다.
4. Public MyOTT README와 PMS를 reference-only 상태로 정리했습니다.
5. MyOTT에서 APS 핵심 운영 문서 5개를 제거했습니다.

주의:

- Git history rewrite는 하지 않았습니다.
- force push는 하지 않았습니다.
- filter-repo는 사용하지 않았습니다.

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

## 6. 다음 상태

Stable / Product Development Return
