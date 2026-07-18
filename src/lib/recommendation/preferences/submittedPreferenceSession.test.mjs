import assert from "node:assert/strict";
import test from "node:test";

import {
  createRecommendationSession,
  createSubmittedPreferences,
  preferencesChanged,
} from "./submittedPreferenceSession.js";

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
