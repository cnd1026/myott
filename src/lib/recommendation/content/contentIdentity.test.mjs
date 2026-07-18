import assert from "node:assert/strict";
import test from "node:test";

import { dedupeRelatedItems, isSameContent, providerContentKey } from "./contentIdentity.js";

const current = { providerId: "tmdb", mediaType: "movie", tmdbId: 277834, title: "모아나", originalTitle: "Moana" };

test("provider identity excludes the current content", () => {
  assert.equal(providerContentKey(current), "tmdb:movie:277834");
  assert.equal(isSameContent(current, { ...current, title: "Moana" }), true);
});

test("related dedupe excludes current localized/original title and internal duplicates", () => {
  const results = dedupeRelatedItems([
    { ...current },
    { providerId: "tmdb", mediaType: "movie", tmdbId: 1, title: "모아나", originalTitle: "Different" },
    { providerId: "tmdb", mediaType: "movie", tmdbId: 2, title: "다른 표기", originalTitle: "Moana" },
    { providerId: "tmdb", mediaType: "movie", tmdbId: 3, title: "모아나 2", originalTitle: "Moana 2" },
    { providerId: "tmdb", mediaType: "movie", tmdbId: 3, title: "모아나 2", originalTitle: "Moana 2" },
  ], current);
  assert.deepEqual(results.map((item) => item.title), ["모아나 2"]);
});
