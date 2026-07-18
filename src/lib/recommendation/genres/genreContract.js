import {
  SEMANTIC_GENRE_SIGNALS,
  chooseSemanticSpecialization,
  semanticGenreEvidence,
  semanticRecommendationReason,
} from "./semanticGenreSignals.js";

const normalizeToken = (value) => String(value ?? "").trim().toLowerCase();
const uniqueNumbers = (values = []) => [...new Set(values.map(Number).filter(Number.isFinite))];
const uniqueStrings = (values = []) => [...new Set(values.filter(Boolean))];

const typePolicy = ({
  providerExactIds = [],
  providerCombinedIds = [],
  providerAdjacentIds = [],
  semanticRequired = false,
  semanticSpecialization = false,
  exactMatchPolicy = "provider-exact",
} = {}) => Object.freeze({
  providerExactIds: Object.freeze(providerExactIds),
  providerCombinedIds: Object.freeze(providerCombinedIds),
  providerAdjacentIds: Object.freeze(providerAdjacentIds),
  semanticRequired,
  semanticSpecialization,
  exactMatchPolicy,
  // Backward-compatible reads while all consumers move to the explicit taxonomy fields.
  exactIds: Object.freeze(uniqueNumbers([...providerExactIds, ...providerCombinedIds])),
  semanticAdjacentIds: Object.freeze(providerAdjacentIds),
});

const taxonomyOption = ({
  value,
  label,
  category = "narrative",
  displayGroup = "전체 장르",
  displayPriority,
  providerNames = [],
  aliases = [],
  legacyAliases = [],
  contentTypes = ["movie", "tv"],
  providerLimitation = "",
  specializationGroup = "",
  showInPrimaryGenre = false,
  movie = {},
  tv = {},
}) => Object.freeze({
  value,
  label,
  category,
  displayGroup,
  displayPriority,
  providerNames: Object.freeze(providerNames),
  aliases: Object.freeze(aliases),
  legacyAliases: Object.freeze(legacyAliases),
  contentTypes: Object.freeze(contentTypes),
  providerLimitation,
  specializationGroup,
  showInPrimaryGenre,
  movie: typePolicy(movie),
  tv: typePolicy(tv),
  semanticPolicy: Object.freeze({
    semanticRequired: Boolean(movie.semanticRequired || tv.semanticRequired),
    positiveSemanticSignals: Object.freeze([...(SEMANTIC_GENRE_SIGNALS[value]?.positive || [])]),
    negativeSemanticSignals: Object.freeze([...(SEMANTIC_GENRE_SIGNALS[value]?.negative || [])]),
    minimumSemanticEvidence: SEMANTIC_GENRE_SIGNALS[value]?.minimumEvidence || 0,
    providerLimitation,
    specializationGroup,
    exactMatchPolicy: Object.freeze({
      movie: movie.exactMatchPolicy || "provider-exact",
      tv: tv.exactMatchPolicy || "provider-exact",
    }),
  }),
});

const mainGenre = (config) => taxonomyOption({
  ...config,
  displayGroup: "주요 장르",
  showInPrimaryGenre: true,
});

export const GENRE_CONTRACT = Object.freeze([
  mainGenre({
    value: "genre-action", label: "액션", displayPriority: 1, providerNames: ["Action"], aliases: ["action", "액션"],
    specializationGroup: "action-adventure",
    movie: { providerExactIds: [28] },
    tv: { providerCombinedIds: [10759], semanticRequired: true, semanticSpecialization: true, exactMatchPolicy: "semantic-required" },
  }),
  mainGenre({
    value: "genre-sf", label: "SF", displayPriority: 2, providerNames: ["Science Fiction"], aliases: ["sf", "sci-fi", "science fiction"],
    specializationGroup: "sf-fantasy", providerLimitation: "TMDB TV combines Sci-Fi and Fantasy as genre 10765.",
    movie: { providerExactIds: [878] },
    tv: { providerCombinedIds: [10765], semanticRequired: true, semanticSpecialization: true, exactMatchPolicy: "semantic-required" },
  }),
  mainGenre({ value: "genre-drama", label: "드라마", displayPriority: 3, providerNames: ["Drama"], aliases: ["drama", "드라마"], movie: { providerExactIds: [18] }, tv: { providerExactIds: [18] } }),
  mainGenre({
    value: "genre-romance", label: "로맨스", displayPriority: 4, providerNames: ["Romance"], aliases: ["romance", "로맨스"],
    providerLimitation: "TMDB TV has no standalone Romance genre; Drama 18 is only a semantic candidate source.",
    movie: { providerExactIds: [10749] },
    tv: { providerAdjacentIds: [18], semanticRequired: true, exactMatchPolicy: "semantic-required" },
  }),
  mainGenre({ value: "genre-mystery", label: "미스터리", displayPriority: 5, providerNames: ["Mystery"], aliases: ["mystery", "미스터리"], movie: { providerExactIds: [9648] }, tv: { providerExactIds: [9648] } }),
  mainGenre({
    value: "genre-thriller", label: "스릴러", displayPriority: 6, providerNames: ["Thriller"], aliases: ["thriller", "스릴러"],
    providerLimitation: "TMDB TV has no standalone Thriller genre; Crime and Mystery are provider evidence and Action & Adventure requires semantic evidence.",
    movie: { providerExactIds: [53], providerAdjacentIds: [80, 9648] },
    tv: { providerCombinedIds: [80, 9648], providerAdjacentIds: [10759], exactMatchPolicy: "provider-evidence-allowed" },
  }),
  mainGenre({ value: "genre-comedy", label: "코미디", displayPriority: 7, providerNames: ["Comedy"], aliases: ["comedy", "코미디"], movie: { providerExactIds: [35] }, tv: { providerExactIds: [35] } }),
  mainGenre({
    value: "genre-horror", label: "공포", displayPriority: 8, providerNames: ["Horror"], aliases: ["horror", "공포"],
    providerLimitation: "TMDB TV has no standalone Horror genre; Mystery 9648 is only a semantic candidate source.",
    movie: { providerExactIds: [27], providerAdjacentIds: [53] },
    tv: { providerAdjacentIds: [9648], semanticRequired: true, exactMatchPolicy: "semantic-required" },
  }),

  taxonomyOption({ value: "genre-crime", label: "범죄", displayPriority: 20, providerNames: ["Crime"], aliases: ["crime", "범죄"], movie: { providerExactIds: [80], providerAdjacentIds: [53] }, tv: { providerExactIds: [80], providerAdjacentIds: [9648] } }),
  taxonomyOption({
    value: "genre-adventure", label: "모험", displayPriority: 21, providerNames: ["Adventure"], aliases: ["adventure", "모험"], specializationGroup: "action-adventure",
    movie: { providerExactIds: [12] },
    tv: { providerCombinedIds: [10759], semanticRequired: true, semanticSpecialization: true, exactMatchPolicy: "semantic-required" },
  }),
  taxonomyOption({
    value: "genre-fantasy", label: "판타지", displayPriority: 22, providerNames: ["Fantasy"], aliases: ["fantasy", "판타지"], specializationGroup: "sf-fantasy",
    providerLimitation: "TMDB TV combines Sci-Fi and Fantasy as genre 10765.",
    movie: { providerExactIds: [14] },
    tv: { providerCombinedIds: [10765], semanticRequired: true, semanticSpecialization: true, exactMatchPolicy: "semantic-required" },
  }),
  taxonomyOption({
    value: "genre-war", label: "전쟁", displayPriority: 23, providerNames: ["War"], aliases: ["war", "전쟁"], specializationGroup: "war-politics",
    movie: { providerExactIds: [10752] },
    tv: { providerCombinedIds: [10768], semanticRequired: true, semanticSpecialization: true, exactMatchPolicy: "semantic-required" },
  }),
  taxonomyOption({
    value: "genre-politics", label: "정치", displayPriority: 24, aliases: ["politics", "political", "정치"], specializationGroup: "war-politics",
    providerLimitation: "TMDB has no standalone Politics genre; semantic evidence is required.",
    movie: { providerAdjacentIds: [18, 36, 10752], semanticRequired: true, exactMatchPolicy: "semantic-required" },
    tv: { providerCombinedIds: [10768], semanticRequired: true, semanticSpecialization: true, exactMatchPolicy: "semantic-required" },
  }),
  taxonomyOption({ value: "genre-history", label: "역사", displayPriority: 25, providerNames: ["History"], aliases: ["history", "역사"], contentTypes: ["movie"], movie: { providerExactIds: [36] } }),
  taxonomyOption({ value: "genre-western", label: "서부", displayPriority: 26, providerNames: ["Western"], aliases: ["western", "서부"], movie: { providerExactIds: [37] }, tv: { providerExactIds: [37] } }),
  taxonomyOption({ value: "genre-music", label: "음악", displayPriority: 27, providerNames: ["Music"], aliases: ["music", "음악"], contentTypes: ["movie"], movie: { providerExactIds: [10402] } }),
  taxonomyOption({ value: "genre-documentary", label: "다큐멘터리", displayPriority: 28, providerNames: ["Documentary"], aliases: ["documentary", "다큐", "다큐멘터리"], movie: { providerExactIds: [99] }, tv: { providerExactIds: [99] } }),

  taxonomyOption({
    value: "genre-action-adventure", label: "액션·모험", category: "combined", displayGroup: "복합 장르", displayPriority: 40,
    providerNames: ["Action & Adventure"], aliases: ["action-adventure", "action & adventure", "액션·모험"], specializationGroup: "action-adventure",
    movie: { providerExactIds: [28, 12], exactMatchPolicy: "combined-any" },
    tv: { providerCombinedIds: [10759], exactMatchPolicy: "provider-combined-allowed" },
  }),
  taxonomyOption({
    value: "genre-sf-fantasy", label: "SF·판타지", category: "combined", displayGroup: "복합 장르", displayPriority: 41,
    providerNames: ["Sci-Fi & Fantasy"], aliases: ["sf-fantasy", "sf·판타지", "sf & fantasy"], specializationGroup: "sf-fantasy",
    providerLimitation: "TMDB TV combines Sci-Fi and Fantasy as genre 10765.",
    movie: { providerExactIds: [878, 14], exactMatchPolicy: "combined-any" },
    tv: { providerCombinedIds: [10765], exactMatchPolicy: "provider-combined-allowed" },
  }),
  taxonomyOption({
    value: "genre-war-politics", label: "전쟁·정치", category: "combined", displayGroup: "복합 장르", displayPriority: 42,
    providerNames: ["War & Politics"], aliases: ["war-politics", "war & politics", "전쟁·정치"], specializationGroup: "war-politics",
    movie: { providerExactIds: [10752], exactMatchPolicy: "combined-any" },
    tv: { providerCombinedIds: [10768], exactMatchPolicy: "provider-combined-allowed" },
  }),

  taxonomyOption({ value: "format-tv-movie", label: "TV 영화", category: "format", displayGroup: "작품 형식", displayPriority: 60, providerNames: ["TV Movie"], aliases: ["tv movie", "tv 영화"], legacyAliases: ["genre-tv-movie"], contentTypes: ["tv"], tv: { providerExactIds: [10770] } }),
  taxonomyOption({ value: "format-news", label: "뉴스", category: "format", displayGroup: "작품 형식", displayPriority: 61, providerNames: ["News"], aliases: ["news", "뉴스"], legacyAliases: ["genre-news"], contentTypes: ["tv"], tv: { providerExactIds: [10763] } }),
  taxonomyOption({ value: "format-reality", label: "리얼리티", category: "format", displayGroup: "작품 형식", displayPriority: 62, providerNames: ["Reality"], aliases: ["reality", "리얼리티"], legacyAliases: ["genre-reality"], contentTypes: ["tv"], tv: { providerExactIds: [10764] } }),
  taxonomyOption({ value: "format-talk", label: "토크", category: "format", displayGroup: "작품 형식", displayPriority: 63, providerNames: ["Talk"], aliases: ["talk", "토크"], legacyAliases: ["genre-talk"], contentTypes: ["tv"], tv: { providerExactIds: [10767] } }),
  taxonomyOption({ value: "format-soap", label: "소프", category: "format", displayGroup: "작품 형식", displayPriority: 64, providerNames: ["Soap"], aliases: ["soap", "소프"], legacyAliases: ["genre-soap"], contentTypes: ["tv"], tv: { providerExactIds: [10766] } }),

  taxonomyOption({ value: "genre-family", label: "가족", category: "audience", displayGroup: "시청 대상 / 스타일", displayPriority: 70, providerNames: ["Family"], aliases: ["family", "가족"], movie: { providerExactIds: [10751] }, tv: { providerExactIds: [10751] } }),
  taxonomyOption({ value: "audience-kids", label: "키즈", category: "audience", displayGroup: "시청 대상 / 스타일", displayPriority: 71, providerNames: ["Kids"], aliases: ["kids", "키즈"], legacyAliases: ["genre-kids"], contentTypes: ["tv"], tv: { providerExactIds: [10762] } }),
  taxonomyOption({ value: "style-animation", label: "애니메이션", category: "style", displayGroup: "시청 대상 / 스타일", displayPriority: 72, providerNames: ["Animation"], aliases: ["animation", "anime", "애니", "애니메이션"], legacyAliases: ["genre-animation"], movie: { providerExactIds: [16] }, tv: { providerExactIds: [16] } }),
]);

const aliasesToValue = new Map();
for (const entry of GENRE_CONTRACT) {
  [entry.value, entry.label, ...entry.aliases, ...entry.legacyAliases].forEach((alias) => {
    const key = normalizeToken(alias);
    if (key && !aliasesToValue.has(key)) aliasesToValue.set(key, entry.value);
  });
}

const contractByValue = new Map(GENRE_CONTRACT.map((entry) => [entry.value, entry]));
const providerNamePreference = new Map([
  ["action & adventure", "genre-action-adventure"],
  ["sci-fi & fantasy", "genre-sf-fantasy"],
  ["war & politics", "genre-war-politics"],
  ["drama", "genre-drama"],
  ["mystery", "genre-mystery"],
  ["crime", "genre-crime"],
  ["family", "genre-family"],
  ["kids", "audience-kids"],
  ["animation", "style-animation"],
]);
const contractByProviderName = new Map();
for (const entry of GENRE_CONTRACT) {
  contractByProviderName.set(normalizeToken(entry.label), entry);
  for (const providerName of entry.providerNames) {
    const key = normalizeToken(providerName);
    if (!contractByProviderName.has(key)) contractByProviderName.set(key, entry);
  }
}
for (const [name, value] of providerNamePreference) contractByProviderName.set(name, contractByValue.get(value));

const providerIdCanonicalValue = new Map([
  [28, "genre-action"], [12, "genre-adventure"], [878, "genre-sf"], [14, "genre-fantasy"],
  [10759, "genre-action-adventure"], [10765, "genre-sf-fantasy"], [10768, "genre-war-politics"],
  [18, "genre-drama"], [9648, "genre-mystery"], [80, "genre-crime"], [53, "genre-thriller"],
  [27, "genre-horror"], [16, "style-animation"], [10751, "genre-family"], [10762, "audience-kids"],
  [10752, "genre-war"], [10770, "format-tv-movie"], [10763, "format-news"], [10764, "format-reality"],
  [10767, "format-talk"], [10766, "format-soap"], [99, "genre-documentary"], [10402, "genre-music"],
  [36, "genre-history"], [37, "genre-western"], [35, "genre-comedy"], [10749, "genre-romance"],
]);

export const GENRE_TOP_EIGHT_VALUES = Object.freeze(
  GENRE_CONTRACT.filter((entry) => entry.showInPrimaryGenre)
    .sort((left, right) => left.displayPriority - right.displayPriority)
    .map((entry) => entry.value),
);
export const GENRE_TOP_EIGHT_OPTIONS = Object.freeze(
  GENRE_TOP_EIGHT_VALUES.map((value) => Object.freeze([value, contractByValue.get(value).label])),
);

export function normalizeTaxonomyValue(value) {
  const token = normalizeToken(value);
  if (token.startsWith("tmdb-genre-")) return token;
  return aliasesToValue.get(token) || "";
}

export function genreContractFor(value) {
  return contractByValue.get(normalizeTaxonomyValue(value)) || null;
}

export function genreValueForProviderName(name) {
  return contractByProviderName.get(normalizeToken(name))?.value || "";
}

export function genreValueForProviderId(id) {
  return providerIdCanonicalValue.get(Number(id)) || "";
}

export function genreLabelForValue(value) {
  return genreContractFor(value)?.label || "";
}

export function providerGenreLabelForId(id) {
  return genreLabelForValue(providerIdCanonicalValue.get(Number(id))) || "";
}

export function localizedGenreLabels(item = {}) {
  const labels = [];
  const append = (label) => {
    const normalized = String(label || "").trim();
    if (normalized && !labels.includes(normalized)) labels.push(normalized);
  };
  const ids = providerGenreIds(item);
  ids.forEach((id) => append(providerGenreLabelForId(id)));
  providerGenreNames(item).forEach((name) => {
    const value = genreValueForProviderName(name);
    append(value ? genreLabelForValue(value) : name);
  });
  return labels;
}

export function selectedTaxonomyFilters(filters = []) {
  return uniqueStrings(filters.map((filter) => {
    const value = String(filter || "");
    if (value.startsWith("tmdb-genre-")) return value;
    return normalizeTaxonomyValue(value);
  }));
}

export function selectedGenreFilters(filters = []) {
  return selectedTaxonomyFilters(filters);
}

function providerType(mediaType) {
  return ["tv", "drama", "series"].includes(String(mediaType || "").toLowerCase()) ? "tv" : "movie";
}

export function genreIdsForFilters(filters = [], mediaType = "movie", { includeAdjacent = false } = {}) {
  const targetType = providerType(mediaType);
  const ids = selectedTaxonomyFilters(filters).flatMap((filter) => {
    if (filter.startsWith("tmdb-genre-")) return [Number(filter.replace("tmdb-genre-", ""))];
    const contract = genreContractFor(filter);
    if (!contract) return [];
    const policy = contract[targetType];
    return [
      ...policy.providerExactIds,
      ...policy.providerCombinedIds,
      ...((includeAdjacent || policy.semanticRequired) ? policy.providerAdjacentIds : []),
    ];
  });
  return uniqueNumbers(ids);
}

export function prioritizeGenreOptions(options = []) {
  const priority = new Map(GENRE_CONTRACT.map((entry) => [entry.value, entry.displayPriority]));
  const seen = new Set();
  return [...options]
    .map((option) => {
      const value = Array.isArray(option) ? option[0] : option.value;
      const canonicalValue = normalizeTaxonomyValue(value) || value;
      return Array.isArray(option) ? [canonicalValue, option[1]] : { ...option, value: canonicalValue };
    })
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

function providerGenreIds(item = {}) {
  return uniqueNumbers([
    ...(item.providerGenreIds || []),
    ...(item.genreIds || []),
    ...(item.genre_ids || []),
  ]);
}

function providerGenreNames(item = {}) {
  return uniqueStrings([
    ...(item.providerGenreNames || []),
    ...(item.genres || []).map((genre) => typeof genre === "string" ? genre : genre?.name),
  ]);
}

function intersects(ids, candidates) {
  return candidates.some((id) => ids.includes(id));
}

const SPECIALIZATION_GROUPS = Object.freeze({
  "action-adventure": Object.freeze(["genre-action", "genre-adventure"]),
  "sf-fantasy": Object.freeze(["genre-sf", "genre-fantasy"]),
  "war-politics": Object.freeze(["genre-war", "genre-politics"]),
});

export function classifyTaxonomyValues(item = {}) {
  const targetType = providerType(item.mediaType || item.contentType || item.type);
  const ids = providerGenreIds(item);
  const canonicalGenreValues = [];
  const combinedGenreValues = [];
  const semanticGenreValues = [];
  const controlledSemanticGenreValues = [];
  const formatValues = [];
  const audienceValues = [];
  const styleValues = [];
  const semanticEvidenceByGenre = {};
  let primarySemanticGenreValue = "";

  for (const entry of GENRE_CONTRACT) {
    const policy = entry[targetType];
    const exact = intersects(ids, policy.providerExactIds);
    const combined = intersects(ids, policy.providerCombinedIds);

    if (entry.category === "combined" && (exact || combined)) combinedGenreValues.push(entry.value);
    if (entry.category === "format" && exact) formatValues.push(entry.value);
    if (entry.category === "audience" && exact) audienceValues.push(entry.value);
    if (entry.category === "style" && exact) styleValues.push(entry.value);
    if (entry.category === "narrative" && exact && !policy.semanticRequired) canonicalGenreValues.push(entry.value);

    if (policy.semanticRequired && !entry.specializationGroup && (exact || combined || intersects(ids, policy.providerAdjacentIds))) {
      const evidence = semanticGenreEvidence(item, entry.value);
      semanticEvidenceByGenre[entry.value] = evidence;
      if (evidence.matched) semanticGenreValues.push(entry.value);
    }
  }

  for (const [group, values] of Object.entries(SPECIALIZATION_GROUPS)) {
    const candidates = values.filter((value) => {
      const contract = contractByValue.get(value);
      const policy = contract[targetType];
      return policy.semanticSpecialization && intersects(ids, policy.providerCombinedIds);
    });
    if (!candidates.length) continue;
    const specialization = chooseSemanticSpecialization(item, candidates);
    specialization.evaluated.forEach((entry) => { semanticEvidenceByGenre[entry.value] = entry; });
    const selectedSpecializations = specialization.selected;
    const controlledSpecializations = group === "action-adventure" ? specialization.controlled : [];
    semanticGenreValues.push(...selectedSpecializations);
    controlledSemanticGenreValues.push(...controlledSpecializations);
    if (!primarySemanticGenreValue && specialization.primary) primarySemanticGenreValue = specialization.primary;
    if (selectedSpecializations.length) {
      const combinedValue = GENRE_CONTRACT.find((entry) => entry.category === "combined" && entry.specializationGroup === group)?.value;
      if (combinedValue && !combinedGenreValues.includes(combinedValue)) combinedGenreValues.push(combinedValue);
    }
  }

  return {
    providerGenreIds: ids,
    providerGenreNames: providerGenreNames(item),
    canonicalGenreValues: uniqueStrings(canonicalGenreValues),
    combinedGenreValues: uniqueStrings(combinedGenreValues),
    semanticGenreValues: uniqueStrings(semanticGenreValues),
    controlledSemanticGenreValues: uniqueStrings(controlledSemanticGenreValues),
    primarySemanticGenreValue,
    formatValues: uniqueStrings(formatValues),
    audienceValues: uniqueStrings(audienceValues),
    styleValues: uniqueStrings(styleValues),
    semanticEvidenceByGenre,
  };
}

const matchPriority = Object.freeze({
  "provider-exact": 1,
  "semantic-specialized": 2,
  semantic: 2,
  "provider-combined-controlled": 3,
  "provider-combined": 4,
  adjacent: 5,
  relaxed: 6,
});

export function candidateGenreMatchDetail(item = {}, filters = []) {
  const taxonomyFilters = selectedTaxonomyFilters(filters);
  const taxonomy = classifyTaxonomyValues(item);
  if (!taxonomyFilters.length) {
    return {
      genreMatched: true,
      genreMatchMode: "provider-exact",
      semanticGenreMatched: false,
      semanticGenreReasons: [],
      matchedTaxonomyValues: [],
      selectedTaxonomyValues: [],
      unmatchedSelectedTaxonomyValues: [],
      matchedSelectedGenreCount: 0,
      selectedGenreCount: 0,
      allSelectedGenresMatched: true,
      ...taxonomy,
    };
  }

  const targetType = providerType(item.mediaType || item.contentType || item.type);
  const ids = taxonomy.providerGenreIds;
  const matches = [];

  for (const filter of taxonomyFilters) {
    if (filter.startsWith("tmdb-genre-")) {
      const id = Number(filter.replace("tmdb-genre-", ""));
      if (ids.includes(id)) matches.push({ value: filter, mode: "provider-exact", reasons: [] });
      continue;
    }

    const contract = genreContractFor(filter);
    if (!contract) continue;
    const policy = contract[targetType];
    const allExactValues = [
      ...taxonomy.canonicalGenreValues,
      ...taxonomy.formatValues,
      ...taxonomy.audienceValues,
      ...taxonomy.styleValues,
    ];
    if (allExactValues.includes(contract.value)) {
      matches.push({ value: contract.value, mode: "provider-exact", reasons: [] });
      continue;
    }
    if (taxonomy.semanticGenreValues.includes(contract.value)) {
      matches.push({
        value: contract.value,
        mode: "semantic-specialized",
        reasons: taxonomy.semanticEvidenceByGenre[contract.value]?.reasons || [],
      });
      continue;
    }
    if (taxonomy.controlledSemanticGenreValues.includes(contract.value)) {
      matches.push({
        value: contract.value,
        mode: "provider-combined-controlled",
        reasons: taxonomy.semanticEvidenceByGenre[contract.value]?.reasons || [],
      });
      continue;
    }
    if (contract.category === "combined" && taxonomy.combinedGenreValues.includes(contract.value)) {
      matches.push({ value: contract.value, mode: "provider-combined", reasons: [`${contract.value}:provider-combined`] });
      continue;
    }

    const combinedEvidence = intersects(ids, policy.providerCombinedIds);
    if (combinedEvidence && policy.exactMatchPolicy === "provider-combined-allowed") {
      matches.push({ value: contract.value, mode: "provider-combined", reasons: [`${contract.value}:provider-combined`] });
      continue;
    }
    if (combinedEvidence && policy.exactMatchPolicy === "provider-evidence-allowed") {
      matches.push({ value: contract.value, mode: "provider-exact", reasons: [`${contract.value}:provider-evidence`] });
      continue;
    }

    const adjacentEvidence = intersects(ids, policy.providerAdjacentIds);
    if (adjacentEvidence) {
      const evidence = semanticGenreEvidence(item, contract.value);
      if (evidence.matched) matches.push({ value: contract.value, mode: "semantic-specialized", reasons: evidence.reasons });
    }
  }

  if (!matches.length) {
    return {
      genreMatched: false,
      genreMatchMode: "relaxed",
      semanticGenreMatched: false,
      semanticGenreReasons: [],
      matchedTaxonomyValues: [],
      selectedTaxonomyValues: taxonomyFilters,
      unmatchedSelectedTaxonomyValues: taxonomyFilters,
      matchedSelectedGenreCount: 0,
      selectedGenreCount: taxonomyFilters.length,
      allSelectedGenresMatched: false,
      ...taxonomy,
    };
  }

  matches.sort((left, right) => matchPriority[left.mode] - matchPriority[right.mode]);
  const best = matches[0];
  const matchedTaxonomyValues = uniqueStrings(matches.map((match) => match.value));
  const unmatchedSelectedTaxonomyValues = taxonomyFilters.filter((value) => !matchedTaxonomyValues.includes(value));
  const bestContract = genreContractFor(best.value);
  const combinedReasonValue = bestContract?.category === "combined"
    ? bestContract.value
    : GENRE_CONTRACT.find((entry) => (
      entry.category === "combined" &&
      entry.specializationGroup &&
      entry.specializationGroup === bestContract?.specializationGroup
    ))?.value;
  return {
    genreMatched: true,
    genreMatchMode: best.mode,
    semanticGenreMatched: ["semantic", "semantic-specialized"].includes(best.mode),
    semanticGenreReasons: uniqueStrings(matches.flatMap((match) => match.reasons)),
    matchedTaxonomyValues,
    matchedSemanticGenres: matchedTaxonomyValues.filter((value) => (
      taxonomy.semanticGenreValues.includes(value) || taxonomy.controlledSemanticGenreValues.includes(value)
    )),
    primarySemanticGenre: taxonomy.primarySemanticGenreValue || best.value,
    semanticConfidence: taxonomy.semanticEvidenceByGenre[best.value]?.confidence || (
      best.mode === "provider-combined" ? "provider-combined" : "none"
    ),
    selectedTaxonomyValues: taxonomyFilters,
    unmatchedSelectedTaxonomyValues,
    matchedSelectedGenreCount: matchedTaxonomyValues.length,
    selectedGenreCount: taxonomyFilters.length,
    allSelectedGenresMatched: unmatchedSelectedTaxonomyValues.length === 0,
    providerCombinedFallbackReason: best.mode === "provider-combined-controlled"
      ? `${best.value}:controlled-provider-combined`
      : "",
    recommendationReason: ["semantic", "semantic-specialized"].includes(best.mode)
      ? semanticRecommendationReason(best.value)
      : best.mode === "provider-combined-controlled"
        ? `TMDB의 통합 ${genreLabelForValue(combinedReasonValue || best.value)} 분류와 ${genreLabelForValue(best.value)} 관련 신호를 함께 반영한 추천입니다.`
      : best.mode === "provider-combined"
        ? `TMDB의 통합 ${genreLabelForValue(combinedReasonValue || best.value)} 분류를 반영한 추천입니다.`
        : "",
    ...taxonomy,
  };
}

export function genreMatchStrength(item = {}, filters = []) {
  const match = candidateGenreMatchDetail(item, filters);
  return {
    ...match,
    strength: {
      "provider-exact": 1,
      "semantic-specialized": 0.85,
      semantic: 0.85,
      "provider-combined-controlled": 0.72,
      "provider-combined": 0.65,
      adjacent: 0.35,
      relaxed: 0,
    }[match.genreMatchMode] ?? 0,
  };
}

export function genreContractTokens(values = []) {
  const tokens = (Array.isArray(values) ? values : [values]).map(normalizeToken).filter(Boolean);
  const matched = new Set();
  for (const token of tokens) {
    const direct = normalizeTaxonomyValue(token);
    if (direct) {
      matched.add(direct);
      continue;
    }
    const providerValue = genreValueForProviderName(token);
    if (providerValue) {
      matched.add(providerValue);
      continue;
    }
    const numeric = Number(token.replace(/^tmdb-genre-/, ""));
    if (Number.isFinite(numeric) && providerIdCanonicalValue.has(numeric)) matched.add(providerIdCanonicalValue.get(numeric));
    else if (token.startsWith("tmdb-genre-")) matched.add(token);
  }
  return [...matched];
}

export function genreValuesForItem(item = {}) {
  const taxonomy = classifyTaxonomyValues(item);
  return uniqueStrings([
    ...taxonomy.canonicalGenreValues,
    ...taxonomy.semanticGenreValues,
    ...taxonomy.controlledSemanticGenreValues,
    ...taxonomy.combinedGenreValues,
    ...taxonomy.formatValues,
    ...taxonomy.audienceValues,
    ...taxonomy.styleValues,
  ]);
}

export function genreOptionGroups() {
  const groupOrder = ["주요 장르", "전체 장르", "복합 장르", "작품 형식", "시청 대상 / 스타일"];
  return groupOrder.map((title) => ({
    title,
    options: GENRE_CONTRACT
      .filter((entry) => entry.displayGroup === title)
      .sort((left, right) => left.displayPriority - right.displayPriority)
      .map((entry) => [entry.value, entry.label]),
  })).filter((group) => group.options.length);
}
