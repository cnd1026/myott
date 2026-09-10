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
  selectedRuntimeFilter,
} from "../filters/hardFilterContract.js";
import { DEFAULT_UI_LOCALE, normalizeUiLocale } from "../../i18n/localeContract.js";
import {
  localizeGenreDisplayLabels,
  taxonomyLabelForValue,
} from "../../i18n/taxonomyPresentation.js";

const normalizeTitleKey = (value = "") => String(value)
  .trim()
  .toLocaleLowerCase("ko-KR")
  .replace(/[^\p{L}\p{N}]+/gu, "");

const asStringArray = (value) => (Array.isArray(value) ? value : [value])
  .map((item) => String(item || "").trim())
  .filter(Boolean);

const DISPLAY_OTT_ALIASES = Object.freeze({
  netflix: "Netflix",
  "netflix standard with ads": "Netflix",
});

export function normalizeDisplayOttProviders(providers = []) {
  const seen = new Set();
  return asStringArray(providers).reduce((normalized, provider) => {
    const aliasKey = provider.toLocaleLowerCase("en-US");
    const displayName = DISPLAY_OTT_ALIASES[aliasKey] || provider;
    if (seen.has(displayName)) return normalized;
    seen.add(displayName);
    normalized.push(displayName);
    return normalized;
  }, []);
}

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

const KO_REASON_BY_GENRE = Object.freeze({
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
const EN_REASON_BY_GENRE = Object.freeze({
  "genre-action": "Recommended for its combat and chase-driven action",
  "genre-adventure": "Recommended for its exploration and journey-driven adventure",
  "genre-action-adventure": "A strong match for Action & Adventure",
  "genre-sf": "Recommended for its future technology and space exploration",
  "genre-fantasy": "Recommended for its magic and mythic worldbuilding",
  "genre-sf-fantasy": "A strong match for Sci-Fi & Fantasy",
  "genre-war": "Recommended for its military and combat themes",
  "genre-politics": "Recommended for its power struggles and political conflict",
  "genre-war-politics": "A strong match for War & Politics",
  "genre-romance": "Recommended for its focus on love and relationships",
  "genre-thriller": "Recommended for its crime, mystery, and tension",
  "genre-horror": "Recommended for its horror and supernatural threats",
});

const defaultContentTypes = Object.freeze(["movie", "drama", "animation"]);
const genericProviderReasons = Object.freeze([
  "실제 TMDB 작품 정보입니다.",
  "실제 검색 결과입니다.",
  "This is actual TMDB title information.",
  "This is an actual search result.",
]);

function resolvedLocale(locale) {
  return normalizeUiLocale(locale) || DEFAULT_UI_LOCALE;
}

function isEnglishLocale(locale) {
  return resolvedLocale(locale) === "en-US";
}

function normalizeReasonText(value = "") {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function withoutTerminalPunctuation(value = "") {
  return normalizeReasonText(value).replace(/[.。]+$/gu, "").trim();
}

function isGenericProviderReason(value = "") {
  const normalized = normalizeReasonText(value);
  if (genericProviderReasons.includes(normalized)) return true;
  if ([
    "선택한 OTT에서 볼 수 있는 작품 중 고른 추천",
    "A pick available on one of your selected streaming services",
  ].includes(normalized)) return true;
  return /^(?:실제\s+TMDB\s+작품\s+정보|실제\s+검색\s+결과)입니다(?:[.。]\s*입니다)*[.。]*$/u.test(normalized);
}

function isTypeOnlyReason(value = "") {
  return /^(?:영화|드라마|애니) 형식으로 만나볼 수 있는 작품입니다[.。]*$/u.test(withoutTerminalPunctuation(value));
}

function containsProviderGeneratedBoilerplate(value = "") {
  return /(?:실제\s+TMDB\s+작품\s+정보|실제\s+검색\s+결과)입니다/u.test(normalizeReasonText(value));
}

function removeProviderGeneratedBoilerplate(value = "") {
  return normalizeReasonText(value)
    .split(/(?<=[.!?。！？])\s*/u)
    .filter((sentence) => !containsProviderGeneratedBoilerplate(sentence))
    .join(" ")
    .trim();
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

function hasConfirmedSeed(confirmedSeeds = {}) {
  return Object.values(confirmedSeeds || {}).some((seed) => {
    if (!seed || typeof seed !== "object") return false;
    return Boolean(cleanSeedTitle(seed.resolvedTitle || seed.originalTitle || seed.title || seed.displayTitle));
  });
}

function hasExtraRecommendationOption(selectedFilters = []) {
  return Array.isArray(selectedFilters) && selectedFilters.some((filter) => String(filter || "").trim());
}

function hasDefaultContentTypes(selectedTypes = []) {
  const actual = [...new Set(Array.isArray(selectedTypes) ? selectedTypes : [])].sort();
  return actual.length === defaultContentTypes.length
    && [...defaultContentTypes].sort().every((type) => actual.includes(type));
}

export function isBaselineRecommendationContext({
  titles = [],
  confirmedSeeds = {},
  selectedFilters = [],
} = {}) {
  return !asStringArray(titles).some((title) => cleanSeedTitle(title))
    && !hasConfirmedSeed(confirmedSeeds)
    && !hasExtraRecommendationOption(selectedFilters);
}

export function buildBaselineSessionContext({
  titles = [],
  confirmedSeeds = {},
  selectedFilters = [],
  selectedTypes = [],
  selectedOtt = [],
} = {}, locale = DEFAULT_UI_LOCALE) {
  if (!isBaselineRecommendationContext({ titles, confirmedSeeds, selectedFilters })) return "";
  const isDefault = hasDefaultContentTypes(selectedTypes) && !asStringArray(selectedOtt).length;
  if (isEnglishLocale(locale)) {
    return isDefault
      ? "With no extra preferences, we're showing a broad set of recommendations."
      : "With no extra preferences, we used your selected basic filters.";
  }
  return isDefault
    ? "추가 취향 정보가 없어 폭넓은 기본 추천을 보여드려요."
    : "추가 취향 정보가 없어 선택한 기본 조건을 기준으로 추천했어요.";
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

function meaningfulItemReason(item = {}, preferences = {}, locale = DEFAULT_UI_LOCALE) {
  const detail = normalizeReasonText(item.reason);
  const hasPreferenceEvidence = hasSubmittedPreferenceEvidence(preferences);
  const safeDetail = !hasPreferenceEvidence && containsProviderGeneratedBoilerplate(detail)
    ? removeProviderGeneratedBoilerplate(detail)
    : detail;
  if (!safeDetail || isGenericProviderReason(safeDetail) || isGenericStructuralReason(safeDetail)) return "";
  if (isEnglishLocale(locale) && /[가-힣]/u.test(safeDetail)) return "";
  if (isTypeOnlyReason(safeDetail) && (
    presentationGenreLabels(item).length > 0
    || (Number.isFinite(Number(item.rating)) && Number(item.rating) > 0)
  )) return "";
  if (/\d{1,4}(?:\.\d+)?\s*분|러닝타임|상영\s*시간|\bruntime\b/iu.test(safeDetail)) return "";
  return withoutTerminalPunctuation(filterUnsupportedPreferenceReason(
    safeDetail,
    hasPreferenceEvidence,
  ));
}

function typeLabelForItem(item = {}, locale = DEFAULT_UI_LOCALE) {
  const contentType = normalizeDisplayContentType(item);
  if (isEnglishLocale(locale)) {
    return ({ movie: "movie", drama: "TV series", animation: "animation" })[contentType] || "";
  }
  return taxonomyLabelForValue(contentType, locale);
}

function sentenceCaseTypeLabel(typeLabel = "") {
  return typeLabel === "TV series" ? typeLabel : typeLabel.toLowerCase();
}

function stableReasonIndex(item = {}) {
  const identity = String(item.providerContentId || item.tmdbId || item.id || item.title || "");
  return [...identity].reduce((total, character) => total + character.codePointAt(0), 0) % 3;
}

function runtimeReasonLabel(selectedFilters = [], locale = DEFAULT_UI_LOCALE) {
  const selected = selectedRuntimeFilter(selectedFilters);
  if (!selected) return "";
  if (selected.value === "runtime-long" && !isEnglishLocale(locale)) return "2시간 이상";
  return taxonomyLabelForValue(selected.value, locale).replace(/^Long \(|\)$/g, "");
}

function neutralEvidenceReasons(item = {}, preferences = {}, locale = DEFAULT_UI_LOCALE) {
  const genres = presentationGenreLabels(item, locale);
  const primaryGenre = genres[0] || String(item.genre || "").split(",")[0].trim();
  const typeLabel = typeLabelForItem(item, locale);
  const detail = meaningfulItemReason(item, preferences, locale);
  const numericRating = Number(item.rating);
  const hasIntrinsicEvidence = genres.length > 0 || (Number.isFinite(numericRating) && numericRating > 0);
  if (detail) return [{ reason: detail, family: "item-specific" }];

  const runtime = runtimeReasonLabel(preferences.selectedFilters, locale);
  const rating = Number.isFinite(numericRating) && numericRating > 0 ? numericRating.toFixed(1) : "";
  const reasons = [];
  if (isEnglishLocale(locale)) {
    const sentenceType = sentenceCaseTypeLabel(typeLabel);
    if (runtime && genres.length >= 2 && typeLabel) {
      reasons.push({ reason: `A ${sentenceType} with ${genres.slice(0, 2).join(" and ")} themes in the ${runtime} range.`, family: "runtime-genre" });
    } else if (runtime && typeLabel) {
      reasons.push({ reason: `A ${sentenceType} in the ${runtime} range.`, family: "runtime" });
    }
    if (genres.length >= 4 && typeLabel) {
      reasons.push({ reason: `A ${sentenceType} spanning ${genres.slice(0, 3).join(", ")}.`, family: "genre-range" });
    }
    if (genres.length >= 2 && typeLabel) {
      reasons.push({ reason: `A ${sentenceType} blending ${genres.slice(0, 2).join(" and ")}.`, family: "multi-genre" });
    }
    if (rating && (primaryGenre || typeLabel)) {
      const ratingSubject = primaryGenre && typeLabel && primaryGenre !== typeLabel
        ? `${primaryGenre} ${sentenceType}`
        : (typeLabel ? sentenceType : (primaryGenre || "title").toLowerCase());
      reasons.push({ reason: `A ${ratingSubject} rated ${rating}.`, family: "rating" });
    }
    if (primaryGenre && typeLabel) reasons.push({ reason: `A ${primaryGenre} ${sentenceType}.`, family: "genre" });
    if (rating) reasons.push({ reason: `A title rated ${rating}.`, family: "rating" });
    if (typeLabel && !hasIntrinsicEvidence) reasons.push({ reason: `A ${sentenceType} worth considering.`, family: "type" });
    return reasons.length
      ? reasons
      : [{ reason: "A title worth considering based on its available details.", family: "generic" }];
  }
  if (runtime && genres.length >= 2 && typeLabel) {
    reasons.push({
      reason: `${runtime} 범위에서 ${genres.slice(0, 2).join("·")} 흐름을 담은 ${typeLabel}입니다.`,
      family: "runtime-genre",
    });
  } else if (runtime && typeLabel) {
    reasons.push({
      reason: `${runtime} 범위에 맞는 ${typeLabel}입니다.`,
      family: "runtime",
    });
  }
  if (genres.length >= 4 && typeLabel) {
    reasons.push({
      reason: `${genres.slice(0, 3).join("·")} 장르를 넘나드는 ${typeLabel}입니다.`,
      family: "genre-range",
    });
  }
  if (genres.length >= 2 && typeLabel) {
    reasons.push({
      reason: `${genres.slice(0, 2).join("·")} 장르가 함께 드러나는 ${typeLabel}입니다.`,
      family: "multi-genre",
    });
  }
  if (rating && (primaryGenre || typeLabel)) {
    const ratingSubject = primaryGenre && typeLabel && primaryGenre !== typeLabel
      ? `${primaryGenre} ${typeLabel}`
      : typeLabel || primaryGenre || "작품";
    reasons.push({
      reason: `평점 ${rating}의 ${ratingSubject}입니다.`,
      family: "rating",
    });
  }
  if (primaryGenre && typeLabel) {
    reasons.push({ reason: `${primaryGenre} 장르의 ${typeLabel}입니다.`, family: "genre" });
  }
  if (rating) reasons.push({ reason: `평점 ${rating}의 작품입니다.`, family: "rating" });
  if (typeLabel && !hasIntrinsicEvidence) {
    reasons.push({ reason: `${typeLabel} 형식으로 만나볼 수 있는 작품입니다.`, family: "type" });
  }
  return reasons.length
    ? reasons
    : [{ reason: "작품의 기본 정보를 바탕으로 살펴볼 만한 선택입니다.", family: "generic" }];
}

function neutralEvidenceReason(item = {}, preferences = {}, locale = DEFAULT_UI_LOCALE) {
  return neutralEvidenceReasons(item, preferences, locale)[0];
}

function neutralReasonCandidates(item = {}, preferences = {}, locale = DEFAULT_UI_LOCALE) {
  return neutralEvidenceReasons(item, preferences, locale)
    .map(({ reason }) => reason)
    .filter(Boolean);
}

export function buildFirstPickRecommendationReason(item = {}, locale = DEFAULT_UI_LOCALE) {
  const genres = presentationGenreLabels(item, locale);
  const primaryGenre = genres[0] || String(item.genre || "").split(",")[0].trim();
  const typeLabel = typeLabelForItem(item, locale);
  if (isEnglishLocale(locale)) {
    const type = sentenceCaseTypeLabel(typeLabel);
    const candidates = primaryGenre && typeLabel
      ? primaryGenre === typeLabel
        ? [
          `A ${type} worth checking out first.`,
          `A standout ${type} to start with.`,
          `A ${primaryGenre} pick worth a first look.`,
        ]
        : [
          `A ${primaryGenre} ${type} worth checking out first.`,
          `A ${type} with a strong ${primaryGenre} angle.`,
          `${primaryGenre} storytelling in a ${type} format.`,
        ]
      : primaryGenre
        ? [`A ${primaryGenre} title worth checking out first.`, `A ${primaryGenre} pick worth a closer look.`]
        : typeLabel
          ? [`A ${type} worth checking out first.`]
          : ["A title worth checking out first based on its available details."];
    return candidates[stableReasonIndex(item) % candidates.length];
  }
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

export function recommendationOptionButtonLabel(selectedCount = 0, locale = DEFAULT_UI_LOCALE) {
  const count = Number.isInteger(selectedCount) ? selectedCount : Number(selectedCount);
  if (isEnglishLocale(locale)) return count > 0 ? `${count} additional options selected` : "Choose more options";
  return count > 0 ? `추가 옵션 ${count}개 선택됨` : "더 많은 옵션 선택하기";
}

export function buildSelectedOptionReason(item = {}, filters = [], {
  sentence = false,
  locale = DEFAULT_UI_LOCALE,
} = {}) {
  const selected = selectedTaxonomyFilters(filters);
  if (!selected.length) return "";
  const explicitMatches = Array.isArray(item.matchedTaxonomyValues)
    ? item.matchedTaxonomyValues
    : candidateGenreMatchDetail(item, selected).matchedTaxonomyValues;
  const matched = selected.filter((value) => explicitMatches.includes(value));
  if (!matched.length) return "";

  let reason;
  if (matched.length === 1) {
    reason = (isEnglishLocale(locale) ? EN_REASON_BY_GENRE : KO_REASON_BY_GENRE)[matched[0]];
    if (!reason) {
      const label = taxonomyLabelForValue(matched[0], locale) || genreLabelForValue(matched[0]);
      reason = isEnglishLocale(locale) ? `A strong match for ${label}` : `${label} 조건과 잘 맞는 추천`;
    }
  } else {
    const labels = matched.slice(0, 2)
      .map((value) => taxonomyLabelForValue(value, locale) || genreLabelForValue(value))
      .filter(Boolean);
    if (isEnglishLocale(locale)) {
      reason = labels.length === 2
        ? `Recommended for its ${labels[0]} and ${labels[1]} elements`
        : `Recommended for its ${labels[0] || "selected genre"} elements`;
    } else {
      reason = labels.length === 2
        ? `${labels[0]}과 ${labels[1]} 요소를 함께 반영한 추천`
        : `${labels[0] || "선택한 장르"} 요소를 반영한 추천`;
    }
  }
  if (!sentence) return reason;
  return isEnglishLocale(locale) ? `${reason}.` : `${reason}입니다.`;
}

export function buildEvidenceGroundedDecisionReason(item = {}, {
  titles = [],
  confirmedSeeds = {},
  selectedFilters = [],
  selectedTypes = [],
  selectedOtt = [],
} = {}, locale = DEFAULT_UI_LOCALE) {
  if (item.firstPick) return buildFirstPickRecommendationReason(item, locale);

  const canonicalSeed = resolveCanonicalReasonSeed(item, confirmedSeeds);
  const genres = presentationGenreLabels(item, locale);
  const primaryGenre = genres[0] || String(item.genre || "").split(",")[0].trim();
  if (canonicalSeed && primaryGenre) {
    if (isEnglishLocale(locale)) return `Because you liked ${canonicalSeed}, try another ${primaryGenre} title`;
    return `${seedWithKoreanObjectParticle(canonicalSeed)} 좋아했다면 ${primaryGenre} 작품으로 이어가는 추천`;
  }
  if (canonicalSeed && isEnglishLocale(locale)) return `A follow-up pick because you liked ${canonicalSeed}`;
  if (canonicalSeed) return `${seedWithKoreanObjectParticle(canonicalSeed)} 좋아했다면 추천`;

  if (titles.length > 1 && isEnglishLocale(locale)) return "Recommended from the preferences you shared";
  if (titles.length && isEnglishLocale(locale)) return "Recommended from your entered preference";
  if (titles.length > 1) return "여러 취향을 함께 반영한 추천";
  if (titles.length) return "입력한 취향을 바탕으로 추천";

  const selectedReason = buildSelectedOptionReason(item, selectedFilters, { locale });
  if (selectedReason) return selectedReason;

  const neutralReason = neutralReasonCandidates(item, { titles, confirmedSeeds, selectedFilters }, locale)[0];
  if (neutralReason) return neutralReason;

  const itemReason = meaningfulItemReason(item, { titles, confirmedSeeds, selectedFilters }, locale);
  if (itemReason) return itemReason;

  const actualOtt = asStringArray(item.ott).map((value) => value.toLocaleLowerCase("ko-KR"));
  const selectedOttMatch = selectedOtt.some((value) => (
    actualOtt.some((actual) => actual.includes(String(value).split("-")[0].toLocaleLowerCase("ko-KR")))
  ));
  if (selectedOttMatch) return isEnglishLocale(locale)
    ? "A pick available on one of your selected streaming services"
    : "선택한 OTT에서 볼 수 있는 작품 중 고른 추천";

  return isEnglishLocale(locale) ? "A good pick to watch today" : "오늘 바로 고르기 좋은 추천";
}

function uniqueReasonCandidates(candidates = []) {
  return [...new Set(candidates.map((candidate) => String(candidate || "").trim()).filter(Boolean))];
}

function isGenericRecommendationReason(value = "") {
  const normalized = withoutTerminalPunctuation(value);
  return isGenericProviderReason(normalized)
    || isGenericStructuralReason(normalized)
    || normalized === "선택한 OTT에서 볼 수 있는 작품 중 고른 추천"
    || normalized === "작품의 기본 정보를 바탕으로 살펴볼 만한 선택입니다"
    || normalized === "오늘 바로 고르기 좋은 추천"
    || normalized === "A pick available on one of your selected streaming services"
    || normalized === "A title worth considering based on its available details"
    || normalized === "A good pick to watch today";
}

function recommendationReasonFamily(value = "") {
  const normalized = withoutTerminalPunctuation(value);
  if (isGenericRecommendationReason(normalized)) return "generic";
  if (/범위에서|범위에 맞는/u.test(normalized)) return "runtime";
  if (/장르를 넘나드는/u.test(normalized)) return "genre-range";
  if (/장르가 함께 드러나는/u.test(normalized)) return "multi-genre";
  if (/^평점 /u.test(normalized)) return "rating";
  if (/ 장르의 /u.test(normalized)) return "genre";
  if (/ 형식으로 /u.test(normalized)) return "type";
  if (/\brange\b/iu.test(normalized)) return "runtime";
  if (/\bspanning\b/iu.test(normalized)) return "genre-range";
  if (/\bblending\b/iu.test(normalized)) return "multi-genre";
  if (/\brated\b/iu.test(normalized)) return "rating";
  if (/^A .+ (?:movie|tv series|animation)$/iu.test(normalized)) return "genre";
  if (/worth considering/iu.test(normalized)) return "type";
  return "item-specific";
}

function buildEvidenceGroundedDecisionReasonCandidates(item = {}, {
  titles = [],
  confirmedSeeds = {},
  selectedFilters = [],
  selectedTypes = [],
  selectedOtt = [],
} = {}, locale = DEFAULT_UI_LOCALE) {
  const canonicalSeed = resolveCanonicalReasonSeed(item, confirmedSeeds);
  const genres = presentationGenreLabels(item, locale);
  const primaryGenre = genres[0] || String(item.genre || "").split(",")[0].trim();
  const selectedReason = buildSelectedOptionReason(item, selectedFilters, { locale });
  const actualOtt = asStringArray(item.ott).map((value) => value.toLocaleLowerCase("ko-KR"));
  const selectedOttMatch = selectedOtt.some((value) => (
    actualOtt.some((actual) => actual.includes(String(value).split("-")[0].toLocaleLowerCase("ko-KR")))
  ));
  const candidates = [];

  if (canonicalSeed && primaryGenre) {
    candidates.push(isEnglishLocale(locale)
      ? `Because you liked ${canonicalSeed}, try another ${primaryGenre} title`
      : `${seedWithKoreanObjectParticle(canonicalSeed)} 좋아했다면 ${primaryGenre} 작품으로 이어가는 추천`);
  }
  if (selectedReason) candidates.push(selectedReason);
  if (canonicalSeed && primaryGenre) {
    candidates.push(...(isEnglishLocale(locale)
      ? [`A ${primaryGenre} follow-up to ${canonicalSeed}`, `A ${primaryGenre} pick connected to ${canonicalSeed}`]
      : [`${canonicalSeed}에서 좋아한 ${primaryGenre} 결을 이어 살펴보는 추천`, `${canonicalSeed}와 맞닿은 ${primaryGenre} 장르에서 고른 추천`]));
  }
  if (canonicalSeed) {
    candidates.push(...(isEnglishLocale(locale)
      ? [`A follow-up pick because you liked ${canonicalSeed}`, `A recommendation based on what you liked in ${canonicalSeed}`]
      : [`${seedWithKoreanObjectParticle(canonicalSeed)} 좋아했다면 이어서 살펴볼 추천`, `${canonicalSeed}에서 이어지는 취향을 반영한 추천`]));
  }
  if (titles.length > 1) candidates.push(isEnglishLocale(locale) ? "Recommended from the preferences you shared" : "여러 취향을 함께 반영한 추천");
  else if (titles.length) candidates.push(isEnglishLocale(locale) ? "Recommended from your entered preference" : "입력한 취향을 바탕으로 추천");
  candidates.push(...neutralReasonCandidates(item, { titles, confirmedSeeds, selectedFilters }, locale));
  if (selectedOttMatch) candidates.push(isEnglishLocale(locale) ? "A pick available on one of your selected streaming services" : "선택한 OTT에서 볼 수 있는 작품 중 고른 추천");
  candidates.push(isEnglishLocale(locale) ? "A good pick to watch today" : "오늘 바로 고르기 좋은 추천");
  return uniqueReasonCandidates(candidates);
}

export function buildEvidenceGroundedDecisionReasons(items = [], preferences = {}, locale = DEFAULT_UI_LOCALE) {
  const usedReasons = new Set();
  const usedFamilies = new Map();
  let previousReason = "";

  return items.map((item) => {
    const candidates = buildEvidenceGroundedDecisionReasonCandidates(item, preferences, locale);
    const reason = candidates.find((candidate) => {
      if (isGenericRecommendationReason(candidate) || usedReasons.has(candidate)) return false;
      return (usedFamilies.get(recommendationReasonFamily(candidate)) || 0) < 2;
    })
      || candidates.find((candidate) => !isGenericRecommendationReason(candidate) && !usedReasons.has(candidate))
      || candidates.find((candidate) => !isGenericRecommendationReason(candidate))
      || candidates.find((candidate) => candidate !== previousReason && !usedReasons.has(candidate))
      || candidates.find((candidate) => candidate !== previousReason)
      || candidates[0]
      || (isEnglishLocale(locale) ? "A good pick to watch today" : "오늘 바로 고르기 좋은 추천");
    usedReasons.add(reason);
    const family = recommendationReasonFamily(reason);
    usedFamilies.set(family, (usedFamilies.get(family) || 0) + 1);
    previousReason = reason;
    return reason;
  });
}

export function buildEvidenceGroundedRecommendationReason(item = {}, preferences = {}, locale = DEFAULT_UI_LOCALE) {
  if (item.firstPick) return buildFirstPickRecommendationReason(item, locale);

  const decision = buildEvidenceGroundedDecisionReason(item, preferences, locale);
  const detail = meaningfulItemReason(item, preferences, locale);
  const sentences = [decision, detail]
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex((candidate) => (
      withoutTerminalPunctuation(candidate) === withoutTerminalPunctuation(value)
    )) === index)
    .map((value) => `${withoutTerminalPunctuation(value)}.`);
  return sentences.join(" ") || (isEnglishLocale(locale) ? "A good pick to watch today." : "오늘 바로 고르기 좋은 추천.");
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

export function presentationGenreLabels(item = {}, locale = DEFAULT_UI_LOCALE) {
  const labels = localizedGenreLabels(item);
  const displayGenre = typeof item.genre === "string" ? item.genre : "";
  displayGenre.split(",").forEach((value) => {
    const label = value.trim();
    if (label && !["장르 확인 필요", "정보 확인 필요"].includes(label) && !labels.includes(label)) {
      labels.push(label);
    }
  });
  return localizeGenreDisplayLabels(labels, locale);
}
