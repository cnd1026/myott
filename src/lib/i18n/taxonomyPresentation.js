import { DEFAULT_UI_LOCALE, normalizeUiLocale } from "./localeContract.js";
import { GENRE_CONTRACT } from "../recommendation/genres/genreContract.js";
import { PRIMARY_OTT_OPTIONS, RUNTIME_FILTERS } from "../recommendation/filters/hardFilterContract.js";

const EN_GENRE_LABELS = Object.freeze({
  "genre-action": "Action",
  "genre-sf": "Sci-Fi",
  "genre-drama": "Drama",
  "genre-romance": "Romance",
  "genre-mystery": "Mystery",
  "genre-thriller": "Thriller",
  "genre-comedy": "Comedy",
  "genre-horror": "Horror",
  "genre-crime": "Crime",
  "genre-adventure": "Adventure",
  "genre-fantasy": "Fantasy",
  "genre-war": "War",
  "genre-politics": "Politics",
  "genre-history": "History",
  "genre-western": "Western",
  "genre-music": "Music",
  "genre-documentary": "Documentary",
  "genre-action-adventure": "Action & Adventure",
  "genre-sf-fantasy": "Sci-Fi & Fantasy",
  "genre-war-politics": "War & Politics",
  "format-tv-movie": "TV Movie",
  "format-news": "News",
  "format-reality": "Reality",
  "format-talk": "Talk",
  "format-soap": "Soap",
  "genre-family": "Family",
  "audience-kids": "Kids",
  "style-animation": "Animation",
});

const KO_AUXILIARY_LABELS = Object.freeze({
  movie: "영화",
  drama: "드라마",
  animation: "애니",
  "country-kr": "한국",
  "country-us": "미국",
  "country-jp": "일본",
  "country-gb": "영국",
  "country-fr": "프랑스",
  "country-de": "독일",
  "country-cn": "중국",
  "country-hk": "홍콩",
  "country-tw": "대만",
  "country-in": "인도",
  "country-ca": "캐나다",
  "country-au": "호주",
  "country-es": "스페인",
  "country-it": "이탈리아",
  "country-th": "태국",
  "country-br": "브라질",
  "country-mx": "멕시코",
  "mood-light": "가볍게",
  "mood-moving": "여운 있게",
  "mood-tense": "긴장감",
  "runtime-short": "60분 이하",
  "runtime-medium": "2시간 이하",
  "runtime-long": "긴 작품 (2시간 이상)",
  "language-ko": "한국어",
  "language-en": "영어",
  "language-ja": "일본어",
});

const EN_AUXILIARY_LABELS = Object.freeze({
  movie: "Movies",
  drama: "TV Series",
  animation: "Animation",
  "country-kr": "South Korea",
  "country-us": "United States",
  "country-jp": "Japan",
  "country-gb": "United Kingdom",
  "country-fr": "France",
  "country-de": "Germany",
  "country-cn": "China",
  "country-hk": "Hong Kong",
  "country-tw": "Taiwan",
  "country-in": "India",
  "country-ca": "Canada",
  "country-au": "Australia",
  "country-es": "Spain",
  "country-it": "Italy",
  "country-th": "Thailand",
  "country-br": "Brazil",
  "country-mx": "Mexico",
  "mood-light": "Light",
  "mood-moving": "Moving",
  "mood-tense": "Tense",
  "runtime-short": "60 minutes or less",
  "runtime-medium": "2 hours or less",
  "runtime-long": "Long (2 hours or more)",
  "language-ko": "Korean",
  "language-en": "English",
  "language-ja": "Japanese",
});

const KO_GROUP_LABELS = Object.freeze({
  genre: "장르",
  country: "국가",
  mood: "분위기",
  runtime: "러닝타임",
  primaryGenre: "주요 장르",
  allGenre: "전체 장르",
  combinedGenre: "복합 장르",
  format: "작품 형식",
  audienceStyle: "시청 대상 / 스타일",
});

const EN_GROUP_LABELS = Object.freeze({
  genre: "Genre",
  country: "Country",
  mood: "Mood",
  runtime: "Runtime",
  primaryGenre: "Popular Genres",
  allGenre: "All Genres",
  combinedGenre: "Combined Genres",
  format: "Formats",
  audienceStyle: "Audience / Style",
});

const GROUP_ID_BY_KO_LABEL = Object.freeze(Object.fromEntries(
  Object.entries(KO_GROUP_LABELS).map(([id, label]) => [label, id]),
));
const KO_GENRE_VALUE_BY_LABEL = Object.freeze(Object.fromEntries(
  GENRE_CONTRACT.map(({ value, label }) => [label, value]),
));
const CANONICAL_OTT_LABELS = Object.freeze(Object.fromEntries(PRIMARY_OTT_OPTIONS));

export const CONTENT_TYPE_VALUES = Object.freeze(["movie", "drama", "animation"]);
export const COUNTRY_VALUES = Object.freeze(Object.keys(KO_AUXILIARY_LABELS).filter((value) => value.startsWith("country-")));
export const MOOD_VALUES = Object.freeze(["mood-light", "mood-moving", "mood-tense"]);
export const RUNTIME_VALUES = Object.freeze(Object.keys(RUNTIME_FILTERS));
export const LANGUAGE_VALUES = Object.freeze(["language-ko", "language-en", "language-ja"]);

function resolvedLocale(locale) {
  return normalizeUiLocale(locale) || DEFAULT_UI_LOCALE;
}

function labelsForLocale(locale) {
  return resolvedLocale(locale) === "en-US" ? EN_AUXILIARY_LABELS : KO_AUXILIARY_LABELS;
}

function groupLabelsForLocale(locale) {
  return resolvedLocale(locale) === "en-US" ? EN_GROUP_LABELS : KO_GROUP_LABELS;
}

export function taxonomyLabelForValue(value, locale = DEFAULT_UI_LOCALE) {
  const canonical = String(value || "").trim();
  if (!canonical) return "";
  const genre = GENRE_CONTRACT.find((entry) => entry.value === canonical);
  if (genre) return resolvedLocale(locale) === "en-US" ? EN_GENRE_LABELS[canonical] : genre.label;
  return labelsForLocale(locale)[canonical] || CANONICAL_OTT_LABELS[canonical] || "";
}

export function taxonomyGroupLabel(groupIdOrLabel, locale = DEFAULT_UI_LOCALE) {
  const groupId = GROUP_ID_BY_KO_LABEL[groupIdOrLabel] || groupIdOrLabel;
  return groupLabelsForLocale(locale)[groupId] || String(groupIdOrLabel || "");
}

export function taxonomyOptions(values, locale = DEFAULT_UI_LOCALE) {
  return values.map((value) => [value, taxonomyLabelForValue(value, locale)]);
}

export function genreOptionGroupsForLocale(locale = DEFAULT_UI_LOCALE) {
  const groups = ["primaryGenre", "allGenre", "combinedGenre", "format", "audienceStyle"];
  return groups.map((groupId) => ({
    title: taxonomyGroupLabel(groupId, locale),
    options: GENRE_CONTRACT
      .filter((entry) => GROUP_ID_BY_KO_LABEL[entry.displayGroup] === groupId)
      .sort((left, right) => left.displayPriority - right.displayPriority)
      .map((entry) => [entry.value, taxonomyLabelForValue(entry.value, locale)]),
  })).filter((group) => group.options.length);
}

export function taxonomyOptionGroupsForLocale(locale = DEFAULT_UI_LOCALE) {
  return [
    {
      title: taxonomyGroupLabel("genre", locale),
      options: taxonomyOptions(GENRE_CONTRACT.map(({ value }) => value), locale),
      optionSections: genreOptionGroupsForLocale(locale),
    },
    { title: taxonomyGroupLabel("country", locale), options: taxonomyOptions(COUNTRY_VALUES, locale) },
    { title: taxonomyGroupLabel("mood", locale), options: taxonomyOptions(MOOD_VALUES, locale) },
    { title: taxonomyGroupLabel("runtime", locale), options: taxonomyOptions(RUNTIME_VALUES, locale) },
  ];
}

export function localizeTaxonomyOptionGroups(groups = [], locale = DEFAULT_UI_LOCALE) {
  return groups.map((group) => ({
    ...group,
    title: taxonomyGroupLabel(group.title, locale),
    options: (group.options || []).map(([value, label]) => [
      value,
      taxonomyLabelForValue(value, locale) || label,
    ]),
    ...(Array.isArray(group.optionSections) ? {
      optionSections: group.optionSections.map((section) => ({
        ...section,
        title: taxonomyGroupLabel(section.title, locale),
        options: (section.options || []).map(([value, label]) => [
          value,
          taxonomyLabelForValue(value, locale) || label,
        ]),
      })),
    } : {}),
  }));
}

export function localizeGenreDisplayLabels(labels = [], locale = DEFAULT_UI_LOCALE) {
  if (resolvedLocale(locale) !== "en-US") return [...labels];
  return labels.map((label) => {
    const canonical = KO_GENRE_VALUE_BY_LABEL[label];
    return canonical ? EN_GENRE_LABELS[canonical] : label;
  });
}
