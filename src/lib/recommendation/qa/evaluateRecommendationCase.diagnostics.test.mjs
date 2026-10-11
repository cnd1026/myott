import assert from "node:assert/strict";
import test from "node:test";

import { evaluateRecommendationCase } from "./evaluateRecommendationCase.js";

const result = [{ title: "A", contentType: "movie" }];
const evaluate = (expected, diagnostics) => evaluateRecommendationCase(
  { id: "QA-DIAGNOSTIC", expected: { topN: 1, ...expected } },
  result,
  { diagnostics },
);

test("required request count and elapsed time cannot silently become zero", () => {
  for (const [expected, key] of [
    [{ maximumTmdbRequestCount: 24 }, "maximumTmdbRequestCount"],
    [{ maximumListRequestCount: 8 }, "maximumListRequestCount"],
    [{ maximumDetailRequestCount: 16 }, "maximumDetailRequestCount"],
    [{ requestContextCount: 1 }, "requestContextCount"],
    [{ maximumElapsedMs: 15_000 }, "maximumElapsedMs"],
  ]) {
    const missing = evaluate(expected, {});
    assert.equal(missing.pass, false);
    assert.ok(missing.failedReasons.includes(`MISSING_DIAGNOSTIC:${key}`));
  }
});

test("invalid asserted counters and missing boolean evidence cannot pass", () => {
  for (const bad of [null, "0", NaN, -1]) {
    const report = evaluate({ maximumElapsedMs: 15_000 }, { elapsedMs: bad });
    assert.ok(report.failedReasons.includes("INVALID_DIAGNOSTIC:maximumElapsedMs"));
  }
  for (const field of ["inputLanguagePreserved", "genreOptionOrderMatched", "emptyStateMessageMatched"]) {
    assert.ok(evaluate({ [field]: true }, {}).failedReasons.includes(`MISSING_DIAGNOSTIC:${field}`));
  }
  assert.ok(evaluate({ deadlineExceeded: false }, {}).failedReasons.includes("MISSING_DIAGNOSTIC:deadlineExceeded"));
});

test("valid zero counters and explicit false flags remain distinguishable", () => {
  const actual = evaluate({
    maximumTmdbRequestCount: 24,
    maximumListRequestCount: 8,
    maximumDetailRequestCount: 16,
    requestContextCount: 1,
    maximumElapsedMs: 15_000,
    deadlineExceeded: false,
    inputLanguagePreserved: true,
  }, {
    requestsUsed: 0,
    listRequestsUsed: 0,
    detailRequestsUsed: 0,
    requestContextCount: 1,
    elapsedMs: 0,
    deadlineExceeded: false,
    inputLanguagePreserved: true,
  });
  assert.equal(actual.pass, true, actual.failedReasons.join(", "));
});
