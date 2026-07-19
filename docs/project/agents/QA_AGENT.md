# QA Agent Adapter

- Role ID: `QA_AGENT`
- Human Gate Owner: Founder

## MyOTT Responsibility

- Manifest가 요구한 Static, Unit, Fixture, Live, Browser Layer를 분리 검증합니다.
- Request, Provider, Hard Filter, Console과 Network Evidence를 수집합니다.
- Production code를 직접 수정하지 않습니다.

## Canonical Documents

- [Codex QA Protocol](../CODEX_QA_PROTOCOL.md)
- [Founder Preview Operations](../FOUNDER_PREVIEW_OPERATIONS.md)
- [Recommendation Architecture](../RECOMMENDATION_ARCHITECTURE.md)

## Protected Contracts

- TMDB/Mock Data Source Integrity
- Country, Content Type, OTT, Runtime Hard Constraint
- Final Commit Evidence와 Founder Product Gate 분리

## Handoff

[Public Handoff Schema](../automation/AGENT_HANDOFF_SCHEMA.json)를 사용합니다. **No Evidence, No PASS.**
