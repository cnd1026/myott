import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialPreferenceDraft,
  createRecommendationSession,
  createSubmittedPreferences,
  preferencesChanged,
} from "./submittedPreferenceSession.js";
import { buildSeedRequestPayload } from "../seeds/seedRequest.js";

test("initial and reset preference drafts do not activate an OTT hard filter", () => {
  const initial = createInitialPreferenceDraft();
  initial.ottProviders.push("netflix");
  const reset = createInitialPreferenceDraft();
  assert.deepEqual(reset.ottProviders, []);
  assert.deepEqual(reset.filters, []);
  assert.deepEqual(reset.contentTypes, ["movie", "drama", "animation"]);
});

test("submitted preferences are detached from later draft mutation", () => {
  const draft = { titles: ["인터스텔라"], contentTypes: ["movie"], filters: ["genre-action"], ottProviders: ["netflix"] };
  const submitted = createSubmittedPreferences(draft);
  draft.filters[0] = "genre-adventure";
  assert.deepEqual(submitted.filters, ["genre-action"]);
  assert.equal(preferencesChanged(draft, submitted), true);
});

test("recommendation session keeps request identity and submitted snapshot", () => {
  const session = createRecommendationSession({
    requestId: "request-2",
    requestSequence: 2,
    endpoint: "/api/recommend/options",
    submittedPreferences: { contentTypes: ["drama"], filters: ["genre-action"] },
    results: [{ title: "A" }],
  });
  assert.equal(session.requestId, "request-2");
  assert.equal(session.requestSequence, 2);
  assert.equal(session.endpoint, "/api/recommend/options");
  assert.deepEqual(session.submittedPreferences.filters, ["genre-action"]);
});

test("set ordering does not make equivalent preferences dirty", () => {
  assert.equal(preferencesChanged(
    { contentTypes: ["movie", "drama"], filters: ["genre-sf", "runtime-short"] },
    { contentTypes: ["drama", "movie"], filters: ["runtime-short", "genre-sf"] },
  ), false);
});

test("blank submitted rows do not move confirmed TMDB identities to another title", () => {
  const draft = {
    titles: ["", "B", " ", "C", "D"],
    confirmedSeeds: {
      0: { tmdbId: 999, mediaType: "movie" },
      1: { tmdbId: 111, mediaType: "movie", title: "B" },
      3: { tmdbId: 222, mediaType: "tv", title: "C" },
    },
    contentTypes: ["movie", "drama"],
  };
  const submitted = createSubmittedPreferences(draft);
  assert.deepEqual(submitted.titles, ["B", "C", "D"]);
  assert.deepEqual(Object.keys(submitted.confirmedSeeds), ["0", "1"]);
  const payload = buildSeedRequestPayload(submitted);
  assert.deepEqual(payload.seeds.map(({ inputTitle, tmdbId, mediaType }) =>
    ({ inputTitle, tmdbId, mediaType })), [
    { inputTitle: "B", tmdbId: 111, mediaType: "movie" },
    { inputTitle: "C", tmdbId: 222, mediaType: "tv" },
  ]);
  assert.deepEqual(payload.titles, ["D"]);

  draft.confirmedSeeds[1].tmdbId = 444;
  assert.equal(buildSeedRequestPayload(submitted).seeds[0].tmdbId, 111);
});

test("a removed first or middle row does not turn a later title into an earlier confirmed seed", () => {
  for (const titles of [["", "B", "C"], ["A", "", "C"]]) {
    const confirmedSeeds = titles[0] === ""
      ? { 1: { tmdbId: 11, mediaType: "movie" } }
      : { 0: { tmdbId: 11, mediaType: "movie" } };
    const payload = buildSeedRequestPayload(createSubmittedPreferences({ titles, confirmedSeeds }));
    assert.deepEqual(payload.seeds.map((item) => item.inputTitle), [titles[0] === "" ? "B" : "A"]);
    assert.deepEqual(payload.titles, ["C"]);
  }
});
