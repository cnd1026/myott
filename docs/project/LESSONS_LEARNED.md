# Lessons Learned

Version: 1.0

Last Updated: 2026-07-04

Status: ACTIVE

이 문서는 MyOTT 개발 과정에서 얻은 실패, 교훈, 개선사항을 기록합니다. 목적은 실수를 비난하는 것이 아니라 같은 문제가 반복되지 않도록 Preventive Rule을 만드는 것입니다.

---

## Purpose

Lessons Learned의 목적:

- Founder QA에서 발견된 문제를 프로젝트 자산으로 남긴다.
- 반복 실수를 줄인다.
- Prompt와 Architecture Check를 더 구체적으로 만든다.
- 새 Sprint가 과거 문제를 다시 만들지 않도록 한다.

---

## Lesson Format

| Field | Description |
| --- | --- |
| Lesson | 교훈 제목 |
| Problem | 발생한 문제 |
| Cause | 원인 |
| Solution | 적용한 해결책 |
| Preventive Rule | 다음부터 지킬 규칙 |

---

## Lessons

### LL-001: Option Group UX는 공통 Rule로 정의한다

| Field | Content |
| --- | --- |
| Lesson | 같은 성격의 option group은 같은 UX Rule을 사용한다. |
| Problem | 장르에는 더보기/접기가 있었지만 국가는 모두 펼쳐져 있었다. |
| Cause | 장르만 개별 구현하고 option group 공통 규칙을 먼저 만들지 않았다. |
| Solution | 8개 이하 전체 표시, 9개 이상 대표 표시 + 더보기/접기 규칙을 모든 option group에 적용했다. |
| Preventive Rule | 장르, 국가, 배우, 감독, 언어, 제작사 등 option group은 같은 expand/search/chip rule을 사용한다. |

### LL-002: Label과 Value는 분리한다

| Field | Content |
| --- | --- |
| Lesson | 사용자 표시 label과 내부 value/id는 분리해야 한다. |
| Problem | Movie Genre와 TV Genre가 모두 `SF`로 표시되어 사용자가 구분하기 어려웠다. |
| Cause | TMDB movie genre와 TV genre를 같은 표시명으로 합쳤다. |
| Solution | `SF`와 `SF·판타지`처럼 label을 구분하고 내부 value는 별도로 유지했다. |
| Preventive Rule | 추천 로직은 TMDB genre id 같은 locale-independent value를 사용하고, UI label은 별도로 관리한다. |

### LL-003: Content Type은 후보 수집 단계에서 분리한다

| Field | Content |
| --- | --- |
| Lesson | 콘텐츠 타입은 score 보정만으로 처리하지 않는다. |
| Problem | 드라마를 선택했는데 애니메이션 또는 Mock/Fallback 데이터가 추천 결과를 지배했다. |
| Cause | Movie/TV/Animation 후보를 섞어 가져온 뒤 score로 정렬하려 했다. |
| Solution | TMDB discover/search를 Movie, TV, Animation request로 분리하고 타입 mismatch를 결과 상태에 들어가기 전에 제거했다. |
| Preventive Rule | Movie 선택은 movie 후보만, TV 선택은 tv 후보만, Animation 선택은 animation 후보만 수집한다. |

### LL-004: UI는 상호작용 QA까지 확인한다

| Field | Content |
| --- | --- |
| Lesson | UI가 보이는 것과 실제 상호작용이 되는 것은 다르다. |
| Problem | Related Pick 카드가 표시되었지만 클릭해도 상세가 바뀌지 않는 문제가 있었다. |
| Cause | drag 상태 flag가 클릭 이벤트를 막을 수 있는 상태로 남았다. |
| Solution | drag 시작 시 flag를 초기화하고 Related Pick 클릭 시 기존 `openDetail` 흐름을 재사용했다. |
| Preventive Rule | 카드, chip, carousel, layer는 표시 QA뿐 아니라 click/drag/swipe/keyboard interaction QA를 포함한다. |

### LL-005: Founder Local QA를 최종 기준으로 둔다

| Field | Content |
| --- | --- |
| Lesson | Codex 환경 검증과 Founder 로컬 검증을 구분한다. |
| Problem | Codex 환경에서는 TMDB fetch가 TLS/network 제약으로 fallback될 수 있었다. |
| Cause | Codex sandbox와 Founder local runtime의 네트워크 조건이 다르다. |
| Solution | Codex는 build/dev/mock fallback/code path를 검증하고, 실제 TMDB 성공 경로는 Founder Local QA 기준으로 확인한다. |
| Preventive Rule | 외부 API 품질은 Codex PASS만으로 완료하지 않고 Founder Local QA 결과를 최종 Evidence로 기록한다. |

---

## Preventive Checklist

새 Task 시작 전 확인:

- [ ] 같은 성격의 UI에 기존 UX Rule이 있는가?
- [ ] label과 value/id가 분리되어 있는가?
- [ ] 후보 수집 단계와 scoring 단계가 혼동되지 않았는가?
- [ ] 표시 QA뿐 아니라 interaction QA가 포함되어 있는가?
- [ ] Codex 환경 한계와 Founder Local QA 기준을 분리해 보고했는가?
