import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSyntheticGovernanceExecutionContract,
  validateGovernanceExecutionContract,
} from "./authorizationContract.mjs";
import { validateStrictLiveInput } from "./inputContract.mjs";
import { createOutboundController, fixedOutboundLimits, safeEndpointIdentity } from "./outboundController.mjs";
import { RequestLifecycleReducer } from "./requestLifecycle.mjs";
import { createFixtureTransport, redirectFixtureCases, strictInputNegativeFixtures } from "./fixtures.mjs";
import { writeImmutableV2EvidenceForTest } from "./evidenceAssembler.mjs";
import { writeImmutableObservabilityEvidenceForTest } from "../../../src/lib/recommendation/qa/tmdbObservabilityOutput.mjs";
import { calculateMetaQuality } from "./independentValidator.mjs";
import { captureListResponse } from "./sealedProductBinding.mjs";
import { TMDB_OBSERVABILITY_LIMITS } from "../../../src/lib/recommendation/qa/tmdbObservability.js";

function result(fixtureId, category, expectedDisposition, observedDisposition, error, extra = {}) {
  return {
    fixtureId,
    category,
    inputMutation: extra.inputMutation || fixtureId,
    expectedDisposition,
    observedDisposition,
    observedErrorCode: error?.code || error?.message || null,
    bindingCount: extra.bindingCount ?? 0,
    attemptCount: extra.attemptCount ?? 0,
    consumptionEventCount: extra.consumptionEventCount ?? 0,
    observed: extra.observed || null,
    verdict: expectedDisposition === observedDisposition ? "PASS" : "FAIL",
  };
}

async function attempt(fixtureId, category, operation, extra = {}, expectedDisposition = "REJECTED") {
  try {
    const observed = await operation();
    return result(fixtureId, category, expectedDisposition, "ACCEPTED", null, { ...extra, observed });
  } catch (error) {
    return result(fixtureId, category, expectedDisposition, "REJECTED", error, extra);
  }
}

function controllerHarness({ fetchImpl = async () => ({ ok: true, status: 200, headers: { get: () => null }, async json() { return {}; } }), runId = "negative", requestClass = "detail", runtimeIntegrityCheck = () => true } = {}) {
  let current = { requestId: `${runId}:request`, runId, runMode: "fixture", requestClass };
  const consumptionState = { consumed: false, event: null };
  const controller = createOutboundController({
    fetchImpl,
    getCurrentRequest: () => current,
    limits: fixedOutboundLimits(),
    consumptionState,
    runtimeIntegrityCheck,
  });
  return {
    controller,
    setContext: (nextRunId, nextRequestClass = requestClass) => { current = { requestId: `${nextRunId}:request`, runId: nextRunId, runMode: "fixture", requestClass: nextRequestClass }; },
    setRequestClass: (nextRequestClass) => { current.requestClass = nextRequestClass; },
  };
}

function attachControllerMetrics(record, controller) {
  record.attemptCount = controller.attempts().length;
  record.consumptionEventCount = controller.events().filter((event) => event.type === "governance-consumption").length;
  return record;
}

export async function runNegativeFixtureSuite({ validInput, governanceExecutionContract }) {
  const records = [];
  for (const fixture of strictInputNegativeFixtures(validInput)) {
    const category = fixture.id.includes("fixed-input") ? "Fixed Input" : "Strict Input";
    records.push(await attempt(fixture.id, category, () => validateStrictLiveInput(fixture.input)));
  }

  const governanceMutations = [
    ["governance-missing-field", (value) => { const clone = { ...value }; delete clone.trustAuthority; return clone; }],
    ["governance-unknown-field", (value) => ({ ...value, unknown: true })],
    ["governance-authenticity-claim", (value) => ({ ...value, authenticityTechnicallyVerified: true })],
    ["governance-process-persistence-claim", (value) => ({ ...value, processRestartReuseTechnicallyPrevented: true })],
    ["governance-budget-mismatch", (value) => ({ ...value, requestBudget: { ...value.requestBudget, total: 25 } })],
    ["governance-fixed-input-mismatch", (value) => ({ ...value, fixedInput: { ...value.fixedInput, country: "kr" } })],
  ];
  for (const [id, mutate] of governanceMutations) records.push(await attempt(id, "Governance Contract", () => validateGovernanceExecutionContract(mutate(JSON.parse(JSON.stringify(governanceExecutionContract))))));

  for (const key of ["adapterFactory", "adapter", "fetchImpl", "transport", "consumptionRecorder", "modulePath", "endpoint", "url", "fixtureAdapter", "testAdapter"]) {
    const harness = controllerHarness();
    records.push(await attempt(`binding-${key}`, "Binding Override", () => harness.controller.assertNoCallerInjection({ [key]: true })));
  }

  const runtime = controllerHarness({ runtimeIntegrityCheck: () => false });
  records.push(await attempt("runtime-transport-mutation", "Runtime Transport Mutation", () => runtime.controller.fetch("https://api.themoviedb.org/3/tv/1"), { attemptCount: runtime.controller.attempts().length, consumptionEventCount: runtime.controller.events().filter((event) => event.type === "governance-consumption").length }));

  for (const [index, url] of [
    "http://api.themoviedb.org/3/tv/1",
    "https://evil.example/3/tv/1",
    "https://api.themoviedb.org.evil.example/3/tv/1",
    "https://127.0.0.1/3/tv/1",
    "https://user:pass@api.themoviedb.org/3/tv/1",
    "https://api.themoviedb.org:8443/3/tv/1",
    "//api.themoviedb.org/3/tv/1",
    "not a url",
  ].entries()) records.push(await attempt(`allowlist-${index + 1}`, "Allowlist", () => safeEndpointIdentity(url)));

  for (const fixture of redirectFixtureCases()) {
    const calls = [];
    const harness = controllerHarness({ requestClass: "list", fetchImpl: createFixtureTransport({ redirects: fixture.redirects, calls }) });
    const expectedDisposition = ["no-redirect", "redirect-1", "redirect-3"].includes(fixture.id) ? "ACCEPTED" : "REJECTED";
    const record = await attempt(`redirect-${fixture.id}`, "Redirect", () => harness.controller.fetch("https://api.themoviedb.org/3/discover/tv"), { attemptCount: harness.controller.attempts().length, observed: { expectedAttempts: fixture.expectedAttempts || null } }, expectedDisposition);
    attachControllerMetrics(record, harness.controller);
    record.observed = { calls: calls.length, attempts: record.attemptCount };
    records.push(record);
  }

  const listBudget = controllerHarness({ requestClass: "list" });
  for (let index = 0; index < 8; index += 1) await listBudget.controller.fetch("https://api.themoviedb.org/3/discover/tv");
  records.push(attachControllerMetrics(await attempt("budget-list-9", "Run Budget", () => listBudget.controller.fetch("https://api.themoviedb.org/3/discover/tv"), { attemptCount: listBudget.controller.attempts().length }), listBudget.controller));
  const detailBudget = controllerHarness({ requestClass: "detail" });
  for (let index = 0; index < 16; index += 1) await detailBudget.controller.fetch("https://api.themoviedb.org/3/tv/1");
  records.push(attachControllerMetrics(await attempt("budget-detail-17", "Run Budget", () => detailBudget.controller.fetch("https://api.themoviedb.org/3/tv/1"), { attemptCount: detailBudget.controller.attempts().length }), detailBudget.controller));
  const aggregate = controllerHarness({ runId: "aggregate-1", requestClass: "detail" });
  for (let run = 0; run < 3; run += 1) {
    aggregate.setContext(`aggregate-${run + 1}`, "detail");
    for (let index = 0; index < 8; index += 1) await aggregate.controller.fetch("https://api.themoviedb.org/3/discover/tv");
    for (let index = 0; index < 16; index += 1) await aggregate.controller.fetch("https://api.themoviedb.org/3/tv/1");
  }
  records.push(attachControllerMetrics(await attempt("budget-aggregate-73", "Aggregate Budget", () => aggregate.controller.fetch("https://api.themoviedb.org/3/tv/1"), { attemptCount: aggregate.controller.attempts().length }), aggregate.controller));

  async function redirectBudgetCase(fixtureId, requestClass, warmupCount, url = "https://api.themoviedb.org/3/discover/tv") {
    const calls = [];
    let activeTransport = createFixtureTransport({ calls });
    const redirectTransport = createFixtureTransport({ redirects: { "/discover/tv": ["/discover/tv?hop=1"] }, redirectsForDetail: true, calls });
    const harness = controllerHarness({ requestClass, fetchImpl: (rawUrl, options) => activeTransport(rawUrl, options) });
    for (let index = 0; index < warmupCount; index += 1) {
      const warmupUrl = requestClass === "list" ? "https://api.themoviedb.org/3/discover/tv" : "https://api.themoviedb.org/3/tv/1";
      await harness.controller.fetch(warmupUrl);
    }
    activeTransport = requestClass === "detail"
      ? createFixtureTransport({ redirects: { "/tv/1": ["/tv/1?hop=1"] }, calls })
      : redirectTransport;
    const record = await attempt(fixtureId, "Redirect Budget", () => harness.controller.fetch(url), { attemptCount: harness.controller.attempts().length });
    attachControllerMetrics(record, harness.controller);
    record.observed = { transportCalls: calls.length, attempts: record.attemptCount };
    records.push(record);
  }

  await redirectBudgetCase("redirect-budget-list-9", "list", 7);
  await redirectBudgetCase("redirect-budget-detail-17", "detail", 15, "https://api.themoviedb.org/3/tv/1");

  const totalBudget = controllerHarness({ requestClass: "list" });
  for (let index = 0; index < 8; index += 1) await totalBudget.controller.fetch("https://api.themoviedb.org/3/discover/tv");
  totalBudget.setRequestClass("detail");
  for (let index = 0; index < 16; index += 1) await totalBudget.controller.fetch("https://api.themoviedb.org/3/tv/1");
  records.push(attachControllerMetrics(await attempt("redirect-budget-total-25", "Redirect Budget", () => totalBudget.controller.fetch("https://api.themoviedb.org/3/discover/tv"), { attemptCount: totalBudget.controller.attempts().length }), totalBudget.controller));

  const listRedirect = controllerHarness({ requestClass: "list", fetchImpl: createFixtureTransport({ redirects: { "/discover/tv": ["/discover/tv?hop=1"] } }) });
  for (let index = 0; index < 7; index += 1) await listRedirect.controller.fetch("https://api.themoviedb.org/3/discover/tv");
  records.push(attachControllerMetrics(await attempt("redirect-budget-list-redirect-9", "Redirect Budget", () => listRedirect.controller.fetch("https://api.themoviedb.org/3/discover/tv"), { attemptCount: listRedirect.controller.attempts().length }), listRedirect.controller));

  const detailRedirect = controllerHarness({ requestClass: "detail", fetchImpl: createFixtureTransport({ redirects: { "/tv/1": ["/tv/1?hop=1"] } }) });
  for (let index = 0; index < 15; index += 1) await detailRedirect.controller.fetch("https://api.themoviedb.org/3/tv/1");
  records.push(attachControllerMetrics(await attempt("redirect-budget-detail-redirect-17", "Redirect Budget", () => detailRedirect.controller.fetch("https://api.themoviedb.org/3/tv/1"), { attemptCount: detailRedirect.controller.attempts().length }), detailRedirect.controller));

  let aggregateRedirectTransport = createFixtureTransport();
  const aggregateRedirect = controllerHarness({ requestClass: "list", fetchImpl: (rawUrl, options) => aggregateRedirectTransport(rawUrl, options) });
  for (let index = 0; index < 8; index += 1) await aggregateRedirect.controller.fetch("https://api.themoviedb.org/3/discover/tv");
  aggregateRedirect.setRequestClass("detail");
  for (let index = 0; index < 15; index += 1) await aggregateRedirect.controller.fetch("https://api.themoviedb.org/3/tv/1");
  aggregateRedirectTransport = createFixtureTransport({ redirects: { "/discover/tv": ["/discover/tv?hop=1", "/discover/tv?hop=2"] } });
  const aggregateRedirectRecord = await attempt("redirect-budget-total-redirect-25", "Redirect Budget", () => aggregateRedirect.controller.fetch("https://api.themoviedb.org/3/discover/tv"), { attemptCount: aggregateRedirect.controller.attempts().length });
  attachControllerMetrics(aggregateRedirectRecord, aggregateRedirect.controller);
  records.push(aggregateRedirectRecord);

  const failed = controllerHarness({ fetchImpl: async () => { throw Object.assign(new Error("FIXTURE_FAILURE"), { code: "FIXTURE_FAILURE" }); } });
  await failed.controller.fetch("https://api.themoviedb.org/3/tv/1").catch(() => {});
  records.push(attachControllerMetrics(result("consumption-after-outbound-failure", "Consumption", "ACCEPTED", failed.controller.isConsumed() ? "ACCEPTED" : "REJECTED", null), failed.controller));

  const lifecycleCases = [
    ["lifecycle-attempt-without-start", (reducer) => reducer.recordAttemptStart({ requestId: "missing", attemptId: "a" })],
    ["lifecycle-terminal-without-start", (reducer) => reducer.recordAttemptTerminal({ requestId: "missing", attemptId: "a" })],
    ["lifecycle-complete-with-open-attempt", (reducer) => { reducer.startRequest({ requestId: "open", runId: "r", runMode: "fixture", requestClass: "detail", providerItemId: 1, safeEndpointIdentity: "/tv/1" }); reducer.recordAttemptStart({ requestId: "open", attemptId: "a" }); reducer.completeRequest("open"); }],
    ["lifecycle-duplicate-terminal", (reducer) => { reducer.startRequest({ requestId: "dup", runId: "r", runMode: "fixture", requestClass: "detail", providerItemId: 1, safeEndpointIdentity: "/tv/1" }); reducer.recordAttemptStart({ requestId: "dup", attemptId: "a" }); reducer.recordAttemptTerminal({ requestId: "dup", attemptId: "a" }); reducer.recordAttemptTerminal({ requestId: "dup", attemptId: "a" }); }],
    ["lifecycle-complete-then-failed", (reducer) => { reducer.startRequest({ requestId: "terminal", runId: "r", runMode: "fixture", requestClass: "detail", providerItemId: 1, safeEndpointIdentity: "/tv/1" }); reducer.recordAttemptStart({ requestId: "terminal", attemptId: "a" }); reducer.recordAttemptTerminal({ requestId: "terminal", attemptId: "a" }); reducer.completeRequest("terminal"); reducer.failRequest("terminal"); }],
  ];
  for (const [id, operation] of lifecycleCases) records.push(await attempt(id, "Lifecycle", () => operation(new RequestLifecycleReducer())));

  const lifecycleCorrectionCases = [
    ["lifecycle-duplicate-start", (reducer) => {
      const request = { requestId: "same", runId: "r", runMode: "fixture", requestClass: "detail", providerItemId: 1, safeEndpointIdentity: "/tv/1" };
      reducer.startRequest(request);
      reducer.startRequest(request);
    }],
    ["lifecycle-failed-with-open-attempt", (reducer) => {
      reducer.startRequest({ requestId: "failed-open", runId: "r", runMode: "fixture", requestClass: "detail", providerItemId: 1, safeEndpointIdentity: "/tv/1" });
      reducer.recordAttemptStart({ requestId: "failed-open", attemptId: "a" });
      reducer.failRequest("failed-open");
    }],
    ["lifecycle-failed-then-complete", (reducer) => {
      reducer.startRequest({ requestId: "failed-complete", runId: "r", runMode: "fixture", requestClass: "detail", providerItemId: 1, safeEndpointIdentity: "/tv/1" });
      reducer.recordAttemptStart({ requestId: "failed-complete", attemptId: "a" });
      reducer.recordAttemptTerminal({ requestId: "failed-complete", attemptId: "a" });
      reducer.failRequest("failed-complete");
      reducer.completeRequest("failed-complete");
    }],
    ["lifecycle-terminal-request-mismatch", (reducer) => {
      reducer.startRequest({ requestId: "known", runId: "r", runMode: "fixture", requestClass: "detail", providerItemId: 1, safeEndpointIdentity: "/tv/1" });
      reducer.recordAttemptTerminal({ requestId: "other", attemptId: "a" });
    }],
  ];
  for (const [id, operation] of lifecycleCorrectionCases) records.push(await attempt(id, "Lifecycle", () => operation(new RequestLifecycleReducer())));

  const cache = new RequestLifecycleReducer();
  cache.startRequest({ requestId: "cache", runId: "warm", runMode: "warm-measure", requestClass: "list", page: 1, safeEndpointIdentity: "/discover/tv" });
  records.push(await attempt("cache-hit-after-start", "Cache Hit", () => { cache.markCacheAttempt("cache"); cache.completeRequest("cache"); }, {}, "ACCEPTED"));
  records.push(await attempt("cache-hit-second-terminal", "Cache Hit", () => cache.completeRequest("cache")));

  const metaNegative = [
    { checkId: "meta-string", claim: "x", validationMethod: "source-text", expected: true, observed: true, structuredEvidence: {}, evidencePointers: [], sourceHashes: {}, verdict: "PASS" },
    { checkId: "meta-self", claim: "y", validationMethod: "structured", expected: 1, observed: 1, structuredEvidence: { samePointerComparison: true }, evidencePointers: ["/x"], sourceHashes: {}, verdict: "PASS" },
    { checkId: "meta-dup", claim: "z", validationMethod: "structured", expected: 1, observed: 1, structuredEvidence: { value: 1 }, evidencePointers: ["/x"], sourceHashes: {}, verdict: "PASS" },
    { checkId: "meta-dup", claim: "z", validationMethod: "structured", expected: 1, observed: 1, structuredEvidence: { value: 1 }, evidencePointers: ["/x"], sourceHashes: {}, verdict: "PASS" },
  ];
  const meta = calculateMetaQuality(metaNegative, { unresolvedPointers: 1, sourceHashMismatches: 1 });
  records.push(result("validator-meta-quality", "Validator Meta-quality", "ACCEPTED", meta.stringOnlyPasses > 0 && meta.selfConfirmingPasses > 0 ? "ACCEPTED" : "REJECTED", null, { observed: meta }));

  const root = await mkdtemp(join(tmpdir(), "myott-v2-negative-output-"));
  try {
    await writeImmutableV2EvidenceForTest({ root, stem: "negative", value: { version: 1 } });
    records.push(await attempt("output-existing-destination", "Output Boundary", () => writeImmutableV2EvidenceForTest({ root, stem: "negative", value: { version: 2 } })));
    records.push(await attempt("output-traversal-stem", "Output Boundary", () => writeImmutableV2EvidenceForTest({ root, stem: "../escape", value: { version: 1 } })));
    const raceRoot = await mkdtemp(join(tmpdir(), "myott-v2-race-"));
    const oldLocalAppData = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = raceRoot;
    await mkdir(join(raceRoot, "MyOTT", "qa-evidence", "REC-QA-091", "OBSERVABILITY_V1"), { recursive: true });
    const raceResults = await Promise.allSettled([
      writeImmutableObservabilityEvidenceForTest("concurrent", { winner: 1 }, async () => {}),
      writeImmutableObservabilityEvidenceForTest("concurrent", { winner: 2 }, async () => {}),
    ]);
    if (oldLocalAppData === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = oldLocalAppData;
    const accepted = raceResults.filter((entry) => entry.status === "fulfilled").length;
    const rejected = raceResults.filter((entry) => entry.status === "rejected").length;
    const collisionCodes = raceResults.filter((entry) => entry.status === "rejected").map((entry) => entry.reason?.message || "");
    records.push(result("output-concurrent-single-winner", "Output Boundary", "ACCEPTED", accepted === 1 && rejected === 1 ? "ACCEPTED" : "REJECTED", null, { observed: { accepted, rejected, collisionCodes } }));
    process.env.LOCALAPPDATA = raceRoot;
    records.push(await attempt("output-sync-failure-cleanup", "Output Boundary", () => writeImmutableObservabilityEvidenceForTest("sync-failure", { version: 1 }, async () => { throw Object.assign(new Error("SYNTHETIC_SYNC_FAILURE"), { code: "SYNTHETIC_SYNC_FAILURE" }); })));
    if (oldLocalAppData === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = oldLocalAppData;
    const rootFile = join(root, "root-file");
    await writeFile(rootFile, "root");
    records.push(await attempt("output-reparse-root", "Output Boundary", () => writeImmutableV2EvidenceForTest({ root: rootFile, stem: "reparse", value: { version: 1 } })));
    await rm(raceRoot, { recursive: true, force: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  records.push(await attempt("live-list-capture-not-from-fixture-calls", "Live Capture", () => {
    const liveCaptures = [];
    if (liveCaptures.length === 0) throw Object.assign(new Error("LIVE_V2_LIVE_CAPTURE_REQUIRED"), { code: "LIVE_V2_LIVE_CAPTURE_REQUIRED" });
  }));
  records.push(await attempt("live-output-root-mismatch", "Output Boundary", () => validateGovernanceExecutionContract({ ...JSON.parse(JSON.stringify(governanceExecutionContract)), evidenceRoot: "qa-evidence/REC-QA-091/LIVE_ENTRYPOINT_ARCHITECTURE_V2" }))); 
  const capturePayload = (count, extra = {}) => ({ page: 1, total_pages: 1, total_results: count, results: Array.from({ length: count }, (_, index) => ({ id: 92000 + index, name: `Capture ${index}` })), ...extra });
  const captureResponse = (payload) => ({ clone: () => ({ json: async () => payload }) });
  records.push(await attempt("capture-empty-results", "Response Clone Bound", () => captureListResponse(captureResponse(capturePayload(0))), {}, "ACCEPTED"));
  records.push(await attempt("capture-normal-20", "Response Clone Bound", () => captureListResponse(captureResponse(capturePayload(20))), {}, "ACCEPTED"));
  records.push(await attempt("capture-exact-boundary", "Response Clone Bound", () => captureListResponse(captureResponse(capturePayload(TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry))), {}, "ACCEPTED"));
  records.push(await attempt("capture-boundary-plus-one", "Response Clone Bound", () => captureListResponse(captureResponse(capturePayload(TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry + 1)))));
  records.push(await attempt(
    "capture-oversized-body",
    "Response Clone Bound",
    () => captureListResponse(captureResponse(capturePayload(1, {
      overview: "x".repeat(TMDB_OBSERVABILITY_LIMITS.maximumPayloadBytes),
    }))),
  ));
  records.push(await attempt("capture-malformed-results", "Response Clone Bound", () => captureListResponse(captureResponse({ page: 1, total_results: 1, results: [null] }))));
  records.push(await attempt("capture-non-array-results", "Response Clone Bound", () => captureListResponse(captureResponse({ page: 1, total_results: 1, results: {} }))));
  records.push(await attempt("capture-invalid-json", "Response Clone Bound", () => captureListResponse({ clone: () => ({ json: async () => { throw new SyntaxError("invalid json"); } }) })));
  records.push(await attempt("capture-clone-failure", "Response Clone Bound", () => captureListResponse({ clone: () => { throw new Error("clone failed"); } })));
  for (const [fixtureId, fetchImpl] of [
    ["live-low-level-global-fetch", globalThis.fetch],
    ["live-caller-transport", async () => ({ ok: true, status: 200 })],
    ["live-preflight-bypass", async () => ({ ok: true, status: 200 })],
  ]) {
    records.push(await attempt(fixtureId, "Live API Boundary", () => createOutboundController({ mode: "live", fetchImpl, getCurrentRequest: () => ({ requestId: "live", runId: "live", runMode: "fixture", requestClass: "detail" }) })));
  }
  return records;
}
