"use client";

import { useEffect, useMemo, useState } from "react";

const dummyRecommendations = [
  {
    title: "인터스텔라",
    type: "movie",
    label: "영화",
    tags: ["genre-sf", "country-us", "mood-moving", "runtime-long"],
    genre: "SF, 드라마",
    director: "크리스토퍼 놀란",
    actors: ["매튜 매커너히", "앤 해서웨이"],
    synopsis: "멸망 위기의 지구를 떠나 인류가 살 수 있는 새 행성을 찾기 위해 우주로 향한다.",
    match: 96,
    runtime: "169분",
    rating: "8.7",
    ott: ["Netflix", "Watcha"],
    poster: "INTER\nSTELLAR",
    reason: "광대한 SF 설정과 가족의 감정선을 함께 따라가는 추천입니다.",
  },
  {
    title: "듄",
    type: "movie",
    label: "영화",
    tags: ["genre-sf", "country-us", "mood-tense", "runtime-long"],
    genre: "SF, 어드벤처",
    director: "드니 빌뇌브",
    actors: ["티모시 샬라메", "레베카 퍼거슨"],
    synopsis: "사막 행성 아라키스를 둘러싼 권력 다툼 속에서 한 소년이 거대한 운명을 마주한다.",
    match: 92,
    runtime: "155분",
    rating: "8.0",
    ott: ["Netflix", "Watcha"],
    poster: "DUNE",
    reason: "장대한 세계관과 묵직한 긴장감을 원하는 흐름에 잘 맞습니다.",
  },
  {
    title: "마션",
    type: "movie",
    label: "영화",
    tags: ["genre-sf", "country-us", "mood-light", "runtime-long"],
    genre: "SF, 생존",
    director: "리들리 스콧",
    actors: ["맷 데이먼", "제시카 차스테인"],
    synopsis: "화성에 홀로 남겨진 우주비행사가 과학과 유머로 생존 방법을 찾아간다.",
    match: 89,
    runtime: "144분",
    rating: "8.0",
    ott: ["Disney+"],
    poster: "THE\nMARTIAN",
    reason: "SF 설정 안에서도 밝은 에너지와 생존 서사를 함께 즐길 수 있습니다.",
  },
  {
    title: "라라랜드",
    type: "movie",
    label: "영화",
    tags: ["genre-romance", "country-us", "mood-moving", "runtime-medium"],
    genre: "로맨스, 뮤지컬",
    director: "데이미언 셔젤",
    actors: ["라이언 고슬링", "엠마 스톤"],
    synopsis: "꿈을 좇는 두 사람이 사랑에 빠지고, 각자의 미래 앞에서 서로의 의미를 되새긴다.",
    match: 94,
    runtime: "128분",
    rating: "8.0",
    ott: ["Watcha", "TVING"],
    poster: "LA LA\nLAND",
    reason: "사랑과 꿈, 음악의 여운을 함께 느끼고 싶을 때 어울립니다.",
  },
  {
    title: "노트북",
    type: "movie",
    label: "영화",
    tags: ["genre-romance", "country-us", "mood-moving", "runtime-medium"],
    genre: "로맨스, 드라마",
    director: "닉 카사베츠",
    actors: ["라이언 고슬링", "레이첼 맥아담스"],
    synopsis: "계급과 시간이 갈라놓은 두 사람이 평생에 걸쳐 사랑의 기억을 붙잡는다.",
    match: 90,
    runtime: "123분",
    rating: "7.8",
    ott: ["검색 필요"],
    poster: "THE\nNOTEBOOK",
    reason: "강한 감정선과 오래 남는 사랑 이야기를 찾는 선택에 맞습니다.",
  },
  {
    title: "센과 치히로의 행방불명",
    type: "animation",
    label: "애니",
    tags: ["country-jp", "mood-moving", "runtime-medium"],
    genre: "애니메이션, 판타지",
    director: "미야자키 하야오",
    actors: ["히이라기 루미", "이리노 미유"],
    synopsis: "낯선 세계에 들어간 소녀가 부모를 구하고 자신의 이름과 용기를 찾아간다.",
    match: 87,
    runtime: "125분",
    rating: "8.6",
    ott: ["Netflix"],
    poster: "SPIRITED\nAWAY",
    reason: "환상적인 세계관과 따뜻한 여운을 원하는 사용자에게 어울립니다.",
  },
  {
    title: "너의 이름은",
    type: "animation",
    label: "애니",
    tags: ["genre-romance", "country-jp", "mood-moving", "runtime-medium"],
    genre: "애니메이션, 로맨스",
    director: "신카이 마코토",
    actors: ["카미키 류노스케", "카미시라이시 모네"],
    synopsis: "서로의 몸이 바뀌는 두 소년소녀가 시간과 거리를 넘어 서로를 찾아간다.",
    match: 88,
    runtime: "106분",
    rating: "8.4",
    ott: ["Netflix"],
    poster: "YOUR\nNAME",
    reason: "설렘과 판타지, 애틋한 감정선을 함께 원하는 취향에 어울립니다.",
  },
  {
    title: "세븐",
    type: "movie",
    label: "영화",
    tags: ["genre-thriller", "country-us", "mood-tense", "runtime-medium"],
    genre: "스릴러, 범죄",
    director: "데이비드 핀처",
    actors: ["브래드 피트", "모건 프리먼"],
    synopsis: "두 형사가 일곱 가지 죄악을 따라 벌어지는 연쇄 살인 사건을 추적한다.",
    match: 94,
    runtime: "127분",
    rating: "8.6",
    ott: ["검색 필요"],
    poster: "SE7EN",
    reason: "어둡고 집요한 수사극과 강한 결말의 긴장감을 원하는 선택에 맞습니다.",
  },
  {
    title: "프리즈너스",
    type: "movie",
    label: "영화",
    tags: ["genre-thriller", "country-us", "mood-tense", "runtime-long"],
    genre: "스릴러, 미스터리",
    director: "드니 빌뇌브",
    actors: ["휴 잭맨", "제이크 질렌할"],
    synopsis: "실종된 아이를 찾기 위해 한 아버지와 형사가 각자의 방식으로 진실을 추적한다.",
    match: 91,
    runtime: "153분",
    rating: "8.2",
    ott: ["검색 필요"],
    poster: "PRISONERS",
    reason: "무거운 분위기와 끝까지 조여 오는 미스터리를 선호할 때 잘 맞습니다.",
  },
  {
    title: "조디악",
    type: "movie",
    label: "영화",
    tags: ["genre-thriller", "country-us", "mood-tense", "runtime-long"],
    genre: "스릴러, 범죄",
    director: "데이비드 핀처",
    actors: ["제이크 질렌할", "마크 러팔로"],
    synopsis: "미해결 연쇄 살인 사건에 매달린 기자와 수사관들이 집착에 가까운 추적을 이어간다.",
    match: 88,
    runtime: "157분",
    rating: "7.7",
    ott: ["검색 필요"],
    poster: "ZODIAC",
    reason: "실화 기반의 서늘한 추적극과 차분한 긴장감을 좋아한다면 어울립니다.",
  },
  {
    title: "더 베어",
    type: "drama",
    label: "드라마",
    tags: ["country-us", "mood-tense", "runtime-short"],
    genre: "드라마, 코미디",
    director: "크리스토퍼 스토러",
    actors: ["제러미 앨런 화이트", "아요 에데비리"],
    synopsis: "젊은 셰프가 가족이 남긴 가게를 맡아 혼란과 재건을 겪는다.",
    match: 84,
    runtime: "30분 내외",
    rating: "8.6",
    ott: ["Disney+"],
    poster: "THE\nBEAR",
    reason: "인물의 성장과 압박감 있는 리듬을 좋아하는 사용자에게 어울립니다.",
  },
  {
    title: "오징어 게임",
    type: "drama",
    label: "드라마",
    tags: ["country-kr", "mood-tense", "runtime-medium"],
    genre: "스릴러, 드라마",
    director: "황동혁",
    actors: ["이정재", "정호연"],
    synopsis: "벼랑 끝에 몰린 사람들이 거액의 상금을 두고 잔혹한 게임에 참가한다.",
    match: 86,
    runtime: "60분 내외",
    rating: "8.0",
    ott: ["Netflix"],
    poster: "SQUID\nGAME",
    reason: "강한 몰입감과 생존 게임 구도를 선호할 때 잘 맞는 더미 결과입니다.",
  },
];

const ottOptions = [
  ["netflix", "Netflix"],
  ["disney", "Disney+"],
  ["watcha", "Watcha"],
  ["tving", "TVING"],
];

const contentTypeOptions = [
  ["movie", "영화"],
  ["drama", "드라마"],
  ["animation", "애니"],
];

const quickPickGroups = [
  {
    title: "장르",
    options: [
      ["genre-sf", "SF"],
      ["genre-romance", "로맨스"],
      ["genre-thriller", "스릴러"],
    ],
  },
  {
    title: "국가",
    options: [
      ["country-kr", "한국"],
      ["country-us", "미국"],
      ["country-jp", "일본"],
    ],
  },
  {
    title: "분위기",
    options: [
      ["mood-light", "가볍게"],
      ["mood-moving", "여운 있게"],
      ["mood-tense", "긴장감"],
    ],
  },
  {
    title: "러닝타임",
    options: [
      ["runtime-short", "60분 이하"],
      ["runtime-medium", "2시간 이하"],
      ["runtime-long", "긴 작품"],
    ],
  },
];

const initialOtt = ["netflix"];
const initialTypes = ["movie", "drama", "animation"];
const initialTitles = ["", "", ""];
const titlePlaceholders = ["예: 인터스텔라", "예: 오징어 게임", "예: 너의 이름은"];
const showDevProviderStatus = process.env.NODE_ENV !== "production";
const initialProviderStatus = {
  providerId: "checking",
  providerName: "Checking",
  fallback: false,
  tmdbEnabled: false,
  message: "",
  checked: false,
};

const timeSlotContent = {
  morning: {
    title: "더 베어",
    reason: "짧고 리듬감 있게 하루를 시작하고 싶다면 추천",
  },
  afternoon: {
    title: "마션",
    reason: "가볍지만 똑똑한 생존 SF가 필요한 시간대 추천",
  },
  evening: {
    title: "라라랜드",
    reason: "하루 끝에 음악과 감정선을 함께 느끼고 싶다면 추천",
  },
  late: {
    title: "세븐",
    reason: "늦은 밤 강한 몰입감이 필요하다면 추천",
  },
};

function thumbnailText(title) {
  return title.slice(0, 2);
}

function recommendationReason(item, titles) {
  if (!titles.length) return item.reason;
  const anchorTitle = titles[0];
  return `${anchorTitle}를 좋아해서 추천합니다. ${item.reason}`;
}

function decisionReason(item, titles) {
  if (titles.length) return `${titles[0]}를 좋아했다면 추천`;
  if (item.tags.includes("genre-sf")) return "몰입감 있는 SF를 좋아한다면 추천";
  if (item.tags.includes("genre-romance")) return "감정선이 선명한 이야기를 좋아한다면 추천";
  if (item.tags.includes("genre-thriller")) return "긴장감 있는 이야기를 좋아한다면 추천";
  if (item.tags.includes("mood-moving")) return "여운이 남는 작품을 찾는다면 추천";
  return "오늘 바로 고르기 좋은 추천";
}

function findRecommendation(title) {
  return dummyRecommendations.find((item) => item.title === title);
}

function getTimeSlot(date) {
  const hour = date.getHours();
  if (hour < 11) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 23) return "evening";
  return "late";
}

function buildHeroRecommendations(timeSlot) {
  const timePick = timeSlotContent[timeSlot] || timeSlotContent.evening;

  return [
    {
      badge: "오늘의 추천",
      item: findRecommendation("인터스텔라"),
      reason: "입력 없이 바로 시작하기 좋은 대표 추천",
    },
    {
      badge: "지금 인기 작품",
      item: findRecommendation("오징어 게임"),
      reason: "지금 대화에 바로 끼기 좋은 인기 추천",
    },
    {
      badge: "지금 시간대 추천",
      item: findRecommendation(timePick.title),
      reason: timePick.reason,
    },
  ].filter(({ item }) => Boolean(item));
}

function scoreRecommendation(item, quickPicks) {
  return quickPicks.reduce((score, quickPick) => (item.tags.includes(quickPick) ? score + 1 : score), 0);
}

function buildRecommendations(selectedTypes, quickPicks) {
  const typeMatched = dummyRecommendations.filter((item) => selectedTypes.includes(item.type));

  if (!quickPicks.length) {
    return typeMatched.slice(0, 6);
  }

  const scored = typeMatched
    .map((item) => ({ item, score: scoreRecommendation(item, quickPicks) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.match - a.item.match)
    .map(({ item }) => item);

  return scored.length ? scored.slice(0, 6) : typeMatched.slice(0, 6);
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function normalizeTitleInputs(values) {
  const normalized = [...values];

  while (normalized.length < initialTitles.length) {
    normalized.push("");
  }

  while (
    normalized.length > initialTitles.length &&
    normalized.at(-1)?.trim() === "" &&
    normalized.at(-2)?.trim() === ""
  ) {
    normalized.splice(normalized.length - 2, 1);
  }

  if (normalized.length >= initialTitles.length && normalized.at(-1)?.trim()) {
    normalized.push("");
  }

  return normalized;
}

function providerStatusLabel(providerStatus) {
  if (!providerStatus.checked) return "Checking";
  if (providerStatus.providerId === "mock") return "Mock Provider";
  if (providerStatus.providerId === "tmdb") return "TMDB";
  return providerStatus.providerName || providerStatus.providerId || "Unknown";
}

function DecisionCard({ item, enteredTitles, onOpen, badge, reasonOverride, className = "" }) {
  return (
    <button className={`result-card decision-card ${className}`.trim()} type="button" onClick={() => onOpen(item)} aria-label={`${item.title} 상세 보기`}>
      <div className="thumbnail poster" aria-hidden="true">{item.poster}</div>
      <div className="result-body">
        {badge ? <span className="card-context">{badge}</span> : null}
        <p className="decision-reason">{reasonOverride || decisionReason(item, enteredTitles)}</p>
        <div className="decision-title-row">
          <h3>{item.title}</h3>
          <span className="type-badge">{item.label}</span>
        </div>
        <div className="decision-facts" aria-label={`${item.title} 핵심 정보`}>
          <span><strong>장르</strong>{item.genre}</span>
          <span><strong>러닝타임</strong>{item.runtime}</span>
          <span><strong>평점</strong>{item.rating}</span>
          <span><strong>OTT</strong>{item.ott.join(", ")}</span>
        </div>
      </div>
    </button>
  );
}

export default function Home() {
  const [selectedOtt, setSelectedOtt] = useState(initialOtt);
  const [selectedTypes, setSelectedTypes] = useState(initialTypes);
  const [titles, setTitles] = useState(initialTitles);
  const [selectedQuickPicks, setSelectedQuickPicks] = useState([]);
  const [showQuickPick, setShowQuickPick] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [providerStatus, setProviderStatus] = useState(initialProviderStatus);
  const [timeSlot, setTimeSlot] = useState("evening");

  const enteredTitles = useMemo(() => titles.map((title) => title.trim()).filter(Boolean), [titles]);
  const canRecommend = enteredTitles.length > 0 || selectedQuickPicks.length > 0;
  const heroRecommendations = useMemo(() => buildHeroRecommendations(timeSlot).slice(0, 3), [timeSlot]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") return;
      setSelectedDetail(null);
      setShowQuickPick(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (!showDevProviderStatus) return;
    refreshProviderStatus();
  }, []);

  useEffect(() => {
    setTimeSlot(getTimeSlot(new Date()));
  }, []);

  async function refreshProviderStatus(query = "interstellar") {
    if (!showDevProviderStatus) return;

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      const providerId = payload.providerId || payload.source || "unknown";

      setProviderStatus({
        providerId,
        providerName: payload.providerName || providerId,
        fallback: providerId === "mock" && Boolean(payload.tmdbEnabled),
        tmdbEnabled: Boolean(payload.tmdbEnabled),
        message: payload.message || "",
        checked: true,
      });
    } catch (error) {
      setProviderStatus({
        providerId: "error",
        providerName: "Provider check failed",
        fallback: false,
        tmdbEnabled: false,
        message: error instanceof Error ? error.message : "Provider status check failed.",
        checked: true,
      });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canRecommend) return;

    setHasSubmitted(true);
    setSelectedDetail(null);
    setShowQuickPick(false);
    setResults(buildRecommendations(selectedTypes, selectedQuickPicks));
    refreshProviderStatus(enteredTitles[0] || "interstellar");
  }

  function openDetail(item) {
    setShowQuickPick(false);
    setSelectedDetail(item);
  }

  function updateTitle(index, value) {
    setTitles((current) => normalizeTitleInputs(current.map((item, itemIndex) => (itemIndex === index ? value : item))));
  }

  function resetAll() {
    setSelectedOtt([...initialOtt]);
    setSelectedTypes([...initialTypes]);
    setTitles([...initialTitles]);
    setSelectedQuickPicks([]);
    setShowQuickPick(false);
    setResults([]);
    setHasSubmitted(false);
    setSelectedDetail(null);
  }

  return (
    <main className="recommendation-page">
      <section className="hero-recommendation" aria-labelledby="heroRecommendationTitle">
        <div className="hero-heading">
          <div>
            <p className="eyebrow">First Pick</p>
            <h1 id="heroRecommendationTitle">입력하기 전에, 바로 고를 수 있는 추천</h1>
          </div>
          <p>처음 와도 바로 볼 만한 작품 3개만 먼저 보여드립니다. 더 정확한 추천은 아래에서 취향을 입력해 받아보세요.</p>
        </div>
        <div className="result-grid hero-grid" aria-label="Hero Recommendation">
          {heroRecommendations.map(({ item, badge, reason }) => (
            <DecisionCard
              item={item}
              enteredTitles={[]}
              onOpen={openDetail}
              badge={badge}
              reasonOverride={reason}
              className="hero-card"
              key={badge}
            />
          ))}
        </div>
      </section>

      <section className="recommendation-panel" aria-labelledby="pageTitle">
        <div className="page-heading">
          <p className="eyebrow">MovieMind DNA</p>
          <h1 id="pageTitle">오늘 볼 콘텐츠를 한 번에 추천받으세요</h1>
          <p>선호하는 OTT와 콘텐츠 종류를 고른 뒤 좋아했던 작품 3개를 입력하면, 더미 데이터를 기반으로 추천 결과가 바로 아래에 표시됩니다.</p>
          {showDevProviderStatus ? (
            <div className="provider-status" id="providerStatus" aria-label="Provider status" title={providerStatus.message}>
              <span>Data Source</span>
              <strong>{providerStatusLabel(providerStatus)}</strong>
              <span>Fallback</span>
              <strong>{providerStatus.fallback ? "Yes" : "No"}</strong>
            </div>
          ) : null}
        </div>

        <form className="recommendation-form" id="recommendationForm" onSubmit={handleSubmit}>
          <fieldset className="option-section">
            <legend>
              <span>1</span>
              OTT 선택
            </legend>
            <p className="section-copy">지금 이용 중인 서비스를 골라주세요.</p>
            <div className="option-grid">
              {ottOptions.map(([value, label]) => (
                <label className="check-option" key={value}>
                  <input
                    type="checkbox"
                    name="ott"
                    value={value}
                    checked={selectedOtt.includes(value)}
                    onChange={() => setSelectedOtt((current) => toggleValue(current, value))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="option-section">
            <legend>
              <span>2</span>
              콘텐츠 종류 선택
            </legend>
            <p className="section-copy">추천받고 싶은 콘텐츠 유형을 선택하세요.</p>
            <div className="option-grid compact">
              {contentTypeOptions.map(([value, label]) => (
                <label className="check-option" key={value}>
                  <input
                    type="checkbox"
                    name="contentType"
                    value={value}
                    checked={selectedTypes.includes(value)}
                    onChange={() => setSelectedTypes((current) => toggleValue(current, value))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <section className="input-section" aria-labelledby="inputSectionTitle">
            <div className="section-title">
              <span>3</span>
              <div>
                <h2 id="inputSectionTitle">좋아하는 작품 입력</h2>
                <p className="section-copy">기본 3개 입력창에 인상 깊었던 작품을 적어주세요.</p>
              </div>
            </div>
            <div className="input-group" aria-label="좋아했던 작품 입력">
              {titles.map((title, index) => (
                <label key={`title-${index + 1}`}>
                  작품 {index + 1}
                  <input
                    id={`titleInput${index + 1}`}
                    type="text"
                    name="title"
                    placeholder={titlePlaceholders[index] || "예: 최근 좋았던 작품"}
                    autoComplete="off"
                    value={title}
                    onChange={(event) => updateTitle(index, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <button className="secondary-button" id="quickPickButton" type="button" onClick={() => setShowQuickPick(true)}>
              {selectedQuickPicks.length ? `추천 옵션 (${selectedQuickPicks.length})` : "추천 옵션"}
            </button>
            <button className="secondary-button" id="resetAllButton" type="button" onClick={resetAll}>
              전체 초기화
            </button>
            <button className="primary-button" id="recommendButton" type="submit" disabled={!canRecommend}>
              추천받기
            </button>
          </div>
        </form>
      </section>

      <section className="results-panel" aria-labelledby="resultsTitle">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Result</p>
            <h2 id="resultsTitle">추천 결과</h2>
          </div>
          <p className="result-count" id="resultCount">{results.length}개</p>
        </div>
        {!results.length ? (
          <div className="empty-state" id="emptyState">
            {hasSubmitted
              ? "선택한 유형에 맞는 더미 결과가 없습니다. 영화, 드라마, 애니 중 하나 이상 선택해 주세요."
              : "작품을 입력하고 추천받기를 누르면 더미 추천 결과가 여기에 표시됩니다."}
          </div>
        ) : null}
        <div className="result-grid" id="resultGrid">
          {results.map((item) => (
            <DecisionCard item={item} enteredTitles={enteredTitles} onOpen={openDetail} key={item.title} />
          ))}
        </div>
      </section>

      {showQuickPick ? (
        <div className="quick-pick-overlay" id="quickPickOverlay" aria-hidden="false">
          <div className="quick-pick-backdrop" onClick={() => setShowQuickPick(false)} />
          <section className="quick-pick-sheet" role="dialog" aria-modal="true" aria-labelledby="quickPickTitle">
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-heading">
              <div>
                <p className="eyebrow">Quick Pick</p>
                <h2 id="quickPickTitle">추천 옵션</h2>
                <p className="sheet-count" id="quickPickCount">필터 {selectedQuickPicks.length}개 선택됨</p>
              </div>
              <div className="sheet-actions">
                <button className="tertiary-button" type="button" onClick={() => setSelectedQuickPicks([])}>
                  옵션 초기화
                </button>
                <button className="close-button" type="button" onClick={() => setShowQuickPick(false)} aria-label="추천 옵션 닫기">×</button>
              </div>
            </div>

            <div className="quick-pick-groups">
              {quickPickGroups.map((group) => (
                <fieldset className="quick-group" key={group.title}>
                  <legend>{group.title}</legend>
                  {group.options.map(([value, label]) => (
                    <label className="check-option" key={value}>
                      <input
                        type="checkbox"
                        name="quickPick"
                        value={value}
                        checked={selectedQuickPicks.includes(value)}
                        onChange={() => setSelectedQuickPicks((current) => toggleValue(current, value))}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {selectedDetail ? (
        <div className="detail-overlay" id="detailOverlay" aria-hidden="false">
          <div className="detail-backdrop" onClick={() => setSelectedDetail(null)} />
          <section className="detail-layer" role="dialog" aria-modal="true" aria-labelledby="detailTitle">
            <button className="close-button detail-close" type="button" onClick={() => setSelectedDetail(null)} aria-label="상세 정보 닫기">×</button>
            <div className="detail-layout">
              <div className="detail-thumb poster" aria-hidden="true">{selectedDetail.poster || thumbnailText(selectedDetail.title)}</div>
              <div className="detail-info">
                <span className="type-badge">{selectedDetail.label}</span>
                <h2 id="detailTitle">{selectedDetail.title}</h2>
                <div className="meta-list">
                  <span><strong>장르</strong> {selectedDetail.genre}</span>
                  <span><strong>감독</strong> {selectedDetail.director}</span>
                  <span><strong>주요 배우</strong> {selectedDetail.actors.join(", ")}</span>
                </div>
                <p><strong>줄거리</strong><br />{selectedDetail.synopsis}</p>
                <p><strong>추천 이유</strong><br />{recommendationReason(selectedDetail, enteredTitles)}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
