# MyOTT User Journey and Data Flow

MyOTT의 핵심 사용자 여정과 각 단계에서 발생하는 데이터 후보를 정리한 문서입니다. 이 문서는 향후 DB 설계와 이벤트 설계로 이어지기 위한 초안이며, 실제 DB 생성이나 Supabase 연결은 포함하지 않습니다.

## 1. 핵심 사용자 여정

### 1. 첫 방문

- 사용자 행동: 서비스에 처음 접속하고 추천 흐름을 확인합니다.
- 발생 데이터 후보:
  - `anonymous_sessions`: 익명 세션 식별 후보
  - `page_view_events`: 첫 방문 화면 진입 기록 후보
- 메모: 로그인 없이도 추천 기능을 사용할 수 있어야 합니다.

### 2. OTT 선택

- 사용자 행동: Netflix, Disney+, Watcha, TVING 등 이용 중인 OTT를 선택합니다.
- 발생 데이터 후보:
  - `user_ott_preferences`: 로그인 사용자의 OTT 선호 저장 후보
  - `recommendation_request_filters`: 추천 요청 시 선택한 OTT 필터 후보
- 메모: 익명 사용자는 추천 요청 단위로만 사용하고, 로그인 사용자는 취향으로 저장할 수 있습니다.

### 3. 콘텐츠 종류 선택

- 사용자 행동: 영화, 드라마, 애니 중 추천받고 싶은 콘텐츠 타입을 고릅니다.
- 발생 데이터 후보:
  - `recommendation_request_filters`: 콘텐츠 타입 필터 후보
  - `user_content_type_preferences`: 로그인 사용자의 콘텐츠 타입 선호 후보

### 4. 작품명 입력 또는 Quick Pick 선택

- 사용자 행동: 좋아하는 작품명을 입력하거나 장르, 국가, 분위기, 러닝타임을 Quick Pick으로 선택합니다.
- 발생 데이터 후보:
  - `recommendation_request_inputs`: 입력한 작품명 후보
  - `recommendation_request_filters`: Quick Pick 필터 후보
  - `user_preference_tags`: 로그인 사용자의 취향 태그 후보
  - `content_aliases`: 입력 작품명과 실제 작품 매칭 후보

### 5. 추천받기

- 사용자 행동: 추천받기 버튼을 눌러 추천 요청을 생성합니다.
- 발생 데이터 후보:
  - `recommendation_requests`: 추천 요청 본문 후보
  - `recommendation_request_filters`: 추천 요청 필터 후보
  - `recommendation_request_inputs`: 작품 입력값 후보
- 메모: 추천 요청은 익명 사용자도 만들 수 있지만, 장기 저장은 로그인 사용자 중심으로 제한합니다.

### 6. 추천 결과 확인

- 사용자 행동: 추천 카드 목록을 확인합니다.
- 발생 데이터 후보:
  - `recommendation_results`: 추천 결과 목록 후보
  - `recommendation_impressions`: 화면에 노출된 추천 카드 후보
- 메모: 추천 결과가 실제로 노출되었는지와 클릭되었는지는 분리해서 기록합니다.

### 7. 추천 카드 클릭

- 사용자 행동: 관심 있는 추천 카드를 클릭합니다.
- 발생 데이터 후보:
  - `recommendation_result_clicks`: 추천 결과 클릭 후보
  - `content_click_events`: 작품 카드 클릭 이벤트 후보

### 8. 상세 Layer 확인

- 사용자 행동: 상세 Layer에서 포스터, 제목, 장르, 감독, 배우, 줄거리, 추천 이유를 확인합니다.
- 발생 데이터 후보:
  - `content_detail_views`: 작품 상세 조회 후보
  - `recommendation_reason_views`: 추천 이유 노출 후보

### 9. 나중에 볼래 저장

- 사용자 행동: 관심 있는 작품을 나중에 볼래 목록에 저장합니다.
- 발생 데이터 후보:
  - `watch_later`: 저장한 작품 후보
  - `user_saved_contents`: 사용자 저장 콘텐츠 후보
- 메모: 나중에 볼래는 로그인 사용자 기능으로 둡니다. 익명 사용자는 임시 세션 안에서만 가능하게 할지 별도 결정이 필요합니다.

### 10. 다시 방문

- 사용자 행동: 앱에 다시 접속해 이전 취향과 저장 목록을 기반으로 추천을 이어갑니다.
- 발생 데이터 후보:
  - `users`: 로그인 사용자 후보
  - `anonymous_sessions`: 익명 재방문 세션 후보
  - `user_preference_profiles`: 누적 취향 프로필 후보
  - `watch_later`: 저장 목록 후보

### 11. 취향 기반 추천 개선

- 사용자 행동: 클릭, 저장, 피드백, 반복 선택을 통해 추천 품질이 개선됩니다.
- 발생 데이터 후보:
  - `recommendation_feedback`: 추천/비추천 피드백 후보
  - `user_preference_profiles`: 취향 프로필 후보
  - `recommendation_logs`: 추천 이력 후보
  - `content_votes`: 작품 선호 반응 후보

## 2. 익명 사용자와 로그인 사용자 구분

### 익명 사용자

- 추천 기능 사용 가능
- OTT, 콘텐츠 타입, 작품 입력, Quick Pick 기반 추천 가능
- 추천 결과 클릭과 상세 Layer 확인 가능
- 장기 취향 저장은 하지 않음
- 세션 단위 임시 데이터만 사용할 수 있음

### 로그인 사용자

- 익명 사용자 기능 모두 사용 가능
- 취향 저장 가능
- 나중에 볼래 저장 가능
- 추천 요청 기록 저장 가능
- 추천 결과 클릭, 저장, 피드백을 개인화 추천 개선에 활용 가능

## 3. 저장해야 할 데이터

- 선택한 OTT
- 선택한 콘텐츠 타입
- 선택한 장르, 국가, 분위기, 러닝타임
- 추천 요청 기록
- 추천 결과 목록
- 추천 결과 노출 기록
- 추천 결과 클릭
- 상세 Layer 조회
- 저장한 작품
- 추천/비추천 피드백
- 댓글, 좋아요 등 커뮤니티 기능 데이터

## 4. 저장하지 않을 데이터

- 불필요한 개인정보
- 민감정보
- 원본 IP 주소
- 결제 정보
- 사용자가 직접 제공하지 않은 연락처
- 추천 품질 개선과 무관한 브라우징 세부 정보
- 장기 보관 목적이 없는 익명 세션 원본 데이터

## 5. 향후 DB 설계 후보 테이블

- `users`
- `anonymous_sessions`
- `contents`
- `content_details`
- `content_aliases`
- `ott_providers`
- `user_ott_preferences`
- `preference_tags`
- `user_preference_tags`
- `user_preference_profiles`
- `recommendation_requests`
- `recommendation_request_inputs`
- `recommendation_request_filters`
- `recommendation_results`
- `recommendation_impressions`
- `recommendation_result_clicks`
- `recommendation_feedback`
- `watch_later`
- `user_comments`
- `content_votes`

## 6. 구현 원칙

- 이 문서는 User Journey와 Data Flow 설계 초안입니다.
- 실제 DB 테이블 생성, Supabase 연결, 마이그레이션은 하지 않습니다.
- 익명 사용자 데이터는 최소화하고, 로그인 사용자 데이터는 명확한 기능 목적이 있을 때만 저장합니다.
- 추천 개선에 필요한 이벤트라도 개인정보와 민감정보는 저장하지 않는 방향을 기본값으로 둡니다.
