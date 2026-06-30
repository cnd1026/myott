import Script from "next/script";

const pageMarkup = String.raw`
<main class="recommendation-page">
  <section class="recommendation-panel" aria-labelledby="pageTitle">
    <div class="page-heading">
      <p class="eyebrow">MovieMind DNA</p>
      <h1 id="pageTitle">오늘 볼 콘텐츠를 한 번에 추천받으세요</h1>
      <p>선호하는 OTT와 콘텐츠 종류를 고른 뒤 좋아했던 작품 3개를 입력하면, 더미 데이터를 기반으로 추천 결과가 바로 아래에 표시됩니다.</p>
    </div>

    <form class="recommendation-form" id="recommendationForm">
      <fieldset class="option-section">
        <legend>
          <span>1</span>
          OTT 선택
        </legend>
        <p class="section-copy">지금 이용 중인 서비스를 골라주세요.</p>
        <div class="option-grid">
          <label class="check-option">
            <input type="checkbox" name="ott" value="netflix" checked />
            <span>Netflix</span>
          </label>
          <label class="check-option">
            <input type="checkbox" name="ott" value="disney" />
            <span>Disney+</span>
          </label>
          <label class="check-option">
            <input type="checkbox" name="ott" value="watcha" />
            <span>Watcha</span>
          </label>
          <label class="check-option">
            <input type="checkbox" name="ott" value="tving" />
            <span>TVING</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="option-section">
        <legend>
          <span>2</span>
          콘텐츠 종류 선택
        </legend>
        <p class="section-copy">추천받고 싶은 콘텐츠 유형을 선택하세요.</p>
        <div class="option-grid compact">
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
        </div>
      </fieldset>

      <section class="input-section" aria-labelledby="inputSectionTitle">
        <div class="section-title">
          <span>3</span>
          <div>
            <h2 id="inputSectionTitle">좋아하는 작품 입력</h2>
            <p class="section-copy">기본 3개 입력창에 인상 깊었던 작품을 적어주세요.</p>
          </div>
        </div>
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
      </section>

      <div class="form-actions">
        <button class="primary-button" type="submit">추천받기</button>
      </div>
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
