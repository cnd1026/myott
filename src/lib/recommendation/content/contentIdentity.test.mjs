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

test("related dedupe excludes current primary surfaces before the final slice", () => {
  const primaryItems = [
    { providerId: "tmdb", mediaType: "tv", tmdbId: 10, title: "프롬", originalTitle: "From" },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 20, title: "기묘한 이야기", originalTitle: "Stranger Things" },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 30, title: "다크", originalTitle: "Dark" },
  ];
  const related = [
    { providerId: "tmdb", mediaType: "tv", tmdbId: 20, title: "Stranger Things", originalTitle: "Stranger Things" },
    { providerId: "other", mediaType: "tv", tmdbId: 10, title: "다른 표기", originalTitle: "Another Label" },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 40, title: "다크", originalTitle: "Different Original" },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 41, title: "다른 표기", originalTitle: "From" },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 50, title: "고유 후보", originalTitle: "Unique Candidate" },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 50, title: "중복 후보", originalTitle: "Duplicate Candidate" },
    { providerId: "tmdb", mediaType: "tv", tmdbId: 60, title: "후속 후보", originalTitle: "Later Candidate" },
  ];

  const results = dedupeRelatedItems(related, primaryItems[1], primaryItems).slice(0, 2);
  assert.deepEqual(results.map((item) => item.tmdbId), [50, 60]);
});
