const candidates = [
  ["910001", "movie", "movie", "QA First Pick Movie A"],
  ["910002", "tv", "drama", "QA First Pick Drama A"],
  ["910003", "movie", "animation", "QA First Pick Animation A"],
  ["910004", "movie", "movie", "QA First Pick Movie B"],
  ["910005", "tv", "drama", "QA First Pick Drama B"],
  ["910006", "tv", "animation", "QA First Pick Animation B"],
].map(([providerContentId, providerMediaType, displayContentType, title], index) => ({
  id: `tmdb:${providerMediaType}:${providerContentId}`,
  providerId: "tmdb",
  providerContentId,
  tmdbId: Number(providerContentId),
  providerMediaType,
  displayContentType,
  title,
  originalTitle: title,
  year: 2020 + index,
  poster: "",
  backdrop: "",
  genres: [displayContentType],
  genre: displayContentType,
  runtime: providerMediaType === "movie" ? 110 : 50,
  rating: 7.1 + index / 10,
  platforms: [],
  ott: [],
  synopsis: "Deterministic local Browser QA fixture.",
  source: "tmdb",
}));

export const firstPickBrowserFixtureProvider = Object.freeze({
  id: "tmdb",
  name: "TMDB Browser QA Fixture",
  isEnabled: () => true,
  async getFirstPicks() {
    return { results: candidates.map((item) => ({ ...item })) };
  },
});
