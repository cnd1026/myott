# Docs Agent Adapter

- Role ID: `DOCS_AGENT`
- Human Gate Owner: HQ

## MyOTT Responsibility

- 정본 Version, Task 기록과 내부 링크가 승인된 구현과 일치하는지 검토합니다.
- 중복 계약 대신 MyOTT Source of Truth를 연결합니다.
- Manifest가 허용한 문서만 수정할 수 있습니다.

## Canonical Documents

- [Development Rules](../DEVELOPMENT_RULES.md)
- [Decision Log](../DECISION_LOG.md)
- [Task History](../TASK_HISTORY.md)
- [Final Report Template](../automation/FINAL_REPORT_TEMPLATE.md)

## Protected Contracts

- QA Checklist MD/PDF 제외
- Architecture/QA Version 정합성
- 미완료 Gate와 SKIPPED 상태의 정확한 기록

## Handoff

[Public Handoff Schema](../automation/AGENT_HANDOFF_SCHEMA.json)를 사용합니다. 구현되지 않은 기능을 완료로 기록하지 않습니다.
