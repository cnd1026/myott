import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSelectedOptionReason,
  contentTypeMatchesSelection,
  dedupePrimaryDisplayTitles,
  presentationGenreLabels,
} from "./recommendationPresentation.js";

test("provider combined genre labels use Korean canonical presentation", () => {
  assert.deepEqual(
    presentationGenreLabels({
      providerGenreIds: [10759, 10765, 10768],
      providerGenreNames: ["Action & Adventure", "Sci-Fi & Fantasy", "War & Politics"],
    }),
    ["액션·모험", "SF·판타지", "전쟁·정치"],
  );
});

test("selected option reason uses only genres that actually matched", () => {
  const action = buildSelectedOptionReason({
    matchedTaxonomyValues: ["genre-action"],
  }, ["genre-action", "genre-sf"]);
  const sf = buildSelectedOptionReason({
    matchedTaxonomyValues: ["genre-sf"],
  }, ["genre-action", "genre-sf"]);
  const dual = buildSelectedOptionReason({
    matchedTaxonomyValues: ["genre-action", "genre-sf"],
  }, ["genre-action", "genre-sf"]);

  assert.match(action, /액션/);
  assert.doesNotMatch(action, /SF/);
  assert.match(sf, /미래|우주|SF/);
  assert.doesNotMatch(sf, /액션/);
  assert.match(dual, /액션과 SF/);
});

test("primary presentation removes duplicate TMDB content and duplicate Korean titles", () => {
  const results = dedupePrimaryDisplayTitles([
    { providerId: "tmdb", mediaType: "tv", tmdbId: 2, title: "닥터 후", year: 2005 },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 1, title: "닥터 후", year: 1963 },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 2, title: "Doctor Who", year: 2005 },
  ]);

  assert.equal(results.length, 1);
  assert.equal(results.filter((item) => item.title === "닥터 후").length, 1);
});

test("content type presentation keeps movie, drama, and animation provider paths separate", () => {
  assert.equal(contentTypeMatchesSelection({ mediaType: "tv", genreIds: [10759] }, ["drama"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "movie", genreIds: [28] }, ["drama"]), false);
  assert.equal(contentTypeMatchesSelection({ mediaType: "movie", genreIds: [28] }, ["movie"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "tv", genreIds: [16, 10759] }, ["animation"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "tv", genreIds: [10759] }, ["animation"]), false);
  assert.equal(contentTypeMatchesSelection({ mediaType: "movie", genreIds: [16] }, ["movie"], ["style-animation"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "tv", genreIds: [16] }, ["drama"], ["style-animation"]), true);
  assert.equal(contentTypeMatchesSelection({ mediaType: "movie", genreIds: [16] }, ["drama"], ["style-animation"]), false);
});
