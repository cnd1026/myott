# MyOTT Orchestrator Policy

Version: 1.0

Status: ACTIVE

## 1. Purpose

이 문서는 하나의 Task Manifest를 역할별 Agent가 같은 순서와 Gate로 처리하기 위한 운영 정책입니다. Orchestrator는 판단과 증거를 모으지만 Founder, PM Lab 또는 도메인 정본의 결정권을 대신하지 않습니다.

공통 원칙:

- **No Evidence, No PASS.**
- 한 Task는 하나의 승인된 Manifest와 Base Commit을 사용합니다.
- Production code는 한 시점에 한 Writer만 수정합니다.
- Agent status는 `PASS`, `CONCERNS`, `FAIL`, `BLOCKED`만 사용합니다.
- `FAIL`과 `BLOCKED`는 자동으로 다음 Wave에 전달되지 않습니다.

## 2. Roles And Decision Rights

| Role | Responsibility | Cannot Approve |
| --- | --- | --- |
| Founder | 제품 방향, 우선순위, 최종 제품 QA | 자신의 검증을 기술 Evidence로 대체 |
| HQ | Task intake, Manifest 완성도, Wave 배치, 충돌 라우팅 | Founder 또는 PM Lab Gate 대행 |
| PM Lab | Scope, 사용자 가치, Acceptance Criteria, 출시 가능성 검토 | 미실행 QA를 PASS로 변경 |
| Codex Orchestrator | Agent 실행 순서, Handoff 수집, 상태 집계 | 사람 승인, Evidence 없는 PASS |
| Specialist Agent | 역할별 분석 또는 검증 | Production 구현 소유권 자동 획득 |
| Implementation Lead | 승인된 Production 변경의 단일 Writer | Scope 또는 정본 계약 임의 확장 |
| Final Integrator | 통합 검토, Gate 확인, Git 범위 확정 | 열린 Critical/Major 무시 |

HQ는 Manifest의 누락과 역할 충돌을 해결합니다. PM Lab은 제품 범위와 Acceptance Criteria의 타당성을 검토합니다. Founder는 사용자 경험과 최종 제품 판단을 소유합니다. Codex는 저장소 작업과 기술 Evidence를 소유합니다.

## 3. Required Inputs

Task를 시작하려면 다음이 있어야 합니다.

- [Task Manifest](TASK_MANIFEST_TEMPLATE.yaml) 구조의 승인된 Task
- 정확한 repository, base branch, base commit
- Architecture와 QA Protocol version
- Goals, Acceptance Criteria, Do Not Change, Out Of Scope
- Required Agents와 사람 Gate
- 예상 Commit/Push 정책

누락된 값이 실행 안전성에 영향을 주면 Task는 `BLOCKED`입니다. 비차단 누락은 `CONCERNS`로 Handoff하고 HQ가 결정합니다.

## 4. Wave Model

### Wave 1: Analysis

목적:

- Base와 정본 계약 확인
- 영향 범위와 위험 식별
- 구현 전 재현과 Evidence 기준 확정

기본 역할:

- Context Agent
- Architecture Agent
- UI Agent
- Performance Agent

이 Wave는 원칙적으로 읽기 전용입니다. Production 변경을 시작하지 않습니다.

### Wave 2: Implementation

목적:

- 승인된 Required Changes만 구현
- 기존 사용자 변경과 정본 계약 보존
- 검증 가능한 최소 변경 생성

Writer:

- `IMPLEMENTATION_LEAD` 한 명
- Manifest가 문서 Writer를 별도로 허용한 경우 `DOCS_AGENT`는 문서 범위만 수정

여러 Agent가 같은 Production 파일을 동시에 수정하지 않습니다. Writer 소유권 이전은 Orchestrator 기록과 Handoff가 있어야 합니다.

### Wave 3: Validation

목적:

- 구현자와 분리된 관점으로 Acceptance Criteria 검증
- Static, Unit, Fixture, Live, Browser Layer 상태 분리
- Regression, Performance, Security 경계 확인

기본 역할:

- Test Agent
- QA Agent
- Performance Agent
- UI Agent

QA Layer는 [Codex QA Protocol](../CODEX_QA_PROTOCOL.md)을 따릅니다. 실행할 수 없는 Layer는 `BLOCKED` 또는 `NOT RUN`으로 남깁니다.

### Wave 4: Integration

목적:

- 모든 Handoff와 열린 이슈 통합
- PM Lab/Founder Gate 상태 확인
- Stage, Commit, Push 가능 여부 결정

역할:

- Final Integrator
- Docs Agent
- Context Agent

Final Integrator는 새 제품 동작을 추가하지 않습니다. 통합 중 행동 변경이 필요하면 Implementation Wave로 되돌립니다.

## 5. Handoff Contract

모든 Agent는 [Agent Handoff Schema](AGENT_HANDOFF_SCHEMA.json)에 맞는 한 개의 Handoff를 제출합니다.

Handoff 규칙:

- Finding은 Evidence ID를 참조합니다.
- Required Change와 Recommended Change를 구분합니다.
- 파일을 읽지 않았으면 `filesReviewed`에 넣지 않습니다.
- 실행하지 않은 Test를 PASS로 기록하지 않습니다.
- 결정을 요구하면 `decisionNeeded.required`를 `true`로 설정합니다.
- Secret과 인증 정보는 Evidence에 포함하지 않습니다.

Status 해석:

| Status | Meaning | Next Wave |
| --- | --- | --- |
| `PASS` | 역할 범위에서 차단 이슈 없음 | 가능 |
| `CONCERNS` | 진행 가능하나 명시적 위험 또는 권고 존재 | Gate 판단 필요 |
| `FAIL` | Acceptance 또는 계약 위반 확인 | 불가 |
| `BLOCKED` | 환경, 권한, 입력 누락으로 판단 불가 | 불가 |

## 6. Human Approval Gates

다음은 사람 승인 없이 자동 진행하지 않습니다.

- Product direction 또는 Acceptance Criteria 변경
- Architecture breaking change
- Request Budget, Hard Filter, Provider, DB, Auth, 개인정보 경계 변경
- 새 외부 Dependency 또는 Service 도입
- Secret, 환경변수, 배포 설정 변경
- 다른 Process 종료 또는 소유권 불명 Port 조작
- 데이터 삭제, migration, rollback
- Founder Product QA 대체
- Force push, history rewrite 또는 파괴적 Git 작업

Gate owner:

- Founder Gate: 사용자 경험, 추천 품질, 최종 제품 승인
- PM Lab Gate: Scope, 사용자 가치, Acceptance의 제품 일관성
- HQ Gate: Manifest 완성도, 역할 및 Wave 충돌

## 7. Automatic Stop Conditions

Orchestrator는 다음 상태에서 자동 진행을 중단합니다.

- branch 또는 Base Commit 불일치
- 예상하지 않은 tracked/staged 변경
- 필수 역할 Handoff 누락
- `FAIL` 또는 `BLOCKED` Handoff 존재
- 열린 CRITICAL 또는 MAJOR 존재
- Production Writer 충돌
- Manifest와 정본 문서 충돌
- QA 필수 Layer Evidence 누락
- Founder 또는 PM Lab Gate가 `REJECTED` 또는 `BLOCKED`
- Commit/Push 권한이 Manifest에 없음

## 8. Single Production Writer

Single Production Writer는 코드 충돌 방지보다 넓은 안전 계약입니다.

- Implementation Lead만 Production 동작을 변경합니다.
- Specialist Agent는 Patch Guidance와 Evidence를 전달합니다.
- Test Agent는 테스트 전용 파일만, Docs Agent는 문서만 Manifest 허용 범위에서 수정할 수 있습니다.
- Final Integrator는 승인된 Patch를 통합하고 Gate를 확인합니다.
- Writer가 바뀌면 이전 Writer는 작업을 멈추고 최신 Base/Handoff를 넘깁니다.

## 9. Git And Preview Gates

Git:

- Stage 전 허용/제외 파일을 확인합니다.
- 파괴적 Git 명령은 금지합니다.
- Commit 전 cached diff와 whitespace를 검증합니다.
- Push 전 Remote divergence를 확인합니다.

Founder Preview:

- 운영 절차는 [Founder Preview Operations](../FOUNDER_PREVIEW_OPERATIONS.md)를 따릅니다.
- 공식 URL은 `http://127.0.0.1:3000`입니다.
- 다른 Repository Process를 종료하지 않습니다.
- 최종 Commit Browser Evidence가 요구되면 Commit 후 다시 수집합니다.

## 10. Final Decision

Final Integrator는 [Final Report Template](FINAL_REPORT_TEMPLATE.md)을 완성하고 다음을 모두 확인합니다.

- Agent별 상태
- QA Layer별 Evidence
- 열린 Critical/Major
- PM Lab Gate
- Founder Gate
- Commit/Push 가능 여부
- 다음 Task

PASS 조건:

- 필수 Agent가 모두 `PASS` 또는 승인된 `CONCERNS`
- 필수 QA Layer가 Evidence와 함께 PASS
- 열린 CRITICAL/MAJOR 0
- 필수 사람 Gate 승인
- 금지 파일과 범위 위반 0

하나라도 충족하지 못하면 전체 상태는 `PARTIAL`, `FAIL`, 또는 `BLOCKED`로 보고하며 PASS로 축소하지 않습니다.

## 11. Related Contracts

- [Root Agent Agreement](../../../AGENTS.md)
- [Development Rules](../DEVELOPMENT_RULES.md)
- [AI Collaboration](../AI_COLLABORATION.md)
- [Recommendation Architecture](../RECOMMENDATION_ARCHITECTURE.md)
- [Codex QA Protocol](../CODEX_QA_PROTOCOL.md)
- [Founder Preview Operations](../FOUNDER_PREVIEW_OPERATIONS.md)
