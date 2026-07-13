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
