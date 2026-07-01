# MyOTT Service Architecture Draft

MyOTT의 기능 범위와 데이터 요구사항을 먼저 정리한 설계 초안입니다. 이 문서는 방향을 정하는 용도이며, 실제 DB 구현이나 마이그레이션은 포함하지 않습니다.

## 1. 현재 기능

### 추천

- 상태: Sprint 3 MVP UI 완료
- 설명: 더미 데이터 기반으로 추천 결과 카드를 표시합니다. Quick Pick 선택값과 작품 입력값에 따라 결과와 추천 이유가 달라집니다.
- 필요한 DB:
  - `content_catalog`: 추천 카드에 표시할 작품 기본 정보
  - `recommendation_log`: 사용자가 어떤 조건으로 추천을 받았는지 기록

### Quick Pick

- 상태: 구현됨
- 설명: 장르, 국가, 분위기, 러닝타임을 빠르게 선택해 작품 입력 없이도 추천을 시작합니다.
- 필요한 DB:
  - `preference_tag`: Quick Pick 옵션 정의
  - `content_tag`: 작품과 Quick Pick 태그 연결

### 상세 Layer

- 상태: 구현됨
- 설명: 추천 카드를 클릭하면 포스터, 제목, 장르, 감독, 배우, 줄거리, 추천 이유를 Layer로 보여줍니다.
- 필요한 DB:
  - `content_detail`: 줄거리, 포스터, 감독, 배우 등 상세 정보
  - `person`: 감독, 배우 인물 정보
  - `content_credit`: 작품과 인물의 역할 연결

### 작품 입력

- 상태: 구현됨
- 설명: 사용자가 좋아하는 작품을 입력하면 추천 이유에 입력 작품명이 반영됩니다.
- 필요한 DB:
  - `user_input_log`: 추천 요청 시 입력한 작품명 기록
  - `content_alias`: 사용자가 입력한 작품명과 실제 작품 매칭용 별칭

## 2. 출시 기능 (v1.0)

### TMDB

- 설명: TMDB API를 통해 작품 검색, 포스터, 줄거리, 장르, 인물 정보를 가져옵니다.
- 필요한 DB:
  - `content_catalog`
  - `content_detail`
  - `external_content_id`
  - `person`
  - `content_credit`

### AI 추천

- 설명: 사용자의 작품 입력, Quick Pick, OTT 선택을 바탕으로 추천 이유와 추천 목록을 생성합니다.
- 필요한 DB:
  - `recommendation_log`
  - `recommendation_result`
  - `user_preference_profile`
  - `preference_tag`

### OTT 필터

- 설명: 사용자가 이용 중인 OTT 기준으로 볼 수 있는 작품을 우선 추천합니다.
- 필요한 DB:
  - `ott_provider`
  - `content_availability`
  - `user_ott_provider`

### 로그인

- 설명: 사용자의 취향 저장, 추천 기록, 개인화 기능을 위해 계정 기능을 제공합니다.
- 필요한 DB:
  - `user`
  - `user_auth_provider`
  - `user_session`

### 취향 저장

- 설명: 사용자가 선택한 Quick Pick, 좋아한 작품, 추천 반응을 취향 프로필로 저장합니다.
- 필요한 DB:
  - `user_preference_profile`
  - `user_preference_tag`
  - `favorite_content`
  - `recommendation_log`

## 3. 출시 후 기능 (v2.0)

### 댓글

- 설명: 작품 또는 추천 결과에 사용자가 의견을 남깁니다.
- 필요한 DB:
  - `comment`
  - `comment_report`

### 좋아요

- 설명: 작품, 댓글, 추천 결과에 좋아요를 남깁니다.
- 필요한 DB:
  - `vote`

### 추천/비추천

- 설명: 추천 결과가 마음에 들었는지 피드백을 남겨 추천 품질 개선에 사용합니다.
- 필요한 DB:
  - `recommendation_feedback`
  - `recommendation_result`

### Community Picks

- 설명: 사용자들이 많이 저장하거나 좋게 평가한 작품을 커뮤니티 추천으로 보여줍니다.
- 필요한 DB:
  - `community_pick`
  - `vote`
  - `recommendation_feedback`
  - `favorite_content`

### OTT 종료 예정

- 설명: 특정 OTT에서 곧 내려가는 작품을 알려줍니다.
- 필요한 DB:
  - `content_availability`
  - `availability_event`

### 신규 공개 예정

- 설명: 곧 공개될 영화, 드라마, 애니 정보를 모아 보여줍니다.
- 필요한 DB:
  - `release_schedule`
  - `content_catalog`
  - `ott_provider`

## 4. 장기 목표 (v3.0+)

### 만화

- 설명: 영화/드라마/애니 외에 만화 추천을 확장합니다.
- 필요한 DB:
  - `content_catalog`
  - `comic_detail`
  - `creator`

### 웹툰

- 설명: 플랫폼별 웹툰 추천과 연재 상태 정보를 제공합니다.
- 필요한 DB:
  - `content_catalog`
  - `webtoon_detail`
  - `platform_availability`

### 소설

- 설명: 장르, 분위기, 길이, 문체 기반으로 소설을 추천합니다.
- 필요한 DB:
  - `content_catalog`
  - `novel_detail`
  - `author`

### 게임

- 설명: 플레이 취향, 장르, 플레이타임, 플랫폼 기준으로 게임을 추천합니다.
- 필요한 DB:
  - `content_catalog`
  - `game_detail`
  - `game_platform_availability`

### 음악

- 설명: 분위기, 장르, 아티스트 취향 기반 음악 추천으로 확장합니다.
- 필요한 DB:
  - `content_catalog`
  - `music_track`
  - `artist`
  - `playlist`

## 5. DB 구현 원칙

- 이 문서는 DB 설계 초안이며 실제 테이블 생성, 마이그레이션, Supabase 연결은 하지 않습니다.
- 기능이 확정되기 전까지는 필요한 DB 이름만 기록합니다.
- 실제 구현 시에는 중복 테이블을 합치고, 사용자 개인정보와 추천 로그 보관 정책을 먼저 정합니다.
