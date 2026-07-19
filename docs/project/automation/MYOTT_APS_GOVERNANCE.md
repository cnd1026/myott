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

`FAIL`, `BLOCKED`, 미승인 Gate, Evidence 없는 상태는 다음 Wave 또는 Git 진행 권한이 아닙니다.

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
