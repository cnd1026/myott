# User and Session Domain Database Design Draft

MyOTT의 User Domain과 Anonymous Session Domain을 위한 DB 설계 초안입니다. 이 문서는 사용자 기능과 세션 데이터의 경계를 정리하기 위한 문서이며, SQL 작성, ERD 작성, Supabase 연결은 포함하지 않습니다.

## 1. User Domain 개요

MyOTT는 회원가입 없이도 추천을 사용할 수 있다.

로그인 시에는 취향 저장과 개인 기능을 제공한다.

User Domain은 익명 사용자와 로그인 사용자를 분리해 다룹니다. 익명 사용자는 추천 흐름을 바로 경험할 수 있어야 하고, 로그인 사용자는 Watch Later, 추천 기록, 취향 저장, 알림 같은 개인화 기능을 사용할 수 있어야 합니다.

### 핵심 역할

- 익명 사용자의 최소 세션 상태 관리
- 로그인 사용자의 최소 프로필 관리
- 취향 저장과 추천 기록 연결
- Watch Later 같은 개인 저장 기능 제공
- 향후 알림, Community, Taste DNA, 공유 기능의 기반 제공

### 설계 원칙

- 회원가입 없이도 추천을 사용할 수 있게 한다.
- 로그인 전 데이터와 로그인 후 데이터를 명확히 구분한다.
- Supabase Auth가 담당할 인증 정보와 MyOTT가 저장할 서비스 정보를 분리한다.
- MyOTT에는 추천과 개인 기능에 필요한 최소 정보만 저장한다.
- User Domain은 Content Domain과 AI Domain을 참조하되 개인정보를 과도하게 넘기지 않는다.

## 2. Anonymous Session

### 필요한 이유

익명 사용자도 추천 품질 향상을 위한 최소한의 데이터를 저장할 수 있다.

익명 세션은 로그인하지 않은 사용자의 추천 흐름을 유지하기 위한 임시 식별자입니다. 사용자가 OTT, 콘텐츠 타입, Quick Pick을 선택하고 추천받는 동안 같은 세션 안에서 상태를 이어갈 수 있게 합니다.

### 후보 테이블

- `anonymous_sessions`

### 예상 컬럼(제안 수준)

- `session_id`: 익명 세션 식별자
- `created_at`: 세션 생성 시각
- `last_active_at`: 마지막 활동 시각
- `consent_status`: 쿠키 또는 데이터 저장 동의 상태
- `locale`: 언어 또는 지역 설정
- `device_type`: desktop, mobile, tablet 등 기기 타입 후보

### 왜 필요한지

- 로그인 없이 추천 흐름을 유지하기 위해 필요합니다.
- 익명 추천 요청과 추천 클릭을 짧은 기간 동안 연결할 수 있습니다.
- Quick Pick 사용 여부, 추천 결과 클릭 같은 비식별 행동 데이터를 분석할 수 있습니다.

### 보관 원칙

- 익명 세션은 짧은 보관 기간을 기본값으로 둡니다.
- 원본 IP, 이름, 전화번호, 주소 같은 직접 식별 정보는 저장하지 않습니다.
- 로그인 전환 시 익명 세션 데이터를 사용자 계정에 연결할지는 별도 동의와 안내가 필요합니다.

## 3. User

### 후보 테이블

- `users`

회원 자체는 Supabase Auth를 사용하고 MyOTT에는 필요한 최소 정보만 저장한다.

### 예상 컬럼(제안 수준)

- `id`: 사용자 ID, Supabase Auth 사용자 ID와 연결되는 내부 기준
- `auth_provider`: google, kakao, email 등 인증 제공자 후보
- `created_at`: 생성 시각
- `updated_at`: 수정 시각
- `onboarding_completed`: 온보딩 완료 여부

### 왜 필요한지

Supabase Auth는 로그인과 인증을 담당하지만, MyOTT 서비스 안에서 사용자가 온보딩을 마쳤는지, 개인화 기능을 사용할 수 있는지 같은 서비스 상태는 별도로 관리해야 합니다.

### 저장하지 않는 방향

- 이름은 기본 저장 대상이 아닙니다.
- 생년월일, 전화번호, 주소는 저장하지 않습니다.
- 이메일 원문은 Supabase Auth에 맡기고 MyOTT 서비스 DB에는 복제하지 않는 방향을 우선합니다.

### 향후 확장 가능성

- 온보딩 단계 추가
- 계정 삭제 상태 관리
- 알림 설정과 연결
- Taste DNA와 취향 프로필 연결
- Community 표시 이름은 별도 프로필 테이블로 분리 가능

## 4. Preference

### 후보 테이블

- `user_preferences`

### 저장할 수 있는 선호 정보

- 선호 OTT
- 선호 장르
- 선호 국가
- 선호 분위기
- 선호 러닝타임
- 선호 콘텐츠 타입
- 싫어하는 장르 또는 제외 조건 후보

### 예상 컬럼(제안 수준)

- `id`: 선호 정보 ID
- `user_id`: 사용자 ID
- `preference_type`: ott, genre, country, mood, runtime, content_type 등
- `preference_value`: 선호 값 또는 태그
- `weight`: 선호 강도 후보
- `source`: onboarding, quick_pick, click, watch_later, feedback 등 생성 출처
- `created_at`: 생성 시각
- `updated_at`: 수정 시각

### 왜 필요한지

로그인 사용자는 매번 같은 취향을 다시 입력하지 않아도 개인화 추천을 받을 수 있어야 합니다. `user_preferences`는 명시적 선택과 행동 기반 취향을 한곳에서 관리하는 후보입니다.

### 향후 확장 가능성

- Taste DNA 계산의 입력값으로 사용할 수 있습니다.
- AI Domain의 `preference_vector`와 연결할 수 있습니다.
- 사용자가 직접 취향을 수정하거나 초기화할 수 있습니다.

## 5. Watch Later

### 후보 테이블

- `watch_later`

### 왜 필요한지

사용자가 추천 결과를 보고 바로 시청하지 못하더라도 관심 있는 작품을 저장할 수 있어야 합니다. Watch Later는 사용자의 명시적인 관심 신호이며, 개인화 추천과 알림 기능의 중요한 기반이 됩니다.

### 예상 컬럼(제안 수준)

- `id`: 저장 항목 ID
- `user_id`: 사용자 ID
- `content_id`: 콘텐츠 ID
- `source_recommendation_result_id`: 어떤 추천 결과에서 저장했는지 후보
- `note`: 사용자 메모 후보
- `created_at`: 저장 시각
- `deleted_at`: 삭제 시각 후보

### 향후 확장 가능성

- OTT 종료 예정 알림과 연결
- 신규 공개 예정 알림과 연결
- 친구와 공유
- Community Picks 집계의 신호로 사용
- AI 추천의 강한 관심 신호로 사용

### 주의점

- Watch Later는 로그인 사용자 기능으로 우선 설계합니다.
- 삭제한 저장 항목은 추천 신호에서 어떻게 반영할지 별도 정책이 필요합니다.

## 6. Recommendation History

### 후보 테이블

- `recommendation_requests`
- `recommendation_results`
- `recommendation_feedback`

### recommendation_requests

#### 왜 필요한지

사용자가 어떤 조건으로 추천을 요청했는지 저장합니다. 추천 결과를 다시 보여주거나, 취향 개선에 반영하거나, 추천 품질을 분석하기 위해 필요합니다.

#### 예상 컬럼(제안 수준)

- `id`: 추천 요청 ID
- `user_id`: 로그인 사용자 ID 후보
- `anonymous_session_id`: 익명 세션 ID 후보
- `requested_at`: 요청 시각
- `input_titles`: 입력 작품 후보
- `selected_ott`: 선택 OTT 후보
- `selected_content_types`: 선택 콘텐츠 타입 후보
- `selected_filters`: Quick Pick 필터 후보
- `model_version`: 추천 모델 또는 규칙 버전 후보

### recommendation_results

#### 왜 필요한지

추천 요청에 대해 어떤 작품이 어떤 순서로 나왔는지 저장합니다. 클릭, 저장, 피드백과 연결하려면 요청과 결과를 분리해야 합니다.

#### 예상 컬럼(제안 수준)

- `id`: 추천 결과 ID
- `recommendation_request_id`: 추천 요청 ID
- `content_id`: 콘텐츠 ID
- `rank`: 노출 순서
- `score`: 추천 점수 후보
- `reason_summary`: 추천 이유 요약
- `created_at`: 생성 시각

### recommendation_feedback

#### 왜 필요한지

사용자가 추천 결과에 대해 좋아요, 싫어요, 이미 봄, 관심 없음 같은 피드백을 남길 수 있게 합니다. 반복 추천을 줄이고 개인화 추천 품질을 높이는 데 필요합니다.

#### 예상 컬럼(제안 수준)

- `id`: 피드백 ID
- `recommendation_result_id`: 추천 결과 ID
- `user_id`: 사용자 ID 후보
- `anonymous_session_id`: 익명 세션 ID 후보
- `feedback_type`: like, dislike, seen, not_interested 등
- `created_at`: 생성 시각

### User Domain 관점의 원칙

- 로그인 사용자 추천 기록은 사용자가 삭제할 수 있어야 합니다.
- 익명 사용자 추천 기록은 짧은 보관 기간을 둡니다.
- AI Domain의 추천 로그와 이름을 통일할지 이후 결정합니다.

## 7. Notification

### 후보 테이블

- `notification_settings`
- `notification_queue`

### notification_settings

#### 왜 필요한지

사용자가 어떤 알림을 받을지 직접 설정할 수 있어야 합니다. 알림은 명시적 동의와 설정을 기준으로 제공해야 합니다.

#### 예상 컬럼(제안 수준)

- `id`: 알림 설정 ID
- `user_id`: 사용자 ID
- `notification_type`: 알림 유형
- `enabled`: 활성화 여부
- `channel`: email, push, in_app 등 후보
- `created_at`: 생성 시각
- `updated_at`: 수정 시각

### notification_queue

#### 왜 필요한지

발송 예정 알림을 관리하기 위한 후보입니다. OTT 종료 예정, 신규 공개, 관심 작품 업데이트 같은 이벤트를 사용자별로 예약할 수 있습니다.

#### 예상 컬럼(제안 수준)

- `id`: 알림 큐 ID
- `user_id`: 사용자 ID
- `content_id`: 관련 콘텐츠 ID 후보
- `notification_type`: 알림 유형
- `scheduled_at`: 예약 시각
- `sent_at`: 발송 시각 후보
- `status`: pending, sent, failed 등 상태 후보

### 향후 기능

- OTT 종료 예정
- 신규 공개
- 관심 작품 업데이트

### 주의점

- 알림은 사용자가 직접 켜고 끌 수 있어야 합니다.
- 알림 발송에 이메일이나 푸시 토큰이 필요할 경우 별도 개인정보 정책이 필요합니다.

## 8. User가 절대로 저장하지 않는 정보

User Domain은 아래 정보를 저장하지 않습니다.

- 주민등록번호
- 주소
- 전화번호
- 원본 IP
- 민감정보
- 건강 정보
- 종교
- 정치 성향
- 성적 지향
- 결제 정보
- 사용자의 연락처 목록
- 추천과 무관한 브라우징 기록

### 이유

- MyOTT의 추천, Watch Later, 취향 저장 기능에 필요하지 않습니다.
- 유출 시 사용자에게 큰 피해가 될 수 있습니다.
- Data Policy의 최소 수집 원칙과 충돌합니다.
- 회원가입 없는 추천 사용 흐름을 유지하려면 사용자 데이터 수집을 최소화해야 합니다.

## 9. 확장성

### Community

댓글, 좋아요, Community Picks가 추가되면 사용자 공개 프로필이 필요할 수 있습니다. 이 경우 `users`와 분리된 `user_profiles` 후보를 검토합니다. 공개 표시 이름, 아바타, 자기소개 같은 데이터는 개인정보 정책과 신고/차단 정책이 필요합니다.

### Taste DNA

Taste DNA는 User Domain의 취향 저장과 AI Domain의 `preference_vector`를 사용자에게 보여주는 기능입니다. 사용자가 자신의 취향을 수정하거나 초기화할 수 있어야 합니다.

### 친구 추천

친구 추천 기능은 관계형 데이터와 개인정보 위험이 커집니다. 친구 관계, 초대, 공유 링크, 차단 정책을 별도 도메인으로 분리해 검토해야 합니다.

### 공유

추천 결과 또는 Watch Later를 공유할 수 있습니다. 공유 기능은 공개 범위, 만료 기간, 링크 접근 권한을 함께 설계해야 합니다.

### 익명에서 로그인 전환

익명 사용자가 로그인하면 기존 세션의 추천 기록과 Quick Pick 선택을 계정에 연결할지 선택할 수 있어야 합니다. 자동 연결보다 사용자에게 명확히 안내하고 선택권을 주는 방향을 우선합니다.

## 10. 구현 경계

- SQL은 작성하지 않습니다.
- ERD는 그리지 않습니다.
- 실제 DB 테이블을 생성하지 않습니다.
- Supabase 연결은 하지 않습니다.
- TMDB 연결은 하지 않습니다.
- UI 또는 기능 코드는 수정하지 않습니다.

## 11. 다음 검토 사항

- Supabase Auth와 `users` 테이블의 책임 범위를 더 정확히 나눕니다.
- 익명 세션 보관 기간과 로그인 전환 정책을 Data Policy와 맞춥니다.
- `recommendation_requests`와 AI Domain의 `recommendation_log` 이름을 통일할지 결정합니다.
- `user_preferences`와 AI Domain의 `preference_vector` 관계를 정리합니다.
- 알림 기능에서 이메일, 푸시 토큰, 인앱 알림 중 v1.0 범위를 선택합니다.
