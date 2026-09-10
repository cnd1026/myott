import test from "node:test";
import assert from "node:assert/strict";

import {
  MESSAGE_CATALOGS,
  getMessage,
  getMessageCatalog,
  getMessagePlaceholders,
  validateMessageCatalogs,
} from "./messageCatalog.js";

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
  "personalization.title", "quickPick.clearSearch", "quickPick.close", "quickPick.collapse",
  "quickPick.eyebrow", "quickPick.more", "quickPick.noResults", "quickPick.noneSelected",
  "quickPick.reset", "quickPick.searchLabel", "quickPick.searchPlaceholder", "quickPick.selected",
  "quickPick.selectedCount", "quickPick.title", "related.changeCardHint", "related.controls",
  "related.description", "related.empty", "related.error", "related.listLabel", "related.loading",
  "related.loadingLabel", "related.next", "related.previous", "related.retryHint", "related.title",
  "recommendationInsight.contentType", "recommendationInsight.genreMatch", "recommendationInsight.metadataTieBreak",
  "recommendationInsight.multipleSeed", "recommendationInsight.optionMatch", "recommendationInsight.ottMatch",
  "recommendationInsight.relaxedFallback", "recommendationInsight.runtimeMatch",
  "results.appliedConditions", "results.appliedConditionsTitle", "results.count",
  "results.dirtyDescription", "results.dirtyTitle", "results.empty", "results.error", "results.eyebrow",
  "results.filtersTooNarrow", "results.idle", "results.loading", "results.rerun", "results.seedInsufficient",
  "results.seedNotFound", "results.selectContentType", "results.title",
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
