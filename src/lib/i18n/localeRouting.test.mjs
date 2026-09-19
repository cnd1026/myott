import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLocaleNavigationTarget,
  extractRouteLocale,
  stripLocalePrefix,
  withLocalePrefix,
} from "./localeRouting.js";

test("recognizes the canonical Korean route prefix", () => {
  assert.equal(extractRouteLocale("/ko-KR/foo"), "ko-KR");
  assert.equal(stripLocalePrefix("/ko-KR/foo"), "/foo");
});

test("recognizes the canonical English route prefix", () => {
  assert.equal(extractRouteLocale("/en-US/foo"), "en-US");
  assert.equal(stripLocalePrefix("/en-US/foo"), "/foo");
});

test("route prefix normalization reuses supported locale aliases", () => {
  assert.equal(extractRouteLocale("/en-us/foo"), "en-US");
  assert.equal(withLocalePrefix("/en-us/foo", "ko"), "/ko-KR/foo");
});

test("legacy root remains unprefixed until navigation is explicitly requested", () => {
  assert.equal(extractRouteLocale("/"), null);
  assert.equal(stripLocalePrefix("/"), "/");
});

test("stripping a prefix preserves the remaining path", () => {
  assert.equal(stripLocalePrefix("/ko-KR/"), "/");
  assert.equal(stripLocalePrefix("/ko-KR/foo/bar"), "/foo/bar");
});

test("prefix creation and replacement use one canonical locale segment", () => {
  assert.equal(withLocalePrefix("/foo", "en-US"), "/en-US/foo");
  assert.equal(withLocalePrefix("/ko-KR/foo", "en-US"), "/en-US/foo");
});

test("navigation preserves a supplied query string", () => {
  assert.equal(buildLocaleNavigationTarget({
    pathname: "/foo",
    search: "?x=1",
    targetLocale: "en-US",
  }), "/en-US/foo?x=1");
});

test("navigation preserves a supplied hash", () => {
  assert.equal(buildLocaleNavigationTarget({
    pathname: "/foo",
    hash: "#details",
    targetLocale: "ko-KR",
  }), "/ko-KR/foo#details");
});

test("unsupported locale-like path segments remain content paths", () => {
  assert.equal(extractRouteLocale("/ja-JP/foo"), null);
  assert.equal(stripLocalePrefix("/ja-JP/foo"), "/ja-JP/foo");
});

test("manual target locale replaces an existing route locale", () => {
  assert.equal(buildLocaleNavigationTarget({
    pathname: "/ko-KR/foo",
    targetLocale: "en-US",
  }), "/en-US/foo");
});

test("invalid target locales fail without inventing a navigation target", () => {
  assert.equal(buildLocaleNavigationTarget({ pathname: "/foo", targetLocale: "ja-JP" }), null);
});

test("multiple recognized prefixes are collapsed before adding the target prefix", () => {
  assert.equal(buildLocaleNavigationTarget({
    pathname: "/en-US/ko-KR/foo",
    targetLocale: "ko-KR",
  }), "/ko-KR/foo");
});

test("root path normalization is deterministic", () => {
  assert.equal(withLocalePrefix("", "ko-KR"), "/ko-KR");
  assert.equal(withLocalePrefix("/", "en-US"), "/en-US");
});

test("trailing slashes are preserved deterministically", () => {
  assert.equal(withLocalePrefix("/foo/", "ko-KR"), "/ko-KR/foo/");
});

test("routing output has no content-provider region decision", () => {
  const target = buildLocaleNavigationTarget({ pathname: "/foo", targetLocale: "en-US" });

  assert.equal(typeof target, "string");
  assert.equal("contentProviderRegion" in Object(target), false);
});

test("routing output has no legal-jurisdiction decision", () => {
  const target = buildLocaleNavigationTarget({ pathname: "/foo", targetLocale: "en-US" });

  assert.equal(typeof target, "string");
  assert.equal("legalJurisdiction" in Object(target), false);
});
