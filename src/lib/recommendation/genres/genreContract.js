const normalizeToken = (value) => String(value ?? "").trim().toLowerCase();

const genre = ({
  value,
  label,
  providerNames = [],
  aliases = [],
  movieExact = [],
  movieAdjacent = [],
  tvExact = [],
  tvAdjacent = [],
  displayPriority,
  providerLimitation = "",
  contentTypes = ["movie", "tv"],
}) => Object.freeze({
  value,
  label,
  providerNames: Object.freeze(providerNames),
  aliases: Object.freeze(aliases),
  movie: Object.freeze({ exactIds: Object.freeze(movieExact), semanticAdjacentIds: Object.freeze(movieAdjacent) }),
  tv: Object.freeze({ exactIds: Object.freeze(tvExact), semanticAdjacentIds: Object.freeze(tvAdjacent) }),
  exactGenreFamily: value,
  semanticAdjacentFamily: Object.freeze([...movieAdjacent, ...tvAdjacent]),
  displayPriority,
  providerLimitation,
  contentTypes: Object.freeze(contentTypes),
});

export const GENRE_CONTRACT = Object.freeze([
  genre({ value: "genre-action", label: "액션", providerNames: ["Action"], aliases: ["action", "액션"], movieExact: [28], movieAdjacent: [80, 53], tvExact: [10759], displayPriority: 1 }),
  genre({ value: "genre-sf", label: "SF", providerNames: ["Science Fiction"], aliases: ["sf", "sci-fi", "science fiction"], movieExact: [878], tvExact: [10765], displayPriority: 2, providerLimitation: "TMDB TV combines Sci-Fi and Fantasy as genre 10765." }),
  genre({ value: "genre-drama", label: "드라마", providerNames: ["Drama"], aliases: ["drama", "드라마"], movieExact: [18], tvExact: [18], displayPriority: 3 }),
  genre({ value: "genre-romance", label: "로맨스", providerNames: ["Romance"], aliases: ["romance", "로맨스"], movieExact: [10749], tvExact: [18], displayPriority: 4, providerLimitation: "TMDB TV has no standalone romance genre; Drama is an adjacent provider category." }),
  genre({ value: "genre-mystery", label: "미스터리", providerNames: ["Mystery"], aliases: ["mystery", "미스터리"], movieExact: [9648], tvExact: [9648], displayPriority: 5 }),
  genre({ value: "genre-thriller", label: "스릴러", providerNames: ["Thriller"], aliases: ["thriller", "스릴러"], movieExact: [53], movieAdjacent: [80, 9648], tvExact: [80, 9648], tvAdjacent: [10759], displayPriority: 6, providerLimitation: "TMDB TV has no standalone Thriller genre; Crime and Mystery are provider evidence and Action & Adventure requires semantic evidence." }),
  genre({ value: "genre-comedy", label: "코미디", providerNames: ["Comedy"], aliases: ["comedy", "코미디"], movieExact: [35], tvExact: [35], displayPriority: 7 }),
  genre({ value: "genre-horror", label: "공포", providerNames: ["Horror"], aliases: ["horror", "공포"], movieExact: [27], movieAdjacent: [53], tvExact: [9648], displayPriority: 8, providerLimitation: "TMDB TV has no standalone Horror genre; Mystery is adjacent provider evidence." }),
  genre({ value: "genre-sf-fantasy", label: "SF·판타지", providerNames: ["Sci-Fi & Fantasy"], aliases: ["sf-fantasy", "sf·판타지", "sf & fantasy"], movieExact: [878, 14], tvExact: [10765], displayPriority: 9, providerLimitation: "TMDB TV combines Sci-Fi and Fantasy as genre 10765." }),
  genre({ value: "genre-action-adventure", label: "액션·모험", providerNames: ["Action & Adventure"], aliases: ["action & adventure", "액션·모험"], movieExact: [28, 12], tvExact: [10759], displayPriority: 10 }),
  genre({ value: "genre-crime", label: "범죄", providerNames: ["Crime"], aliases: ["crime", "범죄"], movieExact: [80], movieAdjacent: [53], tvExact: [80], tvAdjacent: [9648], displayPriority: 11 }),
  genre({ value: "genre-fantasy", label: "판타지", providerNames: ["Fantasy"], aliases: ["fantasy", "판타지"], movieExact: [14], tvExact: [10765], displayPriority: 12, providerLimitation: "TMDB TV combines Sci-Fi and Fantasy as genre 10765." }),
  genre({ value: "genre-adventure", label: "모험", providerNames: ["Adventure"], aliases: ["adventure", "모험"], movieExact: [12], tvExact: [10759], displayPriority: 13 }),
  genre({ value: "genre-animation", label: "애니메이션", providerNames: ["Animation"], aliases: ["animation", "anime", "애니", "애니메이션"], movieExact: [16], tvExact: [16], displayPriority: 14 }),
  genre({ value: "genre-family", label: "가족", providerNames: ["Family", "Kids"], aliases: ["family", "kids", "가족", "키즈"], movieExact: [10751], tvExact: [10751, 10762], displayPriority: 15 }),
  genre({ value: "genre-documentary", label: "다큐멘터리", providerNames: ["Documentary"], aliases: ["documentary", "다큐", "다큐멘터리"], movieExact: [99], tvExact: [99], displayPriority: 16 }),
  genre({ value: "genre-music", label: "음악", providerNames: ["Music"], aliases: ["music", "음악"], movieExact: [10402], tvExact: [], displayPriority: 17 }),
  genre({ value: "genre-history", label: "역사", providerNames: ["History"], aliases: ["history", "역사"], movieExact: [36], tvExact: [], displayPriority: 18 }),
  genre({ value: "genre-western", label: "서부", providerNames: ["Western"], aliases: ["western", "서부"], movieExact: [37], tvExact: [37], displayPriority: 19 }),
  genre({ value: "genre-war", label: "전쟁", providerNames: ["War"], aliases: ["war", "전쟁"], movieExact: [10752], tvExact: [10768], displayPriority: 20 }),
  genre({ value: "genre-tv-movie", label: "TV 영화", providerNames: ["TV Movie"], aliases: ["tv movie", "tv 영화"], movieExact: [10770], tvExact: [], displayPriority: 30, contentTypes: ["movie"] }),
  genre({ value: "genre-news", label: "뉴스", providerNames: ["News"], aliases: ["news", "뉴스"], tvExact: [10763], displayPriority: 31, contentTypes: ["tv"] }),
  genre({ value: "genre-reality", label: "리얼리티", providerNames: ["Reality"], aliases: ["reality", "리얼리티"], tvExact: [10764], displayPriority: 32, contentTypes: ["tv"] }),
  genre({ value: "genre-talk", label: "토크", providerNames: ["Talk"], aliases: ["talk", "토크"], tvExact: [10767], displayPriority: 33, contentTypes: ["tv"] }),
  genre({ value: "genre-soap", label: "소프", providerNames: ["Soap"], aliases: ["soap", "소프"], tvExact: [10766], displayPriority: 34, contentTypes: ["tv"] }),
  genre({ value: "genre-war-politics", label: "전쟁·정치", providerNames: ["War & Politics"], aliases: ["war & politics", "전쟁·정치"], movieExact: [10752], tvExact: [10768], displayPriority: 35 }),
]);

const contractByValue = new Map(GENRE_CONTRACT.map((entry) => [entry.value, entry]));
const contractByProviderName = new Map(
  GENRE_CONTRACT.flatMap((entry) => entry.providerNames.map((name) => [normalizeToken(name), entry])),
);

export const GENRE_TOP_EIGHT_VALUES = Object.freeze(GENRE_CONTRACT.slice(0, 8).map((entry) => entry.value));
export const GENRE_TOP_EIGHT_OPTIONS = Object.freeze(
  GENRE_CONTRACT.slice(0, 8).map((entry) => Object.freeze([entry.value, entry.label])),
);

export function genreContractFor(value) {
  return contractByValue.get(String(value || "")) || null;
}

export function genreValueForProviderName(name) {
  return contractByProviderName.get(normalizeToken(name))?.value || "";
}

export function genreLabelForValue(value) {
  return genreContractFor(value)?.label || "";
}

export function selectedGenreFilters(filters = []) {
  return filters.filter((filter) => String(filter).startsWith("genre-") || String(filter).startsWith("tmdb-genre-"));
}

function providerType(mediaType) {
  return ["tv", "drama", "series"].includes(String(mediaType || "").toLowerCase()) ? "tv" : "movie";
}

export function genreIdsForFilters(filters = [], mediaType = "movie", { includeAdjacent = false } = {}) {
  const targetType = providerType(mediaType);
  const ids = selectedGenreFilters(filters).flatMap((filter) => {
    if (filter.startsWith("tmdb-genre-")) return [Number(filter.replace("tmdb-genre-", ""))];
    const contract = genreContractFor(filter);
    if (!contract) return [];
    return [
      ...contract[targetType].exactIds,
      ...(includeAdjacent ? contract[targetType].semanticAdjacentIds : []),
    ];
  });
  return [...new Set(ids.map(Number).filter(Number.isFinite))];
}

export function prioritizeGenreOptions(options = []) {
  const priority = new Map(GENRE_CONTRACT.map((entry) => [entry.value, entry.displayPriority]));
  const seen = new Set();
  return [...options]
    .filter((option) => {
      const value = Array.isArray(option) ? option[0] : option.value;
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .sort((left, right) => {
      const leftValue = Array.isArray(left) ? left[0] : left.value;
      const rightValue = Array.isArray(right) ? right[0] : right.value;
      const leftLabel = Array.isArray(left) ? left[1] : left.label;
      const rightLabel = Array.isArray(right) ? right[1] : right.label;
      return (priority.get(leftValue) ?? 100) - (priority.get(rightValue) ?? 100) ||
        String(leftLabel || "").localeCompare(String(rightLabel || ""), "ko");
    });
}

function semanticTerms(item = {}) {
  return [
    ...(item.keywords || []),
    ...(item.mood || item.moods || []),
    ...(item.genres || []),
    item.genre,
    item.synopsis,
    item.overview,
  ].map(normalizeToken).filter(Boolean);
}

const thrillerTerms = [
  "crime", "범죄", "murder", "살인", "serial killer", "연쇄", "investigation", "수사",
  "conspiracy", "음모", "survival", "생존", "mystery", "미스터리", "tense", "긴장",
];

function hasThrillerSemanticEvidence(item) {
  const terms = semanticTerms(item);
  return terms.some((term) => thrillerTerms.some((signal) => term.includes(signal)));
}

const matchPriority = Object.freeze({
  "provider-exact": 1,
  "provider-combined": 2,
  semantic: 3,
  relaxed: 4,
});

export function candidateGenreMatchDetail(item = {}, filters = []) {
  const genreFilters = selectedGenreFilters(filters);
  if (!genreFilters.length) {
    return { genreMatched: true, genreMatchMode: "provider-exact", semanticGenreMatched: false, semanticGenreReasons: [] };
  }

  const targetType = providerType(item.mediaType || item.contentType || item.type);
  const genreIds = [...new Set((item.genreIds || item.genre_ids || []).map(Number).filter(Number.isFinite))];
  const modes = [];
  const reasons = [];

  for (const filter of genreFilters) {
    if (filter.startsWith("tmdb-genre-")) {
      const id = Number(filter.replace("tmdb-genre-", ""));
      if (genreIds.includes(id)) modes.push("provider-exact");
      continue;
    }

    const contract = genreContractFor(filter);
    if (!contract) continue;
    const exactIds = contract[targetType].exactIds;
    const adjacentIds = contract[targetType].semanticAdjacentIds;
    const exactMatch = exactIds.some((id) => genreIds.includes(id));

    if (exactMatch) {
      const combined = targetType === "tv" && exactIds.includes(10765) && Boolean(contract.providerLimitation);
      modes.push(combined ? "provider-combined" : "provider-exact");
      if (combined) reasons.push("tmdb-tv-combined-sf-fantasy-10765");
      continue;
    }

    const adjacentMatch = adjacentIds.some((id) => genreIds.includes(id));
    if (filter === "genre-thriller" && targetType === "tv") {
      if ((adjacentMatch || hasThrillerSemanticEvidence(item)) && hasThrillerSemanticEvidence(item)) {
        modes.push("semantic");
        reasons.push("tv-thriller-keyword-or-mood-evidence");
      }
    } else if (adjacentMatch) {
      modes.push("semantic");
      reasons.push(`${filter}:adjacent-provider-genre`);
    }
  }

  if (!modes.length) {
    return { genreMatched: false, genreMatchMode: "relaxed", semanticGenreMatched: false, semanticGenreReasons: [] };
  }
  const genreMatchMode = modes.sort((left, right) => matchPriority[left] - matchPriority[right])[0];
  return {
    genreMatched: true,
    genreMatchMode,
    semanticGenreMatched: genreMatchMode === "semantic",
    semanticGenreReasons: [...new Set(reasons)],
  };
}

export function genreContractTokens(values = []) {
  const tokens = (Array.isArray(values) ? values : [values]).map(normalizeToken).filter(Boolean);
  const matched = new Set();
  for (const token of tokens) {
    for (const entry of GENRE_CONTRACT) {
      const aliases = [
        entry.value,
        entry.label,
        ...entry.aliases,
        ...entry.providerNames,
        ...entry.movie.exactIds,
        ...entry.tv.exactIds,
      ].map(normalizeToken);
      if (aliases.includes(token)) matched.add(entry.value);
    }
    if (token.startsWith("tmdb-genre-")) matched.add(token);
  }
  return [...matched];
}

export function genreValuesForItem(item = {}) {
  const targetType = providerType(item.mediaType || item.contentType || item.type);
  const ids = new Set((item.genreIds || item.genre_ids || []).map(Number).filter(Number.isFinite));
  return GENRE_CONTRACT
    .filter((entry) => entry[targetType].exactIds.some((id) => ids.has(id)))
    .map((entry) => entry.value);
}
