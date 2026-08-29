import {
  candidateGenreMatchDetail,
  genreLabelForValue,
  localizedGenreLabels,
  selectedTaxonomyFilters,
} from "../genres/genreContract.js";
import {
  contentTypeMatchesSubmittedPreferences,
  normalizeDisplayContentType,
  normalizeProviderMediaType,
} from "../filters/hardFilterContract.js";

const normalizeTitleKey = (value = "") => String(value)
  .trim()
  .toLocaleLowerCase("ko-KR")
  .replace(/[^\p{L}\p{N}]+/gu, "");

const asStringArray = (value) => (Array.isArray(value) ? value : [value])
  .map((item) => String(item || "").trim())
  .filter(Boolean);

function cleanSeedTitle(value = "") {
  return String(value)
    .trim()
    .replace(/[\s.。．,，、!！?？:：;；"'“”‘’()[\]{}<>《》]+$/gu, "")
    .trim();
}

function seedWithKoreanObjectParticle(value = "") {
  const title = cleanSeedTitle(value);
  const lastCharacter = [...title].at(-1);
  if (!lastCharacter) return "";
  const code = lastCharacter.charCodeAt(0);
  const hasFinalConsonant = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return `${title}${hasFinalConsonant ? "을" : "를"}`;
}

export function resolveCanonicalReasonSeed(item = {}, confirmedSeeds = {}) {
  const requestedKeys = new Set([
    ...asStringArray(item.reasonSeed),
    ...asStringArray(item.seedTitle),
    ...asStringArray(item.reasonSeeds),
    ...asStringArray(item.seedTitles),
  ].map(normalizeTitleKey).filter(Boolean));

  for (const confirmed of Object.values(confirmedSeeds || {})) {
    if (!confirmed || typeof confirmed !== "object") continue;
    const canonicalTitle = cleanSeedTitle(
      confirmed.resolvedTitle || confirmed.originalTitle || confirmed.title || confirmed.displayTitle,
    );
    if (!canonicalTitle) continue;
    const aliases = [
      confirmed.inputTitle,
      confirmed.displayTitle,
      confirmed.resolvedTitle,
      confirmed.originalTitle,
      confirmed.title,
      ...(Array.isArray(confirmed.inputAliases) ? confirmed.inputAliases : []),
    ].map(normalizeTitleKey).filter(Boolean);
    if (aliases.some((alias) => requestedKeys.has(alias))) return canonicalTitle;
  }

  return cleanSeedTitle(item.reasonSeed || item.seedTitle || "");
}

const reasonByGenre = Object.freeze({
  "genre-action": "전투와 추격 중심의 액션 요소를 반영한 추천",
  "genre-adventure": "탐험과 여정 중심의 모험 요소를 반영한 추천",
  "genre-action-adventure": "액션·모험 통합 장르와 잘 맞는 추천",
  "genre-sf": "미래 기술과 우주 탐사 요소를 반영한 추천",
  "genre-fantasy": "마법과 신화적 세계관 요소를 반영한 추천",
  "genre-sf-fantasy": "SF·판타지 통합 장르와 잘 맞는 추천",
  "genre-war": "군사와 전투 요소를 반영한 추천",
  "genre-politics": "권력과 정치적 갈등 요소를 반영한 추천",
  "genre-war-politics": "전쟁·정치 통합 장르와 잘 맞는 추천",
  "genre-romance": "사랑과 관계의 흐름을 반영한 추천",
  "genre-thriller": "범죄·미스터리와 긴장 요소를 반영한 추천",
  "genre-horror": "공포와 초자연적 위협 요소를 반영한 추천",
});

export function buildSelectedOptionReason(item = {}, filters = [], { sentence = false } = {}) {
  const selected = selectedTaxonomyFilters(filters);
  if (!selected.length) return "";
  const explicitMatches = Array.isArray(item.matchedTaxonomyValues)
    ? item.matchedTaxonomyValues
    : candidateGenreMatchDetail(item, selected).matchedTaxonomyValues;
  const matched = selected.filter((value) => explicitMatches.includes(value));
  if (!matched.length) return "";

  let reason;
  if (matched.length === 1) {
    reason = reasonByGenre[matched[0]] || `${genreLabelForValue(matched[0])} 조건과 잘 맞는 추천`;
  } else {
    const labels = matched.slice(0, 2).map(genreLabelForValue).filter(Boolean);
    reason = labels.length === 2
      ? `${labels[0]}과 ${labels[1]} 요소를 함께 반영한 추천`
      : `${labels[0] || "선택한 장르"} 요소를 반영한 추천`;
  }
  return sentence ? `${reason}입니다.` : reason;
}

export function buildEvidenceGroundedDecisionReason(item = {}, {
  titles = [],
  confirmedSeeds = {},
  selectedFilters = [],
  selectedTypes = [],
  selectedOtt = [],
} = {}) {
  const canonicalSeed = resolveCanonicalReasonSeed(item, confirmedSeeds);
  const genres = presentationGenreLabels(item);
  const primaryGenre = genres[0] || String(item.genre || "").split(",")[0].trim();
  if (canonicalSeed && primaryGenre) {
    return `${seedWithKoreanObjectParticle(canonicalSeed)} 좋아했다면 ${primaryGenre} 작품으로 이어가는 추천`;
  }
  if (canonicalSeed) return `${seedWithKoreanObjectParticle(canonicalSeed)} 좋아했다면 추천`;

  if (titles.length > 1) return "여러 취향을 함께 반영한 추천";
  if (titles.length) return "입력한 취향을 바탕으로 추천";

  const selectedReason = buildSelectedOptionReason(item, selectedFilters);
  if (selectedReason) return selectedReason;

  const actualOtt = asStringArray(item.ott).map((value) => value.toLocaleLowerCase("ko-KR"));
  const selectedOttLabel = selectedOtt.find((value) => actualOtt.some((actual) => actual.includes(String(value).split("-")[0])));
  if (selectedOttLabel) return "선택한 OTT에서 볼 수 있는 작품 중 고른 추천";

  const displayType = normalizeDisplayContentType(item);
  const typeLabel = { movie: "영화", drama: "드라마", animation: "애니" }[displayType];
  if (typeLabel && selectedTypes.includes(displayType)) return `${typeLabel} 조건에 맞춘 추천`;

  return item.reason || "오늘 바로 고르기 좋은 추천";
}

function uniqueReasonCandidates(candidates = []) {
  return [...new Set(candidates.map((candidate) => String(candidate || "").trim()).filter(Boolean))];
}

function buildEvidenceGroundedDecisionReasonCandidates(item = {}, {
  titles = [],
  confirmedSeeds = {},
  selectedFilters = [],
  selectedTypes = [],
  selectedOtt = [],
} = {}) {
  const canonicalSeed = resolveCanonicalReasonSeed(item, confirmedSeeds);
  const genres = presentationGenreLabels(item);
  const primaryGenre = genres[0] || String(item.genre || "").split(",")[0].trim();
  const selectedReason = buildSelectedOptionReason(item, selectedFilters);
  const displayType = normalizeDisplayContentType(item);
  const typeLabel = { movie: "영화", drama: "드라마", animation: "애니" }[displayType];
  const actualOtt = asStringArray(item.ott).map((value) => value.toLocaleLowerCase("ko-KR"));
  const selectedOttMatch = selectedOtt.some((value) => (
    actualOtt.some((actual) => actual.includes(String(value).split("-")[0].toLocaleLowerCase("ko-KR")))
  ));
  const candidates = [];

  if (canonicalSeed && primaryGenre) {
    const seed = seedWithKoreanObjectParticle(canonicalSeed);
    candidates.push(`${seed} 좋아했다면 ${primaryGenre} 작품으로 이어가는 추천`);
  }
  if (selectedReason) candidates.push(selectedReason);
  if (typeLabel && selectedTypes.includes(displayType)) candidates.push(`${typeLabel} 조건에 맞춘 추천`);
  if (selectedOttMatch) candidates.push("선택한 OTT에서 볼 수 있는 작품 중 고른 추천");
  if (canonicalSeed && primaryGenre) {
    candidates.push(
      `${canonicalSeed}에서 좋아한 ${primaryGenre} 결을 이어 살펴보는 추천`,
      `${canonicalSeed}와 맞닿은 ${primaryGenre} 장르에서 고른 추천`,
    );
  }
  if (canonicalSeed) {
    const seed = seedWithKoreanObjectParticle(canonicalSeed);
    candidates.push(
      `${seed} 좋아했다면 이어서 살펴볼 추천`,
      `${canonicalSeed}에서 이어지는 취향을 반영한 추천`,
    );
  }
  if (titles.length > 1) candidates.push("여러 취향을 함께 반영한 추천");
  else if (titles.length) candidates.push("입력한 취향을 바탕으로 추천");
  if (primaryGenre) candidates.push(`${primaryGenre} 장르 정보를 반영한 추천`);

  const fallback = String(item.reason || "").trim() || "오늘 바로 고르기 좋은 추천";
  candidates.push(fallback);
  return uniqueReasonCandidates(candidates);
}

export function buildEvidenceGroundedDecisionReasons(items = [], preferences = {}) {
  const usedReasons = new Set();
  let previousReason = "";

  return items.map((item, index) => {
    const candidates = buildEvidenceGroundedDecisionReasonCandidates(item, preferences);
    const offset = candidates.length ? index % candidates.length : 0;
    const orderedCandidates = candidates.map((_, candidateIndex) => (
      candidates[(offset + candidateIndex) % candidates.length]
    ));
    const reason = orderedCandidates.find((candidate) => candidate !== previousReason && !usedReasons.has(candidate))
      || orderedCandidates.find((candidate) => candidate !== previousReason)
      || orderedCandidates[0]
      || "오늘 바로 고르기 좋은 추천";
    usedReasons.add(reason);
    previousReason = reason;
    return reason;
  });
}

export function buildEvidenceGroundedRecommendationReason(item = {}, preferences = {}) {
  const decision = buildEvidenceGroundedDecisionReason(item, preferences);
  const detail = String(item.reason || "").trim();
  return detail && detail !== decision ? `${decision}입니다. ${detail}` : `${decision}입니다.`;
}

export function dedupePrimaryDisplayTitles(items = []) {
  const seenContent = new Set();
  const seenTitles = new Set();
  return items.filter((item) => {
    const contentKey = `${item.providerId || item.source || "provider"}:${item.mediaType || item.type}:${item.providerContentId || item.tmdbId || ""}`;
    if (item.providerContentId || item.tmdbId) {
      if (seenContent.has(contentKey)) return false;
      seenContent.add(contentKey);
    }
    const titleKey = normalizeTitleKey(item.title || item.name);
    if (!titleKey) return true;
    if (seenTitles.has(titleKey)) return false;
    seenTitles.add(titleKey);
    return true;
  });
}

export function contentTypeMatchesSelection(item = {}, selectedTypes = [], selectedFilters = []) {
  return contentTypeMatchesSubmittedPreferences(item, selectedTypes, selectedFilters);
}

export { normalizeDisplayContentType, normalizeProviderMediaType };

export function presentationGenreLabels(item = {}) {
  return localizedGenreLabels(item);
}
