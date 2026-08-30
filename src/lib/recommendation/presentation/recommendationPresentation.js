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

const defaultContentTypes = Object.freeze(["movie", "drama", "animation"]);
const contentTypeLabels = Object.freeze({ movie: "영화", drama: "드라마", animation: "애니" });
const genericProviderReasons = Object.freeze([
  "실제 TMDB 작품 정보입니다.",
  "실제 검색 결과입니다.",
]);

function normalizeReasonText(value = "") {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function withoutTerminalPunctuation(value = "") {
  return normalizeReasonText(value).replace(/[.。]+$/gu, "").trim();
}

function isGenericProviderReason(value = "") {
  const normalized = normalizeReasonText(value);
  if (genericProviderReasons.includes(normalized)) return true;
  return /^(?:실제\s+TMDB\s+작품\s+정보|실제\s+검색\s+결과)입니다(?:[.。]\s*입니다)*[.。]*$/u.test(normalized);
}

function isGenericStructuralReason(value = "") {
  const normalized = withoutTerminalPunctuation(value);
  return [
    /^.+ 성격의 .+라 먼저 살펴볼 만한 작품$/u,
    /^.+ 이야기를 .+ 형식으로 만나볼 수 있는 추천$/u,
    /^.+ 가운데 .+ 결이 보여 후보로 보기 좋은 작품$/u,
    /^오늘 바로 고르기 좋은 추천$/u,
  ].some((pattern) => pattern.test(normalized));
}

function hasSubmittedPreferenceEvidence({ titles = [], confirmedSeeds = {} } = {}) {
  const hasTitle = asStringArray(titles).some((title) => cleanSeedTitle(title));
  const hasConfirmedSeed = Object.values(confirmedSeeds || {}).some((seed) => {
    if (!seed || typeof seed !== "object") return false;
    return Boolean(cleanSeedTitle(seed.resolvedTitle || seed.originalTitle || seed.title || seed.displayTitle));
  });
  return hasTitle || hasConfirmedSeed;
}

function filterUnsupportedPreferenceReason(detail, hasPreferenceEvidence) {
  if (hasPreferenceEvidence) return detail;

  return detail
    .split(/(?<=[.!?。！？])\s*/u)
    .filter((sentence) => {
      const referencesUserInput = /입력한\s*(?:작품|취향)|좋아한\s*작품|좋아했던\s*작품/u.test(sentence);
      const claimsConnection = /연결|바탕|기준|반영/u.test(sentence);
      return !(referencesUserInput && claimsConnection);
    })
    .join(" ")
    .trim();
}

function meaningfulItemReason(item = {}, preferences = {}) {
  const detail = normalizeReasonText(item.reason);
  if (!detail || isGenericProviderReason(detail) || isGenericStructuralReason(detail)) return "";
  return withoutTerminalPunctuation(filterUnsupportedPreferenceReason(
    detail,
    hasSubmittedPreferenceEvidence(preferences),
  ));
}

function typeLabelForItem(item = {}) {
  return contentTypeLabels[normalizeDisplayContentType(item)] || "";
}

function hasFocusedContentTypeSelection(selectedTypes = []) {
  const uniqueTypes = [...new Set(Array.isArray(selectedTypes) ? selectedTypes : [])];
  return uniqueTypes.length > 0 && uniqueTypes.length < defaultContentTypes.length;
}

function stableReasonIndex(item = {}) {
  const identity = String(item.providerContentId || item.tmdbId || item.id || item.title || "");
  return [...identity].reduce((total, character) => total + character.codePointAt(0), 0) % 3;
}

function neutralEvidenceReason(item = {}, preferences = {}) {
  const genres = presentationGenreLabels(item);
  const primaryGenre = genres[0] || String(item.genre || "").split(",")[0].trim();
  const typeLabel = typeLabelForItem(item);
  const detail = meaningfulItemReason(item, preferences);
  if (detail) return { reason: detail, family: "item-specific" };

  const numericRuntime = Number(item.runtimeMinutes);
  const runtime = Number.isFinite(numericRuntime) && numericRuntime > 0
    ? `${numericRuntime}분`
    : /^\d+(?:\.\d+)?분$/u.test(String(item.runtime || ""))
      ? String(item.runtime)
      : "";
  const numericRating = Number(item.rating);
  const rating = Number.isFinite(numericRating) && numericRating > 0 ? numericRating.toFixed(1) : "";
  if (genres.length >= 4 && typeLabel) {
    return {
      reason: `${genres.slice(0, 3).join("·")} 장르를 넘나드는 ${typeLabel}입니다.`,
      family: "genre-range",
    };
  }
  if (runtime && genres.length >= 2 && typeLabel) {
    return {
      reason: `${runtime} 안에 ${genres.slice(0, 2).join("·")} 흐름을 담은 ${typeLabel}입니다.`,
      family: "runtime-genre",
    };
  }
  if (genres.length >= 2 && typeLabel) {
    return {
      reason: `${genres.slice(0, 2).join("·")} 장르가 함께 드러나는 ${typeLabel}입니다.`,
      family: "multi-genre",
    };
  }
  if (rating && (primaryGenre || typeLabel)) {
    return {
      reason: `평점 ${rating}의 ${primaryGenre || typeLabel} ${typeLabel || "작품"}입니다.`,
      family: "rating",
    };
  }
  if (primaryGenre && typeLabel) {
    return { reason: `${primaryGenre} 장르의 ${typeLabel}입니다.`, family: "genre" };
  }
  if (typeLabel) return { reason: `${typeLabel} 형식으로 만나볼 수 있는 작품입니다.`, family: "type" };
  return { reason: "작품의 기본 정보를 바탕으로 살펴볼 만한 선택입니다.", family: "generic" };
}

function neutralReasonCandidates(item = {}, preferences = {}) {
  const evidenceReason = neutralEvidenceReason(item, preferences);
  return evidenceReason.reason ? [evidenceReason.reason] : [];
}

export function buildFirstPickRecommendationReason(item = {}) {
  const genres = presentationGenreLabels(item);
  const primaryGenre = genres[0] || String(item.genre || "").split(",")[0].trim();
  const typeLabel = typeLabelForItem(item);
  const candidates = primaryGenre && typeLabel
    ? primaryGenre === typeLabel
      ? [
        `${typeLabel} 작품이라 먼저 살펴볼 만한 선택입니다.`,
        `${typeLabel} 가운데 먼저 살펴볼 만한 작품입니다.`,
        `${primaryGenre} 장르로 먼저 눈여겨볼 만한 작품입니다.`,
      ]
      : [
        `${primaryGenre} 성격의 ${typeLabel}라 먼저 살펴볼 만한 작품입니다.`,
        `${typeLabel} 가운데 ${primaryGenre} 결이 보여 먼저 살펴볼 만한 선택입니다.`,
        `${primaryGenre} 이야기를 ${typeLabel} 형식으로 만나볼 수 있는 작품입니다.`,
      ]
    : primaryGenre
      ? [
        `${primaryGenre} 장르 정보를 바탕으로 먼저 살펴볼 만한 작품입니다.`,
        `${primaryGenre} 결이 보여 먼저 눈여겨볼 만한 작품입니다.`,
      ]
      : typeLabel
        ? [`${typeLabel} 작품으로 먼저 살펴볼 만한 선택입니다.`]
        : ["작품의 기본 정보를 바탕으로 먼저 살펴볼 만한 선택입니다."];

  return candidates[stableReasonIndex(item) % candidates.length];
}

export function recommendationOptionButtonLabel(selectedCount = 0) {
  const count = Number.isInteger(selectedCount) ? selectedCount : Number(selectedCount);
  return count > 0 ? `추가 옵션 ${count}개 선택됨` : "더 많은 옵션 선택하기";
}

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
  if (item.firstPick) return buildFirstPickRecommendationReason(item);

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

  const displayType = normalizeDisplayContentType(item);
  const typeLabel = contentTypeLabels[displayType];
  if (typeLabel && hasFocusedContentTypeSelection(selectedTypes) && selectedTypes.includes(displayType)) {
    return `${typeLabel} 조건에 맞춘 추천`;
  }

  const neutralReason = neutralReasonCandidates(item, { titles, confirmedSeeds })[0];
  if (neutralReason) return neutralReason;

  const actualOtt = asStringArray(item.ott).map((value) => value.toLocaleLowerCase("ko-KR"));
  const selectedOttMatch = selectedOtt.some((value) => (
    actualOtt.some((actual) => actual.includes(String(value).split("-")[0].toLocaleLowerCase("ko-KR")))
  ));
  if (selectedOttMatch) return "선택한 OTT에서 볼 수 있는 작품 중 고른 추천";

  return "오늘 바로 고르기 좋은 추천";
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
  const typeLabel = contentTypeLabels[displayType];
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
  if (typeLabel && hasFocusedContentTypeSelection(selectedTypes) && selectedTypes.includes(displayType)) {
    candidates.push(`${typeLabel} 조건에 맞춘 추천`);
  }
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
  candidates.push(...neutralReasonCandidates(item, { titles, confirmedSeeds }));
  if (selectedOttMatch) candidates.push("선택한 OTT에서 볼 수 있는 작품 중 고른 추천");
  candidates.push("오늘 바로 고르기 좋은 추천");
  return uniqueReasonCandidates(candidates);
}

export function buildEvidenceGroundedDecisionReasons(items = [], preferences = {}) {
  const usedReasons = new Set();
  let previousReason = "";

  return items.map((item) => {
    const candidates = buildEvidenceGroundedDecisionReasonCandidates(item, preferences);
    const reason = candidates.find((candidate) => candidate !== previousReason && !usedReasons.has(candidate))
      || candidates.find((candidate) => candidate !== previousReason)
      || candidates[0]
      || "오늘 바로 고르기 좋은 추천";
    usedReasons.add(reason);
    previousReason = reason;
    return reason;
  });
}

export function buildEvidenceGroundedRecommendationReason(item = {}, preferences = {}) {
  if (item.firstPick) return buildFirstPickRecommendationReason(item);

  const decision = buildEvidenceGroundedDecisionReason(item, preferences);
  const detail = meaningfulItemReason(item, preferences);
  const sentences = [decision, detail]
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex((candidate) => (
      withoutTerminalPunctuation(candidate) === withoutTerminalPunctuation(value)
    )) === index)
    .map((value) => `${withoutTerminalPunctuation(value)}.`);
  return sentences.join(" ") || "오늘 바로 고르기 좋은 추천.";
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
