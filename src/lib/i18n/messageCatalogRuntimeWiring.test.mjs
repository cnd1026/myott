import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

import { MESSAGE_CATALOGS, getMessage } from "./messageCatalog.js";

const BASE_COMMIT = "28c5b12d995d2badc6abea8fde0b6e8148313444";
const CURRENT_TASK_BASE = "9e6483100879c6e1bca4cbfbccb4953405f0097e";
const LAYOUT_KEYS = Object.freeze([
  "attribution.heading", "attribution.justWatch", "attribution.tmdbDisclaimer",
  "attribution.tmdbLogoAlt", "metadata.description", "metadata.title",
]);
const PAGE_KEYS = Object.freeze([
  "actions.resetAll", "actions.submit", "card.genre", "card.keyFacts", "card.openDetails",
  "card.ott", "card.ottUnavailable", "card.rating", "card.runtime", "common.infoCheckRequired",
  "common.ottCheckRequired", "conditions.additionalOptionsSelected", "conditions.apply",
  "conditions.backdropClose", "conditions.change", "conditions.contentTypeCount",
  "conditions.contentTypeDescription", "conditions.contentTypeNone", "conditions.contentTypeTitle",
  "conditions.current", "conditions.moreOptions", "conditions.optionCount", "conditions.optionNone",
  "conditions.optionsDescription", "conditions.optionsTitle", "conditions.ottCount",
  "conditions.ottDescription", "conditions.ottNone", "conditions.ottTitle", "conditions.panelClose",
  "conditions.panelEyebrow", "conditions.panelLabel", "conditions.panelTitle", "detail.cast",
  "detail.close", "detail.criteria", "detail.criteriaDescription", "detail.director", "detail.evidence",
  "detail.expandRelated", "detail.genre", "detail.recommendReason", "detail.synopsis",
  "detail.watchAvailability", "detail.watchOn", "favorite.animation", "favorite.description",
  "favorite.drama", "favorite.groupLabel", "favorite.itemLabel", "favorite.movie",
  "favorite.placeholderFallback", "favorite.placeholderFirst", "favorite.placeholderSecond",
  "favorite.placeholderThird", "favorite.removeConfirmation", "favorite.searchCandidates",
  "favorite.title", "favorite.yearUnknown", "hero.browseCue", "hero.description", "hero.empty",
  "hero.eyebrow", "hero.listLabel", "hero.loading", "hero.nextAction", "hero.retry", "hero.title",
  "hero.unavailable", "personalization.description", "personalization.eyebrow",
  "personalization.title", "quickPick.clearSearch", "quickPick.close", "quickPick.collapse",
  "quickPick.eyebrow", "quickPick.more", "quickPick.noResults", "quickPick.noneSelected",
  "quickPick.reset", "quickPick.searchLabel", "quickPick.searchPlaceholder", "quickPick.selected",
  "quickPick.selectedCount", "quickPick.title", "recommendationInsight.contentType",
  "recommendationInsight.genreMatch", "recommendationInsight.metadataTieBreak",
  "recommendationInsight.multipleSeed", "recommendationInsight.optionMatch",
  "recommendationInsight.ottMatch", "recommendationInsight.relaxedFallback",
  "recommendationInsight.runtimeMatch", "related.changeCardHint", "related.controls",
  "related.description", "related.empty", "related.error", "related.listLabel", "related.loading",
  "related.loadingLabel", "related.next", "related.previous", "related.retryHint", "related.title",
  "results.appliedConditions", "results.appliedConditionsTitle", "results.count",
  "results.dirtyDescription", "results.dirtyTitle", "results.empty", "results.eyebrow",
  "results.loading", "results.rerun", "results.showFirstThree", "results.showMore", "results.title",
  "trust.contentType", "trust.firstLook",
  "trust.inputTitles", "trust.primaryGenre", "trust.runtime", "trust.selectedOptions",
  "trust.tasteConnection",
]);
const DEFERRED_GENERATED_KEYS = Object.freeze([
  "results.error", "results.filtersTooNarrow", "results.idle", "results.seedInsufficient",
  "results.seedNotFound", "results.selectContentType", "seedCoverage.all",
  "seedCoverage.deduplicated", "seedCoverage.none", "seedCoverage.partial",
  "seedCoverage.unresolved",
]);

const layoutSource = fs.readFileSync("app/layout.jsx", "utf8");
const pageSource = fs.readFileSync("app/page.jsx", "utf8");
const globalStyleSource = fs.readFileSync("app/globals.css", "utf8");
const runtimeDiff = execFileSync("git", ["diff", BASE_COMMIT, "--", "app/layout.jsx", "app/page.jsx"], { encoding: "utf8" });
const baseSource = [
  "app/layout.jsx",
  "app/page.jsx",
  "src/lib/recommendation/presentation/recommendationPresentation.js",
].map((path) => execFileSync("git", ["show", `${BASE_COMMIT}:${path}`], { encoding: "utf8" })).join("\n");

function messageKeys(source) {
  return [...new Set([...source.matchAll(/message\("([^"]+)"/g)].map((match) => match[1]))].sort();
}

test("layout and page use the accepted runtime catalog API", () => {
  assert.match(layoutSource, /import \{ getMessage \} from "\.\.\/src\/lib\/i18n\/messageCatalog\.js"/);
  assert.match(pageSource, /import \{ getMessage \} from "\.\.\/src\/lib\/i18n\/messageCatalog\.js"/);
  assert.deepEqual(messageKeys(layoutSource), [...LAYOUT_KEYS].sort());
  assert.deepEqual(messageKeys(pageSource), [...PAGE_KEYS].sort());
});

test("shortlist wiring is mobile-only, accessible, and visually scoped", () => {
  assert.match(pageSource, /shortlistEnabled:\s*isMobileViewport/);
  assert.match(pageSource, /aria-controls="resultGrid"/);
  assert.match(pageSource, /aria-expanded=\{resultShortlistState\.expanded\}/);
  assert.match(globalStyleSource, /\.result-shortlist-actions\s*\{[^}]*justify-content:\s*center/s);
  assert.match(globalStyleSource, /\.result-shortlist-actions \.secondary-button\s*\{[^}]*background:\s*var\(--accent\)/s);
  assert.match(globalStyleSource, /\.attribution-tmdb img\s*\{[^}]*width:\s*64px/s);
});

test("runtime binding is Korean-only and public English activation stays absent", () => {
  assert.match(layoutSource, /const RUNTIME_UI_LOCALE = "ko-KR"/);
  assert.match(pageSource, /const RUNTIME_UI_LOCALE = "ko-KR"/);
  assert.match(layoutSource, /<html lang="ko">/);
  assert.doesNotMatch(runtimeDiff, /^\+.*en-US/m);
  assert.doesNotMatch(runtimeDiff, /^\+.*(?:language-selector|locale-selector|localeRouting)/im);
});

test("every wired key exists in the accepted Korean catalog", () => {
  for (const key of [...LAYOUT_KEYS, ...PAGE_KEYS]) {
    assert.equal(typeof MESSAGE_CATALOGS["ko-KR"][key], "string", key);
    assert.ok(MESSAGE_CATALOGS["ko-KR"][key].trim(), key);
  }
});

test("wired Korean copy is source-equivalent to the accepted base", () => {
  const taskMessages = new Map([
    ["results.showFirstThree", "처음 3개만 보기"],
    ["results.showMore", "추천 {remainingCount}개 더 보기"],
  ]);
  const interpolatedBaseSnippets = new Map([
    ["conditions.additionalOptionsSelected", "`추가 옵션 ${count}개 선택됨`"],
    ["conditions.ottCount", "`OTT ${selectedOtt.length}`"],
    ["conditions.contentTypeCount", "`종류 ${selectedTypes.length}`"],
    ["conditions.optionCount", "`옵션 ${selectedQuickPicks.length}`"],
    ["favorite.itemLabel", "작품 {index + 1}"],
    ["favorite.removeConfirmation", "`${row.confirmed.resolvedTitle} 확인 해제`"],
    ["favorite.searchCandidates", "`작품 ${index + 1} 검색 후보`"],
    ["results.count", "{results.length}개"],
    ["quickPick.selectedCount", "필터 {selectedQuickPicks.length}개 선택됨"],
    ["card.openDetails", "`${item.title} 상세 보기`"],
    ["card.keyFacts", "`${item.title} 핵심 정보`"],
    ["detail.watchAvailability", "`${selectedDetail.title} OTT 확인`"],
  ]);

  for (const key of [...LAYOUT_KEYS, ...PAGE_KEYS]) {
    const catalogValue = MESSAGE_CATALOGS["ko-KR"][key];
    if (taskMessages.has(key)) {
      assert.equal(catalogValue, taskMessages.get(key), key);
      continue;
    }
    if (!catalogValue.includes("{")) {
      assert.ok(baseSource.includes(catalogValue), `${key}: ${catalogValue}`);
      continue;
    }
    assert.ok(baseSource.includes(interpolatedBaseSnippets.get(key)), key);
  }
});

test("supported missing keys remain strict at runtime", () => {
  assert.throws(() => getMessage("ko-KR", "runtime.missing"), /MISSING_MESSAGE_KEY:ko-KR:runtime\.missing/);
  assert.throws(() => getMessage("en-US", "runtime.missing"), /MISSING_MESSAGE_KEY:en-US:runtime\.missing/);
});

test("generated status copy is now catalog-backed while current runtime remains Korean", () => {
  const wired = new Set([...LAYOUT_KEYS, ...PAGE_KEYS]);
  for (const key of DEFERRED_GENERATED_KEYS) {
    assert.equal(wired.has(key), false, key);
    assert.equal(typeof MESSAGE_CATALOGS["ko-KR"][key], "string", key);
  }
  assert.match(pageSource, /buildSeedCoverageMessage\(seedDiagnostics, RUNTIME_UI_LOCALE\)/);
  assert.match(pageSource, /resolveEmptyStateMessage\(\{[\s\S]+?\}, RUNTIME_UI_LOCALE\)/);
});

test("taxonomy labels are locale-aware while provider data remains outside locale decisions", () => {
  assert.match(pageSource, /taxonomyOptionGroupsForLocale\(RUNTIME_UI_LOCALE\)/);
  assert.match(pageSource, /localizeTaxonomyOptionGroups\(payload\.groups, RUNTIME_UI_LOCALE\)/);
  assert.match(pageSource, /pageResultFallbackPresentation\(\{/);
  assert.match(pageSource, /PRIMARY_OTT_OPTIONS/);
  assert.doesNotMatch(pageSource, /content\.title \|\| "제목 없음"/);
  assert.doesNotMatch(runtimeDiff, /^\+.*(?:contentProviderRegion|legalJurisdiction)/m);
});

test("runtime wiring adds no persistence, tracking, or external effects", () => {
  assert.doesNotMatch(runtimeDiff, /^\+.*(?:document\.cookie|localStorage|sessionStorage|analytics|tracking)/im);
  assert.doesNotMatch(runtimeDiff, /^\+.*(?:fetch\(|XMLHttpRequest|WebSocket)/m);
});

test("package, lock, provider, API, and recommendation semantics paths remain untouched", () => {
  const changed = execFileSync("git", ["diff", "--name-only", CURRENT_TASK_BASE], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean);
  assert.equal(changed.includes("package.json"), false);
  assert.equal(changed.includes("pnpm-lock.yaml"), false);
  assert.equal(changed.some((path) => path.startsWith("app/api/")), false);
  assert.equal(changed.some((path) => path.startsWith("src/lib/recommendation/candidates/")), false);
  assert.equal(changed.some((path) => path.startsWith("src/lib/recommendation/filters/")), false);
  assert.equal(changed.some((path) => path.startsWith("src/lib/recommendation/recall/")), false);
  assert.equal(changed.some((path) => path.startsWith("src/lib/recommendation/requests/")), false);
  assert.equal(changed.some((path) => path.startsWith("src/lib/recommendation/scoring/")), false);
  assert.equal(changed.some((path) => path.startsWith("src/lib/providers/")), false);
  assert.equal(changed.some((path) => path.startsWith("lib/")), false);
});
