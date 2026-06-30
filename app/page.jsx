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
        <button class="secondary-button" id="quickPickButton" type="button">추천 옵션</button>
        <button class="primary-button" id="recommendButton" type="submit" disabled>추천받기</button>
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

  <div class="quick-pick-overlay hidden" id="quickPickOverlay" aria-hidden="true">
    <div class="quick-pick-backdrop" data-close-quick-pick></div>
    <section class="quick-pick-sheet" role="dialog" aria-modal="true" aria-labelledby="quickPickTitle">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-heading">
        <div>
          <p class="eyebrow">Quick Pick</p>
          <h2 id="quickPickTitle">추천 옵션</h2>
          <p class="sheet-count" id="quickPickCount">필터 0개 선택됨</p>
        </div>
        <button class="close-button" type="button" data-close-quick-pick aria-label="추천 옵션 닫기">×</button>
      </div>

      <div class="quick-pick-groups">
        <fieldset class="quick-group">
          <legend>장르</legend>
          <label class="check-option"><input type="checkbox" name="quickPick" value="genre-sf" /><span>SF</span></label>
          <label class="check-option"><input type="checkbox" name="quickPick" value="genre-romance" /><span>로맨스</span></label>
          <label class="check-option"><input type="checkbox" name="quickPick" value="genre-thriller" /><span>스릴러</span></label>
        </fieldset>
        <fieldset class="quick-group">
          <legend>국가</legend>
          <label class="check-option"><input type="checkbox" name="quickPick" value="country-kr" /><span>한국</span></label>
          <label class="check-option"><input type="checkbox" name="quickPick" value="country-us" /><span>미국</span></label>
          <label class="check-option"><input type="checkbox" name="quickPick" value="country-jp" /><span>일본</span></label>
        </fieldset>
        <fieldset class="quick-group">
          <legend>분위기</legend>
          <label class="check-option"><input type="checkbox" name="quickPick" value="mood-light" /><span>가볍게</span></label>
          <label class="check-option"><input type="checkbox" name="quickPick" value="mood-moving" /><span>여운 있게</span></label>
          <label class="check-option"><input type="checkbox" name="quickPick" value="mood-tense" /><span>긴장감</span></label>
        </fieldset>
        <fieldset class="quick-group">
          <legend>러닝타임</legend>
          <label class="check-option"><input type="checkbox" name="quickPick" value="runtime-short" /><span>60분 이하</span></label>
          <label class="check-option"><input type="checkbox" name="quickPick" value="runtime-medium" /><span>2시간 이하</span></label>
          <label class="check-option"><input type="checkbox" name="quickPick" value="runtime-long" /><span>긴 작품</span></label>
        </fieldset>
      </div>
    </section>
  </div>

  <div class="detail-overlay hidden" id="detailOverlay" aria-hidden="true">
    <div class="detail-backdrop" data-close-detail></div>
    <section class="detail-layer" role="dialog" aria-modal="true" aria-labelledby="detailTitle">
      <button class="close-button detail-close" type="button" data-close-detail aria-label="상세 정보 닫기">×</button>
      <div id="detailContent"></div>
    </section>
  </div>
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
