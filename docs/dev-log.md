# Development Log

개발 과정에서의 작업 내용, 결정, 아쉬운 점, 다음 개선 사항을 날짜별로 기록합니다.

## 2026-07-10 - MYOTT-S09-005

### 오늘 작업

- `app/page.jsx`의 `sortProviderResults` ranking 단계에 Weight Engine을 연결했습니다.
- 모든 provider result에 `scoreDetail`을 추가하고 `finalScore` 기준으로 우선 정렬하도록 했습니다.
- 기존 분석 점수는 `legacyScore`로 유지해 기존 정렬 감각과 fallback 흐름이 급격히 흔들리지 않게 했습니다.
- 입력 seed titles, selected content types, Quick Pick filters, TMDB genre ids를 Weight Engine preferences로 전달했습니다.
- runtime signal이 동작하도록 정규화 결과에 `runtimeMinutes`를 보존했습니다.

### 결정한 것

- UI에는 아직 score 숫자를 노출하지 않는다.
- Recommendation Reason / Insight 문구는 이번 Task에서 변경하지 않는다.
- content type hard filter와 country/fallback 정책은 기존 흐름을 유지한다.
- Weight Engine 적용은 ranking 단계에 한정하고 Provider/API 구조는 변경하지 않는다.

### 검증

- `pnpm build`: PASS
- `pnpm dev`: PASS
- `git diff --check`: PASS

### 아쉬운 점

- 아직 scoreDetail을 Founder QA 화면이나 자동 runner로 직접 확인하는 도구는 없습니다.

### 다음 개선

- Recommendation QA Dataset 기준으로 `scoreDetail` 분포와 pass/fail을 함께 확인하는 smoke runner를 추가합니다.

## 2026-07-09 - MYOTT-S09-004

### 오늘 작업

- Recommendation Weight Engine 기반 파일을 추가했습니다.
- `recommendationWeights.js`에서 초기 Weight와 penalty 값을 분리했습니다.
- `recommendationWeightEngine.js`에서 `calculateRecommendationScore`와 `rankRecommendationsByWeight` 순수 함수를 작성했습니다.
- title, genre, country, content type, mood, runtime, rating, popularity, diversity signal을 normalized score로 계산하도록 했습니다.
- Architecture 문서에 현재 구현 위치와 기존 추천 흐름에 대규모 적용하지 않는 경계를 기록했습니다.

### 결정한 것

- Content Type은 점수 가산 대상이 아니라 hard filter로 유지한다.
- country fallback과 relaxed fallback은 추천 근거를 투명하게 설명할 수 있도록 penalty에 남긴다.
- runtime metadata가 없을 때는 추천을 크게 망가뜨리지 않도록 약한 unknown penalty만 적용한다.
- 이번 Task에서는 UI/API를 바꾸지 않고 안전한 유틸리티 기반만 추가한다.

### 검증

- Weight Engine sample import: PASS
- Signal / penalty sample calculation: PASS
- `pnpm build`: PASS
- `git diff --check`: PASS

### 아쉬운 점

- 아직 기존 Recommendation Flow에는 대규모로 연결하지 않았습니다. 다음 단계에서 작은 경로부터 점진 연결이 필요합니다.

### 다음 개선

- QA Dataset Evaluator와 Weight Engine을 함께 사용하는 smoke runner를 만들고, Founder QA 기준으로 weight 조정 루프를 시작합니다.

## 2026-07-08 - MYOTT-S09-003

### 오늘 작업

- Recommendation QA Dataset을 실제 추천 결과 배열과 비교할 수 있는 평가 유틸리티를 추가했습니다.
- `evaluateRecommendationCase(testCase, recommendationResults)` 순수 함수로 pass/fail, score, matchedCount, totalCount, matchRatio, failedReasons를 반환하도록 했습니다.
- country, contentType, genreAny, runtime min/max 조건을 우선 지원했습니다.
- Dataset의 `failIf` 조건을 사람이 이해할 수 있는 failed reason으로 변환하도록 했습니다.
- `evaluateRecommendationCases` helper를 추가해 여러 케이스 평가로 확장 가능하게 했습니다.

### 결정한 것

- 평가 함수는 API 호출을 하지 않는다.
- Dataset 읽기, API 호출, runner 실행은 다음 단계로 분리한다.
- 이번 유틸리티는 case와 결과 배열만 받아 같은 입력이면 같은 결과를 반환하는 순수 함수로 유지한다.

### 검증

- Evaluator module import: PASS
- Dataset sample compatibility: PASS
- `pnpm build`: PASS
- `git diff --check`: PASS

### 아쉬운 점

- 아직 자동 테스트 runner는 없습니다. 이번 Task는 평가 로직까지만 연결합니다.

### 다음 개선

- Sprint 10에서 dataset runner를 추가해 `/api/recommend/options`와 `/api/search` 결과를 자동 평가합니다.

## 2026-07-08 - MYOTT-S09-002

### 오늘 작업

- Recommendation QA Dataset을 JSON 자산으로 생성했습니다.
- 총 12개 케이스를 작성하고, Sprint 8에서 발견된 country, runtime, data source, fallback, multi-seed regression을 반영했습니다.
- 각 케이스에 `input`, `expected`, `minimumMatchRatio`, `priority`, `scope`를 포함해 향후 자동 테스트로 변환하기 쉽게 구성했습니다.
- `RECOMMENDATION_ARCHITECTURE.md`의 Test Strategy에서 dataset 파일을 canonical dataset으로 연결했습니다.

### 결정한 것

- Architecture 문서는 전략을 설명하고, 실제 QA 케이스 목록은 JSON dataset에서 관리한다.
- Mock/Fallback 전용 케이스와 TMDB 실데이터 케이스는 `scope`로 구분한다.
- expected 값은 모호한 문장보다 ratio, topN, failIf 조건을 우선 사용한다.

### 검증

- JSON 유효성 확인: PASS
- Architecture link 확인: PASS
- `git diff --check`: PASS

### 아쉬운 점

- 아직 자동 테스트 runner는 없습니다. 이번 Task는 QA dataset 자산 생성이 범위입니다.

### 다음 개선

- Sprint 10에서 `recommendation-qa-dataset.json`을 읽어 API smoke를 실행하는 script를 검토합니다.

## 2026-07-08 - MYOTT-S09-001

### 오늘 작업

- Sprint 9 Recommendation Engine 설계를 시작했습니다.
- 새 문서 `docs/project/RECOMMENDATION_ARCHITECTURE.md`를 생성했습니다.
- Recommendation Flow를 User Input → Search → Feature Extraction → Signal Calculation → Weight → Score → Ranking → Fallback → Recommendation으로 정의했습니다.
- Feature와 Signal을 분리하고, 초기 Weight와 Sprint별 Recommendation Score 지표를 작성했습니다.
- Fallback Strategy와 QA Dataset을 Sprint 10 구현 기준으로 정리했습니다.

### 결정한 것

- Recommendation Engine은 더 많은 결과가 아니라 첫 번째 선택 품질을 높이는 구조로 설계한다.
- Score는 사용자에게 숫자로 노출하지 않고 Reason / Insight / Trust Signal로 설명한다.
- Weight는 Founder QA 결과에 따라 지속적으로 조정한다.
- Content Type은 hard filter로 유지하고, Country는 선택 조건일 때 우선 hard filter로 처리한다.

### 검증

- Markdown 구조 확인: PASS
- Architecture Check: PASS
- Global Ready Check: PASS

### 아쉬운 점

- 아직 구현 모듈은 분리하지 않았습니다. 이번 Task는 설계 문서화가 범위입니다.

### 다음 개선

- Sprint 10에서 Feature Extraction, Signal Calculation, Weight Configuration을 코드 구조로 분리합니다.

## 2026-07-06 - MYOTT-S08-BUG-007

### 오늘 작업

- country option 전달 경로를 UI → `/api/search` / `/api/recommend/options` → TMDB Provider → Mock fallback → UI scoring 순서로 점검했습니다.
- 옵션 추천 discover의 fallback 순서를 country 유지 우선으로 바꿨습니다.
- TMDB discover 결과에 `origin_country` hard check를 추가했습니다.
- 작품 입력 검색 경로에도 Quick Pick filters를 전달해 국가 옵션이 search recommendation에도 반영되도록 했습니다.
- TMDB search recommendation은 선택 국가 결과를 먼저 모으고, 부족할 때만 relaxed fallback 결과를 보강합니다.
- Mock Provider도 country-first progressive fallback을 사용하도록 맞췄습니다.
- relaxed fallback 결과가 strict 결과보다 위로 올라오지 않도록 UI scoring penalty를 추가했습니다.

### 결정한 것

- content type은 계속 hard filter로 유지한다.
- country는 genre보다 먼저 유지한다.
- country 결과가 부족한 경우에만 country 조건을 완화하고, 이때 `조건을 조금 넓혀 함께 추천합니다.` 안내를 유지한다.
- Mock fallback도 TMDB와 같은 country-first 정책을 따른다.

### 검증

- `pnpm build`: PASS
- `pnpm dev`: PASS
- `git diff --check`: PASS
- Codex 환경 smoke에서 fallback path 기준 한국 + 드라마, 일본 + SF 응답을 확인했습니다.

### 아쉬운 점

- TMDB 실제 결과 품질은 Founder 로컬 key 환경에서 최종 확인해야 합니다.

### 다음 개선

- 국가 옵션이 복수 선택될 때의 정책을 별도 Product Rule로 정리할지 검토합니다.

## 2026-07-06 - MYOTT-S08-BUG-006

### 오늘 작업

- 추천 데이터 흐름을 UI submit → `/api/search` / `/api/recommend/options` → Provider → UI source display 순서로 점검했습니다.
- API 응답에 `dataSource`, `fallbackUsed`, `fallbackReason`을 추가해 TMDB / Fallback / Empty를 명확히 구분했습니다.
- UI에서 provider 결과가 비면 로컬 `dummyRecommendations`를 자동으로 채우던 경로를 제거했습니다.
- multi-input 검색에서 TMDB 결과가 하나라도 있으면 Mock fallback 결과를 함께 섞지 않도록 분리했습니다.
- API가 명시적으로 fallback을 반환한 경우에만 Mock 결과를 화면에 표시합니다.
- 개발 환경 console에서 추천 응답의 source integrity 정보를 확인할 수 있게 로그를 추가했습니다.

### 결정한 것

- `dataSource: "tmdb"`: 실제 TMDB 결과만 표시한다.
- `dataSource: "fallback"`: 명시적 Mock fallback이며 `fallbackUsed: true`여야 한다.
- `dataSource: "empty"`: 결과가 없는 정상 상태이며 Mock으로 자동 보강하지 않는다.
- UI badge는 결과 데이터와 같은 source truth를 사용한다.

### 검증

- `pnpm build`: PASS
- `pnpm dev`: PASS
- `git diff --check`: PASS
- Codex 환경에서는 TMDB 외부 fetch가 실패할 수 있어 fallback path 중심으로 smoke 확인했습니다.

### 아쉬운 점

- Founder 로컬 TMDB key 환경에서 TMDB success와 TMDB empty를 별도로 QA해야 합니다.

### 다음 개선

- API response contract를 별도 문서 또는 provider guide에 정리하는 것을 검토합니다.

## 2026-07-06 - MYOTT-S08-BUG-005

### 오늘 작업

- Detail Layer에서 Related Picks가 기존 추천 결과를 fallback으로 즉시 보여주는 경로를 제거했습니다.
- `relatedStatus`를 추가해 Related Picks를 `idle` / `loading` / `success` / `empty` / `error`로 분리했습니다.
- `selectedDetail` 변경 시 `relatedItems`를 즉시 비우고 loading 상태를 먼저 표시하도록 정리했습니다.
- Related API 응답 후에만 실제 Related Picks 카드를 렌더링합니다.
- loading 상태에서는 카드와 같은 높이의 skeleton strip을 표시해 하단 영역이 크게 흔들리지 않도록 했습니다.
- empty/error 상태는 Related 카드가 아닌 안내 문구로 처리합니다.

### 결정한 것

- Related Picks는 현재 상세 작품 기준의 데이터가 준비되기 전까지 어떤 카드도 보여주지 않는다.
- 기존 추천 결과 목록은 Related API 실패 시 UI 카드 fallback으로 재사용하지 않는다.
- Related click/drag/arrow interaction은 success 상태에서만 활성화한다.

### 검증

- `pnpm build`: PASS
- `pnpm dev`: PASS
- `git diff --check`: PASS

### 아쉬운 점

- 실제 네트워크 지연에서 skeleton 체감은 Founder 로컬 브라우저 QA로 최종 확인이 필요합니다.

### 다음 개선

- Related API의 평균 응답 시간이 길어지면 skeleton 표시 시간과 문구를 다시 다듬습니다.

## 2026-07-06 - MYOTT-S08-BUG-004

### 오늘 작업

- 추천 카드/상세 레이어의 OTT 표시 경로를 다시 추적했습니다.
- TMDB 목록형 응답에는 watch provider가 기본 포함되지 않아, 최종 노출 결과만 detail endpoint의 `append_to_response=watch/providers`로 보강하도록 수정했습니다.
- 실제 provider가 없는 결과는 계속 `OTT 정보 확인 필요`로 표시합니다.
- 선택한 OTT 필터는 scoring hint로만 사용하고, provider display truth source로 사용하지 않는 원칙을 유지했습니다.
- 추천 카드 안의 `신뢰 단서 보기` 보조 CTA를 제거했습니다.
- `상세 확인` fallback을 `정보 확인 필요`로 바꿔 비동작 요소처럼 보이는 문구를 줄였습니다.
- Related Picks 카드의 제목/설명 줄 수와 카드 높이를 다시 맞췄습니다.

### 결정한 것

- 카드와 상세 레이어의 OTT 표시는 `actualProviders`가 있을 때만 신뢰 가능한 제공처로 본다.
- selected OTT option은 추천 점수에는 영향을 줄 수 있지만 실제 제공처 표시에는 절대 사용하지 않는다.
- Related Picks는 drag/click/arrow 동작은 유지하고, 텍스트 clamp와 높이만 조정한다.

### 검증

- `pnpm build`: PASS
- `pnpm dev`: PASS
- `git diff --check`: PASS
- Codex 환경에서는 TMDB 외부 fetch가 sandbox/TLS 환경에 영향을 받을 수 있어 실제 provider 노출은 Founder 로컬 TMDB 환경에서 최종 확인이 필요합니다.

### 아쉬운 점

- TMDB watch provider 데이터는 region과 콘텐츠별 품질 편차가 있어 모든 결과에서 provider가 나오지는 않습니다.

### 다음 개선

- OTT provider data quality를 별도 QA 케이스로 분리합니다.
- OTT deep link는 실제 provider path와 region 정책이 안정화된 뒤 연결합니다.

## 2026-07-05 - MYOTT-S08-BUG-003

### 오늘 작업

- runtime option 전달 경로를 UI → API → TMDB discover → Provider normalization → scoring → UI Insight까지 추적했습니다.
- TMDB discover에서 runtime option을 `with_runtime.lte` / `with_runtime.gte`로 전달하도록 수정했습니다.
- runtime scoring을 일반 option tag match보다 강하게 분리했습니다.
- runtime 조건이 맞는 결과에는 Recommendation Insight로 러닝타임 조건 반영 문구를 표시합니다.
- Mock fallback에서도 runtime filter가 genre/country fallback 단계와 함께 풀리지 않도록 유지했습니다.
- 긴 작품 Mock QA 샘플을 보강했습니다.

### 결정한 것

- `runtime-short`: 60분 이하
- `runtime-medium`: 120분 이하
- `runtime-long`: 140분 이상
- genre/country는 결과 부족 시 완화할 수 있지만 runtime은 사용자의 시간 제약이므로 fallback에서도 유지합니다.

### 검증

- `runtime-short`: Mock fallback 기준 7개, 23~60분 결과.
- `runtime-long`: Mock fallback 기준 3개, 164~169분 결과.
- `pnpm build`: PASS
- `git diff --check`: PASS

### 아쉬운 점

- TMDB의 TV runtime 데이터는 작품별 episode runtime 품질에 영향을 받을 수 있습니다.
- Founder 로컬에서 실제 TMDB 결과가 runtime 조건에 얼마나 안정적으로 반응하는지 추가 확인이 필요합니다.

### 다음 개선

- 런타임 조건이 강한 경우 결과 수와 품질의 균형을 Founder QA 기준으로 점검합니다.
- 필요하면 runtime 조건을 hard filter와 scoring hint 중 어떤 수준으로 유지할지 제품 정책을 문서화합니다.

## 2026-07-05 - MYOTT-S08-BUG-002

### 오늘 작업

- 강한 옵션 조합에서 결과가 1~2개로 끝나는 문제를 해결하기 위해 progressive fallback을 추가했습니다.
- TMDB discover는 content type request를 유지한 채 genre/country 조건만 단계적으로 완화합니다.
- Mock Provider도 동일한 fallback 단계로 정리해 TMDB 실패 환경에서도 같은 UX를 제공합니다.
- fallback 보강 결과에는 `fallbackRelaxed` 신호를 붙이고, UI에서는 실제 신호가 있을 때만 조건 완화 Insight를 표시합니다.
- Mock QA 샘플에 드라마/애니 콘텐츠를 보강해 narrow filter smoke에서 타입별 결과가 너무 적게 보이지 않도록 했습니다.

### 결정한 것

- Content type은 hard filter입니다.
- Genre와 country는 결과 부족 시 soft fallback 대상입니다.
- OTT option은 provider truth source가 아니며, 결과 확보 단계에서 hard filter로 취급하지 않습니다.
- fallback 안내는 점수가 아니라 사용자가 이해할 수 있는 짧은 문구로만 표시합니다.

### 검증

- `drama + country-jp + genre-sf-fantasy`: Mock fallback 기준 6개, type `drama` 유지.
- `movie + country-jp + genre-sf-fantasy`: Mock fallback 기준 4개, type `movie` 유지.
- `animation + country-jp + genre-sf-fantasy`: Mock fallback 기준 3개, type `animation` 유지.

### 아쉬운 점

- Codex 환경에서는 TMDB 실제 fetch가 mock fallback으로 내려갈 수 있어 실제 TMDB 결과 품질은 Founder 로컬에서 확인해야 합니다.
- 장르/국가 fallback의 완화 정도가 사용자에게 얼마나 자연스러운지는 추가 Founder QA가 필요합니다.

### 다음 개선

- 실제 TMDB 환경에서 narrow filter fallback 단계별 결과 품질을 확인합니다.
- 조건 완화가 발생한 결과를 카드/상세 중 어디까지 설명할지 UX 기준을 더 다듬습니다.

## 2026-07-05 - MYOTT-S08-BUG-001B

### 오늘 작업

- Founder Local QA에서 BUG-001의 Related Picks click 문제가 계속 재현된 것을 기준으로 interaction 경로를 다시 추적했습니다.
- Related strip의 `pointer capture` 사용을 제거하고 desktop mouse drag로 분리했습니다.
- drag threshold 이후에만 click을 suppress하고, 일반 card click은 button의 `onClick`이 바로 `openDetail`을 호출하도록 유지했습니다.
- Related card 내부 thumbnail/title/small 요소가 click target을 가로막지 않도록 카드 내부 pointer events를 정리했습니다.
- drag 중 context menu처럼 보이는 오동작을 줄이기 위해 context menu guard를 추가했습니다.
- selected OTT option과 actual provider 표시가 섞이지 않도록 `safeOttPlatforms` 기준을 유지했습니다.

### 원인

- 이전 BUG-001 수정은 ref 기반 suppress를 도입했지만, strip에서 `setPointerCapture`를 계속 사용했습니다.
- 실제 브라우저에서는 pointer capture가 button click target과 React click 흐름을 흔들 수 있어 Related Pick 단순 click이 막히는 증상이 남을 수 있습니다.
- DOM event target이 card 내부 이미지/텍스트로 들어갈 때 클릭 영역 판단이 더 불안정해질 수 있었습니다.

### 결정한 것

- Related Picks의 desktop drag는 mouse event로 처리합니다.
- Mobile swipe와 trackpad 이동은 native horizontal scroll을 우선합니다.
- card click은 button 자체의 click target을 기준으로 처리합니다.
- selected OTT는 provider display fallback으로 절대 사용하지 않습니다.

### 아쉬운 점

- Codex 환경에서는 실제 Founder 브라우저의 pointer/click 체감을 완전히 재현하기 어렵습니다.
- 실제 watch provider 데이터는 TMDB region과 detail payload 품질에 따라 달라집니다.

### 다음 개선

- Founder Local QA에서 Related click/drag/swipe를 재확인합니다.
- 실제 OTT provider 표시를 고도화할 때는 selected option과 actual provider 모델을 별도 필드로 계속 유지합니다.

## 2026-07-05 - MYOTT-S08-BUG-001

### 오늘 작업

- Related Picks drag/click 상태를 ref 기반으로 정리했습니다.
- drag distance threshold를 적용해 실제 drag 후 발생하는 click만 억제했습니다.
- 일반 Related Pick click은 기존 `openDetail` 흐름을 그대로 사용해 상세 전환과 related reload가 이어지도록 했습니다.
- Related 카드 제목 3줄 clamp와 카드 높이를 다시 맞춰 긴 제목에서도 클릭 영역과 레이아웃이 안정적으로 유지되도록 했습니다.
- 선택한 OTT option label을 실제 provider처럼 카드에 표시하던 로직을 제거했습니다.
- 실제 provider 데이터가 없는 TMDB 결과는 `OTT 정보 확인 필요`로 표시하도록 안전한 fallback을 적용했습니다.

### 결정한 것

- OTT option은 recommendation scoring/filter hint입니다.
- 카드의 OTT 표시는 실제 작품 provider 데이터가 있을 때만 사용합니다.
- selected OTT와 actual provider는 같은 label을 쓰더라도 다른 데이터로 취급합니다.
- Related Picks interaction은 drag 상태를 DOM dataset에 남기지 않고 명확한 interaction state로 관리합니다.

### 아쉬운 점

- Codex 환경에서는 TMDB 외부 fetch가 제한될 수 있어 실제 provider 데이터 품질은 Founder 로컬에서 확인해야 합니다.
- TMDB watch provider를 카드에 정확히 표시하려면 지역별 provider detail 연결 정책이 별도 Task로 필요합니다.

### 다음 개선

- 실제 watch provider detail API를 어느 시점에 카드/상세에 연결할지 정책을 정리합니다.
- Related Picks drag/swipe의 모바일 체감은 Founder 기기에서 추가 확인합니다.

## 2026-07-04 - MYOTT-S08-T10F

### 오늘 작업

- TMDB discover 요청을 콘텐츠 타입별 request unit으로 분리했습니다.
- Movie/TV/Animation 후보를 먼저 섞어 가져온 뒤 score로 제거하던 여지를 줄이고, 후보 수집 단계에서 타입을 보장했습니다.
- TV 스릴러용 genre mapping을 보강해 영국 드라마 추천 경로가 더 자연스럽게 동작하도록 했습니다.
- 서버와 클라이언트 양쪽에 content diversity 보정을 추가했습니다.
- Related Picks 클릭이 stale drag flag 때문에 막힐 수 있는 문제를 수정했습니다.
- Related 카드 텍스트 표시를 제목 3줄, 보조 문구 1줄 기준으로 안정화했습니다.
- 장르 metadata 정렬과 SF/SF·판타지 label을 정리했습니다.
- OTT filter 표시와 fallback mock QA 데이터를 보강했습니다.

### 결정한 것

- 콘텐츠 타입은 국가/장르/OTT보다 우선합니다.
- Animation은 명시 선택된 경우에만 animation discover path를 사용합니다.
- TV Thriller는 TMDB TV 장르 체계에 맞춰 Crime/Mystery/Drama 계열로 해석합니다.
- Related Picks click은 기존 `openDetail` 흐름을 재사용해 상세 전환과 related reload를 같은 패턴으로 처리합니다.

### 아쉬운 점

- Codex 환경에서는 TMDB 외부 fetch가 mock fallback으로 동작해 실제 TMDB 순위는 Founder 로컬에서 확인해야 합니다.
- TMDB watch provider id는 지역별 노출 품질 차이가 있어 실제 제공처 검증은 별도 QA가 필요합니다.

### 다음 개선

- Founder 로컬에서 TV + UK + Thriller가 Sherlock/Broadchurch/Luther/Bodyguard 계열로 나오는지 확인합니다.
- 실제 TMDB 결과에서 content diversity가 과하지 않은지, 또는 타입별 fallback 정책이 필요한지 점검합니다.

## 2026-07-04 - MYOTT-S08-T10E

### 오늘 작업

- 콘텐츠 타입 선택을 TMDB discover/search 후보 수집 단계에 더 강하게 전달했습니다.
- 드라마/영화 선택 시 animation genre 결과가 상단을 지배하지 않도록 서버 필터와 클라이언트 감산을 함께 적용했습니다.
- Mock fallback에서 `series` 타입을 드라마 선택과 호환되게 처리했습니다.
- Related Picks 카드 높이와 텍스트 clamp를 다시 조정해 제목과 보조 문구가 각각 2줄까지 보이도록 했습니다.
- build와 3001 dev smoke로 타입별 option recommendation 경로를 확인했습니다.

### 결정한 것

- 콘텐츠 타입 우선순위는 국가/장르보다 높게 둡니다.
- 전체 타입이 선택된 기본 상태에서는 특정 타입 보너스를 주지 않고, 타입을 좁힌 경우에만 match 보너스와 mismatch penalty를 적용합니다.
- 국가 옵션은 제작 국가 힌트로 유지하되, 콘텐츠 타입을 뒤집을 만큼 강하게 적용하지 않습니다.

### 아쉬운 점

- Codex 환경에서는 TMDB 외부 fetch가 mock fallback으로 떨어져 실제 일본 드라마/영화/애니 분포는 Founder 로컬에서 확인해야 합니다.
- 타입 후보가 너무 부족한 상황에서 mismatch를 얼마나 허용할지는 아직 명확한 제품 정책이 필요합니다.

### 다음 개선

- Founder QA 결과를 바탕으로 타입별 fallback 허용 기준을 정합니다.
- 실제 TMDB 결과에서 국가/장르/타입 간 우선순위가 자연스러운지 더 많은 케이스로 확인합니다.

## 2026-07-04 - MYOTT-S08-T10D

### 오늘 작업

- Related Picks 카드 제목을 2줄 clamp로 제한하고 카드 높이를 고정했습니다.
- 보조 추천 문구를 한 줄 말줄임 처리해 카드 레이아웃이 흔들리지 않게 했습니다.
- 콘텐츠 타입 판정을 내부 value와 TMDB genre id 기준으로 정리했습니다.
- 기본 전체 선택 상태에서 animation genre가 discover 요청에 과하게 붙지 않도록 수정했습니다.
- 영화/드라마/애니 option recommendation route smoke test를 수행했습니다.

### 결정한 것

- animation genre 강제는 애니만 단독 선택했을 때만 적용합니다.
- 전체 선택 상태에서는 movie/tv 경로를 모두 사용하되 특정 타입을 강제 필터링하지 않습니다.
- 옵션 검색어는 추천 query로 사용하지 않고 선택된 option value만 recommendation request에 전달합니다.

### 아쉬운 점

- Codex 환경에서는 TMDB 실제 응답이 fallback될 수 있어 Founder 로컬에서 타입별 실제 결과 품질 확인이 필요합니다.
- 타입 mix는 현재 hard filter보다 우선순위 보정에 가깝고, 더 정교한 mix policy는 후속으로 분리하는 편이 안전합니다.

### 다음 개선

- Founder 환경에서 드라마만 선택했을 때 TV 결과가 충분히 우선되는지 확인합니다.
- 전체 선택 상태에서 영화/드라마/애니 비율이 자연스러운지 실제 데이터로 점검합니다.

## 2026-07-04 - MYOTT-S08-T10C

### 오늘 작업

- Related Picks strip에 mouse drag scroll을 추가했습니다.
- Quick Pick 검색창에 `×` clear button과 ESC 초기화를 추가했습니다.
- 장르 전용 expand/collapse를 모든 option group에 적용 가능한 공통 rule로 변경했습니다.
- 국가 option group도 기본 8개 표시 후 더보기/접기를 지원하도록 했습니다.
- 검색 placeholder와 option group visual polish를 다듬었습니다.

### 결정한 것

- 8개 이하 option group은 모두 표시하고, 9개 이상은 대표 8개와 더보기/접기를 사용합니다.
- 검색 중에는 expand 상태와 무관하게 전체 option을 label 기준으로 검색합니다.
- Related Picks는 drag/swipe/trackpad를 기본 UX로 두고, 화살표는 보조 이동 수단으로 유지합니다.

### 아쉬운 점

- Codex in-app browser가 로컬 포트 접근에 실패하는 경우가 있어 실제 drag 체감은 Founder 로컬 확인이 필요합니다.
- 대표 option 8개의 정렬 기준은 현재 metadata 순서를 따르며, 추후 product 기준으로 조정할 수 있습니다.

### 다음 개선

- Founder 테스트에서 drag 감도와 chip 제거 동작을 확인합니다.
- 배우/감독/언어 option group이 추가될 때 동일 expand rule이 자연스럽게 적용되는지 재확인합니다.

## 2026-07-04 - MYOTT-S08-T10B

### 오늘 작업

- 현재 상세 작품 기준 Related Picks API를 추가했습니다.
- TMDB recommendations/similar 우선, Mock/current results fallback 구조로 related 탐색을 정리했습니다.
- Related Picks에 좌우 이동 버튼과 가로 scroll snap을 추가했습니다.
- Quick Pick 장르 더보기/접기와 선택 필터 chip을 추가했습니다.
- 국가 옵션을 대표 글로벌 국가로 확장했습니다.

### 결정한 것

- Recommendation Engine scoring weight는 변경하지 않고 탐색 UX만 개선합니다.
- Related Picks는 현재 작품 id 기반을 우선하되, TMDB 실패 시 앱이 비어 보이지 않도록 fallback을 유지합니다.
- 옵션 검색은 더보기 상태와 무관하게 전체 label을 대상으로 유지합니다.

### 아쉬운 점

- Codex 환경에서는 TMDB TLS 제약 때문에 실제 recommendations/similar 성공 경로는 Founder 로컬 확인이 필요합니다.
- 국가 옵션은 아직 제작 국가/discover 힌트이며, OTT 제공 국가 필터와는 다릅니다.

### 다음 개선

- Founder 환경에서 Related Pick 클릭 후 새 작품 기준으로 related가 갱신되는지 확인합니다.
- 국가/OTT/언어 옵션의 의미를 사용자에게 어떻게 설명할지 후속 UX에서 정리합니다.

## 2026-07-04 - MYOTT-S08-T10A

### 오늘 작업

- Quick Pick 옵션 검색을 추가했습니다.
- 옵션 그룹을 장르/국가/분위기/러닝타임 4영역 Grid로 재구성했습니다.
- TMDB 장르 label을 chip에 맞는 한국어 표시명으로 정리했습니다.
- 옵션만 선택했을 때도 Provider 기반 추천 경로를 타도록 option recommendation API를 추가했습니다.
- Related Picks를 Detail Layer 바깥 독립 strip으로 분리했습니다.

### 결정한 것

- 옵션 검색은 display label 기준으로 수행하고, scoring/discover에는 value와 TMDB genre id/country code를 사용합니다.
- option-only 추천은 TMDB가 가능하면 discover를 사용하고, 실패하면 Mock Provider fallback을 유지합니다.
- Related Picks는 새 API 호출 없이 현재 결과 배열을 재사용합니다.

### 아쉬운 점

- 국가 옵션은 아직 정확한 OTT 제공처 필터가 아니라 제작 국가 기반 힌트에 가깝습니다.
- Codex 환경에서는 TMDB TLS 제약으로 실제 TMDB discover 성공 경로를 Founder 로컬에서 최종 확인해야 합니다.

### 다음 개선

- Founder 환경에서 `SF`, `미` 검색과 일본/미국 옵션 추천 품질을 확인합니다.
- 옵션 수가 더 늘어나면 group별 접기/고정 영역이 필요한지 검토합니다.

## 2026-07-04 - MYOTT-S08-T10

### 오늘 작업

- 추천 결과 상태를 idle/loading/success/empty/error로 분리했습니다.
- loading 중에는 empty 문구가 보이지 않도록 했습니다.
- Detail Layer 하단에 현재 결과 목록 기반 Related Picks를 추가했습니다.
- `/api/options` metadata를 Quick Pick UI에 연결했습니다.
- TMDB genre metadata와 국가 option value가 scoring에 반영되도록 정리했습니다.

### 결정한 것

- Related Picks는 새 API 호출 없이 현재 결과 배열을 재사용합니다.
- 국가 옵션은 정확 필터가 아니라 현재 데이터 품질에 맞춘 score 보정으로만 사용합니다.
- 기존 OTT 선택, 콘텐츠 종류 선택, Provider Registry, API route는 유지합니다.

### 아쉬운 점

- Codex 환경에서는 TMDB TLS 제한 때문에 실제 TMDB 장르 metadata 성공 UI를 확인하기 어렵습니다.
- 국가 옵션은 콘텐츠 제작 국가와 제공처/사용자 지역이 섞일 수 있어 정확 필터로 표현하지 않습니다.

### 다음 개선

- Founder 환경에서 Quick Pick 장르/국가 옵션 노출과 Related Picks 터치 사용성을 확인합니다.
- 국가/언어/제공처 필터의 정확한 의미를 별도 UX 문구로 정리합니다.

## 2026-07-04 - MYOTT-S08-T09A

### 오늘 작업

- seed 기반 추천 이유 문구에 ko-KR `을/를` 조사 helper를 추가했습니다.
- seed 제목 끝의 마침표, 공백, 특수문자를 표시 문구 전에 정리했습니다.
- multi-seed 결과에서 공통 결과를 우선하고, 단일 seed 결과는 seed별 라운드로빈으로 분산되도록 보정했습니다.
- 자동완성 debounce를 150ms로 줄이고, 동일 query 결과를 브라우저 메모리에 cache하도록 했습니다.

### 결정한 것

- 한국어 조사는 표시 문구 레벨에서만 처리하고 scoring과 분리합니다.
- multi-seed 공통 결과는 특정 seed 문구보다 `여러 취향을 함께 반영한 추천` 흐름을 유지합니다.
- 자동완성 cache는 API/Provider 변경 없이 클라이언트 메모리에서만 처리합니다.

### 아쉬운 점

- Codex 환경에서는 TMDB 실제 후보 표시 속도와 9개 seed 실제 분포를 완전히 확인하기 어렵습니다.
- 한국어 조사 helper는 ko-KR 표시 문구용이며, 전체 i18n은 아직 도입하지 않았습니다.

### 다음 개선

- Founder 환경에서 `태조 왕건`, `너의 이름은.`, `라라랜드` 문구를 직접 확인합니다.
- 9개 입력 테스트 후 seed diversity 가중치가 과하거나 약한지 조정합니다.

## 2026-07-03 - MYOTT-S08-T09

### 오늘 작업

- 추천 submit 시 현재 입력값 전체를 다시 수집하도록 했습니다.
- Provider 추천 요청에서 seed 3개 제한을 제거해 동적 입력창 4개 이상도 반영되도록 했습니다.
- 추천 결과 목표 수를 12개로 늘리고, TMDB recommendation 수집 한도도 12개로 조정했습니다.
- OTT 선택값과 콘텐츠 종류 선택값을 score와 Recommendation Insight에 반영했습니다.
- 개발 포트 정책을 `3000` Founder, `3001` Codex로 문서화했습니다.

### 결정한 것

- OTT 선택은 현재 정확한 제공처 필터가 아니라 우선순위 보정으로만 사용합니다.
- 콘텐츠 종류는 결과 배제보다 score 가산 방식으로 반영해 데이터 부족 상황에서도 fallback을 유지합니다.
- Codex 환경의 TMDB 실패는 `UNABLE_TO_VERIFY_LEAF_SIGNATURE` TLS 인증서 검증 문제로 기록합니다.

### 아쉬운 점

- Codex 환경에서는 TMDB HTTPS 인증서 체인을 신뢰하지 못해 실제 TMDB 성공 경로를 확인하지 못했습니다.
- `NODE_TLS_REJECT_UNAUTHORIZED=0` 같은 해결은 보안상 코드나 운영 규칙에 적용하지 않습니다.
- 정확한 OTT 제공처 필터는 TMDB watch provider 데이터 품질과 지역별 차이를 더 확인해야 합니다.

### 다음 개선

- Founder 환경에서 TMDB 실제 응답 기준으로 작품 4~5 추가 후 결과 변경을 확인합니다.
- Codex 환경에서 필요한 경우 신뢰 가능한 CA bundle을 `NODE_EXTRA_CA_CERTS`로 제공하는 방식을 검토합니다.
- OTT deep link와 정확한 제공처 필터는 별도 Sprint로 분리합니다.

## 2026-07-03 - MYOTT-S08-T08

### 오늘 작업

- Recommendation Engine v1의 scoring 근거를 Detail Layer에서 이해 가능한 Insight로 표시했습니다.
- score는 숨기고, 실제 계산에 사용한 signal만 최대 3개의 짧은 bullet로 변환했습니다.
- Recommendation Reason 아래, Trust Signal 위에 Insight를 배치해 시선 흐름을 유지했습니다.
- Insight가 없는 결과는 영역 자체가 렌더링되지 않도록 했습니다.

### 결정한 것

- “있어 보이는 이유”는 만들지 않습니다.
- 사용자 수, 시청자 수, 인기 순위처럼 실제 데이터가 없는 근거는 표시하지 않습니다.
- 문구는 scoring logic과 분리해 향후 i18n 적용이 쉬운 구조로 둡니다.

### 아쉬운 점

- Codex 환경에서는 TMDB 실제 결과 기반의 Insight 품질을 끝까지 확인하기 어렵습니다.
- 사용자 기반 추천 근거는 아직 데이터가 없어 표시하지 않습니다.

### 다음 개선

- Founder Review에서 Insight 문장이 너무 길거나 반복적으로 느껴지는지 확인합니다.
- 실제 사용자 데이터가 생기면 사용자 기반 신뢰 근거를 별도 설계합니다.

## 2026-07-03 - MYOTT-S08-T07

### 오늘 작업

- multi-seed 추천 결과를 병합한 뒤 rule-based score로 정렬하는 레이어를 추가했습니다.
- 동일 결과가 여러 seed에서 반복될 때 seed count와 reason seed를 병합하도록 했습니다.
- TMDB `genreIds`, seed `genreIds`, popularity를 Provider 결과에 보존했습니다.
- Quick Pick과 콘텐츠 타입 선택이 score에 반영되도록 했습니다.

### 결정한 것

- 이번 Task는 AI/ML이 아니라 설명 가능한 추천 엔진 1.0의 첫 단계로 둡니다.
- 한국어 장르명만 보지 않고 TMDB genre id 기반 scoring도 함께 사용합니다.
- Decision Card와 Detail Layer UI는 변경하지 않습니다.

### 아쉬운 점

- Codex 환경에서는 TMDB 외부 fetch가 제한될 수 있어 실제 추천 품질은 Founder 환경 확인이 필요합니다.
- 점수 가중치는 아직 Founder Review 전의 초안입니다.

### 다음 개선

- 실제 결과를 보며 seed 반복, genre overlap, Quick Pick 가중치를 조정합니다.
- confirmed seed metadata를 추천 요청에 더 직접적으로 활용할지 검토합니다.

## 2026-07-03 - MYOTT-S08-T06A

### 오늘 작업

- 자동완성 후보창의 닫힘 동작을 정리했습니다.
- 외부 클릭, ESC, 추천받기 submit, 입력창 focus 전환 시 후보창이 닫히도록 했습니다.
- 후보창 닫힘과 입력값 유지를 분리해 사용자가 직접 입력한 텍스트는 보존했습니다.
- 후보 클릭 입력은 내부 confirmed seed 상태로 구분할 수 있게 했습니다.

### 결정한 것

- `/api/suggest`와 Provider 구조는 변경하지 않습니다.
- 자동완성 UX는 추천 submit 흐름을 바꾸지 않고 입력 보조 역할로만 유지합니다.
- 후보창 닫힘은 공통 함수로 처리해 상태 관리가 흩어지지 않게 합니다.

### 아쉬운 점

- confirmed seed 상태는 아직 추천 품질 계산에 사용하지 않습니다.
- 모바일 실제 기기에서 outside click과 후보 클릭의 체감은 Founder Review가 필요합니다.

### 다음 개선

- 선택된 seed와 직접 입력 seed의 추천 품질 차이를 관찰합니다.
- 필요하면 Sprint 8 후속 Task에서 confirmed seed metadata를 추천 요청에 활용하는 방식을 검토합니다.

## 2026-07-03 - MYOTT-S08-T06

### 오늘 작업

- TMDB Search 기반 `/api/suggest?q=` route를 추가했습니다.
- 작품 입력창에 300ms debounce 자동완성을 붙였습니다.
- 입력창별 후보 상태를 분리해 여러 입력창이 독립적으로 동작하도록 했습니다.
- 후보 클릭 시 정확한 TMDB 제목이 입력되고 후보 목록이 닫히도록 했습니다.

### 결정한 것

- 자동완성은 현재 추천 흐름을 바꾸지 않고 seed 입력 품질만 보강합니다.
- TMDB 실패 시 후보를 숨기고 앱은 정상 동작하도록 합니다.
- 새 UI는 입력창 하단 후보 목록으로 제한하고 대규모 리팩토링은 하지 않습니다.

### 아쉬운 점

- Codex 환경에서는 TMDB 외부 fetch가 제한되어 실제 후보 품질은 Founder 환경에서 확인해야 합니다.
- `인터스탤` 같은 오타 보정은 TMDB Search 결과 품질에 의존합니다.

### 다음 개선

- Founder Review 후 fuzzy matching 또는 최근 선택 seed 저장이 필요한지 판단합니다.
- 모바일에서 후보 터치 영역이 충분한지 실제 기기로 확인합니다.

## 2026-07-03 - MYOTT-S08-T05

### 오늘 작업

- TMDB movie/tv 장르 metadata를 가져오는 기반을 추가했습니다.
- 장르 metadata를 기존 추천옵션 UI에 연결 가능한 legacy option 배열과 상세 metadata로 함께 정규화했습니다.
- 국가/언어 옵션은 TMDB 기반 확장을 고려해 fallback metadata로 준비했습니다.
- `/api/options` route를 추가해 metadata fetch 성공/실패 경로를 확인할 수 있게 했습니다.

### 결정한 것

- 이번 Task에서는 Quick Pick UI를 크게 바꾸지 않습니다.
- metadata 로직은 `page.jsx`가 아니라 provider option metadata 모듈과 API route로 분리합니다.
- TMDB fetch 실패 시 기존 fallback 옵션을 유지합니다.

### 아쉬운 점

- 아직 TMDB metadata가 실제 추천 점수 계산에 직접 사용되지는 않습니다.
- Codex 환경에서는 TMDB 외부 fetch가 제한될 수 있어 실제 TMDB metadata 성공 경로는 Founder 환경 확인이 필요합니다.

### 다음 개선

- 입력 작품 3개와 Quick Pick 옵션의 공통 장르/국가/언어를 추출해 추천 점수에 반영하는 Task를 설계합니다.
- TMDB metadata 중 어떤 옵션을 사용자에게 노출할지 UX 기준을 정합니다.

## 2026-07-03 - MYOTT-S08-T04

### 오늘 작업

- TMDB 단순 검색 결과 대신 seed 기반 recommendations/similar 결과를 사용하도록 Provider 경로를 개선했습니다.
- 입력값으로 seed 작품을 먼저 찾고, 해당 TMDB id로 recommendations를 조회하도록 했습니다.
- recommendations가 부족하면 similar 결과를 fallback으로 사용하도록 했습니다.
- seed 원본 제외, multi-input 병합, 중복 제거, Mock fallback 구조는 유지했습니다.

### 결정한 것

- `/api/search` route 이름과 Provider Registry 구조는 유지합니다.
- TMDB Provider의 `search()`는 현재 MyOTT 추천 흐름 안에서는 seed recommendation entrypoint로 동작합니다.
- Hero Recommendation은 이번 Task에서 실제 데이터로 연결하지 않습니다.

### 아쉬운 점

- Codex 환경에서는 TMDB 외부 fetch가 제한되어 실제 recommendations 성공 경로는 Founder 환경에서 확인해야 합니다.
- TMDB 추천 품질은 TMDB 데이터 자체에 의존합니다.
- OTT 제공처 직접 이동은 이번 범위에서 제외했습니다.

### 다음 개선

- recommendations와 similar의 혼합 비율을 실제 Founder Review 결과로 조정합니다.
- Hero Recommendation 실제 데이터 연결 여부는 별도 Sprint에서 판단합니다.

## 2026-07-03 - MYOTT-S08-T03

### 오늘 작업

- 여러 입력 작품의 TMDB 결과를 각각 가져와 중복 제거 후 8개까지 섞어 보여주도록 개선했습니다.
- 첫 번째 입력값 결과가 전체 추천을 독점하지 않도록 라운드로빈 병합을 적용했습니다.
- 입력 작품 원본은 seed/preference로만 사용하고 추천 결과에서 제외하도록 보강했습니다.
- `reasonSeed`를 사용해 추천 이유가 입력값을 줄줄이 나열하지 않도록 정리했습니다.
- Quick Pick 옵션은 정렬과 추천 이유 문구에만 가볍게 반영했습니다.
- 카드 상단에는 backdrop 이미지를 우선 사용하고, 상세 Layer에는 poster/backdrop fallback을 유지했습니다.

### 결정한 것

- TMDB recommendation API 확장은 이번 Task에서 하지 않습니다.
- Provider Registry와 Mock fallback 구조는 유지합니다.
- 입력값과 동일한 원본 작품은 추천 결과에서 보여주지 않습니다.
- Hero Recommendation은 이번 Task에서 직접 수정하지 않고 Mock 고정 Known Issue로 남깁니다.

### 아쉬운 점

- 검색 결과 병합 기반이라 아직 진짜 유사작 추천은 아닙니다.
- TMDB recommendations/similar API는 Next Step으로 남깁니다.
- Codex 환경에서는 TMDB 외부 fetch가 제한되어 실제 multi-input TMDB 화면은 Founder 환경에서 확인해야 합니다.

### 다음 개선

- 다음 단계에서 TMDB recommendation/detail 확장 또는 별도 추천 endpoint 사용 여부를 검토합니다.
- Hero Recommendation을 실제 데이터와 연결할지, MVP에서는 Mock 큐레이션으로 유지할지 결정합니다.

## 2026-07-03 - MYOTT-S08-T02

### 오늘 작업

- TMDB 검색 결과를 MyOTT 카드/상세 데이터 형태에 더 안정적으로 맞췄습니다.
- 포스터 URL을 유지하고 기존 poster 영역 안에서 실제 이미지를 렌더링하도록 보강했습니다.
- 제목 관련도와 평점, 포스터 존재 여부를 반영해 검색 결과 정렬을 개선했습니다.
- `genre_ids` fallback을 추가해 장르 데이터가 비어 보이는 상황을 줄였습니다.

### 결정한 것

- Decision Card와 Detail Layer의 정보 구조는 유지합니다.
- TMDB API key는 계속 환경변수만 사용합니다.
- OTT Deep Link, AI 추천, DB, Supabase는 이번 Task에 포함하지 않습니다.

### 아쉬운 점

- 현재 Codex 샌드박스에서는 TMDB 외부 fetch가 제한되어 실제 TMDB 성공 화면은 Founder 환경 확인이 필요합니다.
- TMDB 이미지 로딩 품질은 실제 네트워크 상태에 따라 Founder 브라우저에서 최종 확인해야 합니다.

### 다음 개선

- 다양한 검색어에서 원작/리메이크/시리즈 결과 순서가 자연스러운지 샘플 검증합니다.
- 포스터 비율이 다른 결과가 모바일 카드에서 어색하지 않은지 확인합니다.

## 2026-07-03 - MYOTT-S08-T01B

### 오늘 작업

- `/api/search` 응답의 `results` 배열이 추천 카드 상태로 직접 반영되도록 프론트 바인딩을 보강했습니다.
- 같은 검색 응답에서 Provider dev 표시 상태를 갱신하도록 정리했습니다.
- TMDB 결과가 있을 때 타입 필터 때문에 더미 추천으로 밀려나는 상황을 줄였습니다.

### 결정한 것

- Provider/API/TMDB Provider/Mock Provider는 수정하지 않습니다.
- Hero Recommendation은 Sprint 8 T01B 범위에서 제외합니다.
- Decision Card와 Detail Layer UI 구조는 유지하고 데이터 연결만 수정합니다.

### 아쉬운 점

- 브라우저 자동화는 현재 환경 권한 문제로 제한될 수 있습니다.
- 실제 TMDB 성공 경로의 최종 화면 일치 여부는 Founder 브라우저 확인이 가장 정확합니다.

### 다음 개선

- 실제 TMDB 결과의 포스터 이미지 표시 여부는 별도 UI Task에서 판단합니다.
- Provider 결과의 콘텐츠 타입/장르 매핑 품질을 실제 검색어 몇 개로 더 확인합니다.

## 2026-07-03 - MYOTT-S08-T01

### 오늘 작업

- 작품 입력 기반 추천 실행 시 `/api/search`의 Provider 결과를 우선 사용하도록 연결했습니다.
- TMDB/Mock Provider 응답을 기존 Decision Card와 Detail Layer 데이터 형태로 맞췄습니다.
- 검색 실패, 빈 결과, TMDB 오류 상황에서는 기존 Mock 추천 결과로 돌아가도록 유지했습니다.
- README, PROJECT_STATUS, TASK_HISTORY, CHANGELOG, dev-log를 Sprint 8 기준으로 업데이트했습니다.

### 결정한 것

- Decision Card UI와 Detail Layer UI는 변경하지 않습니다.
- Provider Registry, TMDB Provider, Mock Provider 구조는 유지합니다.
- Quick Pick만 선택한 경우에는 기존 Mock 추천 흐름을 유지하고, 작품 입력이 있을 때만 Provider 검색 결과를 사용합니다.

### 아쉬운 점

- 실제 TMDB 포스터 이미지는 현재 카드 UI 구조를 바꾸지 않기 위해 텍스트 썸네일로 유지했습니다.
- TMDB 실제 성공 경로는 유효한 `.env.local` 키와 네트워크 상태에 따라 추가 확인이 필요합니다.

### 다음 개선

- 실제 데이터에서 러닝타임, OTT 제공처, 평점이 비어 있을 때의 표시 품질을 Founder Review로 확인합니다.
- 이후 Sprint에서 필요하면 포스터 이미지 렌더링을 별도 UI Task로 검토합니다.

## 2026-07-03 - MYOTT-S07-T03

### 오늘 작업

- Recommendation Card CTA 문구를 Trust 흐름에 맞게 조정했습니다.
- Detail Layer에서 Recommendation Reason, Trust Signal, 줄거리의 간격과 강조 수준을 다듬었습니다.
- 실제 이동 기능 없이 OTT 확인 정보를 하단에 정리했습니다.
- README, PROJECT_STATUS, TASK_HISTORY, CHANGELOG, dev-log를 T03 기준으로 업데이트했습니다.

### 결정한 것

- 이번 Task는 새 기능이 아니라 Recommendation Trust polish로 제한합니다.
- 실제 OTT 이동 링크는 추가하지 않습니다.
- Provider, API, TMDB, Mock Provider, 추천 알고리즘은 수정하지 않습니다.

### 아쉬운 점

- 실제 OTT 이동 버튼은 아직 구현하지 않았습니다.
- Founder Review에서 `신뢰 단서 보기` 문구가 충분히 자연스러운지 확인해야 합니다.

### 다음 개선

- Founder가 카드에서 상세까지 막힘 없이 이동하는지 확인합니다.
- 실제 OTT 링크/제공처 데이터는 별도 Sprint에서 정책과 함께 검토합니다.

## 2026-07-03 - MYOTT-S07-T02

### 오늘 작업

- Recommendation Confidence 영역을 Trust Signal 구조로 정리했습니다.
- 신뢰 단서를 향후 실제 데이터로 교체 가능한 슬롯 형태로 바꿨습니다.
- Recommendation Reason 아래에 보조 정보로 유지해 정보 우선순위를 지켰습니다.

### 결정한 것

- Trust Signal은 실제 수치가 아니라 현재 작품 정보에서 읽을 수 있는 정성적 단서만 보여줍니다.
- Provider, API, TMDB, Mock Provider, 추천 알고리즘은 수정하지 않습니다.

### 아쉬운 점

- 아직 실제 TMDB 평점이나 사용자 데이터가 연결된 신뢰 정보는 아닙니다.
- Founder Review에서 문구가 충분히 신뢰감을 주는지 확인해야 합니다.

### 다음 개선

- 실제 데이터 연결 시 각 Trust Signal 슬롯의 우선순위를 다시 정합니다.
- 과장 없이 선택을 돕는 Trust Signal 문구를 계속 다듬습니다.

## 2026-07-02 - MYOTT-S07-T01

### 오늘 작업

- 상세 Layer에 Recommendation Confidence 영역을 추가했습니다.
- 추천 이유 아래에 정성적 신뢰 단서를 chip 형태로 표시했습니다.
- 실제 랭킹, 사용자 수, 인기 수치처럼 사실로 오해될 수 있는 문구는 제외했습니다.
- README, PROJECT_STATUS, TASK_HISTORY, CHANGELOG, dev-log를 Sprint 7 기준으로 업데이트했습니다.

### 결정한 것

- Recommendation Confidence는 추천 이유를 대체하지 않고 보조 정보로 둡니다.
- 현재는 Mock 기반 UI foundation만 구현합니다.
- Confidence 문구는 `입력한 취향`, `장르`, `분위기`, `평점 확인 가능`처럼 검증 가능한 수준의 표현으로 제한합니다.
- Provider Registry, API Route, TMDB Provider, Mock Provider, 추천 알고리즘은 수정하지 않습니다.

### 아쉬운 점

- Confidence chip은 아직 실제 데이터 기반 신뢰 점수가 아닙니다.
- Founder Review를 통해 표현이 과장되어 보이지 않는지 확인해야 합니다.
- 향후 실제 TMDB/사용자 데이터가 연결될 때 정보 우선순위를 다시 점검해야 합니다.

### 다음 개선

- Founder가 상세 Layer에서 추천을 더 믿을 수 있다고 느끼는지 확인합니다.
- 실제 데이터로 오해될 수 있는 문구가 없는지 검토합니다.
- Sprint 7 후속 Task에서 Confidence 정보와 실제 Provider 데이터를 연결할지 판단합니다.

## 2026-07-02 - MYOTT-S06-T05

### 오늘 작업

- 추천 카드가 클릭 가능한 결정 카드라는 점을 더 명확히 하기 위해 `상세 보기` 힌트를 추가했습니다.
- 카드 내부 배치를 정리해 추천 이유, 제목, 핵심 정보, 상세 보기 힌트가 안정적으로 읽히게 했습니다.
- 상세 Layer에서 추천 이유를 줄거리보다 먼저 배치했습니다.
- 상세 Layer의 추천 이유를 카드의 추천 이유와 같은 시각 언어로 강조했습니다.
- README, PROJECT_STATUS, TASK_HISTORY, CHANGELOG, dev-log를 T05 기준으로 업데이트했습니다.

### 결정한 것

- 이번 Task는 Sprint 6의 최종 UX polish이며 새 기능은 추가하지 않습니다.
- 카드 클릭 자체는 기존 동작을 유지하고, 시각적 affordance만 보강합니다.
- 상세 Layer에서는 사용자의 결정을 돕는 `추천 이유`를 먼저 보여주고, 줄거리는 그 다음에 제공합니다.
- Provider Registry, API Route, TMDB Provider, Mock Provider는 수정하지 않습니다.

### 아쉬운 점

- 실제 사용자가 `상세 보기` 힌트를 얼마나 빠르게 인지하는지는 Founder Review가 필요합니다.
- 모바일 viewport는 실제 기기 또는 브라우저 폭 조절로 추가 확인하면 더 정확합니다.
- 추천 이유는 아직 규칙 기반 문구라 실제 데이터/AI 연동 이후 다시 다듬어야 합니다.

### 다음 개선

- Founder가 첫 방문 기준으로 추천부터 상세까지 막히는 지점이 없는지 확인합니다.
- Sprint 6 회고에서 Decision Experience가 MVP Ready 상태인지 판단합니다.
- 다음 Sprint에서는 Provider 검색 결과와 화면 추천 경험을 연결할지 결정합니다.

## 2026-07-02 - MYOTT-S06-T04

### 오늘 작업

- Hero Recommendation에서 입력 영역으로 이어지는 안내 문구를 더 자연스럽게 정리했습니다.
- 입력 영역의 제목과 설명을 Hero 이후의 후속 행동처럼 보이도록 다듬었습니다.
- 결과 Empty State에서 내부 개발 표현을 제거하고 사용자 관점의 안내로 변경했습니다.
- Decision Card의 높이, 배지, 제목 줄바꿈, 핵심 정보 영역이 흔들리지 않도록 CSS를 정리했습니다.
- 모바일 화면에서 Hero, 입력, 추천 카드가 더 안정적으로 쌓이도록 여백을 조정했습니다.

### 결정한 것

- 이번 Task는 기능 추가가 아니라 MVP 마감 작업으로 제한합니다.
- Provider Registry, API Route, TMDB Provider, Mock Provider는 수정하지 않습니다.
- 화면에 새 버튼이나 새 추천 기능을 추가하지 않고, 기존 UI가 더 명확하게 읽히도록만 개선합니다.
- 사용자에게 보이는 문구에서는 `더미 데이터` 같은 내부 구현 표현을 줄입니다.

### 아쉬운 점

- 실제 선택 시간이 줄었는지는 Founder가 직접 10초/30초 기준으로 확인해야 합니다.
- 모바일 기기별 세부 체감은 실제 디바이스에서 추가 확인할 필요가 있습니다.
- 추천 결과는 아직 Provider 검색 결과와 직접 연결되지 않은 상태입니다.

### 다음 개선

- Founder Review로 첫 화면의 정돈감과 흐름 이해도를 확인합니다.
- Recommendation Experience와 Provider 검색 결과를 언제 연결할지 Sprint 6 후속 범위로 결정합니다.
- MVP 이후에는 실제 데이터 기반 추천 문구와 카드 정보 밀도를 다시 검토합니다.

## 2026-07-02 - MYOTT-S06-T03

### 오늘 작업

- Hero Recommendation의 카드 제목을 사용자 관점의 문구로 다듬었습니다.
- 추천 이유를 짧고 바로 이해되는 문장으로 정리했습니다.
- Hero 영역 아래에 입력 추천으로 이어지는 안내 문구를 추가했습니다.
- 추천 버튼 문구를 `내 취향으로 추천받기`로 변경했습니다.
- Hero 카드 간격, 제목 크기, 텍스트 밀도를 조정했습니다.

### 결정한 것

- 이번 Task는 새 기능을 추가하지 않고 첫 화면의 이해 흐름만 다듬습니다.
- Hero 카드는 계속 3개만 유지합니다.
- 새로운 버튼, API, Provider, 추천 알고리즘은 추가하지 않습니다.
- Hero Recommendation은 입력을 대체하는 기능이 아니라 입력 전 첫 성공 경험을 만드는 영역으로 둡니다.

### 아쉬운 점

- 실제 사용자가 5~10초 안에 목적을 이해하는지는 Founder Review와 직접 사용 검증이 필요합니다.
- 문구는 더 많은 사용자 피드백을 받아 계속 다듬을 여지가 있습니다.
- Hero 추천은 아직 실제 Provider 검색 결과나 개인화와 연결되어 있지 않습니다.

### 다음 개선

- Founder가 첫 화면에서 덜 망설이는지 확인합니다.
- Hero Recommendation을 본 뒤 입력으로 자연스럽게 이어지는지 검증합니다.
- Sprint 6 후속 Task에서 Provider 검색 결과와 Recommendation Experience의 연결 방식을 정합니다.

## 2026-07-02 - MYOTT-S06-T02

### 오늘 작업

- 메인 화면 최상단에 Hero Recommendation 영역을 추가했습니다.
- 입력하지 않아도 `오늘의 추천`, `지금 인기 작품`, `지금 시간대 추천` 3개를 바로 볼 수 있게 했습니다.
- Hero Recommendation은 기존 Decision Card 컴포넌트를 재사용하도록 구성했습니다.
- 시간대 추천은 현재 시간 기준의 임시 로직으로 선택되도록 했습니다.
- README, PROJECT_STATUS, TASK_HISTORY, CHANGELOG, dev-log를 업데이트했습니다.

### 결정한 것

- Hero Recommendation은 새로운 추천 시스템이 아니라 기존 Decision Card를 첫 경험으로 재배치하는 UI 작업으로 봅니다.
- Hero 카드는 최대 3개만 제공합니다.
- 기존 입력 기반 추천 흐름, Quick Pick, Detail Layer, Reset UX는 유지합니다.
- Provider Registry, API Route, TMDB Provider, Mock Provider는 수정하지 않습니다.

### 아쉬운 점

- Hero Recommendation은 아직 개인화나 실제 Provider 검색 결과 기반이 아닙니다.
- 시간대 추천은 임시 로직이며 사용자 맥락, 날씨, 요일 등은 반영하지 않습니다.
- 모바일 최적화는 기존 반응형 구조 안에서만 처리했고 별도 고도화는 하지 않았습니다.

### 다음 개선

- Founder Review에서 첫 화면만 보고 서비스 목적을 이해하는지 확인합니다.
- 30초 안에 첫 추천 선택 경험이 생기는지 Time Validation을 진행합니다.
- Sprint 6 후속 Task에서 Provider 검색 결과와 Hero Recommendation의 연결 시점을 검토합니다.

## 2026-07-02 - MYOTT-S06-T01

### 오늘 작업

- 추천 결과 카드를 Decision Card MVP로 재구성했습니다.
- 추천 이유를 카드 상단에 배치해 사용자가 먼저 “왜 추천됐는지” 이해할 수 있게 했습니다.
- 카드에는 포스터, 제목, 추천 이유, 장르, 러닝타임, 평점, OTT Provider만 남겼습니다.
- 기존 상세 Layer, Quick Pick, Dynamic Input, Reset UX는 유지했습니다.
- README, PROJECT_STATUS, TASK_HISTORY, CHANGELOG, dev-log를 Sprint 6 기준으로 업데이트했습니다.

### 결정한 것

- 이번 Task는 UI/UX 개선에 집중하고 Provider Registry, API Route, TMDB Provider, Mock Provider는 수정하지 않습니다.
- 감독과 배우 정보는 결정 카드에서는 제거하되 상세 Layer에서는 확인할 수 있게 유지합니다.
- 추천 이유 문구는 현재 더미 데이터와 입력값을 바탕으로 임시 문장으로 구성합니다.
- Decision Card는 향후 Hero Recommendation에서도 재사용할 수 있도록 컴포넌트로 분리합니다.

### 아쉬운 점

- 추천 이유는 아직 AI가 생성한 문장이 아니라 규칙 기반 임시 문구입니다.
- Time Validation은 Founder가 직접 사용하면서 체감 시간을 확인해야 합니다.
- 메인 추천 결과는 아직 Provider 검색 결과와 직접 연결되어 있지 않습니다.

### 다음 개선

- Founder Review에서 10초 안에 추천 이유가 이해되는지 확인합니다.
- 30초 안에 첫 선택 경험이 생기는지 Time Validation을 진행합니다.
- Sprint 6 후속 Task에서 Provider 검색 결과와 Decision Card 연결 여부를 검토합니다.

## 2026-07-02 - MYOTT-S05-T06

### 오늘 작업

- 개발 환경에서만 보이는 Provider Status Indicator를 추가했습니다.
- `/api/search` 응답의 `providerId`, `providerName`, `tmdbEnabled`, `message`를 이용해 현재 data source와 fallback 여부를 표시했습니다.
- 추천 실행 시 Provider 상태를 다시 확인하도록 연결했습니다.
- PROJECT_STATUS에 Sprint 5 Retrospective를 작성했습니다.
- README, TASK_HISTORY, CHANGELOG, dev-log를 Sprint 5 완료 상태로 업데이트했습니다.

### 결정한 것

- Provider Registry, TMDB Provider, Mock Provider, API route 구조는 수정하지 않습니다.
- Provider Badge는 개발 편의 기능이므로 `development` 환경에서만 표시합니다.
- Fallback 여부는 `providerId`가 `mock`이고 `tmdbEnabled`가 `true`인 경우로 판단합니다.
- 메인 추천 결과는 기존 더미 UX를 유지하고, Provider 상태 확인만 API 메타와 연결합니다.

### 아쉬운 점

- 현재 로컬 환경에는 `.env.local`이 없어 실제 TMDB 성공 경로는 확인하지 못했습니다.
- TMDB fallback은 invalid key 경로로 검증할 수 있지만, 실제 TMDB 응답은 Founder 환경에서 추가 확인이 필요합니다.
- 메인 추천 UX와 Provider 검색 결과는 아직 완전히 통합되어 있지 않습니다.

### 다음 개선

- Sprint 6에서 Recommendation Experience 중심으로 메인 추천 UX와 Provider 검색 결과의 연결 방식을 정합니다.
- Provider 강제 선택 환경변수와 Provider별 장애 표시가 필요한지 검토합니다.
- 유효한 TMDB key 환경에서 Provider Badge가 `TMDB / Fallback No`로 표시되는지 Founder Review를 진행합니다.

## 2026-07-02 - MYOTT-S05-T05

### 오늘 작업

- 좋아하는 작품 입력창을 동적으로 늘어나는 구조로 변경했습니다.
- 마지막 입력창이 채워지면 새 빈 입력창이 자동 생성되도록 했습니다.
- 전체 초기화 버튼을 추가해 OTT, 콘텐츠 종류, 작품 입력, Quick Pick, 추천 결과, Detail Layer를 초기 상태로 되돌리게 했습니다.
- Quick Pick Layer 내부에 옵션 초기화 버튼을 추가했습니다.
- README, PROJECT_STATUS, TASK_HISTORY, CHANGELOG, dev-log를 업데이트했습니다.

### 결정한 것

- 이번 Task에서는 Provider, API route, TMDB Provider, Mock Provider를 수정하지 않습니다.
- 전체 초기화와 옵션 초기화는 역할을 분리합니다.
- 전체 초기화는 모든 추천 상태를 최초 진입 상태로 되돌립니다.
- 옵션 초기화는 Quick Pick 선택값만 비우고 메인 입력값은 유지합니다.

### 아쉬운 점

- 동적 입력창은 현재 메인 추천 UX의 더미 추천 흐름에 연결되어 있으며 실제 Provider 검색 요청과 직접 연결되지는 않습니다.
- 사용자가 중간 입력칸을 비우는 경우까지 완전한 편집 UX로 다듬는 것은 다음 개선 여지가 있습니다.

### 다음 개선

- Founder Review에서 동적 입력 흐름과 초기화 버튼 위치가 자연스러운지 확인합니다.
- 추천 API와 입력 데이터 연결 시 동적 입력 배열을 그대로 활용할 수 있게 유지합니다.
- Sprint 6 범위에서 실제 Provider 검색 UX와 메인 추천 UX의 연결 시점을 정합니다.

## 2026-07-01 - MYOTT-S05-T04

### 오늘 작업

- TMDB Provider Adapter를 구현했습니다.
- Provider Registry에 TMDB Provider를 등록하고 `getActiveProvider()`를 추가했습니다.
- `/api/search`에서 직접 TMDB import를 제거하고 Registry 기반 검색으로 바꿨습니다.
- TMDB 결과를 Unified Content Model로 보강했습니다.
- Mock fallback을 유지해 TMDB key가 없어도 동일한 검색 경험이 이어지게 했습니다.

### 결정한 것

- TMDB Provider Adapter는 우선 기존 `lib/tmdb.js`를 감싸는 방식으로 구현합니다.
- `/api/search`는 Provider Registry만 의존합니다.
- TMDB key가 있으면 TMDB Provider, 없으면 Mock Provider를 active provider로 사용합니다.
- TMDB 오류가 발생하면 Mock Provider fallback을 반환합니다.
- 기존 UI와 CSS는 수정하지 않습니다.

### 아쉬운 점

- 현재 로컬 환경에서는 TMDB key가 없어 실제 TMDB 검색 경로는 Founder 환경에서 추가 확인이 필요합니다.
- `lib/tmdb.js` 자체는 아직 남아 있으며 TMDB Provider 내부 구현으로 감싸진 상태입니다.
- Provider 선택 정책은 아직 환경변수로 강제할 수 없습니다.

### 다음 개선

- TMDB key가 있는 환경에서 실제 검색 결과를 Founder가 확인합니다.
- Provider Registry의 우선순위와 강제 선택 정책을 문서화합니다.
- Sprint 6에서 TMDB 상세/추천 Provider 확장 범위를 정합니다.

## 2026-07-01 - MYOTT-S05-T03

### 오늘 작업

- Mock Provider 데이터와 Provider 메서드를 구현했습니다.
- Provider Registry를 최소 형태로 추가했습니다.
- `/api/search`가 TMDB key 없음 또는 TMDB 오류 시 Mock Provider fallback을 사용하도록 연결했습니다.
- Provider Architecture와 PMS 문서를 Sprint 5 / MYOTT-S05-T03 기준으로 업데이트했습니다.
- `pnpm install`, `pnpm dev`, 브라우저 UX 확인, `/api/search` 확인, `pnpm build`를 수행했습니다.

### 결정한 것

- 이번 Task에서는 AI Recommendation, Personalization, Ranking Algorithm을 만들지 않습니다.
- Mock Provider는 Unified Content Model을 우선 반환하고 기존 alias를 함께 유지합니다.
- Provider Registry는 과도하게 확장하지 않고 mock fallback 연결에 필요한 최소 기능만 둡니다.
- 기존 메인 UI와 CSS는 수정하지 않습니다.
- Local verification에서 추천 결과, Quick Pick, Detail Layer, console error 0건을 확인했습니다.

### 아쉬운 점

- TMDB Provider adapter는 아직 구현하지 않았습니다.
- 메인 추천 UI는 여전히 자체 더미 데이터 기반이며, 검색 API Provider와 완전히 통합되지는 않았습니다.
- Provider 선택 정책은 아직 환경변수 기반으로 분리하지 않았습니다.

### 다음 개선

- TMDB Provider adapter를 구현할지 별도 Task로 설계합니다.
- Provider Registry의 우선순위와 fallback 정책을 문서화합니다.
- Founder local verification 결과를 기준으로 Sprint 6 연결 작업을 정합니다.

## 2026-07-01 - APS-003

### 오늘 작업

- MyOTT public repository에서 APS 핵심 운영 문서 5개를 제거했습니다.
- README에 `Built with APS.`와 Nd_core Source of Truth 설명을 남겼습니다.
- Project Memory System 문서에서 삭제된 APS 문서로 향하는 직접 링크를 제거했습니다.
- APS public notice와 migration plan을 Remove 완료 상태에 맞게 정리했습니다.
- CHANGELOG와 TASK_HISTORY를 APS-003 기준으로 업데이트했습니다.

### 결정한 것

- APS 핵심 운영 문서의 Source of Truth는 `cnd1026/Nd_core`입니다.
- MyOTT는 Reference Only입니다.
- Public MyOTT에는 APS 존재와 브랜드 참조만 남깁니다.
- Product는 고객 가치를 만들고, Platform은 그 가치를 반복 가능하게 증폭합니다.

### 아쉬운 점

- Git history rewrite는 하지 않았기 때문에 과거 커밋 이력에는 APS 문서가 남아 있을 수 있습니다.
- Public reference 문서가 너무 많아지면 이후 한 번 더 정리할 여지가 있습니다.
- MyOTT Product Development가 security migration 때문에 잠시 멈춰 있었습니다.

### 다음 개선

- Nd_core의 `APS_MIGRATION_STATUS.md`를 Remove completed 상태로 업데이트합니다.
- MyOTT Product Development를 재개합니다.
- Mock Provider 작업을 재개할지, 먼저 PMS 상태를 가볍게 동기화할지 결정합니다.

## 2026-07-01 - MYOTT-SEC-01

### 오늘 작업

- APS 공개 안내 문서 `APS_PUBLIC_NOTICE.md`를 추가했습니다.
- APS private repository 이전 계획 문서 `APS_MIGRATION_PLAN.md`를 추가했습니다.
- README에서 APS 핵심 문서 직접 링크 노출을 줄이고 공개 안내/이전 계획 중심으로 정리했습니다.
- `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `CHANGELOG.md`, `docs/dev-log.md`를 보안 정리 Task 기준으로 업데이트했습니다.

### 결정한 것

- APS 핵심 문서는 공개 저장소에서 바로 삭제하지 않습니다.
- Git history rewrite, force push, filter-repo는 이번 Task에서 사용하지 않습니다.
- APS 상세 운영 문서는 private repository로 이전하고, 공개 저장소에는 MyOTT 진행에 필요한 최소 PMS 문서만 유지합니다.

### 아쉬운 점

- APS 핵심 문서 파일은 아직 공개 저장소에 남아 있습니다.
- Private repository가 아직 생성되지 않아 실제 이전은 다음 Task로 분리했습니다.
- 과거 공개 이력 정리 여부는 별도 보안 판단이 필요합니다.

### 다음 개선

- `cnd1026/aps` 또는 `cnd1026/ai-project-system` 중 private repository 이름을 결정합니다.
- Private repository를 만들고 APS 핵심 문서를 백업/이전합니다.
- 이전 완료 후 공개 저장소에서 어떤 문서를 제거할지 별도 Task로 검토합니다.

## 2026-07-01 - MYOTT-S50-T01

### 오늘 작업

- `docs/project/APS_STANDARD.md` 문서를 새로 작성했습니다.
- Task ID 규칙과 Codex Mode 기준을 문서화했습니다.
- `TASK_HISTORY.md`에 기존 Sprint와 Foundation 작업의 Task ID를 소급 적용했습니다.
- `DEVELOPMENT_RULES.md`, `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, README를 APS 표준 기준으로 동기화했습니다.

### 결정한 것

- 기본 Task ID 형식은 `MYOTT-S{SPRINT}-T{TASK}`로 둡니다.
- Foundation Sprint는 `MYOTT-FND-T01`, Pre-Sprint는 `MYOTT-PRE-T01` 형식을 사용합니다.
- Sprint 5.0 Standardization은 `MYOTT-S50-T01` 형식을 사용합니다.
- Codex Mode는 LOW, MEDIUM, HIGH, VERY HIGH로 구분하고 작업 위험도와 검증 수준을 나타냅니다.

### 아쉬운 점

- 과거 커밋 메시지 자체에는 Task ID가 포함되어 있지 않아 `TASK_HISTORY.md`에서 소급 매핑했습니다.
- Task Template과 Review Template은 아직 별도 문서로 분리하지 않았습니다.
- MYOTT-S50-T01 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.

### 다음 개선

- `TASK_HISTORY.md`에 MYOTT-S50-T01 커밋 해시를 다음 작업 때 반영합니다.
- 새 Task부터 Task ID를 요청/문서/완료 보고에 기본 포함합니다.
- Task Template과 Review Template을 APS 기준으로 분리할지 검토합니다.

## 2026-07-01 - Task 5-2

### 오늘 작업

- Provider Architecture 문서에 MyOTT 공통 콘텐츠 모델 필수 필드와 권장 필드를 정리했습니다.
- Mock Provider 샘플 검색/상세 응답 구조를 정의했습니다.
- `app/api/search/route.js`가 현재 `lib/tmdb.js`의 `hasTmdbKey`, `searchTmdb`를 직접 사용하는 구조를 확인했습니다.
- Mock Provider 구현을 위한 전환 단계와 Provider Registry 판단을 문서화했습니다.

### 결정한 것

- Task 5-2에서는 Mock Provider를 실제로 구현하지 않습니다.
- Provider Registry도 이번 Task에서는 구현하지 않고, Mock Provider 구현 후 Provider가 2개 이상 실제 동작할 때 별도 Task로 검토합니다.
- 다음 구현 Task에서는 `src/lib/providers/mock/` 후보 구조를 기준으로 진행합니다.
- 기존 UI/API 호환을 위해 `type`, `year`, `ott`, `mood`, `synopsis` alias 전략을 검토합니다.

### 아쉬운 점

- 실제 Mock Provider 파일은 아직 만들지 않았습니다.
- API route 전환 방식은 Option A/B/C로 정리했지만 최종 구현안은 다음 Task에서 결정해야 합니다.
- Task 5-2 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.

### 다음 개선

- `TASK_HISTORY.md`에 Task 5-2 커밋 해시를 다음 작업 때 반영합니다.
- Task 5-3에서 Mock Provider를 실제로 추가합니다.
- Mock Provider 구현 후 `/api/search` 응답과 추천 페이지 호환성을 로컬에서 검증합니다.

## 2026-07-01 - Task 5-1b

### 오늘 작업

- README, PROJECT_CONTEXT, PROJECT_STATUS, TASK_HISTORY를 현재 프로젝트 상태에 맞게 동기화했습니다.
- Foundation Sprint F-01 ~ F-05 완료 상태를 반영했습니다.
- Current Sprint를 Sprint 5로, Current Task를 Task 5-2 Mock Provider 준비로 정리했습니다.
- README 실행 방법을 현재 저장소 루트 기준으로 수정했습니다.

### 결정한 것

- Task 5-2 전에는 Mock Provider 구현을 시작하지 않고 PMS 상태부터 맞춥니다.
- Last Commit은 Task 5-1b 시작 시점 기준 `74d81d8 docs(project): add AI PM validation guide`로 기록합니다.
- Sprint 5의 다음 실행 단위는 Mock Provider 준비이며, TMDB 직접 연동을 늘리지 않는 방향을 유지합니다.

### 아쉬운 점

- Task 5-1b는 자기 자신의 최종 커밋 해시를 문서 안에 정확히 반영할 수 없어 다음 기록 업데이트에서 반영해야 합니다.
- README의 프로젝트 이름은 아직 SceneSense / MovieMind DNA와 MyOTT가 함께 쓰이고 있어, 별도 네이밍 정리 Task가 필요할 수 있습니다.
- Mock Provider의 구체적인 파일 구조와 테스트 방식은 아직 설계하지 않았습니다.

### 다음 개선

- `TASK_HISTORY.md`에 Task 5-1b 커밋 해시를 다음 작업 때 반영합니다.
- Task 5-2에서 Mock Provider 준비 범위와 금지 범위를 명확히 정리합니다.
- Provider Architecture와 현재 `lib/tmdb.js` 사이의 이전 단계를 설계합니다.

## 2026-07-01 - Task F-05

### 오늘 작업

- `docs/project/AI_PM_VALIDATION.md` 문서를 새로 작성했습니다.
- 새로운 AI PM이 PMS 운영체계를 따르는지 확인하는 필수 체크리스트를 정리했습니다.
- Review 품질, Architecture 판단, Documentation 판단, 장기 유지보수, MVP 보호, Parking Lot, Decision Log, Founder Note, Book 연결 평가 항목을 만들었습니다.
- README와 PMS 관련 문서에 Validation 문서를 연결했습니다.

### 결정한 것

- AI PM Validation은 Pass, Fail, Score 방식으로 평가합니다.
- 100점 기준 배점을 두고 PMS 확인, Review 품질, Architecture 판단, Documentation 판단, 장기 유지보수 판단을 핵심 평가 영역으로 둡니다.
- 새 AI PM은 Constitution, Behavior, Validation, Bootstrap, Project Context 순서로 운영체계를 이해해야 합니다.
- F-04 커밋 `6a7bdab`은 `TASK_HISTORY.md`에 완료 상태로 반영했습니다.

### 아쉬운 점

- 아직 Task Template과 Review Template은 별도 문서로 분리하지 않았습니다.
- Validation 점수를 실제로 적용하는 예시 리뷰는 아직 만들지 않았습니다.
- F-05 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.

### 다음 개선

- `TASK_HISTORY.md`에 F-05 커밋 해시를 다음 작업 때 반영합니다.
- AI PM Validation 기준으로 Task Template과 Review Template을 설계할지 검토합니다.
- TMDB Provider 이전 설계를 Validation 기준에 맞춰 리뷰합니다.

## 2026-07-01 - Task F-04

### 오늘 작업

- `docs/project/AI_PM_BEHAVIOR.md` 문서를 새로 작성했습니다.
- AI PM의 리뷰 방식, 사용자 아이디어를 대하는 방식, 브레이크 기준, 칭찬 기준, 반대 의견 기준을 정리했습니다.
- Book 연동 관점에서 Founder Note, Decision Log, ADR 후보를 찾는 행동 규칙을 추가했습니다.
- README와 PMS 관련 문서에 Behavior 문서를 연결했습니다.

### 결정한 것

- AI PM Behavior는 성격 문서가 아니라 실제 협업 행동 규칙으로 둡니다.
- 리뷰는 잘한 점, 개선점, 이유, 다음 방향 순서로 정리합니다.
- 칭찬은 단순한 긍정이 아니라 왜 잘했는지 설명하는 방식으로 합니다.
- 반대 의견은 근거와 대안을 함께 제시할 때만 냅니다.
- MVP 지연, 기술부채 증가, 확장성 훼손, 개인정보 원칙 위반, Task 없는 개발에는 브레이크를 겁니다.

### 아쉬운 점

- 아직 ADR 문서 체계가 없어서 ADR 후보를 실제로 기록할 별도 위치는 마련하지 않았습니다.
- F-04 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.
- AI PM Behavior를 실제 Task 템플릿과 Review 템플릿으로 분리하는 작업은 남아 있습니다.

### 다음 개선

- `TASK_HISTORY.md`에 F-04 커밋 해시를 다음 작업 때 반영합니다.
- ADR 폴더와 작성 규칙을 별도 Task로 검토합니다.
- Task/Review 템플릿을 AI PM Behavior 기준으로 표준화합니다.

## 2026-07-01 - Task F-03

### 오늘 작업

- `docs/project/AI_PM_CONSTITUTION.md` 문서를 새로 작성했습니다.
- AI PM의 최상위 운영 원칙을 전문, 10개 조항, 마지막 조항으로 정리했습니다.
- README의 Project Memory System 목록에 Constitution 문서를 추가했습니다.
- Bootstrap, Project Status, Task History, AI Collaboration, Book Status 문서에 Constitution 연결을 반영했습니다.

### 결정한 것

- AI PM Constitution은 기술 문서가 아니라 프로젝트 운영 헌법으로 둡니다.
- AI PM은 장기 유지보수, 설계 없는 구현 금지, Documentation First, Architecture First, MVP 보호를 최상위 원칙으로 따릅니다.
- 사용자의 의견은 항상 존중하지만 무조건 동의하지 않고, 장단점과 이유를 객관적으로 설명합니다.
- 중요한 결정은 Founder Note, Decision Log, ADR 중 하나에 남기는 원칙을 유지합니다.

### 아쉬운 점

- ADR 문서 체계는 아직 실제로 만들지 않았고 별도 Task가 필요합니다.
- F-03 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.
- Constitution을 다른 새 프로젝트에 적용하는 템플릿화 작업은 아직 하지 않았습니다.

### 다음 개선

- `TASK_HISTORY.md`에 F-03 커밋 해시를 다음 작업 때 반영합니다.
- ADR 폴더와 작성 규칙을 만들지 검토합니다.
- TMDB Provider 이전 설계를 Constitution 원칙에 맞춰 진행합니다.

## 2026-07-01 - Task F-02

### 오늘 작업

- `docs/project/AI_PM_BOOTSTRAP.md` 문서를 새로 작성했습니다.
- 새 ChatGPT 채팅에서 사용할 AI PM Bootstrap System v1.0의 역할, 응답 순서, 개발 원칙, 금지사항을 정리했습니다.
- README의 Project Memory System 섹션에 Bootstrap 문서 링크를 추가했습니다.
- `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 F-02 상태에 맞게 업데이트했습니다.

### 결정한 것

- 새 ChatGPT 채팅에서는 `AI_PM_BOOTSTRAP.md`를 첫 번째 문서로 사용합니다.
- AI PM은 Project Manager, Software Architect, Technical Reviewer, Documentation Manager, Product Advisor 역할을 맡되 구현보다 설계와 리뷰를 우선합니다.
- Product Owner는 최종 의사결정과 우선순위, Codex는 구현과 테스트, 커밋/푸시를 담당하는 구조를 유지합니다.
- 중요한 결정은 Founder Note, Decision Log, ADR 중 하나에 기록하는 원칙을 둡니다.

### 아쉬운 점

- ADR 폴더는 아직 만들지 않았고, 필요 시 별도 Task로 검토해야 합니다.
- AI PM v2의 Task 템플릿과 Review 체크리스트는 아직 상세화하지 않았습니다.
- F-02 문서 안에는 자기 자신의 최종 커밋 해시를 넣을 수 없어 다음 기록 업데이트에서 반영해야 합니다.

### 다음 개선

- `TASK_HISTORY.md`에 F-02 커밋 해시를 다음 작업 때 반영합니다.
- AI PM v2에서 Task 템플릿과 Review 체크리스트를 구체화합니다.
- TMDB Provider 이전 설계를 Bootstrap 응답 순서에 맞춰 진행합니다.

## 2026-07-01 - Task F-01

### 오늘 작업

- `docs/project/` 폴더를 만들고 Project Memory System(PMS) 문서 8개를 작성했습니다.
- 프로젝트 맥락, 현재 상태, 작업 이력, 의사결정, Founder Note, 개발 규칙, AI 협업 방식, Book Status를 분리해 정리했습니다.
- README에 PMS 소개와 각 문서 링크를 추가했습니다.
- README의 Current Sprint를 Foundation Sprint로 업데이트했습니다.

### 결정한 것

- 긴 프로젝트를 이어가기 위해 PMS를 공식 운영 문서로 사용합니다.
- 새 Codex 스레드는 먼저 `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `DECISION_LOG.md`, README를 확인하는 흐름으로 둡니다.
- 중요한 제품/기술 결정은 `DECISION_LOG.md`, 창업자 관점의 원칙은 `FOUNDER_NOTES.md`에 기록합니다.
- F-01 문서 안의 Last Commit은 작업 시작 시점 기준 `365c9dd`로 남기고, 실제 F-01 커밋 해시는 완료 보고와 다음 기록 업데이트에서 반영합니다.

### 아쉬운 점

- PMS 문서가 처음 생성된 상태라 다음 Task부터 실제 운영하면서 더 다듬어야 합니다.
- README의 실행 경로는 과거 경로가 남아 있어 별도 Task에서 현재 프로젝트 루트 기준으로 점검이 필요합니다.
- Task 템플릿과 Review 체크리스트는 아직 별도 표준 문서로 분리하지 않았습니다.

### 다음 개선

- TMDB Provider 이전 설계를 시작하기 전 PMS 문서를 기준으로 현재 상태를 다시 확인합니다.
- `TASK_HISTORY.md`에 F-01 커밋 해시를 후속 기록 때 반영합니다.
- 개발 규칙에 Task 템플릿과 Review 체크리스트를 추가할지 검토합니다.

## 2026-07-01 - Task 5-1

### 오늘 작업

- `docs/architecture/provider-architecture.md` 문서를 새로 작성했습니다.
- TMDB를 직접 호출하는 구조에서 Provider(Adapter) 구조로 확장하기 위한 방향을 정리했습니다.
- `src/lib/providers/` 아래에 Provider 계약 초안과 TMDB Provider 자리표시자를 추가했습니다.
- README의 Current Sprint를 Sprint 5 진행 상태로 업데이트했습니다.

### 결정한 것

- MyOTT 내부는 특정 외부 API 대신 `ContentProvider` 개념에 의존하는 방향으로 설계합니다.
- TMDB는 제거 대상이 아니라 첫 번째 Provider로 감싸는 대상으로 둡니다.
- 현재 프로젝트가 JavaScript 기반이므로 Provider 초안은 TypeScript 파일이 아니라 JSDoc 기반 JS 파일로 작성합니다.
- 이번 작업에서는 기존 `lib/tmdb.js`, API route, UI 동작을 수정하지 않습니다.

### 아쉬운 점

- Provider Registry, fallback 순서, 오류 처리 정책은 아직 구현하지 않았습니다.
- MyOTT 공통 콘텐츠 모델의 필수 필드는 더 구체화해야 합니다.
- 기존 TMDB 호출 코드를 실제 Provider로 옮기는 작업은 다음 단계로 남겨두었습니다.

### 다음 개선

- `lib/tmdb.js`를 `tmdb-provider`로 옮길 수 있는 최소 리팩터링 단계를 나눕니다.
- Provider별 응답 실패와 빈 결과 fallback 정책을 문서화합니다.
- 테스트용 mock provider가 필요한지 검토합니다.

## 2026-07-01 - Task 4-4d

### 오늘 작업

- `docs/database/database-inventory.md` 문서를 새로 작성했습니다.
- 지금까지 설계한 Content, User/Session, AI/Recommendation, Community 도메인의 테이블 후보를 한곳에 모았습니다.
- 후보 테이블별 MVP 필수 여부와 출시 버전을 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4d 완료 상태로 업데이트했습니다.

### 결정한 것

- 이전 문서의 `recommendation_log`는 인벤토리 기준으로 `recommendation_requests`에 통합해 검토합니다.
- `comment`, `user_comments`는 `comments`로, `vote`, `content_votes`는 `votes`로 통합해 Community Domain 후보로 둡니다.
- v1은 추천, 콘텐츠, OTT 필터, 로그인, 취향 저장, Watch Later 중심으로 두고, 댓글/알림/커뮤니티 기능은 v2 이후로 분리합니다.
- 이번 작업에서는 SQL, ERD, Supabase 연결, TMDB 연결, 코드 수정을 하지 않습니다.

### 아쉬운 점

- 아직 각 테이블의 실제 컬럼 타입, 제약 조건, 인덱스는 정하지 않았습니다.
- `content_details`, `external_content_ids`, `content_aliases`처럼 v1 선택 후보의 구현 시점은 더 좁혀야 합니다.
- 이벤트 테이블은 개인정보 동의와 보관 정책이 더 구체화된 뒤 결정해야 합니다.

### 다음 개선

- Database Inventory를 기준으로 v1.0 최소 테이블 목록을 확정합니다.
- TMDB 응답 필드를 Content Domain 후보와 매핑합니다.
- User Preference와 AI Preference Vector의 경계를 다시 정리합니다.

## 2026-07-01 - Task 4-4c

### 오늘 작업

- `docs/database/user-domain.md` 문서를 새로 작성했습니다.
- 익명 세션, 로그인 사용자, 취향 저장, Watch Later, 추천 기록, 알림 후보 테이블을 정리했습니다.
- User Domain이 절대로 저장하지 않을 정보를 Data Policy에 맞춰 다시 명시했습니다.
- README의 Sprint 4 진행률을 Task 4-4c 완료 상태로 업데이트했습니다.

### 결정한 것

- MyOTT는 회원가입 없이 추천을 사용할 수 있게 설계합니다.
- 로그인 사용자는 취향 저장, Watch Later, 추천 기록, 알림 같은 개인 기능을 사용할 수 있게 둡니다.
- 인증 자체는 Supabase Auth가 담당하고, MyOTT DB에는 필요한 최소 사용자 상태만 저장하는 방향으로 둡니다.
- 이번 작업에서는 SQL, ERD, Supabase 연결, TMDB 연결, 코드/UI 수정을 하지 않습니다.

### 아쉬운 점

- `users`와 Supabase Auth 사이의 정확한 필드 경계는 실제 구현 전 더 구체화해야 합니다.
- 익명 세션 데이터를 로그인 계정에 연결할지 여부는 아직 제품 정책 결정이 필요합니다.
- 알림 채널은 email, push, in_app 후보만 적었고 v1.0 범위는 아직 정하지 않았습니다.

### 다음 개선

- User Domain과 AI Domain의 추천 요청/로그 테이블 이름을 정렬합니다.
- v1.0 최소 User/Session 테이블을 추립니다.
- 익명 세션 보관 기간과 로그인 전환 정책을 Data Policy와 함께 확정합니다.

## 2026-07-01 - Task 4-4b

### 오늘 작업

- `docs/database/ai-domain.md` 문서를 새로 작성했습니다.
- AI 추천 시스템이 사용하는 데이터와 저장하는 데이터 후보를 분리했습니다.
- AI가 절대로 저장하지 않는 개인정보 범위를 명시했습니다.
- 추천 이유 생성, 유사 사용자 추천, 취향 DNA, 날씨 추천, OTT 종료 예정 추천, 신규 공개 추천 확장 방향을 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4b 완료 상태로 업데이트했습니다.

### 결정한 것

- MyOTT AI는 개인정보를 학습하지 않습니다.
- AI Domain은 익명 행동 데이터와 콘텐츠 메타데이터를 중심으로 추천 품질을 개선합니다.
- 추천 로그, 추천 결과, 피드백, 취향 벡터, 콘텐츠 유사도는 후보 테이블로 문서화하되 실제 DB는 만들지 않습니다.
- 이번 작업에서는 SQL, ERD, Supabase 연결, TMDB 연결, 코드/UI 수정을 하지 않습니다.

### 아쉬운 점

- 추천 요청 테이블 이름이 기존 문서의 `recommendation_requests`와 `recommendation_log`로 나뉘어 있어 이후 통합 결정이 필요합니다.
- `preference_vector`를 태그 기반으로 시작할지 수치 벡터로 시작할지는 아직 정하지 않았습니다.
- 추천 이유 생성에 사용할 안전한 입력 범위는 더 구체화해야 합니다.

### 다음 개선

- AI Domain과 User Journey 문서의 이벤트/테이블 후보 이름을 정렬합니다.
- v1.0에서 필요한 AI 추천 로그 최소 범위를 정합니다.
- Watch Later, 좋아요, 싫어요 신호가 취향 DNA에 반영되는 규칙을 문서화합니다.

## 2026-07-01 - Task 4-4a

### 오늘 작업

- `docs/database/content-domain.md` 문서를 새로 작성했습니다.
- 콘텐츠 도메인의 역할과 설계 경계를 정리했습니다.
- 작품, 장르, 인물, OTT 플랫폼, 국가, 언어, 컬렉션 후보 테이블을 초안으로 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4a 완료 상태로 업데이트했습니다.

### 결정한 것

- 이번 작업에서는 SQL, ERD, Supabase 연결, TMDB 연결, 코드 수정을 하지 않습니다.
- Content Domain은 사용자 개인정보와 분리된 콘텐츠 메타데이터 중심으로 설계합니다.
- 외부 ID와 내부 ID는 분리하고, 장르/국가/언어/플랫폼은 참조 데이터로 관리하는 방향을 둡니다.

### 아쉬운 점

- 컬럼은 아직 초안이며 타입, 제약 조건, 인덱스는 정하지 않았습니다.
- 다국어 제목과 줄거리, 타입별 상세 테이블 분리 여부는 아직 결정하지 않았습니다.
- OTT 제공 정보의 출처와 갱신 주기는 별도 설계가 필요합니다.

### 다음 개선

- TMDB 응답 필드와 Content Domain 컬럼 후보를 매핑합니다.
- v1.0에 필요한 최소 콘텐츠 테이블만 추립니다.
- Recommendation Domain과 User Domain DB 초안을 이어서 작성합니다.

## 2026-07-01 - Task 4-3

### 오늘 작업

- `docs/data-policy.md` 문서를 새로 작성했습니다.
- 저장하지 않을 데이터, 익명 저장 가능 데이터, 로그인 사용자 데이터의 경계를 정리했습니다.
- 저장 기간, 계정 삭제, 익명 통계, AI 학습 정책을 제안 수준으로 문서화했습니다.
- README의 Sprint 4 진행률을 Task 4-3 완료 상태로 업데이트했습니다.

### 결정한 것

- MyOTT의 데이터 철학은 "필요한 데이터만 저장한다"로 둡니다.
- 이름, 생년월일, 전화번호, 주소, 주민등록번호, 원본 IP, 민감정보는 기본적으로 저장하지 않습니다.
- AI 추천은 개인정보 원본이 아니라 익명화된 추천 패턴과 행동 통계를 활용하는 방향으로 설계합니다.
- 이번 작업에서는 DB 생성, Supabase 연결, TMDB 연결, 코드/UI 수정을 하지 않습니다.

### 아쉬운 점

- 저장 기간은 아직 제안 수준이며 실제 법률 검토와 운영 정책에 따라 조정해야 합니다.
- 계정 삭제 시 댓글을 함께 삭제할지 익명화할지는 추가 제품 결정이 필요합니다.
- 국가별 규제 대응은 체크리스트 수준으로만 정리했고 세부 준수 요건은 별도 검토가 필요합니다.

### 다음 개선

- v1.0 최소 데이터 모델을 Data Policy 기준으로 다시 좁힙니다.
- 개인정보 처리방침 초안과 이용약관 초안을 별도 문서로 분리할지 검토합니다.
- 익명 세션 보관, 로그인 전환, 백업 삭제 정책을 더 구체화합니다.

## 2026-07-01 - Task 4-2

### 오늘 작업

- `docs/user-journey-data-flow.md` 문서를 새로 작성했습니다.
- 첫 방문부터 다시 방문과 취향 기반 추천 개선까지 사용자 여정을 단계별로 정리했습니다.
- 각 단계에서 발생할 수 있는 데이터 후보와 테이블 후보를 함께 적었습니다.
- README의 Sprint 4 진행률을 Task 4-2 완료 상태로 업데이트했습니다.

### 결정한 것

- 익명 사용자도 추천은 사용할 수 있게 두고, 장기 취향 저장과 나중에 볼래는 로그인 사용자 기능으로 분리합니다.
- 저장해야 할 데이터와 저장하지 않을 데이터를 문서에서 명확히 구분합니다.
- 이번 작업에서는 DB 생성, Supabase 연결, TMDB 연결, UI 변경을 하지 않습니다.

### 아쉬운 점

- 후보 테이블 이름은 정리했지만 컬럼, 관계, 보관 기간은 아직 정하지 않았습니다.
- 나중에 볼래를 익명 세션에서 임시 지원할지 여부는 아직 결정하지 않았습니다.
- 추천 개선을 위한 이벤트 수집 범위는 개인정보 정책과 함께 더 좁혀야 합니다.

### 다음 개선

- v1.0에 실제로 필요한 최소 테이블만 추려 데이터 모델 초안을 작성합니다.
- TMDB 응답 필드를 `contents`, `content_details`, `content_aliases` 후보와 매핑합니다.
- 익명 세션과 로그인 전환 시 데이터 이전 정책을 정리합니다.

## 2026-07-01 - Task 4-1

### 오늘 작업

- MyOTT 전체 기능 범위를 정리하는 `docs/service-architecture.md` 초안을 작성했습니다.
- 현재 기능, v1.0, v2.0, v3.0+ 기능을 단계별로 분리했습니다.
- 기능별로 필요한 DB 후보를 간단히 적었습니다.
- README에 Sprint 4 시작 상태를 반영했습니다.

### 결정한 것

- 이번 작업에서는 DB 구현, Supabase 연결, 마이그레이션을 하지 않습니다.
- Sprint 4는 기능 구현보다 서비스 구조와 데이터 범위를 먼저 문서화하는 방향으로 시작합니다.
- 장기 확장 대상은 만화, 웹툰, 소설, 게임, 음악으로 열어두되 v1.0 범위와 분리합니다.

### 아쉬운 점

- DB 이름은 아직 초안 수준이라 실제 스키마, 컬럼, 관계는 정하지 않았습니다.
- v1.0에서 어떤 기능을 먼저 출시할지 우선순위는 더 좁혀야 합니다.
- 추천 로그와 취향 저장은 개인정보 보관 정책도 함께 고민해야 합니다.

### 다음 개선

- TMDB API 응답을 어떤 내부 필드로 저장할지 매핑 문서를 작성합니다.
- v1.0 최소 데이터 모델과 Supabase 테이블 후보를 분리해 정리합니다.
- README의 Sprint 진행률을 Sprint 4 작업이 쌓일 때마다 갱신합니다.

## 2026-07-01 - Task 3-5

### 오늘 작업

- Quick Pick 선택값에 따라 서로 다른 더미 추천 결과가 나오도록 추천 결과 생성을 개선했습니다.
- SF, 로맨스, 스릴러 추천 세트를 추가하고 카드/상세 Layer에 같은 정보 구조가 표시되도록 정리했습니다.
- 작품 입력값이 있으면 추천 이유에 입력 작품명을 연결했습니다.
- 추천 실행 시 Quick Pick Layer를 닫아 상세 Layer와 동시에 꼬이지 않도록 했습니다.

### 결정한 것

- TMDb, Supabase, 로그인은 이번 작업에서 연결하지 않습니다.
- 추천 결과는 여전히 더미 데이터지만, Quick Pick 태그와 콘텐츠 타입으로 화면 결과를 다르게 보여줍니다.
- 포스터는 실제 이미지 대신 텍스트 기반 포스터 영역으로 유지해 MVP UI 흐름을 먼저 완성합니다.

### 아쉬운 점

- 실제 포스터 이미지는 아직 없고, 더미 포스터 텍스트로만 표현합니다.
- 추천 점수와 정렬 기준은 임시 태그 매칭이므로 실제 추천 알고리즘은 아닙니다.
- 모바일 실기기 터치 감각과 접근성 포커스 관리는 추가 확인이 필요합니다.

### 다음 개선

- TMDb 연동 전 추천 데이터 필드와 API 응답 매핑을 정리합니다.
- Quick Pick 태그를 실제 장르/국가/러닝타임 조건으로 변환하는 기준을 정의합니다.
- Sprint 3 MVP UI 완료 후 Sprint 4 범위를 별도 문서로 정리합니다.

## 2026-06-30 - Task 3-4b

### 오늘 작업

- Task 3-4 이후 발생한 로컬 500 오류와 React runtime 오류 가능성을 점검했습니다.
- `app/page.jsx`를 React state 기반 클라이언트 컴포넌트로 정리했습니다.
- 추천 카드 표시, 상세 Layer 열기/닫기, Quick Pick 열기/닫기 상태를 React 이벤트로 복구했습니다.
- CSS 단위 오류가 다시 생기지 않았는지 검색했습니다.

### 결정한 것

- 추천 카드와 상세 Layer는 외부 스크립트의 `innerHTML` 조작 대신 React state로 관리합니다.
- 더미 데이터, 추천 필터 기준, 추천 알고리즘은 변경하지 않습니다.
- Quick Pick 선택 상태는 Layer를 닫아도 유지하고, 상세 Layer를 열 때는 Quick Pick을 닫아 충돌을 막습니다.

### 아쉬운 점

- 상세 Layer의 포커스 트랩과 포커스 복귀 처리는 아직 별도 개선으로 남아 있습니다.
- 현재 썸네일은 실제 이미지가 아니라 텍스트 기반 더미 영역입니다.
- 이전 스크립트 구조를 정리하면서 페이지 코드가 커졌으므로, 이후 컴포넌트 분리가 필요할 수 있습니다.

### 다음 개선

- 상세 Layer 접근성, 포커스 관리, 모바일 스크롤 감각을 추가 점검합니다.
- 실제 TMDb 연동 전 더미 데이터 구조를 API 응답 구조와 맞출 준비를 합니다.
- `app/page.jsx`가 더 커지면 카드, Quick Pick, 상세 Layer를 작은 컴포넌트로 분리합니다.

## 2026-06-30 - Task 3-4

### 오늘 작업

- 추천 결과 카드에 썸네일, 제목, 타입, 장르, 감독, 주요 배우, 추천 이유를 다시 표시했습니다.
- 카드 클릭 시 열리는 상세 정보 Layer를 추가했습니다.
- 상세 Layer의 X 버튼, 배경 클릭, ESC 닫기 동작을 구현했습니다.
- Quick Pick Layer와 상세 Layer가 동시에 꼬이지 않는지 로컬 클릭 테스트로 확인했습니다.

### 결정한 것

- 현재는 더미 데이터를 유지하고, TMDb API 연결은 하지 않습니다.
- 추천 알고리즘은 변경하지 않고 결과 표시 UI와 상세 Layer만 확장합니다.
- 상세 Layer는 Quick Pick과 별도 overlay/state로 분리합니다.

### 아쉬운 점

- 썸네일은 아직 실제 이미지가 아니라 텍스트 기반 더미 영역입니다.
- 상세 Layer의 포커스 트랩과 키보드 접근성은 추가 개선 여지가 있습니다.
- 카드 정보 구조는 복구했지만 실제 데이터 연동 전까지는 콘텐츠 풍부함에 한계가 있습니다.

### 다음 개선

- 상세 Layer 접근성, 포커스 관리, 모바일 스크롤 감각을 점검합니다.
- 실제 이미지 또는 TMDb poster 데이터를 연결할 때 필요한 필드 구조를 정리합니다.
- Quick Pick 선택값과 추천 카드 표시를 연결하는 다음 작업 범위를 정의합니다.

## 2026-06-30 - Task 3-3c

### 오늘 작업

- Quick Pick Layer가 첫 진입 시 닫혀 있도록 CSS 우선순위를 수정했습니다.
- 추천 옵션 버튼, X 버튼, 배경 오버레이, ESC 키 닫기 동작을 로컬 클릭 테스트로 확인했습니다.
- Quick Pick 필터 선택 후 닫았다 다시 열었을 때 선택 상태가 유지되는지 확인했습니다.
- `pnpm build`와 `node --check public/app.js`로 컴파일과 스크립트 문법을 검증했습니다.

### 결정한 것

- 초기 닫힘 문제는 UI 구조 변경 없이 `.quick-pick-overlay.hidden` CSS 규칙으로 해결합니다.
- 추천 버튼 활성화 조건은 기존대로 작품 입력값 또는 Quick Pick 선택값 중 하나가 있으면 활성화되도록 유지합니다.
- 추천 알고리즘과 더미 결과 데이터는 변경하지 않습니다.

### 아쉬운 점

- 이번 테스트는 로컬 Chrome 기반 자동 클릭 테스트이며, 실제 모바일 기기 터치 테스트는 아직 남아 있습니다.
- Quick Pick 선택값은 아직 결과 정렬이나 필터링에는 반영되지 않습니다.
- Layer 포커스 트랩 같은 접근성 보강은 별도 작업으로 남겨두었습니다.

### 다음 개선

- Quick Pick 선택값을 더미 추천 결과나 향후 TMDb 검색 조건에 연결할지 정의합니다.
- 모바일 실기기에서 X 버튼, 배경 오버레이, 시트 스크롤 감각을 확인합니다.
- Layer 접근성 개선 범위를 별도 태스크로 분리합니다.

## 2026-06-30 - Task 3-3b

### 오늘 작업

- 전체 CSS 소스에서 `숫자 + 공백 + 단위` 패턴을 검색했습니다.
- CSS 단위 오류가 발견되지 않아 CSS 파일은 수정하지 않았습니다.
- 의존성 확인과 로컬 dev 서버 실행을 통해 프로젝트 실행 상태를 검증했습니다.
- Task 3-3b 기록을 CHANGELOG와 개발일지에 추가했습니다.
- Local Test는 `pnpm install` 후 `pnpm dev --hostname 127.0.0.1 --port 3001`로 진행했고, `http://127.0.0.1:3001/`에서 `GET / 200` 응답과 컴파일 완료를 확인했습니다.

### 결정한 것

- 기능 동작, UI 구조, 추천 로직은 변경하지 않습니다.
- README는 이번 태스크 수정 범위에서 제외합니다.
- CSS 수정 대상이 없을 때는 불필요한 no-op 스타일 변경을 만들지 않습니다.

### 아쉬운 점

- 자동 브라우저 클릭 테스트까지는 포함하지 않고, 로컬 서버 응답과 컴파일 상태 확인에 집중했습니다.
- Quick Pick의 실제 추천 반영은 아직 다음 태스크로 남아 있습니다.
- 현재 기록은 날짜 기준으로 누적되고 있어 Sprint 3 전체 요약은 별도 정리가 필요할 수 있습니다.

### 다음 개선

- Quick Pick 필터를 추천 결과와 연결하는 기준을 정의합니다.
- 모바일 실기기에서 Bottom Sheet 스크롤과 하단 버튼 위치를 확인합니다.
- Sprint 3 완료 시점에 README, CHANGELOG, 개발일지를 함께 정리합니다.

## 2026-06-30

### 오늘 작업

- Task 3-2 기록을 CHANGELOG와 개발일지에 보완했습니다.
- `008d72e` 커밋에서 추가한 Quick Pick 필터 레이어, 추천 옵션 버튼, 버튼 활성화 조건을 기록했습니다.
- CSS 단위 표기 오류를 전체 CSS 파일 대상으로 점검했습니다.

### 결정한 것

- Task 3-2b에서는 기능 동작과 UI 구조를 변경하지 않고 기록 보완과 CSS 점검만 진행합니다.
- 현재 CSS에는 공백이 끼어 있는 잘못된 단위 표기가 없어 별도 CSS 수정은 하지 않습니다.
- Quick Pick 선택값은 아직 더미 결과를 직접 바꾸지 않고, 추천 시작 조건을 보완하는 UI 상태로만 유지합니다.

### 아쉬운 점

- Quick Pick 옵션이 실제 추천 품질에 반영되는 단계는 아직 구현되지 않았습니다.
- Bottom Sheet의 세부 사용감은 실제 모바일 화면에서 추가 확인이 필요합니다.
- Sprint 3 문서 구조는 아직 Sprint 2처럼 별도 묶음으로 정리되지 않았습니다.

### 다음 개선

- Quick Pick 선택값을 추천 로직에 연결할지, 또는 TMDb 연동 이후 필터로 사용할지 결정합니다.
- 모바일 환경에서 추천 옵션 레이어의 높이, 닫기 동작, 체크 영역을 점검합니다.
- Sprint 3 작업이 더 쌓이면 CHANGELOG와 개발일지를 Sprint 단위로 정리합니다.

## Sprint 2 - 2026-06-29

### 오늘 작업

- `4d59d6c` 프로젝트 초기 작업 이후의 추천 페이지 방향을 Sprint 2 기준으로 정리했습니다.
- `7324872` Task 2-1에서 추천 페이지 기본 UI와 한 페이지 더미 추천 흐름을 구현했습니다.
- `7491eeb` Task 2-2에서 README를 프로젝트 대시보드 형태로 개선하고 Current Sprint를 표시했습니다.
- Task 2-3에서 Sprint 2 작업 기록을 CHANGELOG와 개발일지에 묶어 정리했습니다.

### 결정한 것

- Sprint 2는 추천 페이지 UX 완성과 한 페이지 구조 유지를 중심으로 진행합니다.
- 현재 단계에서는 TMDb API와 Supabase를 연결하지 않고, 더미 데이터로 추천 흐름을 검증합니다.
- 진행 상황은 README의 Current Sprint 체크리스트와 문서 기록으로 함께 관리합니다.

### 아쉬운 점

- 추천 결과는 아직 실제 데이터나 추천 알고리즘이 아닌 더미 데이터에 머물러 있습니다.
- 브라우저에서 사용자가 느끼는 세부 UX는 추가 확인과 조정이 필요합니다.
- 기존 TMDb API Route는 남아 있지만 Sprint 2 UI 흐름에서는 아직 사용하지 않습니다.

### 다음 개선

- Sprint 2 완료 후 추천 페이지 UX를 실제 화면에서 다시 점검합니다.
- Task 2-3 커밋 해시까지 README나 기록 문서에 필요하면 추가 반영합니다.
- TMDb API 연동 준비를 다음 태스크로 분리하고, 더미 데이터에서 실제 데이터로 넘어가는 기준을 정합니다.

## 2026-06-29

### 오늘 작업

- Task 2-1 요구사항에 맞춰 추천 페이지 기본 UI를 구현했습니다.
- 영화, 드라마, 애니 체크박스와 작품 입력창 3개, 추천받기 버튼을 한 페이지에 배치했습니다.
- 추천받기 버튼을 누르면 페이지 이동 없이 더미 추천 결과가 아래에 표시되도록 만들었습니다.
- README, CHANGELOG, 개발 로그를 이번 태스크 기준으로 업데이트했습니다.

### 결정한 것

- 이번 태스크에서는 UI만 구현하고 TMDb API와 Supabase 연결은 하지 않기로 했습니다.
- 결과 데이터는 고정 더미 배열을 사용하고, 체크박스 선택값으로만 필터링합니다.
- 기존 고급 추천 분석 흐름은 현재 기본 UI 범위에 맞지 않아 단순한 입력과 결과 표시 흐름으로 줄였습니다.

### 아쉬운 점

- 아직 실제 추천 알고리즘은 없고 더미 결과만 표시합니다.
- 체크박스와 입력값은 기본 흐름 확인용이며, 세부 취향 분석은 다음 단계에서 다시 설계해야 합니다.
- 브라우저 수동 QA 전까지 실제 클릭 경험의 세부 느낌은 추가 확인이 필요합니다.

### 다음 개선

- 브라우저에서 입력, 체크박스, 추천받기 버튼, 결과 표시 흐름을 확인합니다.
- 더미 결과 카드의 정보 구조를 사용자가 비교하기 쉽게 개선합니다.
- 다음 태스크에서 추천 로직 또는 외부 데이터 연결 범위를 별도로 정의합니다.

## 2026-06-29 이전 스프린트

### 오늘 작업

- 추천 페이지를 한 페이지 UI로 정리했습니다.
- 작품 입력, 추천 버튼, 결과 확인이 같은 화면에서 이어지도록 사용자 흐름을 단순화했습니다.
- README에 Current Sprint 섹션을 추가하고 CHANGELOG와 개발 로그를 업데이트했습니다.

### 결정한 것

- 이번 스프린트에서는 실제 데이터 연동보다 추천 화면과 사용자 흐름 완성을 우선합니다.
- 실제 TMDb 키가 없어도 로컬 더미 카탈로그로 결과를 볼 수 있는 상태를 유지합니다.
- 랜딩 전용 입력 흐름은 제거하고, 추천 도구 화면을 첫 화면으로 사용합니다.

### 아쉬운 점

- 아직 브라우저에서 세부 카드, 비교, 저장 같은 보조 액션까지 충분히 QA하지 못했습니다.
- 추천 결과 품질은 여전히 더미 카탈로그와 간단한 유사도 계산에 의존합니다.
- TMDb 키가 없는 상태에서는 실제 최신 작품 검색 흐름을 검증할 수 없습니다.

### 다음 개선

- 로컬 브라우저에서 추천 버튼 이후 결과 카드가 안정적으로 표시되는지 확인합니다.
- 필터와 보기 전환이 추천 결과에 자연스럽게 연결되도록 다듬습니다.
- TMDb 키 설정 후 외부 데이터 기반 입력 흐름을 검증합니다.

## 2026-06-26

### 오늘 작업

- 기존 단순 웹페이지 형태의 앱을 Next.js 프로젝트 구조로 이전했습니다.
- 앱 화면, 전역 CSS, 클라이언트 추천 로직, TMDb API Route를 각각의 역할에 맞게 배치했습니다.
- TMDb API 키를 `.env.local` 또는 Vercel 환경변수에서만 읽도록 서버 API Route 기반으로 정리했습니다.

### 결정한 것

- GitHub 저장소 `cnd1026/myott`를 기준으로 이후 작업을 이어가기로 했습니다.
- TMDb 연동은 클라이언트에서 직접 호출하지 않고 Next.js API Route를 통해 처리하기로 했습니다.
- API 키가 없거나 검색에 실패하면 기존 로컬 데모 DB로 fallback하는 방식을 유지하기로 했습니다.

### 아쉬운 점

- 아직 실제 TMDb API 키를 넣은 상태에서 전체 검색 흐름을 충분히 검증하지 못했습니다.
- Vercel production 환경에서 환경변수와 API Route가 정상 동작하는지 확인이 남아 있습니다.
- 추천 결과 품질은 임시 변환 로직에 기대고 있어, 이후 데이터 정규화와 추천 기준 개선이 필요합니다.

### 다음 개선

- TMDb 키를 설정하고 `/api/status`, `/api/search`를 로컬에서 먼저 검증합니다.
- Vercel에 환경변수를 등록하고 production 배포를 확인합니다.
- TMDb 결과의 장르, 키워드, OTT 제공처 정보를 추천 알고리즘에 더 정교하게 반영합니다.
