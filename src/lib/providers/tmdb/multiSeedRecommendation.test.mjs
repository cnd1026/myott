import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import { recommendSeedsTmdb } from "../../../../lib/tmdb.js";
import { clearTmdbRequestCache } from "./requestContext.js";
import {
  FIXTURE_SEEDS,
  createFixtureFetch,
  createRecommendationContextFactory,
} from "./testing/multiSeedFixture.mjs";

beforeEach(() => clearTmdbRequestCache());

test("one seed uses one context, applies seed scoring, and skips later phases when sufficient", async () => {
  const fixture = createFixtureFetch();
  const context = createRecommendationContextFactory(fixture);
  const payload = await recommendSeedsTmdb({
    titles: ["Seed Alpha"],
    contentTypes: ["movie"],
    requestContextFactory: context.factory,
  });

  assert.equal(context.count(), 1);
  assert.equal(payload.diagnostics.requestContextCount, 1);
  assert.ok(payload.diagnostics.requestsUsed <= 24);
  assert.equal(payload.diagnostics.aggregateRequestsUsed, payload.diagnostics.requestsUsed);
  assert.deepEqual(payload.processedSeeds, ["Seed Alpha"]);
  assert.equal(fixture.calls.some((call) => call.path.endsWith("/similar")), false);
  assert.equal(fixture.calls.some((call) => call.path.startsWith("/discover/")), false);
  assert.equal(payload.results.some((item) => item.title === "Seed Alpha"), false);
  assert.ok(payload.results.every((item) => item.scoreDetail?.signals?.titleMatch === 1));
});

test("three unique seeds share one context and execute search before recommendations", async () => {
  const fixture = createFixtureFetch();
  const context = createRecommendationContextFactory(fixture);
  const payload = await recommendSeedsTmdb({
    titles: [" Seed Alpha ", "seed alpha", "Seed Beta", "Seed Gamma", null],
    contentTypes: ["movie"],
    requestContextFactory: context.factory,
  });

  const listCalls = fixture.calls.filter((call) => call.path === "/search/multi" || call.path.endsWith("/recommendations"));
  assert.equal(context.count(), 1);
  assert.equal(payload.requestedSeedCount, 3);
  assert.equal(payload.processedSeedCount, 3);
  assert.equal(payload.diagnostics.requestsUsed, 22);
  assert.ok(payload.diagnostics.requestsUsed <= 24);
  assert.deepEqual(listCalls.slice(0, 3).map((call) => call.path), ["/search/multi", "/search/multi", "/search/multi"]);
  assert.ok(listCalls.slice(3, 6).every((call) => call.path.endsWith("/recommendations")));
  assert.ok(payload.results.filter((item) => item.reasonSeeds?.includes("Seed Alpha")).length >= 2);
  assert.ok(payload.results.filter((item) => item.reasonSeeds?.includes("Seed Beta")).length >= 2);
  assert.ok(payload.results.filter((item) => item.reasonSeeds?.includes("Seed Gamma")).length >= 2);
});

test("ten seeds remain inside one budget and report deferred work", async () => {
  const fixture = createFixtureFetch();
  const context = createRecommendationContextFactory(fixture);
  const payload = await recommendSeedsTmdb({
    titles: Object.values(FIXTURE_SEEDS).slice(0, 10).map((seed) => seed.title),
    contentTypes: ["movie"],
    requestContextFactory: context.factory,
  });

  assert.equal(context.count(), 1);
  assert.equal(payload.requestedSeedCount, 10);
  assert.equal(payload.processedSeedCount, 4);
  assert.equal(payload.deferredSeedCount, 6);
  assert.equal(payload.diagnostics.requestsUsed, 24);
  assert.equal(payload.diagnostics.aggregateRequestsUsed, 24);
  assert.ok(payload.results.length > 0);
});

test("a failed seed does not replace successful TMDB candidates", async () => {
  const fixture = createFixtureFetch({ failSearchTitles: ["Seed Alpha"] });
  const context = createRecommendationContextFactory(fixture);
  const payload = await recommendSeedsTmdb({
    titles: ["Seed Alpha", "Seed Beta", "Seed Gamma"],
    contentTypes: ["movie"],
    requestContextFactory: context.factory,
  });

  assert.equal(payload.source, "tmdb");
  assert.ok(payload.results.length > 0);
  assert.ok(payload.processedSeeds.includes("Seed Beta"));
  assert.ok(payload.processedSeeds.includes("Seed Gamma"));
  assert.ok(payload.deferredSeeds.includes("Seed Alpha"));
  assert.equal(payload.results.some((item) => item.source === "mock"), false);
});

test("all failed seed searches surface an explicit provider failure", async () => {
  const fixture = createFixtureFetch({
    failSearchTitles: ["Seed Alpha", "Seed Beta", "Seed Gamma"],
  });
  const context = createRecommendationContextFactory(fixture);

  await assert.rejects(
    recommendSeedsTmdb({
      titles: ["Seed Alpha", "Seed Beta", "Seed Gamma"],
      contentTypes: ["movie"],
      requestContextFactory: context.factory,
    }),
    /multi-seed recommendation requests failed/i,
  );
});

test("similar results stop discover supplement when they become sufficient", async () => {
  const fixture = createFixtureFetch({ recommendationCount: 0, similarCount: 14 });
  const context = createRecommendationContextFactory(fixture);
  const payload = await recommendSeedsTmdb({
    titles: ["Seed Alpha"],
    contentTypes: ["movie"],
    requestContextFactory: context.factory,
  });

  assert.ok(payload.results.length > 0);
  assert.equal(fixture.calls.filter((call) => call.path.endsWith("/similar")).length, 1);
  assert.equal(fixture.calls.some((call) => call.path.startsWith("/discover/")), false);
});

test("overall deadline returns successful seed candidates without starting later phases", async () => {
  const fixture = createFixtureFetch({ stallRecommendationTitles: ["Seed Beta"] });
  const context = createRecommendationContextFactory(fixture, {
    fetchTimeoutMs: 100,
    recommendationDeadlineMs: 30,
  });
  const payload = await recommendSeedsTmdb({
    titles: ["Seed Alpha", "Seed Beta"],
    contentTypes: ["movie"],
    requestContextFactory: context.factory,
  });

  assert.ok(payload.results.length > 0);
  assert.equal(payload.diagnostics.deadlineExceeded, true);
  assert.equal(payload.diagnostics.earlyStopReason, "recommendation-deadline-exceeded");
  assert.ok(payload.deferredSeeds.includes("Seed Beta"));
  assert.equal(fixture.calls.some((call) => call.path.endsWith("/similar")), false);
  assert.equal(fixture.calls.some((call) => call.path.startsWith("/discover/")), false);
});
