import Script from "next/script";

const pageMarkup = String.raw`
<main class="recommendation-page">
  <section class="recommendation-panel" aria-labelledby="pageTitle">
    <div class="page-heading">
      <p class="eyebrow">Task 2-1</p>
      <h1 id="pageTitle">추천 페이지</h1>
      <p>영화, 드라마, 애니 중 보고 싶은 유형을 고르고 좋아했던 작품을 입력해 추천 결과를 확인하세요.</p>
    </div>

    <form class="recommendation-form" id="recommendationForm">
      <fieldset class="type-filter">
        <legend>추천 유형</legend>
        <label class="check-option">
          <input type="checkbox" name="contentType" value="movie" checked />
          <span>영화</span>
        </label>
        <label class="check-option">
          <input type="checkbox" name="contentType" value="drama" checked />
          <span>드라마</span>
        </label>
        <label class="check-option">
          <input type="checkbox" name="contentType" value="animation" checked />
          <span>애니</span>
        </label>
      </fieldset>

      <div class="input-group" aria-label="좋아했던 작품 입력">
        <label>
          작품 1
          <input id="titleInput1" type="text" name="title" placeholder="예: 인터스텔라" autocomplete="off" />
        </label>
        <label>
          작품 2
          <input id="titleInput2" type="text" name="title" placeholder="예: 오징어 게임" autocomplete="off" />
        </label>
        <label>
          작품 3
          <input id="titleInput3" type="text" name="title" placeholder="예: 너의 이름은" autocomplete="off" />
        </label>
      </div>

      <button class="primary-button" type="submit">추천받기</button>
    </form>
  </section>

  <section class="results-panel" aria-labelledby="resultsTitle">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Result</p>
        <h2 id="resultsTitle">추천 결과</h2>
      </div>
      <p class="result-count" id="resultCount">0개</p>
    </div>
    <div class="empty-state" id="emptyState">작품을 입력하고 추천받기를 누르면 더미 추천 결과가 여기에 표시됩니다.</div>
    <div class="result-grid" id="resultGrid"></div>
  </section>
</main>
`;

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: pageMarkup }} />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
