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
