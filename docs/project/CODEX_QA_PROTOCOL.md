# Codex QA Protocol

Version: 1.1.0

Last Updated: 2026-07-18

Status: ACTIVE

이 문서는 MyOTT에서 Codex가 구현과 검증을 수행할 때 따라야 하는 영구 QA 표준입니다. 모든 Task Prompt, Sprint QA, 출시 전 기술 검증은 이 문서를 기본 계약으로 사용합니다.

---

## 1. Purpose And Authority

Codex QA의 목적은 구현 완료를 주장하는 것이 아니라, 기대값과 실제값을 재현 가능한 증거로 비교하는 것입니다.

핵심 원칙:

- **No Evidence, No PASS.**
- HTTP 200은 Browser PASS가 아닙니다.
- Unit PASS는 Live PASS가 아닙니다.
- Live API PASS는 Browser PASS가 아닙니다.
- Codex PASS는 Founder PASS가 아닙니다.
- Browser Automation을 사용할 수 없으면 `BLOCKED`로 기록하며 PASS로 대체하지 않습니다.
- 한 QA Layer의 PASS는 다른 Layer의 PASS를 자동으로 의미하지 않습니다.

이 문서는 Word/PDF 체크리스트보다 우선하는 QA Source of Truth입니다. 외부 체크리스트는 Founder가 수기로 기록하는 보조 산출물입니다.

---

## 2. Founder And Codex Roles

### Founder

Founder는 다음 제품 품질을 최종 판단합니다.

- 일반 사용자 화면의 이해도와 UX 흐름
- 추천 결과의 실제 장르 적합성, 다양성, 재미
- 추천 이유의 자연스러움과 제품 신뢰
- 시각적 완성도와 최종 제품 승인

### Codex

Codex는 다음 기술 품질을 검증합니다.

- UI 조건과 실제 Request 일치
- Provider/API 계약과 Hard Filter 무결성
- Media Type, OTT Provider ID, Runtime Metadata
- Submitted Snapshot과 상태 전환
- Race Condition과 최신 응답 Gate
- Related identity와 중복
- Console, Network, API, Responsive, Keyboard
- 반복, 경계, 충돌, null/unknown metadata

Codex 기술 PASS는 Founder 제품 PASS를 대체하지 않습니다.

---

## 3. QA Status Taxonomy

모든 Test Case는 다음 중 하나로만 기록합니다.

| Status | Definition |
| --- | --- |
| `PASS` | 기대값과 실제값을 증거로 확인 |
| `FAIL` | 기대값과 실제값이 다름 |
| `BLOCKED` | Tool, Environment, Permission 또는 External Provider 문제로 실행 불가 |
| `NOT RUN` | 실행하지 않음 |
| `SKIPPED` | 명시적인 Scope 밖이며 사유가 있음 |
| `PARTIAL` | 일부 단계나 일부 기대값만 확인 |

`문제 없어 보임`, `아마 PASS`, `확인된 것 같음`은 허용되는 QA 상태가 아닙니다.

---

## 4. QA Layer Separation

| Layer | Scope | Required Evidence |
| --- | --- | --- |
| 1. Static Review | Diff, type/contract, API parameter, state flow, identity, error path | 파일/라인과 확인 결과 |
| 2. Unit / Pure | Helper, boundary, state transition, filter, dedupe, race gate | 실행 명령, case 수, pass/fail |
| 3. Deterministic Fixture | 고정 입력과 기대값, 외부 Provider 비의존 | case별 결과와 failed reason |
| 4. Live Provider | 실제 TMDB, budget, metadata, cache, provider contract | Provider, 결과, budget, 실패/skip 이유 |
| 5. Browser Functional | 클릭, DOM, 화면 상태, Network, Console, 사용자 흐름 | Browser evidence contract |
| 6. Founder Product | 추천 품질, 자연스러움, 신뢰, 최종 승인 | Founder 기록과 승인 상태 |

Task Prompt는 필요한 QA Layer를 명시해야 합니다. 요구된 Layer를 실행하지 못하면 해당 Layer는 `BLOCKED` 또는 `NOT RUN`입니다.

---

## 5. Reproduction First

버그 수정은 가능한 범위에서 다음 순서를 따릅니다.

1. 기존 실패 조건 정의
2. 재현 Test 또는 증거 생성
3. Root Cause 확인
4. 최소 수정
5. 기존 실패 조건 재검증
6. 인접 회귀 검사
7. 전체 Regression 실행

재현하지 못한 경우 이유를 기록하고 추측을 Root Cause로 표현하지 않습니다.

---

## 6. Adversarial QA

Codex는 Prompt에 적힌 Happy Path만 확인하고 종료하지 않습니다. 변경마다 최소한 다음 질문을 검토합니다.

- 기본값, 미선택, 전체 선택, 단일/복수 선택은 어떻게 다른가?
- 복수 선택은 OR인가 AND인가?
- Metadata가 null, unknown, mismatch이면 어떻게 되는가?
- Provider ID와 이름이 충돌하면 무엇이 Source of Truth인가?
- 결과 생성 후 Draft 조건만 바꾸면 기존 결과가 재해석되는가?
- Reset 중 요청이 진행 중이면 Abort되는가?
- Network 응답 순서가 뒤집히면 오래된 응답이 반영되는가?
- 동일 작품이 다른 타입, 번역 제목, 원제로 오면 중복되는가?
- Client와 Server 판정이 같은 공통 계약을 사용하는가?
- Development 진단 정보가 Production에 노출되는가?
- 모바일과 Keyboard로 핵심 흐름을 조작할 수 있는가?

인접 문제는 Scope 안이면 수정하고, Scope 밖이면 Known Issue에 남깁니다. 발견 사실을 숨기지 않습니다.

---

## 7. Recall And Cross-media Coverage

추천 결과 수가 적을 때 Provider candidate scarcity와 retrieval recall failure를 분리합니다.

- `provider-scarcity`: 요청한 Provider page와 필요한 Detail 판정을 완료했지만 정확 후보 자체가 목표보다 적음
- `retrieval-recall-failure`: Provider에는 후보가 있지만 page, type reservation, source ordering, Detail allocation, dedupe 또는 early stop 때문에 놓침
- `detail-budget-unresolved`: Provider-combined 후보가 남았지만 제한된 Detail 예산 안에서 semantic 판정을 완료하지 못함
- `not-provided`: Provider가 total/page 진단을 주지 않았거나 판정에 필요한 값이 없음. 0으로 대체하지 않음

필수 Audit:

1. `providerTotalResultsByTask`, `fetchedPagesByTask`, stage/source별 raw candidate를 기록합니다.
2. Detail 전후 exact/semantic 수와 Detail 선택·skip 이유를 기록합니다.
3. 복수 타입은 raw, available exact, selected exact를 타입별로 비교합니다.
4. 선택 타입의 exact pool이 있는데 최종 0개이면 MAJOR입니다.
5. Cross-media Seed 후보는 Seed identity와 transferable genre evidence를 모두 가져야 합니다.
6. SF/Fantasy처럼 같은 Provider ID를 공유하는 specialized filter는 두 결과군의 overlap과 고유 결과를 함께 검사합니다.
7. 낮은 점수 중복이 높은 점수 후보를 제거하지 않는지 확인합니다.
8. 결과 수를 위해 Country, Content Type, OTT, Runtime 또는 semantic 기준을 숨겨서 완화하지 않습니다.

Fixed Fixture는 QA 기대값을 읽어 후보를 생성하지 않습니다. Provider response와 candidate metadata를 고정하고 Product classification, scoring, dedupe, type reservation 함수를 실제로 실행합니다. Live QA는 같은 Product Provider 경로를 사용하며 Fixture PASS로 대체하지 않습니다.

---

## 8. Stop-The-Line Rule

다음 문제가 열려 있으면 Overall PASS를 선언하지 않습니다.

### CRITICAL

- 선택한 Hard Filter를 위반한 Primary 결과
- 잘못된 콘텐츠 타입 또는 OTT 표시
- 오래된 요청이 최신 결과를 덮음
- Mock/TMDB 혼합
- 개인 Browser Origin 접근 또는 Secret 노출
- 반복 API 500 또는 Data corruption

### MAJOR

- 카드, Detail, Related의 조건/이유 불일치
- 현재 작품의 Related 재출현
- Runtime/OTT UI와 실제 metadata 불일치
- Draft/Submitted 변경 안내 실패
- 요청 중 UI 고착
- 핵심 모바일 조작 불가
- Console, Hydration 또는 unhandled rejection 오류

CRITICAL 또는 MAJOR가 발견되면 실패 Test와 인접 회귀를 수정 후 다시 실행합니다.

---

## 9. Fix And Rerun

수정 후 다음 증거를 새로 생성합니다.

1. 실패한 Test
2. 같은 Module의 Boundary Test
3. 인접 기능 Test
4. 전체 Unit
5. Deterministic QA
6. 필요한 Live QA
7. Browser Scenario
8. Final Commit 기준 Smoke

수정 전 결과를 최종 증거로 재사용하지 않습니다.

---

## 10. Browser Security Boundary

### Preferred Browser

1. Codex In-App Browser
2. 로그인하지 않은 `MyOTT QA` 전용 Chrome Profile

개인 기본 Chrome Profile, 개인 탭, Gmail, Drive, 금융/결제, SNS, Password Manager, Token/API Key 화면은 사용하지 않습니다.

### Allowed Origin

- 공식 QA Origin: `http://127.0.0.1:3000`
- `http://localhost:3000`: 연결 진단에만 사용

다른 Origin, Cookie, 개인 Session, Browser Profile 파일, 불필요한 Local Storage에는 접근하지 않습니다. 다른 탭을 조작하거나 Browser Process를 강제 종료하지 않습니다.

### Full CDP

Full CDP는 MyOTT Local Origin의 DOM, Console, Network, Performance, Request timing과 response status에만 사용합니다. CDP 사용 전 대상 Origin을 밝히고 사용자 승인을 받습니다.

금지:

- 다른 Origin의 Cookie 또는 Session 읽기
- Password, Token, API Key 추출
- 개인 데이터 전송
- 승인되지 않은 다른 탭 조작

---

## 11. Browser Launcher Preflight

Browser QA 전에 다음을 확인합니다.

1. Founder Preview `RUNNING_MANAGED`
2. In-App Browser 새 Session
3. `http://127.0.0.1:3000` 접속
4. Page title과 Root DOM
5. Console 접근
6. Network/CDP capability와 승인 상태

실패하면 오류 메시지, 단계, 관련 asset path, App 오류인지 Launcher 오류인지를 구분해 기록하고 Clean In-App Session으로 한 번 재시도합니다. 가능하면 `MyOTT QA` 전용 Chrome Profile만 사용합니다.

설치 파일, Browser asset, 무작위 npm automation dependency를 임의로 수정하지 않습니다. Browser를 사용할 수 없으면 Browser QA는 `BLOCKED`, Task는 `PARTIAL`입니다.

---

## 12. Official QA URL

일반 기능과 사용자 흐름은 반드시 다음 URL에서 검사합니다.

`http://127.0.0.1:3000/`

`?qa=1`은 Development-only Diagnostics입니다. Codex가 내부 판정 근거를 확인할 때만 사용하며 Founder 공식 QA URL로 사용하지 않습니다. TMDB ID, Semantic Mode, Request Budget 같은 기술 metadata 검사는 Codex 책임입니다.

---

## 13. Browser QA Evidence Contract

Browser Test마다 다음을 기록합니다.

- Test ID, Commit, URL, Viewport
- 시작 상태와 조작 순서
- Expected, Actual, Result
- Request ID, endpoint, parameters, response status
- Result count
- Console errors와 Network errors
- Screenshot path와 Notes

Evidence 임시 경로:

`%TEMP%\myott-founder-preview\browser-qa\<commit>\<test-id>\`

Screenshot과 Raw Network dump는 Repository에 Commit하지 않습니다. Secret과 개인정보가 없는 요약만 canonical 문서에 기록합니다.

---

## 14. Mandatory Browser Matrix

| Test ID | Scenario | Core Expected |
| --- | --- | --- |
| `BROWSER-DEFAULT-001` | 신규 `/` 진입 | OTT 미선택, 자동 추천 요청 없음, Console 0 |
| `BROWSER-OTT-001` | OTT 미선택 + 드라마/액션 | Provider parameter와 Applied OTT 조건 없음 |
| `BROWSER-OTT-002` | Netflix 선택 | ID 8, KR, Streaming match, unknown/mismatch 0 |
| `BROWSER-OTT-003` | Netflix + Disney+ | OR, 각 결과가 하나 이상 일치 |
| `BROWSER-RUNTIME-001` | 2시간 이하 | 60분 이하도 match, 120분 초과/unknown 0 |
| `BROWSER-RUNTIME-002` | 긴 작품 (2시간 이상) | 120분 미만/unknown 0 |
| `BROWSER-APPLE-001` | Apple TV+ | 350은 Apple TV+, 2는 Store, rent/buy-only 제외 |
| `BROWSER-STATE-001` | 제출 후 Draft 변경 | Card/Detail/Related/Applied는 Submitted 유지, Dirty banner, 자동 요청 없음 |
| `BROWSER-STATE-002` | 요청 중 Reset | Abort, Session/Detail/결과 없음, OTT 기본값 없음 |
| `BROWSER-TYPE-001` | 영화 + 애니메이션 스타일 | Provider movie 100%, TV 0 |
| `BROWSER-TYPE-002` | 드라마 + 애니메이션 스타일 | Provider tv 100%, Movie 0 |
| `BROWSER-TYPE-003` | 애니 콘텐츠 타입 | Movie/TV Animation 허용, 실사 0 |
| `BROWSER-RECALL-001` | 드라마 + 모험 | 정확 모험 8개 이상 또는 Provider scarcity 증거, genre relaxation 0 |
| `BROWSER-TAXONOMY-001` | 일본 + SF + 드라마 | SF specialized evidence 80% 이상 |
| `BROWSER-TAXONOMY-002` | 일본 + 판타지 + 드라마 | Fantasy specialized evidence 80% 이상, SF 결과와 과도한 중복 없음 |
| `BROWSER-COUNTRY-001` | 영국 + 전쟁 + 드라마 | GB/TV hard constraint, 전쟁 evidence |
| `BROWSER-COUNTRY-002` | 영국 + 정치 + 드라마 | GB/TV hard constraint, 정치 evidence |
| `BROWSER-COUNTRY-003` | 미국 + 공포 + 드라마 | US/TV hard constraint, Mystery-only false positive 0 |
| `BROWSER-BALANCE-001` | Interstellar + 영화 + 드라마 | 관련 Movie/TV exact pool이 있으면 두 타입 모두 표시 |
| `BROWSER-BALANCE-002` | Interstellar + 영화 + 드라마 + 애니 | 사용 가능한 세 타입의 coverage와 Seed 연관성 유지 |
| `BROWSER-RELATED-001` | 대표 Movie 상세 | 현재 ID/한국어 제목/원제/내부 중복 0 |
| `BROWSER-RELATED-002` | 후속편 | 현재 작품 제외, 다른 ID 후속편 유지 |
| `BROWSER-RACE-001` | 빠른 반복 조작 | 최신 Session 하나, 중복 commit/API 폭주/고착 0 |
| `BROWSER-RACE-002` | Recommendation 응답 역전 | 최신 B만 반영, stale A commit 0 |
| `BROWSER-RACE-003` | Detail/Related 응답 역전 | 현재 Detail의 Related만 표시 |

CDP interception을 사용할 수 없으면 Unit Race Test는 별도 PASS 가능하지만 Browser Race는 `BLOCKED`입니다.

---

## 15. Responsive And Keyboard

필수 Viewport:

- Desktop: 1440 x 900
- Tablet: 768 x 1024
- Mobile: 390 x 844

각 화면에서 OTT, 콘텐츠 타입, Quick Pick, Applied Conditions, Dirty Banner, Card, Detail, Related, button overflow를 확인합니다. 일반 URL에는 Diagnostics가 없어야 합니다.

Keyboard:

- Tab으로 모든 입력과 버튼 접근
- Space로 checkbox 조작
- Enter로 추천 실행
- Escape로 Quick Pick과 Detail 닫기
- Focus가 화면 밖으로 사라지지 않음

Trusted Keyboard Input을 Codex Browser가 지원하지 않으면 DOM synthetic event로 대체하지 않고 `BLOCKED`로 기록합니다. Founder는 다음 수동 절차로 별도 승인할 수 있습니다.

`FOUNDER-KEYBOARD-001`:

1. Tab 순방향 이동
2. Shift+Tab 역방향 이동
3. Space로 checkbox 선택
4. Enter로 추천 실행
5. Escape로 Quick Pick 닫기
6. Escape로 Detail 닫기
7. Focus indicator 확인

승인 기록은 `PASS — Founder manual verification`으로 남깁니다.

---

## 16. Repeatability

다음 핵심 Scenario는 최소 3회 반복합니다.

- Default OTT 없음
- 드라마 + 액션
- 영화 + 애니메이션 스타일
- 드라마 + 애니메이션 스타일
- Runtime Medium
- Related current exclusion

Result count, Provider, fallback, Console, Network, duplicate, stale response와 intermittent failure를 기록합니다. Correctness 위반이 한 번이라도 발생하면 FAIL입니다.

---

## 17. Codex Self-Review

Test 전과 Commit 전 Diff를 읽고 다음을 확인합니다.

1. 요구하지 않은 파일 변경 여부
2. Server/Client 공통 계약 여부
3. Default가 Hard Filter를 몰래 활성화하는지
4. Unknown metadata가 Hard Constraint를 통과하는지
5. Provider ID보다 label이 우선하는지
6. Error/Reset path에 이전 Session이 남는지
7. 진행 중 요청이 Reset에서 Abort되는지
8. Production에 QA 정보가 노출되는지
9. Country/Genre/Request Budget 계약이 유지되는지
10. Test가 구현 결과를 복사해 기대값으로 만드는지

---

## 18. Final Commit Rule

Browser QA와 핵심 Smoke는 최종 Commit을 대상으로 다시 실행합니다. Commit 전 Browser 결과만으로 최종 Browser PASS를 선언하지 않습니다.

Task 완료 보고에는 Unit, Deterministic, Live, Browser, Founder 상태를 분리하고, 실행하지 못한 Layer를 명시합니다.

---

## 19. Task Prompt Contract

모든 MyOTT Codex Task Prompt는 최소 다음 항목을 명시합니다.

```text
Codex QA Contract

Required QA Layers:
Browser Required:
Browser Security Boundary:
Evidence Required:
Adversarial Cases:
Regression Cases:
Stop-The-Line Conditions:
Founder Review Required:
PASS Prohibition:
Final Commit Rerun:
```

표준 PASS 금지 문구:

```text
No Evidence, No PASS.
HTTP 200 is not Browser PASS.
Unit PASS is not Live PASS.
Live API PASS is not Browser PASS.
Codex PASS is not Founder PASS.
Unavailable Browser Automation must be reported as BLOCKED, not PASS.
```
---

## 20. Range And Partition Coverage

숫자 범위 옵션은 일부 대표값만 검사하지 않고 지원 Domain 전체의 합집합과 교집합을 검증합니다.

필수 규칙:

- 각 옵션의 UI label과 실제 `min`/`max` bound가 일치해야 합니다.
- `이하`, `미만`, `이상`, `초과`의 포함 관계를 경계값 테스트로 고정합니다.
- 전체 Domain의 합집합에서 빠지는 의도하지 않은 gap은 `MAJOR`입니다.
- 둘 이상의 옵션이 겹치는 구간은 사용자 intent와 함께 명시적으로 문서화합니다.
- 의도하지 않은 overlap은 실패이며, single-select UI라도 계약 오류를 숨기지 않습니다.
- Coverage 테스트는 구현의 현재 `min`/`max`를 그대로 복사해 기대값을 생성하지 않습니다.

Runtime Domain `1~300분`의 현재 의도:

- `1~60`: `runtime-short` + `runtime-medium`
- `61~119`: `runtime-medium`
- `120`: `runtime-medium` + `runtime-long`
- `121~300`: `runtime-long`
- uncovered runtime: 0
- unintended overlap: 0
