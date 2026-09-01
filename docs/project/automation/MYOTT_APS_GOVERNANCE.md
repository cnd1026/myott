# MyOTT APS Governance

Version: 1.0

Status: PUBLIC PRODUCT GOVERNANCE

## Purpose

이 문서는 MyOTT가 APS Multi-Agent Delivery Pipeline을 사용할 때 적용하는 공개 Governance와 사람 Gate를 정의합니다. 범용 Validator, Prompt, Orchestrator, Retry, Recovery, Fan-out/Fan-in 구현은 이 Repository에 포함하지 않습니다.

## Ownership

- Founder: 제품 방향, 사용자 경험, 추천 품질, 최종 제품 승인
- HQ: CPM, Task intake, Sprint/Task 순서, Manifest 완성도, 역할과 Wave 배치
- PM Lab: CTO, Architecture/API/Data Contract, Dependency, Security, Provider, DB, Auth, Migration 및 Platform Gate
- Codex: 승인 범위의 구현, 기술 검증, Evidence 생성

어느 역할도 다른 사람 Gate를 대신 승인하지 않습니다. 자동 Test나 Browser PASS도 사람 승인을 생성하지 않습니다.

## Public Contracts

- [Task Manifest Schema](TASK_MANIFEST_SCHEMA.json)
- [Task Manifest Template](TASK_MANIFEST_TEMPLATE.yaml)
- [Agent Handoff Schema](AGENT_HANDOFF_SCHEMA.json)
- [Final Report Template](FINAL_REPORT_TEMPLATE.md)
- [Public Contract Export Registry](PUBLIC_CONTRACT_EXPORTS.json)
- [MyOTT APS Product Adapter](MYOTT_APS_ADAPTER.json)

## Waves

- Analysis: 승인된 Manifest를 기준으로 읽기 중심 분석
- Implementation: 승인된 단일 Production Writer
- Validation: 구현과 독립된 기술 검증
- Integration: Evidence, Gate, Candidate Diff 통합

## Gates

- HQ Gate: Analysis 시작 전 Task/Manifest/Wave 승인
- PM Lab Gate: 보호된 Architecture 또는 Platform 경계 변경 전 승인
- Founder Gate: 최종 제품 승인
- Commit Gate: Independent Validation, Final Integration, PM Lab Platform Gate, Founder Platform Gate, CRITICAL/MAJOR 0
- Push Gate: Final Commit Smoke, 필요한 Full CDP, Candidate Diff/Commit Tree 일치, Working Tree/Remote 확인

### Gate Semantics

- **Authority Gate**는 제품 목적/범위, 위험 경계, 보호된 외부 권한 또는 새로운 사람 결정이 필요한 경계입니다.
- **Evidence Gate**는 실행 의도와 범위가 이미 승인되었고 요구된 증거가 통과하면 진행하는 경계입니다. 따라서 승인된 exact scope의 Commit Gate와 Push Gate는 Evidence Gate로 운영할 수 있습니다.
- **Execution Security Gate**는 의도는 승인되었지만 현재 플랫폼, 도구, 권한 또는 실행 환경이 승인된 계약을 안전하게 수행하지 못하는 경계입니다.

Evidence Gate 또는 Execution Security Gate를 Authority Gate로 자동 변환하지 않습니다. 새로운 경계가 필요할 때만 그 새로운 범위가 Authority Gate가 됩니다. 현재 Task가 별도로 더 좁은 실행 방화벽을 선언하면 그 방화벽이 우선합니다.

`FAIL`, `BLOCKED`, 미승인 Gate, Evidence 없는 상태는 다음 Wave 또는 Git 진행 권한이 아닙니다.

## Standing Bounded Execution

이미 승인된 Product purpose/scope 안에서 다음 조건을 모두 만족하는 local, reversible, exact-allowlist 작업은 새 사람 결정을 만들지 않고 기존 결정과 Evidence Gate에 따라 진행할 수 있습니다.

- 새로운 Product purpose 또는 material user-visible semantic contract가 없음
- Public API/schema, Provider, dependency, credential, material cost의 추가가 없음
- Security Boundary, Main, Production 또는 Release의 확장이 없음

이 원칙은 새로운 권한을 부여하지 않으며, 각 Task의 scope와 prohibited operation을 대체하지 않습니다.

## Repository Boundary

MyOTT에는 다음만 둡니다.

- MyOTT Task Manifest와 공개 Schema
- MyOTT Canonical Document 연결
- 공개 역할 Adapter와 사람 Gate
- 선언형 Product Adapter
- 공개 CLI Interface 문서

MyOTT에는 범용 Prompt Master, Git Preflight Engine, Gate Engine, Secret Redaction, Run Planner, SDK, Conflict Resolver, Retry/Recovery, Model/Cost Policy, Worktree Manager를 두지 않습니다.

## Git Safety

- `reset`, `clean`, `stash`, `rebase`, force push, history rewrite 금지
- QA Checklist와 환경 파일은 명시적 승인 없이 Stage 금지
- Commit과 Push는 각각의 Gate를 별도로 충족해야 함
- **No Evidence, No PASS**

## Canonical Persistence

Founder decisions, governance rules, authority changes, Product/semantic contracts와 recovery-critical current state는 정확한 lifecycle boundary에서 `PLAN / READ -> PRE-HASH -> WRITE -> RE-READ -> POST-HASH -> RESULT` 순서로 보존합니다. 정본은 transient execution log archive가 아니며 private Continuity 내용을 public Repository에 복사하지 않습니다.
