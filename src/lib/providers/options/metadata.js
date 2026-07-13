import { getTmdbGenreMetadata, hasTmdbKey } from "../../../../lib/tmdb";
import {
  GENRE_CONTRACT,
  genreLabelForValue,
  genreValueForProviderName,
  prioritizeGenreOptions,
} from "../../recommendation/genres/genreContract.js";

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
    options: GENRE_CONTRACT.map((entry) => [entry.value, entry.label]),
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

function normalizeGenreOptions(metadata) {
  const genres = new Map(GENRE_CONTRACT.map((entry) => [entry.value, {
    value: entry.value,
    label: entry.label,
    source: "contract",
    tmdbIds: [...new Set([...entry.movie.exactIds, ...entry.tv.exactIds])],
    contentTypes: [...entry.contentTypes],
    providerLimitation: entry.providerLimitation,
  }]));

  for (const contentType of ["movie", "tv"]) {
    for (const genre of metadata[contentType] || []) {
      const value = genreValueForProviderName(genre.name) || `tmdb-genre-${genre.id}`;
      const current = genres.get(value) || {
        value,
        label: genreLabelForValue(value) || genre.name,
        source: "tmdb",
        tmdbIds: [],
        contentTypes: [],
      };

      if (!current.tmdbIds.includes(genre.id)) current.tmdbIds.push(genre.id);
      if (!current.contentTypes.includes(contentType)) current.contentTypes.push(contentType);
      genres.set(value, current);
    }
  }

  return prioritizeGenreOptions(Array.from(genres.values()));
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
