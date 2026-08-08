import assert from "node:assert/strict";
import test from "node:test";

import {
  FOUNDER_PREVIEW_ORIGIN,
  QA_PORT_MAX,
  QA_PORT_MIN,
  applyExecutionContextEvent,
  applyTargetIdentityEvent,
  assertQaBrowserOrigin,
  assertNavigationAcknowledgement,
  beginExecutionContextNavigation,
  buildFetchPatterns,
  buildPageNavigateCommand,
  classifyAutocompleteObservation,
  classifyReadinessFailure,
  correlateRequestEvidence,
  createExecutionContextTracker,
  createReadinessSampleRecorder,
  createTargetIdentityEvidence,
  finalizeCleanupSteps,
  isExpectedPageReady,
  matchesSuggestRequest,
  parseCliArgs,
  readinessSamples,
  recordReadinessSample,
  sanitizeBrowserUrl,
  sanitizeNavigationAcknowledgement,
  sanitizeReadinessSample,
  sanitizeRequestEvidence,
  selectLowestFreeQaPort,
  selectScenario,
  waitForCondition,
} from "./recommendation-browser-qa.mjs";

test("BROWSER-BALANCE-001 is the only accepted scenario", () => {
  assert.equal(selectScenario("BROWSER-BALANCE-001"), "BROWSER-BALANCE-001");
  assert.deepEqual(parseCliArgs(["--scenario", "BROWSER-BALANCE-001"]), {
    scenario: "BROWSER-BALANCE-001",
  });
});

test("unknown scenarios fail closed", () => {
  assert.throws(() => selectScenario("BROWSER-UNKNOWN-001"), /Unsupported browser QA scenario/);
  assert.throws(() => parseCliArgs(["--matrix"]), /Unknown argument/);
});

test("/api/suggest matcher accepts query strings without retaining their values", () => {
  const origin = "http://127.0.0.1:3001";
  assert.equal(matchesSuggestRequest(`${origin}/api/suggest`, origin), true);
  assert.equal(matchesSuggestRequest(`${origin}/api/suggest?q=secret-value`, origin), true);
  assert.equal(matchesSuggestRequest(`${origin}/api/suggestions?q=x`, origin), false);
  assert.equal(matchesSuggestRequest("http://127.0.0.1:3002/api/suggest?q=x", origin), false);
});

test("Fetch interception uses explicit non-Document Fetch and XHR patterns", () => {
  const patterns = buildFetchPatterns("http://127.0.0.1:3001");
  assert.deepEqual(
    patterns.map((pattern) => pattern.resourceType),
    ["Fetch", "XHR"],
  );
  assert.equal(patterns.every((pattern) => pattern.requestStage === "Request"), true);
  assert.equal(patterns.every((pattern) => pattern.urlPattern.endsWith("/api/suggest*")), true);
  assert.equal(patterns.some((pattern) => pattern.resourceType === "Document"), false);
});

test("Network and Fetch evidence correlates by Network request ID", () => {
  assert.deepEqual(
    correlateRequestEvidence(
      { requestId: "network-1", method: "GET", path: "/api/suggest", qExists: true },
      { networkRequestId: "network-1", method: "GET", path: "/api/suggest", qExists: true },
    ),
    { correlated: true, reason: "network-id" },
  );
  assert.deepEqual(
    correlateRequestEvidence(
      { requestId: "network-1", method: "GET", path: "/api/suggest", qExists: true },
      { networkRequestId: "network-2", method: "GET", path: "/api/suggest", qExists: true },
    ),
    { correlated: false, reason: "network-id-mismatch" },
  );
});

test("Evidence sanitizer keeps only approved request fields", () => {
  const sanitized = sanitizeRequestEvidence(
    {
      params: {
        requestId: "request-1",
        networkId: "network-1",
        resourceType: "XHR",
        request: {
          method: "GET",
          url: "http://127.0.0.1:3001/api/suggest?q=do-not-record",
          headers: { Authorization: "Bearer secret" },
        },
      },
    },
    "http://127.0.0.1:3001",
  );
  assert.deepEqual(sanitized, {
    timestamp: null,
    method: "GET",
    path: "/api/suggest",
    resourceType: "XHR",
    requestId: "request-1",
    networkRequestId: "network-1",
    qExists: true,
  });
  assert.equal(JSON.stringify(sanitized).includes("do-not-record"), false);
  assert.equal(JSON.stringify(sanitized).includes("Authorization"), false);
  assert.equal(JSON.stringify(sanitized).includes("secret"), false);
});

test("Autocomplete outcomes distinguish request and interception failures", () => {
  assert.equal(
    classifyAutocompleteObservation({
      domUpdated: false,
      networkObserved: false,
      fetchObserved: false,
      fixtureFulfilled: false,
      suggestionVisible: false,
    }),
    "DOM_VALUE_NOT_UPDATED",
  );
  assert.equal(
    classifyAutocompleteObservation({
      domUpdated: true,
      networkObserved: true,
      fetchObserved: false,
      fixtureFulfilled: false,
      suggestionVisible: false,
    }),
    "NETWORK_OBSERVED_FETCH_MISSED",
  );
  assert.equal(
    classifyAutocompleteObservation({
      domUpdated: true,
      networkObserved: true,
      fetchObserved: true,
      fixtureFulfilled: true,
      suggestionVisible: true,
    }),
    "FETCH_PAUSED_FULFILLED_AND_RENDERED",
  );
});

test("Readiness waits are bounded and report timeout", async () => {
  let clock = 0;
  await assert.rejects(
    waitForCondition(
      () => false,
      {
        timeoutMs: 50,
        intervalMs: 10,
        now: () => clock,
        sleep: async (duration) => {
          clock += duration;
        },
        description: "test readiness",
      },
    ),
    /did not complete within 50ms/,
  );
});

test("Page readiness requires the expected QA origin and seed input", () => {
  const origin = "http://127.0.0.1:3001/?qa=1";
  assert.equal(
    isExpectedPageReady(
      {
        origin: "http://127.0.0.1:3001",
        readyState: "complete",
        inputCount: 1,
        inputVisible: true,
        inputEnabled: true,
        targetValid: true,
        runtimeExceptionCount: 0,
      },
      origin,
    ),
    true,
  );
  assert.equal(
    isExpectedPageReady({ origin: "null", readyState: "complete", inputCount: 0 }, origin),
    false,
  );
  assert.equal(
    isExpectedPageReady(
      {
        origin: "http://127.0.0.1:3001",
        readyState: "loading",
        inputCount: 1,
        inputVisible: true,
        inputEnabled: true,
        targetValid: true,
        runtimeExceptionCount: 0,
      },
      origin,
    ),
    false,
  );
});

test("Cleanup finalization runs every step even when one step fails", async () => {
  const calls = [];
  const results = await finalizeCleanupSteps([
    { name: "browser", run: async () => calls.push("browser") },
    {
      name: "server",
      run: async () => {
        calls.push("server");
        throw new Error("stop failed");
      },
    },
    { name: "snapshot", run: async () => calls.push("snapshot") },
  ]);
  assert.deepEqual(calls, ["browser", "server", "snapshot"]);
  assert.deepEqual(
    results.map((result) => [result.name, result.success]),
    [
      ["browser", true],
      ["server", false],
      ["snapshot", true],
    ],
  );
});

test("Port 3000 can never become a Browser QA target", () => {
  assert.throws(() => assertQaBrowserOrigin(FOUNDER_PREVIEW_ORIGIN), /health-check only/);
  assert.equal(assertQaBrowserOrigin("http://127.0.0.1:3001"), "http://127.0.0.1:3001");
});

test("QA port selection is limited to 3001 through 3100", async () => {
  const checked = [];
  const selected = await selectLowestFreeQaPort(async (port) => {
    checked.push(port);
    return port === QA_PORT_MAX;
  });
  assert.equal(selected, QA_PORT_MAX);
  assert.equal(checked[0], QA_PORT_MIN);
  assert.equal(checked.at(-1), QA_PORT_MAX);
  assert.equal(checked.includes(3000), false);
  assert.equal(checked.includes(3101), false);
});

test("Page.navigate is constructed explicitly for the selected QA URL", () => {
  assert.deepEqual(buildPageNavigateCommand("http://127.0.0.1:3001/?qa=1"), {
    method: "Page.navigate",
    params: { url: "http://127.0.0.1:3001/?qa=1" },
  });
  assert.throws(
    () => buildPageNavigateCommand("http://127.0.0.1:3000/?qa=1"),
    /health-check only/,
  );
});

test("navigation acknowledgement is sanitized and keeps no query values", () => {
  const acknowledgement = sanitizeNavigationAcknowledgement({
    targetId: "target-1",
    requestedUrl: "http://127.0.0.1:3001/?qa=1&token=do-not-store",
    result: { frameId: "frame-1", loaderId: "loader-1" },
    commandTimestamp: "2026-07-28T00:00:00.000Z",
  });
  assert.deepEqual(acknowledgement, {
    targetId: "target-1",
    requestedOrigin: "http://127.0.0.1:3001",
    requestedUrl: "http://127.0.0.1:3001/?qa=[REDACTED]&token=[REDACTED]",
    frameId: "frame-1",
    loaderId: "loader-1",
    acknowledged: true,
    hasErrorText: false,
    commandTimestamp: "2026-07-28T00:00:00.000Z",
  });
  assert.equal(JSON.stringify(acknowledgement).includes("do-not-store"), false);
});

test("navigation errorText and missing acknowledgement fail closed", () => {
  assert.throws(
    () =>
      assertNavigationAcknowledgement(
        sanitizeNavigationAcknowledgement({
          targetId: "target-1",
          requestedUrl: "http://127.0.0.1:3001/?qa=1",
          result: { frameId: "frame-1", errorText: "navigation failed" },
          commandTimestamp: "2026-07-28T00:00:00.000Z",
        }),
      ),
    (error) => error.code === "NAVIGATION_COMMAND_FAILED",
  );
  assert.throws(
    () =>
      assertNavigationAcknowledgement(
        sanitizeNavigationAcknowledgement({
          targetId: "target-1",
          requestedUrl: "http://127.0.0.1:3001/?qa=1",
          result: {},
          commandTimestamp: "2026-07-28T00:00:00.000Z",
        }),
      ),
    (error) => error.code === "NAVIGATION_COMMAND_FAILED",
  );
});

test("created and selected Target identities must match", () => {
  const identity = createTargetIdentityEvidence({
    createdTargetId: "target-1",
    selectedTargetId: "target-1",
    targetType: "page",
    initialUrl: "about:blank",
  });
  assert.equal(identity.attachedSessionIdentity, "direct-target:target-1");
  assert.equal(identity.initialUrl, "about:blank");
  assert.throws(
    () =>
      createTargetIdentityEvidence({
        createdTargetId: "target-1",
        selectedTargetId: "target-2",
        targetType: "page",
        initialUrl: "about:blank",
      }),
    (error) => error.code === "TARGET_DETACHED_OR_REPLACED",
  );
});

test("Target replacement or detach is preserved and classified", () => {
  const identity = createTargetIdentityEvidence({
    createdTargetId: "target-1",
    selectedTargetId: "target-1",
    targetType: "page",
    initialUrl: "about:blank",
  });
  applyTargetIdentityEvent(identity, {
    method: "Target.targetInfoChanged",
    sequence: 1,
    params: {
      targetInfo: {
        targetId: "target-1",
        type: "page",
        url: "http://127.0.0.1:3001/?qa=secret",
      },
    },
  });
  assert.equal(identity.latestUrl, "http://127.0.0.1:3001/?qa=[REDACTED]");
  applyTargetIdentityEvent(identity, {
    method: "Target.targetDestroyed",
    sequence: 2,
    params: { targetId: "target-1" },
  });
  assert.equal(identity.detached, true);
  assert.equal(
    classifyReadinessFailure({
      navigationAcknowledgement: {
        frameId: "frame-1",
        requestedOrigin: "http://127.0.0.1:3001",
        acknowledged: true,
        hasErrorText: false,
      },
      targetIdentity: identity,
      executionContext: { currentId: 1 },
      finalSample: {},
      loadEventObserved: false,
    }),
    "TARGET_DETACHED_OR_REPLACED",
  );
});

test("execution context tracking uses the post-navigation default context", () => {
  const tracker = beginExecutionContextNavigation(createExecutionContextTracker(), 5);
  tracker.navigationFrameId = "frame-1";
  applyExecutionContextEvent(tracker, {
    method: "Runtime.executionContextCreated",
    sequence: 4,
    params: {
      context: { id: 10, auxData: { isDefault: true, frameId: "frame-1" } },
    },
  });
  assert.equal(tracker.currentId, null);
  applyExecutionContextEvent(tracker, {
    method: "Runtime.executionContextCreated",
    sequence: 6,
    params: {
      context: { id: 11, auxData: { isDefault: true, frameId: "frame-1" } },
    },
  });
  assert.equal(tracker.currentId, 11);
  applyExecutionContextEvent(tracker, {
    method: "Runtime.executionContextDestroyed",
    sequence: 7,
    params: { executionContextId: 11 },
  });
  assert.equal(tracker.currentId, null);
});

test("readiness samples sanitize URL values and record approved fields", () => {
  const sample = sanitizeReadinessSample(
    {
      url: "http://127.0.0.1:3001/?qa=1&token=do-not-store",
      origin: "http://127.0.0.1:3001",
      readyState: "complete",
      inputCount: 1,
      inputVisible: true,
      inputEnabled: true,
    },
    {
      timestamp: "2026-07-28T00:00:00.000Z",
      selectedTargetId: "target-1",
      executionContextId: 11,
      lastLifecycleEvent: "Page.loadEventFired",
      consoleErrorCount: 0,
      runtimeExceptionCount: 0,
      targetValid: true,
    },
  );
  assert.equal(sample.currentUrl, "http://127.0.0.1:3001/?qa=[REDACTED]&token=[REDACTED]");
  assert.equal(sample.executionContextId, 11);
  assert.equal(sample.inputVisible, true);
  assert.equal(JSON.stringify(sample).includes("do-not-store"), false);
});

test("readiness sample storage is bounded while retaining first and final samples", () => {
  const recorder = createReadinessSampleRecorder(3);
  for (let index = 0; index < 6; index += 1) {
    recordReadinessSample(
      recorder,
      sanitizeReadinessSample(
        {
          url: `http://127.0.0.1:3001/state-${index}`,
          origin: "http://127.0.0.1:3001",
          readyState: index === 5 ? "complete" : "loading",
          inputCount: index,
          inputVisible: index === 5,
          inputEnabled: index === 5,
        },
        {
          timestamp: `sample-${index}`,
          selectedTargetId: "target-1",
          executionContextId: 11,
          targetValid: true,
        },
      ),
    );
  }
  const samples = readinessSamples(recorder);
  assert.equal(samples.length, 3);
  assert.equal(samples[0].timestamp, "sample-0");
  assert.equal(samples.at(-1).timestamp, "sample-5");
  assert.equal(recorder.droppedSampleCount > 0, true);
});

test("duplicate readiness polls retain the first and final observation", () => {
  const recorder = createReadinessSampleRecorder(4);
  const first = sanitizeReadinessSample(
    {
      url: "http://127.0.0.1:3001/",
      origin: "http://127.0.0.1:3001",
      readyState: "loading",
      inputCount: 0,
      inputVisible: false,
      inputEnabled: false,
    },
    {
      timestamp: "first",
      selectedTargetId: "target-1",
      executionContextId: 11,
      targetValid: true,
    },
  );
  const final = { ...first, timestamp: "final" };
  recordReadinessSample(recorder, first);
  recordReadinessSample(recorder, final);
  assert.deepEqual(
    readinessSamples(recorder).map((sample) => sample.timestamp),
    ["first", "final"],
  );
  assert.equal(recorder.finalSample.timestamp, "final");
});

test("successful readiness preserves its final interactable sample", () => {
  const recorder = createReadinessSampleRecorder(4);
  const final = sanitizeReadinessSample(
    {
      url: "http://127.0.0.1:3001/?qa=1",
      origin: "http://127.0.0.1:3001",
      readyState: "complete",
      inputCount: 1,
      inputVisible: true,
      inputEnabled: true,
    },
    {
      timestamp: "ready",
      selectedTargetId: "target-1",
      executionContextId: 11,
      runtimeExceptionCount: 0,
      targetValid: true,
    },
  );
  recordReadinessSample(recorder, final);
  assert.equal(isExpectedPageReady(recorder.finalSample, "http://127.0.0.1:3001/?qa=1"), true);
  assert.equal(readinessSamples(recorder).at(-1).timestamp, "ready");
});

test("input count zero is classified as INPUT_NOT_RENDERED", () => {
  assert.equal(
    classifyReadinessFailure({
      navigationAcknowledgement: {
        frameId: "frame-1",
        requestedOrigin: "http://127.0.0.1:3001",
        acknowledged: true,
        hasErrorText: false,
      },
      targetIdentity: { detached: false, changedOrReplaced: false },
      executionContext: { currentId: 11 },
      finalSample: {
        origin: "http://127.0.0.1:3001",
        readyState: "complete",
        inputCount: 0,
        inputVisible: false,
        inputEnabled: false,
        runtimeExceptionCount: 0,
      },
      loadEventObserved: true,
    }),
    "INPUT_NOT_RENDERED",
  );
});

test("wrong Origin and Runtime exception have deterministic classifications", () => {
  const common = {
    navigationAcknowledgement: {
      frameId: "frame-1",
      requestedOrigin: "http://127.0.0.1:3001",
      acknowledged: true,
      hasErrorText: false,
    },
    targetIdentity: { detached: false, changedOrReplaced: false },
    executionContext: { currentId: 11 },
    loadEventObserved: true,
  };
  assert.equal(
    classifyReadinessFailure({
      ...common,
      finalSample: {
        origin: "http://127.0.0.1:3002",
        readyState: "complete",
        runtimeExceptionCount: 0,
      },
    }),
    "WRONG_ORIGIN",
  );
  assert.equal(
    classifyReadinessFailure({
      ...common,
      finalSample: {
        origin: "http://127.0.0.1:3001",
        readyState: "complete",
        runtimeExceptionCount: 1,
      },
    }),
    "APPLICATION_RUNTIME_EXCEPTION",
  );
});

test("readiness failure classifications cover navigation, context, completion, and final state", () => {
  const navigation = {
    frameId: "frame-1",
    requestedOrigin: "http://127.0.0.1:3001",
    acknowledged: true,
    hasErrorText: false,
  };
  const target = { detached: false, changedOrReplaced: false };
  assert.equal(
    classifyReadinessFailure({
      navigationAcknowledgement: null,
      targetIdentity: target,
      executionContext: { currentId: null },
      finalSample: null,
      loadEventObserved: false,
    }),
    "NAVIGATION_COMMAND_FAILED",
  );
  assert.equal(
    classifyReadinessFailure({
      navigationAcknowledgement: navigation,
      targetIdentity: target,
      executionContext: { currentId: null },
      finalSample: null,
      loadEventObserved: false,
    }),
    "EXECUTION_CONTEXT_UNAVAILABLE",
  );
  assert.equal(
    classifyReadinessFailure({
      navigationAcknowledgement: navigation,
      targetIdentity: target,
      executionContext: { currentId: 11 },
      finalSample: {
        origin: "http://127.0.0.1:3001",
        readyState: "loading",
        inputCount: 0,
        runtimeExceptionCount: 0,
      },
      loadEventObserved: false,
    }),
    "NAVIGATION_COMPLETION_TIMEOUT",
  );
  assert.equal(
    classifyReadinessFailure({
      navigationAcknowledgement: navigation,
      targetIdentity: target,
      executionContext: { currentId: 11 },
      finalSample: {
        origin: "http://127.0.0.1:3001",
        readyState: "complete",
        inputCount: 1,
        inputVisible: true,
        inputEnabled: true,
        runtimeExceptionCount: 0,
      },
      loadEventObserved: true,
    }),
    "READINESS_TIMEOUT_WITH_FINAL_STATE",
  );
});

test("browser URL sanitizer never stores query values", () => {
  const sanitized = sanitizeBrowserUrl(
    "http://127.0.0.1:3001/?qa=visible&Authorization=Bearer-secret#fragment",
  );
  assert.equal(
    sanitized,
    "http://127.0.0.1:3001/?Authorization=[REDACTED]&qa=[REDACTED]",
  );
  assert.equal(sanitized.includes("visible"), false);
  assert.equal(sanitized.includes("Bearer-secret"), false);
  assert.equal(sanitized.includes("fragment"), false);
});
