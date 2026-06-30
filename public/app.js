const dummyRecommendations = [
  {
    title: "컨택트",
    type: "movie",
    label: "영화",
    match: 94,
    reason: "입력한 작품의 SF, 감정선, 여운 있는 전개와 잘 맞는 더미 추천입니다.",
  },
  {
    title: "더 베어",
    type: "drama",
    label: "드라마",
    match: 88,
    reason: "인물의 성장과 압박감 있는 리듬을 좋아하는 사용자에게 어울립니다.",
  },
  {
    title: "스파이더맨: 뉴 유니버스",
    type: "animation",
    label: "애니",
    match: 86,
    reason: "빠른 전개, 감각적인 화면, 성장 서사를 함께 원하는 흐름에 맞습니다.",
  },
  {
    title: "나이브스 아웃",
    type: "movie",
    label: "영화",
    match: 82,
    reason: "추리와 반전, 가벼운 긴장감을 동시에 즐길 때 보기 좋은 추천입니다.",
  },
  {
    title: "오징어 게임",
    type: "drama",
    label: "드라마",
    match: 79,
    reason: "강한 몰입감과 생존 게임 구도를 선호할 때 잘 맞는 더미 결과입니다.",
  },
  {
    title: "센과 치히로의 행방불명",
    type: "animation",
    label: "애니",
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
const recommendButton = document.querySelector("#recommendButton");

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
  recommendButton.disabled = enteredTitles().length === 0 && selectedQuickPicks().length === 0;
}

function openQuickPick() {
  quickPickOverlay.classList.remove("hidden");
  quickPickOverlay.setAttribute("aria-hidden", "false");
}

function closeQuickPick() {
  quickPickOverlay.classList.add("hidden");
  quickPickOverlay.setAttribute("aria-hidden", "true");
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
        <article class="result-card">
          <div class="card-topline">
            <span class="type-badge">${escapeHtml(item.label)}</span>
            <strong>${item.match}%</strong>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="input-summary">${escapeHtml(inputSummary)}</p>
          <p>${escapeHtml(item.reason)}</p>
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

document.querySelectorAll('input[name="title"], input[name="quickPick"]').forEach((input) => {
  input.addEventListener("input", updateRecommendButton);
  input.addEventListener("change", updateRecommendButton);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeQuickPick();
});

updateRecommendButton();
