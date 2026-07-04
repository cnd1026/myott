# Changelog

프로젝트의 주요 변경 사항을 날짜별로 기록합니다.

## 2026-07-04 - MYOTT-S08-T10F

### 변경 내용

- TMDB discover 후보 수집을 `movie`, `drama(tv)`, `animation(movie+tv)` request 단위로 완전히 분리했습니다.
- Movie/TV 선택 시 animation genre를 제외하고, Animation 선택 시에만 movie/tv animation discover를 호출하도록 정리했습니다.
- TV + UK + Thriller 조합이 TV discover에서 Crime/Mystery/Drama 계열 장르로 해석되도록 genre mapping을 보강했습니다.
- TMDB discover 결과가 한 타입에 쏠리지 않도록 서버 응답 직전 content diversity round-robin을 적용했습니다.
- 선택 타입이 좁혀진 경우 클라이언트 결과 상태에 들어가기 전 타입 mismatch를 제거하도록 안전장치를 추가했습니다.
- Related Picks 클릭 시 이전 drag flag가 남아 클릭을 막지 않도록 초기화하고, 클릭 시 기존 상세 열기 흐름을 재사용하도록 수정했습니다.
- Related Picks 제목은 최대 3줄, 보조 문구는 1줄 말줄임으로 카드 높이를 안정화했습니다.
- TMDB 장르 metadata 정렬을 사용 빈도 중심으로 바꾸고 `SF` / `SF·판타지` label을 분리했습니다.
- OTT 필터가 TMDB discover의 watch provider 힌트로 전달되고, 선택 provider가 카드 OTT/추천 이유에 표시되도록 보강했습니다.
- Mock fallback에도 영국 스릴러 드라마와 일본 SF 영화 샘플을 보강해 fallback QA에서 타입/국가/장르가 어긋나지 않도록 했습니다.

### 이유

- 콘텐츠 종류 선택은 score 보정이 아니라 후보 수집 단계에서 먼저 보장되어야 하기 때문입니다.
- 드라마 + 영국 + 스릴러에서 애니메이션이나 movie가 노출되면 추천 엔진 신뢰가 크게 떨어지기 때문입니다.
- Related Picks 클릭이 동작하지 않으면 상세 탐색 흐름이 끊기기 때문입니다.

### 다음 작업

- Founder 로컬 TMDB 환경에서 Sherlock, Broadchurch, Luther, Bodyguard 계열이 실제로 상단에 오는지 확인합니다.
- 실제 TMDB watch provider id와 지역별 provider 노출 품질은 후속 QA에서 점검합니다.

## 2026-07-04 - MYOTT-S08-T10E

### 변경 내용

- TMDB option recommendation/discover에서 선택한 콘텐츠 타입을 후보 수집 단계부터 더 강하게 반영하도록 했습니다.
- 드라마/영화만 선택한 경우 animation genre를 제외하도록 `without_genres=16` 힌트를 추가했습니다.
- `/api/search` 요청에도 선택 콘텐츠 타입을 전달해 입력 seed 기반 추천에서도 타입 힌트가 유지되도록 했습니다.
- 클라이언트 scoring에서 선택 타입 불일치 결과에 강한 감산을 적용하고, 전체 타입 선택 상태에서는 타입 보너스를 주지 않도록 했습니다.
- Mock fallback에서 기존 `series` 타입이 드라마 선택과 호환되도록 보정했습니다.
- Related Picks 카드 높이를 키우고 제목/보조 문구가 각각 최대 2줄까지 자연스럽게 보이도록 조정했습니다.

### 이유

- 드라마 + 일본 선택 시 일본 애니메이션이 결과를 지배하면 콘텐츠 종류 선택에 대한 신뢰가 깨지기 때문입니다.
- 콘텐츠 타입은 국가/장르보다 우선해야 하며, 국가 옵션은 제작 국가 힌트로만 작동해야 하기 때문입니다.
- Related Picks 카드 텍스트가 잘리면 클릭/드래그 탐색 흐름이 어색해지기 때문입니다.

### 다음 작업

- Founder 로컬 TMDB 환경에서 드라마 + 일본, 영화 + 일본, 애니 + 일본 결과 분포를 실제 데이터로 확인합니다.
- 타입별 결과가 부족한 경우 어느 수준까지 fallback mismatch를 허용할지 별도 정책으로 정리합니다.

## 2026-07-04 - MYOTT-S08-T10D

### 변경 내용

- Related Picks 카드 높이를 고정하고 긴 제목은 최대 2줄 말줄임 처리되도록 했습니다.
- Related Picks 보조 문구도 한 줄 말줄임 처리해 카드 높이가 늘어나지 않도록 했습니다.
- 콘텐츠 타입 판정을 `contentTypeForUi`로 정리해 내부 `type`, `contentType`, TMDB `genreId 16` 기준으로 처리하도록 했습니다.
- option-only TMDB discover에서 animation genre 강제 적용은 애니만 단독 선택했을 때만 동작하도록 수정했습니다.
- 영화/드라마/애니 option recommendation route가 각각 정상 응답하는지 확인했습니다.

### 이유

- 긴 제목 때문에 Related Picks 카드 높이가 달라지면 독립 strip 탐색성이 깨지기 때문입니다.
- 기본 전체 선택 상태에서 animation genre가 과하게 적용되면 추천 결과가 애니메이션으로 쏠릴 수 있기 때문입니다.
- 드라마 선택은 TV discover/recommendation 경로를 우선해야 하며, 실패 시에만 Mock fallback으로 내려가야 하기 때문입니다.

### 다음 작업

- Founder 환경에서 실제 TMDB 응답 기준 영화/드라마/애니 선택별 결과 분포를 확인합니다.
- 필요한 경우 Sprint 8 후속에서 타입별 result mix policy를 별도 Task로 분리합니다.

## 2026-07-04 - MYOTT-S08-T10C

### 변경 내용

- Related Picks에 mouse drag 기반 scroll을 추가하고 grab/grabbing cursor를 적용했습니다.
- Related Picks는 기존 좌우 버튼과 trackpad/mobile swipe를 유지하면서 drag를 기본 탐색 UX로 보강했습니다.
- Quick Pick 검색창에 검색어 지우기 `×` 버튼과 ESC 초기화 동작을 추가했습니다.
- 옵션 검색 placeholder를 `SF, 일본, 긴장감처럼 검색`으로 바꿔 검색 대상을 더 명확히 했습니다.
- 장르 전용 더보기/접기 로직을 모든 option group에 적용 가능한 공통 expand rule로 바꿨습니다.
- 국가도 9개 이상 option group 규칙에 따라 기본 8개 표시 후 `+ 더보기` / `접기`가 동작하도록 했습니다.
- option group header에 Green 기반 좌측 accent와 간결한 header polish를 적용했습니다.

### 이유

- Related Picks는 화살표보다 마우스/손가락으로 직접 넘기는 흐름이 더 자연스럽기 때문입니다.
- 앞으로 배우, 감독, 언어, 제작사 등 option group이 늘어나도 동일한 UX Rule이 적용되어야 하기 때문입니다.
- 검색어를 쉽게 지울 수 있어야 옵션 탐색이 끊기지 않기 때문입니다.

### 다음 작업

- Founder 로컬 브라우저에서 drag/swipe 체감과 장르/국가 expand rule을 직접 확인합니다.
- option group이 더 늘어날 경우 동일 rule을 유지하면서 group별 대표 option 순서를 조정합니다.

## 2026-07-04 - MYOTT-S08-T10B

### 변경 내용

- Detail Layer의 Related Picks를 `/api/related` 기반으로 현재 작품의 recommendations/similar 결과를 먼저 사용하도록 변경했습니다.
- TMDB related 실패 시 Mock Provider 또는 기존 결과 배열 fallback으로 탐색 흐름이 유지되도록 했습니다.
- Related Picks에 좌우 이동 버튼과 scroll snap을 추가해 desktop/mobile 가로 탐색성을 개선했습니다.
- Quick Pick 장르 옵션은 기본 8개만 표시하고 `+ 장르 더보기` / `접기`를 지원하도록 했습니다.
- 국가 옵션을 대표 글로벌 국가 17개로 확장했습니다.
- Quick Pick 상단에 선택된 필터 chip 영역을 추가하고, chip의 `×` 클릭으로 즉시 해제되도록 했습니다.

### 이유

- 상세 작품과 실제로 연결된 추천을 보여줘야 Related Picks가 단순 결과 재사용이 아니라 연관 탐색처럼 느껴지기 때문입니다.
- 옵션이 늘어날수록 장르 접기와 선택 chip이 없으면 사용자가 선택 상태를 파악하기 어렵기 때문입니다.
- 글로벌 서비스를 고려하면 국가 옵션은 검색 가능한 충분한 후보를 가져야 하기 때문입니다.

### 다음 작업

- Founder 환경에서 TMDB 실제 related 결과 품질과 carousel 체감을 확인합니다.
- 국가 옵션은 제작 국가 기반 힌트이며, OTT 제공 지역/딥링크는 후속 Task로 분리합니다.

## 2026-07-04 - MYOTT-S08-T10A

### 변경 내용

- Quick Pick Layer에 옵션 검색 입력창을 추가했습니다.
- 장르/국가/분위기/러닝타임을 4개 Grid 영역으로 재배치하고, 모든 옵션을 동일한 chip UI로 정리했습니다.
- TMDB 장르 metadata의 긴 영어 label을 한국어 표시 label로 다듬었습니다.
- 입력 작품 없이 옵션만 선택해도 Provider 기반 옵션 추천을 요청하도록 `/api/recommend/options` 경로를 추가했습니다.
- TMDB option-only 추천은 genre id, country code, content type 기반 discover 힌트를 사용하도록 했습니다.
- Related Picks를 Detail Layer 내부가 아니라 Detail Layer 아래의 독립 strip으로 분리했습니다.

### 이유

- 옵션이 늘어날수록 검색과 균형 잡힌 레이아웃이 없으면 Quick Pick이 선택 도구가 아니라 긴 목록처럼 느껴지기 때문입니다.
- 장르/국가만 선택해도 실제 추천 흐름이 동작해야 Quick Pick이 더미 옵션처럼 보이지 않기 때문입니다.
- 상세 확인 후 다음 작품 탐색은 상세 정보 내부보다 별도 related strip에서 더 자연스럽게 이어지기 때문입니다.

### 다음 작업

- Founder 환경에서 TMDB discover 기반 option-only 추천 품질을 확인합니다.
- 국가 옵션은 제작 국가 기반 score/discover 힌트이며, OTT 제공처/지역 필터와는 별도로 후속 검토합니다.

## 2026-07-04 - MYOTT-S08-T10

### 변경 내용

- 추천 상태를 `idle`, `loading`, `success`, `empty`, `error`로 분리했습니다.
- 추천 요청 중에는 empty 문구 대신 `추천을 찾는 중입니다...` loading 상태를 표시하도록 했습니다.
- Detail Layer 하단에 현재 추천 결과를 재사용한 Related Picks 3~4개를 추가했습니다.
- `/api/options` metadata groups를 Quick Pick Layer에 반영해 TMDB 장르 옵션과 fallback 국가 옵션을 UI에 표시하도록 했습니다.
- TMDB genre metadata option은 `tmdbIds`, 국가 옵션은 option value 기반으로 scoring에 반영되도록 했습니다.

### 이유

- 추천 요청 직후 empty 문구가 잠깐 보이면 사용자가 오류로 오해할 수 있기 때문입니다.
- 상세 확인 후 다시 입력하지 않아도 마우스/터치로 다음 추천을 탐색할 수 있어야 하기 때문입니다.
- Sprint 8의 option metadata foundation이 실제 추천 UI와 scoring 흐름에 연결되어야 하기 때문입니다.

### 다음 작업

- Founder 환경에서 TMDB 장르 metadata가 실제 UI에 표시되는지 확인합니다.
- 미국/일본 국가 옵션은 현재 정확 필터가 아니라 score 보정이므로 실제 제공처/국가 필터는 후속으로 분리합니다.

## 2026-07-04 - MYOTT-S08-T09A

### 변경 내용

- 추천 이유의 seed 제목에 붙는 `을/를` 조사를 ko-KR 표시 helper로 자동 선택하도록 했습니다.
- seed 제목 끝의 마침표, 공백, 특수문자를 표시 문구 판단 전에 정리하도록 했습니다.
- 여러 seed에서 반복 등장한 결과는 공통 취향 추천 문구가 우선되도록 유지하고, 단일 seed 결과는 seed별 라운드로빈으로 분산되도록 보정했습니다.
- 자동완성 debounce를 300ms에서 150ms로 줄이고, 동일 query에 대한 브라우저 메모리 cache를 추가했습니다.

### 이유

- `태조 왕건를`, `너의 이름은.를` 같은 문구는 추천 신뢰감을 떨어뜨리기 때문입니다.
- 여러 작품을 많이 입력했을 때 결과가 특정 seed에만 몰리면 전체 취향을 반영하지 못한다고 느껴지기 때문입니다.
- 자동완성은 seed 입력 품질을 높이는 기능이므로 체감 속도가 추천 경험에 직접 영향을 주기 때문입니다.

### 다음 작업

- Founder 환경에서 9개 입력 기준 seed 분포와 상단 추천 납득도를 확인합니다.
- 자동완성 cache가 실제 TMDB 후보 표시 체감을 얼마나 개선하는지 확인합니다.

## 2026-07-03 - MYOTT-S08-T09

### 변경 내용

- 추천받기 submit 시 현재 입력창 전체 값을 다시 수집해 추천을 재계산하도록 했습니다.
- seed 입력을 3개로 제한하던 `slice(0, 3)`을 제거해 작품 4, 5, 6도 추천 요청에 반영되도록 했습니다.
- 추천 결과 목표 수를 8개에서 12개로 늘리고, TMDB recommendations/similar 수집 한도도 12개로 맞췄습니다.
- OTT 선택값과 콘텐츠 종류 선택값을 rule-based score와 Recommendation Insight에 반영했습니다.
- Codex 개발 포트 정책을 `3001` 기본으로 정리하고, TMDB fetch 실패 원인을 TLS 인증서 검증 문제로 기록했습니다.

### 이유

- 입력이나 옵션을 바꿨는데 결과가 그대로 보이면 사용자는 추천 엔진이 다시 계산되지 않는다고 느끼기 때문입니다.
- OTT 제공처 데이터는 아직 완전한 필터로 보기 어렵지만, 가능한 범위에서 우선순위 보정에는 활용할 수 있기 때문입니다.

### 다음 작업

- Founder 환경에서 작품 4~5 추가 후 결과가 실제로 바뀌는지 확인합니다.
- 정확한 OTT 제공처 필터와 deep link는 TMDB/JustWatch 데이터 품질 검토 후 별도 Task로 분리합니다.

## 2026-07-03 - MYOTT-S08-T08

### 변경 내용

- Detail Layer의 Recommendation Reason 아래에 Recommendation Insight 영역을 추가했습니다.
- Insight는 최대 3개의 짧은 bullet로 표시하고, insight가 없으면 영역을 숨기도록 했습니다.
- multi-seed, genre match, option match, content type, metadata tie-break처럼 실제 scoring에 사용된 근거만 문장으로 변환했습니다.
- score 숫자는 화면에 노출하지 않고, 사용자에게 이해 가능한 추천 근거만 표시하도록 했습니다.

### 이유

- 사용자가 “왜 이 작품이 위에 있는지”를 빠르게 이해하고 추천을 더 신뢰할 수 있어야 하기 때문입니다.
- MyOTT는 과장된 추천 이유가 아니라 실제 계산 근거에 기반한 설명을 제공해야 하기 때문입니다.

### 다음 작업

- Founder 환경에서 실제 TMDB 결과의 Insight 문장이 Recommendation Reason보다 과하지 않은지 확인합니다.
- 사용자 기반 추천 근거는 실제 사용자 데이터가 추가된 뒤 별도 Task로 다룹니다.

## 2026-07-03 - MYOTT-S08-T07

### 변경 내용

- Provider 추천 결과에 rule-based score를 부여하고 score 기준으로 정렬하도록 했습니다.
- 동일 결과가 여러 seed에서 반복 등장하면 seed count를 반영해 우선순위를 높였습니다.
- TMDB `genreIds`와 seed `genreIds`를 보존해 표시 문구와 분리된 scoring metadata를 사용하도록 했습니다.
- Quick Pick 장르/분위기/국가/러닝타임 및 콘텐츠 타입 선택이 추천 점수에 반영되도록 했습니다.
- score가 같을 때 TMDB popularity, rating, match 값을 보조 정렬로 사용하도록 했습니다.

### 이유

- 여러 입력 작품과 추천 옵션이 실제 추천 결과 순서에 반영되는지 사용자가 느낄 수 있어야 하기 때문입니다.
- 추천 엔진 1.0은 복잡한 AI보다 설명 가능한 규칙 기반 정렬에서 시작하는 것이 MVP에 더 적합하기 때문입니다.

### 다음 작업

- Founder 환경에서 `인터스텔라`, `라라랜드`, `너의 이름은` multi-seed 결과의 상단 품질을 확인합니다.
- 실제 TMDB recommendations 품질에 따라 점수 가중치와 장르/타입 반영 비율을 조정합니다.

## 2026-07-03 - MYOTT-S08-T06A

### 변경 내용

- 자동완성 후보창이 외부 영역 클릭 시 닫히도록 했습니다.
- ESC 키와 추천받기 submit 시 열린 후보창이 닫히도록 했습니다.
- 다른 작품 입력창으로 이동하면 이전 입력창 후보창이 닫히도록 했습니다.
- 후보창이 닫혀도 사용자가 직접 입력한 텍스트는 유지되도록 했습니다.
- 후보를 클릭한 입력값은 내부적으로 confirmed seed 상태로 구분할 수 있게 했습니다.

### 이유

- 후보창이 화면에 남아 다음 입력이나 추천 실행을 방해하지 않도록 하기 위해서입니다.
- 자동완성이 추천 품질을 돕는 보조 기능으로 동작하되, 사용자가 직접 입력한 값은 잃지 않아야 하기 때문입니다.

### 다음 작업

- Founder 환경에서 모바일 터치 시 후보창 닫힘과 선택 동작을 확인합니다.
- 선택된 seed 상태를 향후 추천 품질 개선에 활용할지 별도 Task에서 판단합니다.

## 2026-07-03 - MYOTT-S08-T06

### 변경 내용

- `/api/suggest?q=` route를 추가해 TMDB Search 기반 작품 후보를 최대 8개 반환하도록 했습니다.
- 좋아하는 작품 입력창에 300ms debounce 자동완성을 추가했습니다.
- 각 입력창이 독립적으로 후보를 표시하고, 후보 클릭 시 정확한 TMDB 제목이 입력되도록 했습니다.
- TMDB suggest 실패 시 후보를 표시하지 않고 기존 추천 흐름은 유지하도록 했습니다.
- README에 자동완성 API와 Sprint 8 진행 상태를 반영했습니다.

### 이유

- 사용자가 작품명을 정확히 기억하지 못해도 원하는 seed 작품을 선택할 수 있어야 추천 품질이 안정되기 때문입니다.
- TMDB 실제 데이터 기반 추천에서 입력값 품질이 추천 결과 품질로 바로 이어지기 때문입니다.

### 다음 작업

- Founder 환경에서 `인터`, `라라`, `너의`, `인터스탤` 입력 후보 품질을 확인합니다.
- 오타 보정은 TMDB Search 품질에 의존하므로 부족하면 별도 fuzzy matching 전략을 검토합니다.

## 2026-07-03 - MYOTT-S08-T05

### 변경 내용

- TMDB movie/tv 장르 목록을 가져오는 metadata 기반을 추가했습니다.
- TMDB 장르를 기존 추천옵션 UI에 연결 가능한 `[value, label]` 형태와 상세 metadata 형태로 정규화했습니다.
- 국가/언어 옵션은 fallback metadata로 준비해 향후 확장 지점을 만들었습니다.
- `/api/options` route를 추가해 TMDB metadata fetch 실패 시 기존 fallback 옵션을 반환하도록 했습니다.
- README에 Sprint 8 진행 상태와 옵션 metadata API를 반영했습니다.

### 이유

- 추천옵션이 정적인 하드코딩 값에 머물지 않고 TMDB 실제 metadata와 연결될 수 있어야 하기 때문입니다.
- 이후 입력 작품, 추천옵션, TMDB 장르/국가/언어 데이터를 함께 사용해 추천 점수 계산으로 확장하기 위한 기반이 필요하기 때문입니다.

### 다음 작업

- TMDB metadata를 실제 추천 점수 계산에 어느 수준까지 반영할지 별도 Task로 판단합니다.
- 기존 Quick Pick UI는 유지하면서 metadata 기반 옵션 노출 범위를 Founder Review로 결정합니다.

## 2026-07-03 - MYOTT-S08-T04

### 변경 내용

- TMDB Provider가 입력값을 먼저 seed 작품으로 찾은 뒤 `/recommendations` 결과를 반환하도록 개선했습니다.
- recommendations 결과가 부족하면 `/similar` 결과를 fallback으로 병합하도록 했습니다.
- seed 원본은 추천 결과에서 제외하고, TMDB 추천/similar 결과 내 중복도 제거하도록 했습니다.
- 기존 `/api/search`, Provider Registry, Decision Card, Detail Layer 구조는 유지했습니다.

### 이유

- 제목 검색 결과를 추천처럼 보여주는 구조에서 벗어나, 입력 작품과 실제로 관련된 TMDB 추천 결과를 보여주기 위해서입니다.
- `인터스텔라` 입력 시 인터스텔라 제목 검색 결과가 아니라 관련 SF/드라마 추천이 나오도록 기반을 만들기 위해서입니다.

### 다음 작업

- Founder 환경에서 `인터스텔라`, `라라랜드`, `너의 이름은` multi-input 추천 품질을 확인합니다.
- Hero Recommendation은 아직 Mock 고정입니다.
- TMDB 추천 품질은 TMDB 데이터에 의존하며, OTT 제공처 직접 이동은 후순위입니다.

## 2026-07-03 - MYOTT-S08-T03

### 변경 내용

- 여러 작품 입력값의 TMDB 검색 결과를 각각 가져와 중복 제거 후 라운드로빈 방식으로 병합하도록 개선했습니다.
- Provider 결과 목표 수를 8개로 늘려 한 작품 검색 결과에만 치우치지 않도록 했습니다.
- 입력 작품은 seed/preference로만 사용하고, 결과에서는 title/originalTitle이 seed와 같은 원본 작품을 제외하도록 보강했습니다.
- 각 결과에 `reasonSeed`를 붙여 특정 seed 기반 결과는 `{seed}를 좋아했다면 추천`, 복합 결과는 `여러 취향을 함께 반영한 추천`으로 정리했습니다.
- Quick Pick 옵션을 결과 정렬과 추천 이유 문구에 가볍게 반영했습니다.
- Decision Card 상단 이미지는 TMDB `backdrop`을 우선 사용하고, Detail Layer는 poster/backdrop fallback을 유지하도록 정리했습니다.

### 이유

- 여러 작품을 입력해도 첫 번째 입력값만 반영된 것처럼 보이면 실제 추천 서비스처럼 느껴지지 않기 때문입니다.
- TMDB poster 세로 이미지가 카드 상단 비율과 맞지 않아 제품 완성도가 떨어져 보이는 문제를 줄이기 위해서입니다.

### 다음 작업

- Founder 환경에서 `인터스텔라`, `라라랜드`, `너의 이름은`을 함께 입력했을 때 결과가 고르게 섞이는지 확인합니다.
- 입력한 원본 작품이 추천 결과에 다시 노출되지 않는지 확인합니다.
- Hero Recommendation은 아직 Mock 고정이므로 별도 Sprint에서 실제 데이터 연결 여부를 판단합니다.

## 2026-07-03 - MYOTT-S08-T02

### 변경 내용

- TMDB 검색 결과의 제목, 원제, 타입, 연도, 평점, 줄거리, 포스터 URL 정규화를 보강했습니다.
- `genre_ids` 기반 장르 fallback을 추가해 상세 조회가 부족한 결과도 장르 표시가 깨지지 않도록 했습니다.
- 검색어와 제목의 관련도가 높은 결과가 먼저 오도록 TMDB 결과 정렬을 개선했습니다.
- Decision Card와 Detail Layer의 기존 poster 영역에서 실제 TMDB 포스터 이미지를 표시하도록 했습니다.

### 이유

- 실제 TMDB 결과가 표시되더라도 포스터, 장르, 정렬 품질이 불완전하면 추천 신뢰가 떨어지기 때문입니다.
- 기존 UX와 Provider Registry 구조를 유지하면서 실제 데이터 품질만 높이기 위해서입니다.

### 다음 작업

- Founder 환경에서 `interstellar` 검색 시 원작 영화가 최상단에 오는지 확인합니다.
- 포스터가 없는 TMDB 결과에서도 fallback visual이 유지되는지 확인합니다.

## 2026-07-03 - MYOTT-S08-T01B

### 변경 내용

- 프론트엔드가 `/api/search` 응답 전체가 아니라 `results` 배열을 추천 카드 상태로 사용하도록 바인딩을 보강했습니다.
- TMDB 응답의 `source`, `providerId`, `providerName`, `tmdbEnabled`, fallback 상태를 같은 검색 응답 기준으로 dev 표시와 충돌 없이 반영하도록 정리했습니다.
- TMDB 결과가 있으면 기존 더미 추천이 우선 표시되지 않도록 타입 필터 fallback을 완화했습니다.

### 이유

- API에서는 TMDB 실제 결과가 정상 반환되지만 메인 화면 카드/상세 Layer에 실제 결과가 충분히 반영되지 않는 문제를 해결하기 위해서입니다.
- Provider/API/TMDB/Mock 구조와 기존 UI는 유지하면서 프론트 상태 연결만 바로잡기 위해서입니다.

### 다음 작업

- Founder가 `interstellar` 입력 후 화면 카드와 `/api/search` 결과가 일치하는지 확인합니다.
- 실제 TMDB 데이터에서 빈 필드가 많은 작품의 표시 품질을 후속으로 점검합니다.

## 2026-07-03 - MYOTT-S08-T01

### 변경 내용

- 작품 입력이 있을 때 메인 추천 흐름이 `/api/search` Provider 결과를 우선 사용하도록 연결했습니다.
- TMDB/Mock Provider 결과를 기존 Decision Card와 Detail Layer가 읽는 데이터 형태로 정규화했습니다.
- Provider 검색 실패나 결과 부족 시 기존 Mock 기반 추천 결과로 fallback하도록 유지했습니다.
- README, PROJECT_STATUS, TASK_HISTORY를 Sprint 8 / MYOTT-S08-T01 기준으로 업데이트했습니다.

### 이유

- Sprint 5~7에서 검증한 Decision/Trust UX를 유지한 채 실제 TMDB 검색 결과에서도 같은 추천 경험이 가능한지 확인하기 위해서입니다.
- UI와 Provider Registry 구조를 바꾸지 않고 실제 데이터 연결만 검증해야 하기 때문입니다.

### 다음 작업

- Founder 환경에서 TMDB API key가 있는 상태의 실제 검색 결과를 확인합니다.
- TMDB 실패 또는 key 없음 상태에서 Mock fallback이 같은 UX로 표시되는지 확인합니다.

## 2026-07-03 - MYOTT-S07-T03

### 변경 내용

- Recommendation Card의 CTA 문구를 `신뢰 단서 보기`로 다듬었습니다.
- Detail Layer의 Recommendation Reason, Trust Signal, 줄거리 사이 간격과 강조 수준을 조정했습니다.
- Detail Layer 하단에 실제 링크 없이 `볼 수 있는 OTT` 정보를 정리해 다음 확인 지점을 명확히 했습니다.
- README, PROJECT_STATUS, TASK_HISTORY를 Sprint 7 / MYOTT-S07-T03 기준으로 업데이트했습니다.

### 이유

- 추천을 이해하고 신뢰한 뒤 마지막 선택으로 이어지는 시각적 흐름을 더 자연스럽게 만들기 위해서입니다.
- 새 기능이나 실제 데이터 연결 없이 현재 MVP의 결정 경험을 마감하기 위해서입니다.

### 다음 작업

- Founder가 추천 카드에서 상세, OTT 확인 정보까지 흐름이 끊기지 않는지 확인합니다.
- 실제 OTT 이동 기능은 별도 Sprint에서 데이터/정책과 함께 검토합니다.

## 2026-07-03 - MYOTT-S07-T02

### 변경 내용

- Detail Layer의 Recommendation Confidence 영역을 `Trust Signal` 구조로 개선했습니다.
- 단순 chip 문구를 `취향 연결`, `대표 장르`, `콘텐츠 타입`, `감상 단서` 슬롯으로 정리했습니다.
- 실제 지표로 오해될 수 있는 순위, 사용자 수, 인기 수치 표현은 사용하지 않았습니다.
- Recommendation Reason의 우선순위는 유지하고 Trust Signal은 보조 정보로 배치했습니다.

### 이유

- 추천 이유를 이해한 뒤에도 사용자가 선택을 믿을 마지막 근거가 필요했기 때문입니다.
- 향후 TMDB 평점, 인기 지표, 장르, 콘텐츠 타입 같은 실제 데이터가 연결될 수 있는 UI 슬롯이 필요하기 때문입니다.

### 다음 작업

- Founder가 Trust Signal이 추천 이유를 방해하지 않는지 확인합니다.
- 실제 데이터처럼 오해될 표현이 없는지 계속 점검합니다.

## 2026-07-02 - MYOTT-S07-T01

### 변경 내용

- 상세 Layer에 `추천 신뢰 단서` 영역을 추가했습니다.
- 현재 선택과 작품 정보에서 읽은 정성적 단서를 chip 형태로 표시하도록 했습니다.
- 실제 순위, 사용자 수, 랭킹처럼 사실로 오해될 수 있는 정보는 표시하지 않았습니다.
- 추천 이유의 우선순위는 유지하고 Confidence는 보조 정보로 배치했습니다.
- README, PROJECT_STATUS, TASK_HISTORY를 Sprint 7 / MYOTT-S07-T01 기준으로 업데이트했습니다.

### 이유

- Founder Acceptance Test에서 추천 이유는 이해되지만 추천을 믿고 선택할 마지막 근거가 부족하다는 관찰이 있었기 때문입니다.
- 실제 데이터 연결 전에도 Recommendation Confidence UI 구조를 준비할 필요가 있기 때문입니다.
- Provider/API/TMDB/Mock Provider/추천 알고리즘을 건드리지 않고 신뢰감을 보강하기 위해서입니다.

### 다음 작업

- Founder가 Confidence 문구가 추천 이유를 방해하지 않는지 확인합니다.
- 실제 데이터로 오해할 표현이 없는지 검토합니다.
- 향후 TMDB 평점, 인기 순위, 사용자 데이터가 연결될 수 있는 기준을 별도 Task로 정리합니다.

## 2026-07-02 - MYOTT-S06-T05

### 변경 내용

- Decision Card 하단에 `상세 보기` 힌트를 추가해 카드가 다음 행동으로 이어지는 요소임을 더 명확히 했습니다.
- 카드 내부 배치를 flex 기반으로 정리해 추천 이유, 핵심 정보, 상세 보기 힌트의 정렬을 안정화했습니다.
- 상세 Layer에서 `추천 이유`를 줄거리보다 먼저 보여주도록 정보 계층을 조정했습니다.
- 상세 Layer의 추천 이유 영역을 카드와 같은 시각 언어로 강조했습니다.
- README, PROJECT_STATUS, TASK_HISTORY를 Sprint 6 / MYOTT-S06-T05 기준으로 업데이트했습니다.

### 이유

- 사용자가 추천 결과를 본 뒤 다음 행동을 고민하지 않고 상세 확인으로 이어져야 하기 때문입니다.
- Sprint 6의 마지막 polish에서는 기능보다 일관성과 신뢰감을 우선해야 하기 때문입니다.
- Provider/API/아키텍처를 유지하면서 Decision Experience의 마지막 UX 마찰만 줄이기 위해서입니다.

### 다음 작업

- Founder가 추천, 입력, 결과, 상세 흐름을 처음 보는 사용자 관점에서 검토합니다.
- 10초/30초 Time Validation으로 다음 행동을 고민하는 지점이 남아 있는지 확인합니다.
- Sprint 6 이후 Provider 검색 결과와 Recommendation Experience 연결 방식을 별도 Task로 정리합니다.

## 2026-07-02 - MYOTT-S06-T04

### 변경 내용

- Hero Recommendation, 입력 영역, 추천 결과 영역의 문구 흐름을 최종 점검했습니다.
- 사용자에게 보이는 `더미` 표현을 제거해 MVP 첫인상이 더 자연스럽게 느껴지도록 정리했습니다.
- Decision Card의 높이, 제목 줄바꿈, 배지, 핵심 정보 그리드를 안정적으로 보이게 다듬었습니다.
- 모바일 화면에서 카드 높이와 sticky action 영역 여백을 조정했습니다.
- README, PROJECT_STATUS, TASK_HISTORY를 Sprint 6 / MYOTT-S06-T04 기준으로 업데이트했습니다.

### 이유

- 새 기능보다 현재 MVP의 완성도와 첫인상이 더 중요한 전환점이기 때문입니다.
- 사용자가 Hero Recommendation에서 입력, 추천 결과로 이어지는 흐름을 설명 없이 이해해야 하기 때문입니다.
- Provider/API/아키텍처를 건드리지 않고 Decision Experience의 마감감을 높이기 위해서입니다.

### 다음 작업

- Founder가 첫 화면에서 멈추는 순간이 줄었는지 확인합니다.
- 10초/30초 Time Validation으로 추천 이해 속도를 점검합니다.
- Sprint 6 이후 Provider 검색 결과와 Recommendation Experience의 연결 방식을 검토합니다.

## 2026-07-02 - MYOTT-S06-T03

### 변경 내용

- Hero 카드 제목을 사용자 언어로 다듬었습니다.
- Hero 추천 이유 문구를 한 줄 안에서 이해하기 쉬운 표현으로 줄였습니다.
- Hero Recommendation 아래에 입력 영역으로 이어지는 짧은 안내 문구를 추가했습니다.
- 추천 CTA를 `내 취향으로 추천받기`로 변경했습니다.
- Hero 카드 간격, 제목 계층, 텍스트 밀도를 조정했습니다.

### 이유

- 첫 화면에서 사용자가 어디부터 보면 좋을지 덜 고민하게 만들기 위해서입니다.
- Hero Recommendation을 본 뒤 기존 입력 방식으로 자연스럽게 이어져야 하기 때문입니다.
- 새 기능 없이 제품 감각과 첫 이해 속도를 높이기 위해서입니다.

### 다음 작업

- Founder가 첫 화면만 보고 서비스 목적을 이해하는지 확인합니다.
- Hero에서 입력까지 흐름이 끊기지 않는지 Time Validation을 진행합니다.
- Provider 검색 결과와 Recommendation Experience 연결 방식을 후속 Task로 검토합니다.

## 2026-07-02 - MYOTT-S06-T02

### 변경 내용

- 메인 화면 최상단에 Hero Recommendation 영역을 추가했습니다.
- Hero Recommendation은 `오늘의 추천`, `지금 인기 작품`, `지금 시간대 추천` 3개 카드만 표시합니다.
- 기존 Decision Card 컴포넌트를 재사용해 Hero Recommendation과 일반 추천 결과 카드의 구조를 통일했습니다.
- 시간대 추천은 현재 시간 기준의 임시 로직으로 선택되도록 했습니다.
- README, PROJECT_STATUS, TASK_HISTORY를 Sprint 6 / MYOTT-S06-T02 기준으로 업데이트했습니다.

### 이유

- 처음 방문한 사용자가 입력 없이도 MyOTT의 추천 가치를 바로 이해해야 하기 때문입니다.
- 선택지를 늘리는 것이 아니라 첫 추천 경험을 더 빠르게 제공하기 위해서입니다.
- 기존 Provider Foundation과 추천 버튼 이후 흐름을 건드리지 않고 첫 화면 경험만 개선하기 위해서입니다.

### 다음 작업

- Founder가 첫 화면에서 5초 안에 서비스 목적을 이해하는지 확인합니다.
- Hero Recommendation이 30초 안 첫 성공 경험을 만드는지 Time Validation을 진행합니다.
- Provider 검색 결과와 Hero/Decision Card 연결 방식을 별도 Task로 검토합니다.

## 2026-07-02 - MYOTT-S06-T01

### 변경 내용

- 추천 결과 카드를 Decision Card MVP 형태로 개선했습니다.
- 카드 상단에 사람이 바로 이해할 수 있는 추천 이유를 가장 먼저 표시했습니다.
- 카드 정보는 포스터, 제목, 추천 이유, 장르, 러닝타임, 평점, OTT Provider로 축소했습니다.
- 감독, 주요 배우, 매치 퍼센트처럼 즉시 결정에 덜 필요한 정보는 추천 카드에서 제거했습니다.
- README, PROJECT_STATUS, TASK_HISTORY를 Sprint 6 시작 상태로 업데이트했습니다.

### 이유

- 사용자가 추천 결과를 보고 왜 추천되었는지 빠르게 이해해야 선택 시간이 줄어들기 때문입니다.
- Sprint 6의 목표는 추천 기능 자체가 아니라 더 빠른 결정을 돕는 경험을 만드는 것입니다.
- Provider Foundation은 유지하면서 UI/UX만 개선하기 위해서입니다.

### 다음 작업

- Founder가 10초/30초 Time Validation을 직접 확인합니다.
- Decision Card가 실제 선택 시간을 줄이는지 피드백을 수집합니다.
- 추천 결과와 Provider 검색 결과 연결 방식을 다음 Task로 검토합니다.

## 2026-07-02 - MYOTT-S05-T06

### 변경 내용

- 개발 환경에서 현재 사용 중인 Provider를 확인할 수 있는 Provider Status Indicator를 추가했습니다.
- Provider Badge에 `Data Source`와 `Fallback` 여부를 작게 표시하도록 했습니다.
- `/api/search` 응답 메타를 활용해 Mock Provider, TMDB Provider, fallback 상태를 구분할 수 있게 했습니다.
- README, PROJECT_STATUS, TASK_HISTORY를 Sprint 5 종료 상태로 업데이트했습니다.
- PROJECT_STATUS에 Sprint 5 Retrospective를 추가했습니다.

### 이유

- Sprint 5에서 구축한 Provider Foundation이 실제로 어떤 data source를 사용하는지 UI에서 즉시 확인할 수 있어야 하기 때문입니다.
- Sprint 6부터 Recommendation Experience에 집중하기 전 Provider 기반 구조를 검증 가능한 상태로 닫기 위해서입니다.
- 개발 편의 기능이므로 Production UI에는 노출하지 않는 방향이 적절하기 때문입니다.

### 다음 작업

- 유효한 TMDB key가 있는 Founder 환경에서 TMDB Provider 표시를 확인합니다.
- Sprint 6 Recommendation Experience 범위를 확정합니다.
- Provider 검색 결과와 메인 추천 UX를 연결할지 별도 Task로 설계합니다.

## 2026-07-02 - MYOTT-S05-T05

### 변경 내용

- 좋아하는 작품 입력창이 기본 3개로 시작하고 마지막 입력창에 값이 들어가면 새 입력창이 자동 생성되도록 개선했습니다.
- 동적 입력창에서 빈 입력창이 여러 개 누적되지 않도록 정리했습니다.
- 메인 페이지에 `전체 초기화` 버튼을 추가했습니다.
- Quick Pick Layer 안에 `옵션 초기화` 버튼을 추가했습니다.
- README, PROJECT_STATUS, TASK_HISTORY를 Sprint 5 / MYOTT-S05-T05 기준으로 업데이트했습니다.

### 이유

- 사용자가 좋아하는 작품 입력 개수에 제한을 덜 느끼고 자연스럽게 더 많은 취향 신호를 입력할 수 있어야 하기 때문입니다.
- Quick Pick과 추천 결과를 여러 번 실험한 뒤 처음 상태로 빠르게 돌아갈 수 있어야 하기 때문입니다.
- Provider Foundation은 유지하면서 Product UX만 개선하기 위해서입니다.

### 다음 작업

- Founder가 동적 입력과 초기화 UX를 직접 확인합니다.
- Sprint 6로 넘어가기 전 Provider 선택 정책과 실제 TMDB key 확인 범위를 정리합니다.
- 추천 결과와 입력 데이터가 실제 Provider/API 흐름과 연결되는 시점을 별도 Task로 검토합니다.

## 2026-07-01 - MYOTT-S05-T04

### 변경 내용

- `src/lib/providers/tmdb/provider.js`에 TMDB Provider Adapter를 구현했습니다.
- Provider Registry에 TMDB Provider를 등록하고 active provider 선택을 추가했습니다.
- `/api/search`가 `lib/tmdb.js`를 직접 import하지 않고 Provider Registry를 통해 검색하도록 리팩터링했습니다.
- TMDB 결과를 Unified Content Model 필드와 기존 호환 alias로 보강했습니다.
- TMDB key 없음 또는 TMDB 검색 실패 시 Mock Provider fallback을 유지했습니다.

### 이유

- 사용자는 Provider가 Mock인지 TMDB인지 알 필요 없이 동일한 검색 경험을 가져야 하기 때문입니다.
- Sprint 5의 목표는 추천 엔진 자체가 아니라 Provider 교체 가능한 기반을 검증하는 것입니다.
- API route의 직접 TMDB 의존을 줄여 Sprint 6에서 Provider 확장과 실제 추천 엔진 연결로 이어가기 위해서입니다.

### 다음 작업

- TMDB key가 있는 Founder 환경에서 실제 검색 경로를 확인합니다.
- Provider 선택 정책을 환경변수로 제어할지 검토합니다.
- Sprint 6에서 TMDB detail/recommendation provider 확장 범위를 정합니다.

## 2026-07-01 - MYOTT-S05-T03

### 변경 내용

- `src/lib/providers/mock/`에 Mock Provider를 구현했습니다.
- `src/lib/providers/registry.js`에 최소 Provider Registry를 추가했습니다.
- `/api/search`가 TMDB API key 없음 또는 TMDB 검색 실패 시 Mock Provider 결과로 fallback하도록 연결했습니다.
- Mock Provider가 Unified Content Model과 기존 호환 alias를 함께 반환하도록 정리했습니다.
- README, Provider Architecture 문서, PROJECT_STATUS, TASK_HISTORY를 Sprint 5 상태로 업데이트했습니다.

### 이유

- Sprint 5의 목표는 AI 추천 구현이 아니라 추천 엔진을 연결할 수 있는 Provider 기반 구조를 검증하는 것이기 때문입니다.
- 외부 API key 없이도 local verification에서 검색 API가 안정적으로 동작해야 합니다.
- UI 수정 없이 Provider를 교체할 수 있어야 이후 TMDB Provider adapter로 자연스럽게 확장할 수 있습니다.

### 다음 작업

- Founder가 local verification checklist를 직접 확인합니다.
- TMDB Provider adapter 전환 범위를 다음 Task로 분리합니다.
- Provider Registry의 provider 선택 정책과 환경변수 제어 여부를 검토합니다.

## 2026-07-01 - APS-003

### 변경 내용

- MyOTT public repository에서 APS 핵심 운영 문서 5개를 제거했습니다.
- README에 `Built with APS.` 문구와 Source of Truth가 private Platform repository `cnd1026/Nd_core`라는 설명을 남겼습니다.
- `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, `DEVELOPMENT_RULES.md`, `AI_COLLABORATION.md`에서 삭제된 APS 핵심 문서 직접 링크를 제거했습니다.
- `APS_PUBLIC_NOTICE.md`와 `APS_MIGRATION_PLAN.md`를 Remove 완료 상태에 맞게 업데이트했습니다.
- `TASK_HISTORY.md`에 APS-003 기록을 추가했습니다.

### 이유

- Products create value. Platform multiplies value.
- MyOTT는 고객을 위한 Product repository이고, APS 핵심 운영 문서는 회사 자산으로 보존해야 하는 Platform knowledge이기 때문입니다.
- 공개 저장소에는 APS를 사용했다는 자연스러운 브랜드 참조만 남기고, 핵심 운영 방식은 Nd_core에서 관리하는 것이 Product / Platform 분리 원칙에 맞습니다.

### 다음 작업

- Nd_core의 `APS_MIGRATION_STATUS.md`에 Remove 완료 상태를 기록합니다.
- MyOTT Product Development를 재개합니다.
- Mock Provider / Provider 전환 작업을 다시 진행할지 결정합니다.

## 2026-07-01 - MYOTT-SEC-01

### 변경 내용

- `docs/project/APS_PUBLIC_NOTICE.md` 문서를 새로 추가했습니다.
- `docs/project/APS_MIGRATION_PLAN.md` 문서를 새로 추가했습니다.
- README의 Project Memory System 섹션에서 APS 핵심 문서 직접 링크 노출을 완화했습니다.
- `PROJECT_STATUS.md`에 현재 Task와 다음 Task를 APS private repository 이전 준비 기준으로 업데이트했습니다.
- `TASK_HISTORY.md`에 MYOTT-SEC-01 기록을 추가했습니다.

### 이유

- APS는 MyOTT뿐 아니라 향후 프로젝트와 『AI와 함께 서비스를 만드는 방법』에 활용될 핵심 운영체계 자산이기 때문입니다.
- 공개 저장소에는 MyOTT 개발에 필요한 최소 참조만 유지하고, APS 상세 문서는 private repository에서 관리하는 편이 적절합니다.
- Git history rewrite 없이 현재 공개 저장소에서 가능한 정리와 이전 준비를 먼저 수행하기 위해서입니다.

### 다음 작업

- APS private repository를 생성합니다.
- APS 핵심 문서를 private repository로 백업/이전합니다.
- 이전 후 공개 저장소의 핵심 APS 문서 삭제 여부를 별도 보안 Task로 판단합니다.

## 2026-07-01 - MYOTT-S50-T01

### 변경 내용

- `docs/project/APS_STANDARD.md` 문서를 새로 추가했습니다.
- APS Task ID 규칙과 Codex Mode 기준을 문서화했습니다.
- `docs/project/TASK_HISTORY.md`에 기존 Task ID를 소급 적용했습니다.
- `docs/project/DEVELOPMENT_RULES.md`에 Task ID와 Codex Mode 운영 기준을 반영했습니다.
- README, `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`를 Sprint 5.0 Standardization / MYOTT-S50-T01 기준으로 동기화했습니다.

### 이유

- Sprint와 Foundation 문서가 늘어나면서 Task 식별 체계를 표준화할 필요가 있었기 때문입니다.
- Codex Mode가 작업 위험도와 검증 수준을 나타내는 운영 기준으로 쓰이기 시작했으므로 명확한 기준이 필요했습니다.
- 새 PM이 TASK_HISTORY만 읽어도 각 작업의 위치와 성격을 일관되게 이해할 수 있어야 했습니다.

### 다음 작업

- MYOTT-S50-T01 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- 다음 Provider 구현 Task부터 APS Task ID를 기본 표기로 사용합니다.
- Task Template과 Review Template 분리 여부를 검토합니다.

## 2026-07-01 - Task 5-2

### 변경 내용

- `docs/architecture/provider-architecture.md`에 MyOTT 공통 콘텐츠 모델 필수 필드를 추가했습니다.
- Mock Provider가 반환할 샘플 검색/상세 응답 구조를 문서화했습니다.
- 현재 `app/api/search/route.js`가 `lib/tmdb.js`를 직접 import하는 구조를 확인하고 문서에 기록했습니다.
- 다음 Task에서 Mock Provider를 구현하기 위한 단계와 호환 alias 전략을 정리했습니다.
- Provider Registry는 이번 Task에서 구현하지 않고 다음 구현 이후 별도 판단하는 것으로 정리했습니다.
- `PROJECT_STATUS.md`와 `TASK_HISTORY.md`를 Task 5-2 기준으로 업데이트했습니다.

### 이유

- Mock Provider 구현 전에 공통 콘텐츠 모델과 기존 TMDB 직접 의존 구조를 먼저 합의해야 하기 때문입니다.
- Provider Registry를 성급히 도입하면 Provider 선택 정책과 fallback 범위가 커져 MVP 전환 단계가 흐려질 수 있습니다.
- 다음 Task에서 코드 변경을 최소화하고 안전하게 Mock Provider를 추가할 수 있도록 전환 단계를 분리하기 위해서입니다.

### 다음 작업

- Task 5-2 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- Task 5-3에서 Mock Provider 파일 구조를 실제로 추가합니다.
- Mock Provider 구현 후 API route 전환 방식을 최소 변경으로 검증합니다.

## 2026-07-01 - Task 5-1b

### 변경 내용

- README의 Current Sprint를 Foundation Sprint에서 Sprint 5로 동기화했습니다.
- README 실행 방법을 현재 저장소 루트 기준 `pnpm install`, `pnpm dev`로 정리했습니다.
- `docs/project/PROJECT_CONTEXT.md`와 `docs/project/PROJECT_STATUS.md`의 Current Sprint, Current Task, Last Commit 정보를 현재 상태에 맞게 업데이트했습니다.
- Foundation Sprint F-01 ~ F-05 완료 상태와 최근 주요 커밋을 `docs/project/TASK_HISTORY.md`에 반영했습니다.
- Current Task를 Task 5-2 Mock Provider 준비로 정리했습니다.

### 이유

- 새 PM이 PROJECT_CONTEXT와 PROJECT_STATUS를 읽었을 때 현재 프로젝트 상태를 일관되게 이해할 수 있어야 하기 때문입니다.
- Foundation Sprint 문서 작업이 완료되었지만 PMS 일부 문서가 아직 이전 Current Task를 가리키고 있었습니다.
- Task 5-2를 시작하기 전에 Mock Provider 구현 없이 문서 상태를 먼저 정리할 필요가 있었습니다.

### 다음 작업

- Task 5-1b 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- Task 5-2에서 Mock Provider 준비 범위를 설계합니다.
- Provider 구조 이전 시 기존 `lib/tmdb.js`와 API route의 책임 분리 방식을 검토합니다.

## 2026-07-01 - Task F-05

### 변경 내용

- `docs/project/AI_PM_VALIDATION.md` 문서를 새로 추가했습니다.
- 새로운 AI PM이 MyOTT 운영체계를 얼마나 잘 따르는지 검증하는 체크리스트를 작성했습니다.
- Review 품질, Architecture 판단, Documentation 판단, 장기 유지보수, MVP 보호, Parking Lot, Decision Log, Founder Note, Book 연결 평가 기준을 문서화했습니다.
- README의 Project Memory System 목록에 Validation 문서를 추가했습니다.
- `AI_PM_BOOTSTRAP.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 Validation 문서 기준에 맞게 업데이트했습니다.
- F-04 커밋 `6a7bdab`을 `TASK_HISTORY.md`에 완료 상태로 반영했습니다.

### 이유

- Constitution과 Behavior가 실제 AI PM 응답 품질로 이어지는지 검증할 기준이 필요했기 때문입니다.
- 새 ChatGPT 채팅이나 새 AI PM이 PMS, MVP 보호, Documentation First, 장기 유지보수 원칙을 지키는지 판단할 수 있어야 했습니다.
- 향후 AI Development System을 표준화하기 위해 Pass, Fail, Score 기준을 미리 정리할 필요가 있었습니다.

### 다음 작업

- F-05 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- 필요 시 Task Template과 Review Template을 AI PM Validation 기준으로 분리합니다.
- TMDB Provider 실제 이전 범위를 PMS 원칙과 Validation 기준에 맞춰 설계합니다.

## 2026-07-01 - Task F-04

### 변경 내용

- `docs/project/AI_PM_BEHAVIOR.md` 문서를 새로 추가했습니다.
- AI PM의 리뷰 방식, 사용자 아이디어를 대하는 방식, 브레이크를 거는 기준, 칭찬과 반대 의견의 기준을 문서화했습니다.
- Book 연동 관점에서 Founder Note, Decision Log, ADR 후보를 찾는 행동 규칙을 정리했습니다.
- README의 Project Memory System 목록에 Behavior 문서를 추가했습니다.
- `AI_PM_BOOTSTRAP.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 Behavior 문서 기준에 맞게 업데이트했습니다.
- F-03 커밋 `d6884e5`를 `TASK_HISTORY.md`에 완료 상태로 반영했습니다.

### 이유

- Constitution이 최상위 원칙이라면, 실제 대화와 리뷰에서 AI PM이 어떻게 행동해야 하는지도 별도 기준이 필요했기 때문입니다.
- 사용자의 아이디어를 존중하되 장단점과 대안을 객관적으로 설명하는 협업 방식을 명확히 하기 위해서입니다.
- MVP 지연, 기술부채 증가, 확장성 훼손, 개인정보 원칙 위반 같은 상황에서 언제 브레이크를 걸지 기준을 남기기 위해서입니다.

### 다음 작업

- F-04 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- 필요 시 ADR 문서 체계와 Task/Review 템플릿을 별도 Task로 설계합니다.
- TMDB Provider 실제 이전 범위를 PMS 원칙에 맞춰 설계합니다.

## 2026-07-01 - Task F-03

### 변경 내용

- `docs/project/AI_PM_CONSTITUTION.md` 문서를 새로 추가했습니다.
- AI PM이 지켜야 할 최상위 운영 원칙을 Preamble과 10개 조항으로 정리했습니다.
- README의 Project Memory System 목록에 Constitution 문서를 추가했습니다.
- `AI_PM_BOOTSTRAP.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 Constitution 기준에 맞게 업데이트했습니다.
- F-02 커밋 `5d11898`을 `TASK_HISTORY.md`에 완료 상태로 반영했습니다.

### 이유

- MyOTT뿐 아니라 향후 모든 프로젝트에 적용할 AI PM 운영 원칙을 명문화할 필요가 있었기 때문입니다.
- 빠른 구현보다 장기 유지보수, Documentation First, Architecture First, MVP 보호를 우선하는 기준을 최상위에 두기 위해서입니다.
- AI가 사용자의 의견을 존중하되 무조건 동의하지 않고 객관적으로 장단점을 설명하는 협업 원칙을 분명히 하기 위해서입니다.

### 다음 작업

- F-03 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- 필요 시 ADR 문서 체계를 별도 Task로 설계합니다.
- TMDB Provider 실제 이전 범위를 Constitution과 Bootstrap 원칙에 맞춰 설계합니다.

## 2026-07-01 - Task F-02

### 변경 내용

- `docs/project/AI_PM_BOOTSTRAP.md` 문서를 새로 추가했습니다.
- 새 ChatGPT 채팅에서 첫 번째로 읽는 AI PM Bootstrap System v1.0을 정리했습니다.
- AI, Product Owner, Codex의 역할과 응답 순서, 개발 원칙, 금지사항, Book 연동 방식을 문서화했습니다.
- README의 Project Memory System 목록에 Bootstrap 문서를 추가했습니다.
- `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`를 Bootstrap 문서 기준에 맞게 업데이트했습니다.

### 이유

- 새 채팅이 시작될 때 프로젝트 맥락을 놓치지 않고 같은 운영 방식으로 이어가기 위한 공식 첫 문서가 필요했기 때문입니다.
- AI PM은 구현보다 설계, 리뷰, 문서화, Task 정리를 우선해야 하므로 역할 경계를 명확히 해야 했습니다.
- MyOTT 개발 과정이 향후 AI Development System과 책으로도 이어질 수 있어 중요한 결정의 기록 위치를 정리할 필요가 있었습니다.

### 다음 작업

- F-02 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- AI PM v2에서 Task 템플릿과 Review 체크리스트를 표준화합니다.
- TMDB Provider 실제 이전 범위를 Provider Architecture 기준으로 설계합니다.

## 2026-07-01 - Task F-01

### 변경 내용

- `docs/project/` 폴더를 새로 추가했습니다.
- Project Memory System(PMS) 문서 8개를 생성했습니다.
- `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, `TASK_HISTORY.md`, `DECISION_LOG.md`, `FOUNDER_NOTES.md`, `DEVELOPMENT_RULES.md`, `AI_COLLABORATION.md`, `BOOK_STATUS.md`에 현재 프로젝트 맥락과 운영 규칙을 정리했습니다.
- README에 Project Memory System 소개와 문서 링크를 추가했습니다.
- README의 Current Sprint를 Foundation Sprint / Task F-01 기준으로 업데이트했습니다.

### 이유

- Sprint와 문서가 늘어나면서 새 Codex 스레드가 프로젝트를 바로 이어받을 수 있는 기억 시스템이 필요했기 때문입니다.
- 제품 결정, 작업 이력, Founder Note, 운영 규칙이 여러 문서에 흩어지지 않도록 기준 위치를 만들기 위해서입니다.
- 장기 프로젝트에서 AI 협업 품질을 유지하려면 현재 상태와 다음 목표를 명확히 남겨야 합니다.

### 다음 작업

- F-01 커밋 해시를 다음 작업 기록 업데이트 때 `TASK_HISTORY.md`에 반영합니다.
- TMDB Provider 실제 이전 범위를 PMS와 Provider Architecture 기준으로 설계합니다.
- v1.0 MVP 최소 DB 범위를 Database Inventory 기준으로 확정합니다.

## 2026-07-01 - Task 5-1

### 변경 내용

- `docs/architecture/provider-architecture.md` 문서를 새로 추가했습니다.
- TMDB 직접 의존을 줄이고 Provider(Adapter) 기반으로 외부 콘텐츠 공급자를 확장하는 구조를 설계했습니다.
- `ContentProvider`의 `search`, `getDetail`, `getRecommendations`, `getTrending` 메서드 개념을 문서화했습니다.
- `src/lib/providers/` 아래에 Provider 계약과 TMDB Provider 자리표시자 파일을 추가했습니다.
- README의 Current Sprint를 Sprint 5 / Task 5-1 기준으로 업데이트했습니다.

### 이유

- MyOTT가 TMDB 하나에만 묶이지 않고 JustWatch, AniList, OpenLibrary, Steam 같은 외부 Provider를 추가할 수 있어야 하기 때문입니다.
- 외부 API 응답 구조를 UI와 추천 흐름에서 분리해 유지보수성과 테스트 용이성을 높이기 위해서입니다.
- 실제 Provider 이전을 시작하기 전에 공통 계약과 폴더 구조를 먼저 합의할 필요가 있었습니다.

### 다음 작업

- 현재 `lib/tmdb.js`의 책임을 TMDB Provider로 옮길 최소 단계를 설계합니다.
- MyOTT 공통 콘텐츠 모델의 필수 필드를 확정합니다.
- Provider Registry와 fallback 정책이 필요한 시점을 결정합니다.

## 2026-07-01 - Task 4-4d

### 변경 내용

- `docs/database/database-inventory.md` 문서를 새로 추가했습니다.
- Content, User/Session, AI/Recommendation, Community, 장기 콘텐츠 확장 도메인의 테이블 후보를 한곳에 정리했습니다.
- `recommendation_log`, `recommendation_result`, `user_session`, `comment`, `vote`처럼 문서마다 다르게 쓰인 후보명을 인벤토리 기준 이름으로 정리했습니다.
- 각 테이블 후보별 목적, 도메인, MVP 필수 여부, 출시 버전, 필요한 이유, MVP 제외 사유, 향후 확장 가능성을 문서화했습니다.
- README의 Sprint 4 진행률을 Task 4-4d 완료 상태로 업데이트했습니다.

### 이유

- 개별 도메인 문서가 늘어나면서 v1.0에서 실제로 필요한 테이블과 후순위 후보를 구분할 기준표가 필요했기 때문입니다.
- SQL 작성 전 Content, User, AI, Community 도메인의 책임 경계를 한 번 더 정리해야 했습니다.
- MVP에서 제외되는 후보의 이유를 남겨 향후 범위가 다시 커질 때 판단 근거로 삼기 위해서입니다.

### 다음 작업

- Database Inventory를 기준으로 v1.0 필수 테이블 범위를 최종 축소합니다.
- TMDB 응답 필드를 Content Domain 후보 테이블과 매핑합니다.
- `user_preferences`, `preference_tags`, `preference_vectors`의 책임 경계를 정리합니다.

## 2026-07-01 - Task 4-4c

### 변경 내용

- `docs/database/user-domain.md` 문서를 새로 추가했습니다.
- User Domain과 Anonymous Session Domain의 역할을 정리했습니다.
- `anonymous_sessions`, `users`, `user_preferences`, `watch_later`, `recommendation_requests`, `recommendation_results`, `recommendation_feedback`, `notification_settings`, `notification_queue` 후보를 문서화했습니다.
- Supabase Auth는 인증을 담당하고 MyOTT는 필요한 최소 사용자 정보만 저장하는 방향을 기록했습니다.
- README의 Sprint 4 진행률을 Task 4-4c 완료 상태로 업데이트했습니다.

### 이유

- 회원가입 없이 추천을 사용할 수 있는 구조와 로그인 후 개인 기능을 제공하는 구조를 분리해야 했기 때문입니다.
- 취향 저장, Watch Later, 추천 기록, 알림 기능이 어떤 사용자 데이터에 의존하는지 DB 구현 전에 정리할 필요가 있었습니다.
- Data Policy의 최소 수집 원칙을 User Domain 설계에도 반영하기 위해서입니다.

### 다음 작업

- `recommendation_requests`와 AI Domain의 `recommendation_log` 이름을 통일할지 결정합니다.
- `user_preferences`와 `preference_vector`의 책임 범위를 정리합니다.
- v1.0에서 필요한 User/Session 최소 테이블 범위를 좁힙니다.

## 2026-07-01 - Task 4-4b

### 변경 내용

- `docs/database/ai-domain.md` 문서를 새로 추가했습니다.
- AI Domain의 역할과 개인정보 비학습 원칙을 정리했습니다.
- 추천 요청, 추천 결과, 클릭, Quick Pick, 검색, Watch Later, 좋아요, 싫어요, 이미 본 작품 등 AI가 사용할 데이터 후보를 문서화했습니다.
- `recommendation_log`, `recommendation_feedback`, `preference_vector`, `taste_dna`, `content_similarity` 등 AI 저장 데이터 후보와 필요한 이유를 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4b 완료 상태로 업데이트했습니다.

### 이유

- AI 추천 품질을 높이기 위해 필요한 데이터와 절대 저장하지 않을 개인정보를 분리해야 했기 때문입니다.
- 추천 로그, 클릭, 피드백, 취향 벡터가 어떤 역할을 하는지 DB 구현 전에 합의할 필요가 있었습니다.
- Data Policy의 최소 수집 원칙을 AI 추천 도메인 설계에도 반영하기 위해서입니다.

### 다음 작업

- AI Domain 후보 테이블과 User Journey 문서의 이벤트 후보 이름을 맞춥니다.
- 추천 요청과 추천 결과 테이블의 v1.0 최소 범위를 좁힙니다.
- 추천 이유 생성에 사용할 안전한 입력 범위를 정리합니다.

## 2026-07-01 - Task 4-4a

### 변경 내용

- `docs/database/content-domain.md` 문서를 새로 추가했습니다.
- Content Domain의 개요와 설계 경계를 정리했습니다.
- `contents`, `genres`, `content_genres`, `people`, `content_people`, `ott_platforms`, `content_platforms`, `countries`, `languages`, `collections` 테이블 후보를 문서화했습니다.
- 각 테이블별 목적, 주요 컬럼 초안, 필요한 이유, 향후 확장 가능성을 정리했습니다.
- README의 Sprint 4 진행률을 Task 4-4a 완료 상태로 업데이트했습니다.

### 이유

- TMDB 연동과 실제 DB 설계 전에 콘텐츠 메타데이터의 기준 구조를 먼저 합의하기 위해서입니다.
- 추천 카드와 상세 Layer에 필요한 작품, 장르, 인물, OTT 제공 정보를 분리해 설계할 필요가 있었습니다.
- 사용자 데이터와 콘텐츠 메타데이터를 분리해 개인정보 최소 수집 원칙을 유지하기 위해서입니다.

### 다음 작업

- TMDB 응답 필드를 Content Domain 후보 컬럼과 매핑합니다.
- v1.0에서 꼭 필요한 콘텐츠 테이블만 다시 좁힙니다.
- User Domain과 Recommendation Domain의 DB 초안을 별도 문서로 정리합니다.

## 2026-07-01 - Task 4-3

### 변경 내용

- `docs/data-policy.md` 문서를 새로 추가했습니다.
- MyOTT의 데이터 철학을 "필요한 데이터만 저장한다"는 원칙으로 정리했습니다.
- 저장하지 않을 데이터, 익명으로 저장 가능한 데이터, 로그인 사용자만 저장하는 데이터를 구분했습니다.
- 저장 기간, 계정 삭제 시 데이터 처리, AI 학습 정책, 향후 개인정보 규제 검토 항목을 문서화했습니다.
- README의 Sprint 4 진행률을 Task 4-3 완료 상태로 업데이트했습니다.

### 이유

- 추천 품질을 높이면서도 불필요한 개인정보 수집을 피하는 기준이 필요했기 때문입니다.
- Supabase, 로그인, 취향 저장을 구현하기 전에 어떤 데이터는 저장하지 않을지 먼저 정해야 합니다.
- 향후 개인정보 처리방침과 이용약관, AI 추천 정책으로 이어질 제품 원칙을 세우기 위해서입니다.

### 다음 작업

- Data Policy를 기준으로 v1.0 최소 데이터 모델 후보를 좁힙니다.
- 익명 세션과 로그인 전환 시 데이터 이전 정책을 더 구체화합니다.
- TMDB 연동 데이터와 사용자 데이터가 섞이지 않도록 내부 필드 경계를 정리합니다.

## 2026-07-01 - Task 4-2

### 변경 내용

- `docs/user-journey-data-flow.md` 문서를 새로 추가했습니다.
- 첫 방문부터 추천, 상세 Layer, 나중에 볼래, 다시 방문, 취향 기반 추천 개선까지 핵심 사용자 여정을 정리했습니다.
- 각 단계에서 발생하는 사용자 행동 데이터와 향후 DB 후보를 문서화했습니다.
- 익명 사용자와 로그인 사용자의 가능 기능과 저장 범위를 구분했습니다.
- README의 Sprint 4 진행률을 Task 4-2 완료 상태로 업데이트했습니다.

### 이유

- 실제 DB 구현 전에 어떤 사용자 행동을 저장할지, 어떤 데이터는 저장하지 않을지 기준을 먼저 세우기 위해서입니다.
- 추천 경험이 로그인 없이도 가능하되, 취향 저장과 나중에 볼래는 로그인 사용자 기능으로 분리할 필요가 있었습니다.
- 향후 Supabase 테이블 설계로 이어질 후보 목록을 기능 흐름 기준으로 정리하기 위해서입니다.

### 다음 작업

- User Journey 문서의 후보 테이블을 바탕으로 v1.0 최소 데이터 모델을 좁힙니다.
- TMDB 연동 시 `contents`, `content_details`, `content_aliases`에 필요한 필드를 정리합니다.
- 저장하지 않을 데이터와 익명 세션 보관 정책을 더 구체화합니다.

## 2026-07-01 - Task 4-1

### 변경 내용

- `docs/service-architecture.md` 문서를 새로 추가해 MyOTT의 기능 로드맵을 정리했습니다.
- 현재 기능, v1.0 출시 기능, v2.0 출시 후 기능, v3.0+ 장기 목표를 단계별로 나눴습니다.
- 각 기능에 필요한 DB 후보 이름을 간단히 기록했습니다.
- README의 Current Sprint를 Sprint 4 시작 상태로 업데이트했습니다.

### 이유

- TMDB, AI 추천, 로그인, 취향 저장처럼 외부 연결과 DB가 필요한 작업에 들어가기 전 기능 범위를 먼저 정리하기 위해서입니다.
- 댓글, 좋아요, 추천 피드백, Community Picks 같은 이후 확장 기능이 현재 MVP와 섞이지 않도록 단계 구분이 필요했습니다.
- 실제 DB 구현 전에 필요한 데이터 개념만 문서로 합의하기 위해서입니다.

### 다음 작업

- TMDB 연동에 필요한 데이터 필드와 API 응답 매핑을 정리합니다.
- v1.0에서 실제로 구현할 최소 DB 범위를 다시 좁힙니다.
- Supabase 연결 전 인증, 추천 기록, 취향 저장 정책을 문서로 확정합니다.

## 2026-07-01 - Task 3-5

### 변경 내용

- Quick Pick 선택값에 따라 더미 추천 결과가 다르게 표시되도록 개선했습니다.
- 로맨스, SF, 스릴러 장르 선택 시 각각 다른 추천 카드 묶음이 우선 표시되도록 더미 데이터를 확장했습니다.
- 작품 입력값이 있을 때 추천 이유가 입력한 작품명과 연결되어 보이도록 정리했습니다.
- 추천 카드와 상세 Layer에 포스터형 썸네일, 제목, 장르, 감독, 배우, 줄거리, 추천 이유가 이어지도록 유지했습니다.
- Quick Pick Layer와 상세 Layer가 동시에 열리지 않도록 추천 실행과 상세 열기 흐름을 정리했습니다.

### 이유

- Sprint 3 MVP UI의 추천 결과가 항상 같은 목록으로 보이면 실제 추천 경험처럼 느껴지기 어렵기 때문입니다.
- TMDb 연동 전에도 사용자가 선택한 옵션과 입력한 작품이 결과에 반영되는 흐름을 확인할 필요가 있었습니다.
- 이후 실제 추천 API나 검색 API를 붙일 때 사용할 카드 정보 구조를 더 명확히 만들기 위해서입니다.

### 다음 작업

- Quick Pick 필터와 콘텐츠 타입 선택이 실제 TMDb 검색 조건으로 이어질 수 있도록 데이터 계약을 정리합니다.
- 상세 Layer 포커스 관리와 접근성을 개선합니다.
- Sprint 3 MVP UI 완료 기준을 README에 반영할지 검토합니다.

## 2026-06-30 - Task 3-4b

### 변경 내용

- 추천 페이지의 `String.raw` HTML 주입과 외부 `public/app.js` DOM 조작 의존을 제거했습니다.
- 더 이상 로드하지 않는 이전 DOM 조작 스크립트 `public/app.js`를 삭제했습니다.
- 추천 입력, Quick Pick, 추천 결과, 상세 Layer 상태를 `app/page.jsx`의 React state 기반 렌더링으로 정리했습니다.
- 추천 카드 클릭 상세 Layer, X 버튼, 배경 클릭, ESC 닫기 동작을 React 이벤트로 복구했습니다.
- Quick Pick Layer와 상세 Layer가 동시에 열리지 않도록 상세 열기 시 Quick Pick을 닫도록 유지했습니다.
- CSS 단위 오류가 다시 생기지 않았는지 확인했습니다.

### 이유

- Task 3-4 이후 로컬 500 오류와 React hydration/runtime 오류가 발생해 Next 렌더링 구조를 안정화할 필요가 있었습니다.
- React가 렌더링한 화면을 외부 스크립트가 직접 수정하면 hydration과 클라이언트 상태가 충돌할 수 있기 때문입니다.
- 상세 Layer 기능을 유지하면서 이후 확장 가능한 Next.js 구조로 되돌리기 위해서입니다.

### 다음 작업

- 더미 추천 데이터와 실제 API 데이터가 같은 카드 구조를 사용할 수 있도록 데이터 필드를 정리합니다.
- 상세 Layer 포커스 관리와 접근성을 별도 작업에서 보강합니다.
- Quick Pick 선택값을 추천 조건으로 연결할 범위를 정의합니다.

## 2026-06-30 - Task 3-4

### 변경 내용

- 더미 추천 결과 카드를 확장 가능한 형태로 복구했습니다.
- 카드에 썸네일 영역, 제목, 콘텐츠 타입, 장르, 감독, 주요 배우, 추천 이유를 표시했습니다.
- 추천 카드를 클릭하면 별도 상세 정보 Layer가 열리도록 추가했습니다.
- 상세 Layer에는 썸네일, 제목, 장르, 감독, 주요 배우, 줄거리, 추천 이유를 표시했습니다.
- 상세 Layer는 X 버튼, 배경 클릭, ESC 키로 닫히도록 구현하고 Quick Pick Layer와 충돌하지 않도록 분리했습니다.

### 이유

- 추천 결과가 단순 텍스트 카드에 머물면 이후 TMDb 데이터 확장과 상세 UX로 이어가기 어렵기 때문입니다.
- 사용자가 추천 결과를 훑고, 관심 있는 항목을 눌러 더 많은 정보를 확인하는 기본 흐름이 필요했습니다.
- Quick Pick Layer와 상세 Layer가 동시에 꼬이지 않도록 오버레이 상태를 분리할 필요가 있었습니다.

### 다음 작업

- 상세 Layer 접근성과 포커스 이동을 보강합니다.
- 더미 썸네일 영역을 실제 이미지 데이터와 연결할 준비를 합니다.
- Quick Pick 필터 선택값을 추천 결과에 반영하는 기준을 정의합니다.

## 2026-06-30 - Task 3-3c

### 변경 내용

- Quick Pick Layer가 첫 진입 시 보이는 문제를 수정했습니다.
- `.quick-pick-overlay.hidden` 규칙을 추가해 Overlay 전용 숨김 상태가 `.quick-pick-overlay` 표시 규칙에 덮이지 않도록 했습니다.
- 추천 옵션 버튼, X 버튼, 배경 오버레이, ESC 키 닫기 동작을 로컬 클릭 테스트로 확인했습니다.
- Quick Pick 필터 선택 후 Layer를 닫았다 다시 열어도 선택 상태와 추천 버튼 활성화 상태가 유지되는지 확인했습니다.

### 이유

- 기존 `.hidden` 규칙이 Quick Pick Overlay의 `display: grid` 규칙보다 먼저 선언되어 초기 닫힘 상태가 깨질 수 있었기 때문입니다.
- 사용자가 추천 옵션을 명시적으로 열고 닫는 흐름이 안정적으로 동작해야 합니다.
- Quick Pick 선택값은 추천 시작 조건에 영향을 주므로 Layer를 닫아도 상태가 유지되어야 합니다.

### 다음 작업

- Quick Pick 선택값을 실제 추천 결과 필터링에 반영할지 별도 태스크에서 결정합니다.
- 모바일 실기기에서 Layer 터치 영역과 스크롤 감각을 추가 확인합니다.
- Sprint 3 완료 시점에 README와 개발 기록을 다시 정리합니다.

## 2026-06-30 - Task 3-3b

### 변경 내용

- 프로젝트 소스 CSS 전체에서 숫자와 단위 사이 공백이 있는 표기를 점검했습니다.
- `10 px`, `760 px`, `82 vh`, `1 fr`, `180 deg` 형태의 CSS 단위 오류는 발견되지 않았습니다.
- `CHANGELOG.md`와 `docs/dev-log.md`에 Task 3-3b 작업 및 로컬 실행 확인 기록을 추가했습니다.

### 이유

- Quick Pick 작업 이후 CSS 단위 오류가 누적되었는지 확인하고, 로컬 실행 상태를 명확히 남기기 위해서입니다.
- UI 구조나 기능 동작을 바꾸지 않고 스타일 표기 안정성과 개발 기록만 정리할 필요가 있었습니다.
- 다음 작업 전에 현재 프로젝트가 로컬에서 정상 실행되는지 기준점을 만들기 위해서입니다.

### 다음 작업

- Quick Pick 선택값을 실제 추천 조건으로 연결할지 별도 태스크에서 결정합니다.
- Sprint 3 작업 기록을 필요 시 Sprint 단위로 다시 정리합니다.
- TMDb API 연동 전 현재 더미 추천 UX를 모바일에서 한 번 더 점검합니다.

## 2026-06-30

### 변경 내용

- `008d72e`: Task 3-2로 Quick Pick 필터 레이어 UI를 추가했습니다.
- 추천 옵션 버튼, Bottom Sheet 형태의 옵션 레이어, 장르/국가/분위기/러닝타임 체크 항목을 구현했습니다.
- 작품 입력창이 모두 비어 있어도 Quick Pick 옵션이 하나 이상 선택되면 추천받기 버튼이 활성화되도록 UI 상태를 보완했습니다.
- CSS 단위 표기 오류를 점검했으며, 현재 CSS 파일에는 `760 px`, `12 px`, `82 vh` 같은 잘못된 단위 표기가 남아 있지 않음을 확인했습니다.

### 이유

- 사용자가 작품명을 모르는 상태에서도 추천 흐름을 시작할 수 있어야 하기 때문입니다.
- 추천 페이지의 진입 장벽을 낮추기 위해 입력 기반 흐름에 빠른 옵션 선택 흐름을 추가했습니다.
- Task 3-2 작업 기록과 CSS 점검 결과가 문서에 누락되어 보완이 필요했습니다.

### 다음 작업

- Quick Pick 선택값이 실제 추천 로직에 어떻게 반영될지 별도 태스크에서 정의합니다.
- 모바일에서 Bottom Sheet의 사용감과 체크 옵션 간격을 실제 화면 기준으로 점검합니다.
- README의 Sprint 진행 상태도 다음 문서 정리 태스크에서 최신 상태로 맞춥니다.

## Sprint 2 - 2026-06-29

### 변경 내용

- `4d59d6c`: 프로젝트 초기 작업을 정리하고 추천 페이지를 한 페이지 흐름으로 다듬었습니다.
- `7324872`: Task 2-1로 영화, 드라마, 애니 체크박스와 작품 입력창 3개, 추천받기 버튼, 더미 결과 영역을 구현했습니다.
- `7491eeb`: Task 2-2로 README 상단을 프로젝트 대시보드 형태로 개선하고 Current Sprint 섹션을 추가했습니다.
- Task 2-3으로 Sprint 2의 작업 기록을 `CHANGELOG.md`와 `docs/dev-log.md`에 정리했습니다.

### 이유

- Sprint 2의 목표가 추천 페이지 UX를 먼저 완성하고 한 페이지 구조를 유지하는 것이기 때문입니다.
- 기능 구현, README 대시보드, 작업 기록을 분리해 프로젝트 진행 상황을 한눈에 확인할 필요가 있었습니다.
- TMDb API 연동 전에 더미 데이터 기반 추천 흐름과 문서화 체계를 안정화해야 했습니다.

### 다음 작업

- Task 2-3 완료 커밋까지 반영한 뒤 Sprint 2 체크리스트를 최신 상태로 유지합니다.
- 추천 페이지의 더미 결과 카드 UX를 검토하고 필요한 보완점을 정리합니다.
- 다음 단계에서 TMDb API 연동 준비 범위를 별도 태스크로 정의합니다.

## 2026-06-29

### 변경 내용

- Task 2-1 범위에 맞춰 추천 페이지를 기본 UI 중심으로 단순화했습니다.
- 영화, 드라마, 애니 체크박스와 작품 입력창 3개, 추천받기 버튼을 추가했습니다.
- 추천 결과는 외부 API 없이 더미 데이터로만 페이지 아래에 출력되도록 구현했습니다.
- 기존의 고급 추천 분석 UI와 클라이언트 TMDb 호출 흐름은 이번 UI 범위에서 제외했습니다.

### 이유

- 현재 목표가 추천 기능 완성이 아니라 기본 사용자 흐름과 화면 뼈대 구현이기 때문입니다.
- TMDb API와 Supabase 연결 전에 한 페이지 추천 UI가 먼저 안정적으로 보여야 합니다.
- 더미 결과만으로 입력, 추천 버튼, 결과 표시 흐름을 빠르게 확인할 수 있어야 합니다.

### 다음 작업

- 체크박스 선택 상태에 따라 더미 결과가 올바르게 필터링되는지 브라우저에서 확인합니다.
- 기본 UI가 안정화되면 추천 결과 카드의 정보 구조와 시각적 완성도를 개선합니다.
- 외부 데이터 연결은 별도 태스크에서 진행합니다.

## 2026-06-29 이전 스프린트

### 변경 내용

- 추천 페이지를 랜딩 화면과 결과 화면으로 나누지 않고 한 페이지에서 입력, 추천, 결과 확인이 가능하도록 정리했습니다.
- 샘플 입력 버튼과 기본 더미 입력값을 유지해 실제 TMDb 키 없이도 추천 흐름을 바로 확인할 수 있게 했습니다.
- README에 Current Sprint 섹션을 추가하고 이번 스프린트 목표를 명시했습니다.

### 이유

- 이번 스프린트의 핵심 목표가 실제 데이터 연동보다 사용자 흐름 완성이기 때문입니다.
- 사용자가 앱에 들어오자마자 입력 패널과 결과 영역을 동시에 보고 추천 행동을 이해할 수 있어야 합니다.
- 이후 TMDb, Vercel, Supabase 연동 전에도 데모 가능한 화면이 필요했습니다.

### 다음 작업

- 브라우저에서 입력, 추천 버튼, 결과 카드, 필터 동작을 확인합니다.
- TMDb 키를 설정한 뒤 실제 검색 결과와 로컬 더미 추천이 함께 동작하는지 검증합니다.
- 현재 스프린트가 완료되면 다음 스프린트 목표를 README에 갱신합니다.

## 2026-06-26

### 변경 내용

- 단순 웹페이지 구조를 Next.js 앱 구조로 전환했습니다.
- 화면은 `app/page.jsx`, 전역 스타일은 `app/globals.css`, 클라이언트 추천 로직은 `public/app.js`로 정리했습니다.
- TMDb 검색과 상태 확인을 Next.js API Route인 `app/api/search/route.js`, `app/api/status/route.js`로 분리했습니다.

### 이유

- TMDb API 키를 브라우저에 노출하지 않고 서버 환경변수로만 관리하기 위해서입니다.
- Vercel 배포와 이후 Supabase 같은 외부 서비스 연동을 안정적으로 진행할 수 있는 구조가 필요했습니다.
- 단일 정적 페이지보다 화면, API, 환경변수 관리 책임을 분리하는 편이 유지보수에 유리했습니다.

### 다음 작업

- `.env.local` 또는 Vercel 환경변수에 TMDb 키를 설정합니다.
- 실제 TMDb 검색 결과가 앱 추천 흐름에 자연스럽게 반영되는지 확인합니다.
- Vercel 배포 후 production 환경에서 `/api/status`와 `/api/search`를 검증합니다.
