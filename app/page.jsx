import Script from "next/script";

const pageMarkup = String.raw`
<div class="app-shell" id="mainApp">
  <header class="topbar">
    <div>
      <p class="eyebrow">MovieMind DNA</p>
      <h1>SceneSense</h1>
      <p class="topbar-copy">좋아했던 작품을 입력하고 추천 버튼을 누르면 취향 분석과 추천 결과를 한 화면에서 확인할 수 있습니다.</p>
    </div>
    <div class="topbar-actions">
      <button class="ghost-button" id="sampleButton" type="button">샘플 입력</button>
      <button class="icon-button" id="themeToggle" type="button" aria-label="다크모드 전환" title="다크모드 전환">
        <span id="themeIcon">◐</span>
      </button>
      <button class="icon-button" id="exportButton" type="button" aria-label="추천 결과 저장" title="추천 결과 저장">⇩</button>
    </div>
  </header>

  <main class="workspace">
    <section class="input-panel" aria-labelledby="inputTitle">
      <div class="section-heading">
        <div>
          <p class="eyebrow">입력</p>
          <h2 id="inputTitle">좋아했던 작품</h2>
        </div>
        <div class="input-header-actions">
          <button class="ghost-button" id="restoreButton" type="button">최근 입력</button>
          <button class="ghost-button" id="clearAllButton" type="button">전체 지우기</button>
        </div>
      </div>

      <div class="input-list" id="inputList"></div>

      <div class="context-grid">
        <label>
          오늘 기분
          <select id="moodSelect">
            <option value="any">상관없어요</option>
            <option value="light">가볍게 웃고 싶어요</option>
            <option value="brainy">머리 쓰는 작품</option>
            <option value="moving">여운이 긴 작품</option>
            <option value="tense">긴장감 있는 작품</option>
          </select>
        </label>
        <label>
          함께 볼 사람
          <select id="groupSelect">
            <option value="solo">혼자</option>
            <option value="couple">둘이</option>
            <option value="friends">친구들과</option>
            <option value="family">가족과</option>
          </select>
        </label>
      </div>

      <div class="filter-panel">
        <div class="segmented" role="group" aria-label="추천 엔진">
          <button class="segment active" data-engine="ai" type="button">AI</button>
          <button class="segment" data-engine="genre" type="button">장르</button>
          <button class="segment" data-engine="director" type="button">감독</button>
          <button class="segment" data-engine="actor" type="button">배우</button>
          <button class="segment" data-engine="rating" type="button">평점</button>
        </div>

        <div class="filter-grid">
          <label>
            유형
            <select id="typeFilter">
              <option value="all">영화 + 드라마</option>
              <option value="movie">영화만</option>
              <option value="series">드라마만</option>
              <option value="animation">애니메이션</option>
            </select>
          </label>
          <label>
            국가
            <select id="countryFilter">
              <option value="all">전체</option>
            </select>
          </label>
          <label>
            최소 평점
            <input id="ratingFilter" type="range" min="0" max="9" value="0" step="0.5" />
            <span id="ratingValue">0.0</span>
          </label>
        </div>
      </div>

      <button class="primary-button" id="recommendButton" type="button">추천받기</button>
    </section>

    <section class="insight-panel" aria-labelledby="insightTitle">
      <div class="section-heading">
        <div>
          <p class="eyebrow">분석</p>
          <h2 id="insightTitle">당신의 취향</h2>
        </div>
        <div class="view-toggle" role="group" aria-label="결과 보기 방식">
          <button class="icon-button active" data-view="cards" type="button" aria-label="카드 보기" title="카드 보기">▦</button>
          <button class="icon-button" data-view="list" type="button" aria-label="리스트 보기" title="리스트 보기">☰</button>
        </div>
      </div>

      <div class="taste-summary" id="tasteSummary">
        <p>작품을 입력하면 장르, 감독, 배우, 키워드 취향이 여기에 표시됩니다.</p>
      </div>
      <div class="data-note" id="dataNote"></div>

      <div class="dna-panel" id="dnaPanel"></div>

      <div class="keyword-cloud" id="keywordCloud"></div>

      <div class="recommendation-grid" id="recommendationGrid"></div>
    </section>
  </main>
</div>

<dialog id="detailDialog">
  <button class="dialog-close" id="closeDialog" type="button" aria-label="닫기">×</button>
  <div id="detailContent"></div>
</dialog>

<dialog id="compareDialog">
  <button class="dialog-close" id="closeCompare" type="button" aria-label="닫기">×</button>
  <h2>작품 비교</h2>
  <div id="compareContent"></div>
</dialog>

<template id="inputRowTemplate">
  <div class="input-row">
    <span class="row-number"></span>
    <button class="row-clear" type="button" aria-label="입력 지우기" title="입력 지우기">×</button>
    <div class="autocomplete-wrap">
      <input type="text" autocomplete="off" placeholder="작품 제목 입력" />
      <div class="suggestions" role="listbox"></div>
    </div>
  </div>
</template>
`;

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: pageMarkup }} />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
