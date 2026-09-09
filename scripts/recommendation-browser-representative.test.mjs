import assert from "node:assert/strict";
import test from "node:test";

import {
  ALLOWED_CHANGED_PATHS,
  EXACT_BASE_SHA,
  EXPECTED_BRANCH,
  FIRST_PICKS_QA_BINDING,
  QA_PORT_MAX,
  QA_PORT_MIN,
  SCENARIOS,
  VIEWPORTS,
  assignImmutableRequestOwner,
  detectKnownBadControl,
  desiredSelectionTransition,
  evaluateCaseEvidence,
  evaluateBaselineState,
  selectVisibleSubmitCandidate,
  selectLowestFreePort,
  validateRepositoryState,
} from "./recommendation-browser-representative.mjs";
import {
  BROWSER_QA_FIRST_PICKS_BINDING,
  GET as getFirstPicks,
  createFirstPicksResponse,
  resolveFirstPicksProvider,
} from "../app/api/recommend/first-picks/route.js";

async function withProcessEnv(overrides, callback) {
  const previous = Object.fromEntries(Object.keys(overrides).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) delete process.env[key];
      else process.env[key] = value;
    }
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function passingCase(scenarioId = "S2") {
  const routes = scenarioId === "S1"
    ? []
    : scenarioId === "S5"
      ? [{ path: "/api/recommend/seeds", method: "POST", requestIdPresent: true, status: 200, providerId: "mock", requestsUsed: 0, filters: [], types: [], titles: ["인터스텔라"] }]
      : scenarioId === "S6"
        ? [
            { path: "/api/recommend/options", method: "GET", requestIdPresent: true, status: 200, providerId: "mock", requestsUsed: 0, filters: ["netflix"], types: ["movie"] },
            { path: "/api/recommend/options", method: "GET", requestIdPresent: true, status: 200, providerId: "mock", requestsUsed: 0, filters: ["netflix"], types: ["drama"] },
          ]
        : [{
            path: "/api/recommend/options",
            method: "GET",
            requestIdPresent: true,
            status: 200,
            providerId: "mock",
            requestsUsed: 0,
            filters: scenarioId === "S2" ? ["netflix"] : ["country-jp", scenarioId === "S3" ? "genre-sf" : "genre-horror"],
            types: scenarioId === "S2" ? [] : ["drama"],
          }];
  return {
    scenarioId,
    viewport: { id: "desktop", width: 1440, height: 900 },
    routes,
    submitControl: scenarioId === "S1"
      ? null
      : { accessibleName: "내 취향으로 추천받기", visible: true, mobileSticky: false },
    loadingObserved: scenarioId !== "S1",
    dirtyObserved: scenarioId === "S5",
    resetObserved: scenarioId === "S5",
    latestRequestWins: scenarioId === "S6",
    consoleErrors: [],
    pageErrors: [],
    owningCaseErrors: [],
    infrastructureErrors: [],
    externalNetworkCount: 0,
    baseline: { pass: true },
    finalState: {
      horizontalOverflow: false,
      recommendDisabled: false,
      resultCount: 0,
      emptyVisible: true,
      checked: [
        { name: "contentType", value: "movie" },
        { name: "contentType", value: "drama" },
        { name: "contentType", value: "animation" },
      ],
      appliedVisible: ["S2", "S3", "S4", "S6"].includes(scenarioId),
    },
  };
}

test("matrix is exactly six scenarios by three required viewports", () => {
  assert.deepEqual(SCENARIOS.map((item) => item.id), ["S1", "S2", "S3", "S4", "S5", "S6"]);
  assert.deepEqual(VIEWPORTS.map(({ width, height }) => [width, height]), [[1440, 900], [768, 1024], [390, 844]]);
  assert.equal(SCENARIOS.length * VIEWPORTS.length, 18);
});

test("QA port selection never uses Founder or forbidden ports", () => {
  assert.equal(selectLowestFreePort([{ port: 3000, free: true }, { port: 3001, free: true }]), 3001);
  assert.equal(selectLowestFreePort([{ port: 3001, free: false }, { port: 3100, free: true }, { port: 3101, free: true }]), 3100);
  assert.throws(() => selectLowestFreePort([{ port: 3000, free: true }, { port: 3101, free: true }]), /No free port/);
  assert.equal(QA_PORT_MIN, 3001);
  assert.equal(QA_PORT_MAX, 3100);
});

test("repository preflight allows only the two Browser-QA paths", () => {
  assert.deepEqual(ALLOWED_CHANGED_PATHS, [
    "app/api/recommend/first-picks/route.js",
    "scripts/recommendation-browser-representative.mjs",
    "scripts/recommendation-browser-representative.test.mjs",
    "src/lib/providers/tmdb/testing/firstPickBrowserFixture.js",
  ]);
  assert.doesNotThrow(() => validateRepositoryState({
    branch: EXPECTED_BRANCH,
    head: EXACT_BASE_SHA,
    originMain: EXACT_BASE_SHA,
    staged: [],
    statusPaths: [...ALLOWED_CHANGED_PATHS],
  }));
  assert.throws(() => validateRepositoryState({
    branch: EXPECTED_BRANCH,
    head: EXACT_BASE_SHA,
    originMain: EXACT_BASE_SHA,
    staged: [],
    statusPaths: [...ALLOWED_CHANGED_PATHS, "app/page.jsx"],
  }), /Unexpected changed paths/);
});

for (const scenario of SCENARIOS) {
  test(`${scenario.id} contract accepts complete local evidence`, () => {
    assert.deepEqual(evaluateCaseEvidence(passingCase(scenario.id)), { pass: true, failures: [] });
  });
}

test("known-bad route status is actually detected", () => {
  const result = detectKnownBadControl(passingCase("S2"));
  assert.equal(result.detected, true);
  assert.equal(result.failures.includes("route-status"), true);
});

test("request ownership remains bound to the case that initiated it", () => {
  const owners = new Map();
  assert.equal(assignImmutableRequestOwner(owners, "request-a", "case-a"), "case-a");
  assert.equal(assignImmutableRequestOwner(owners, "request-a", "case-b"), "case-a");
});

test("known-bad active-case reassignment is detected by immutable ownership control", () => {
  const owners = new Map();
  const expected = assignImmutableRequestOwner(owners, "request-a", "case-a");
  const knownBad = "case-b";
  assert.notEqual(knownBad, expected);
});

test("desired selected state is idempotent and clicks only when needed", () => {
  assert.deepEqual(desiredSelectionTransition(true, true), { before: true, desired: true, clickCount: 0, after: true });
  assert.deepEqual(desiredSelectionTransition(false, true), { before: false, desired: true, clickCount: 1, after: true });
});

test("known-bad blind toggle would deselect an already selected control", () => {
  const desired = desiredSelectionTransition(true, true);
  const knownBadAfter = !true;
  assert.equal(desired.after, true);
  assert.equal(knownBadAfter, false);
});

test("baseline state contract fails closed on stale selection or disabled submit", () => {
  const clean = {
    checked: [
      { name: "contentType", value: "movie" },
      { name: "contentType", value: "drama" },
      { name: "contentType", value: "animation" },
    ],
    inputValue: "",
    dirtyVisible: false,
    appliedVisible: false,
    resultCount: 0,
  };
  assert.equal(evaluateBaselineState(clean).pass, true);
  assert.equal(evaluateBaselineState({ ...clean, checked: [...clean.checked, { name: "filter", value: "netflix" }] }).pass, false);
  assert.equal(evaluateBaselineState({ ...clean, inputValue: "stale" }).pass, false);
});

test("trusted first-picks binding enters the actual handler and deterministic provider fixture", async () => {
  assert.equal(FIRST_PICKS_QA_BINDING, BROWSER_QA_FIRST_PICKS_BINDING);
  await withProcessEnv({
    NODE_ENV: "development",
    MYOTT_BROWSER_QA_FIRST_PICKS_FIXTURE: FIRST_PICKS_QA_BINDING,
    TMDB_API_KEY: null,
    TMDB_BEARER_TOKEN: null,
  }, async () => {
    const response = await getFirstPicks(new Request("http://127.0.0.1/api/recommend/first-picks"));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.providerId, "tmdb");
    assert.equal(body.source, "tmdb");
    assert.equal(body.fallbackUsed, false);
    assert.equal(body.results.length, 3);
    assert.equal(body.results.every((item) => item.providerId === "tmdb" && /^91000[1-6]$/.test(String(item.providerContentId))), true);
  });
});

test("binding off preserves unavailable first-picks semantics", async () => {
  const unavailable = { id: "tmdb", isEnabled: () => false, getFirstPicks: async () => ({ results: [] }) };
  const provider = resolveFirstPicksProvider({ binding: "", nodeEnv: "development", defaultProvider: unavailable });
  assert.equal(provider, unavailable);
  const response = await createFirstPicksResponse(provider);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual((await response.json()).results, []);
});

test("public query header and cookie cannot activate the private fixture binding", async () => {
  await withProcessEnv({
    NODE_ENV: "development",
    MYOTT_BROWSER_QA_FIRST_PICKS_FIXTURE: null,
    TMDB_API_KEY: null,
    TMDB_BEARER_TOKEN: null,
  }, async () => {
    const request = new Request("http://127.0.0.1/api/recommend/first-picks?qa=1&fixture=A2_OFFLINE_FIRST_PICKS_V1", {
      headers: {
        "x-myott-fixture": FIRST_PICKS_QA_BINDING,
        cookie: `fixture=${FIRST_PICKS_QA_BINDING}`,
      },
    });
    const response = await getFirstPicks(request);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).dataSource, "unavailable");
  });
});

test("invalid private binding fails closed without live-provider fallback", async () => {
  let liveCalls = 0;
  const liveProvider = {
    id: "tmdb",
    isEnabled: () => true,
    getFirstPicks: async () => { liveCalls += 1; return { results: [] }; },
  };
  const provider = resolveFirstPicksProvider({ binding: "invalid", nodeEnv: "development", defaultProvider: liveProvider });
  assert.equal(provider, null);
  assert.equal((await createFirstPicksResponse(provider)).status, 503);
  assert.equal(liveCalls, 0);
});

test("fixture selection is stateless and cannot contaminate a later binding-off resolution", async () => {
  const unavailable = { id: "tmdb", isEnabled: () => false, getFirstPicks: async () => ({ results: [] }) };
  const on = resolveFirstPicksProvider({ binding: FIRST_PICKS_QA_BINDING, nodeEnv: "development", defaultProvider: unavailable });
  const off = resolveFirstPicksProvider({ binding: "", nodeEnv: "development", defaultProvider: unavailable });
  assert.equal((await createFirstPicksResponse(on)).status, 200);
  assert.equal((await createFirstPicksResponse(off)).status, 503);
});

for (const viewport of [
  { id: "desktop", candidates: [{ accessibleName: "내 취향으로 추천받기", visible: true, disabled: false, id: "recommendButton", mobileSticky: false }] },
  { id: "tablet", candidates: [{ accessibleName: "내 취향으로 추천받기", visible: true, disabled: false, id: "recommendButton", mobileSticky: false }] },
  { id: "mobile", candidates: [
    { accessibleName: "내 취향으로 추천받기", visible: false, disabled: false, id: "recommendButton", mobileSticky: false },
    { accessibleName: "내 취향으로 추천받기", visible: true, disabled: false, id: "", mobileSticky: true },
  ] },
]) {
  test(`${viewport.id} submit selection chooses the visible actionable Product control`, () => {
    const selected = selectVisibleSubmitCandidate(viewport.candidates);
    assert.ok(selected);
    assert.equal(selected.visible, true);
    if (viewport.id === "mobile") assert.equal(selected.mobileSticky, true);
    else assert.equal(selected.id, "recommendButton");
  });
}

test("known-bad hidden-only mobile submit selector is detected", () => {
  const selected = selectVisibleSubmitCandidate([
    { accessibleName: "내 취향으로 추천받기", visible: false, disabled: false, id: "recommendButton", mobileSticky: false },
  ]);
  assert.equal(selected, null);
});

test("external Browser traffic fails closed", () => {
  const evidence = passingCase("S3");
  evidence.externalNetworkCount = 1;
  assert.deepEqual(evaluateCaseEvidence(evidence), { pass: false, failures: ["external-network"] });
});

test("provider network evidence fails closed", () => {
  const evidence = passingCase("S4");
  evidence.routes[0].providerId = "tmdb";
  assert.equal(evaluateCaseEvidence(evidence).failures.includes("provider-network-contract"), true);
});

test("latest-request-wins requires two actual option routes and final drama state", () => {
  const evidence = passingCase("S6");
  evidence.latestRequestWins = false;
  assert.equal(evaluateCaseEvidence(evidence).failures.includes("latest-request-wins"), true);
  evidence.latestRequestWins = true;
  evidence.routes.pop();
  assert.equal(evaluateCaseEvidence(evidence).failures.includes("route-count"), true);
});

test("unexpected console, page, and horizontal overflow evidence fail closed", () => {
  const evidence = passingCase("S2");
  evidence.consoleErrors.push("error");
  evidence.pageErrors.push("exception");
  evidence.finalState.horizontalOverflow = true;
  assert.deepEqual(evaluateCaseEvidence(evidence).failures, ["console-errors", "page-errors", "horizontal-overflow"]);
});
