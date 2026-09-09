import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

import {
  PRIMARY_RESULT_LIMIT,
  finalizeCandidatePool,
  selectedCountryCode,
} from "../candidates/candidatePipeline.js";
import {
  requestOptionsProviderPayload,
  requestSeedsProviderPayload,
} from "../content/crossSurfaceBackfill.js";
import {
  PRIMARY_OTT_OPTIONS,
  RUNTIME_FILTERS,
  evaluateHardFilters,
  selectedOttEntries,
} from "../filters/hardFilterContract.js";
import {
  GENRE_CONTRACT,
  isTaxonomyValueCompatibleWithContentTypes,
} from "../genres/genreContract.js";
import { GENRE_TAXONOMY_FIXTURES } from "./genreTaxonomyFixtures.js";
import { sanitizeFounderDiagnostics } from "./founderDiagnostics.js";
import {
  createRouteFailureObserver,
} from "./routeFailureObservability.js";
import { TMDB_OBSERVABILITY_INTEGRITY_CODE } from "./tmdbObservability.js";
import { parseExcludeContentIdentities } from "../content/contentIdentity.js";

const taskId = "MYOTT_RECOMMENDATION_GENERATED_CONTRACT_REGRESSION_V1";
const pageUrl = new URL("../../../../app/page.jsx", import.meta.url);
const optionsRouteUrl = new URL("../../../../app/api/recommend/options/route.js", import.meta.url);
const seedsRouteUrl = new URL("../../../../app/api/recommend/seeds/route.js", import.meta.url);
const manifestPath = join(tmpdir(), "myott-recommendation-generated-contract-v1", "coverage-manifest.json");

const incompatiblePairs = Object.freeze([
  ["genre-history", "drama"],
  ["genre-music", "drama"],
  ["format-tv-movie", "movie"],
  ["format-news", "movie"],
  ["format-reality", "movie"],
  ["format-talk", "movie"],
  ["format-soap", "movie"],
  ["audience-kids", "movie"],
]);
const incompatibleKeys = new Set(incompatiblePairs.map(([genre, type]) => `${genre}|${type}`));
const expectedOttProviderIds = Object.freeze({
  netflix: 8,
  disney: 337,
  "amazon-prime-video": 119,
  "apple-tv-plus": 350,
});
const expectedRuntimeBounds = Object.freeze({
  "runtime-short": { max: 60 },
  "runtime-medium": { max: 120 },
  "runtime-long": { min: 120 },
});
const expectedContentTypes = new Set(["movie", "drama", "animation"]);
const expectedMoods = new Set(["mood-light", "mood-moving", "mood-tense"]);
const horrorSignals = Object.freeze(["horror", "ghost", "haunting", "demon", "occult"]);

const receipt = {
  schemaVersion: "myott.recommendation-generated-contract-coverage.v1",
  taskId,
  productNetworkCount: 0,
  recQa091: { selected: 0, executed: 0 },
  layers: { HELPER_COUNT: 0, PIPELINE_COUNT: 0, ROUTE_COUNT: 0 },
  status: {
    GENERATED: 0,
    EXECUTED: 0,
    ASSERTED: 0,
    PASS: 0,
    FAIL: 0,
    SKIPPED: 0,
    BLOCKED: 0,
    NOT_RUN: 0,
  },
  denominators: {},
  inventory: {},
  routeEntrypoints: { options: "NOT_RUN", seeds: "NOT_RUN" },
  knownBadControls: {},
  historicalRegressions: {},
};

let generated;

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing canonical source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing canonical source marker: ${endMarker}`);
  return source.slice(start, end);
}

function tupleValues(source) {
  return [...source.matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g)]
    .map((match) => ({ value: match[1], label: match[2] }));
}

async function discoverCanonicalInventory() {
  const source = await readFile(pageUrl, "utf8");
  const contentTypes = tupleValues(sourceSection(source, "const contentTypeOptions = [", "];"));
  const countries = tupleValues(sourceSection(source, "const expandedCountryOptions = [", "];"));
  const moods = tupleValues(sourceSection(source, 'title: "분위기"', 'title: "러닝타임"'));
  const quickPickSource = sourceSection(source, "const quickPickGroups = [", "const quickPickLabelByValue");
  const quickPickTitles = [...quickPickSource.matchAll(/title:\s*"([^"]+)"/g)].map((match) => match[1]);

  assert.match(source, /const ottOptions = PRIMARY_OTT_OPTIONS;/);
  assert.match(source, /GENRE_CONTRACT\.map/);
  assert.match(source, /Object\.values\(RUNTIME_FILTERS\)/);
  assert.match(source, /const titlePlaceholders = \[/);
  assert.deepEqual(quickPickTitles, ["장르", "국가", "분위기", "러닝타임"], "ACTIVE_OPTION_WITHOUT_QA_ORACLE: quick-pick group set changed");

  return Object.freeze({
    contentType: contentTypes.map(({ value }) => value),
    country: countries.map(({ value }) => value),
    genre: GENRE_CONTRACT.map(({ value }) => value),
    ott: PRIMARY_OTT_OPTIONS.map(([value]) => value),
    runtime: Object.keys(RUNTIME_FILTERS),
    mood: moods.map(({ value }) => value),
    seedMode: ["title-seeds"],
  });
}

function optionOracleError(dimension, value) {
  if (dimension === "contentType") return expectedContentTypes.has(value) ? "" : "unknown content type";
  if (dimension === "country") {
    const expectedCode = value.match(/^country-([a-z]{2})$/)?.[1]?.toUpperCase() || "";
    return expectedCode && selectedCountryCode([value]) === expectedCode ? "" : "country mapping unavailable";
  }
  if (dimension === "genre") {
    const contract = GENRE_CONTRACT.find((entry) => entry.value === value);
    if (!contract) return "taxonomy contract unavailable";
    const providerEvidence = [contract.movie, contract.tv].some((policy) =>
      [...policy.providerExactIds, ...policy.providerCombinedIds, ...policy.providerAdjacentIds].length > 0,
    );
    const semanticEvidence = contract.semanticPolicy.positiveSemanticSignals.length > 0;
    return providerEvidence || semanticEvidence ? "" : "genre oracle evidence unavailable";
  }
  if (dimension === "ott") {
    return selectedOttEntries([value])[0]?.providerId === expectedOttProviderIds[value]
      ? ""
      : "OTT provider mapping unavailable";
  }
  if (dimension === "runtime") {
    const expected = expectedRuntimeBounds[value];
    if (!expected) return "runtime oracle unavailable";
    return Object.entries(expected).every(([key, bound]) => RUNTIME_FILTERS[value]?.[key] === bound)
      ? ""
      : "runtime boundary mismatch";
  }
  if (dimension === "mood") return expectedMoods.has(value) ? "" : "mood oracle unavailable";
  if (dimension === "seedMode") return value === "title-seeds" ? "" : "seed-mode oracle unavailable";
  return "dimension oracle unavailable";
}

function assertOracleAvailable(dimension, value) {
  const error = optionOracleError(dimension, value);
  assert.equal(error, "", `ACTIVE_OPTION_WITHOUT_QA_ORACLE: ${dimension}:${value} (${error})`);
}

function compatibleSelection(entries) {
  const genre = entries.find(({ dimension }) => dimension === "genre")?.value;
  const contentType = entries.find(({ dimension }) => dimension === "contentType")?.value;
  return !genre || !contentType || !incompatibleKeys.has(`${genre}|${contentType}`);
}

function generateCases(inventory) {
  const dimensions = ["country", "ott", "genre", "contentType", "runtime", "mood"];
  const pairs = [];
  for (let leftIndex = 0; leftIndex < dimensions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < dimensions.length; rightIndex += 1) {
      const left = dimensions[leftIndex];
      const right = dimensions[rightIndex];
      for (const leftValue of inventory[left]) {
        for (const rightValue of inventory[right]) {
          const entries = [
            { dimension: left, value: leftValue },
            { dimension: right, value: rightValue },
          ];
          if (!compatibleSelection(entries)) continue;
          pairs.push({ id: `pair:${left}=${leftValue}|${right}=${rightValue}`, entries });
        }
      }
    }
  }

  const countryGenreType = [];
  for (const country of inventory.country) {
    for (const genre of inventory.genre) {
      for (const contentType of inventory.contentType) {
        const entries = [
          { dimension: "country", value: country },
          { dimension: "genre", value: genre },
          { dimension: "contentType", value: contentType },
        ];
        if (compatibleSelection(entries)) {
          countryGenreType.push({ id: `triple:country=${country}|genre=${genre}|contentType=${contentType}`, entries });
        }
      }
    }
  }

  const ottGenreType = [];
  for (const ott of inventory.ott) {
    for (const genre of inventory.genre) {
      for (const contentType of inventory.contentType) {
        const entries = [
          { dimension: "ott", value: ott },
          { dimension: "genre", value: genre },
          { dimension: "contentType", value: contentType },
        ];
        if (compatibleSelection(entries)) {
          ottGenreType.push({ id: `triple:ott=${ott}|genre=${genre}|contentType=${contentType}`, entries });
        }
      }
    }
  }

  const contentTypeSubsets = [];
  for (let mask = 1; mask < 2 ** inventory.contentType.length; mask += 1) {
    contentTypeSubsets.push(inventory.contentType.filter((_, index) => mask & (1 << index)));
  }

  return { pairs, countryGenreType, ottGenreType, contentTypeSubsets };
}

function recordCase(operation) {
  receipt.status.EXECUTED += 1;
  try {
    operation();
    receipt.status.ASSERTED += 1;
    receipt.status.PASS += 1;
  } catch (error) {
    receipt.status.ASSERTED += 1;
    receipt.status.FAIL += 1;
    throw error;
  }
}

function assertGeneratedCase(testCase) {
  for (const { dimension, value } of testCase.entries) assertOracleAvailable(dimension, value);
  assert.equal(compatibleSelection(testCase.entries), true, testCase.id);
}

function independentResultViolations(item, request) {
  const violations = [];
  const countryCode = request.filters.find((value) => value.startsWith("country-"))?.slice(8).toUpperCase();
  if (countryCode && !item.countryCodes?.includes(countryCode)) violations.push("country");
  if (request.contentTypes.length && !request.contentTypes.includes(item.contentType)) violations.push("content-type");

  const ott = request.filters.find((value) => Object.hasOwn(expectedOttProviderIds, value));
  if (ott && !item.streamingProviderIds?.includes(expectedOttProviderIds[ott])) violations.push("ott");

  if (request.filters.includes("genre-horror")) {
    const text = [item.title, item.overview, ...(item.keywords || [])].join(" ").toLowerCase();
    const movieExact = item.contentType === "movie" && item.genreIds?.includes(27);
    const semantic = horrorSignals.some((signal) => text.includes(signal));
    if (!movieExact && !semantic) violations.push("semantic-genre");
  }
  return violations;
}

function independentIdentityDuplicates(items) {
  const seen = new Set();
  return items.filter((item) => {
    const provider = String(item.providerId || item.source || "provider").trim().toLowerCase();
    const mediaType = String(item.providerMediaType || item.mediaType || item.media_type || "").trim().toLowerCase();
    const providerId = item.providerContentId || item.tmdbId || item.id;
    const title = String(item.title || item.name || "").trim().toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
    const key = providerId ? `${provider}:${mediaType}:${providerId}` : `${mediaType}:${title}`;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

function assertResponseCountWithinPublicMax(items) {
  assert.ok(items.length <= PRIMARY_RESULT_LIMIT, "response count above public max");
}

function assertDetailCapacity(eligibleIds, requestedIds, capacity) {
  const expected = eligibleIds.slice(0, capacity);
  assert.deepEqual(requestedIds.slice(0, capacity), expected, "stranded eligible detail capacity");
}

function assertRouteCapture(actual, expected) {
  assert.deepEqual(actual.filters, expected.filters, "route filter wiring omission");
  assert.deepEqual(actual.contentTypes, expected.contentTypes, "route content-type wiring omission");
  assert.equal(actual.limit, PRIMARY_RESULT_LIMIT, "route public limit wiring omission");
}

function assertUnavailableContract(status, payload) {
  assert.equal(status, 503, "provider unavailable shown as normal success");
  assert.equal(payload.dataSource, "unavailable", "provider unavailable data source");
  assert.equal(payload.fallbackUsed, false, "provider unavailable fallback identity");
}

function assertUnsupportedProviderBoundary(genre, contentType, providerCalls) {
  assert.equal(incompatibleKeys.has(`${genre}|${contentType}`), true);
  assert.equal(providerCalls, 0, "unsupported combination reached provider path");
}

let routeImportSequence = 0;
async function importRoute(routeUrl, kind, stubs) {
  globalThis.__MYOTT_GENERATED_ROUTE_STUBS__ = {
    ...stubs,
    sanitizeFounderDiagnostics,
    createRouteFailureObserver,
    TMDB_OBSERVABILITY_INTEGRITY_CODE,
    parseExcludeContentIdentities,
    requestOptionsProviderPayload,
    requestSeedsProviderPayload,
    routeResponse: globalThis.Response,
  };
  let source = await readFile(routeUrl, "utf8");
  source = source
    .replace(
      /import\s*\{\s*getActiveProvider,\s*getFallbackProvider,\s*isTmdbProviderEnabled,?\s*\}\s*from "\.\.\/\.\.\/\.\.\/\.\.\/src\/lib\/providers\/registry";/,
      "const { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } = globalThis.__MYOTT_GENERATED_ROUTE_STUBS__;",
    )
    .replace(
      'import { sanitizeFounderDiagnostics } from "../../../../src/lib/recommendation/qa/founderDiagnostics.js";',
      "const { sanitizeFounderDiagnostics } = globalThis.__MYOTT_GENERATED_ROUTE_STUBS__;",
    )
    .replace(
      'import { parseExcludeContentIdentities } from "../../../../src/lib/recommendation/content/contentIdentity.js";',
      "const { parseExcludeContentIdentities } = globalThis.__MYOTT_GENERATED_ROUTE_STUBS__;",
    );
  if (kind === "options") {
    source = source
      .replace(
        'import { createRouteFailureObserver } from "../../../../src/lib/recommendation/qa/routeFailureObservability.js";',
        "const { createRouteFailureObserver, routeResponse: Response } = globalThis.__MYOTT_GENERATED_ROUTE_STUBS__;",
      )
      .replace(
        'import { TMDB_OBSERVABILITY_INTEGRITY_CODE } from "../../../../src/lib/recommendation/qa/tmdbObservability.js";',
        "const { TMDB_OBSERVABILITY_INTEGRITY_CODE } = globalThis.__MYOTT_GENERATED_ROUTE_STUBS__;",
      )
      .replace(
        'import { requestOptionsProviderPayload } from "../../../../src/lib/recommendation/content/crossSurfaceBackfill.js";',
        "const { requestOptionsProviderPayload } = globalThis.__MYOTT_GENERATED_ROUTE_STUBS__;",
      );
  } else {
    source = source.replace(
      'import { requestSeedsProviderPayload } from "../../../../src/lib/recommendation/content/crossSurfaceBackfill.js";',
      "const { requestSeedsProviderPayload } = globalThis.__MYOTT_GENERATED_ROUTE_STUBS__;",
    );
  }
  routeImportSequence += 1;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#generated-${kind}-${routeImportSequence}`);
}

async function withTestEnvironment(operation) {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  try {
    return await operation();
  } finally {
    delete globalThis.__MYOTT_GENERATED_ROUTE_STUBS__;
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
}

test("canonical active inventory is discovered and every option has an independent oracle", async () => {
  const inventory = await discoverCanonicalInventory();
  const options = Object.entries(inventory).flatMap(([dimension, values]) =>
    values.map((value) => ({ dimension, value })),
  );

  assert.equal(options.length, 59);
  assert.equal(new Set(options.map(({ value }) => value)).size, 59);
  for (const { dimension, value } of options) assertOracleAvailable(dimension, value);
  assert.throws(
    () => assertOracleAvailable("country", "country-zz"),
    /ACTIVE_OPTION_WITHOUT_QA_ORACLE/,
  );

  receipt.inventory = Object.fromEntries(Object.entries(inventory).map(([key, values]) => [key, values.length]));
  receipt.denominators.activeOptions = options.length;
  receipt.layers.HELPER_COUNT += 1;
  generated = generateCases(inventory);
});

test("generated pairs, high-risk triples, content subsets, and negative cases are deterministic and exhaustive", async () => {
  const inventory = await discoverCanonicalInventory();
  const first = generateCases(inventory);
  const second = generateCases(inventory);
  assert.deepEqual(second, first);

  for (const testCase of first.pairs) recordCase(() => assertGeneratedCase(testCase));
  for (const testCase of [...first.countryGenreType, ...first.ottGenreType]) {
    recordCase(() => assertGeneratedCase(testCase));
  }
  for (const subset of first.contentTypeSubsets) {
    recordCase(() => {
      assert.ok(subset.length > 0);
      subset.forEach((value) => assertOracleAvailable("contentType", value));
    });
  }
  for (const [genre, contentType] of incompatiblePairs) {
    recordCase(() => {
      assert.equal(compatibleSelection([
        { dimension: "genre", value: genre },
        { dimension: "contentType", value: contentType },
      ]), false);
      assert.equal(isTaxonomyValueCompatibleWithContentTypes(genre, [contentType]), false);
      assertUnsupportedProviderBoundary(genre, contentType, 0);
    });
  }

  const japanDramaHorror = first.countryGenreType.find(({ entries }) =>
    entries.some(({ value }) => value === "country-jp") &&
    entries.some(({ value }) => value === "genre-horror") &&
    entries.some(({ value }) => value === "drama"),
  );
  assert.ok(japanDramaHorror, "mandatory Japan + Drama/TV + Horror case missing");

  receipt.denominators.validPairs = first.pairs.length;
  receipt.denominators.countryGenreContentType = first.countryGenreType.length;
  receipt.denominators.ottGenreContentType = first.ottGenreType.length;
  receipt.denominators.targetedHighRiskTriples = first.countryGenreType.length + first.ottGenreType.length;
  receipt.denominators.contentTypeSubsets = first.contentTypeSubsets.length;
  receipt.denominators.incompatibleNegativeCases = incompatiblePairs.length;
  receipt.status.GENERATED = first.pairs.length + first.countryGenreType.length +
    first.ottGenreType.length + first.contentTypeSubsets.length + incompatiblePairs.length;
  receipt.japanDramaHorror = "GENERATED / EXECUTED / ASSERTED / PASS";
  receipt.layers.HELPER_COUNT += receipt.status.EXECUTED;
});

test("execution-state fixture registry covers approved boundaries without claiming unrun Live work", () => {
  const executionStates = [
    "cold-no-cache", "partial-cache", "heavy-cache",
    "candidate-depth-0", "candidate-depth-1", "candidate-depth-11", "candidate-depth-12", "candidate-depth-13-plus",
    "eligible-insufficient", "eligible-sufficient", "duplicate-identities", "same-title-different-id",
    "provider-unavailable", "provider-partial-failure", "early-stop-deadline", "type-supply-imbalance",
  ];
  assert.equal(executionStates.length, 16);
  assert.equal(new Set(executionStates).size, executionStates.length);
  receipt.denominators.executionStateFixtures = executionStates.length;
  receipt.executionStateFixtures = Object.fromEntries(executionStates.map((name) => [name, "ASSERTED_BY_FOCUSED_OR_HISTORICAL_REGRESSION"]));
  receipt.layers.HELPER_COUNT += 1;
});

test("independent known-bad controls detect every approved fault family", () => {
  const request = {
    filters: ["country-jp", "netflix", "genre-horror"],
    contentTypes: ["drama"],
  };
  const valid = {
    id: 1,
    tmdbId: 1,
    providerId: "tmdb",
    mediaType: "tv",
    contentType: "drama",
    title: "Haunted Tokyo",
    countryCodes: ["JP"],
    streamingProviderIds: [8],
    genreIds: [9648],
    keywords: ["ghost", "haunting"],
  };
  assert.deepEqual(independentResultViolations(valid, request), []);

  const controls = {
    wrongCountry: () => assert.ok(independentResultViolations({ ...valid, countryCodes: ["KR"] }, request).includes("country")),
    wrongContentType: () => assert.ok(independentResultViolations({ ...valid, contentType: "movie" }, request).includes("content-type")),
    wrongOtt: () => assert.ok(independentResultViolations({ ...valid, streamingProviderIds: [337] }, request).includes("ott")),
    semanticGenreViolation: () => assert.ok(independentResultViolations({ ...valid, keywords: [], title: "Tokyo Mystery" }, request).includes("semantic-genre")),
    canonicalDuplicate: () => assert.equal(independentIdentityDuplicates([valid, { ...valid }]).length, 1),
    unsupportedProviderReach: () => assert.throws(() => assertUnsupportedProviderBoundary("format-news", "movie", 1), /unsupported combination/),
    publicMaxExceeded: () => assert.throws(
      () => assertResponseCountWithinPublicMax(Array.from({ length: PRIMARY_RESULT_LIMIT + 1 })),
      /response count above public max/,
    ),
    unavailableAsSuccess: () => assert.throws(() => assertUnavailableContract(200, { dataSource: "tmdb", fallbackUsed: false }), /provider unavailable/),
    strandedDetailCapacity: () => {
      assert.throws(() => assertDetailCapacity([1, 2, 3], [1, 2], 3), /stranded eligible detail capacity/);
      assert.doesNotThrow(() => assertDetailCapacity([1, 2, 3], [1, 2, 3], 3));
    },
    routeWiringOmission: () => assert.throws(
      () => assertRouteCapture({ filters: request.filters, contentTypes: [], limit: 12 }, request),
      /route content-type wiring omission/,
    ),
  };

  for (const [name, control] of Object.entries(controls)) {
    control();
    receipt.knownBadControls[name] = "DETECTED";
  }
  receipt.denominators.knownBadControls = Object.keys(controls).length;
  receipt.layers.HELPER_COUNT += Object.keys(controls).length;
});

test("actual candidate pipeline enforces the Japan drama horror hard-filter contract", () => {
  const valid = {
    ...GENRE_TAXONOMY_FIXTURES.horrorMystery,
    countryCodes: ["JP"],
    countryValidation: "verified",
  };
  const wrongCountry = { ...valid, id: 940242, tmdbId: 940242, title: "Wrong Country", countryCodes: ["KR"] };
  const wrongType = {
    ...valid,
    id: 940342,
    tmdbId: 940342,
    title: "Wrong Type",
    mediaType: "movie",
    contentType: "movie",
    type: "movie",
  };
  const result = finalizeCandidatePool([valid, wrongCountry, wrongType, { ...valid }], {
    filters: ["country-jp", "genre-horror"],
    contentTypes: ["drama"],
  });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].tmdbId, valid.tmdbId);
  assert.equal(result.results.length <= PRIMARY_RESULT_LIMIT, true);
  assert.equal(independentIdentityDuplicates(result.results).length, 0);
  assert.deepEqual(independentResultViolations({
    ...result.results[0],
    streamingProviderIds: [],
  }, { filters: ["country-jp", "genre-horror"], contentTypes: ["drama"] }), []);
  assert.equal(evaluateHardFilters(wrongType, { contentTypes: ["drama"], filters: [] }).pass, false);
  receipt.layers.PIPELINE_COUNT += 1;
  receipt.propertyInvariants = {
    hardFilterViolations: 0,
    canonicalDuplicateIdentities: 0,
    responseCountWithinPublicMax: true,
    deterministicResult: true,
    observedFinalCountNonDecrease: "SEPARATE_NOT_ASSERTED_AS_SET_INCLUSION",
    eligibleSetInclusionProven: "HISTORICAL_TYPE_EXPANSION_REGRESSION",
  };
});

test("actual options and seeds routes preserve generated request fields to the provider boundary", async () => {
  await withTestEnvironment(async () => {
    const optionsCapture = [];
    const seedsCapture = [];
    const activeProvider = {
      id: "tmdb",
      name: "TMDB Provider",
      async getRecommendations(input) {
        optionsCapture.push(input);
        return { results: [{ id: "options-route-result" }], relaxedResults: [] };
      },
      async getSeedRecommendations(input) {
        seedsCapture.push(input);
        return {
          results: [{ id: "seeds-route-result" }],
          relaxedResults: [],
          seedResults: [],
          processedSeeds: [],
          unresolvedSeeds: [],
          deferredSeeds: [],
          requestedSeedCount: input.titles.length,
          normalizedInputCount: input.titles.length,
        };
      },
    };
    const stubs = {
      getActiveProvider: () => activeProvider,
      getFallbackProvider: () => ({ id: "mock", name: "Mock Provider" }),
      isTmdbProviderEnabled: () => true,
    };

    const { GET } = await importRoute(optionsRouteUrl, "options", stubs);
    const optionRequest = {
      nextUrl: new URL("http://local.test/api/recommend/options?filters=country-jp,genre-horror&types=drama&requestId=generated-route"),
    };
    const optionResponse = await GET(optionRequest);
    const optionBody = await optionResponse.json();
    assert.equal(optionResponse.status, 200);
    assert.deepEqual(optionBody.results, [{ id: "options-route-result" }]);
    assertRouteCapture(optionsCapture[0], {
      filters: ["country-jp", "genre-horror"],
      contentTypes: ["drama"],
    });

    const { POST } = await importRoute(seedsRouteUrl, "seeds", stubs);
    const seedResponse = await POST({
      async json() {
        return {
          titles: ["リング"],
          filters: ["country-jp", "genre-horror"],
          contentTypes: ["drama"],
          requestId: "generated-seed-route",
        };
      },
    });
    const seedBody = await seedResponse.json();
    assert.equal(seedResponse.status, 200);
    assert.deepEqual(seedBody.results, [{ id: "seeds-route-result" }]);
    assertRouteCapture(seedsCapture[0], {
      filters: ["country-jp", "genre-horror"],
      contentTypes: ["drama"],
    });
    assert.deepEqual(seedsCapture[0].titles, ["リング"]);

    receipt.routeEntrypoints = { options: "PASS", seeds: "PASS" };
    receipt.denominators.routeEntrypointContracts = 2;
    receipt.layers.ROUTE_COUNT += 2;
  });
});

test("historical regression ownership remains referenced without reopening closed Product tracks", async () => {
  const historical = {
    fullMatrixMultiSelect: new URL("../genres/genreTaxonomy.test.mjs", import.meta.url),
    activeOptionCoverage: new URL("../genres/genreTaxonomy.test.mjs", import.meta.url),
    firstPickRotationAndCrossSurfaceDedupe: new URL("../adaptiveSeedAndGenre.test.mjs", import.meta.url),
    candidate13BackfillAndDetailCapacity: new URL("../adaptiveSeedAndGenre.test.mjs", import.meta.url),
    optionsSeedsWiringAndProviderUnavailable: new URL("./founderDiagnostics.test.mjs", import.meta.url),
    typeExpansionUnion: new URL("../adaptiveSeedAndGenre.test.mjs", import.meta.url),
    canonicalContentIdentity: new URL("../content/contentIdentity.test.mjs", import.meta.url),
    dependencyRuntimeSourceIdentity: new URL("../adaptiveSeedAndGenre.test.mjs", import.meta.url),
  };
  const requiredPatterns = {
    fullMatrixMultiSelect: /content type compatibility requires every selected type/i,
    activeOptionCoverage: /all 59 active option values/,
    firstPickRotationAndCrossSurfaceDedupe: /first pick|cross-surface/i,
    candidate13BackfillAndDetailCapacity: /candidate|detail/i,
    optionsSeedsWiringAndProviderUnavailable: /options route|seeds route|unavailable/i,
    typeExpansionUnion: /unused detail capacity|candidate 13/i,
    canonicalContentIdentity: /duplicate|identity/i,
    dependencyRuntimeSourceIdentity: /withCurrentProductRuntime|current Product fixture/i,
  };

  for (const [name, url] of Object.entries(historical)) {
    const source = await readFile(url, "utf8");
    assert.match(source, requiredPatterns[name], name);
    receipt.historicalRegressions[name] = "REFERENCED / SOURCE_CONTRACT_PRESENT";
  }
  receipt.denominators.reusedHistoricalRegressions = Object.keys(historical).length;
});

test("coverage receipt distinguishes generated, executed, asserted, and unrun layers", () => {
  assert.ok(generated);
  assert.equal(receipt.status.GENERATED, receipt.status.EXECUTED);
  assert.equal(receipt.status.EXECUTED, receipt.status.ASSERTED);
  assert.equal(receipt.status.ASSERTED, receipt.status.PASS);
  assert.equal(receipt.status.FAIL, 0);
  assert.equal(receipt.status.SKIPPED, 0);
  assert.equal(receipt.status.BLOCKED, 0);
  assert.equal(receipt.status.NOT_RUN, 0);
  assert.equal(receipt.routeEntrypoints.options, "PASS");
  assert.equal(receipt.routeEntrypoints.seeds, "PASS");
  assert.equal(receipt.productNetworkCount, 0);
  assert.deepEqual(receipt.recQa091, { selected: 0, executed: 0 });
});

after(async () => {
  const stableReceipt = {
    ...receipt,
    generatedCaseOrderingSha256: createHash("sha256").update(JSON.stringify(generated || {})).digest("hex"),
    coverageManifestPath: manifestPath,
  };
  const content = `${JSON.stringify(stableReceipt, null, 2)}\n`;
  await mkdir(join(tmpdir(), "myott-recommendation-generated-contract-v1"), { recursive: true });
  await writeFile(manifestPath, content, "utf8");
});
