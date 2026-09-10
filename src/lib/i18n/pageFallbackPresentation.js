import { DEFAULT_UI_LOCALE, normalizeUiLocale } from "./localeContract.js";
import { taxonomyLabelForValue } from "./taxonomyPresentation.js";

const COPY = Object.freeze({
  "ko-KR": Object.freeze({
    unknownTitle: "제목 없음",
    genreUnavailable: "장르 확인 필요",
    infoUnavailable: "정보 없음",
    infoCheckRequired: "정보 확인 필요",
    runtimeMinutes: "{minutes}분",
    synopsisUnavailable: "줄거리 정보가 아직 없습니다.",
    firstPickSynopsisUnavailable: "줄거리 정보는 아직 확인되지 않았습니다.",
    resultReasonWithOptions: "{options} 옵션까지 함께 참고한 실제 검색 결과입니다.",
    resultReasonFromSeed: "입력한 작품과 연결해 확인해볼 만한 실제 검색 결과입니다.",
    firstPickReason: "실제 TMDB 작품 정보입니다.",
    heroPrimaryBadge: "오늘 바로 보기 좋은 작품",
    heroPrimaryReason: "고민 없이 시작하기 좋은 대표 추천",
    heroTrendingBadge: "요즘 많이 고르는 작품",
    heroTrendingReason: "지금 대화에 바로 끼기 좋아요",
    heroTimeBadge: "지금 시간에 어울리는 작품",
    timeMorningReason: "짧게 몰입하고 싶을 때 좋아요",
    timeAfternoonReason: "가볍게 시작하기 좋은 SF예요",
    timeEveningReason: "하루 끝에 여운을 남기기 좋아요",
    timeLateReason: "늦은 밤 몰입하기 좋은 스릴러예요",
  }),
  "en-US": Object.freeze({
    unknownTitle: "Title unavailable",
    genreUnavailable: "Genre unavailable",
    infoUnavailable: "Information unavailable",
    infoCheckRequired: "Information unavailable",
    runtimeMinutes: "{minutes} min",
    synopsisUnavailable: "A synopsis is not available yet.",
    firstPickSynopsisUnavailable: "A synopsis is not available yet.",
    resultReasonWithOptions: "An actual search result that also considers {options}.",
    resultReasonFromSeed: "An actual search result connected to the title you entered.",
    firstPickReason: "Actual title information from TMDB.",
    heroPrimaryBadge: "A good pick for today",
    heroPrimaryReason: "A reliable place to start",
    heroTrendingBadge: "Popular right now",
    heroTrendingReason: "A timely pick to join the conversation",
    heroTimeBadge: "A pick for this time of day",
    timeMorningReason: "A good choice for a short, focused watch",
    timeAfternoonReason: "An approachable sci-fi pick for the afternoon",
    timeEveningReason: "A reflective pick for the end of the day",
    timeLateReason: "An absorbing thriller for late at night",
  }),
});

const TIME_REASON_KEY = Object.freeze({
  morning: "timeMorningReason",
  afternoon: "timeAfternoonReason",
  evening: "timeEveningReason",
  late: "timeLateReason",
});

function resolvedLocale(locale) {
  return normalizeUiLocale(locale) || DEFAULT_UI_LOCALE;
}

function copy(locale, key, values = {}) {
  const normalizedLocale = resolvedLocale(locale);
  const message = COPY[normalizedLocale][key];
  if (!message) throw new Error(`MISSING_PAGE_PRESENTATION:${normalizedLocale}:${key}`);
  return message.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, name) => {
    if (!Object.hasOwn(values, name)) throw new Error(`MISSING_PAGE_PRESENTATION_VALUE:${key}:${name}`);
    return String(values[name]);
  });
}

export function pageResultFallbackPresentation({
  contentType = "movie",
  optionSummary = "",
  runtimeMinutes,
} = {}, locale = DEFAULT_UI_LOCALE) {
  const runtime = Number(runtimeMinutes);
  return Object.freeze({
    title: copy(locale, "unknownTitle"),
    genres: Object.freeze([copy(locale, "genreUnavailable")]),
    actors: Object.freeze([copy(locale, "infoUnavailable")]),
    label: taxonomyLabelForValue(contentType, locale),
    director: copy(locale, "infoUnavailable"),
    rating: copy(locale, "infoUnavailable"),
    runtime: Number.isFinite(runtime) && runtime > 0
      ? copy(locale, "runtimeMinutes", { minutes: runtime })
      : copy(locale, "infoCheckRequired"),
    reason: optionSummary
      ? copy(locale, "resultReasonWithOptions", { options: optionSummary })
      : copy(locale, "resultReasonFromSeed"),
    synopsis: copy(locale, "synopsisUnavailable"),
  });
}

export function firstPickFallbackPresentation({
  contentType = "movie",
  runtimeMinutes,
} = {}, locale = DEFAULT_UI_LOCALE) {
  const runtime = Number(runtimeMinutes);
  return Object.freeze({
    label: taxonomyLabelForValue(contentType, locale),
    director: copy(locale, "infoCheckRequired"),
    runtime: Number.isFinite(runtime) && runtime > 0
      ? copy(locale, "runtimeMinutes", { minutes: runtime })
      : "",
    reason: copy(locale, "firstPickReason"),
    synopsis: copy(locale, "firstPickSynopsisUnavailable"),
  });
}

export function timeSlotPresentation(timeSlot, locale = DEFAULT_UI_LOCALE) {
  const canonicalTimeSlot = Object.hasOwn(TIME_REASON_KEY, timeSlot) ? timeSlot : "evening";
  return Object.freeze({
    timeSlot: canonicalTimeSlot,
    reason: copy(locale, TIME_REASON_KEY[canonicalTimeSlot]),
  });
}

export function heroFallbackPresentation(kind, {
  timeSlot = "evening",
} = {}, locale = DEFAULT_UI_LOCALE) {
  if (kind === "primary") {
    return Object.freeze({ badge: copy(locale, "heroPrimaryBadge"), reason: copy(locale, "heroPrimaryReason") });
  }
  if (kind === "trending") {
    return Object.freeze({ badge: copy(locale, "heroTrendingBadge"), reason: copy(locale, "heroTrendingReason") });
  }
  if (kind === "time") {
    return Object.freeze({ badge: copy(locale, "heroTimeBadge"), reason: timeSlotPresentation(timeSlot, locale).reason });
  }
  throw new Error(`UNKNOWN_HERO_FALLBACK_KIND:${kind}`);
}

export const PAGE_FALLBACK_PRESENTATION_COPY = COPY;
