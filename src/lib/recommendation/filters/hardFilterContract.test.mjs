import assert from "node:assert/strict";
import test from "node:test";

import {
  OTT_PROVIDER_REGISTRY,
  RUNTIME_FILTERS,
  contentTypeMatchesSubmittedPreferences,
  evaluateHardFilters,
  evaluateOttHardFilter,
  evaluateRuntimeHardFilter,
  normalizeDisplayContentType,
  normalizeProviderMediaType,
  ottDiscoverParameters,
  runtimeConstraintFromFilters,
  runtimeFilterValuesForItem,
  serviceName,
} from "./hardFilterContract.js";

const animatedMovie = { mediaType: "movie", type: "animation", genreIds: [16], runtime: 90 };
const animatedTv = { mediaType: "tv", type: "animation", genreIds: [16], runtime: 25 };
const liveMovie = { mediaType: "movie", type: "movie", genreIds: [28], runtime: 110 };
const liveTv = { mediaType: "tv", type: "drama", genreIds: [18], runtime: 55 };

test("provider media type remains distinct from animation display type", () => {
  assert.equal(normalizeProviderMediaType(animatedMovie), "movie");
  assert.equal(normalizeDisplayContentType(animatedMovie), "animation");
  assert.equal(normalizeProviderMediaType(animatedTv), "tv");
  assert.equal(normalizeDisplayContentType(animatedTv), "animation");
});

test("content type hard constraint matrix is shared and exact", () => {
  assert.equal(contentTypeMatchesSubmittedPreferences(animatedMovie, ["movie"], ["style-animation"]), true);
  assert.equal(contentTypeMatchesSubmittedPreferences(animatedTv, ["movie"], ["style-animation"]), false);
  assert.equal(contentTypeMatchesSubmittedPreferences(animatedTv, ["drama"], ["style-animation"]), true);
  assert.equal(contentTypeMatchesSubmittedPreferences(animatedMovie, ["drama"], ["style-animation"]), false);
  assert.equal(contentTypeMatchesSubmittedPreferences(animatedMovie, ["animation"], []), true);
  assert.equal(contentTypeMatchesSubmittedPreferences(animatedTv, ["animation"], []), true);
  assert.equal(contentTypeMatchesSubmittedPreferences(liveMovie, ["animation"], []), false);
  assert.equal(contentTypeMatchesSubmittedPreferences(liveTv, ["animation"], []), false);
  assert.equal(contentTypeMatchesSubmittedPreferences(animatedMovie, ["movie"], []), false);
  assert.equal(contentTypeMatchesSubmittedPreferences(animatedTv, ["drama"], []), false);
});

test("KR subscription OTT requires streaming availability and excludes rent-only", () => {
  const disney = {
    ...liveMovie,
    watchAvailability: {
      region: "KR",
      flatrate: [{ id: 337, name: "Disney Plus" }],
      free: [], ads: [], rent: [], buy: [],
    },
  };
  const appleStoreOnly = {
    ...liveMovie,
    watchAvailability: {
      region: "KR",
      flatrate: [], free: [], ads: [],
      rent: [{ id: 2, name: "Apple TV Store" }], buy: [],
    },
  };
  assert.equal(evaluateOttHardFilter(disney, ["disney"]).pass, true);
  assert.equal(evaluateOttHardFilter(disney, ["netflix"]).reason, "ott-provider-mismatch");
  assert.equal(evaluateOttHardFilter({}, ["netflix"]).reason, "ott-provider-unknown");
  assert.equal(evaluateOttHardFilter(appleStoreOnly, ["apple-tv-plus"]).pass, false);
  assert.equal(OTT_PROVIDER_REGISTRY["apple-tv-plus"].providerId, 350);
});

test("OTT discover parameters use KR, provider OR, and streaming monetization", () => {
  assert.deepEqual(ottDiscoverParameters(["netflix", "disney"]), {
    watch_region: "KR",
    with_watch_providers: "8|337",
    with_watch_monetization_types: "flatrate|free|ads",
  });
});

test("runtime filters reject unknown and enforce explicit boundary policy", () => {
  assert.equal(evaluateRuntimeHardFilter({ runtime: 0 }, ["runtime-short"]).reason, "runtime-unknown");
  assert.equal(RUNTIME_FILTERS["runtime-long"].label, "긴 작품 (2시간 이상)");
  assert.deepEqual(runtimeConstraintFromFilters(["runtime-long"]), { min: 120 });

  const boundaries = [
    [59, true, true, false],
    [60, true, true, false],
    [61, false, true, false],
    [119, false, true, false],
    [120, false, true, true],
    [121, false, false, true],
    [139, false, false, true],
    [140, false, false, true],
    [141, false, false, true],
  ];

  for (const [runtime, short, medium, long] of boundaries) {
    assert.equal(evaluateRuntimeHardFilter({ runtime }, ["runtime-short"]).pass, short, `${runtime} short`);
    assert.equal(evaluateRuntimeHardFilter({ runtime }, ["runtime-medium"]).pass, medium, `${runtime} medium`);
    assert.equal(evaluateRuntimeHardFilter({ runtime }, ["runtime-long"]).pass, long, `${runtime} long`);
  }
});

test("runtime option union covers 1-300 without unintended overlaps", () => {
  const uncovered = [];
  const unintendedOverlaps = [];

  for (let runtime = 1; runtime <= 300; runtime += 1) {
    const actual = runtimeFilterValuesForItem({ runtime });
    const expected = runtime <= 60
      ? ["runtime-short", "runtime-medium"]
      : runtime < 120
        ? ["runtime-medium"]
        : runtime === 120
          ? ["runtime-medium", "runtime-long"]
          : ["runtime-long"];

    if (!actual.length) uncovered.push(runtime);
    if (actual.length > 1 && runtime > 60 && runtime !== 120) unintendedOverlaps.push(runtime);
    assert.deepEqual(actual, expected, `${runtime} minute partition`);
  }

  assert.deepEqual(uncovered, []);
  assert.deepEqual(unintendedOverlaps, []);
});

test("provider display labels prefer stable IDs over ambiguous names", () => {
  assert.equal(serviceName(350, "Apple TV"), "Apple TV+");
  assert.equal(serviceName(2, "Apple TV Store"), "Apple TV Store");
  assert.equal(serviceName(2, "Apple TV"), "Apple TV Store");
  assert.equal(serviceName(350, "Apple TV+"), "Apple TV+");
  assert.equal(serviceName(999, "Unknown Stream"), "Unknown Stream");
});

test("combined hard filters report the first hard exclusion and statuses", () => {
  const result = evaluateHardFilters(animatedTv, {
    contentTypes: ["movie"],
    filters: ["style-animation", "runtime-short"],
  });
  assert.equal(result.pass, false);
  assert.equal(result.exclusionReason, "content-type-mismatch");
  assert.equal(result.hardFilterStatus.runtime, "pass");
});
