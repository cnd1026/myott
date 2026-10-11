import assert from "node:assert/strict";
import test from "node:test";

import { selectLiveQaCases } from "./liveCaseSelection.js";

const available = [{ id: "REC-QA-086" }, { id: "REC-QA-087" }, { id: "LIVE-D1A-001" }];

test("Live QA defaults to the full nonempty supported case set", () => {
  assert.deepEqual(selectLiveQaCases(available), available);
  assert.deepEqual(selectLiveQaCases(available, new Set(["REC-QA-086"])), [available[0]]);
});

test("Live QA rejects unknown, mixed-known-unknown and out-of-scope selections", () => {
  for (const requested of [
    new Set(["UNKNOWN"]),
    new Set(["REC-QA-086", "UNKNOWN"]),
    new Set(["REC-QA-091"]),
  ]) {
    assert.throws(() => selectLiveQaCases(available, requested), /INVALID_SELECTION/);
  }
});

test("Live QA rejects an empty or structurally invalid eligible case set", () => {
  assert.throws(() => selectLiveQaCases([]), /INVALID_SELECTION/);
  assert.throws(() => selectLiveQaCases([{ id: "same" }, { id: "same" }]), /INVALID_SELECTION/);
  assert.throws(() => selectLiveQaCases([{ id: null }]), /INVALID_SELECTION/);
});
