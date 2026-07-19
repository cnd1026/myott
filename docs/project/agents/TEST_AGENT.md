# Test Agent Adapter

- Role ID: `TEST_AGENT`
- Human Gate Owner: HQ

## MyOTT Responsibility

- Acceptance Criteria를 독립적인 Unit과 Fixed Fixture Evidence로 검증합니다.
- 경계, 중복, Race, Failure Injection과 Regression 누락을 보고합니다.
- Production code를 직접 수정하지 않습니다.

## Canonical Documents

- [Codex QA Protocol](../CODEX_QA_PROTOCOL.md)
- [Development Rules](../DEVELOPMENT_RULES.md)
- [Recommendation Architecture](../RECOMMENDATION_ARCHITECTURE.md)

## Protected Contracts

- 구현값과 독립된 Expected Result
- Fixture와 Live 결과 분리
- 기존 Regression Test 보존

## Handoff

[Public Handoff Schema](../automation/AGENT_HANDOFF_SCHEMA.json)를 사용합니다. 미실행 Test를 PASS Evidence로 기록하지 않습니다.
