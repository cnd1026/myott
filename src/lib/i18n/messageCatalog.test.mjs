import test from "node:test";
import assert from "node:assert/strict";

import {
  MESSAGE_CATALOGS,
  getMessage,
  getMessageCatalog,
  getMessagePlaceholders,
  validateMessageCatalogs,
} from "./messageCatalog.js";
import {
  RESULT_SHORTLIST_ACTIONS,
  createResultShortlistState,
  presentResultNextAction,
  presentResultShortlist,
  reduceResultShortlist,
} from "../recommendation/presentation/resultShortlistPresentation.js";

const EXPECTED_MESSAGE_KEYS = Object.freeze([
  "actions.resetAll", "actions.submit", "attribution.heading", "attribution.justWatch",
  "attribution.tmdbDisclaimer", "attribution.tmdbLogoAlt", "card.genre", "card.keyFacts",
  "card.openDetails", "card.ott", "card.ottUnavailable", "card.rating", "card.runtime",
  "common.infoCheckRequired", "common.ottCheckRequired", "conditions.apply",
  "conditions.backdropClose", "conditions.change", "conditions.contentTypeCount",
  "conditions.contentTypeDescription", "conditions.contentTypeNone", "conditions.contentTypeTitle",
  "conditions.current", "conditions.optionCount", "conditions.optionNone", "conditions.optionsDescription",
  "conditions.optionsTitle", "conditions.moreOptions", "conditions.additionalOptionsSelected",
  "conditions.ottCount", "conditions.ottDescription", "conditions.ottNone",
  "conditions.ottTitle", "conditions.panelClose", "conditions.panelEyebrow", "conditions.panelLabel",
  "conditions.panelTitle", "detail.cast", "detail.close", "detail.criteria",
  "detail.criteriaDescription", "detail.director", "detail.evidence", "detail.expandRelated",
  "detail.genre", "detail.recommendReason", "detail.synopsis", "detail.watchAvailability",
  "detail.watchOn", "favorite.animation", "favorite.description", "favorite.drama",
  "favorite.groupLabel", "favorite.itemLabel", "favorite.movie", "favorite.placeholderFallback",
  "favorite.placeholderFirst", "favorite.placeholderSecond", "favorite.placeholderThird",
  "favorite.removeConfirmation", "favorite.searchCandidates", "favorite.title", "favorite.yearUnknown",
  "hero.browseCue", "hero.description", "hero.empty", "hero.eyebrow", "hero.listLabel",
  "hero.loading", "hero.nextAction", "hero.retry", "hero.title", "hero.unavailable",
  "metadata.description", "metadata.title", "personalization.description", "personalization.eyebrow",
  "personalization.optionalityHint", "personalization.title", "quickPick.clearSearch", "quickPick.close", "quickPick.collapse",
  "quickPick.eyebrow", "quickPick.more", "quickPick.noResults", "quickPick.noneSelected",
  "quickPick.reset", "quickPick.searchLabel", "quickPick.searchPlaceholder", "quickPick.selected",
  "quickPick.selectedCount", "quickPick.title", "related.changeCardHint", "related.controls",
  "related.description", "related.empty", "related.error", "related.listLabel", "related.loading",
  "related.loadingLabel", "related.next", "related.previous", "related.retryHint", "related.title",
  "recommendationInsight.contentType", "recommendationInsight.genreMatch", "recommendationInsight.metadataTieBreak",
  "recommendationInsight.multipleSeed", "recommendationInsight.optionMatch", "recommendationInsight.ottMatch",
  "recommendationInsight.relaxedFallback", "recommendationInsight.runtimeMatch",
  "results.appliedConditions", "results.appliedConditionsTitle", "results.count",
  "results.dirtyDescription", "results.dirtyTitle", "results.empty", "results.error", "results.errorRecoveryDescription", "results.eyebrow",
  "results.adjustCriteria", "results.refineDescription", "results.refineEmptyDescription", "results.refineTitle", "results.reviewCriteria",
  "results.filtersTooNarrow", "results.idle", "results.loading", "results.rerun", "results.seedInsufficient",
  "results.seedNotFound", "results.selectContentType", "results.showFirstThree", "results.showMore", "results.title",
  "seedCoverage.all", "seedCoverage.deduplicated", "seedCoverage.none", "seedCoverage.partial",
  "seedCoverage.unresolved", "trust.contentType", "trust.firstLook", "trust.inputTitles",
  "trust.primaryGenre", "trust.runtime", "trust.selectedOptions", "trust.tasteConnection",
]);

function mutableCatalogs() {
  return {
    "ko-KR": { ...MESSAGE_CATALOGS["ko-KR"] },
    "en-US": { ...MESSAGE_CATALOGS["en-US"] },
  };
}

test("both locale catalogs load with the independent expected key contract", () => {
  assert.equal(getMessageCatalog("ko-KR"), MESSAGE_CATALOGS["ko-KR"]);
  assert.equal(getMessageCatalog("en-US"), MESSAGE_CATALOGS["en-US"]);
  assert.deepEqual(Object.keys(MESSAGE_CATALOGS["ko-KR"]).sort(), [...EXPECTED_MESSAGE_KEYS].sort());
  assert.deepEqual(Object.keys(MESSAGE_CATALOGS["en-US"]).sort(), [...EXPECTED_MESSAGE_KEYS].sort());
  assert.equal(validateMessageCatalogs(MESSAGE_CATALOGS, EXPECTED_MESSAGE_KEYS).valid, true);
});

test("validation rejects missing and extra English keys", () => {
  const missing = mutableCatalogs();
  delete missing["en-US"]["hero.title"];
  assert.match(validateMessageCatalogs(missing, EXPECTED_MESSAGE_KEYS).errors.join("\n"), /missing key hero\.title/);

  const extra = mutableCatalogs();
  extra["en-US"]["hero.unapproved"] = "Extra";
  assert.match(validateMessageCatalogs(extra, EXPECTED_MESSAGE_KEYS).errors.join("\n"), /extra key hero\.unapproved/);
});

test("validation rejects empty and whitespace-only values", () => {
  const catalogs = mutableCatalogs();
  catalogs["ko-KR"]["hero.title"] = "";
  catalogs["en-US"]["hero.title"] = "   ";
  const errors = validateMessageCatalogs(catalogs, EXPECTED_MESSAGE_KEYS).errors.join("\n");
  assert.match(errors, /ko-KR: empty value hero\.title/);
  assert.match(errors, /en-US: empty value hero\.title/);
});

test("supported aliases select their catalog and unsupported locales use the default", () => {
  assert.equal(getMessageCatalog("ko"), MESSAGE_CATALOGS["ko-KR"]);
  assert.equal(getMessageCatalog("EN-us"), MESSAGE_CATALOGS["en-US"]);
  assert.equal(getMessageCatalog("ja-JP"), MESSAGE_CATALOGS["ko-KR"]);
});

test("valid message lookup and interpolation are deterministic", () => {
  assert.equal(getMessage("ko-KR", "hero.title"), "먼저 살펴볼 작품");
  assert.equal(getMessage("en-US", "results.count", { count: 12 }), "12 results");
  assert.equal(getMessage("ko-KR", "favorite.removeConfirmation", { title: "마션" }), "마션 확인 해제");
});

test("a supported catalog never silently falls back to Korean for a missing key", () => {
  assert.throws(() => getMessage("en-US", "missing.key"), /MISSING_MESSAGE_KEY:en-US:missing\.key/);
});

test("placeholder sets match and required interpolation values cannot disappear", () => {
  for (const key of EXPECTED_MESSAGE_KEYS) {
    assert.deepEqual(
      getMessagePlaceholders(MESSAGE_CATALOGS["en-US"][key]),
      getMessagePlaceholders(MESSAGE_CATALOGS["ko-KR"][key]),
      key,
    );
  }
  assert.throws(() => getMessage("en-US", "results.count"), /MISSING_MESSAGE_VALUE:results\.count:count/);
});

test("validation detects a placeholder mismatch", () => {
  const catalogs = mutableCatalogs();
  catalogs["en-US"]["results.count"] = "{total} results";
  assert.match(validateMessageCatalogs(catalogs, EXPECTED_MESSAGE_KEYS).errors.join("\n"), /placeholder mismatch results\.count/);
});

test("metadata, activation, action, and accessibility contracts are present", () => {
  for (const key of [
    "metadata.title", "metadata.description", "hero.title", "personalization.title",
    "actions.submit", "actions.resetAll", "conditions.panelClose", "quickPick.clearSearch",
    "card.openDetails", "detail.close", "related.previous", "related.next",
  ]) {
    assert.equal(EXPECTED_MESSAGE_KEYS.includes(key), true, key);
    assert.equal(typeof MESSAGE_CATALOGS["ko-KR"][key], "string", key);
    assert.equal(typeof MESSAGE_CATALOGS["en-US"][key], "string", key);
  }
});

test("input optionality guidance is paired and does not claim that an empty submission is valid", () => {
  assert.match(MESSAGE_CATALOGS["ko-KR"]["personalization.optionalityHint"], /모든 항목을 채울 필요는 없/);
  assert.match(MESSAGE_CATALOGS["en-US"]["personalization.optionalityHint"], /don't need to fill in every field/i);
  assert.doesNotMatch(MESSAGE_CATALOGS["ko-KR"]["personalization.optionalityHint"], /아무것도|모두 비워/);
  assert.doesNotMatch(MESSAGE_CATALOGS["en-US"]["personalization.optionalityHint"], /leave everything blank|no input required/i);
});

test("English ordinary-user messages contain no Korean leftovers", () => {
  assert.equal(Object.values(MESSAGE_CATALOGS["en-US"]).filter((value) => /[\u3131-\uD79D]/u.test(value)).length, 0);
});

test("catalog objects are immutable and imports have no runtime side effects", () => {
  assert.equal(Object.isFrozen(MESSAGE_CATALOGS), true);
  assert.equal(Object.isFrozen(MESSAGE_CATALOGS["ko-KR"]), true);
  assert.equal(Object.isFrozen(MESSAGE_CATALOGS["en-US"]), true);
  assert.equal("cookie" in MESSAGE_CATALOGS, false);
  assert.equal("localStorage" in MESSAGE_CATALOGS, false);
  assert.equal("network" in MESSAGE_CATALOGS, false);
});

test("catalog carries UI copy only, without region or jurisdiction decisions", () => {
  for (const catalog of Object.values(MESSAGE_CATALOGS)) {
    assert.equal("contentProviderRegion" in catalog, false);
    assert.equal("legalJurisdiction" in catalog, false);
  }
});

test("catalog foundation requires no package dependency", () => {
  assert.equal(typeof getMessage, "function");
  assert.equal(typeof validateMessageCatalogs, "function");
});

function rankedResults(count) {
  return Array.from({ length: count }, (_, index) => Object.freeze({
    id: `rank-${index + 1}`,
    rank: index + 1,
  }));
}

test("shortlist presents all results through rank 3 without a reveal control", () => {
  for (const count of [0, 1, 2, 3]) {
    const results = rankedResults(count);
    const presentation = presentResultShortlist(results, createResultShortlistState(), {
      shortlistEnabled: true,
    });

    assert.deepEqual(presentation.visibleResults, results, `count ${count}`);
    assert.equal(presentation.showReveal, false, `count ${count}`);
    assert.equal(presentation.showCollapse, false, `count ${count}`);
    assert.equal(presentation.remainingCount, 0, `count ${count}`);
  }
});

test("shortlist initially presents exact ranks 1-3 and reports the remaining count", () => {
  for (const [count, remaining] of [[4, 1], [12, 9]]) {
    const results = rankedResults(count);
    const presentation = presentResultShortlist(results, createResultShortlistState(), {
      shortlistEnabled: true,
    });

    assert.deepEqual(presentation.visibleResults.map(({ id }) => id), ["rank-1", "rank-2", "rank-3"]);
    assert.equal(presentation.totalCount, count);
    assert.equal(presentation.remainingCount, remaining);
    assert.equal(presentation.showReveal, true);
    assert.equal(presentation.showCollapse, false);
  }
});

test("reveal and collapse preserve the complete ranked result set and its order", () => {
  const results = rankedResults(12);
  const before = [...results];
  const expandedState = reduceResultShortlist(
    createResultShortlistState(),
    { type: RESULT_SHORTLIST_ACTIONS.REVEAL },
  );
  const expanded = presentResultShortlist(results, expandedState, { shortlistEnabled: true });

  assert.equal(expanded.visibleResults, results);
  assert.deepEqual(expanded.visibleResults.map(({ id }) => id), before.map(({ id }) => id));
  assert.deepEqual(results, before);
  assert.equal(expanded.showReveal, false);
  assert.equal(expanded.showCollapse, true);

  const collapsed = presentResultShortlist(
    results,
    reduceResultShortlist(expandedState, { type: RESULT_SHORTLIST_ACTIONS.COLLAPSE }),
    { shortlistEnabled: true },
  );
  assert.deepEqual(collapsed.visibleResults.map(({ id }) => id), ["rank-1", "rank-2", "rank-3"]);
});

test("non-mobile presentation exposes the full ranked result set without shortlist controls", () => {
  for (const count of [0, 1, 2, 3, 4, 12]) {
    const results = rankedResults(count);
    const presentation = presentResultShortlist(results, createResultShortlistState(), {
      shortlistEnabled: false,
    });

    assert.equal(presentation.visibleResults, results, `count ${count}`);
    assert.deepEqual(presentation.visibleResults.map(({ id }) => id), results.map(({ id }) => id));
    assert.equal(presentation.showReveal, false, `count ${count}`);
    assert.equal(presentation.showCollapse, false, `count ${count}`);
    assert.equal(presentation.hasAdditionalResults, false, `count ${count}`);
    assert.equal(presentation.remainingCount, 0, `count ${count}`);
  }
});

test("detail and draft interactions preserve state while a new successful set resets it", () => {
  const expandedState = reduceResultShortlist(
    createResultShortlistState(),
    { type: RESULT_SHORTLIST_ACTIONS.REVEAL },
  );

  assert.equal(reduceResultShortlist(expandedState, { type: "DETAIL_OPENED" }), expandedState);
  assert.equal(reduceResultShortlist(expandedState, { type: "DETAIL_CLOSED" }), expandedState);
  assert.equal(reduceResultShortlist(expandedState, { type: "DRAFT_CRITERIA_CHANGED" }), expandedState);
  assert.deepEqual(
    reduceResultShortlist(expandedState, { type: RESULT_SHORTLIST_ACTIONS.RESULTS_COMMITTED }),
    { expanded: false },
  );
});

test("shortlist controls resolve equivalent dynamic Korean and English copy", () => {
  assert.equal(getMessage("ko-KR", "results.showMore", { remainingCount: 9 }), "추천 9개 더 보기");
  assert.equal(getMessage("en-US", "results.showMore", { remainingCount: 9 }), "Show 9 more recommendations");
  assert.equal(getMessage("ko-KR", "results.showFirstThree"), "처음 3개만 보기");
  assert.equal(getMessage("en-US", "results.showFirstThree"), "Show the first 3 only");
});

test("result refinement appears after the complete set and recovery appears for empty or error states", () => {
  for (const count of [4, 12]) {
    const mobileCollapsed = presentResultShortlist(
      rankedResults(count),
      createResultShortlistState(),
      { shortlistEnabled: true },
    );
    assert.equal(presentResultNextAction("success", mobileCollapsed).show, false, `collapsed ${count}`);

    const mobileExpanded = presentResultShortlist(
      rankedResults(count),
      { expanded: true },
      { shortlistEnabled: true },
    );
    assert.deepEqual(presentResultNextAction("success", mobileExpanded), {
      recovery: false,
      show: true,
    }, `expanded ${count}`);
  }

  for (const count of [1, 3]) {
    const complete = presentResultShortlist(
      rankedResults(count),
      createResultShortlistState(),
      { shortlistEnabled: true },
    );
    assert.equal(presentResultNextAction("success", complete).show, true, `mobile count ${count}`);
  }

  for (const count of [4, 12]) {
    const complete = presentResultShortlist(
      rankedResults(count),
      createResultShortlistState(),
      { shortlistEnabled: false },
    );
    assert.equal(presentResultNextAction("success", complete).show, true, `non-mobile count ${count}`);
  }

  assert.deepEqual(presentResultNextAction("empty", { totalCount: 0 }), {
    recovery: true,
    show: true,
  });
  assert.equal(presentResultNextAction("idle", { totalCount: 0 }).show, false);
  assert.deepEqual(presentResultNextAction("error", { totalCount: 0 }), {
    recovery: true,
    show: true,
  });
});

test("result refinement copy is paired and does not imply automatic recommendation retrieval", () => {
  assert.equal(getMessage("ko-KR", "results.adjustCriteria"), "조건 다시 고르기");
  assert.equal(getMessage("en-US", "results.adjustCriteria"), "Adjust criteria");
  assert.equal(getMessage("ko-KR", "results.reviewCriteria"), "조건 다시 확인하기");
  assert.equal(getMessage("en-US", "results.reviewCriteria"), "Review criteria");
  for (const locale of ["ko-KR", "en-US"]) {
    for (const key of ["results.refineTitle", "results.refineDescription", "results.refineEmptyDescription", "results.errorRecoveryDescription"]) {
      assert.doesNotMatch(getMessage(locale, key), /next 12|더 추천받기|same criteria/i);
    }
  }
});
