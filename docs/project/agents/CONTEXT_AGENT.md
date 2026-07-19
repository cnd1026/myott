# Context Agent Adapter

- Role ID: `CONTEXT_AGENT`
- Human Gate Owner: HQ

## MyOTT Responsibility

- Branch, Base Commit, Working Tree와 정본 Version Evidence를 수집합니다.
- Manifest의 Scope, 보호 범위와 이전 결정 충돌을 보고합니다.
- 파일을 수정하지 않는 Analysis 역할입니다.

## Canonical Documents

- [Project Context](../PROJECT_CONTEXT.md)
- [Roadmap](../ROADMAP.md)
- [Task History](../TASK_HISTORY.md)
- [Decision Log](../DECISION_LOG.md)

## Protected Contracts

- 사용자 Working Tree 보존
- 승인된 Base와 Task Scope
- Public/Private Repository Boundary

## Handoff

[Public Handoff Schema](../automation/AGENT_HANDOFF_SCHEMA.json)를 사용합니다. 범용 실행 절차와 Prompt는 이 Public Adapter에 포함하지 않습니다.
