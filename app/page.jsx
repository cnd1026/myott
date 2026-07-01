"use client";

import { useEffect, useMemo, useState } from "react";

const dummyRecommendations = [
  {
    title: "컨택트",
    type: "movie",
    label: "영화",
    genre: "SF, 드라마",
    director: "드니 빌뇌브",
    actors: ["에이미 아담스", "제레미 레너"],
    synopsis: "지구에 도착한 외계 생명체와 소통하기 위해 언어학자가 미지의 언어를 해독한다.",
    match: 94,
    reason: "입력한 작품의 SF, 감정선, 여운 있는 전개와 잘 맞는 더미 추천입니다.",
  },
  {
    title: "더 베어",
    type: "drama",
    label: "드라마",
    genre: "드라마, 코미디",
    director: "크리스토퍼 스토러",
    actors: ["제러미 앨런 화이트", "아요 에데비리"],
    synopsis: "젊은 셰프가 가족이 남긴 가게를 맡아 혼란과 재건을 겪는다.",
    match: 88,
    reason: "인물의 성장과 압박감 있는 리듬을 좋아하는 사용자에게 어울립니다.",
  },
  {
    title: "스파이더맨: 뉴 유니버스",
    type: "animation",
    label: "애니",
    genre: "애니메이션, 액션",
    director: "밥 퍼시케티",
    actors: ["샤메익 무어", "헤일리 스타인펠드"],
    synopsis: "소년 마일스가 여러 차원의 스파이더맨들과 만나 자신만의 영웅이 된다.",
    match: 86,
    reason: "빠른 전개, 감각적인 화면, 성장 서사를 함께 원하는 흐름에 맞습니다.",
  },
  {
    title: "나이브스 아웃",
    type: "movie",
    label: "영화",
    genre: "미스터리, 코미디",
    director: "라이언 존슨",
    actors: ["다니엘 크레이그", "아나 데 아르마스"],
    synopsis: "유명 추리 작가의 죽음을 둘러싸고 가족 구성원 모두가 용의자가 된다.",
    match: 82,
    reason: "추리와 반전, 가벼운 긴장감을 동시에 즐길 때 보기 좋은 추천입니다.",
  },
  {
    title: "오징어 게임",
    type: "drama",
    label: "드라마",
    genre: "스릴러, 드라마",
    director: "황동혁",
    actors: ["이정재", "정호연"],
    synopsis: "벼랑 끝에 몰린 사람들이 거액의 상금을 두고 잔혹한 게임에 참가한다.",
    match: 79,
    reason: "강한 몰입감과 생존 게임 구도를 선호할 때 잘 맞는 더미 결과입니다.",
  },
  {
    title: "센과 치히로의 행방불명",
    type: "animation",
    label: "애니",
    genre: "애니메이션, 판타지",
    director: "미야자키 하야오",
    actors: ["히이라기 루미", "이리노 미유"],
    synopsis: "낯선 세계에 들어간 소녀가 부모를 구하고 자신의 이름과 용기를 찾아간다.",
    match: 77,
    reason: "환상적인 세계관과 따뜻한 여운을 원하는 사용자에게 어울립니다.",
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

function thumbnailText(title) {
  return title.slice(0, 2);
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function Home() {
  const [selectedOtt, setSelectedOtt] = useState(["netflix"]);
  const [selectedTypes, setSelectedTypes] = useState(["movie", "drama", "animation"]);
  const [titles, setTitles] = useState(["", "", ""]);
  const [selectedQuickPicks, setSelectedQuickPicks] = useState([]);
  const [showQuickPick, setShowQuickPick] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const enteredTitles = useMemo(() => titles.map((title) => title.trim()).filter(Boolean), [titles]);
  const canRecommend = enteredTitles.length > 0 || selectedQuickPicks.length > 0;
  const inputSummary = enteredTitles.length ? `${enteredTitles.join(", ")} 기반` : "기본 취향 기반";

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") return;
      setSelectedDetail(null);
      setShowQuickPick(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    if (!canRecommend) return;

    setHasSubmitted(true);
    setSelectedDetail(null);
    setResults(dummyRecommendations.filter((item) => selectedTypes.includes(item.type)));
  }

  function openDetail(item) {
    setShowQuickPick(false);
    setSelectedDetail(item);
  }

  return (
    <main className="recommendation-page">
      <section className="recommendation-panel" aria-labelledby="pageTitle">
        <div className="page-heading">
          <p className="eyebrow">MovieMind DNA</p>
          <h1 id="pageTitle">오늘 볼 콘텐츠를 한 번에 추천받으세요</h1>
          <p>선호하는 OTT와 콘텐츠 종류를 고른 뒤 좋아했던 작품 3개를 입력하면, 더미 데이터를 기반으로 추천 결과가 바로 아래에 표시됩니다.</p>
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
                    placeholder={["예: 인터스텔라", "예: 오징어 게임", "예: 너의 이름은"][index]}
                    autoComplete="off"
                    value={title}
                    onChange={(event) =>
                      setTitles((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <button className="secondary-button" id="quickPickButton" type="button" onClick={() => setShowQuickPick(true)}>
              {selectedQuickPicks.length ? `추천 옵션 (${selectedQuickPicks.length})` : "추천 옵션"}
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
            <button className="result-card" type="button" key={item.title} onClick={() => openDetail(item)} aria-label={`${item.title} 상세 보기`}>
              <div className="thumbnail" aria-hidden="true">{thumbnailText(item.title)}</div>
              <div className="result-body">
                <div className="card-topline">
                  <span className="type-badge">{item.label}</span>
                  <strong>{item.match}%</strong>
                </div>
                <h3>{item.title}</h3>
                <div className="meta-list">
                  <span><strong>장르</strong> {item.genre}</span>
                  <span><strong>감독</strong> {item.director}</span>
                  <span><strong>주요 배우</strong> {item.actors.join(", ")}</span>
                </div>
                <p className="input-summary">{inputSummary}</p>
                <p>{item.reason}</p>
              </div>
            </button>
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
              <button className="close-button" type="button" onClick={() => setShowQuickPick(false)} aria-label="추천 옵션 닫기">×</button>
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
              <div className="detail-thumb" aria-hidden="true">{thumbnailText(selectedDetail.title)}</div>
              <div className="detail-info">
                <span className="type-badge">{selectedDetail.label}</span>
                <h2 id="detailTitle">{selectedDetail.title}</h2>
                <div className="meta-list">
                  <span><strong>장르</strong> {selectedDetail.genre}</span>
                  <span><strong>감독</strong> {selectedDetail.director}</span>
                  <span><strong>주요 배우</strong> {selectedDetail.actors.join(", ")}</span>
                </div>
                <p><strong>줄거리</strong><br />{selectedDetail.synopsis}</p>
                <p><strong>추천 이유</strong><br />{selectedDetail.reason}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
