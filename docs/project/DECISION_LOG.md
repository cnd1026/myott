# Decision Log

이 문서는 MyOTT의 중요한 제품/기술 결정을 기록합니다.

## DL-001 Movie Table 폐기 -> Contents 채택

초기에는 영화 중심의 `movie` 테이블을 떠올릴 수 있었지만, MyOTT는 영화, 드라마, 애니를 함께 다룹니다. 장기적으로 만화, 웹툰, 소설, 게임, 음악까지 확장할 수 있으므로 단일 `contents` 중심 모델을 채택합니다.

## DL-002 회원가입 필수 폐기 -> 익명 추천

MyOTT는 첫 방문 사용자가 회원가입 없이도 추천을 받을 수 있어야 합니다. 로그인은 취향 저장, Watch Later, 추천 기록 같은 개인 기능을 위한 선택 기능으로 둡니다.

## DL-003 개인정보 과수집 폐기 -> 최소 수집

이름, 생년월일, 전화번호, 주소, 주민등록번호, 원본 IP, 민감정보는 추천 품질에 필수적이지 않습니다. MyOTT는 "필요한 데이터만 저장한다"를 데이터 철학으로 채택합니다.

## DL-004 직접 TMDB 의존 완화 -> Provider 구조

TMDB는 첫 번째 콘텐츠 Provider로 사용하지만, MyOTT 내부가 TMDB 응답 구조에 직접 묶이지 않도록 Provider(Adapter) 구조를 설계합니다. 향후 JustWatch, AniList, OpenLibrary, Steam을 추가할 수 있게 합니다.

## DL-005 다중 페이지 흐름보다 한 페이지 추천 흐름

MVP 추천 경험은 사용자가 들어와서 입력하고, 추천받고, 결과를 확인하는 흐름이 한 페이지 안에서 끝나야 합니다. 페이지 이동은 추천 집중도를 낮추므로 현재는 한 페이지 구조를 유지합니다.

## DL-006 실제 추천 이전에 더미 UX 완성

TMDB, Supabase, AI 추천을 붙이기 전에도 사용자가 추천 흐름을 이해할 수 있어야 합니다. 그래서 Sprint 2와 Sprint 3에서는 더미 데이터 기반 UX를 먼저 완성했습니다.

## DL-007 SQL 작성 전 문서 설계 우선

DB는 Content, AI, User/Session, Inventory 문서로 먼저 정리합니다. 실제 SQL, ERD, Supabase 연결은 도메인 경계와 MVP 테이블 범위를 좁힌 뒤 진행합니다.

## DL-008 AI는 개인정보를 학습하지 않음

MyOTT AI는 사용자의 이름, 전화번호, 주소, 생년월일, 원본 IP, 민감정보를 학습하지 않습니다. 익명화된 추천 패턴과 행동 통계, 콘텐츠 메타데이터를 중심으로 추천 품질을 개선합니다.

## DL-009 Watch Later는 v1 개인 기능 후보

Watch Later는 로그인 사용자가 추천 결과를 저장하고 다시 방문할 이유를 만드는 핵심 개인 기능입니다. v1 후보로 유지하되, 구현 전 저장 정책과 삭제 정책을 함께 검토합니다.

## DL-010 Community 기능은 v2 이후

댓글, 좋아요, 추천/비추천, Community Picks는 매력적인 확장 기능이지만 운영 정책과 신고/차단 설계가 필요합니다. v1에서는 추천과 개인화 경험을 우선합니다.

## DL-011 Project Memory System 도입

Sprint가 길어지고 문서가 늘어나면서 새 스레드가 프로젝트를 빠르게 이어받을 구조가 필요해졌습니다. `docs/project/` 아래에 상태, 이력, 결정, 운영 규칙, 협업 방식을 모으는 PMS를 도입합니다.

## DL-012 국가 선택을 Primary Recommendation Hard Constraint로 적용

Sprint 9 Founder QA에서 국가가 선택된 요청도 기존 progressive fallback이 외국 작품으로 결과 12개를 채울 수 있음을 확인했습니다. Recommendation Architecture v2.0부터 Candidate Collection과 Ranking을 분리하고, 선택 국가와 콘텐츠 타입을 primary `results`의 hard constraint로 적용합니다.

정확 후보가 부족하면 같은 국가 안에서 장르만 완화합니다. 국가가 완화된 후보는 `relaxedResults`로 분리하며 primary에 자동 병합하지 않습니다. 이는 결과 수보다 조건 신뢰성을 우선하는 Breaking Change입니다. Seed recommendations/similar도 같은 국가 정책을 적용하고, 부족분은 seed genre 기반 country-scoped Discover로 보충합니다.

## DL-013 추천 정확도와 외부 호출 예산을 함께 제한

Candidate 품질을 높이기 위해 TMDB 호출량을 무제한 늘리는 방식은 응답 지연과 Rate Limit 위험을 제품 신뢰 문제로 바꿉니다. Recommendation Architecture v2.1부터 요청당 전체 24회, 목록 8회, Detail 16회, 동시 4회의 application-level budget을 적용합니다.

Discover는 exact 조건을 단계적으로 실행하고 충분한 후보가 확보되면 조기 종료합니다. 동일 요청은 deduplicate하고, 짧은 TTL의 best-effort cache를 사용하며, 429와 일시 오류만 최대 두 번 재시도합니다. Primary는 exact 장르 후보를 최소 80% 유지하고 same-country-relaxed를 최대 20%로 제한합니다. 예산이 소진되면 확보한 TMDB 결과만 반환하며 Mock 또는 외국 작품으로 조용히 채우지 않습니다.

## DL-014 TMDB 예산을 Multi-Seed Recommendation Action 단위로 공유

Seed마다 별도 `/api/search`와 Request Context를 생성하면 개별 24회 제한을 지켜도 사용자 추천 동작 전체 호출량이 Seed 수에 비례해 증가합니다. Recommendation Architecture v2.2부터 실제 Submit은 단일 `POST /api/recommend/seeds`를 사용하고 모든 Search, Recommendations, Similar, Discover, Detail 요청이 하나의 Context와 24/8/16 예산을 공유합니다.

Seed는 Search, Recommendations, Similar, Discover phase 순으로 round-robin 처리합니다. 일부 Seed 실패나 전체 Deadline 도달 시 성공한 TMDB 결과를 유지하며 Mock과 혼합하지 않습니다. 처리하지 못한 Seed는 deferred, 검색 결과가 없는 Seed는 unresolved로 명시합니다. 개별 Fetch 8초, 전체 Action 15초, Retry-After 5초 상한을 적용하며 Live QA는 Product 경로의 Cold/Warm 실행을 분리합니다.

## DL-015 장르와 Seed 확인 상태를 공통 계약으로 관리

프런트와 서버가 장르 ID를 따로 유지하면 같은 `genre-sf`가 Movie `878`로만 해석되거나 TV `10765`를 누락하여 브라우저 결과가 Provider 직접 호출과 달라질 수 있습니다. Recommendation Architecture v2.3부터 `genreContract.js`를 Quick Pick, Option Metadata, TMDB Discover, Candidate Pipeline, Weight Engine, Mock Provider, Evaluator의 장르 Source of Truth로 사용합니다.

TMDB TV가 SF와 Fantasy를 `10765`로 결합하고 독립 Thriller 장르를 제공하지 않는 한계는 숨기지 않습니다. TV SF는 `provider-combined`, TV Thriller는 Crime/Mystery provider evidence 또는 제한된 semantic evidence로 구분하며 단순 Drama는 Thriller로 인정하지 않습니다.

자동완성으로 확인된 작품은 사용자 입력 문자열과 resolved TMDB metadata를 분리합니다. 입력창은 원문을 유지하고 서버는 confirmed ID로 Search를 생략합니다. 고정 Search 개수 대신 unresolved Seed가 사용하지 않은 Recommendation 예약을 뒤의 Seed Search에 재사용하며, 총 24/8/16 예산은 유지합니다. 기존 `titles`와 `results` 계약은 유지하므로 Breaking Change는 아닙니다.

## DL-016 Provider 장르와 Canonical Taxonomy를 분리

TMDB TV의 `10759`, `10765`, `10768`처럼 하나의 Provider ID가 복합 의미를 나타내는 경우, 연결된 모든 사용자 장르를 작품에 자동 부여하지 않습니다. Recommendation Architecture v2.4부터 Provider ID는 evidence로 보존하고 MyOTT의 Canonical, Combined, Semantic Specialized value를 별도 분류합니다.

TV Drama `18`은 로맨스 evidence가 없으면 로맨스로, Mystery `9648`은 공포 evidence가 없으면 공포로 판정하지 않습니다. TV 영화, 뉴스, 리얼리티, 토크, 소프는 `format-*`으로 이동하고 가족, 키즈, 애니메이션은 audience/style로 분리합니다. 기존 `genre-*` 입력은 alias migration으로 계속 지원하므로 Breaking Change는 아닙니다. 향후 사용자 취향 저장은 표시 label이나 Provider ID가 아니라 Canonical value를 기준으로 합니다.
