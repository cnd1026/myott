const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const COMBINED_PROVIDER_NAMES = new Set([
  "action & adventure",
  "sci-fi & fantasy",
  "war & politics",
]);

const signal = (positive, { negative = [], minimumEvidence = 1 } = {}) => Object.freeze({
  positive: Object.freeze(positive),
  negative: Object.freeze(negative),
  minimumEvidence,
});

export const SEMANTIC_GENRE_SIGNALS = Object.freeze({
  "genre-action": signal([
    "action", "combat", "fight", "battle", "martial arts", "chase", "spy", "espionage",
    "military", "superhero", "gunfight", "explosion", "액션", "전투", "격투", "추격", "첩보", "군사",
  ]),
  "genre-adventure": signal([
    "adventure", "journey", "expedition", "quest", "exploration", "treasure", "travel", "survival",
    "모험", "여정", "탐험", "원정", "보물", "여행", "생존",
  ]),
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
    return { matched: false, score: 0, matchedSignals: [], negativeSignals: [], reasons: [] };
  }

  const evidence = semanticEvidenceValues(item);
  const matchedSignals = policy.positive.filter((candidate) =>
    evidence.some((value) => value.includes(candidate)),
  );
  const negativeSignals = policy.negative.filter((candidate) =>
    evidence.some((value) => value.includes(candidate)),
  );
  const evidenceCount = Math.max(0, matchedSignals.length - negativeSignals.length);
  const matched = evidenceCount >= policy.minimumEvidence;

  return {
    matched,
    score: matched ? Math.min(1, evidenceCount / Math.max(policy.minimumEvidence, 2)) : 0,
    matchedSignals: [...new Set(matchedSignals)],
    negativeSignals: [...new Set(negativeSignals)],
    reasons: matched ? [...new Set(matchedSignals)].map((value) => `${genreValue}:${value}`) : [],
  };
}

export function chooseSemanticSpecialization(item = {}, genreValues = []) {
  const evaluated = genreValues.map((value) => ({ value, ...semanticGenreEvidence(item, value) }));
  const matched = evaluated.filter((entry) => entry.matched);
  if (!matched.length) return { selected: [], evaluated };

  const highestScore = Math.max(...matched.map((entry) => entry.score));
  const strongest = matched.filter((entry) => entry.score === highestScore);
  return {
    selected: strongest.length === 1 ? [strongest[0].value] : [],
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
