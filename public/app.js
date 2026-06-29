const catalog = [
  {
    title: "인터스텔라",
    type: "movie",
    year: 2014,
    country: "미국",
    genres: ["SF", "드라마", "모험"],
    director: "크리스토퍼 놀란",
    actors: ["매튜 맥커너히", "앤 해서웨이", "제시카 차스테인"],
    rating: 8.7,
    runtime: 169,
    ott: ["Watcha", "TVING"],
    mood: ["brainy", "moving"],
    keywords: ["우주", "시간", "가족", "철학", "웅장함"],
    synopsis: "인류의 미래를 위해 우주로 향한 탐사대가 시간과 사랑의 의미를 마주한다.",
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
  },
  {
    title: "인셉션",
    type: "movie",
    year: 2010,
    country: "미국",
    genres: ["SF", "스릴러", "액션"],
    director: "크리스토퍼 놀란",
    actors: ["레오나르도 디카프리오", "조셉 고든 레빗", "엘런 페이지"],
    rating: 8.8,
    runtime: 148,
    ott: ["Netflix", "Watcha"],
    mood: ["brainy", "tense"],
    keywords: ["꿈", "반전", "심리", "시간", "미로"],
    synopsis: "타인의 꿈에 침투하는 전문가가 불가능에 가까운 생각 심기 작전에 뛰어든다.",
    poster: "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg"
  },
  {
    title: "테넷",
    type: "movie",
    year: 2020,
    country: "미국",
    genres: ["SF", "액션", "스릴러"],
    director: "크리스토퍼 놀란",
    actors: ["존 데이비드 워싱턴", "로버트 패틴슨", "엘리자베스 데비키"],
    rating: 7.4,
    runtime: 150,
    ott: ["Netflix"],
    mood: ["brainy", "tense"],
    keywords: ["시간역행", "첩보", "퍼즐", "액션", "운명"],
    synopsis: "시간을 거스르는 기술을 둘러싸고 세계의 생존을 건 작전이 시작된다.",
    poster: "https://image.tmdb.org/t/p/w500/aCIFMriQh8rvhxpN1IWGgvH0Tlg.jpg"
  },
  {
    title: "컨택트",
    type: "movie",
    year: 2016,
    country: "미국",
    genres: ["SF", "드라마", "미스터리"],
    director: "드니 빌뇌브",
    actors: ["에이미 아담스", "제레미 레너", "포레스트 휘태커"],
    rating: 8.4,
    runtime: 116,
    ott: ["Watcha", "TVING"],
    mood: ["brainy", "moving"],
    keywords: ["언어", "시간", "외계", "철학", "감성"],
    synopsis: "지구에 도착한 외계 생명체와 소통하기 위해 언어학자가 미지의 언어를 해독한다.",
    poster: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg"
  },
  {
    title: "블레이드 러너 2049",
    type: "movie",
    year: 2017,
    country: "미국",
    genres: ["SF", "드라마", "스릴러"],
    director: "드니 빌뇌브",
    actors: ["라이언 고슬링", "해리슨 포드", "아나 데 아르마스"],
    rating: 8.1,
    runtime: 164,
    ott: ["Netflix", "Watcha"],
    mood: ["brainy", "moving"],
    keywords: ["정체성", "디스토피아", "철학", "고독", "인공지능"],
    synopsis: "새로운 블레이드 러너가 오래 묻혀 있던 비밀을 추적하며 자신의 존재를 의심한다.",
    poster: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg"
  },
  {
    title: "엑스 마키나",
    type: "movie",
    year: 2015,
    country: "영국",
    genres: ["SF", "스릴러", "드라마"],
    director: "알렉스 갈랜드",
    actors: ["도널 글리슨", "알리시아 비칸데르", "오스카 아이삭"],
    rating: 7.7,
    runtime: 108,
    ott: ["Watcha"],
    mood: ["brainy", "tense"],
    keywords: ["인공지능", "심리", "밀실", "윤리", "반전"],
    synopsis: "젊은 개발자가 인간처럼 사고하는 AI의 테스트에 초대되며 불편한 진실을 마주한다.",
    poster: "https://image.tmdb.org/t/p/w500/dmJW8IAKHKxFNiUnoDR7JfsK7Rp.jpg"
  },
  {
    title: "셔터 아일랜드",
    type: "movie",
    year: 2010,
    country: "미국",
    genres: ["미스터리", "스릴러", "드라마"],
    director: "마틴 스코세이지",
    actors: ["레오나르도 디카프리오", "마크 러팔로", "벤 킹슬리"],
    rating: 8.2,
    runtime: 138,
    ott: ["Netflix"],
    mood: ["brainy", "tense"],
    keywords: ["반전", "심리", "섬", "트라우마", "추적"],
    synopsis: "실종 사건을 조사하러 정신병원에 간 연방보안관이 섬 전체의 비밀에 휘말린다.",
    poster: "https://image.tmdb.org/t/p/w500/4GDy0PHYX3VRXUtwK5ysFbg3kEx.jpg"
  },
  {
    title: "나이브스 아웃",
    type: "movie",
    year: 2019,
    country: "미국",
    genres: ["미스터리", "코미디", "범죄"],
    director: "라이언 존슨",
    actors: ["다니엘 크레이그", "아나 데 아르마스", "크리스 에반스"],
    rating: 7.9,
    runtime: 130,
    ott: ["Netflix"],
    mood: ["light", "brainy"],
    keywords: ["추리", "가족", "풍자", "반전", "대화"],
    synopsis: "유명 추리 작가의 죽음을 둘러싸고 가족 구성원 모두가 용의자가 된다.",
    poster: "https://image.tmdb.org/t/p/w500/pThyQovXQrw2m0s9x82twj48Jq4.jpg"
  },
  {
    title: "그랜드 부다페스트 호텔",
    type: "movie",
    year: 2014,
    country: "미국",
    genres: ["코미디", "모험", "드라마"],
    director: "웨스 앤더슨",
    actors: ["랄프 파인즈", "토니 레볼로리", "시얼샤 로넌"],
    rating: 8.1,
    runtime: 100,
    ott: ["Disney+", "Watcha"],
    mood: ["light", "moving"],
    keywords: ["유머", "색감", "우정", "모험", "기억"],
    synopsis: "전설적인 호텔 지배인과 로비보이가 도난당한 명화를 둘러싼 소동에 휘말린다.",
    poster: "https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg"
  },
  {
    title: "라라랜드",
    type: "movie",
    year: 2016,
    country: "미국",
    genres: ["로맨스", "뮤지컬", "드라마"],
    director: "데이미언 셔젤",
    actors: ["라이언 고슬링", "엠마 스톤", "존 레전드"],
    rating: 8.0,
    runtime: 128,
    ott: ["Watcha", "TVING"],
    mood: ["moving", "light"],
    keywords: ["음악", "꿈", "사랑", "여운", "청춘"],
    synopsis: "배우 지망생과 재즈 피아니스트가 꿈과 사랑 사이에서 빛나는 계절을 보낸다.",
    poster: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg"
  },
  {
    title: "기생충",
    type: "movie",
    year: 2019,
    country: "한국",
    genres: ["드라마", "스릴러", "코미디"],
    director: "봉준호",
    actors: ["송강호", "이선균", "조여정"],
    rating: 8.5,
    runtime: 132,
    ott: ["TVING", "Watcha"],
    mood: ["brainy", "tense"],
    keywords: ["계급", "블랙코미디", "반전", "가족", "사회"],
    synopsis: "가난한 가족이 부유한 가족의 삶에 하나씩 스며들며 예상치 못한 파국이 시작된다.",
    poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"
  },
  {
    title: "헤어질 결심",
    type: "movie",
    year: 2022,
    country: "한국",
    genres: ["로맨스", "미스터리", "드라마"],
    director: "박찬욱",
    actors: ["탕웨이", "박해일", "고경표"],
    rating: 7.9,
    runtime: 138,
    ott: ["TVING"],
    mood: ["moving", "brainy"],
    keywords: ["사랑", "수사", "집착", "여운", "미장센"],
    synopsis: "산 정상 사망 사건을 맡은 형사가 용의자와 가까워지며 감정의 균열을 겪는다.",
    poster: "https://image.tmdb.org/t/p/w500/6z9TRj7ZD0y1A2r8QOE973wz8hS.jpg"
  },
  {
    title: "오징어 게임",
    type: "series",
    year: 2021,
    country: "한국",
    genres: ["스릴러", "드라마", "액션"],
    director: "황동혁",
    actors: ["이정재", "정호연", "박해수"],
    rating: 8.0,
    runtime: 60,
    ott: ["Netflix"],
    mood: ["tense", "brainy"],
    keywords: ["생존", "게임", "사회", "긴장", "계급"],
    synopsis: "벼랑 끝에 몰린 사람들이 거액의 상금을 두고 잔혹한 게임에 참가한다.",
    poster: "https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg"
  },
  {
    title: "다크",
    type: "series",
    year: 2017,
    country: "독일",
    genres: ["SF", "미스터리", "드라마"],
    director: "바란 보 오다르",
    actors: ["루이스 호프만", "마야 쇠네", "올리버 마수치"],
    rating: 8.7,
    runtime: 55,
    ott: ["Netflix"],
    mood: ["brainy", "tense"],
    keywords: ["시간여행", "가족", "운명", "퍼즐", "미스터리"],
    synopsis: "작은 마을에서 아이가 사라진 뒤 여러 세대에 걸친 시간의 비밀이 드러난다.",
    poster: "https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg"
  },
  {
    title: "브레이킹 배드",
    type: "series",
    year: 2008,
    country: "미국",
    genres: ["범죄", "드라마", "스릴러"],
    director: "빈스 길리건",
    actors: ["브라이언 크랜스턴", "애런 폴", "안나 건"],
    rating: 9.5,
    runtime: 49,
    ott: ["Netflix"],
    mood: ["tense", "brainy"],
    keywords: ["범죄", "변화", "가족", "도덕", "긴장"],
    synopsis: "평범한 화학 교사가 가족을 위해 범죄의 세계로 들어서며 괴물이 되어 간다.",
    poster: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg"
  },
  {
    title: "더 베어",
    type: "series",
    year: 2022,
    country: "미국",
    genres: ["드라마", "코미디"],
    director: "크리스토퍼 스토러",
    actors: ["제러미 앨런 화이트", "아요 에데비리", "에번 모스배크랙"],
    rating: 8.6,
    runtime: 30,
    ott: ["Disney+"],
    mood: ["tense", "moving"],
    keywords: ["요리", "가족", "성장", "압박", "팀워크"],
    synopsis: "젊은 셰프가 가족이 남긴 샌드위치 가게를 맡아 혼란과 재건을 겪는다.",
    poster: "https://image.tmdb.org/t/p/w500/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg"
  },
  {
    title: "센과 치히로의 행방불명",
    type: "animation",
    year: 2001,
    country: "일본",
    genres: ["애니메이션", "판타지", "모험"],
    director: "미야자키 하야오",
    actors: ["히이라기 루미", "이리노 미유", "나츠키 마리"],
    rating: 8.6,
    runtime: 125,
    ott: ["Netflix"],
    mood: ["moving", "light"],
    keywords: ["성장", "환상", "가족", "모험", "여운"],
    synopsis: "낯선 세계에 들어간 소녀가 부모를 구하고 자신의 이름과 용기를 찾아간다.",
    poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"
  },
  {
    title: "너의 이름은",
    type: "animation",
    year: 2016,
    country: "일본",
    genres: ["애니메이션", "로맨스", "드라마"],
    director: "신카이 마코토",
    actors: ["카미키 류노스케", "카미시라이시 모네", "나가사와 마사미"],
    rating: 8.4,
    runtime: 106,
    ott: ["Watcha", "TVING"],
    mood: ["moving", "light"],
    keywords: ["시간", "운명", "청춘", "사랑", "여운"],
    synopsis: "서로의 몸이 바뀌는 두 청춘이 시간과 공간을 넘어 이어진 인연을 좇는다.",
    poster: "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg"
  },
  {
    title: "스파이더맨: 뉴 유니버스",
    type: "animation",
    year: 2018,
    country: "미국",
    genres: ["애니메이션", "액션", "모험"],
    director: "밥 퍼시케티",
    actors: ["샤메익 무어", "제이크 존슨", "헤일리 스타인펠드"],
    rating: 8.4,
    runtime: 117,
    ott: ["Netflix", "Watcha"],
    mood: ["light", "moving"],
    keywords: ["히어로", "성장", "멀티버스", "가족", "액션"],
    synopsis: "평범한 소년 마일스가 여러 차원의 스파이더맨들과 만나 자신만의 영웅이 된다.",
    poster: "https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg"
  },
  {
    title: "아케인",
    type: "animation",
    year: 2021,
    country: "미국",
    genres: ["애니메이션", "액션", "드라마"],
    director: "파스칼 샤뤼",
    actors: ["헤일리 스타인펠드", "엘라 퍼넬", "케이티 렁"],
    rating: 9.0,
    runtime: 41,
    ott: ["Netflix"],
    mood: ["tense", "moving"],
    keywords: ["자매", "계급", "도시", "비극", "액션"],
    synopsis: "분열된 두 도시와 갈라진 자매의 운명이 마법 공학의 탄생과 함께 흔들린다.",
    poster: "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg"
  },
  {
    title: "하울의 움직이는 성",
    type: "animation",
    year: 2004,
    country: "일본",
    genres: ["애니메이션", "판타지", "로맨스"],
    director: "미야자키 하야오",
    actors: ["바이쇼 치에코", "기무라 타쿠야", "미와 아키히로"],
    rating: 8.2,
    runtime: 119,
    ott: ["Netflix", "Watcha"],
    mood: ["moving", "light"],
    keywords: ["마법", "성장", "사랑", "전쟁", "환상"],
    synopsis: "저주로 노인이 된 소녀가 움직이는 성의 마법사 하울을 만나 자신을 되찾아 간다.",
    poster: "https://image.tmdb.org/t/p/w500/23hUJh7JdO23SpgUB5oiFDQk2wX.jpg"
  },
  {
    title: "킹덤",
    type: "series",
    year: 2019,
    country: "한국",
    genres: ["스릴러", "사극", "액션"],
    director: "김성훈",
    actors: ["주지훈", "배두나", "류승룡"],
    rating: 8.3,
    runtime: 50,
    ott: ["Netflix"],
    mood: ["tense", "brainy"],
    keywords: ["좀비", "권력", "생존", "조선", "긴장"],
    synopsis: "역병이 번진 조선에서 왕세자가 음모와 생존의 진실을 추적한다.",
    poster: "https://image.tmdb.org/t/p/w500/9pTNhQ5m2v9W2o9u1lB1KwpD3TA.jpg"
  },
  {
    title: "불가사리",
    type: "movie",
    year: 1990,
    country: "미국",
    genres: ["공포", "코미디", "액션"],
    director: "론 언더우드",
    actors: ["케빈 베이컨", "프레드 워드", "핀 카터"],
    rating: 7.1,
    runtime: 96,
    ott: ["Watcha"],
    mood: ["light", "tense"],
    keywords: ["괴수", "사막", "생존", "B급", "유머"],
    synopsis: "외딴 사막 마을 사람들이 땅속에서 습격하는 괴생명체에 맞서 살아남으려 한다.",
    poster: "https://image.tmdb.org/t/p/w500/cA4ggkZ3r1d5r9hOAUWC8x5ul2i.jpg"
  },
  {
    title: "부산행",
    type: "movie",
    year: 2016,
    country: "한국",
    genres: ["액션", "스릴러", "드라마"],
    director: "연상호",
    actors: ["공유", "정유미", "마동석"],
    rating: 7.6,
    runtime: 118,
    ott: ["Netflix", "TVING"],
    mood: ["tense", "moving"],
    keywords: ["좀비", "가족", "생존", "열차", "희생"],
    synopsis: "좀비 바이러스가 퍼진 한국에서 부산행 열차에 오른 사람들이 생존을 위해 싸운다.",
    poster: "https://image.tmdb.org/t/p/w500/vNVFt6dtcqnI7hqa6LFBUibuFiw.jpg"
  },
  {
    title: "도깨비",
    type: "series",
    year: 2016,
    country: "한국",
    genres: ["로맨스", "판타지", "드라마"],
    director: "이응복",
    actors: ["공유", "김고은", "이동욱"],
    rating: 8.6,
    runtime: 75,
    ott: ["TVING", "Netflix"],
    mood: ["moving", "light"],
    keywords: ["운명", "불멸", "사랑", "저승", "감성"],
    synopsis: "불멸의 삶을 끝내고 싶은 도깨비가 자신의 신부가 될 소녀와 운명적으로 만난다.",
    poster: "https://image.tmdb.org/t/p/w500/t7aUi8jbsIUSCNqA1akAbKUiYyL.jpg"
  },
  {
    title: "이상한 변호사 우영우",
    type: "series",
    year: 2022,
    country: "한국",
    genres: ["드라마", "코미디"],
    director: "유인식",
    actors: ["박은빈", "강태오", "강기영"],
    rating: 8.7,
    runtime: 70,
    ott: ["Netflix"],
    mood: ["light", "moving"],
    keywords: ["법정", "성장", "공감", "직장", "따뜻함"],
    synopsis: "천재적인 기억력을 가진 신입 변호사가 사건과 사람 사이에서 자신만의 방식으로 성장한다.",
    poster: "https://image.tmdb.org/t/p/w500/5RhFuY0PVJ3HgF1fN3TeWmGqg0G.jpg"
  },
  {
    title: "더 글로리",
    type: "series",
    year: 2022,
    country: "한국",
    genres: ["드라마", "스릴러"],
    director: "안길호",
    actors: ["송혜교", "이도현", "임지연"],
    rating: 8.1,
    runtime: 50,
    ott: ["Netflix"],
    mood: ["tense", "brainy"],
    keywords: ["복수", "학교폭력", "심리", "계획", "상처"],
    synopsis: "학창 시절 폭력으로 삶이 무너진 여성이 치밀하게 준비한 복수를 실행한다.",
    poster: "https://image.tmdb.org/t/p/w500/6jO8zQb0vO9WJgY5G6UQd7UG5wn.jpg"
  },
  {
    title: "슬램덩크",
    type: "animation",
    year: 1993,
    country: "일본",
    genres: ["애니메이션", "스포츠", "코미디"],
    director: "니시자와 노부타카",
    actors: ["쿠사오 타케시", "미도리카와 히카루", "야나다 키요유키"],
    rating: 8.7,
    runtime: 24,
    ott: ["Netflix", "TVING"],
    mood: ["light", "moving"],
    keywords: ["농구", "성장", "우정", "팀워크", "열정"],
    synopsis: "농구 초보 강백호가 북산고 농구부에서 동료들과 성장하며 코트를 뜨겁게 달군다.",
    poster: "https://image.tmdb.org/t/p/w500/q6YbX6L1kxlz3M35VZ95BqJ1G7x.jpg"
  },
  {
    title: "귀멸의 칼날",
    type: "animation",
    year: 2019,
    country: "일본",
    genres: ["애니메이션", "액션", "판타지"],
    director: "소토자키 하루오",
    actors: ["하나에 나츠키", "키토 아카리", "시모노 히로"],
    rating: 8.6,
    runtime: 24,
    ott: ["Netflix", "Watcha"],
    mood: ["tense", "moving"],
    keywords: ["가족", "검술", "요괴", "성장", "희생"],
    synopsis: "가족을 잃고 여동생을 구하려는 소년이 귀살대가 되어 혈귀와 싸운다.",
    poster: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg"
  },
  {
    title: "주술회전",
    type: "animation",
    year: 2020,
    country: "일본",
    genres: ["애니메이션", "액션", "판타지"],
    director: "박성후",
    actors: ["에노키 준야", "우치다 유마", "세토 아사미"],
    rating: 8.5,
    runtime: 24,
    ott: ["Netflix", "Watcha"],
    mood: ["tense", "light"],
    keywords: ["저주", "학원", "액션", "우정", "어둠"],
    synopsis: "특급 주물과 얽힌 소년이 저주를 퇴치하는 주술사들의 세계에 들어선다.",
    poster: "https://image.tmdb.org/t/p/w500/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg"
  },
  {
    title: "진격의 거인",
    type: "animation",
    year: 2013,
    country: "일본",
    genres: ["애니메이션", "액션", "드라마"],
    director: "아라키 테츠로",
    actors: ["카지 유우키", "이시카와 유이", "이노우에 마리나"],
    rating: 9.0,
    runtime: 24,
    ott: ["Netflix", "Watcha"],
    mood: ["tense", "brainy"],
    keywords: ["생존", "전쟁", "자유", "반전", "비극"],
    synopsis: "거인에게 위협받는 인류가 벽 안에서 살아가며 세계의 진실을 마주한다.",
    poster: "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg"
  }
];

const ottCatalog = {
  Netflix: { className: "ott-netflix", url: "https://www.netflix.com/search?q=" },
  "Disney+": { className: "ott-disney", url: "https://www.disneyplus.com/search?q=" },
  Watcha: { className: "ott-watcha", url: "https://watcha.com/search?query=" },
  TVING: { className: "ott-tving", url: "https://www.tving.com/search?keyword=" }
};

const state = {
  engine: "ai",
  view: "cards",
  favorites: new Set(JSON.parse(localStorage.getItem("sceneSenseFavorites") || "[]")),
  excluded: new Set(JSON.parse(localStorage.getItem("sceneSenseExcluded") || "[]")),
  compared: new Set(),
  remoteSearchCache: new Map(),
  tmdbEnabled: false,
  activePeerCode: "익명 취향군 A-00",
  activeReport: undefined,
  lastResults: []
};

const $ = (selector) => document.querySelector(selector);
const inputList = $("#inputList");
const template = $("#inputRowTemplate");
const recommendationGrid = $("#recommendationGrid");
const tasteSummary = $("#tasteSummary");
const dnaPanel = $("#dnaPanel");
const dataNote = $("#dataNote");
const keywordCloud = $("#keywordCloud");
const sampleInputs = ["인터스텔라", "인셉션", "테넷"];

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getInputs() {
  return [...inputList.querySelectorAll("input")]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function ensureRows() {
  let rows = [...inputList.querySelectorAll(".input-row")];
  if (rows.length < 3) {
    addInputRow();
    ensureRows();
    return;
  }

  const values = rows.map((row) => row.querySelector("input").value.trim());
  const lastFilledIndex = values.reduce((last, value, index) => (value ? index : last), -1);
  const neededRows = Math.max(3, lastFilledIndex + 2);

  while (rows.length > neededRows) {
    rows.at(-1).remove();
    rows = [...inputList.querySelectorAll(".input-row")];
  }

  while (rows.length < neededRows) {
    addInputRow();
    rows = [...inputList.querySelectorAll(".input-row")];
  }

  renumberRows();
}

function addInputRow(value = "") {
  const node = template.content.firstElementChild.cloneNode(true);
  const input = node.querySelector("input");
  const suggestions = node.querySelector(".suggestions");
  const clearButton = node.querySelector(".row-clear");
  node.querySelector(".row-number").textContent = inputList.children.length + 1;
  input.value = value;

  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      compactRows(input);
      return;
    }
    showSuggestions(input, suggestions);
    ensureRows();
  });
  input.addEventListener("focus", () => showSuggestions(input, suggestions));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const next = node.nextElementSibling?.querySelector("input");
      if (next) next.focus();
    }
  });
  input.addEventListener("blur", () => {
    setTimeout(() => suggestions.classList.remove("open"), 130);
  });
  clearButton.addEventListener("click", () => {
    input.value = "";
    suggestions.classList.remove("open");
    compactRows(input);
  });

  inputList.appendChild(node);
}

function matchCatalogItem(inputValue) {
  const input = normalize(inputValue);
  if (!input) return undefined;
  return catalog.find((item) => {
    const title = normalize(item.title);
    return title === input || (input.length >= 2 && title.includes(input));
  });
}

function canonicalizeTitle(inputValue) {
  return matchCatalogItem(inputValue)?.title || inputValue;
}

function catalogIdentity(item) {
  return item.tmdbId ? `${item.source || "tmdb"}:${item.tmdbId}` : normalize(`${item.title}-${item.year || ""}`);
}

function upsertCatalogItem(item) {
  const incomingIdentity = catalogIdentity(item);
  const index = catalog.findIndex((entry) => catalogIdentity(entry) === incomingIdentity || normalize(entry.title) === normalize(item.title));
  if (index >= 0) {
    catalog[index] = { ...catalog[index], ...item };
    return catalog[index];
  }
  catalog.push(item);
  return item;
}

async function apiJson(path) {
  try {
    const response = await fetch(path, { headers: { accept: "application/json" } });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  }
}

async function refreshApiStatus() {
  const status = await apiJson("/api/status");
  state.tmdbEnabled = Boolean(status?.tmdbEnabled);
}

async function searchRemoteItems(query) {
  const key = normalize(query);
  if (key.length < 2) return [];
  if (state.remoteSearchCache.has(key)) return state.remoteSearchCache.get(key);

  const payload = await apiJson(`/api/search?q=${encodeURIComponent(query)}`);
  state.tmdbEnabled = Boolean(payload?.tmdbEnabled);
  const results = Array.isArray(payload?.results) ? payload.results : [];
  results.forEach(upsertCatalogItem);
  state.remoteSearchCache.set(key, results);
  return results;
}

async function enrichInputValues(values) {
  const enriched = [];
  for (const value of values) {
    if (!matchCatalogItem(value)) {
      await searchRemoteItems(value);
    }
    enriched.push(canonicalizeTitle(value));
  }
  return enriched;
}

function loadSampleInputs() {
  inputList.innerHTML = "";
  sampleInputs.forEach(addInputRow);
  ensureRows();
  inputList.querySelector("input")?.focus();
}

function compactRows(sourceInput) {
  const rows = [...inputList.querySelectorAll(".input-row")];
  const sourceIndex = rows.findIndex((row) => row.contains(sourceInput));
  const values = rows
    .map((row) => row.querySelector("input").value.trim())
    .filter(Boolean);

  inputList.innerHTML = "";
  values.forEach(addInputRow);
  ensureRows();

  const focusIndex = Math.min(Math.max(sourceIndex, 0), inputList.querySelectorAll("input").length - 1);
  inputList.querySelectorAll("input")[focusIndex]?.focus();
}

function renumberRows() {
  [...inputList.querySelectorAll(".input-row")].forEach((row, index) => {
    row.querySelector(".row-number").textContent = index + 1;
  });
}

async function showSuggestions(input, box) {
  const query = normalize(input.value);
  box.innerHTML = "";
  if (!query) {
    box.classList.remove("open");
    return;
  }

  renderSuggestionButtons(input, box, localSuggestionMatches(query, 5));
  const remoteMatches = await searchRemoteItems(input.value);
  if (normalize(input.value) !== query) return;
  const merged = mergeSuggestions(localSuggestionMatches(query, 5).map(({ item }) => item), remoteMatches).slice(0, 8);
  renderSuggestionButtons(input, box, merged.map((item) => ({ item, score: titleDistance(query, normalize(item.title)) })));
}

function localSuggestionMatches(query, limit) {
  return catalog
    .map((item) => ({ item, score: titleDistance(query, normalize(item.title)) }))
    .filter(({ item, score }) => normalize(item.title).includes(query) || score <= 2)
    .sort((a, b) => a.score - b.score || b.item.rating - a.item.rating)
    .slice(0, limit);
}

function mergeSuggestions(localItems, remoteItems) {
  const seen = new Set();
  const merged = [];
  for (const item of [...localItems, ...remoteItems]) {
    const key = normalize(`${item.title}-${item.year || ""}`);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function renderSuggestionButtons(input, box, matches) {
  box.innerHTML = "";

  for (const { item } of matches) {
    const button = document.createElement("button");
    button.className = "suggestion";
    button.type = "button";
    const sourceLabel = item.source === "tmdb" ? "TMDb" : "Local";
    button.innerHTML = `<span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.year || "연도 미상")} · ${escapeHtml(item.genres[0])} · ${sourceLabel}</small>`;
    button.addEventListener("mousedown", () => {
      upsertCatalogItem(item);
      input.value = item.title;
      box.classList.remove("open");
      const mainRow = input.closest(".input-row");
      if (mainRow) {
        ensureRows();
        const next = mainRow.nextElementSibling?.querySelector("input");
        if (next) next.focus();
      }
    });
    box.appendChild(button);
  }

  box.classList.toggle("open", matches.length > 0);
}

function titleDistance(a, b) {
  if (b.includes(a)) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function findKnownInputs() {
  const matched = new Map();
  for (const title of getInputs()) {
    const item = matchCatalogItem(title);
    if (item) matched.set(item.title, item);
  }
  return [...matched.values()];
}

function findUnknownInputs() {
  return getInputs().filter((title) => !matchCatalogItem(title));
}

function countValues(items, field) {
  const map = new Map();
  for (const item of items) {
    const values = Array.isArray(item[field]) ? item[field] : [item[field]];
    for (const value of values) map.set(value, (map.get(value) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function scoreCandidate(candidate, seeds) {
  const seedGenres = new Set(seeds.flatMap((item) => item.genres));
  const seedKeywords = new Set(seeds.flatMap((item) => item.keywords));
  const seedActors = new Set(seeds.flatMap((item) => item.actors));
  const seedDirectors = new Set(seeds.map((item) => item.director));
  const mood = $("#moodSelect").value;
  const group = $("#groupSelect").value;

  let score = candidate.rating * 4;
  score += candidate.genres.filter((genre) => seedGenres.has(genre)).length * 15;
  score += candidate.keywords.filter((keyword) => seedKeywords.has(keyword)).length * 10;
  score += candidate.actors.filter((actor) => seedActors.has(actor)).length * 8;
  if (seedDirectors.has(candidate.director)) score += 18;
  if (mood !== "any" && candidate.mood.includes(mood)) score += 16;
  if (group === "family" && !candidate.genres.includes("스릴러") && candidate.rating >= 7.8) score += 6;
  if (group === "friends" && (candidate.genres.includes("스릴러") || candidate.genres.includes("코미디"))) score += 6;
  if (state.engine === "genre") score += candidate.genres.filter((genre) => seedGenres.has(genre)).length * 20;
  if (state.engine === "director" && seedDirectors.has(candidate.director)) score += 36;
  if (state.engine === "actor") score += candidate.actors.filter((actor) => seedActors.has(actor)).length * 24;
  if (state.engine === "rating") score += candidate.rating * 8;
  if (state.favorites.has(candidate.title)) score += 5;
  if (state.excluded.has(candidate.title)) score = -Infinity;

  return Math.round(score);
}

function filteredCatalog() {
  const type = $("#typeFilter").value;
  const country = $("#countryFilter").value;
  const minRating = Number($("#ratingFilter").value);

  return catalog.filter((item) => {
    if (type !== "all" && item.type !== type) return false;
    if (country !== "all" && item.country !== country) return false;
    return item.rating >= minRating;
  });
}

async function recommend() {
  const seeds = findKnownInputs();
  let inputs = getInputs();
  const enrichedInputs = await enrichInputValues(inputs);
  if (enrichedInputs.join("|") !== inputs.join("|")) {
    inputList.innerHTML = "";
    enrichedInputs.forEach(addInputRow);
    ensureRows();
    inputs = getInputs();
  }
  const unknownInputs = findUnknownInputs();
  if (inputs.length === 0) {
    renderEmpty("좋아했던 작품을 1개 이상 입력해 주세요.");
    return;
  }

  localStorage.setItem("sceneSenseRecentInputs", JSON.stringify(inputs));
  const refreshedSeeds = findKnownInputs();
  const seedTitles = new Set(refreshedSeeds.map((item) => item.title));
  const base = refreshedSeeds.length ? refreshedSeeds : catalog.filter((item) => inputs.some((input) => item.title.includes(input)));
  const scoringSeeds = base.length ? base : [catalog[0]];
  state.activePeerCode = buildAnonymousPeerCode(scoringSeeds);

  state.lastResults = filteredCatalog()
    .filter((item) => !seedTitles.has(item.title))
    .map((item) => ({ ...item, similarity: scoreCandidate(item, scoringSeeds) }))
    .filter((item) => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity || b.rating - a.rating)
    .slice(0, 9);

  renderTaste(scoringSeeds);
  renderDataNote(unknownInputs);
  renderDNA(scoringSeeds);
  renderResults();
}

function renderTaste(seeds) {
  const genres = countValues(seeds, "genres").slice(0, 5);
  const directors = countValues(seeds, "director").slice(0, 2);
  const actors = countValues(seeds, "actors").slice(0, 3);
  const keywords = countValues(seeds, "keywords").slice(0, 10);
  const maxGenre = Math.max(...genres.map(([, count]) => count), 1);

  tasteSummary.innerHTML = genres
    .slice(0, 3)
    .map(([genre, count]) => `
      <div class="metric">
        <strong>${escapeHtml(genre)}</strong>
        ${Math.round((count / maxGenre) * 100)}%
        <div class="bar"><span style="width: ${(count / maxGenre) * 100}%"></span></div>
      </div>
    `)
    .join("");

  const directorText = directors[0] ? `감독 선호: ${directors.map(([name, count]) => `${escapeHtml(name)} ${count}편`).join(", ")}` : "";
  const actorText = actors[0] ? `배우 선호: ${actors.map(([name]) => escapeHtml(name)).join(", ")}` : "";
  tasteSummary.insertAdjacentHTML("beforeend", `<p>${directorText}<br>${actorText}</p>`);

  keywordCloud.innerHTML = keywords.map(([keyword]) => `<span class="keyword">${escapeHtml(keyword)}</span>`).join("");
}

function renderDataNote(unknownInputs) {
  if (!unknownInputs.length) {
    dataNote.classList.remove("visible");
    dataNote.textContent = "";
    return;
  }

  dataNote.classList.add("visible");
  const prefix = state.tmdbEnabled
    ? "TMDb에서도 정확히 매칭하지 못한 입력"
    : "TMDb API 키가 아직 없어 로컬 DB에서만 확인한 입력";
  dataNote.textContent = `${prefix}: ${unknownInputs.join(", ")}. 제목은 입력값으로 유지되지만, 취향 분석은 현재 확보된 카탈로그 기준으로 보정됩니다.`;
}

function renderDNA(seeds) {
  const dnaRows = buildTasteDNA(seeds);
  state.activeReport = buildTasteReport(seeds, dnaRows);
  const peerTitles = state.lastResults.slice(0, 3).map((item) => item.title);
  dnaPanel.innerHTML = `
    <div class="dna-card">
      <h3>당신의 취향 DNA</h3>
      ${dnaRows.map((row) => `
        <div class="dna-row">
          <span>${escapeHtml(row.label)}</span>
          <div class="bar"><span style="width: ${row.value}%"></span></div>
          <strong>${row.value}%</strong>
        </div>
      `).join("")}
      <div class="peer-card">
        <h3>비슷한 익명 취향군</h3>
        <span class="peer-code">${escapeHtml(state.activePeerCode)}</span>
        <ul class="peer-list">
          ${peerTitles.map((title) => `<li>높게 반응한 작품: ${escapeHtml(title)}</li>`).join("") || "<li>추천 결과를 만들면 익명 취향군 반응이 표시됩니다.</li>"}
        </ul>
      </div>
    </div>
    <div class="report-card">
      <div class="report-hero">
        <div>
          <p class="eyebrow">AI 취향 리포트</p>
          <h3 class="report-type">${escapeHtml(state.activeReport.typeName)}</h3>
        </div>
        <div class="report-score">${state.activeReport.score}<span>점</span></div>
      </div>
      <ul class="report-list">
        ${state.activeReport.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
      <p class="report-copy-text">${escapeHtml(state.activeReport.shareText).replace(/\n/g, "<br>")}</p>
      <div class="report-actions">
        <button class="mini-button" type="button" data-action="copy-report">리포트 복사</button>
        <button class="mini-button" type="button" data-action="share-report">공유 문구 만들기</button>
      </div>
    </div>
  `;

  dnaPanel.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", handleReportAction);
  });
}

function buildTasteDNA(seeds) {
  const allGenres = seeds.flatMap((item) => item.genres);
  const allKeywords = seeds.flatMap((item) => item.keywords);
  const score = (terms, base = 46) => {
    const hits = [...allGenres, ...allKeywords].filter((value) => terms.includes(value)).length;
    return Math.min(96, base + hits * 13 + Math.max(0, seeds.length - 1) * 4);
  };

  return [
    { label: "감성 드라마", value: score(["드라마", "감성", "여운", "가족", "사랑"], 42) },
    { label: "미스터리/심리", value: score(["미스터리", "심리", "반전", "퍼즐", "추리"], 38) },
    { label: "SF 상상력", value: score(["SF", "우주", "시간", "시간여행", "인공지능", "멀티버스"], 36) },
    { label: "긴장감", value: score(["스릴러", "범죄", "긴장", "생존", "액션"], 34) },
    { label: "가벼운 재미", value: score(["코미디", "유머", "모험", "청춘"], 24) }
  ].sort((a, b) => b.value - a.value);
}

function buildTasteReport(seeds, dnaRows) {
  const genres = seeds.flatMap((item) => item.genres);
  const keywords = seeds.flatMap((item) => item.keywords);
  const combined = [...genres, ...keywords];
  const has = (terms) => combined.some((value) => terms.includes(value));
  const topDna = dnaRows[0]?.label || "취향 탐색";
  const secondDna = dnaRows[1]?.label || "균형감";
  const tensionScore = dnaRows.find((row) => row.label === "긴장감")?.value || 0;
  const movingScore = dnaRows.find((row) => row.label === "감성 드라마")?.value || 0;
  const brainScore = Math.max(
    dnaRows.find((row) => row.label === "SF 상상력")?.value || 0,
    dnaRows.find((row) => row.label === "미스터리/심리")?.value || 0
  );
  const lightScore = dnaRows.find((row) => row.label === "가벼운 재미")?.value || 0;
  const score = Math.min(99, Math.round((dnaRows.slice(0, 3).reduce((sum, row) => sum + row.value, 0) / 3) + seeds.length * 2));
  const code = buildTypeCode({ tensionScore, movingScore, brainScore, lightScore });
  const typeName = `${code}형 영화 취향`;

  const lines = [
    has(["성장", "청춘", "우정", "팀워크", "가족"]) ? "성장형 주인공을 좋아합니다." : "완성된 인물보다 흔들리는 인물의 선택에 더 끌립니다.",
    has(["반전", "퍼즐", "미스터리", "심리", "추리"]) ? "반전이 있는 작품을 선호합니다." : `${topDna} 분위기가 뚜렷한 작품에 잘 반응합니다.`,
    tensionScore >= movingScore ? "감성보다 긴장감을 선호합니다." : "긴장감보다 감정의 여운을 더 오래 기억합니다.",
    has(["운명", "시간", "시간여행", "정체성", "비극", "철학"]) ? "열린 결말과 해석할 여지가 있는 이야기를 좋아합니다." : "명확한 목표와 몰입하기 쉬운 전개를 편하게 즐깁니다.",
    `${withParticle(topDna, "와", "과")} ${withParticle(secondDna, "가", "이")} 함께 있을 때 만족도가 가장 높습니다.`
  ];

  const shareText = [
    "AI 취향 리포트",
    "",
    `나는 ${typeName}`,
    `취향 점수 ${score}점`,
    "",
    ...lines.map((line) => `- ${line}`),
    "",
    `익명 취향군: ${state.activePeerCode}`
  ].join("\n");

  return {
    typeName,
    score,
    lines,
    shareText
  };
}

function withParticle(word, vowelParticle, consonantParticle) {
  const lastChar = word[word.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return `${word}${vowelParticle}`;
  const hasFinal = (code - 0xac00) % 28 !== 0;
  return `${word}${hasFinal ? consonantParticle : vowelParticle}`;
}

function buildTypeCode(scores) {
  const first = scores.brainScore >= 70 ? "N" : "S";
  const second = scores.tensionScore >= scores.movingScore ? "T" : "F";
  const third = scores.lightScore >= 65 ? "P" : "J";
  const fourth = scores.brainScore + scores.tensionScore >= scores.movingScore + scores.lightScore ? "I" : "E";
  const code = `${fourth}${first}${second}${third}`;
  const known = ["INTP", "INTJ", "INFJ", "INFP", "ENTP", "ENFP", "ISTJ", "ISFP"];
  return known.includes(code) ? code : "INTP";
}

async function handleReportAction(event) {
  if (!state.activeReport) return;
  const button = event.currentTarget;
  const text = state.activeReport.shareText;
  await copyText(text);
  const original = button.textContent;
  button.textContent = button.dataset.action === "share-report" ? "공유 문구 복사됨" : "복사됨";
  setTimeout(() => {
    button.textContent = original;
  }, 1400);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function buildAnonymousPeerCode(seeds) {
  const source = seeds.flatMap((item) => [item.title, item.director, ...item.genres, ...item.keywords]).join("|");
  let hash = 0;
  for (let index = 0; index < source.length; index++) {
    hash = (hash * 31 + source.charCodeAt(index)) % 9973;
  }
  return `익명 취향군 ${String.fromCharCode(65 + (hash % 26))}-${String(hash % 1000).padStart(3, "0")}`;
}

function renderEmpty(message) {
  state.activeReport = undefined;
  tasteSummary.innerHTML = `<p>${escapeHtml(message)}</p>`;
  dataNote.classList.remove("visible");
  dataNote.textContent = "";
  dnaPanel.innerHTML = "";
  keywordCloud.innerHTML = "";
  recommendationGrid.innerHTML = "";
}

function renderResults() {
  recommendationGrid.className = `recommendation-grid ${state.view === "list" ? "list" : ""}`;
  if (state.lastResults.length === 0) {
    recommendationGrid.innerHTML = `<p class="meta-line">조건에 맞는 추천 결과가 없습니다. 필터를 조금 완화해 보세요.</p>`;
    return;
  }

  recommendationGrid.innerHTML = state.lastResults.map(renderCard).join("");
  recommendationGrid.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", handleCardAction);
  });
}

function renderCard(item) {
  const similarity = Math.min(98, Math.max(55, Math.round(item.similarity)));
  const favorite = state.favorites.has(item.title);
  const compared = state.compared.has(item.title);
  const title = escapeHtml(item.title);
  const titleAttr = escapeAttr(item.title);
  const poster = safeImageUrl(item.poster);
  const posterMarkup = poster
    ? `<img src="${escapeAttr(poster)}" alt="${title} 포스터" loading="lazy" />`
    : `<div class="poster-fallback">${title}</div>`;
  return `
    <article class="media-card">
      <button class="poster-button" type="button" data-action="detail" data-title="${titleAttr}" aria-label="${title} 상세 보기">
        ${posterMarkup}
        <span class="score-badge">${similarity}%</span>
      </button>
      <div class="card-body">
        <div class="card-title">
          <h3>${title}</h3>
          <button class="icon-button ${favorite ? "active" : ""}" type="button" data-action="favorite" data-title="${titleAttr}" aria-label="찜하기" title="찜하기">★</button>
        </div>
        <p class="meta-line">${escapeHtml(item.year)} · ${escapeHtml(item.country)} · ${item.rating.toFixed(1)} · ${escapeHtml(item.runtime)}분</p>
        <p class="credit-line"><strong>감독</strong> ${escapeHtml(item.director)}</p>
        <p class="credit-line"><strong>배우</strong> ${item.actors.slice(0, 3).map(escapeHtml).join(", ")}</p>
        <div class="chip-row">${item.genres.map((genre) => `<span class="chip">${escapeHtml(genre)}</span>`).join("")}</div>
        <p class="reason">${escapeHtml(buildReason(item, similarity))}</p>
        <p class="source-line">추천 출처: ${escapeHtml(state.activePeerCode)}의 집계 신호</p>
        <p class="synopsis">${escapeHtml(item.synopsis)}</p>
        <div class="ott-row">${renderOttLinks(item)}</div>
        <div class="card-actions">
          <button class="mini-button ${compared ? "active" : ""}" type="button" data-action="compare" data-title="${titleAttr}">비교</button>
          <button class="mini-button" type="button" data-action="exclude" data-title="${titleAttr}">이미 봤어요</button>
          <button class="mini-button" type="button" data-action="dislike" data-title="${titleAttr}">관심없음</button>
        </div>
      </div>
    </article>
  `;
}

function mediaTypeLabel(type) {
  if (type === "movie") return "영화";
  if (type === "series") return "드라마";
  return "애니메이션";
}

function renderOttLinks(item) {
  return item.ott.map((ott) => {
    const service = ottCatalog[ott] || { className: "ott-default", url: "https://www.google.com/search?q=" };
    const href = `${service.url}${encodeURIComponent(`${item.title} ${ott}`)}`;
    return `<a class="ott-link ${escapeAttr(service.className)}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ott)}</a>`;
  }).join("");
}

function buildReason(item, similarity) {
  const seeds = findKnownInputs();
  const base = seeds[0]?.title || getInputs()[0] || "입력한 작품";
  const shared = seeds.length
    ? item.keywords.filter((keyword) => seeds.some((seed) => seed.keywords.includes(keyword))).slice(0, 2)
    : item.keywords.slice(0, 2);
  const sharedText = shared.length ? shared.join(", ") : item.genres.slice(0, 2).join(", ");
  return `${base}와 ${similarity}% 비슷한 분위기입니다. ${sharedText} 요소가 강해서 취향 분석 결과와 잘 맞습니다.`;
}

function handleCardAction(event) {
  const { action, title } = event.currentTarget.dataset;
  const item = catalog.find((entry) => entry.title === title);
  if (action === "detail") showDetail(item);
  if (action === "favorite") {
    toggleSet(state.favorites, title);
    localStorage.setItem("sceneSenseFavorites", JSON.stringify([...state.favorites]));
    renderResults();
  }
  if (action === "compare") {
    toggleSet(state.compared, title);
    if (state.compared.size >= 2) showCompare();
    renderResults();
  }
  if (action === "exclude" || action === "dislike") {
    state.excluded.add(title);
    localStorage.setItem("sceneSenseExcluded", JSON.stringify([...state.excluded]));
    recommend();
  }
}

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function showDetail(item) {
  const title = escapeHtml(item.title);
  const poster = safeImageUrl(item.poster);
  $("#detailContent").innerHTML = `
    <div class="detail-layout">
      ${poster ? `<img src="${escapeAttr(poster)}" alt="${title} 포스터" />` : `<div class="detail-poster-fallback">${title}</div>`}
      <div>
        <p class="eyebrow">${mediaTypeLabel(item.type)}</p>
        <h2>${title}</h2>
        <p class="meta-line">${escapeHtml(item.year)} · ${escapeHtml(item.country)} · ${escapeHtml(item.runtime)}분 · 평점 ${item.rating.toFixed(1)}</p>
        <p><strong>감독</strong><br>${escapeHtml(item.director)}</p>
        <p><strong>주연</strong><br>${item.actors.map(escapeHtml).join(", ")}</p>
        <p><strong>OTT</strong></p>
        <div class="ott-row">${renderOttLinks(item)}</div>
        <p class="synopsis">${escapeHtml(item.synopsis)}</p>
        <div class="keyword-cloud">${item.keywords.map((keyword) => `<span class="keyword">${escapeHtml(keyword)}</span>`).join("")}</div>
      </div>
    </div>
  `;
  $("#detailDialog").showModal();
}

function showCompare() {
  const items = [...state.compared].slice(0, 3).map((title) => catalog.find((item) => item.title === title));
  const rows = [
    ["평점", ...items.map((item) => item.rating.toFixed(1))],
    ["장르", ...items.map((item) => item.genres.join(", "))],
    ["감독", ...items.map((item) => item.director)],
    ["분위기", ...items.map((item) => item.keywords.slice(0, 3).join(", "))],
    ["러닝타임", ...items.map((item) => `${item.runtime}분`)],
    ["OTT", ...items.map((item) => item.ott.join(", "))]
  ];

  $("#compareContent").innerHTML = `
    <table class="compare-table">
      <thead><tr><th>항목</th>${items.map((item) => `<th>${escapeHtml(item.title)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
  $("#compareDialog").showModal();
}

function fillCountries() {
  const countries = [...new Set(catalog.map((item) => item.country))].sort();
  $("#countryFilter").insertAdjacentHTML("beforeend", countries.map((country) => `<option value="${escapeAttr(country)}">${escapeHtml(country)}</option>`).join(""));
}

function exportResults() {
  const report = state.activeReport ? `${state.activeReport.shareText}\n\n` : "";
  const payload = state.lastResults.map((item, index) => (
    `${index + 1}. ${item.title} (${item.year})\n평점: ${item.rating.toFixed(1)} / OTT: ${item.ott.join(", ")}\n익명 추천 출처: ${state.activePeerCode}\n추천 이유: ${buildReason(item, Math.min(98, Math.max(55, item.similarity)))}\n`
  )).join("\n");
  const blob = new Blob([report + (payload || "추천 결과가 없습니다.")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scenesense-recommendations.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function wireEvents() {
  $("#sampleButton").addEventListener("click", loadSampleInputs);
  $("#recommendButton").addEventListener("click", recommend);
  $("#restoreButton").addEventListener("click", () => {
    const recent = JSON.parse(localStorage.getItem("sceneSenseRecentInputs") || "[]");
    inputList.innerHTML = "";
    (recent.length ? recent : sampleInputs).forEach(addInputRow);
    ensureRows();
  });
  $("#clearAllButton").addEventListener("click", () => {
    inputList.innerHTML = "";
    for (let index = 0; index < 3; index++) addInputRow();
    renderEmpty("좋아했던 작품을 1개 이상 입력해 주세요.");
    inputList.querySelector("input")?.focus();
  });
  $("#exportButton").addEventListener("click", exportResults);
  $("#themeToggle").addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("sceneSenseTheme", document.documentElement.classList.contains("dark") ? "dark" : "light");
    $("#themeIcon").textContent = document.documentElement.classList.contains("dark") ? "☼" : "◐";
  });
  $("#ratingFilter").addEventListener("input", (event) => {
    $("#ratingValue").textContent = Number(event.target.value).toFixed(1);
  });
  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.engine = button.dataset.engine;
    });
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.view = button.dataset.view;
      renderResults();
    });
  });
  $("#closeDialog").addEventListener("click", () => $("#detailDialog").close());
  $("#closeCompare").addEventListener("click", () => $("#compareDialog").close());
}

function init() {
  if (localStorage.getItem("sceneSenseTheme") === "dark") {
    document.documentElement.classList.add("dark");
    $("#themeIcon").textContent = "☼";
  }

  refreshApiStatus();
  fillCountries();
  sampleInputs.forEach(addInputRow);
  ensureRows();
  wireEvents();
  renderEmpty("작품을 입력하고 추천받기를 누르면 취향 DNA와 추천 결과가 여기에 표시됩니다.");
}

init();
