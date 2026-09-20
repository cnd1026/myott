import test from "node:test";
import assert from "node:assert/strict";

import { relatedTmdb } from "../../../../lib/tmdb.js";
import { normalizeTmdbProviderContentId } from "./providerContentId.js";

test("TMDB provider content IDs accept only positive safe integers", () => {
  assert.equal(normalizeTmdbProviderContentId("123"), "123");
  assert.equal(normalizeTmdbProviderContentId(456), "456");
  assert.equal(normalizeTmdbProviderContentId("0007"), "7");

  for (const hostileId of ["../../account", "1/credits", "1?api_key=other", "-1", "0", "1.5", "1e2", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(normalizeTmdbProviderContentId(hostileId), "");
  }
});

test("related TMDB rejects hostile IDs before issuing a provider request", async () => {
  const previousApiKey = process.env.TMDB_API_KEY;
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;

  process.env.TMDB_API_KEY = "offline-test-key";
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error("fetch must not be called for an invalid TMDB id");
  };

  try {
    for (const hostileId of ["../../account", 0, "1e2"]) {
      await assert.rejects(
        relatedTmdb({ tmdbId: hostileId, providerMediaType: "movie" }),
        /positive safe integer/,
      );
    }
    assert.equal(fetchCount, 0);
  } finally {
    if (previousApiKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousApiKey;
    globalThis.fetch = previousFetch;
  }
});

test("related TMDB preserves legitimate numeric ID requests", async () => {
  const previousApiKey = process.env.TMDB_API_KEY;
  const previousFetch = globalThis.fetch;
  const requestedPaths = [];

  process.env.TMDB_API_KEY = "offline-test-key";
  globalThis.fetch = async (url) => {
    requestedPaths.push(new URL(url).pathname);
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      async json() {
        return { results: [] };
      },
    };
  };

  try {
    const payload = await relatedTmdb({ tmdbId: "123", providerMediaType: "movie" });
    assert.equal(payload.source, "tmdb");
    assert.equal(payload.tmdbEnabled, true);
    assert.deepEqual(payload.results, []);
    assert.deepEqual(requestedPaths, [
      "/3/movie/123/recommendations",
      "/3/movie/123/similar",
    ]);
  } finally {
    if (previousApiKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousApiKey;
    globalThis.fetch = previousFetch;
  }
});
