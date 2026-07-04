# Project Memory

Version: 1.0

Last Updated: 2026-07-04

Status: ACTIVE

이 문서는 MyOTT가 장기 프로젝트로 이어질 때 반드시 기억해야 하는 결정, 철학, 원칙을 기록합니다. 상세 운영 방식은 `PLAYBOOK.md`, Prompt 작성 표준은 `PROMPT_GUIDE.md`, 실패와 예방 규칙은 `LESSONS_LEARNED.md`에서 관리합니다.

---

## Purpose

Project Memory의 목적:

- 중요한 결정을 흩어지지 않게 유지한다.
- Sprint가 바뀌어도 제품 철학과 기술 원칙이 이어지게 한다.
- 새 AI 도구나 새 작업자가 프로젝트 맥락을 빠르게 이해하게 한다.
- 왜 이런 방향을 선택했는지 근거를 남긴다.

---

## Memory Format

| Field | Description |
| --- | --- |
| Decision ID | 기억 항목의 고유 ID |
| Date | 결정 또는 채택 날짜 |
| Topic | 주제 |
| Decision | 결정 내용 |
| Reason | 결정 이유 |
| Impact | 프로젝트에 미치는 영향 |
| Status | Active / Superseded / Deprecated |

---

## Decisions

| Decision ID | Date | Topic | Decision | Reason | Impact | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PM-001 | 2026-07-04 | Prompt Template Version 관리 | Prompt도 코드처럼 version을 관리한다. | Prompt 품질이 Codex 결과 품질과 직접 연결되기 때문이다. | Prompt 변경 이력을 추적하고 반복 개선 가능. | Active |
| PM-002 | 2026-07-04 | Global Ready | i18n, locale, metadata, label/value 분리를 Prompt와 QA에 포함한다. | 한국어 표시 문구에 추천 로직이 묶이면 글로벌 확장이 어려워진다. | country code, genre id, provider id 중심의 구조 유지. | Active |
| PM-003 | 2026-07-04 | Recommendation Engine Principle | 추천 엔진은 더 많은 결과가 아니라 첫 번째 선택의 품질을 높이는 도구다. | 사용자의 시간을 줄이는 것이 MyOTT의 핵심 가치이기 때문이다. | scoring, insight, trust signal이 선택 속도 중심으로 정렬됨. | Active |
| PM-004 | 2026-07-04 | Founder QA 우선 | Codex PASS보다 Founder PASS를 최종 제품 기준으로 둔다. | Codex는 기술 검증을 하지만 제품 감각은 Founder 실사용에서 드러난다. | Local QA와 Founder Review가 후속 Task Evidence가 됨. | Active |
| PM-005 | 2026-07-04 | Consistency First Principle | 같은 성격의 UI는 같은 UX Rule을 사용한다. | 장르/국가처럼 같은 option group이 다른 규칙을 가지면 사용자가 헷갈린다. | expand/search/chip/carousel pattern 재사용 우선. | Active |
| PM-006 | 2026-07-04 | Content Type 후보 분리 | 콘텐츠 타입은 score 보정 전에 후보 수집 단계에서 분리한다. | Movie/TV/Animation이 섞인 뒤 score로 밀어내면 추천 신뢰가 깨진다. | TMDB discover/search request를 타입별로 분리하는 기준 수립. | Active |
| PM-007 | 2026-07-04 | Prompt Guide 생성 | `PROMPT_GUIDE.md`를 공식 Prompt Engineering 표준으로 둔다. | Founder, ChatGPT, Codex가 같은 Task 구조를 사용해야 한다. | Prompt Template, Codex Mode, Architecture Check, Global Ready Check 정착. | Active |
| PM-008 | 2026-07-04 | AI Collaboration 문서 생성 | `AI_COLLABORATION.md`를 공식 협업 Workflow 문서로 둔다. | 새 AI 도구가 추가되어도 역할과 책임이 흔들리지 않아야 한다. | Founder/ChatGPT/Codex/CTO/Future AI 역할 분리. | Active |

---

## Review Rule

Project Memory에 추가할 기준:

- Sprint를 넘어 반복 적용될 결정인가?
- 나중에 같은 논쟁이 다시 생길 가능성이 있는가?
- 제품 철학, 아키텍처, QA 기준에 영향을 주는가?
- Founder, ChatGPT, Codex, CTO가 함께 알아야 하는가?

위 질문 중 하나라도 YES라면 Project Memory 후보입니다.
