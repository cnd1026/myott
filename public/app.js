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

const form = document.querySelector("#recommendationForm");
const resultGrid = document.querySelector("#resultGrid");
const emptyState = document.querySelector("#emptyState");
const resultCount = document.querySelector("#resultCount");
const quickPickButton = document.querySelector("#quickPickButton");
const quickPickOverlay = document.querySelector("#quickPickOverlay");
const quickPickCount = document.querySelector("#quickPickCount");
const recommendButton = document.querySelector("#recommendButton");
const detailOverlay = document.querySelector("#detailOverlay");
const detailContent = document.querySelector("#detailContent");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function selectedTypes() {
  return [...document.querySelectorAll('input[name="contentType"]:checked')].map((input) => input.value);
}

function enteredTitles() {
  return [...document.querySelectorAll('input[name="title"]')]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function selectedQuickPicks() {
  return [...document.querySelectorAll('input[name="quickPick"]:checked')].map((input) => input.value);
}

function updateRecommendButton() {
  const quickPickTotal = selectedQuickPicks().length;
  recommendButton.disabled = enteredTitles().length === 0 && quickPickTotal === 0;
  quickPickButton.textContent = quickPickTotal ? `추천 옵션 (${quickPickTotal})` : "추천 옵션";
  quickPickCount.textContent = `필터 ${quickPickTotal}개 선택됨`;
}

function openQuickPick() {
  quickPickOverlay.classList.remove("hidden");
  quickPickOverlay.setAttribute("aria-hidden", "false");
}

function closeQuickPick() {
  quickPickOverlay.classList.add("hidden");
  quickPickOverlay.setAttribute("aria-hidden", "true");
}

function thumbnailText(title) {
  return title.slice(0, 2);
}

function openDetail(title) {
  const item = dummyRecommendations.find((entry) => entry.title === title);
  if (!item) return;

  detailContent.innerHTML = `
    <div class="detail-layout">
      <div class="detail-thumb" aria-hidden="true">${escapeHtml(thumbnailText(item.title))}</div>
      <div class="detail-info">
        <span class="type-badge">${escapeHtml(item.label)}</span>
        <h2 id="detailTitle">${escapeHtml(item.title)}</h2>
        <div class="meta-list">
          <span><strong>장르</strong> ${escapeHtml(item.genre)}</span>
          <span><strong>감독</strong> ${escapeHtml(item.director)}</span>
          <span><strong>주요 배우</strong> ${item.actors.map(escapeHtml).join(", ")}</span>
        </div>
        <p><strong>줄거리</strong><br>${escapeHtml(item.synopsis)}</p>
        <p><strong>추천 이유</strong><br>${escapeHtml(item.reason)}</p>
      </div>
    </div>
  `;
  closeQuickPick();
  detailOverlay.classList.remove("hidden");
  detailOverlay.setAttribute("aria-hidden", "false");
}

function closeDetail() {
  detailOverlay.classList.add("hidden");
  detailOverlay.setAttribute("aria-hidden", "true");
}

function renderResults(items, titles) {
  resultCount.textContent = `${items.length}개`;
  emptyState.classList.toggle("hidden", items.length > 0);

  if (!items.length) {
    emptyState.textContent = "선택한 유형에 맞는 더미 결과가 없습니다. 영화, 드라마, 애니 중 하나 이상 선택해 주세요.";
    resultGrid.innerHTML = "";
    return;
  }

  const inputSummary = titles.length ? `${titles.join(", ")} 기반` : "기본 취향 기반";
  resultGrid.innerHTML = items
    .map(
      (item) => `
        <article class="result-card" tabindex="0" role="button" data-detail-title="${escapeHtml(item.title)}" aria-label="${escapeHtml(item.title)} 상세 보기">
          <div class="thumbnail" aria-hidden="true">${escapeHtml(thumbnailText(item.title))}</div>
          <div class="result-body">
            <div class="card-topline">
              <span class="type-badge">${escapeHtml(item.label)}</span>
              <strong>${item.match}%</strong>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <div class="meta-list">
              <span><strong>장르</strong> ${escapeHtml(item.genre)}</span>
              <span><strong>감독</strong> ${escapeHtml(item.director)}</span>
              <span><strong>주요 배우</strong> ${item.actors.map(escapeHtml).join(", ")}</span>
            </div>
            <p class="input-summary">${escapeHtml(inputSummary)}</p>
            <p>${escapeHtml(item.reason)}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (recommendButton.disabled) return;
  const types = selectedTypes();
  const titles = enteredTitles();
  const results = dummyRecommendations.filter((item) => types.includes(item.type));
  renderResults(results, titles);
});

quickPickButton.addEventListener("click", openQuickPick);

document.querySelectorAll("[data-close-quick-pick]").forEach((button) => {
  button.addEventListener("click", closeQuickPick);
});

document.querySelectorAll("[data-close-detail]").forEach((button) => {
  button.addEventListener("click", closeDetail);
});

resultGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-detail-title]");
  if (card) openDetail(card.dataset.detailTitle);
});

resultGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-detail-title]");
  if (!card) return;
  event.preventDefault();
  openDetail(card.dataset.detailTitle);
});

document.querySelectorAll('input[name="title"], input[name="quickPick"]').forEach((input) => {
  input.addEventListener("input", updateRecommendButton);
  input.addEventListener("change", updateRecommendButton);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDetail();
    closeQuickPick();
  }
});

updateRecommendButton();
