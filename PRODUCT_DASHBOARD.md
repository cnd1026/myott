# Product Dashboard

Founder가 Sprint 종료 시점마다 5분 안에 제품 상태를 확인하기 위한 운영 대시보드입니다.

> `PROJECT_STATUS.md`는 개발 진행 관리의 Source of Truth입니다.
> `PRODUCT_DASHBOARD.md`는 Founder가 제품 관점에서 현재 상태와 다음 결정을 빠르게 보는 문서입니다.

---

## 1. Header

| Item | Status |
| --- | --- |
| Product Name | MyOTT / SceneSense / MovieMind DNA |
| Current Sprint | Sprint 6 |
| Current Phase | Decision Experience MVP |
| Last Updated | 2026-07-02 |

---

## 2. Current Focus

사용자의 망설임을 줄인다.

---

## 3. Product Mission

우리는 사람들이 좋은 작품을 찾는 시간을 줄이고, 좋은 작품을 즐기는 시간을 늘린다.

---

## 4. Current Status

| Area | Status |
| --- | --- |
| Current Sprint | Sprint 6 |
| Sprint Status | Completed |
| Current Phase | Decision Experience |
| MVP Status | Ready for Founder Review |

---

## 5. Completed Sprints

### Sprint 5: Provider Foundation

**주요 성과**

- Mock Provider 구현
- TMDB Provider Adapter 연결
- Provider Registry 기반 fallback 구조 확인
- Dynamic Title Input과 Reset UX 추가
- 개발 환경 Provider Status Indicator 추가

**Product Impact**

- 데이터 제공 방식이 바뀌어도 사용자는 동일한 추천 경험을 사용할 수 있다.
- TMDB key가 없어도 Mock Provider로 로컬 검증을 이어갈 수 있다.
- Sprint 6에서 추천 경험 개선에 집중할 수 있는 기반이 마련되었다.

### Sprint 6: Decision Experience

**주요 성과**

- Decision Card MVP 구현
- Hero Recommendation 추가
- Hero Micro UX Polish 완료
- MVP Readiness Polish 완료
- Decision Experience Final Polish 완료

**Product Impact**

Sprint 6 종료 후 사용자는:

- 입력 없이 추천을 시작할 수 있다.
- 추천 이유를 먼저 이해할 수 있다.
- 추천 카드에서 상세 정보로 자연스럽게 이동할 수 있다.
- 더 적은 망설임으로 작품을 선택할 수 있다.

---

## 6. Current Roadmap

| Sprint | Status | Focus |
| --- | --- | --- |
| Sprint 7 | Waiting | Founder Review 기반 User Friction 정리 |
| Sprint 8 | Planned | Provider 검색 결과와 추천 경험 연결 검토 |
| Sprint 9+ | Future | 실제 데이터, 개인화, 저장 기능 확장 |

---

## 7. Founder Checklist

이번 주 해야 할 일:

- [ ] Founder 실사용
- [ ] `FOUNDER_LOG.md` 작성
- [ ] User Friction 기록
- [ ] 10초 / 30초 Time Validation
- [ ] Sprint 7 Planning

---

## 8. Top User Friction

실사용 후 작성 예정입니다.

| Priority | Friction | Evidence | Next Action |
| --- | --- | --- | --- |
| - | - | - | - |

---

## 9. Parking Lot

### Product

- Watch Later
- 실제 OTT 이동 CTA
- 추천 이유 고도화
- Hero Recommendation 개인화

### Technical

- Provider 검색 결과와 메인 추천 결과 연결
- Provider 선택 정책 환경변수화
- 실제 TMDB detail/recommendation endpoint 확장
- 추천 데이터 모델 정리

---

## 10. Technical Debt

| Item | Current Response | Target Timing |
| --- | --- | --- |
| `app/page.jsx` 비대화 | MVP 속도를 위해 유지 | Sprint 8 이후 |
| Dummy Data 중복 | UX 검증용으로 유지 | 실제 Provider 연결 시 정리 |
| 메인 추천과 Provider 검색 결과 분리 | 현재는 의도적으로 분리 | Sprint 8 이후 |

---

## 11. Product Health

| Area | Health |
| --- | --- |
| Provider Architecture | Stable |
| MVP | Ready |
| UX | Improving |
| Architecture | Stable |
| Technical Debt | Controlled |

---

## 12. Sprint Exit Checklist

Sprint 6 완료 항목:

- [x] Decision Card MVP
- [x] Hero Recommendation
- [x] Hero Micro UX Polish
- [x] MVP Readiness Polish
- [x] Decision Experience Final Polish
- [x] Local Build
- [x] Browser Flow Check
- [x] Console Error Check

---

## 13. Product Learning

- 추천은 기능보다 결정 경험이 중요하다.
- 사용자는 추천 이유를 먼저 볼 때 선택을 더 빨리 이해한다.
- 첫 화면에서 추천을 먼저 보여주면 입력 부담이 줄어든다.
- 카드가 클릭 가능하다는 힌트가 다음 행동을 더 자연스럽게 만든다.
- Dashboard에는 결론을, Founder Log에는 관찰 과정을 남기는 편이 유지보수에 좋다.

---

## 14. Next Actions

1. Founder가 Sprint 6 MVP를 실제로 사용한다.
2. `FOUNDER_LOG.md`에 멈춘 지점과 판단 시간을 기록한다.
3. 기록을 바탕으로 Sprint 7 Planning을 진행한다.

---

## 15. Success Definition

기능을 많이 만드는 것: ❌

사용자가 더 적은 시간으로 더 쉽게 작품을 선택하는 것: ✅
