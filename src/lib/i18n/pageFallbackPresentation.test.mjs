import assert from "node:assert/strict";
import test from "node:test";

import {
  PAGE_FALLBACK_PRESENTATION_COPY,
  firstPickFallbackPresentation,
  heroFallbackPresentation,
  pageResultFallbackPresentation,
  timeSlotPresentation,
} from "./pageFallbackPresentation.js";

test("Korean and English page presentation copy have identical key sets", () => {
  assert.deepEqual(
    Object.keys(PAGE_FALLBACK_PRESENTATION_COPY["en-US"]).sort(),
    Object.keys(PAGE_FALLBACK_PRESENTATION_COPY["ko-KR"]).sort(),
  );
});

test("regular result fallbacks preserve the current Korean presentation", () => {
  assert.deepEqual(pageResultFallbackPresentation({
    contentType: "movie",
    optionSummary: "SF, 일본",
    runtimeMinutes: 121,
  }), {
    title: "제목 없음",
    genres: ["장르 확인 필요"],
    actors: ["정보 없음"],
    label: "영화",
    director: "정보 없음",
    rating: "정보 없음",
    runtime: "121분",
    reason: "SF, 일본 옵션까지 함께 참고한 실제 검색 결과입니다.",
    synopsis: "줄거리 정보가 아직 없습니다.",
  });
});

test("regular result fallbacks provide natural English without changing inputs", () => {
  const input = { contentType: "drama", optionSummary: "Sci-Fi, Japan", runtimeMinutes: 48 };
  const before = structuredClone(input);
  const output = pageResultFallbackPresentation(input, "en-US");

  assert.deepEqual(output, {
    title: "Title unavailable",
    genres: ["Genre unavailable"],
    actors: ["Information unavailable"],
    label: "TV Series",
    director: "Information unavailable",
    rating: "Information unavailable",
    runtime: "48 min",
    reason: "An actual search result that also considers Sci-Fi, Japan.",
    synopsis: "A synopsis is not available yet.",
  });
  assert.deepEqual(input, before);
});

test("first-pick fallbacks localize Product copy while preserving canonical values outside the helper", () => {
  assert.deepEqual(firstPickFallbackPresentation({ contentType: "animation", runtimeMinutes: 24 }), {
    label: "애니",
    director: "정보 확인 필요",
    runtime: "24분",
    reason: "실제 TMDB 작품 정보입니다.",
    synopsis: "줄거리 정보는 아직 확인되지 않았습니다.",
  });
  assert.deepEqual(firstPickFallbackPresentation({ contentType: "animation", runtimeMinutes: 24 }, "en-US"), {
    label: "Animation",
    director: "Information unavailable",
    runtime: "24 min",
    reason: "Actual title information from TMDB.",
    synopsis: "A synopsis is not available yet.",
  });
});

test("time-slot presentation keeps canonical slot identity and boundaries outside localization", () => {
  const expected = {
    morning: ["짧게 몰입하고 싶을 때 좋아요", "A good choice for a short, focused watch"],
    afternoon: ["가볍게 시작하기 좋은 SF예요", "An approachable sci-fi pick for the afternoon"],
    evening: ["하루 끝에 여운을 남기기 좋아요", "A reflective pick for the end of the day"],
    late: ["늦은 밤 몰입하기 좋은 스릴러예요", "An absorbing thriller for late at night"],
  };

  for (const [timeSlot, [korean, english]] of Object.entries(expected)) {
    assert.deepEqual(timeSlotPresentation(timeSlot), { timeSlot, reason: korean });
    assert.deepEqual(timeSlotPresentation(timeSlot, "en-US"), { timeSlot, reason: english });
  }
});

test("unknown time slots retain the existing evening fallback semantics", () => {
  assert.equal(timeSlotPresentation("unknown").timeSlot, "evening");
  assert.equal(timeSlotPresentation("unknown", "en-US").reason, "A reflective pick for the end of the day");
});

test("hero fallback copy is localized without carrying content identity", () => {
  assert.deepEqual(heroFallbackPresentation("primary"), {
    badge: "오늘 바로 보기 좋은 작품",
    reason: "고민 없이 시작하기 좋은 대표 추천",
  });
  assert.deepEqual(heroFallbackPresentation("trending", {}, "en-US"), {
    badge: "Popular right now",
    reason: "A timely pick to join the conversation",
  });
  assert.deepEqual(heroFallbackPresentation("time", { timeSlot: "late" }, "en-US"), {
    badge: "A pick for this time of day",
    reason: "An absorbing thriller for late at night",
  });
});

test("English Product-owned presentation contains no Korean while provider data remains outside the module", () => {
  const english = [
    ...Object.values(PAGE_FALLBACK_PRESENTATION_COPY["en-US"]),
    ...Object.values(pageResultFallbackPresentation({}, "en-US")).flat(),
  ].join(" ");
  assert.doesNotMatch(english, /[가-힣]/u);
  assert.equal("title" in PAGE_FALLBACK_PRESENTATION_COPY["en-US"], false);
  assert.equal("cast" in PAGE_FALLBACK_PRESENTATION_COPY["en-US"], false);
  assert.equal("providerOverview" in PAGE_FALLBACK_PRESENTATION_COPY["en-US"], false);
});

test("page presentation has no provider, filter, ranking, or jurisdiction decision output", () => {
  const output = pageResultFallbackPresentation({ contentType: "movie" }, "en-US");
  for (const key of [
    "providerId", "providerContentId", "providerMediaType", "dataSource", "fallback",
    "eligible", "score", "filters", "contentProviderRegion", "legalJurisdiction",
  ]) {
    assert.equal(key in output, false, key);
  }
});
