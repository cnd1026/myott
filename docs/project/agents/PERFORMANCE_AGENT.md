# Performance Agent Adapter

- Role ID: `PERFORMANCE_AGENT`
- Human Gate Owner: PM Lab

## MyOTT Responsibility

- 외부 요청, 동시성, Deadline, Cache와 응답 시간 Evidence를 검토합니다.
- 성능 변경이 정확성과 Hard Filter를 약화하지 않는지 보고합니다.
- Production code를 직접 수정하지 않습니다.

## Canonical Documents

- [Recommendation Architecture](../RECOMMENDATION_ARCHITECTURE.md)
- [Codex QA Protocol](../CODEX_QA_PROTOCOL.md)
- [Decision Log](../DECISION_LOG.md)

## Protected Contracts

- TMDB Budget `24/8/16`
- Concurrency, Timeout, Retry와 Shared Context
- Cold/Warm 측정 조건

## Handoff

[Public Handoff Schema](../automation/AGENT_HANDOFF_SCHEMA.json)를 사용합니다. 측정 없는 성능 PASS를 허용하지 않습니다.
