import assert from "node:assert/strict";
import test from "node:test";

import {
  TmdbObservabilityIntegrityError,
  createTmdbObservabilitySession,
  emitTmdbObservabilityEvent,
} from "./tmdbObservability.js";

const excludedFirstPick = {
  candidateId: "tmdb:movie:1",
  arrivalStage: "exact-popularity-page-1",
  preDetailSemantic: "pass",
  preDetailCountry: "pass",
  preDetailContentType: "pass",
  detailState: "selected-enriched",
  postDetailSemantic: "pass",
  postDetailCountry: "pass",
  postDetailContentType: "pass",
  hardFilterDecision: "pass",
  rankingInputOrdinal: 1,
  dedupeDecision: "cross-surface-first-pick",
  resultTier: "exact",
  finalPath: "none",
  finalDecision: "not-selected",
  reason: "cross-surface-first-pick",
  rank: null,
};

test("cross-surface First Pick exclusion uses an accepted closed-schema reason", () => {
  const session = createTmdbObservabilitySession();
  assert.doesNotThrow(() =>
    emitTmdbObservabilityEvent(session, "candidate-lineage", excludedFirstPick));
});

test("a mismatched or unknown First Pick exclusion remains denied", () => {
  assert.throws(() => emitTmdbObservabilityEvent(
    createTmdbObservabilitySession(),
    "candidate-lineage",
    { ...excludedFirstPick, reason: "selected" },
  ), TmdbObservabilityIntegrityError);
  assert.throws(() => emitTmdbObservabilityEvent(
    createTmdbObservabilitySession(),
    "candidate-lineage",
    { ...excludedFirstPick, dedupeDecision: "arbitrary-exclusion", reason: "arbitrary-exclusion" },
  ), TmdbObservabilityIntegrityError);
});
