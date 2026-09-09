import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_UI_LOCALES,
  isSupportedUiLocale,
  normalizeUiLocale,
  resolveUiLocale,
} from "./localeContract.js";

test("registry keeps the bounded Korean and English foundation", () => {
  assert.deepEqual(SUPPORTED_UI_LOCALES, ["ko-KR", "en-US"]);
  assert.equal(DEFAULT_UI_LOCALE, "ko-KR");
});

test("manual override wins over every later input", () => {
  assert.equal(resolveUiLocale({
    manualOverride: "en",
    routeLocale: "ko",
    storedPreference: "ko-KR",
    acceptLanguage: "ko-KR, en-US;q=0.5",
  }), "en-US");
});

test("route locale wins over stored preference and Accept-Language", () => {
  assert.equal(resolveUiLocale({
    routeLocale: "en-US",
    storedPreference: "ko",
    acceptLanguage: "ko-KR",
  }), "en-US");
});

test("stored preference wins over Accept-Language", () => {
  assert.equal(resolveUiLocale({
    storedPreference: "en-us",
    acceptLanguage: "ko-KR",
  }), "en-US");
});

test("Accept-Language chooses the highest-weight supported locale", () => {
  assert.equal(resolveUiLocale({
    acceptLanguage: "en-US;q=0.7, ko;q=0.9",
  }), "ko-KR");
});

test("Korean aliases normalize case-insensitively", () => {
  assert.equal(normalizeUiLocale("ko"), "ko-KR");
  assert.equal(normalizeUiLocale("ko-KR"), "ko-KR");
  assert.equal(normalizeUiLocale("KO-kr"), "ko-KR");
});

test("English aliases normalize case-insensitively", () => {
  assert.equal(normalizeUiLocale("en"), "en-US");
  assert.equal(normalizeUiLocale("en-US"), "en-US");
  assert.equal(normalizeUiLocale("EN-us"), "en-US");
});

test("unsupported manual values fall through safely", () => {
  assert.equal(resolveUiLocale({ manualOverride: "ja", routeLocale: "en" }), "en-US");
});

test("unsupported route values fall through safely", () => {
  assert.equal(resolveUiLocale({ routeLocale: "fr-FR", storedPreference: "en" }), "en-US");
});

test("unsupported Accept-Language entries are ignored", () => {
  assert.equal(resolveUiLocale({ acceptLanguage: "fr-FR, ja;q=0.9, en;q=0.5" }), "en-US");
});

test("malformed input does not throw and falls back safely", () => {
  assert.doesNotThrow(() => resolveUiLocale(null));
  assert.equal(resolveUiLocale({ acceptLanguage: "en;q=not-a-number" }), "ko-KR");
});

test("all unusable inputs fall back to Korean", () => {
  assert.equal(resolveUiLocale({
    manualOverride: "de",
    routeLocale: "fr",
    storedPreference: "ja",
    acceptLanguage: "zh-CN, *;q=0.9",
  }), "ko-KR");
});

test("wildcard does not invent an unsupported locale", () => {
  assert.equal(resolveUiLocale({ acceptLanguage: "*;q=1" }), "ko-KR");
});

test("support checks normalize only approved locales", () => {
  assert.equal(isSupportedUiLocale("EN-us"), true);
  assert.equal(isSupportedUiLocale("en-GB"), false);
});

test("UI locale resolution does not produce legal or provider-region output", () => {
  const locale = resolveUiLocale({ manualOverride: "en" });

  assert.equal(locale, "en-US");
  assert.equal(typeof locale, "string");
  assert.equal("legalJurisdiction" in Object(locale), false);
  assert.equal("contentProviderRegion" in Object(locale), false);
});
