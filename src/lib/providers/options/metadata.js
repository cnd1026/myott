import { getTmdbGenreMetadata, hasTmdbKey } from "../../../../lib/tmdb";

export const fallbackCountryOptions = [
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

export const fallbackOptionGroups = [
  {
    title: "장르",
    source: "fallback",
    options: [
      ["genre-sf", "SF"],
      ["genre-romance", "로맨스"],
      ["genre-thriller", "스릴러"],
    ],
  },
  {
    title: "국가",
    source: "fallback",
    options: fallbackCountryOptions,
  },
  {
    title: "분위기",
    source: "fallback",
    options: [
      ["mood-light", "가볍게"],
      ["mood-moving", "여운 있게"],
      ["mood-tense", "긴장감"],
    ],
  },
  {
    title: "러닝타임",
    source: "fallback",
    options: [
      ["runtime-short", "60분 이하"],
      ["runtime-medium", "2시간 이하"],
      ["runtime-long", "긴 작품"],
    ],
  },
];

export const fallbackLanguageOptions = [
  ["language-ko", "한국어"],
  ["language-en", "영어"],
  ["language-ja", "일본어"],
];

const genreValueByName = new Map([
  ["Action", "genre-action"],
  ["Action & Adventure", "genre-action-adventure"],
  ["Adventure", "genre-adventure"],
  ["Animation", "genre-animation"],
  ["Comedy", "genre-comedy"],
  ["Crime", "genre-crime"],
  ["Drama", "genre-drama"],
  ["Family", "genre-family"],
  ["Fantasy", "genre-fantasy"],
  ["Horror", "genre-horror"],
  ["Mystery", "genre-mystery"],
  ["Romance", "genre-romance"],
  ["Science Fiction", "genre-sf"],
  ["Sci-Fi & Fantasy", "genre-sf-fantasy"],
  ["Thriller", "genre-thriller"],
  ["TV Movie", "genre-tv-movie"],
  ["Kids", "genre-kids"],
  ["Reality", "genre-reality"],
  ["Talk", "genre-talk"],
  ["Soap", "genre-soap"],
  ["News", "genre-news"],
  ["War & Politics", "genre-war-politics"],
]);

const genreOrder = [
  "genre-action",
  "genre-action-adventure",
  "genre-sf",
  "genre-sf-fantasy",
  "genre-thriller",
  "genre-horror",
  "genre-crime",
  "genre-fantasy",
  "genre-adventure",
  "genre-drama",
  "genre-romance",
  "genre-comedy",
  "genre-mystery",
  "genre-family",
  "genre-animation",
  "tmdb-genre-99",
  "genre-news",
  "genre-reality",
  "genre-talk",
  "genre-tv-movie",
  "genre-soap",
  "genre-war-politics",
];

function normalizeGenreName(name) {
  const mapping = {
    Action: "액션",
    "Action & Adventure": "액션·모험",
    Adventure: "모험",
    Animation: "애니메이션",
    Comedy: "코미디",
    Crime: "범죄",
    Drama: "드라마",
    Family: "가족",
    Fantasy: "판타지",
    Horror: "공포",
    Mystery: "미스터리",
    Romance: "로맨스",
    "Science Fiction": "SF",
    "Sci-Fi & Fantasy": "SF·판타지",
    "TV Movie": "TV 영화",
    Thriller: "스릴러",
    Kids: "키즈",
    Reality: "리얼리티",
    Talk: "토크",
    Soap: "소프",
    News: "뉴스",
    "War & Politics": "전쟁·정치",
  };

  return mapping[name] || name;
}

function sortGenreOptions(left, right) {
  const leftOrder = genreOrder.indexOf(left.value);
  const rightOrder = genreOrder.indexOf(right.value);
  const normalizedLeftOrder = leftOrder === -1 ? 100 : leftOrder;
  const normalizedRightOrder = rightOrder === -1 ? 100 : rightOrder;

  return normalizedLeftOrder - normalizedRightOrder || left.label.localeCompare(right.label, "ko");
}

function optionValueForGenre(genre) {
  return genreValueByName.get(genre.name) || `tmdb-genre-${genre.id}`;
}

function normalizeGenreOptions(metadata) {
  const genres = new Map();

  for (const contentType of ["movie", "tv"]) {
    for (const genre of metadata[contentType] || []) {
      const value = optionValueForGenre(genre);
      const current = genres.get(value) || {
        value,
        label: normalizeGenreName(genre.name),
        source: "tmdb",
        tmdbIds: [],
        contentTypes: [],
      };

      if (!current.tmdbIds.includes(genre.id)) current.tmdbIds.push(genre.id);
      if (!current.contentTypes.includes(contentType)) current.contentTypes.push(contentType);
      genres.set(value, current);
    }
  }

  return Array.from(genres.values()).sort(sortGenreOptions);
}

function toLegacyOptions(options) {
  return options.map((option) => [option.value, option.label]);
}

export async function getOptionMetadata() {
  if (!hasTmdbKey()) {
    return {
      source: "fallback",
      tmdbEnabled: false,
      groups: fallbackOptionGroups,
      metadata: {
        genres: [],
        countries: fallbackCountryOptions,
        languages: fallbackLanguageOptions,
      },
      message: "TMDB API key is not configured. Fallback option metadata is used.",
    };
  }

  try {
    const tmdbGenres = await getTmdbGenreMetadata();
    const genreOptions = normalizeGenreOptions(tmdbGenres);

    return {
      source: "tmdb",
      tmdbEnabled: true,
      groups: [
        {
          title: "장르",
          source: "tmdb",
          options: toLegacyOptions(genreOptions),
        },
        ...fallbackOptionGroups.filter((group) => group.title !== "장르"),
      ],
      metadata: {
        genres: genreOptions,
        countries: fallbackCountryOptions,
        languages: fallbackLanguageOptions,
      },
    };
  } catch (error) {
    return {
      source: "fallback",
      tmdbEnabled: true,
      groups: fallbackOptionGroups,
      metadata: {
        genres: [],
        countries: fallbackCountryOptions,
        languages: fallbackLanguageOptions,
      },
      message: error instanceof Error ? `${error.message} Fallback option metadata is used.` : "Fallback option metadata is used.",
    };
  }
}
