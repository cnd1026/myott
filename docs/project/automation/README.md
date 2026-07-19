# MyOTT APS Public Interface

Version: 1.0

Status: PUBLIC

MyOTT는 Task Manifest, 공개 Schema, Product Adapter와 사람 Gate만 관리합니다. 범용 Validator, Git Preflight, Run Planner, Prompt와 Agent 실행 구현은 이 Repository에 포함되지 않습니다.

## 1. Manifest 작성

[Task Manifest Template](TASK_MANIFEST_TEMPLATE.yaml)을 복사해 Task별 YAML을 작성하고 [Task Manifest Schema](TASK_MANIFEST_SCHEMA.json)를 따릅니다.

필수 정보:

- Task ID, Sprint, owner
- Base branch와 40자 Base commit
- Architecture/QA Protocol version
- 목표, 역할과 Wave, Acceptance Criteria
- Do Not Change와 Out Of Scope
- HQ, PM Lab, Founder Gate
- Git 제외 파일

## 2. APS 호출

승인된 APS CLI 실행 환경에서 Product Root와 Manifest를 명시합니다.

APS는 Product Root의 `docs/project/automation/`에서 정확히 하나의 `*_APS_ADAPTER.json`을 발견해야 합니다. Adapter가 없거나 둘 이상이면 실패하며 임의의 Product 경로나 정본 문서를 추측하지 않습니다.

```text
aps validate-task --project-root <myott-root> --manifest <manifest>
aps prepare-run --project-root <myott-root> --manifest <manifest>
aps validate-handoff --project-root <myott-root> --manifest <manifest> --handoff <handoff>
```

이 문서는 특정 private package URL, local path, repository 구조 또는 내부 module 이름을 지정하지 않습니다. CLI 설치와 배포는 Platform Gate 이후 별도 계약으로 관리합니다.

## 3. 결과 해석

- `PASS` 또는 `READY`: 현재 검증 범위 통과
- `CONCERNS`: 사람 결정 또는 명시적 위험 검토 필요
- `FAIL`: Schema 또는 Semantic Contract 실패
- `BLOCKED`: Repository, Gate, 권한 또는 환경 문제로 진행 불가

Run artifact는 `.agent-runs/<task-id>/` 아래에만 생성하며 Git에 포함하지 않습니다.

## Exported Contract Ownership

공개 Shared Contract는 APS Master에서 승인된 Export 절차로 생성한 Product Snapshot입니다. MyOTT에서는 Snapshot을 직접 수정하지 않으며, 변경은 Master 승인, Product overlay 적용, Schema/YAML 검증, checksum 갱신 순서로 진행합니다.

[Public Contract Export Registry](PUBLIC_CONTRACT_EXPORTS.json)는 각 Snapshot의 공개 Contract version, Export APS version, Export date와 exact-byte SHA-256을 기록합니다. Registry 자체는 checksum 대상에서 제외해 순환 참조를 방지합니다. Private 구현, Repository 식별자, 내부 module 구조는 Snapshot에 포함하지 않습니다.

## 4. 사람 Gate

- HQ: Task intake, Manifest 완성도, 역할/Wave
- PM Lab: Architecture와 Platform 경계
- Founder: 제품 방향과 최종 제품 승인

사람 Gate는 자동 승인되지 않습니다. 자세한 공개 정책은 [MyOTT APS Governance](MYOTT_APS_GOVERNANCE.md)를 따릅니다.

## 5. Handoff

Agent 결과는 [Agent Handoff Schema](AGENT_HANDOFF_SCHEMA.json)를 따릅니다. Evidence 없는 PASS, 열린 CRITICAL/MAJOR, 해결되지 않은 Conflict, 필수 Decision이 있는 PASS는 허용하지 않습니다.

## Related

- [MyOTT Agent Agreement](../../../AGENTS.md)
- [MyOTT APS Product Adapter](MYOTT_APS_ADAPTER.json)
- [Public Contract Export Registry](PUBLIC_CONTRACT_EXPORTS.json)
- [Final Report Template](FINAL_REPORT_TEMPLATE.md)
- [Codex QA Protocol](../CODEX_QA_PROTOCOL.md)
