"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const dummyRecommendations = [
  {
    title: "인터스텔라",
    type: "movie",
    label: "영화",
    tags: ["genre-sf", "country-us", "mood-moving", "runtime-long"],
    genre: "SF, 드라마",
    director: "크리스토퍼 놀란",
    actors: ["매튜 매커너히", "앤 해서웨이"],
    synopsis: "멸망 위기의 지구를 떠나 인류가 살 수 있는 새 행성을 찾기 위해 우주로 향한다.",
    match: 96,
    runtime: "169분",
    rating: "8.7",
    ott: ["Netflix", "Watcha"],
    poster: "INTER\nSTELLAR",
    reason: "광대한 SF 설정과 가족의 감정선을 함께 따라가는 추천입니다.",
  },
  {
    title: "듄",
    type: "movie",
    label: "영화",
    tags: ["genre-sf", "country-us", "mood-tense", "runtime-long"],
    genre: "SF, 어드벤처",
    director: "드니 빌뇌브",
    actors: ["티모시 샬라메", "레베카 퍼거슨"],
    synopsis: "사막 행성 아라키스를 둘러싼 권력 다툼 속에서 한 소년이 거대한 운명을 마주한다.",
    match: 92,
    runtime: "155분",
    rating: "8.0",
    ott: ["Netflix", "Watcha"],
    poster: "DUNE",
    reason: "장대한 세계관과 묵직한 긴장감을 원하는 흐름에 잘 맞습니다.",
  },
  {
    title: "마션",
    type: "movie",
    label: "영화",
    tags: ["genre-sf", "country-us", "mood-light", "runtime-long"],
    genre: "SF, 생존",
    director: "리들리 스콧",
    actors: ["맷 데이먼", "제시카 차스테인"],
    synopsis: "화성에 홀로 남겨진 우주비행사가 과학과 유머로 생존 방법을 찾아간다.",
    match: 89,
    runtime: "144분",
    rating: "8.0",
    ott: ["Disney+"],
    poster: "THE\nMARTIAN",
    reason: "SF 설정 안에서도 밝은 에너지와 생존 서사를 함께 즐길 수 있습니다.",
  },
  {
    title: "라라랜드",
    type: "movie",
    label: "영화",
    tags: ["genre-romance", "country-us", "mood-moving", "runtime-medium"],
    genre: "로맨스, 뮤지컬",
    director: "데이미언 셔젤",
    actors: ["라이언 고슬링", "엠마 스톤"],
    synopsis: "꿈을 좇는 두 사람이 사랑에 빠지고, 각자의 미래 앞에서 서로의 의미를 되새긴다.",
    match: 94,
    runtime: "128분",
    rating: "8.0",
    ott: ["Watcha", "TVING"],
    poster: "LA LA\nLAND",
    reason: "사랑과 꿈, 음악의 여운을 함께 느끼고 싶을 때 어울립니다.",
  },
  {
    title: "노트북",
    type: "movie",
    label: "영화",
    tags: ["genre-romance", "country-us", "mood-moving", "runtime-medium"],
    genre: "로맨스, 드라마",
    director: "닉 카사베츠",
    actors: ["라이언 고슬링", "레이첼 맥아담스"],
    synopsis: "계급과 시간이 갈라놓은 두 사람이 평생에 걸쳐 사랑의 기억을 붙잡는다.",
    match: 90,
    runtime: "123분",
    rating: "7.8",
    ott: ["검색 필요"],
    poster: "THE\nNOTEBOOK",
    reason: "강한 감정선과 오래 남는 사랑 이야기를 찾는 선택에 맞습니다.",
  },
  {
    title: "센과 치히로의 행방불명",
    type: "animation",
    label: "애니",
    tags: ["country-jp", "mood-moving", "runtime-medium"],
    genre: "애니메이션, 판타지",
    director: "미야자키 하야오",
    actors: ["히이라기 루미", "이리노 미유"],
    synopsis: "낯선 세계에 들어간 소녀가 부모를 구하고 자신의 이름과 용기를 찾아간다.",
    match: 87,
    runtime: "125분",
    rating: "8.6",
    ott: ["Netflix"],
    poster: "SPIRITED\nAWAY",
    reason: "환상적인 세계관과 따뜻한 여운을 원하는 사용자에게 어울립니다.",
  },
  {
    title: "너의 이름은",
    type: "animation",
    label: "애니",
    tags: ["genre-romance", "country-jp", "mood-moving", "runtime-medium"],
    genre: "애니메이션, 로맨스",
    director: "신카이 마코토",
    actors: ["카미키 류노스케", "카미시라이시 모네"],
    synopsis: "서로의 몸이 바뀌는 두 소년소녀가 시간과 거리를 넘어 서로를 찾아간다.",
    match: 88,
    runtime: "106분",
    rating: "8.4",
    ott: ["Netflix"],
    poster: "YOUR\nNAME",
    reason: "설렘과 판타지, 애틋한 감정선을 함께 원하는 취향에 어울립니다.",
  },
  {
    title: "세븐",
    type: "movie",
    label: "영화",
    tags: ["genre-thriller", "country-us", "mood-tense", "runtime-medium"],
    genre: "스릴러, 범죄",
    director: "데이비드 핀처",
    actors: ["브래드 피트", "모건 프리먼"],
    synopsis: "두 형사가 일곱 가지 죄악을 따라 벌어지는 연쇄 살인 사건을 추적한다.",
    match: 94,
    runtime: "127분",
    rating: "8.6",
    ott: ["검색 필요"],
    poster: "SE7EN",
    reason: "어둡고 집요한 수사극과 강한 결말의 긴장감을 원하는 선택에 맞습니다.",
  },
  {
    title: "프리즈너스",
    type: "movie",
    label: "영화",
    tags: ["genre-thriller", "country-us", "mood-tense", "runtime-long"],
    genre: "스릴러, 미스터리",
    director: "드니 빌뇌브",
    actors: ["휴 잭맨", "제이크 질렌할"],
    synopsis: "실종된 아이를 찾기 위해 한 아버지와 형사가 각자의 방식으로 진실을 추적한다.",
    match: 91,
    runtime: "153분",
    rating: "8.2",
    ott: ["검색 필요"],
    poster: "PRISONERS",
    reason: "무거운 분위기와 끝까지 조여 오는 미스터리를 선호할 때 잘 맞습니다.",
  },
  {
    title: "조디악",
    type: "movie",
    label: "영화",
    tags: ["genre-thriller", "country-us", "mood-tense", "runtime-long"],
    genre: "스릴러, 범죄",
    director: "데이비드 핀처",
    actors: ["제이크 질렌할", "마크 러팔로"],
    synopsis: "미해결 연쇄 살인 사건에 매달린 기자와 수사관들이 집착에 가까운 추적을 이어간다.",
    match: 88,
    runtime: "157분",
    rating: "7.7",
    ott: ["검색 필요"],
    poster: "ZODIAC",
    reason: "실화 기반의 서늘한 추적극과 차분한 긴장감을 좋아한다면 어울립니다.",
  },
  {
    title: "더 베어",
    type: "drama",
    label: "드라마",
    tags: ["country-us", "mood-tense", "runtime-short"],
    genre: "드라마, 코미디",
    director: "크리스토퍼 스토러",
    actors: ["제러미 앨런 화이트", "아요 에데비리"],
    synopsis: "젊은 셰프가 가족이 남긴 가게를 맡아 혼란과 재건을 겪는다.",
    match: 84,
    runtime: "30분 내외",
    rating: "8.6",
    ott: ["Disney+"],
    poster: "THE\nBEAR",
    reason: "인물의 성장과 압박감 있는 리듬을 좋아하는 사용자에게 어울립니다.",
  },
  {
    title: "오징어 게임",
    type: "drama",
    label: "드라마",
    tags: ["country-kr", "mood-tense", "runtime-medium"],
    genre: "스릴러, 드라마",
    director: "황동혁",
    actors: ["이정재", "정호연"],
    synopsis: "벼랑 끝에 몰린 사람들이 거액의 상금을 두고 잔혹한 게임에 참가한다.",
    match: 86,
    runtime: "60분 내외",
    rating: "8.0",
    ott: ["Netflix"],
    poster: "SQUID\nGAME",
    reason: "강한 몰입감과 생존 게임 구도를 선호할 때 잘 맞는 더미 결과입니다.",
  },
];

const ottOptions = [
  ["netflix", "Netflix"],
  ["disney", "Disney+"],
  ["watcha", "Watcha"],
  ["tving", "TVING"],
];
const ottLabelByValue = new Map(ottOptions);

const contentTypeOptions = [
  ["movie", "영화"],
  ["drama", "드라마"],
  ["animation", "애니"],
];

const expandedCountryOptions = [
  ["country-kr", "한국"],
  ["country-us", "미국"],
  ["country-jp", "일본"],
  ["country-gb", "영국"],
  ["country-fr", "프랑스"],
  ["country-de", "독일"],
  ["country-cn", "중국"],
  ["country-hk", "홍콩"],
  ["country-tw", "대만"],
  ["country-in", "인도"],
  ["country-ca", "캐나다"],
  ["country-au", "호주"],
  ["country-es", "스페인"],
  ["country-it", "이탈리아"],
  ["country-th", "태국"],
  ["country-br", "브라질"],
  ["country-mx", "멕시코"],
];

const quickPickGroups = [
  {
    title: "장르",
    options: [
      ["genre-sf", "SF"],
      ["genre-romance", "로맨스"],
      ["genre-thriller", "스릴러"],
    ],
  },
  {
    title: "국가",
    options: expandedCountryOptions,
  },
  {
    title: "분위기",
    options: [
      ["mood-light", "가볍게"],
      ["mood-moving", "여운 있게"],
      ["mood-tense", "긴장감"],
    ],
  },
  {
    title: "러닝타임",
    options: [
      ["runtime-short", "60분 이하"],
      ["runtime-medium", "2시간 이하"],
      ["runtime-long", "긴 작품"],
    ],
  },
];

const quickPickLabelByValue = new Map(quickPickGroups.flatMap((group) => group.options));
const initialOptionMetadata = {
  genres: [],
  countries: expandedCountryOptions,
  languages: [
    ["language-ko", "한국어"],
    ["language-en", "영어"],
    ["language-ja", "일본어"],
  ],
};
const targetProviderResultCount = 12;
const relatedPickCount = 12;
const collapsedOptionCount = 8;
const autocompleteDebounceMs = 150;
const quickPickGenreIds = new Map([
  ["genre-sf", [878, 10765]],
  ["genre-romance", [10749]],
  ["genre-thriller", [53]],
]);
const recommendationInsightText = {
  multipleSeed: "여러 입력 작품에서 함께 추천되었습니다.",
  genreMatch: "입력한 작품들과 공통 장르가 많습니다.",
  optionMatch: "선택한 추천 옵션과 잘 맞습니다.",
  contentType: "선택한 콘텐츠 종류와 맞습니다.",
  ottMatch: "선택한 OTT 정보와 연결됩니다.",
  metadataTieBreak: "평점과 인기도를 보조 기준으로 참고했습니다.",
};

const initialOtt = ["netflix"];
const initialTypes = ["movie", "drama", "animation"];
const initialTitles = ["", "", ""];
const titlePlaceholders = ["예: 인터스텔라", "예: 오징어 게임", "예: 너의 이름은"];
const showDevProviderStatus = process.env.NODE_ENV !== "production";
const initialProviderStatus = {
  providerId: "checking",
  providerName: "Checking",
  fallback: false,
  tmdbEnabled: false,
  message: "",
  checked: false,
};

const timeSlotContent = {
  morning: {
    title: "더 베어",
    reason: "짧게 몰입하고 싶을 때 좋아요",
  },
  afternoon: {
    title: "마션",
    reason: "가볍게 시작하기 좋은 SF예요",
  },
  evening: {
    title: "라라랜드",
    reason: "하루 끝에 여운을 남기기 좋아요",
  },
  late: {
    title: "세븐",
    reason: "늦은 밤 몰입하기 좋은 스릴러예요",
  },
};

function thumbnailText(title) {
  return title.slice(0, 2);
}

function normalizeTitleKey(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function cleanSeedTitleForDisplay(value = "") {
  return String(value)
    .trim()
    .replace(/[\s.。．,，、!！?？:：;；"'“”‘’()[\]{}<>《》]+$/gu, "")
    .trim();
}

function hasKoreanFinalConsonant(value = "") {
  const title = cleanSeedTitleForDisplay(value);
  const lastCharacter = [...title].at(-1);
  if (!lastCharacter) return false;

  const code = lastCharacter.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function seedWithKoreanObjectParticle(seedTitle = "") {
  const title = cleanSeedTitleForDisplay(seedTitle);
  if (!title) return "";
  return `${title}${hasKoreanFinalConsonant(title) ? "을" : "를"}`;
}

function titleMatchesSeed(item, seedTitle) {
  const seedKey = normalizeTitleKey(seedTitle);
  if (!seedKey) return false;

  return [item.title, item.originalTitle, item.name, item.originalName].some((title) => normalizeTitleKey(title) === seedKey);
}

function filterSeedResults(results, seedTitles) {
  return results.filter((item) => !seedTitles.some((seedTitle) => titleMatchesSeed(item, seedTitle)));
}

function isImageUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function PosterVisual({ poster, title }) {
  if (isImageUrl(poster)) {
    return <img className="poster-image" src={poster} alt="" loading="lazy" />;
  }

  return poster || thumbnailText(title);
}

function recommendationReason(item, titles) {
  if (item.reasonSeed) return `${seedWithKoreanObjectParticle(item.reasonSeed)} 좋아해서 추천합니다. ${item.reason}`;
  if (titles.length > 1) return `여러 취향을 함께 반영한 추천입니다. ${item.reason}`;
  if (titles.length) return `입력한 취향을 바탕으로 추천합니다. ${item.reason}`;
  return item.reason;
}

function decisionReason(item, titles) {
  if (item.reasonSeed) return `${seedWithKoreanObjectParticle(item.reasonSeed)} 좋아했다면 추천`;
  if (titles.length > 1) return "여러 취향을 함께 반영한 추천";
  if (titles.length) return "입력한 취향을 바탕으로 추천";
  if (item.tags.includes("genre-sf")) return "몰입감 있는 SF를 좋아한다면 추천";
  if (item.tags.includes("genre-romance")) return "감정선이 선명한 이야기를 좋아한다면 추천";
  if (item.tags.includes("genre-thriller")) return "긴장감 있는 이야기를 좋아한다면 추천";
  if (item.tags.includes("mood-moving")) return "여운이 남는 작품을 찾는다면 추천";
  return "오늘 바로 고르기 좋은 추천";
}

function trustSignals(item, titles) {
  return [
    {
      label: "취향 연결",
      value: titles.length ? "입력 작품 기준" : "선택 옵션 기준",
    },
    {
      label: "대표 장르",
      value: item.genre.split(",")[0].trim(),
    },
    {
      label: "콘텐츠 타입",
      value: item.label,
    },
    {
      label: "감상 단서",
      value: item.runtime || "상세에서 확인",
    },
  ];
}

function findRecommendation(title) {
  return dummyRecommendations.find((item) => item.title === title);
}

function getTimeSlot(date) {
  const hour = date.getHours();
  if (hour < 11) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 23) return "evening";
  return "late";
}

function buildHeroRecommendations(timeSlot) {
  const timePick = timeSlotContent[timeSlot] || timeSlotContent.evening;

  return [
    {
      badge: "오늘 바로 보기 좋은 작품",
      item: findRecommendation("인터스텔라"),
      reason: "고민 없이 시작하기 좋은 대표 추천",
    },
    {
      badge: "요즘 많이 고르는 작품",
      item: findRecommendation("오징어 게임"),
      reason: "지금 대화에 바로 끼기 좋아요",
    },
    {
      badge: "지금 시간에 어울리는 작품",
      item: findRecommendation(timePick.title),
      reason: timePick.reason,
    },
  ].filter(({ item }) => Boolean(item));
}

function scoreRecommendation(item, quickPicks, selectedOtt) {
  const quickPickScore = quickPicks.reduce((score, quickPick) => (item.tags.includes(quickPick) ? score + 1 : score), 0);
  const ottScore = platformMatchesSelectedOtt(item, selectedOtt) ? 1 : 0;
  return quickPickScore + ottScore;
}

function buildRecommendations(selectedTypes, quickPicks, selectedOtt = []) {
  const typeMatched = dummyRecommendations.filter((item) => selectedTypes.includes(item.type));

  if (!quickPicks.length && !selectedOtt.length) {
    return typeMatched.slice(0, targetProviderResultCount);
  }

  const scored = typeMatched
    .map((item) => ({ item, score: scoreRecommendation(item, quickPicks, selectedOtt) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.match - a.item.match)
    .map(({ item }) => item);

  return scored.length ? scored.slice(0, targetProviderResultCount) : typeMatched.slice(0, targetProviderResultCount);
}

function tagsFromProviderContent(content) {
  const tags = new Set(Array.isArray(content.tags) ? content.tags : []);
  const genres = Array.isArray(content.genres) ? content.genres : [];
  const genreIds = normalizedIdList(content.genreIds);
  const moods = Array.isArray(content.moods) ? content.moods : content.mood || [];
  const country = content.country || "";
  const runtime = Number(content.runtime);

  genres.forEach((genre) => {
    if (genre.includes("SF")) tags.add("genre-sf");
    if (genre.includes("로맨스")) tags.add("genre-romance");
    if (genre.includes("스릴러") || genre.includes("범죄")) tags.add("genre-thriller");
  });

  if (intersects(genreIds, quickPickGenreIds.get("genre-sf"))) tags.add("genre-sf");
  if (intersects(genreIds, quickPickGenreIds.get("genre-romance"))) tags.add("genre-romance");
  if (intersects(genreIds, quickPickGenreIds.get("genre-thriller"))) tags.add("genre-thriller");

  moods.forEach((mood) => tags.add(`mood-${mood}`));

  if (country === "한국") tags.add("country-kr");
  if (country === "일본") tags.add("country-jp");
  if (country === "미국") tags.add("country-us");
  if (country === "영국") tags.add("country-gb");
  if (country === "프랑스") tags.add("country-fr");
  if (country === "독일") tags.add("country-de");
  if (country === "중국") tags.add("country-cn");
  if (country === "홍콩") tags.add("country-hk");
  if (country === "대만") tags.add("country-tw");
  if (country === "인도") tags.add("country-in");
  if (country === "캐나다") tags.add("country-ca");
  if (country === "호주") tags.add("country-au");
  if (country === "스페인") tags.add("country-es");
  if (country === "이탈리아") tags.add("country-it");
  if (country === "태국") tags.add("country-th");
  if (country === "브라질") tags.add("country-br");
  if (country === "멕시코") tags.add("country-mx");

  if (runtime > 140) tags.add("runtime-long");
  else if (runtime > 0 && runtime <= 70) tags.add("runtime-short");
  else if (runtime > 0) tags.add("runtime-medium");

  return [...tags];
}

function contentTypeForUi(content) {
  if (["drama", "series", "tv"].includes(content.type) || ["drama", "series", "tv"].includes(content.contentType)) return "drama";
  return content.type || content.contentType || "movie";
}

function quickPickSummary(quickPicks, labelByValue = quickPickLabelByValue) {
  return quickPicks.map((quickPick) => labelByValue.get(quickPick)).filter(Boolean).slice(0, 2).join(", ");
}

function normalizeOptionSearch(value = "") {
  return String(value).trim().toLowerCase();
}

function filterOptionGroups(groups, query) {
  const normalizedQuery = normalizeOptionSearch(query);
  if (!normalizedQuery) return groups;

  return groups
    .map((group) => ({
      ...group,
      options: group.options.filter(([, label]) => normalizeOptionSearch(label).includes(normalizedQuery)),
    }))
    .filter((group) => group.options.length);
}

function visibleOptionGroups(groups, query, expandedGroups) {
  if (normalizeOptionSearch(query)) return groups;

  return groups.map((group) => {
    if (expandedGroups[group.title] || group.options.length <= collapsedOptionCount) return group;
    return {
      ...group,
      options: group.options.slice(0, collapsedOptionCount),
      totalOptions: group.options.length,
    };
  });
}

function normalizedIdList(values = []) {
  return (Array.isArray(values) ? values : []).map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function intersects(left = [], right = []) {
  if (!left.length || !right?.length) return false;
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function intersectionCount(left = [], right = []) {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value)).length;
}

function uniqueNumbers(values = []) {
  return [...new Set(values.map((value) => Number(value)).filter((value) => Number.isFinite(value)))];
}

function contentKey(item) {
  return `${item.providerId || item.source || "provider"}-${item.providerContentId || item.tmdbId || normalizeTitleKey(item.title)}`;
}

function mergeProviderResults(results) {
  const merged = new Map();

  for (const item of results) {
    const key = contentKey(item);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...item,
        reasonSeeds: item.reasonSeed ? [cleanSeedTitleForDisplay(item.reasonSeed)] : [],
        seedCount: 1,
        seedGenreIds: uniqueNumbers(item.seedGenreIds),
      });
      continue;
    }

    const reasonSeeds = [...new Set([...existing.reasonSeeds, cleanSeedTitleForDisplay(item.reasonSeed)].filter(Boolean))];
    merged.set(key, {
      ...existing,
      reasonSeed: reasonSeeds.length === 1 ? reasonSeeds[0] : "",
      reasonSeeds,
      seedCount: existing.seedCount + 1,
      seedGenreIds: uniqueNumbers([...existing.seedGenreIds, ...normalizedIdList(item.seedGenreIds)]),
      tags: [...new Set([...existing.tags, ...item.tags])],
      match: Math.max(Number(existing.match || 0), Number(item.match || 0)),
      popularity: Math.max(Number(existing.popularity || 0), Number(item.popularity || 0)),
    });
  }

  return [...merged.values()];
}

function insightMessages(signals) {
  const messages = [];
  if (signals.multipleSeed) messages.push(recommendationInsightText.multipleSeed);
  if (signals.genreMatch) messages.push(recommendationInsightText.genreMatch);
  if (signals.optionMatch) messages.push(recommendationInsightText.optionMatch);
  if (signals.contentType) messages.push(recommendationInsightText.contentType);
  if (signals.ottMatch) messages.push(recommendationInsightText.ottMatch);
  if (!messages.length && signals.metadataTieBreak) messages.push(recommendationInsightText.metadataTieBreak);
  return messages.slice(0, 3);
}

function selectedOttLabels(selectedOtt) {
  return selectedOtt.map((value) => ottLabelByValue.get(value)).filter(Boolean);
}

function platformMatchesSelectedOtt(item, selectedOtt) {
  const platforms = Array.isArray(item.ott) ? item.ott : [];
  const selectedLabels = selectedOttLabels(selectedOtt);
  return selectedLabels.some((label) => platforms.some((platform) => normalizeTitleKey(platform) === normalizeTitleKey(label)));
}

function genreIdsForQuickPick(quickPick, optionMetadata) {
  if (quickPickGenreIds.has(quickPick)) return quickPickGenreIds.get(quickPick);
  const metadataGenre = (optionMetadata.genres || []).find((genre) => genre.value === quickPick);
  if (metadataGenre?.tmdbIds?.length) return normalizedIdList(metadataGenre.tmdbIds);
  if (quickPick.startsWith("tmdb-genre-")) return normalizedIdList([quickPick.replace("tmdb-genre-", "")]);
  return [];
}

function analyzeProviderResult(item, selectedTypes, quickPicks, selectedOtt, optionMetadata) {
  const genreIds = normalizedIdList(item.genreIds);
  const seedGenreOverlap = intersectionCount(genreIds, normalizedIdList(item.seedGenreIds));
  const quickPickGenreOverlap = quickPicks.reduce(
    (score, quickPick) => score + (intersects(genreIds, genreIdsForQuickPick(quickPick, optionMetadata)) ? 1 : 0),
    0,
  );
  const quickPickTagMatches = quickPicks.reduce((score, quickPick) => score + (item.tags.includes(quickPick) ? 1 : 0), 0);
  const typeMatch = isSelectedContentType(item, selectedTypes) ? 1 : 0;
  const ottMatch = platformMatchesSelectedOtt(item, selectedOtt) ? 1 : 0;
  const rating = Number.parseFloat(item.rating);
  const signals = {
    multipleSeed: item.seedCount > 1,
    genreMatch: seedGenreOverlap > 0,
    optionMatch: quickPickGenreOverlap + quickPickTagMatches > 0,
    contentType: typeMatch > 0,
    ottMatch: ottMatch > 0,
    metadataTieBreak: Number(item.popularity || 0) > 0 || Number.isFinite(rating),
  };

  return {
    score: item.seedCount * 3 + seedGenreOverlap * 2 + quickPickGenreOverlap * 2 + quickPickTagMatches * 2 + typeMatch * 2 + ottMatch,
    insight: insightMessages(signals),
  };
}

function sortProviderResults(results, selectedTypes, quickPicks, selectedOtt, optionMetadata) {
  return results
    .map((item) => {
      const analysis = analyzeProviderResult(item, selectedTypes, quickPicks, selectedOtt, optionMetadata);
      return {
        ...item,
        score: analysis.score,
        recommendationInsight: analysis.insight,
      };
    })
    .sort((a, b) => {
      const popularityA = Number(a.popularity || 0);
      const popularityB = Number(b.popularity || 0);
      const ratingA = Number.parseFloat(a.rating);
      const ratingB = Number.parseFloat(b.rating);

      return (
        b.score - a.score ||
        popularityB - popularityA ||
        (Number.isFinite(ratingB) ? ratingB : 0) - (Number.isFinite(ratingA) ? ratingA : 0) ||
        Number(b.match || 0) - Number(a.match || 0)
      );
    });
}

function balanceSeedDiversity(sortedResults, seedTitles) {
  if (seedTitles.length <= 1) return sortedResults;

  const seedOrder = seedTitles.map(cleanSeedTitleForDisplay).filter(Boolean);
  const commonResults = sortedResults.filter((item) => item.seedCount > 1);
  const singleSeedGroups = new Map(seedOrder.map((seed) => [seed, []]));
  const ungrouped = [];

  for (const item of sortedResults) {
    if (item.seedCount > 1) continue;
    const seed = cleanSeedTitleForDisplay(item.reasonSeed || item.reasonSeeds?.[0]);
    if (singleSeedGroups.has(seed)) {
      singleSeedGroups.get(seed).push(item);
    } else {
      ungrouped.push(item);
    }
  }

  const balanced = [...commonResults];
  let cursor = 0;

  while (balanced.length < targetProviderResultCount) {
    let added = false;

    for (const seed of seedOrder) {
      const group = singleSeedGroups.get(seed) || [];
      const item = group[cursor];
      if (!item) continue;
      balanced.push(item);
      added = true;
      if (balanced.length >= targetProviderResultCount) break;
    }

    if (!added) break;
    cursor += 1;
  }

  for (const item of ungrouped) {
    if (balanced.length >= targetProviderResultCount) break;
    balanced.push(item);
  }

  return balanced;
}

function normalizeProviderResult(content, quickPicks = [], reasonSeed = "", labelByValue = quickPickLabelByValue) {
  const title = content.title || "제목 없음";
  const type = contentTypeForUi(content);
  const genres = Array.isArray(content.genres) && content.genres.length ? content.genres : ["장르 확인 필요"];
  const ott = Array.isArray(content.ott) && content.ott.length ? content.ott : content.platforms || ["검색 필요"];
  const actors = Array.isArray(content.actors) && content.actors.length ? content.actors : ["정보 없음"];
  const runtime = Number(content.runtime);
  const rating = Number(content.rating);
  const poster = content.backdrop || content.poster || thumbnailText(title);
  const optionSummary = quickPickSummary(quickPicks, labelByValue);

  return {
    ...content,
    title,
    reasonSeed: cleanSeedTitleForDisplay(content.seedTitle || reasonSeed),
    type,
    genreIds: normalizedIdList(content.genreIds),
    seedGenreIds: normalizedIdList(content.seedGenreIds),
    popularity: Number(content.popularity || 0),
    label: content.label || (type === "animation" ? "애니" : type === "movie" ? "영화" : "드라마"),
    tags: tagsFromProviderContent(content),
    genre: content.genre || genres.join(", "),
    director: content.director || "정보 없음",
    actors,
    rating: Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "정보 없음",
    runtime: Number.isFinite(runtime) && runtime > 0 ? `${runtime}분` : "상세 확인",
    ott,
    reason: content.reason || (optionSummary ? `${optionSummary} 옵션까지 함께 참고한 실제 검색 결과입니다.` : "입력한 작품과 연결해 확인해볼 만한 실제 검색 결과입니다."),
    synopsis: content.synopsis || content.overview || "줄거리 정보가 아직 없습니다.",
    poster,
    detailPoster: content.poster || content.backdrop || thumbnailText(title),
    backdrop: content.backdrop || "",
    match: content.match || Number(content.popularity || content.vote_average || content.rating || 0),
  };
}

function isSelectedContentType(content, selectedTypes) {
  return selectedTypes.includes(content.type) || selectedTypes.includes(content.contentType);
}

function providerStatusFromPayload(payload) {
  const providerId = payload.providerId || payload.source || "unknown";

  return {
    providerId,
    providerName: payload.providerName || providerId,
    fallback: providerId === "mock" && Boolean(payload.tmdbEnabled),
    tmdbEnabled: Boolean(payload.tmdbEnabled),
    message: payload.message || "",
    checked: true,
  };
}

async function fetchProviderRecommendations(titles, selectedTypes, quickPicks, selectedOtt, optionMetadata, labelByValue) {
  const uniqueTitles = [...new Set(titles)];
  const providerResults = [];
  let providerStatus = null;

  for (const title of uniqueTitles) {
    const response = await fetch(`/api/search?q=${encodeURIComponent(title)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Search request failed: ${response.status}`);
    }

    const payload = await response.json();
    providerStatus = providerStatus || providerStatusFromPayload(payload);
    const normalizedResults = (payload.results || [])
      .map((item) => normalizeProviderResult(item, quickPicks, title, labelByValue))
      .filter((item) => !titleMatchesSeed(item, title));
    providerResults.push(...normalizedResults);
  }

  const mergedResults = mergeProviderResults(filterSeedResults(providerResults, uniqueTitles));
  const sortedResults = sortProviderResults(mergedResults, selectedTypes, quickPicks, selectedOtt, optionMetadata);
  const balancedResults = balanceSeedDiversity(sortedResults, uniqueTitles);

  return { results: balancedResults.slice(0, targetProviderResultCount), providerStatus };
}

async function fetchOptionRecommendations(selectedTypes, quickPicks, selectedOtt, optionMetadata, labelByValue) {
  const filters = [...quickPicks, ...selectedOtt];
  const params = new URLSearchParams({
    filters: filters.join(","),
    types: selectedTypes.join(","),
  });
  const response = await fetch(`/api/recommend/options?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Option recommendation request failed: ${response.status}`);
  }

  const payload = await response.json();
  const normalizedResults = (payload.results || []).map((item) => normalizeProviderResult(item, quickPicks, "", labelByValue));
  const sortedResults = sortProviderResults(mergeProviderResults(normalizedResults), selectedTypes, quickPicks, selectedOtt, optionMetadata);

  return {
    results: sortedResults.slice(0, targetProviderResultCount),
    providerStatus: providerStatusFromPayload(payload),
  };
}

async function fetchRelatedRecommendations(item, quickPicks, labelByValue) {
  const providerContentId = item.providerContentId || item.tmdbId || "";
  if (!providerContentId) return [];

  const params = new URLSearchParams({
    id: String(providerContentId),
    type: item.type || item.contentType || "movie",
  });
  const response = await fetch(`/api/related?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Related request failed: ${response.status}`);
  }

  const payload = await response.json();
  return (payload.results || [])
    .map((content) => normalizeProviderResult(content, quickPicks, "", labelByValue))
    .filter((relatedItem) => contentKey(relatedItem) !== contentKey(item))
    .slice(0, relatedPickCount);
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function normalizeTitleInputs(values) {
  const normalized = [...values];

  while (normalized.length < initialTitles.length) {
    normalized.push("");
  }

  while (
    normalized.length > initialTitles.length &&
    normalized.at(-1)?.trim() === "" &&
    normalized.at(-2)?.trim() === ""
  ) {
    normalized.splice(normalized.length - 2, 1);
  }

  if (normalized.length >= initialTitles.length && normalized.at(-1)?.trim()) {
    normalized.push("");
  }

  return normalized;
}

function providerStatusLabel(providerStatus) {
  if (!providerStatus.checked) return "Checking";
  if (providerStatus.providerId === "mock") return "Mock Provider";
  if (providerStatus.providerId === "tmdb") return "TMDB";
  return providerStatus.providerName || providerStatus.providerId || "Unknown";
}

function DecisionCard({ item, enteredTitles, onOpen, badge, reasonOverride, className = "" }) {
  return (
    <button className={`result-card decision-card ${className}`.trim()} type="button" onClick={() => onOpen(item)} aria-label={`${item.title} 상세 보기`}>
      <div className="thumbnail poster" aria-hidden="true"><PosterVisual poster={item.poster} title={item.title} /></div>
      <div className="result-body">
        {badge ? <span className="card-context">{badge}</span> : null}
        <p className="decision-reason">{reasonOverride || decisionReason(item, enteredTitles)}</p>
        <div className="decision-title-row">
          <h3>{item.title}</h3>
          <span className="type-badge">{item.label}</span>
        </div>
        <div className="decision-facts" aria-label={`${item.title} 핵심 정보`}>
          <span><strong>장르</strong>{item.genre}</span>
          <span><strong>러닝타임</strong>{item.runtime}</span>
          <span><strong>평점</strong>{item.rating}</span>
          <span><strong>OTT</strong>{item.ott.join(", ")}</span>
        </div>
        <span className="card-action">신뢰 단서 보기</span>
      </div>
    </button>
  );
}

export default function Home() {
  const [selectedOtt, setSelectedOtt] = useState(initialOtt);
  const [selectedTypes, setSelectedTypes] = useState(initialTypes);
  const [titles, setTitles] = useState(initialTitles);
  const [selectedQuickPicks, setSelectedQuickPicks] = useState([]);
  const [optionGroups, setOptionGroups] = useState(quickPickGroups);
  const [optionMetadata, setOptionMetadata] = useState(initialOptionMetadata);
  const [quickPickSearch, setQuickPickSearch] = useState("");
  const [expandedOptionGroups, setExpandedOptionGroups] = useState({});
  const [showQuickPick, setShowQuickPick] = useState(false);
  const [results, setResults] = useState([]);
  const [recommendationStatus, setRecommendationStatus] = useState("idle");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [relatedItems, setRelatedItems] = useState([]);
  const [providerStatus, setProviderStatus] = useState(initialProviderStatus);
  const [timeSlot, setTimeSlot] = useState("evening");
  const [suggestions, setSuggestions] = useState({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);
  const [confirmedSeeds, setConfirmedSeeds] = useState({});
  const suggestionCacheRef = useRef(new Map());
  const relatedStripRef = useRef(null);
  const quickPickSearchRef = useRef(null);

  const enteredTitles = useMemo(() => titles.map((title) => title.trim()).filter(Boolean), [titles]);
  const hasOptionPreference = selectedQuickPicks.length > 0 || selectedOtt.length > 0 || selectedTypes.length > 0;
  const canRecommend = enteredTitles.length > 0 || hasOptionPreference;
  const heroRecommendations = useMemo(() => buildHeroRecommendations(timeSlot).slice(0, 3), [timeSlot]);
  const optionLabelByValue = useMemo(() => new Map(optionGroups.flatMap((group) => group.options)), [optionGroups]);
  const filteredOptionGroups = useMemo(
    () => visibleOptionGroups(filterOptionGroups(optionGroups, quickPickSearch), quickPickSearch, expandedOptionGroups),
    [optionGroups, quickPickSearch, expandedOptionGroups],
  );
  const selectedQuickPickChips = selectedQuickPicks.map((value) => [value, optionLabelByValue.get(value)]).filter(([, label]) => Boolean(label));
  const fallbackRelatedRecommendations = selectedDetail
    ? results.filter((item) => contentKey(item) !== contentKey(selectedDetail)).slice(0, relatedPickCount)
    : [];
  const relatedRecommendations = relatedItems.length ? relatedItems : fallbackRelatedRecommendations;

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") return;
      setSelectedDetail(null);
      setShowQuickPick(false);
      closeSuggestions();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    function handleOutsidePointerDown(event) {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("[data-autocomplete-root]")) return;
      closeSuggestions();
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, []);

  useEffect(() => {
    if (!showDevProviderStatus) return;
    refreshProviderStatus();
  }, []);

  useEffect(() => {
    setTimeSlot(getTimeSlot(new Date()));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadOptionMetadata() {
      try {
        const response = await fetch("/api/options", { cache: "no-store" });
        const payload = await response.json();
        if (!isMounted) return;
        if (Array.isArray(payload.groups) && payload.groups.length) {
          setOptionGroups(payload.groups);
        }
        if (payload.metadata) {
          setOptionMetadata({
            genres: payload.metadata.genres || [],
            countries: payload.metadata.countries || initialOptionMetadata.countries,
            languages: payload.metadata.languages || initialOptionMetadata.languages,
          });
        }
      } catch {
        if (!isMounted) return;
        setOptionGroups(quickPickGroups);
        setOptionMetadata(initialOptionMetadata);
      }
    }

    loadOptionMetadata();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRelatedRecommendations() {
      if (!selectedDetail) {
        setRelatedItems([]);
        return;
      }

      try {
        const nextRelated = await fetchRelatedRecommendations(selectedDetail, selectedQuickPicks, optionLabelByValue);
        if (isMounted) setRelatedItems(nextRelated);
      } catch {
        if (isMounted) setRelatedItems([]);
      }
    }

    setRelatedItems([]);
    loadRelatedRecommendations();

    return () => {
      isMounted = false;
    };
  }, [selectedDetail, selectedQuickPicks, optionLabelByValue]);

  useEffect(() => {
    if (activeSuggestionIndex === null) return undefined;
    const query = titles[activeSuggestionIndex]?.trim() || "";

    if (query.length < 2) {
      setSuggestions((current) => ({ ...current, [activeSuggestionIndex]: [] }));
      return undefined;
    }

    const cacheKey = query.toLocaleLowerCase("ko-KR");
    const cachedSuggestions = suggestionCacheRef.current.get(cacheKey);
    if (cachedSuggestions) {
      setSuggestions((current) => ({ ...current, [activeSuggestionIndex]: cachedSuggestions }));
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        const nextSuggestions = payload.results || [];
        suggestionCacheRef.current.set(cacheKey, nextSuggestions);
        setSuggestions((current) => ({ ...current, [activeSuggestionIndex]: nextSuggestions }));
      } catch (error) {
        if (error?.name === "AbortError") return;
        setSuggestions((current) => ({ ...current, [activeSuggestionIndex]: [] }));
      }
    }, autocompleteDebounceMs);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [titles, activeSuggestionIndex]);

  async function refreshProviderStatus(query = "interstellar") {
    if (!showDevProviderStatus) return;

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      setProviderStatus(providerStatusFromPayload(payload));
    } catch (error) {
      setProviderStatus({
        providerId: "error",
        providerName: "Provider check failed",
        fallback: false,
        tmdbEnabled: false,
        message: error instanceof Error ? error.message : "Provider status check failed.",
        checked: true,
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const currentTitles = titles.map((title) => title.trim()).filter(Boolean);
    const canSubmit = currentTitles.length > 0 || hasOptionPreference;
    if (!canSubmit) return;

    setRecommendationStatus("loading");
    setResults([]);
    setSelectedDetail(null);
    setShowQuickPick(false);
    closeSuggestions();

    const fallbackResults = filterSeedResults(buildRecommendations(selectedTypes, selectedQuickPicks, selectedOtt), currentTitles).slice(0, targetProviderResultCount);

    if (!currentTitles.length) {
      try {
        const { results: optionResults, providerStatus: nextProviderStatus } = await fetchOptionRecommendations(
          selectedTypes,
          selectedQuickPicks,
          selectedOtt,
          optionMetadata,
          optionLabelByValue,
        );
        const nextResults = optionResults.length ? optionResults : fallbackResults;
        setResults(nextResults);
        setRecommendationStatus(nextResults.length ? "success" : "empty");
        if (showDevProviderStatus && nextProviderStatus) {
          setProviderStatus(nextProviderStatus);
        }
      } catch {
        setResults(fallbackResults);
        setRecommendationStatus(fallbackResults.length ? "success" : "error");
        refreshProviderStatus("interstellar");
      }
      return;
    }

    try {
      const { results: providerResults, providerStatus: nextProviderStatus } = await fetchProviderRecommendations(
        currentTitles,
        selectedTypes,
        selectedQuickPicks,
        selectedOtt,
        optionMetadata,
        optionLabelByValue,
      );
      const nextResults = providerResults.length ? providerResults : fallbackResults;
      setResults(nextResults);
      setRecommendationStatus(nextResults.length ? "success" : "empty");
      if (showDevProviderStatus && nextProviderStatus) {
        setProviderStatus(nextProviderStatus);
      }
    } catch {
      setResults(fallbackResults);
      setRecommendationStatus(fallbackResults.length ? "success" : "error");
      refreshProviderStatus(currentTitles[0] || "interstellar");
    }
  }

  function openDetail(item) {
    setShowQuickPick(false);
    setSelectedDetail(item);
  }

  function scrollRelated(direction) {
    const node = relatedStripRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.max(240, node.clientWidth * 0.75),
      behavior: "smooth",
    });
  }

  function setOptionGroupExpanded(groupTitle, expanded) {
    setExpandedOptionGroups((current) => ({
      ...current,
      [groupTitle]: expanded,
    }));
  }

  function startRelatedDrag(event) {
    const node = relatedStripRef.current;
    if (!node) return;
    node.dataset.dragging = "true";
    node.dataset.dragStartX = String(event.clientX);
    node.dataset.dragScrollLeft = String(node.scrollLeft);
    node.setPointerCapture?.(event.pointerId);
  }

  function moveRelatedDrag(event) {
    const node = relatedStripRef.current;
    if (!node || node.dataset.dragging !== "true") return;
    const startX = Number(node.dataset.dragStartX || event.clientX);
    const startScrollLeft = Number(node.dataset.dragScrollLeft || node.scrollLeft);
    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) > 3) {
      node.classList.add("is-dragging");
      node.dataset.dragMoved = "true";
    }
    node.scrollLeft = startScrollLeft - deltaX;
  }

  function endRelatedDrag(event) {
    const node = relatedStripRef.current;
    if (!node) return;
    node.dataset.dragging = "false";
    node.releasePointerCapture?.(event.pointerId);
    window.setTimeout(() => node.classList.remove("is-dragging"), 0);
  }

  function updateTitle(index, value) {
    setTitles((current) => normalizeTitleInputs(current.map((item, itemIndex) => (itemIndex === index ? value : item))));
    setConfirmedSeeds((current) => {
      if (!current[index]) return current;
      const next = { ...current };
      delete next[index];
      return next;
    });
    setActiveSuggestionIndex(index);
  }

  function selectSuggestion(index, suggestion) {
    setTitles((current) => normalizeTitleInputs(current.map((item, itemIndex) => (itemIndex === index ? suggestion.title : item))));
    setConfirmedSeeds((current) => ({ ...current, [index]: suggestion }));
    setSuggestions((current) => ({ ...current, [index]: [] }));
    setActiveSuggestionIndex(null);
  }

  function focusTitleInput(index) {
    setActiveSuggestionIndex(index);
    setSuggestions((current) =>
      Object.fromEntries(Object.entries(current).filter(([suggestionIndex]) => Number(suggestionIndex) === index)),
    );
  }

  function closeSuggestions() {
    setSuggestions({});
    setActiveSuggestionIndex(null);
  }

  function resetAll() {
    setSelectedOtt([...initialOtt]);
    setSelectedTypes([...initialTypes]);
    setTitles([...initialTitles]);
    setSelectedQuickPicks([]);
    setQuickPickSearch("");
    setExpandedOptionGroups({});
    setShowQuickPick(false);
    setResults([]);
    setRecommendationStatus("idle");
    setSelectedDetail(null);
    setRelatedItems([]);
    setSuggestions({});
    setActiveSuggestionIndex(null);
    setConfirmedSeeds({});
  }

  return (
    <main className="recommendation-page">
      <section className="hero-recommendation" aria-labelledby="heroRecommendationTitle">
        <div className="hero-heading">
          <div>
            <p className="eyebrow">First Pick</p>
            <h1 id="heroRecommendationTitle">오늘 볼 작품, 3개만 먼저 골라드릴게요</h1>
          </div>
          <p>입력하기 전에도 바로 고를 수 있게 추천을 먼저 보여드립니다. 더 정확히 고르고 싶다면 아래에서 취향을 조금만 알려주세요.</p>
        </div>
        <div className="result-grid hero-grid" aria-label="Hero Recommendation">
          {heroRecommendations.map(({ item, badge, reason }) => (
            <DecisionCard
              item={item}
              enteredTitles={[]}
              onOpen={openDetail}
              badge={badge}
              reasonOverride={reason}
              className="hero-card"
              key={badge}
            />
          ))}
        </div>
        <p className="hero-next-step">마음에 드는 작품이 없다면, 좋아했던 작품이나 분위기를 알려주고 더 정확히 골라보세요.</p>
      </section>

      <section className="recommendation-panel" aria-labelledby="pageTitle">
        <div className="page-heading">
          <p className="eyebrow">MovieMind DNA</p>
          <h1 id="pageTitle">취향을 알려주면 더 좁혀드릴게요</h1>
          <p>이용 중인 OTT와 콘텐츠 종류를 고르고, 좋아했던 작품이나 추천 옵션을 더하면 결과가 바로 아래에 표시됩니다.</p>
          {showDevProviderStatus ? (
            <div className="provider-status" id="providerStatus" aria-label="Provider status" title={providerStatus.message}>
              <span>Data Source</span>
              <strong>{providerStatusLabel(providerStatus)}</strong>
              <span>Fallback</span>
              <strong>{providerStatus.fallback ? "Yes" : "No"}</strong>
            </div>
          ) : null}
        </div>

        <form className="recommendation-form" id="recommendationForm" onSubmit={handleSubmit}>
          <fieldset className="option-section">
            <legend>
              <span>1</span>
              OTT 선택
            </legend>
            <p className="section-copy">지금 이용 중인 서비스를 골라주세요.</p>
            <div className="option-grid">
              {ottOptions.map(([value, label]) => (
                <label className="check-option" key={value}>
                  <input
                    type="checkbox"
                    name="ott"
                    value={value}
                    checked={selectedOtt.includes(value)}
                    onChange={() => setSelectedOtt((current) => toggleValue(current, value))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="option-section">
            <legend>
              <span>2</span>
              콘텐츠 종류 선택
            </legend>
            <p className="section-copy">추천받고 싶은 콘텐츠 유형을 선택하세요.</p>
            <div className="option-grid compact">
              {contentTypeOptions.map(([value, label]) => (
                <label className="check-option" key={value}>
                  <input
                    type="checkbox"
                    name="contentType"
                    value={value}
                    checked={selectedTypes.includes(value)}
                    onChange={() => setSelectedTypes((current) => toggleValue(current, value))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <section className="input-section" aria-labelledby="inputSectionTitle">
            <div className="section-title">
              <span>3</span>
              <div>
                <h2 id="inputSectionTitle">좋아하는 작품 입력</h2>
                <p className="section-copy">인상 깊었던 작품을 적어주세요. 마지막 칸을 채우면 새 입력창이 자동으로 생깁니다.</p>
              </div>
            </div>
            <div className="input-group" aria-label="좋아했던 작품 입력">
              {titles.map((title, index) => (
                <label
                  className="title-input-field"
                  data-autocomplete-root
                  data-confirmed-seed={confirmedSeeds[index] ? "true" : "false"}
                  key={`title-${index + 1}`}
                >
                  작품 {index + 1}
                  <input
                    id={`titleInput${index + 1}`}
                    type="text"
                    name="title"
                    placeholder={titlePlaceholders[index] || "예: 최근 좋았던 작품"}
                    autoComplete="off"
                    value={title}
                    onChange={(event) => updateTitle(index, event.target.value)}
                    onFocus={() => focusTitleInput(index)}
                  />
                  {suggestions[index]?.length ? (
                    <div className="suggestion-list" role="listbox" aria-label={`작품 ${index + 1} 검색 후보`}>
                      {suggestions[index].map((suggestion) => (
                        <button
                          className="suggestion-item"
                          type="button"
                          role="option"
                          onClick={() => selectSuggestion(index, suggestion)}
                          key={`${suggestion.providerContentId}-${suggestion.title}`}
                        >
                          <span className="suggestion-poster" aria-hidden="true">
                            {suggestion.poster ? <img src={suggestion.poster} alt="" loading="lazy" /> : suggestion.title.slice(0, 2)}
                          </span>
                          <span className="suggestion-copy">
                            <strong>{suggestion.title}</strong>
                            <span>
                              {suggestion.originalTitle && suggestion.originalTitle !== suggestion.title ? `${suggestion.originalTitle} · ` : ""}
                              {suggestion.year || "연도 확인"} · {suggestion.label}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <button className="secondary-button" id="quickPickButton" type="button" onClick={() => setShowQuickPick(true)}>
              {selectedQuickPicks.length ? `추천 옵션 (${selectedQuickPicks.length})` : "추천 옵션"}
            </button>
            <button className="secondary-button" id="resetAllButton" type="button" onClick={resetAll}>
              전체 초기화
            </button>
            <button className="primary-button" id="recommendButton" type="submit" disabled={!canRecommend}>
              내 취향으로 추천받기
            </button>
          </div>
        </form>
      </section>

      <section className="results-panel" aria-labelledby="resultsTitle">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Result</p>
            <h2 id="resultsTitle">추천 결과</h2>
          </div>
          <p className="result-count" id="resultCount">{results.length}개</p>
        </div>
        {recommendationStatus === "loading" ? (
          <div className="empty-state loading-state" id="loadingState">추천을 찾는 중입니다...</div>
        ) : null}
        {!results.length && recommendationStatus !== "loading" ? (
          <div className="empty-state" id="emptyState">
            {recommendationStatus === "empty" || recommendationStatus === "error"
              ? "선택한 유형에 맞는 결과가 없습니다. 영화, 드라마, 애니 중 하나 이상 선택해 주세요."
              : "작품을 입력하거나 추천 옵션을 고르면 결과가 여기에 표시됩니다."}
          </div>
        ) : null}
        <div className="result-grid" id="resultGrid">
          {results.map((item) => (
            <DecisionCard item={item} enteredTitles={enteredTitles} onOpen={openDetail} key={item.id || item.providerContentId || item.title} />
          ))}
        </div>
      </section>

      {showQuickPick ? (
        <div className="quick-pick-overlay" id="quickPickOverlay" aria-hidden="false">
          <div className="quick-pick-backdrop" onClick={() => setShowQuickPick(false)} />
          <section className="quick-pick-sheet" role="dialog" aria-modal="true" aria-labelledby="quickPickTitle">
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-heading">
              <div>
                <p className="eyebrow">Quick Pick</p>
                <h2 id="quickPickTitle">추천 옵션</h2>
                <p className="sheet-count" id="quickPickCount">필터 {selectedQuickPicks.length}개 선택됨</p>
              </div>
              <div className="sheet-actions">
                <button className="tertiary-button" type="button" onClick={() => setSelectedQuickPicks([])}>
                  옵션 초기화
                </button>
                <button className="close-button" type="button" onClick={() => setShowQuickPick(false)} aria-label="추천 옵션 닫기">×</button>
              </div>
            </div>

            <label className="option-search-field">
              옵션 검색
              <span className="option-search-control">
                <input
                  ref={quickPickSearchRef}
                  type="text"
                  value={quickPickSearch}
                  placeholder="SF, 일본, 긴장감처럼 검색"
                  onChange={(event) => setQuickPickSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setQuickPickSearch("");
                      event.currentTarget.focus();
                    }
                  }}
                />
                {quickPickSearch ? (
                  <button
                    className="search-clear-button"
                    type="button"
                    onClick={() => {
                      setQuickPickSearch("");
                      quickPickSearchRef.current?.focus();
                    }}
                    aria-label="옵션 검색어 지우기"
                  >
                    ×
                  </button>
                ) : null}
              </span>
            </label>

            <div className="selected-filter-panel" aria-live="polite">
              <span>선택됨</span>
              {selectedQuickPickChips.length ? (
                <div className="selected-filter-list">
                  {selectedQuickPickChips.map(([value, label]) => (
                    <button
                      className="selected-filter-chip"
                      type="button"
                      onClick={() => setSelectedQuickPicks((current) => current.filter((item) => item !== value))}
                      key={value}
                    >
                      {label} <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p>선택한 추천 옵션이 없습니다.</p>
              )}
            </div>

            <div className="quick-pick-groups">
              {filteredOptionGroups.map((group) => (
                <fieldset className="quick-group" key={group.title}>
                  <legend>
                    <span>{group.title}</span>
                    {group.totalOptions ? (
                      <button className="group-toggle-button" type="button" onClick={() => setOptionGroupExpanded(group.title, true)}>
                        + 더보기
                      </button>
                    ) : null}
                    {expandedOptionGroups[group.title] && group.options.length > collapsedOptionCount && !quickPickSearch ? (
                      <button className="group-toggle-button" type="button" onClick={() => setOptionGroupExpanded(group.title, false)}>
                        접기
                      </button>
                    ) : null}
                  </legend>
                  {group.options.map(([value, label]) => (
                    <label className="check-option" key={value}>
                      <input
                        type="checkbox"
                        name="quickPick"
                        value={value}
                        checked={selectedQuickPicks.includes(value)}
                        onChange={() => setSelectedQuickPicks((current) => toggleValue(current, value))}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
              ))}
              {!filteredOptionGroups.length ? <p className="option-empty">검색된 옵션이 없습니다.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {selectedDetail ? (
        <div className="detail-overlay" id="detailOverlay" aria-hidden="false">
          <div className="detail-backdrop" onClick={() => setSelectedDetail(null)} />
          <div className="detail-stack">
          <section className="detail-layer" role="dialog" aria-modal="true" aria-labelledby="detailTitle">
            <button className="close-button detail-close" type="button" onClick={() => setSelectedDetail(null)} aria-label="상세 정보 닫기">×</button>
            <div className="detail-layout">
              <div className="detail-thumb poster" aria-hidden="true"><PosterVisual poster={selectedDetail.detailPoster || selectedDetail.poster} title={selectedDetail.title} /></div>
              <div className="detail-info">
                <span className="type-badge">{selectedDetail.label}</span>
                <h2 id="detailTitle">{selectedDetail.title}</h2>
                <div className="meta-list">
                  <span><strong>장르</strong> {selectedDetail.genre}</span>
                  <span><strong>감독</strong> {selectedDetail.director}</span>
                  <span><strong>주요 배우</strong> {selectedDetail.actors.join(", ")}</span>
                </div>
                <p className="detail-reason"><strong>추천 이유</strong><br />{recommendationReason(selectedDetail, enteredTitles)}</p>
                {selectedDetail.recommendationInsight?.length ? (
                  <section className="insight-panel" aria-labelledby="recommendationInsightTitle">
                    <p className="trust-label" id="recommendationInsightTitle">Recommendation Insight</p>
                    <ul className="insight-list">
                      {selectedDetail.recommendationInsight.map((insight) => (
                        <li key={insight}>{insight}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <section className="trust-panel" aria-labelledby="trustSignalTitle">
                  <div>
                    <p className="trust-label" id="trustSignalTitle">Trust Signal</p>
                    <p className="trust-copy">선택을 돕기 위한 참고 단서입니다. 이후 실제 지표로 교체됩니다.</p>
                  </div>
                  <div className="trust-grid">
                    {trustSignals(selectedDetail, enteredTitles).map((signal) => (
                      <span className="trust-signal" key={signal.label}>
                        <strong>{signal.label}</strong>
                        {signal.value}
                      </span>
                    ))}
                  </div>
                </section>
                <p><strong>줄거리</strong><br />{selectedDetail.synopsis}</p>
                <div className="detail-next-step" aria-label={`${selectedDetail.title} OTT 확인`}>
                  <span>볼 수 있는 OTT</span>
                  <strong>{selectedDetail.ott.join(", ")}</strong>
                </div>
              </div>
            </div>
          </section>
          {relatedRecommendations.length ? (
            <section className="related-panel" aria-labelledby="relatedRecommendationTitle">
              <div className="related-heading">
                <div>
                  <p className="trust-label" id="relatedRecommendationTitle">Related Picks</p>
                  <p className="trust-copy">현재 작품을 기준으로 이어서 볼 만한 추천입니다.</p>
                </div>
                <div className="related-controls" aria-label="Related Picks 이동">
                  <button type="button" onClick={() => scrollRelated(-1)} aria-label="이전 Related Picks">‹</button>
                  <button type="button" onClick={() => scrollRelated(1)} aria-label="다음 Related Picks">›</button>
                </div>
              </div>
              <div
                className="related-strip"
                aria-label="관련 추천"
                ref={relatedStripRef}
                onPointerDown={startRelatedDrag}
                onPointerMove={moveRelatedDrag}
                onPointerUp={endRelatedDrag}
                onPointerCancel={endRelatedDrag}
                onPointerLeave={endRelatedDrag}
              >
                {relatedRecommendations.map((item) => (
                  <button
                    className="related-card"
                    type="button"
                    onClick={(event) => {
                      const strip = event.currentTarget.closest(".related-strip");
                      if (strip?.dataset.dragMoved === "true") {
                        strip.dataset.dragMoved = "false";
                        event.preventDefault();
                        return;
                      }
                      setSelectedDetail(item);
                    }}
                    key={item.id || item.providerContentId || item.title}
                  >
                    <span className="related-thumb" aria-hidden="true"><PosterVisual poster={item.poster} title={item.title} /></span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{decisionReason(item, enteredTitles)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
