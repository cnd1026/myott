# MyOTT Agent Working Agreement

이 문서는 MyOTT Repository에서 사람과 Codex Agent가 공통으로 따라야 하는 최상위 작업 계약입니다.
상세 제품 설계나 QA 절차를 복사하지 않고 정본 문서와 자동화 계약의 위치를 안내합니다.

## 1. Scope

- 적용 범위는 이 Repository 전체입니다.
- 모든 작업은 승인된 Task Manifest를 기준으로 시작합니다.
- Agent는 자신의 공개 역할 Adapter와 MyOTT APS Governance를 함께 따릅니다.
- 명시적인 현재 Task와 이 문서가 충돌하면 작업을 중단하고 결정권자에게 보고합니다.

## 2. Source Of Truth Priority

충돌 시 다음 순서로 판단합니다.

1. 현재 승인된 Task Manifest와 HQ의 Task/Wave 결정
2. PM Lab의 Architecture Gate와 도메인 정본 문서
3. 기록된 Architecture Decision과 Development Rules
4. Sprint Context, Roadmap, Task History
5. Template, Prompt Guide, 보조 체크리스트

역할 경계:

- Founder는 제품 방향, 사용자 경험, 추천 품질, 최종 제품 승인을 소유합니다.
- HQ는 CPM, Task intake, Sprint 순서, Manifest 완성도, Agent/Wave 배치를 소유합니다.
- PM Lab은 CTO 역할로 Architecture, API/Data Contract, Dependency, Security, Provider, DB, Auth, Migration Gate를 소유합니다.
- Codex는 승인 범위의 구현, 기술 검증, Evidence 생성을 소유합니다.

도메인 정본:

- Recommendation: [Recommendation Architecture](docs/project/RECOMMENDATION_ARCHITECTURE.md)
- QA: [Codex QA Protocol](docs/project/CODEX_QA_PROTOCOL.md)
- Founder Preview: [Founder Preview Operations](docs/project/FOUNDER_PREVIEW_OPERATIONS.md)
- 개발 규칙: [Development Rules](docs/project/DEVELOPMENT_RULES.md)
- 협업 역할: [AI Collaboration](docs/project/AI_COLLABORATION.md)
- 중요 결정: [Decision Log](docs/project/DECISION_LOG.md)

보조 문서가 정본 문서와 다르면 정본을 따르고 Handoff의 `conflicts`에 기록합니다.

## 3. Required Automation Artifacts

- Task 시작 전에 [Task Manifest Template](docs/project/automation/TASK_MANIFEST_TEMPLATE.yaml)을 채웁니다.
- 역할별 Agent는 [Agent Handoff Schema](docs/project/automation/AGENT_HANDOFF_SCHEMA.json)에 맞는 결과를 냅니다.
- Wave와 Gate는 [MyOTT APS Governance](docs/project/automation/MYOTT_APS_GOVERNANCE.md)를 따릅니다.
- Product 연결 정보는 [MyOTT APS Adapter](docs/project/automation/MYOTT_APS_ADAPTER.json)를 사용합니다.
- 통합 결과는 [Final Report Template](docs/project/automation/FINAL_REPORT_TEMPLATE.md)으로 정리합니다.
- 임시 Agent 실행 산출물은 `.agent-runs/`에 두며 Git에 포함하지 않습니다.

Manifest가 없거나 Base Commit, 금지 범위, Gate가 불명확하면 구현을 시작하지 않습니다.

## 4. Repository Work Rules

- 작업 전 branch, HEAD, `origin/main`, working tree를 확인합니다.
- 기존 변경은 사용자 작업으로 간주하며 임의로 되돌리지 않습니다.
- Task의 In Scope만 수정하고 인접 리팩터링은 별도 제안으로 남깁니다.
- 정본 계약을 바꾸는 변경은 Architecture Agent 검토와 PM Lab Gate를 거칩니다.
- 새 Dependency, Provider, DB, 인증, 환경변수 변경은 명시적 승인 없이는 금지합니다.
- Secret, API Key, Bearer Token, 인증 Header를 문서나 Evidence에 기록하지 않습니다.
- Production 결과와 Fixture, Mock 결과를 혼합하지 않습니다.

## 5. Agent Waves

1. Analysis Wave: Context, Architecture, UI, Performance Agent가 읽기 중심으로 위험과 계약을 확인합니다.
2. Implementation Wave: Implementation Lead가 승인된 범위를 구현합니다.
3. Validation Wave: Test, QA, Performance Agent가 독립 Evidence를 수집합니다.
4. Integration Wave: Final Integrator가 충돌, Gate, Git 범위를 확인합니다.

각 Wave는 이전 Wave의 Handoff가 `PASS` 또는 승인된 `CONCERNS`일 때만 진행합니다.
`FAIL` 또는 `BLOCKED`를 다음 Wave가 임의로 낮춰 해석하지 않습니다.

## 6. Single Production Writer

- Production code의 동시 Writer는 한 명뿐이며 기본 역할은 `IMPLEMENTATION_LEAD`입니다.
- 전문 Agent는 Production code를 직접 수정하지 않고 Findings와 Patch Guidance를 Handoff합니다.
- Docs Agent는 Manifest가 허용한 문서만 수정할 수 있습니다.
- Final Integrator는 승인된 변경을 통합하며 새로운 제품 동작을 몰래 추가하지 않습니다.
- Writer 변경이 필요하면 Orchestrator가 소유권을 명시적으로 넘기고 기록합니다.

## 7. Git Safety

- `git reset`, `git clean`, `git rebase`, `git stash`, force push, history rewrite를 하지 않습니다.
- 소유권이 불명확한 변경을 삭제하거나 덮어쓰지 않습니다.
- Stage 전 변경 파일과 금지 파일을 확인합니다.
- Commit 전 `git diff --cached --check`와 staged file 목록을 확인합니다.
- Commit과 Push는 Manifest Gate가 허용하고 모든 필수 Evidence가 있을 때만 수행합니다.
- QA Checklist MD/PDF와 `.env*`는 Task의 명시적 승인 없이는 Stage하지 않습니다.

## 8. Founder Preview

- Founder 공식 URL은 `http://127.0.0.1:3000`입니다.
- 작업 시작 전 필요한 경우 `pnpm founder:preflight`를 사용합니다.
- 작업 종료 및 QA 준비는 `founder:finalize`, `founder:qa-ready` 계약을 따릅니다.
- Port만 보고 Process를 종료하지 않습니다.
- 다른 Repository 또는 소유권 불명 Process를 종료하지 않습니다.
- Port 충돌 시 자동으로 다음 Port를 선택하지 않습니다.

상세 절차는 [Founder Preview Operations](docs/project/FOUNDER_PREVIEW_OPERATIONS.md)가 정본입니다.

## 9. QA Contract

- **No Evidence, No PASS.**
- Static, Unit, Fixture, Live, Browser, Founder QA를 서로 대체하지 않습니다.
- 요구된 Layer를 실행하지 못하면 `BLOCKED`, `NOT RUN`, `SKIPPED`, `PARTIAL` 중 정확한 상태를 사용합니다.
- 자동 생성한 기대값으로 구현을 검증하지 않습니다.
- Final Commit 기준 Evidence가 필요한 Task는 이전 Commit 결과를 재사용하지 않습니다.
- 열린 CRITICAL 또는 MAJOR가 있으면 PASS와 Commit 가능 상태를 선언하지 않습니다.
- Product 감각과 최종 추천 품질은 Founder Gate를 대체하지 않습니다.

상세 기준은 [Codex QA Protocol](docs/project/CODEX_QA_PROTOCOL.md)을 따릅니다.

## 10. Stop Conditions

다음 중 하나면 자동 진행을 중단합니다.

- Base Branch 또는 Commit 불일치
- 예상하지 않은 tracked/staged 변경
- Manifest와 정본 문서의 충돌
- Architecture, Security, Provider, DB, Auth 경계의 미승인 변경
- 소유권 불명 Process 또는 Port 충돌
- 필수 Agent Handoff의 `FAIL` 또는 `BLOCKED`
- Evidence 없는 PASS 요청
- 사람 승인 Gate 미완료

## 11. Completion Contract

- Acceptance Criteria별 Evidence와 상태를 남깁니다.
- Agent별 Handoff와 열린 Critical/Major를 Final Report에 집계합니다.
- Production Files 변경 여부와 제외 파일을 명시합니다.
- 실행한 검증과 생략한 검증의 이유를 구분합니다.
- Commit SHA, Push 결과, 최종 Working Tree를 보고합니다.
- 후속 작업은 현재 Task에 몰래 포함하지 않고 `Next Task`로 분리합니다.

## 12. Role Contracts

역할별 세부 계약은 [docs/project/agents](docs/project/agents/)에서 관리합니다.
역할 문서는 공통 Schema를 반복 정의하지 않고 책임, 허용 범위, Stop Condition만 구체화합니다.
