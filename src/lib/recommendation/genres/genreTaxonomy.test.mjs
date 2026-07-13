import assert from "node:assert/strict";
import test from "node:test";

import {
  candidateGenreMatchDetail,
  classifyTaxonomyValues,
  genreContractFor,
  genreMatchStrength,
  genreOptionGroups,
  normalizeTaxonomyValue,
} from "./genreContract.js";
import { calculateRecommendationScore } from "../scoring/recommendationWeightEngine.js";
import { classifyCandidate } from "../candidates/candidatePipeline.js";

const fixture = (genreIds, keywords = [], extra = {}) => ({
  mediaType: "tv",
  contentType: "drama",
  genreIds,
  keywords,
  ...extra,
});

test("10759 specializes action and adventure without assigning every shared value", () => {
  const action = classifyTaxonomyValues(fixture([10759], ["martial arts", "chase"]));
  const adventure = classifyTaxonomyValues(fixture([10759], ["expedition", "treasure"]));
  const ambiguous = classifyTaxonomyValues(fixture([10759], []));

  assert.deepEqual(action.semanticGenreValues, ["genre-action"]);
  assert.deepEqual(adventure.semanticGenreValues, ["genre-adventure"]);
  assert.deepEqual(ambiguous.semanticGenreValues, []);
  assert.deepEqual(action.combinedGenreValues, ["genre-action-adventure"]);
});

test("10765 specializes SF and fantasy while retaining the provider combined value", () => {
  const sf = classifyTaxonomyValues(fixture([10765], ["space", "robot"]));
  const fantasy = classifyTaxonomyValues(fixture([10765], ["magic", "dragon"]));
  const ambiguous = classifyTaxonomyValues(fixture([10765], []));

  assert.deepEqual(sf.semanticGenreValues, ["genre-sf"]);
  assert.deepEqual(fantasy.semanticGenreValues, ["genre-fantasy"]);
  assert.deepEqual(ambiguous.semanticGenreValues, []);
  assert.deepEqual(ambiguous.combinedGenreValues, ["genre-sf-fantasy"]);
});

test("10768 specializes war and politics without automatic dual assignment", () => {
  const war = classifyTaxonomyValues(fixture([10768], ["army", "soldier"]));
  const politics = classifyTaxonomyValues(fixture([10768], ["election", "parliament"]));

  assert.deepEqual(war.semanticGenreValues, ["genre-war"]);
  assert.deepEqual(politics.semanticGenreValues, ["genre-politics"]);
  assert.ok(war.combinedGenreValues.includes("genre-war-politics"));
});

test("plain TV Drama is not Romance without semantic evidence", () => {
  const plain = fixture([18], [], { overview: "A family rebuilds a neighborhood business." });
  const romance = fixture([18], ["first love", "romantic relationship"]);

  assert.equal(candidateGenreMatchDetail(plain, ["genre-romance"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail(romance, ["genre-romance"]).genreMatchMode, "semantic-specialized");
  assert.deepEqual(classifyTaxonomyValues(plain).canonicalGenreValues, ["genre-drama"]);
});

test("plain TV Mystery is not Horror without semantic evidence", () => {
  const plain = fixture([9648], ["investigation"]);
  const horror = fixture([9648], ["ghost", "haunting"]);

  assert.equal(candidateGenreMatchDetail(plain, ["genre-horror"]).genreMatched, false);
  assert.equal(candidateGenreMatchDetail(horror, ["genre-horror"]).genreMatchMode, "semantic-specialized");
  assert.deepEqual(classifyTaxonomyValues(plain).canonicalGenreValues, ["genre-mystery"]);
});

test("format, audience, and style values never become narrative canonical genres", () => {
  const format = classifyTaxonomyValues(fixture([10763, 10764, 10767, 10766]));
  const audience = classifyTaxonomyValues(fixture([10751, 10762]));
  const style = classifyTaxonomyValues(fixture([16]));

  assert.deepEqual(format.canonicalGenreValues, []);
  assert.deepEqual(format.formatValues, ["format-news", "format-reality", "format-talk", "format-soap"]);
  assert.deepEqual(audience.audienceValues, ["genre-family", "audience-kids"]);
  assert.deepEqual(style.styleValues, ["style-animation"]);
});

test("legacy filters resolve to canonical format, audience, and style values", () => {
  assert.equal(normalizeTaxonomyValue("genre-tv-movie"), "format-tv-movie");
  assert.equal(normalizeTaxonomyValue("genre-news"), "format-news");
  assert.equal(normalizeTaxonomyValue("genre-kids"), "audience-kids");
  assert.equal(normalizeTaxonomyValue("genre-animation"), "style-animation");
  assert.equal(genreContractFor("genre-reality").category, "format");
});

test("genre match strength orders exact, semantic specialization, combined, and relaxed", () => {
  const exact = genreMatchStrength({ mediaType: "movie", genreIds: [28] }, ["genre-action"]);
  const semantic = genreMatchStrength(fixture([10759], ["martial arts"]), ["genre-action"]);
  const combined = genreMatchStrength(fixture([10765]), ["genre-sf"]);
  const relaxed = genreMatchStrength(fixture([18]), ["genre-horror"]);

  assert.ok(exact.strength > semantic.strength);
  assert.ok(semantic.strength > combined.strength);
  assert.ok(combined.strength > relaxed.strength);
});

test("animation content type and animation style do not duplicate the genre signal", () => {
  const score = calculateRecommendationScore(
    { mediaType: "tv", contentType: "animation", genreIds: [16], rating: 8 },
    { contentTypes: ["animation"], filters: ["genre-animation"] },
  );
  assert.equal(score.signals.contentTypeMatch, 1);
  assert.equal(score.signals.genreMatch, 0.5);

  const animatedMovie = { mediaType: "movie", genreIds: [16] };
  const animatedTv = { mediaType: "tv", genreIds: [16] };
  assert.equal(classifyCandidate(animatedMovie, { contentTypes: ["movie"], filters: [] }).contentTypeMatched, false);
  assert.equal(classifyCandidate(animatedMovie, { contentTypes: ["movie"], filters: ["genre-animation"] }).contentTypeMatched, true);
  assert.equal(classifyCandidate(animatedTv, { contentTypes: ["drama"], filters: ["style-animation"] }).contentTypeMatched, true);
});

test("expanded genre options preserve the established primary eight and taxonomy groups", () => {
  const groups = genreOptionGroups();
  assert.deepEqual(groups.map((group) => group.title), [
    "주요 장르",
    "전체 장르",
    "복합 장르",
    "작품 형식",
    "시청 대상 / 스타일",
  ]);
  assert.deepEqual(groups[0].options.map(([value]) => value), [
    "genre-action", "genre-sf", "genre-drama", "genre-romance",
    "genre-mystery", "genre-thriller", "genre-comedy", "genre-horror",
  ]);
});
