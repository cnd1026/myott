import assert from "node:assert/strict";
import test from "node:test";

import { createLatestRequestGate } from "./latestRequestGate.js";

test("latest recommendation response is the only response allowed to commit", () => {
  const gate = createLatestRequestGate();
  const first = gate.begin();
  const second = gate.begin();
  assert.equal(first.signal.aborted, true);
  assert.equal(gate.canCommit(second.sequence), true);
  assert.equal(gate.canCommit(first.sequence), false);
  assert.equal(gate.diagnostics().staleCommitCount, 1);
});

test("closing related detail aborts its pending request", () => {
  const gate = createLatestRequestGate();
  const request = gate.begin();
  gate.abort();
  assert.equal(request.signal.aborted, true);
  assert.equal(gate.canCommit(request.sequence), false);
});
