# MyOTT Roadmap

Version: 2.4

Last Updated: 2026-07-18

Status: ACTIVE

이 문서는 MyOTT의 제품, Recommendation Engine, 플랫폼 운영 진행 상황을 한눈에 확인하기 위한 실행 로드맵입니다. `PROJECT_STATUS.md`가 개발 상태의 기록이라면, ROADMAP은 다음 우선순위와 마일스톤을 관리합니다.

---

## 1. Project Overview

MyOTT는 사용자가 보고 싶은 콘텐츠를 더 쉽고 신뢰할 수 있게 발견하도록 돕는 Decision Experience 제품입니다.

핵심 방향:

- 추천 결과 수보다 첫 번째 선택의 품질을 높인다.
- 추천 근거를 설명 가능하게 유지한다.
- Founder QA와 반복 가능한 품질 데이터로 제품을 개선한다.

---

## 2. Current Sprint

| Item | Status |
| --- | --- |
| Current Sprint | Sprint 9 - Recommendation Engine Foundation |
| Sprint Focus | 추천 품질을 지속적으로 측정하고 조정할 수 있는 기반 구축 |
| Current Phase | Multi-seed global type coverage와 Cross-media Seed integrity 검증 |
| Product Status | Recommendation Architecture v2.7.1 통합 Seed/Type allocator와 dual evidence 구현 완료 |
| Release Status | 자동화 회귀와 Browser 기술 QA 진행, Founder 제품 QA 대기 |

---

## 3. Current Progress

| Area | Progress | Current State |
| --- | --- | --- |
| Decision Experience | Complete | Hero, Decision Card, Detail Layer, Trust UX 정리 |
| Real Data Integration | Complete | TMDB, fallback, option, related recommendation 흐름 연결 |
| Recommendation Architecture | In progress | v2.7.1 Multi-seed Seed/Type 통합 allocation과 Cross-media dual evidence 적용 |
| Recommendation QA | In progress | 107개 Deterministic Dataset과 확장 Live Cold/Warm 검증, Founder 제품 QA 대기 |
| Operating Standards | Complete | Founder Preview readiness와 CODEX_QA_PROTOCOL v1.1.1 증거 기반 QA gate 적용 |

---

## 4. Sprint Timeline

| Sprint | Theme | Outcome | Status |
| --- | --- | --- | --- |
| Sprint 5 | Provider Foundation | Provider Registry, Mock, TMDB adapter, fallback 기반 | Complete |
| Sprint 6 | Decision Experience | 입력 전 추천과 빠른 선택 흐름 | Complete |
| Sprint 7 | Recommendation Trust | Trust Signal과 상세 정보 신뢰 UX | Complete |
| Sprint 8 | Real Data Integration | TMDB 기반 추천, 옵션, 안정화 QA | Complete |
| Sprint 9 | Recommendation Engine Foundation | Architecture, dataset, evaluator, weight ranking | In progress |
| Sprint 10 | Quality Iteration | QA runner, signal tuning, Founder feedback loop | Planned |

---

## 5. Product Milestones

| Milestone | Success Definition | Status |
| --- | --- | --- |
| Recommendation First | 입력 없이도 추천 가치를 이해 | Complete |
| Trustworthy Recommendation | 이유, insight, trust signal을 통해 추천을 신뢰 | Complete |
| Real Data Reliability | TMDB와 fallback source를 정확히 구분 | Complete |
| Explainable Ranking | Signal + Weight 기반 정렬을 설명 가능한 형태로 운영 | In progress |
| Measurable Quality Loop | QA Dataset으로 품질 변화를 반복 측정 | Planned |

---

## 6. Current Focus

Recommendation Engine의 품질을 Founder QA와 데이터 기반으로 반복 측정하고 조정할 수 있게 만든다.

---

## 7. Technical Debt

| Item | Impact | Planned Response |
| --- | --- | --- |
| Live TMDB QA 환경 의존 | Codex 환경과 Founder 로컬의 외부 연결 조건이 다를 수 있음 | Live Runner 결과를 Founder QA 기록으로 보존 |
| `page.jsx` 책임 집중 | Recommendation UI/state 변경의 회귀 위험 | 범위가 허용되는 Sprint에서 점진 분리 |
| TMDB 환경 의존 검증 | 외부 API 성공 경로는 Founder 환경 확인 필요 | Provider QA fixture와 실행 기록 보강 |
| Watch Provider 데이터 지역성 | 실제 OTT 제공처가 locale별로 달라질 수 있음 | 실제 데이터만 표시, 고도화는 후속 Sprint |
| Founder Preview lifecycle 운영 위험 | Cleanup 실패 은폐, clone 간 State 충돌, QA 직전 dirty tree 승인 위험 | Global lock, Repository별 State, failure gate, `founder:qa-ready` 적용 완료 |

---

## 8. Recommendation Roadmap

| Version | Focus | Planned Outcome |
| --- | --- | --- |
| v1 | Rule-based Foundation | Feature, Signal, Weight, Score, hard filter, fallback, explainability |
| v1.1 | Quality Measurement | QA Dataset evaluator와 scoreDetail 기반 검증 |
| v2 | Candidate Integrity | country hard constraint, result tier, franchise deduplication, metadata normalization |
| v2.1 | Candidate Reliability | request budget, progressive fetch, exact ratio, seed scoring, QA runner |
| v2.2 | Shared Multi-Seed Reliability | action 단위 shared context, request budget, deadline, partial success, Cold/Warm QA |
| v2.3 | Adaptive Seed and Genre Integrity | unified genre contract, semantic TV genre, confirmed Seed, budget recycling, coverage UX |
| v2.4 | Genre Taxonomy Integrity | shared Provider ID semantic specialization, format/audience/style 분리 |
| v2.5 | TV Semantic Recall and Presentation | Filtering/Scoring 분리, controlled combined, 한국어 표시와 이유 정합성 |
| v2.6 | Submitted Preference and Hard Filter Integrity | 결과 Session 고정, 콘텐츠 타입/OTT/런타임 제약, Related identity, QA diagnostics |
| v2.7 | Recall Breadth and Cross-media Balance | Adaptive planning, 타입별 List/Detail 배분, Seed cross-media coverage, scarcity diagnostics |
| v2.7.1 | Multi-seed Coverage Integrity | Seed/Type 통합 allocator, cross-media dual evidence, 실제 request outcome과 media diagnostics |
| v2.8 | Metadata-aware Scoring | keyword, director, actor, language, freshness, diversity 고도화 |
| v3 | Feedback-aware Tuning | Founder QA 기록과 반복 tuning loop 연결 |
| v4 | User-aware Recommendation | 계정/저장 데이터 이후 개인 취향 반영 |
| Future | AI-assisted Recommendation | 검증된 signal을 설명하거나 ranking을 보조하는 AI |

---

## 9. Platform Roadmap

| Area | Next Step |
| --- | --- |
| Documentation | ChatGPT/Codex Platform별 AI Execution Profile과 Session Review를 모든 작업 Prompt에 적용 |
| QA | CODEX_QA_PROTOCOL v1.1.0 기반 Recall/coverage 증거와 Final Commit Browser 재실행 운영 |
| Architecture | Recommendation module의 책임을 점진적으로 분리 |
| Observability | Provider source, fallback reason, recommendation quality 기록 강화 |
| Governance | Decision Log, Project Memory, Lessons Learned를 Sprint review에 반영 |
| Local Runtime | Cleanup failure propagation, exact ownership boundary, global 3000 lock, Repository별 runtime, QA Ready gate 운영 |

---

## 10. Release Roadmap

| Release Stage | Gate |
| --- | --- |
| Internal QA | Build, dev, QA Dataset, console, regression 확인 |
| Founder QA | 실제 TMDB 환경과 핵심 사용 흐름 승인 |
| Sprint Exit | Product impact, known issue, documentation update 확인 |
| Release Candidate | 품질 지표와 critical issue가 기준을 충족할 때 검토 |

---

## 11. Future Ideas

- Live TMDB QA result history
- Signal/weight tuning dashboard
- Keyword, director, actor metadata scoring
- Provider availability 고도화
- User feedback 기반 recommendation quality loop
- AI-assisted explanation with rule-based evidence guardrail

---

## 12. Operating Rules

- Sprint 시작 시 Current Sprint, Focus, Progress를 갱신한다.
- Sprint 종료 시 Timeline, Milestone, Technical Debt, Revision History를 갱신한다.
- 제품 또는 Architecture version이 바뀌면 Current Progress와 관련 Roadmap version을 갱신한다.
- ROADMAP은 계획과 우선순위를 관리하며, 상세 작업 이력은 `TASK_HISTORY.md`, 개발 상태는 `PROJECT_STATUS.md`에서 관리한다.

---

## 13. Revision History

| Version | Date | Change |
| --- | --- | --- |
| v1.0 | 2026-07-13 | Initial company roadmap and Sprint 9 operating standard |
| v1.1 | 2026-07-13 | AI Execution Profile을 ChatGPT/Codex 기준으로 분리하고, Founder의 모델 선택 책임을 CTO로 명시 |
| v1.2 | 2026-07-13 | Recommendation Architecture v2.0 candidate pipeline, country integrity, result tier, Founder TMDB QA 상태 반영 |
| v1.3 | 2026-07-13 | Recommendation Architecture v2.1 request budget, progressive candidate quality, 20-case QA runner 반영 |
| v1.4 | 2026-07-13 | Recommendation Architecture v2.2 shared multi-seed action, deadline, 24-case QA, Cold/Warm Live Runner 반영 |
| v1.5 | 2026-07-13 | Recommendation Architecture v2.3 unified genre contract, confirmed Seed, adaptive budget recycling, 31-case QA 반영 |
| v1.6 | 2026-07-13 | Recommendation Architecture v2.4 taxonomy category, semantic pair audit, 48-case QA 반영 |
| v1.7 | 2026-07-16 | Recommendation Architecture v2.5 TV semantic recall, 한국어 Canonical 표시, 60-case/42-case QA 반영 |
| v1.8 | 2026-07-17 | Persistent Founder Preview lifecycle, Codex Local Runtime Port Governance, Founder QA 환경 일관성 반영 |
| v1.9 | 2026-07-17 | Founder Preview cleanup failure propagation, multi-clone runtime isolation, Founder QA readiness gate 반영 |
| v2.0 | 2026-07-18 | Recommendation Architecture v2.6 Submitted Snapshot, OTT/런타임 Hard Filter, Related identity, 81-case/49-case QA 반영 |
| v2.1 | 2026-07-18 | Hard Filter 기본값/Provider label 보정과 CODEX_QA_PROTOCOL v1.0, Prompt Guide v1.5.0 반영 |
| v2.2 | 2026-07-18 | Runtime Long 120분, 전체 range coverage, QA Protocol v1.0.1과 Founder Keyboard 수동 PASS 반영 |
| v2.3 | 2026-07-18 | Recommendation Architecture v2.7 Adaptive Recall, cross-media type balance, 100-case QA와 QA Protocol v1.1.0 반영 |
| v2.4 | 2026-07-18 | Recommendation Architecture v2.7.1 Multi-seed coverage, dual cross-media evidence, 107-case QA와 QA Protocol v1.1.1 반영 |
