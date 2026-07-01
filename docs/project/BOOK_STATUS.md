# Book Status

이 문서는 MyOTT 프로젝트에서 파생되는 장기 기록물과 학습 자산의 현재 상태를 정리합니다.

## 1. MyOTT Bible

상태:

- 초안 축적 단계

설명:

MyOTT Bible은 제품의 철학, 기능 범위, 데이터 정책, DB 설계, Provider 구조, 작업 규칙을 한곳에 모으는 내부 기준서입니다.

현재 기반 문서:

- `docs/service-architecture.md`
- `docs/user-journey-data-flow.md`
- `docs/data-policy.md`
- `docs/database/database-inventory.md`
- `docs/architecture/provider-architecture.md`
- `docs/project/`

다음 작업:

- v1.0 MVP 범위를 확정한 뒤 MyOTT Bible 목차를 정리합니다.
- 제품 철학, 데이터 철학, AI 추천 철학을 통합합니다.

## 2. AI Development System

상태:

- 운영 규칙 정리 단계

설명:

AI Development System은 Product Owner, GPT, Codex가 함께 서비스를 만드는 반복 가능한 작업 시스템입니다.

현재 구성 요소:

- AI PM Bootstrap System
- Sprint 기반 진행
- Task 기반 실행
- Documentation First
- Git Commit/Push
- Local Test
- PMS 업데이트
- Decision Log
- Founder Notes

다음 작업:

- Task 템플릿을 별도 문서로 분리할지 검토합니다.
- Review 체크리스트를 더 구체화합니다.
- UI 작업, 문서 작업, DB 작업, Provider 작업별 완료 조건을 표준화합니다.

## 3. 『AI와 함께 서비스를 만드는 방법』

상태:

- 소재 수집 단계

설명:

이 프로젝트는 AI와 함께 실제 서비스를 만드는 과정을 기록하고 있습니다. 향후 책이나 긴 글로 정리할 수 있는 주제는 다음과 같습니다.

- 아이디어를 Sprint로 바꾸는 방법
- 더미 UX로 먼저 제품 감각을 검증하는 방법
- Documentation First로 DB와 아키텍처를 설계하는 방법
- 개인정보 최소 수집을 제품 철학으로 삼는 방법
- GPT와 Codex의 역할을 나누는 방법
- Project Memory System으로 장기 프로젝트를 이어가는 방법

다음 작업:

- 각 Sprint 종료 시 배운 점을 Founder Notes에 추가합니다.
- 실패나 오류 해결 사례도 숨기지 않고 기록합니다.
- 실제 MVP 출시 전까지의 의사결정 흐름을 정리합니다.

## 4. 현재 진행 요약

| 항목 | 상태 | 다음 단계 |
| --- | --- | --- |
| MyOTT Bible | 초안 축적 | 목차와 v1.0 기준 정리 |
| AI Development System | 운영 규칙 정리 | Task/Review 템플릿 구체화 |
| 『AI와 함께 서비스를 만드는 방법』 | 소재 수집 | Sprint 회고와 Founder Notes 축적 |

## 5. 원칙

- 책보다 제품이 먼저입니다.
- 기록은 제품 개발을 방해하지 않고, 제품의 기억을 보존하기 위해 존재합니다.
- 좋은 기록은 다음 작업자가 더 빨리, 더 정확하게 이어받게 만듭니다.
