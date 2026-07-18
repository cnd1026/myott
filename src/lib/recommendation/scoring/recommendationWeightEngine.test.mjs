import assert from "node:assert/strict";
import test from "node:test";

import { calculateRecommendationScore } from "./recommendationWeightEngine.js";

function runtimeSignal(runtime, filter) {
  return calculateRecommendationScore(
    { runtime, mediaType: "movie", type: "movie" },
    { filters: [filter], contentTypes: ["movie"] },
  ).signals.runtimeMatch;
}

test("weight runtime signal uses the shared hard-filter ranges", () => {
  assert.equal(runtimeSignal(45, "runtime-medium"), 1);
  assert.equal(runtimeSignal(100, "runtime-medium"), 1);
  assert.equal(runtimeSignal(130, "runtime-medium"), 0);
  assert.equal(runtimeSignal(130, "runtime-long"), 0);
  assert.equal(runtimeSignal(150, "runtime-long"), 1);
});
