import assert from "node:assert/strict";
import test from "node:test";

import { buildSeedCoverageMessage, resolveEmptyStateMessage } from "./seedRequest.js";

const coverageCases = [
  [{ rawInputCount: 3, processedWorkCount: 2, uniqueResolvedWorkCount: 2 }, "입력한 3개 제목을 2개 작품으로 확인해 추천에 반영했습니다.", "We matched 3 entries to 2 titles and used them for your recommendations."],
  [{ rawInputCount: 3, processedWorkCount: 2, unresolvedSeedCount: 1 }, "입력한 작품 중 1개를 찾지 못해 확인된 작품을 중심으로 추천했습니다.", "We couldn't find 1 of your entries, so we focused on the titles we confirmed."],
  [{ rawInputCount: 2, processedWorkCount: 2 }, "입력한 2개 작품을 모두 추천에 반영했습니다.", "We used all 2 titles for your recommendations."],
  [{ rawInputCount: 3, processedWorkCount: 1 }, "입력한 3개 작품 중 1개를 이번 추천에 반영했습니다.", "We used 1 of your 3 titles for these recommendations."],
  [{ rawInputCount: 2, processedWorkCount: 0 }, "입력한 작품을 추천에 반영하지 못했습니다.", "We couldn't use the titles you entered for these recommendations."],
];

test("seed coverage statuses preserve Korean and provide equivalent English", () => {
  for (const [metadata, korean, english] of coverageCases) {
    assert.equal(buildSeedCoverageMessage(metadata), korean);
    assert.equal(buildSeedCoverageMessage(metadata, "en-US"), english);
  }
});

test("empty and error statuses are locale-aware without changing status inputs", () => {
  const fixtures = [
    [{ recommendationStatus: "idle", selectedTypes: ["movie"] }, "작품을 입력하거나 추천 옵션을 고르면 결과가 여기에 표시됩니다.", "Add a title or choose recommendation options to see results here."],
    [{ recommendationStatus: "empty", selectedTypes: [] }, "영화, 드라마, 애니 중 하나 이상 선택해 주세요.", "Select at least one of Movies, TV series, or Animation."],
    [{ recommendationStatus: "error", selectedTypes: ["movie"] }, "추천 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", "We couldn't load recommendations. Please try again shortly."],
    [{ recommendationStatus: "empty", selectedTypes: ["movie"], hasSeedInput: true, unresolvedSeedCount: 1 }, "입력한 작품을 찾지 못했습니다. 작품 제목을 확인하거나 자동완성에서 작품을 선택해 주세요.", "We couldn't find your title. Check its name or choose a match from the suggestions."],
    [{ recommendationStatus: "empty", selectedTypes: ["movie"], hasSeedInput: true, processedSeedCount: 1 }, "확인된 작품을 중심으로 추천했지만 조건에 맞는 결과가 부족합니다.", "We used the titles we could confirm, but too few results match your filters."],
  ];

  for (const [input, korean, english] of fixtures) {
    const original = structuredClone(input);
    assert.equal(resolveEmptyStateMessage(input), korean);
    assert.equal(resolveEmptyStateMessage(input, "en-US"), english);
    assert.deepEqual(input, original);
  }
});

test("presentation localization does not alter request serialization", () => {
  const input = {
    titles: ["Interstellar"],
    contentTypes: ["movie"],
    filters: ["genre-sf", "runtime-long"],
  };
  assert.equal("locale" in input, false);
  assert.equal("contentProviderRegion" in input, false);
  assert.equal("legalJurisdiction" in input, false);
});
