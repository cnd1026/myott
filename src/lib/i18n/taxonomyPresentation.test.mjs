import assert from "node:assert/strict";
import test from "node:test";

import { GENRE_CONTRACT } from "../recommendation/genres/genreContract.js";
import { PRIMARY_OTT_OPTIONS } from "../recommendation/filters/hardFilterContract.js";
import {
  CONTENT_TYPE_VALUES,
  COUNTRY_VALUES,
  LANGUAGE_VALUES,
  MOOD_VALUES,
  RUNTIME_VALUES,
  genreOptionGroupsForLocale,
  localizeGenreDisplayLabels,
  localizeTaxonomyOptionGroups,
  taxonomyLabelForValue,
  taxonomyOptionGroupsForLocale,
  taxonomyOptions,
} from "./taxonomyPresentation.js";

test("Korean taxonomy presentation preserves every canonical genre label", () => {
  for (const entry of GENRE_CONTRACT) {
    assert.equal(taxonomyLabelForValue(entry.value, "ko-KR"), entry.label, entry.value);
  }
});

test("English taxonomy presentation keeps values while localizing labels", () => {
  const values = ["genre-sf", "genre-horror", "genre-sf-fantasy", "style-animation"];
  assert.deepEqual(taxonomyOptions(values, "en-US"), [
    ["genre-sf", "Sci-Fi"],
    ["genre-horror", "Horror"],
    ["genre-sf-fantasy", "Sci-Fi & Fantasy"],
    ["style-animation", "Animation"],
  ]);
});

test("content type, country, mood, runtime, and language registries keep canonical values", () => {
  assert.deepEqual(CONTENT_TYPE_VALUES, ["movie", "drama", "animation"]);
  assert.equal(COUNTRY_VALUES.includes("country-kr"), true);
  assert.deepEqual(MOOD_VALUES, ["mood-light", "mood-moving", "mood-tense"]);
  assert.deepEqual(RUNTIME_VALUES, ["runtime-short", "runtime-medium", "runtime-long"]);
  assert.deepEqual(LANGUAGE_VALUES, ["language-ko", "language-en", "language-ja"]);
  assert.equal(taxonomyLabelForValue("country-jp", "en-US"), "Japan");
  assert.equal(taxonomyLabelForValue("runtime-long", "en-US"), "Long (2 hours or more)");
});

test("provider brand labels are invariant across locales", () => {
  for (const [value, label] of PRIMARY_OTT_OPTIONS) {
    assert.equal(taxonomyLabelForValue(value, "ko-KR"), label);
    assert.equal(taxonomyLabelForValue(value, "en-US"), label);
  }
});

test("genre option groups preserve canonical order and values", () => {
  const korean = genreOptionGroupsForLocale("ko-KR");
  const english = genreOptionGroupsForLocale("en-US");
  assert.deepEqual(
    english.flatMap((group) => group.options.map(([value]) => value)),
    korean.flatMap((group) => group.options.map(([value]) => value)),
  );
  assert.deepEqual(
    korean.flatMap((group) => group.options.map(([value]) => value)),
    GENRE_CONTRACT.map(({ value }) => value),
  );
});

test("quick-pick groups localize labels without changing request values", () => {
  const korean = taxonomyOptionGroupsForLocale("ko-KR");
  const english = localizeTaxonomyOptionGroups(korean, "en-US");
  assert.deepEqual(
    english.map((group) => group.options.map(([value]) => value)),
    korean.map((group) => group.options.map(([value]) => value)),
  );
  assert.deepEqual(english.map(({ title }) => title), ["Genre", "Country", "Mood", "Runtime"]);
});

test("known canonical genre display labels localize while provider data stays untouched", () => {
  assert.deepEqual(
    localizeGenreDisplayLabels(["액션·모험", "드라마", "Provider Custom Genre"], "en-US"),
    ["Action & Adventure", "Drama", "Provider Custom Genre"],
  );
});

test("taxonomy presentation exposes no provider-region or legal-jurisdiction decision", () => {
  const output = taxonomyOptionGroupsForLocale("en-US");
  assert.equal("contentProviderRegion" in output, false);
  assert.equal("legalJurisdiction" in output, false);
});
