import assert from "node:assert/strict";
import test from "node:test";

import {
  dedupeRelatedItems,
  excludeProviderIdentityMatches,
  isSameContent,
  parseExcludeContentIdentities,
  providerContentKey,
  providerContentKeySet,
} from "./contentIdentity.js";

const current = { providerId: "tmdb", mediaType: "movie", tmdbId: 277834, title: "모아나", originalTitle: "Moana" };

test("provider identity excludes the current content", () => {
  assert.equal(providerContentKey(current), "tmdb:movie:277834");
  assert.equal(isSameContent(current, { ...current, title: "Moana" }), true);
});

test("optional exclusion identities normalize, dedupe, and enforce the approved cap", () => {
  assert.deepEqual(parseExcludeContentIdentities(undefined), { valid: true, identities: [] });
  assert.deepEqual(
    parseExcludeContentIdentities('["TMDB:MOVIE:10","tmdb:movie:10","tmdb:tv:20"]'),
    { valid: true, identities: ["tmdb:movie:10", "tmdb:tv:20"] },
  );
  assert.equal(parseExcludeContentIdentities(["tmdb:movie:1", "tmdb:movie:2", "tmdb:movie:3"]).valid, true);
  assert.equal(parseExcludeContentIdentities(["tmdb:movie:1", "tmdb:movie:2", "tmdb:movie:3", "tmdb:movie:4"]).valid, false);
});

test("malformed exclusion identities never fall back to title matching", () => {
  for (const malformed of ["not-json", ["Movie Title"], [{ title: "Movie Title" }], ["tmdb:book:1"], ["tmdb:movie:0"]]) {
    assert.equal(parseExcludeContentIdentities(malformed).valid, false);
  }

  const sameTitleCandidates = [
    { providerId: "tmdb", providerMediaType: "movie", tmdbId: 1, title: "Same Title" },
    { providerId: "tmdb", providerMediaType: "movie", tmdbId: 2, title: "Same Title" },
  ];
  const results = excludeProviderIdentityMatches(sameTitleCandidates, new Set(["tmdb:movie:1"]));
  assert.deepEqual(results.map(providerContentKey), ["tmdb:movie:2"]);
});

test("primary results exclude visible First Picks by provider identity and backfill in rank order", () => {
  const visibleFirstPicks = [
    { providerId: "tmdb", providerMediaType: "movie", providerContentId: "2", title: "표시 제목" },
    { providerId: "tmdb", providerMediaType: "tv", tmdbId: 4, title: "다른 표시 제목" },
  ];
  const candidates = [
    { providerId: "tmdb", providerMediaType: "movie", tmdbId: 1, title: "A" },
    { providerId: "tmdb", providerMediaType: "movie", tmdbId: 2, title: "완전히 다른 제목" },
    { providerId: "other", providerMediaType: "movie", tmdbId: 2, title: "표시 제목" },
    { providerId: "tmdb", providerMediaType: "tv", tmdbId: 4, title: "D" },
    { providerId: "tmdb", providerMediaType: "tv", tmdbId: 5, title: "E" },
  ];

  const results = excludeProviderIdentityMatches(candidates, providerContentKeySet(visibleFirstPicks), 3);
  assert.deepEqual(results.map(providerContentKey), ["tmdb:movie:1", "other:movie:2", "tmdb:tv:5"]);
});

test("primary identity exclusion returns fewer results without fabricating candidates", () => {
  const candidates = [
    { providerId: "tmdb", providerMediaType: "movie", tmdbId: 1, title: "A" },
    { providerId: "tmdb", providerMediaType: "movie", tmdbId: 2, title: "B" },
  ];
  const excluded = providerContentKeySet([candidates[0]]);

  assert.deepEqual(excludeProviderIdentityMatches(candidates, excluded, 3), [candidates[1]]);
  assert.deepEqual(candidates.map((item) => item.tmdbId), [1, 2]);
});

test("each recommendation execution keeps its own visible First Pick identity snapshot", () => {
  const candidates = [
    { providerId: "tmdb", providerMediaType: "movie", tmdbId: 1, title: "A" },
    { providerId: "tmdb", providerMediaType: "movie", tmdbId: 2, title: "B" },
    { providerId: "tmdb", providerMediaType: "movie", tmdbId: 3, title: "C" },
  ];
  const firstExecutionKeys = providerContentKeySet([candidates[0]]);
  const firstExecution = excludeProviderIdentityMatches(candidates, firstExecutionKeys, 2);
  const secondExecutionKeys = providerContentKeySet([candidates[1]]);
  const secondExecution = excludeProviderIdentityMatches(candidates, secondExecutionKeys, 2);

  assert.deepEqual(firstExecution.map((item) => item.tmdbId), [2, 3]);
  assert.deepEqual(secondExecution.map((item) => item.tmdbId), [1, 3]);
  assert.deepEqual(firstExecution.map((item) => item.tmdbId), [2, 3]);
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
