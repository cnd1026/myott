# Project Status

이 문서는 MyOTT의 현재 진행 상태를 빠르게 확인하기 위한 public-safe 상태판입니다.

## Current Sprint

Sprint 9 — Recommendation Engine Foundation

## Current Task

Recommendation observability evidence closure and independent review.

Product correction, Network diagnostic, Live QA, main merge, release는 별도 승인 gate로 유지합니다.

## Current Public Main

`main @ 2f75ad55244b32a226fd9f3a744417612cecbfb1`

- Commit: `docs: add development status through 2026-08-12`
- 이 commit은 public-safe documentation maintenance only입니다.
- Product/source/test 동작을 변경하지 않습니다.

## REC-QA-091 Product Code Baseline

`f38b746416a13c3b2bbcac4396fee08b7c1160ea`

현재 public main의 docs-only child가 생겼더라도 Sprint 9 recommendation QA의 historical Product code baseline 의미는 유지됩니다.

## Current QA Checkpoint

Branch:

`qa/rec-qa-091-active-base-observability-v1`

Committed checkpoint:

`6952481d7b3bcab432e2c80f3405c69cd0fde0ce`

- current-product observability checkpoint를 전용 QA branch에 보존했습니다.
- main에는 merge하지 않았습니다.
- Candidate-lineage observability 검증은 이 checkpoint 위에서 별도 QA/evidence gate를 통해 진행 중입니다.

## Current Version

`0.1.0`

## Repository

`https://github.com/cnd1026/myott`

## Current App State

- Next.js 기반 추천 웹앱입니다.
- Provider Registry를 통해 TMDB와 Mock fallback 경로를 분리합니다.
- Sprint 9에서는 Recommendation Architecture, hard-filter integrity, recall breadth, cross-media balance, deterministic QA 및 current-product observability를 강화했습니다.
- 현재 QA 작업은 추천 정책을 추측으로 수정하지 않고, 실제 Product 동작을 설명할 수 있는 evidence 품질과 재현성을 먼저 확보하는 방향입니다.
- Public-safe 진행 기록은 저장소 루트의 `DEVELOPMENT_STATUS.md`에서 확인할 수 있습니다.

## Current QA / Release State

- Founder Product QA: `FAIL / BLOCKED`
- Current causal stage: `NOT PROVEN`
- Product contract conflict: `NOT PROVEN`
- Network diagnostic: `NOT AUTHORIZED`
- Historical Harness / Live path: `CLOSED`
- Main merge: `NOT AUTHORIZED`
- Release: `NOT AUTHORIZED`

이 상태는 Product 결함이 해결됐다는 의미가 아닙니다. Independent evidence가 닫히기 전에는 release-ready 상태로 승격하지 않습니다.

## Current Documentation State

- `DEVELOPMENT_STATUS.md`: 공개 코드 업데이트 사이의 public-safe 개발 진행 기록
- `CHANGELOG.md`: 주요 변경 기록
- `docs/dev-log.md`: 개발일지
- `docs/service-architecture.md`: 서비스 기능 로드맵
- `docs/user-journey-data-flow.md`: 사용자 여정과 데이터 흐름
- `docs/data-policy.md`: 데이터 저장/개인정보 보호 설계
- `docs/database/`: DB 도메인 설계와 인벤토리
- `docs/architecture/provider-architecture.md`: Provider 구조 설계
- `docs/project/`: Project Memory System
- `docs/project/APS_PUBLIC_NOTICE.md`: 공개 저장소의 APS 참조 범위 안내
- APS 핵심 운영 문서의 Source of Truth는 private Platform repository `cnd1026/Nd_core`입니다.

## Next Milestone

- Candidate-lineage observability의 source-unchanged Build Evidence integrity를 닫습니다.
- Independent Review를 완료합니다.
- 그 이후에만 Founder Commit/Push 또는 Network diagnostic gate를 별도로 엽니다.

## Public Maintenance Policy

의미 있는 개발이 계속되지만 QA/security/release gate 때문에 public Product commit이 늦어질 때는 public-safe 상태 문서, documentation commit, issue 또는 review artifact를 사용할 수 있습니다.

Empty commit이나 인위적인 activity 생성은 사용하지 않습니다.

## Risk Notes

- 공개 `main`의 최신 commit은 docs-only maintenance이며 현재 Candidate-Lineage QA branch를 rebase하거나 무효화하지 않습니다.
- TMDB credential과 private diagnostic evidence는 public repository에 기록하지 않습니다.
- Candidate-Lineage / observability 작업은 Product 동작 변경과 분리된 QA-only evidence path입니다.
- Network/Live/Release는 각각 별도 gate가 필요합니다.
