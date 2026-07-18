import assert from "node:assert/strict";
import test from "node:test";

import {
  OTT_PROVIDER_REGISTRY,
  contentTypeMatchesSubmittedPreferences,
  evaluateHardFilters,
  evaluateOttHardFilter,
  evaluateRuntimeHardFilter,
  normalizeDisplayContentType,
  normalizeProviderMediaType,
  ottDiscoverParameters,
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

test("runtime filters reject unknown and enforce documented ranges", () => {
  assert.equal(evaluateRuntimeHardFilter({ runtime: 0 }, ["runtime-short"]).reason, "runtime-unknown");
  assert.equal(evaluateRuntimeHardFilter({ runtime: 45 }, ["runtime-short"]).pass, true);
  assert.equal(evaluateRuntimeHardFilter({ runtime: 100 }, ["runtime-medium"]).pass, true);
  assert.equal(evaluateRuntimeHardFilter({ runtime: 130 }, ["runtime-medium"]).reason, "runtime-mismatch");
  assert.equal(evaluateRuntimeHardFilter({ runtime: 150 }, ["runtime-long"]).pass, true);
  assert.equal(evaluateRuntimeHardFilter({ runtime: 130 }, ["runtime-long"]).reason, "runtime-mismatch");
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
