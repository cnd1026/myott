const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const COMBINED_PROVIDER_NAMES = new Set([
  "action & adventure",
  "sci-fi & fantasy",
  "war & politics",
  "액션·모험",
  "sf·판타지",
  "전쟁·정치",
]);

const signal = (
  positive,
  {
    negative = [],
    minimumEvidence = 1,
    controlledPositive = [],
    controlledStrong = [],
    minimumControlledEvidence = 0,
    minimumControlledStrongEvidence = 0,
  } = {},
) => Object.freeze({
  positive: Object.freeze(positive),
  negative: Object.freeze(negative),
  minimumEvidence,
  controlledPositive: Object.freeze(controlledPositive),
  controlledStrong: Object.freeze(controlledStrong),
  minimumControlledEvidence,
  minimumControlledStrongEvidence,
});

export const SEMANTIC_GENRE_SIGNALS = Object.freeze({
  "genre-action": signal([
    "action", "combat", "fight", "battle", "martial arts", "chase", "spy", "espionage",
    "military", "superhero", "gunfight", "explosion", "special agent", "assassin", "mercenary",
    "hostage", "rescue mission", "secret mission", "액션", "전투", "격투", "추격", "첩보", "군사",
    "특수요원", "암살자", "용병", "인질", "구출 작전", "비밀 임무",
  ], {
    controlledPositive: [
      "agent", "mission", "operation", "police", "detective", "investigation", "fbi", "cia",
      "rescue", "escape", "criminal organization", "secret organization", "요원", "임무", "작전",
      "경찰", "형사", "수사", "구조", "탈출", "범죄 조직", "비밀 조직",
    ],
    controlledStrong: [
      "agent", "mission", "operation", "fbi", "cia", "rescue", "escape", "요원", "임무", "작전", "구조", "탈출",
    ],
    minimumControlledEvidence: 2,
    minimumControlledStrongEvidence: 1,
  }),
  "genre-adventure": signal([
    "adventure", "journey", "expedition", "quest", "exploration", "treasure", "travel", "survival",
    "모험", "여정", "탐험", "원정", "보물", "여행", "생존",
  ], {
    controlledPositive: [
      "unknown world", "new world", "wilderness", "voyage", "odyssey", "frontier", "island",
      "stranded", "discover", "ancient", "artifact", "realm", "world", "미지의 세계", "신세계",
      "황야", "항해", "표류", "발견", "고대", "유물", "왕국", "세계",
    ],
    controlledStrong: [
      "unknown world", "new world", "wilderness", "voyage", "odyssey", "frontier", "island",
      "stranded", "artifact", "realm", "kingdom", "미지의 세계", "신세계", "황야", "항해", "표류", "유물", "왕국",
    ],
    minimumControlledEvidence: 1,
    minimumControlledStrongEvidence: 1,
  }),
  "genre-sf": signal([
    "science fiction", "sci-fi", "space", "alien", "robot", "android", "artificial intelligence",
    "time travel", "future", "dystopia", "technology", "cyberpunk", "우주", "외계", "로봇", "인공지능",
    "시간 여행", "미래", "디스토피아", "과학 기술",
  ]),
  "genre-fantasy": signal([
    "fantasy", "magic", "myth", "fairy tale", "supernatural world", "dragon", "witch", "kingdom", "spell",
    "판타지", "마법", "신화", "동화", "용", "마녀", "왕국", "주문",
  ]),
  "genre-war": signal([
    "war", "battle", "military", "army", "soldier", "invasion", "combat", "전쟁", "전투", "군대", "병사", "침공",
  ]),
  "genre-politics": signal([
    "politics", "political", "government", "election", "president", "parliament", "diplomacy", "coup",
    "political power", "정치", "정부", "선거", "대통령", "의회", "외교", "쿠데타", "권력",
  ]),
  "genre-romance": signal([
    "romance", "romantic relationship", "love", "couple", "dating", "marriage", "first love", "unrequited love",
    "로맨스", "멜로", "사랑", "연애", "커플", "결혼", "첫사랑", "짝사랑",
  ]),
  "genre-thriller": signal([
    "thriller", "crime", "murder", "serial killer", "investigation", "conspiracy", "survival", "mystery", "tense",
    "스릴러", "범죄", "살인", "연쇄", "수사", "음모", "생존", "미스터리", "긴장",
  ]),
  "genre-horror": signal([
    "horror", "ghost", "demon", "haunting", "monster", "occult", "supernatural horror", "slasher", "zombie",
    "공포", "유령", "악마", "빙의", "괴물", "오컬트", "슬래셔", "좀비",
  ]),
});

function valueText(value) {
  if (value && typeof value === "object") {
    return value.name || value.label || value.value || "";
  }
  return value;
}

export function semanticEvidenceValues(item = {}) {
  const values = [
    ...(item.keywords || []),
    ...(item.mood || item.moods || []),
    ...(item.genres || []),
    ...(item.tags || []),
    item.genre,
    item.synopsis,
    item.overview,
    item.description,
  ]
    .map(valueText)
    .map(normalizeText)
    .filter(Boolean)
    .filter((value) => !COMBINED_PROVIDER_NAMES.has(value));

  return [...new Set(values)];
}

export function semanticGenreEvidence(item = {}, genreValue) {
  const policy = SEMANTIC_GENRE_SIGNALS[genreValue];
  if (!policy) {
    return {
      matched: false,
      controlledMatched: false,
      score: 0,
      controlledScore: 0,
      confidence: "none",
      matchedSignals: [],
      controlledSignals: [],
      controlledStrongSignals: [],
      negativeSignals: [],
      reasons: [],
    };
  }

  const evidence = semanticEvidenceValues(item);
  const matchedSignals = policy.positive.filter((candidate) =>
    evidence.some((value) => value.includes(candidate)),
  );
  const negativeSignals = policy.negative.filter((candidate) =>
    evidence.some((value) => value.includes(candidate)),
  );
  const controlledSignals = policy.controlledPositive.filter((candidate) =>
    evidence.some((value) => value.includes(candidate)),
  );
  const controlledStrongSignals = policy.controlledStrong.filter((candidate) =>
    evidence.some((value) => value.includes(candidate)),
  );
  const evidenceCount = Math.max(0, matchedSignals.length - negativeSignals.length);
  const matched = evidenceCount >= policy.minimumEvidence;
  const controlledEvidenceCount = Math.max(0, controlledSignals.length - negativeSignals.length);
  const controlledMatched = !matched &&
    policy.minimumControlledEvidence > 0 &&
    controlledEvidenceCount >= policy.minimumControlledEvidence &&
    controlledStrongSignals.length >= policy.minimumControlledStrongEvidence;

  return {
    matched,
    controlledMatched,
    score: matched ? Math.min(1, evidenceCount / Math.max(policy.minimumEvidence, 2)) : 0,
    controlledScore: controlledMatched
      ? Math.min(0.7, 0.45 + controlledEvidenceCount * 0.08 + controlledStrongSignals.length * 0.04)
      : 0,
    confidence: matched ? "high" : controlledMatched ? "controlled" : "none",
    matchedSignals: [...new Set(matchedSignals)],
    controlledSignals: [...new Set(controlledSignals)],
    controlledStrongSignals: [...new Set(controlledStrongSignals)],
    negativeSignals: [...new Set(negativeSignals)],
    reasons: matched
      ? [...new Set(matchedSignals)].map((value) => `${genreValue}:${value}`)
      : controlledMatched
        ? [...new Set(controlledSignals)].map((value) => `${genreValue}:controlled:${value}`)
        : [],
  };
}

export function chooseSemanticSpecialization(item = {}, genreValues = []) {
  const evaluated = genreValues.map((value) => ({ value, ...semanticGenreEvidence(item, value) }));
  const matched = evaluated.filter((entry) => entry.matched);
  const controlled = evaluated.filter((entry) => entry.controlledMatched);
  if (!matched.length && !controlled.length) {
    return { selected: [], controlled: [], primary: "", evaluated };
  }

  const ranked = matched.length ? matched : controlled;
  const highestScore = Math.max(...ranked.map((entry) => entry.score || entry.controlledScore));
  const strongest = ranked.filter((entry) => (entry.score || entry.controlledScore) === highestScore);
  return {
    selected: matched.map((entry) => entry.value),
    controlled: controlled.map((entry) => entry.value),
    primary: strongest.length === 1 ? strongest[0].value : "",
    evaluated,
  };
}

export function semanticRecommendationReason(genreValue) {
  return {
    "genre-action": "전투와 추격 중심의 액션 요소를 반영한 추천입니다.",
    "genre-adventure": "탐험과 여정 중심의 모험 요소를 반영한 추천입니다.",
    "genre-sf": "미래 기술과 우주 탐사 요소를 반영한 추천입니다.",
    "genre-fantasy": "마법과 신화적 세계관 요소를 반영한 추천입니다.",
    "genre-war": "군사와 전투 요소를 반영한 추천입니다.",
    "genre-politics": "권력과 정치적 갈등 요소를 반영한 추천입니다.",
    "genre-romance": "사랑과 관계의 흐름을 반영한 추천입니다.",
    "genre-thriller": "범죄·미스터리와 긴장 요소를 반영한 추천입니다.",
    "genre-horror": "공포와 초자연적 위협 요소를 반영한 추천입니다.",
  }[genreValue] || "";
}
