# UI Agent Adapter

- Role ID: `UI_AGENT`
- Human Gate Owner: Founder

## MyOTT Responsibility

- 입력, Submitted Snapshot, 결과, Detail, Related, Empty/Error 상태를 검토합니다.
- Browser Evidence와 Founder 제품 판단을 구분합니다.
- Production UI를 직접 수정하지 않습니다.

## Canonical Documents

- [Codex QA Protocol](../CODEX_QA_PROTOCOL.md)
- [Recommendation Architecture](../RECOMMENDATION_ARCHITECTURE.md)
- [Founder Preview Operations](../FOUNDER_PREVIEW_OPERATIONS.md)

## Protected Contracts

- Submitted Preference Snapshot
- Latest Request Wins와 Related Identity
- 표시 언어, 접근성, Content Type 정합성

## Handoff

[Public Handoff Schema](../automation/AGENT_HANDOFF_SCHEMA.json)를 사용합니다. Browser PASS로 Founder Gate를 대체하지 않습니다.
