import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  cpSync,
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const QA_PORT_MIN = 3001;
export const QA_PORT_MAX = 3100;
export const FOUNDER_PREVIEW_ORIGIN = "http://127.0.0.1:3000";
export const REQUEST_OBSERVATION_TIMEOUT_MS = 10_000;
export const READINESS_TIMEOUT_MS = 60_000;
export const BROWSER_READINESS_TIMEOUT_MS = 15_000;
export const MAX_READINESS_SAMPLES = 24;
export const SUPPORTED_SCENARIOS = Object.freeze(["BROWSER-BALANCE-001"]);

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const CANDIDATE_PATHS = Object.freeze([
  "docs/project/PROJECT_CONTEXT.md",
  "lib/tmdb.js",
  "src/lib/providers/tmdb/requestContext.js",
  "src/lib/providers/tmdb/requestContext.test.mjs",
  "src/lib/recommendation/adaptiveSeedAndGenre.test.mjs",
  "src/lib/recommendation/qa/founderDiagnostics.test.mjs",
  "src/lib/recommendation/qa/tmdbObservability.js",
]);
const ALLOWED_WORKTREE_PATHS = new Set([
  ...CANDIDATE_PATHS,
  "docs/project/QA_CHECKLIST.md",
  "docs/project/QA_CHECKLIST.pdf",
  "scripts/recommendation-browser-qa.mjs",
  "scripts/recommendation-browser-qa.test.mjs",
]);
const CHROME_CANDIDATES = Object.freeze([
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
]);
const POWERSHELL_CANDIDATES = Object.freeze([
  "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
  "powershell.exe",
]);

class HarnessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "HarnessError";
    this.code = code;
  }
}

export function parseCliArgs(argv) {
  const result = { scenario: "" };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--scenario") {
      result.scenario = argv[index + 1] || "";
      index += 1;
      continue;
    }
    throw new HarnessError("UNKNOWN_ARGUMENT", `Unknown argument: ${argument}`);
  }

  return result;
}

export function selectScenario(scenarioId) {
  if (!SUPPORTED_SCENARIOS.includes(scenarioId)) {
    throw new HarnessError("UNKNOWN_SCENARIO", `Unsupported browser QA scenario: ${scenarioId || "(empty)"}`);
  }
  return scenarioId;
}

export function assertQaBrowserOrigin(origin) {
  const parsed = new URL(origin);
  const port = Number(parsed.port);
  if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1") {
    throw new HarnessError("UNSAFE_BROWSER_ORIGIN", "Browser QA must target 127.0.0.1 over HTTP.");
  }
  if (port === 3000) {
    throw new HarnessError("FOUNDER_PREVIEW_BROWSER_TARGET_FORBIDDEN", "Port 3000 is health-check only.");
  }
  if (port < QA_PORT_MIN || port > QA_PORT_MAX) {
    throw new HarnessError("QA_PORT_OUT_OF_RANGE", `Browser QA port must be ${QA_PORT_MIN} through ${QA_PORT_MAX}.`);
  }
  return parsed.origin;
}

export function matchesSuggestRequest(requestUrl, expectedOrigin = "") {
  try {
    const parsed = new URL(requestUrl, expectedOrigin || undefined);
    if (expectedOrigin && parsed.origin !== new URL(expectedOrigin).origin) return false;
    return parsed.pathname === "/api/suggest";
  } catch {
    return false;
  }
}

export function buildFetchPatterns(origin) {
  const qaOrigin = assertQaBrowserOrigin(origin);
  return [
    {
      urlPattern: `${qaOrigin}/api/suggest*`,
      resourceType: "Fetch",
      requestStage: "Request",
    },
    {
      urlPattern: `${qaOrigin}/api/suggest*`,
      resourceType: "XHR",
      requestStage: "Request",
    },
  ];
}

function sanitizedId(value) {
  if (value === null || value === undefined || value === "") return null;
  return String(value).replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 96);
}

export function sanitizeRequestEvidence(event, expectedOrigin = "") {
  const request = event?.params?.request || {};
  let parsed = null;
  try {
    parsed = new URL(request.url || "", expectedOrigin || undefined);
  } catch {
    parsed = null;
  }

  return Object.freeze({
    timestamp: Number.isFinite(event?.params?.timestamp) ? event.params.timestamp : null,
    method: typeof request.method === "string" ? request.method : null,
    path: parsed?.pathname || null,
    resourceType: event?.params?.type || event?.params?.resourceType || null,
    requestId: sanitizedId(event?.params?.requestId),
    networkRequestId: sanitizedId(event?.params?.networkId),
    qExists: parsed ? parsed.searchParams.has("q") : false,
  });
}

export function correlateRequestEvidence(networkEvidence, fetchEvidence) {
  if (!networkEvidence || !fetchEvidence) {
    return { correlated: false, reason: "missing-channel" };
  }

  const networkId = networkEvidence.requestId;
  const fetchNetworkId = fetchEvidence.networkRequestId;
  if (networkId && fetchNetworkId) {
    return {
      correlated: networkId === fetchNetworkId,
      reason: networkId === fetchNetworkId ? "network-id" : "network-id-mismatch",
    };
  }

  const correlated =
    networkEvidence.method === fetchEvidence.method &&
    networkEvidence.path === fetchEvidence.path &&
    networkEvidence.qExists === fetchEvidence.qExists;
  return { correlated, reason: correlated ? "sanitized-route" : "sanitized-route-mismatch" };
}

export function classifyAutocompleteObservation({
  domUpdated,
  networkObserved,
  fetchObserved,
  fixtureFulfilled,
  suggestionVisible,
}) {
  if (!domUpdated) return "DOM_VALUE_NOT_UPDATED";
  if (!networkObserved && suggestionVisible) return "SUGGESTION_ALTERNATE_PATH";
  if (!networkObserved) return "PRODUCT_REQUEST_NOT_CREATED";
  if (!fetchObserved) return "NETWORK_OBSERVED_FETCH_MISSED";
  if (fixtureFulfilled && suggestionVisible) return "FETCH_PAUSED_FULFILLED_AND_RENDERED";
  if (fixtureFulfilled) return "FIXTURE_FULFILLED_UI_NOT_RENDERED";
  return "EVIDENCE_INSUFFICIENT";
}

export function sanitizeBrowserUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return `${parsed.protocol}${parsed.pathname}`;
    }
    const queryKeys = [...new Set(parsed.searchParams.keys())].sort();
    const sanitizedQuery = queryKeys.length
      ? `?${queryKeys.map((key) => `${encodeURIComponent(key)}=[REDACTED]`).join("&")}`
      : "";
    return `${parsed.origin}${parsed.pathname}${sanitizedQuery}`;
  } catch {
    return null;
  }
}

export function buildPageNavigateCommand(targetUrl) {
  const parsed = new URL(targetUrl);
  assertQaBrowserOrigin(parsed.href);
  return Object.freeze({
    method: "Page.navigate",
    params: Object.freeze({ url: parsed.href }),
  });
}

export function sanitizeNavigationAcknowledgement({
  targetId,
  requestedUrl,
  result,
  commandTimestamp,
}) {
  const requestedOrigin = new URL(requestedUrl).origin;
  const frameId = sanitizedId(result?.frameId);
  const hasErrorText = Boolean(result?.errorText);
  return Object.freeze({
    targetId: sanitizedId(targetId),
    requestedOrigin,
    requestedUrl: sanitizeBrowserUrl(requestedUrl),
    frameId,
    loaderId: sanitizedId(result?.loaderId),
    acknowledged: Boolean(frameId) && !hasErrorText,
    hasErrorText,
    commandTimestamp: String(commandTimestamp || ""),
  });
}

export function assertNavigationAcknowledgement(acknowledgement) {
  if (
    !acknowledgement?.targetId ||
    !acknowledgement?.requestedOrigin ||
    !acknowledgement?.frameId ||
    !acknowledgement.acknowledged ||
    acknowledgement.hasErrorText
  ) {
    throw new HarnessError(
      "NAVIGATION_COMMAND_FAILED",
      "Page.navigate was not safely acknowledged by the selected Target.",
    );
  }
  return acknowledgement;
}

export function createTargetIdentityEvidence({
  createdTargetId,
  selectedTargetId,
  targetType,
  initialUrl,
}) {
  const created = sanitizedId(createdTargetId);
  const selected = sanitizedId(selectedTargetId);
  if (!created || created !== selected || targetType !== "page") {
    throw new HarnessError(
      "TARGET_DETACHED_OR_REPLACED",
      "The created and selected Browser Target identities do not match.",
    );
  }
  const sanitizedUrl = sanitizeBrowserUrl(initialUrl);
  return {
    createdTargetId: created,
    selectedTargetId: selected,
    attachedSessionIdentity: `direct-target:${selected}`,
    targetType,
    initialUrl: sanitizedUrl,
    latestUrl: sanitizedUrl,
    detached: false,
    changedOrReplaced: false,
    events: [],
    droppedEventCount: 0,
  };
}

function appendBoundedEvent(state, event, maximum = 24) {
  state.events.push(Object.freeze(event));
  if (state.events.length > maximum) {
    state.events.shift();
    state.droppedEventCount += 1;
  }
}

export function applyTargetIdentityEvent(state, event) {
  const targetInfo = event?.params?.targetInfo;
  const eventTargetId = sanitizedId(targetInfo?.targetId || event?.params?.targetId);
  if (eventTargetId !== state.selectedTargetId) return state;

  if (event.method === "Target.targetInfoChanged") {
    state.latestUrl = sanitizeBrowserUrl(targetInfo?.url) || state.latestUrl;
    if (targetInfo?.type && targetInfo.type !== state.targetType) state.changedOrReplaced = true;
  }
  if (event.method === "Target.targetDestroyed" || event.method === "Target.detachedFromTarget") {
    state.detached = true;
    state.changedOrReplaced = true;
  }
  appendBoundedEvent(state, {
    method: event.method,
    sequence: Number.isFinite(event.sequence) ? event.sequence : null,
    targetId: eventTargetId,
    url: sanitizeBrowserUrl(targetInfo?.url),
  });
  return state;
}

export function createExecutionContextTracker() {
  return {
    navigationFrameId: null,
    navigationSequence: 0,
    currentId: null,
    currentFrameId: null,
    createdCount: 0,
    destroyedCount: 0,
    clearedCount: 0,
  };
}

export function beginExecutionContextNavigation(state, sequence = 0) {
  state.navigationSequence = Number.isFinite(sequence) ? sequence : 0;
  state.currentId = null;
  state.currentFrameId = null;
  return state;
}

export function applyExecutionContextEvent(state, event) {
  if (event.method === "Runtime.executionContextsCleared") {
    state.currentId = null;
    state.currentFrameId = null;
    state.clearedCount += 1;
    return state;
  }
  if (event.method === "Runtime.executionContextDestroyed") {
    const destroyedId = Number(event.params?.executionContextId);
    state.destroyedCount += 1;
    if (destroyedId === state.currentId) {
      state.currentId = null;
      state.currentFrameId = null;
    }
    return state;
  }
  if (event.method !== "Runtime.executionContextCreated") return state;

  const context = event.params?.context;
  const contextId = Number(context?.id);
  const frameId = sanitizedId(context?.auxData?.frameId);
  const isDefault = context?.auxData?.isDefault === true;
  state.createdCount += 1;
  if (
    isDefault &&
    Number.isFinite(contextId) &&
    Number(event.sequence || 0) >= state.navigationSequence &&
    (!state.navigationFrameId || frameId === state.navigationFrameId)
  ) {
    state.currentId = contextId;
    state.currentFrameId = frameId;
  }
  return state;
}

export function sanitizeReadinessSample(raw, context = {}) {
  return Object.freeze({
    timestamp: String(context.timestamp || ""),
    selectedTargetId: sanitizedId(context.selectedTargetId),
    currentUrl: sanitizeBrowserUrl(raw?.url),
    origin: typeof raw?.origin === "string" ? raw.origin : null,
    readyState: typeof raw?.readyState === "string" ? raw.readyState : null,
    inputCount: Number.isInteger(raw?.inputCount) ? raw.inputCount : null,
    inputVisible: raw?.inputVisible === true,
    inputEnabled: raw?.inputEnabled === true,
    executionContextId: Number.isFinite(context.executionContextId)
      ? context.executionContextId
      : null,
    lastLifecycleEvent: context.lastLifecycleEvent || null,
    consoleErrorCount: Number(context.consoleErrorCount || 0),
    runtimeExceptionCount: Number(context.runtimeExceptionCount || 0),
    targetValid: context.targetValid === true,
  });
}

function readinessSampleSignature(sample) {
  return JSON.stringify({
    currentUrl: sample.currentUrl,
    origin: sample.origin,
    readyState: sample.readyState,
    inputCount: sample.inputCount,
    inputVisible: sample.inputVisible,
    inputEnabled: sample.inputEnabled,
    executionContextId: sample.executionContextId,
    lastLifecycleEvent: sample.lastLifecycleEvent,
    consoleErrorCount: sample.consoleErrorCount,
    runtimeExceptionCount: sample.runtimeExceptionCount,
    targetValid: sample.targetValid,
  });
}

export function createReadinessSampleRecorder(maxSamples = MAX_READINESS_SAMPLES) {
  if (!Number.isInteger(maxSamples) || maxSamples < 2) {
    throw new HarnessError("INVALID_READINESS_SAMPLE_BOUND", "Readiness sample bound must be at least two.");
  }
  return {
    maxSamples,
    firstSample: null,
    changeSamples: [],
    finalSample: null,
    lastSignature: "",
    observedSampleCount: 0,
    droppedSampleCount: 0,
  };
}

export function recordReadinessSample(recorder, sample) {
  const signature = readinessSampleSignature(sample);
  recorder.observedSampleCount += 1;
  if (!recorder.firstSample) {
    recorder.firstSample = sample;
    recorder.finalSample = sample;
    recorder.lastSignature = signature;
    return recorder;
  }

  if (signature !== recorder.lastSignature) {
    if (recorder.finalSample !== recorder.firstSample) {
      recorder.changeSamples.push(recorder.finalSample);
    }
    while (recorder.changeSamples.length > recorder.maxSamples - 2) {
      recorder.changeSamples.shift();
      recorder.droppedSampleCount += 1;
    }
    recorder.lastSignature = signature;
  }
  recorder.finalSample = sample;
  return recorder;
}

export function readinessSamples(recorder) {
  if (!recorder.firstSample) return [];
  const result = [recorder.firstSample, ...recorder.changeSamples];
  if (recorder.finalSample !== recorder.firstSample) result.push(recorder.finalSample);
  return result.slice(-(recorder.maxSamples - 1)).length === result.length
    ? result
    : [recorder.firstSample, ...result.slice(-(recorder.maxSamples - 1))];
}

export function classifyReadinessFailure({
  navigationAcknowledgement,
  targetIdentity,
  executionContext,
  finalSample,
  loadEventObserved,
}) {
  if (
    !navigationAcknowledgement?.frameId ||
    !navigationAcknowledgement?.acknowledged ||
    navigationAcknowledgement.hasErrorText
  ) {
    return "NAVIGATION_COMMAND_FAILED";
  }
  if (targetIdentity?.detached || targetIdentity?.changedOrReplaced) {
    return "TARGET_DETACHED_OR_REPLACED";
  }
  if (!executionContext?.currentId) return "EXECUTION_CONTEXT_UNAVAILABLE";
  if ((finalSample?.runtimeExceptionCount || 0) > 0) return "APPLICATION_RUNTIME_EXCEPTION";
  if (finalSample?.origin !== navigationAcknowledgement.requestedOrigin) return "WRONG_ORIGIN";
  if (finalSample?.readyState !== "complete") {
    return loadEventObserved
      ? "READINESS_TIMEOUT_WITH_FINAL_STATE"
      : "NAVIGATION_COMPLETION_TIMEOUT";
  }
  if (
    finalSample?.inputCount !== 1 ||
    !finalSample?.inputVisible ||
    !finalSample?.inputEnabled
  ) {
    return "INPUT_NOT_RENDERED";
  }
  return "READINESS_TIMEOUT_WITH_FINAL_STATE";
}

export function isExpectedPageReady(state, origin) {
  if (!state || !origin) return false;
  return (
    state.origin === new URL(origin).origin &&
    state.readyState === "complete" &&
    state.inputCount === 1 &&
    state.inputVisible === true &&
    state.inputEnabled === true &&
    state.targetValid === true &&
    Number(state.runtimeExceptionCount || 0) === 0
  );
}

export async function waitForCondition(
  check,
  {
    timeoutMs,
    intervalMs = 100,
    description = "condition",
    now = () => Date.now(),
    sleep = (duration) => new Promise((resolvePromise) => setTimeout(resolvePromise, duration)),
  },
) {
  const startedAt = now();
  let lastValue;
  while (now() - startedAt < timeoutMs) {
    lastValue = await check();
    if (lastValue) return lastValue;
    await sleep(intervalMs);
  }
  throw new HarnessError("BOUNDED_WAIT_TIMEOUT", `${description} did not complete within ${timeoutMs}ms.`);
}

export async function finalizeCleanupSteps(steps) {
  const results = [];
  for (const step of steps) {
    try {
      await step.run();
      results.push({ name: step.name, success: true, error: "" });
    } catch (error) {
      results.push({ name: step.name, success: false, error: safeErrorMessage(error) });
    }
  }
  return results;
}

export async function selectLowestFreeQaPort(isFree) {
  for (let port = QA_PORT_MIN; port <= QA_PORT_MAX; port += 1) {
    if (await isFree(port)) return port;
  }
  throw new HarnessError("NO_FREE_QA_PORT", `No free QA port from ${QA_PORT_MIN} through ${QA_PORT_MAX}.`);
}

function safeErrorMessage(error) {
  return String(error?.message || error || "Unknown error")
    .replace(/(authorization|bearer|token|password|cookie|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/\b(sk-|ghp_|github_pat_)[a-zA-Z0-9_-]+\b/g, "[REDACTED]");
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function candidateInventory() {
  return CANDIDATE_PATHS.map((path) => {
    const absolutePath = join(REPOSITORY_ROOT, path);
    if (!existsSync(absolutePath)) throw new HarnessError("CANDIDATE_MISSING", `Candidate path is missing: ${path}`);
    return { path, sha256: sha256File(absolutePath) };
  });
}

function commandOutput(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
  if (result.status !== 0) {
    throw new HarnessError(
      "COMMAND_FAILED",
      `${basename(command)} failed with exit ${result.status}: ${safeErrorMessage(result.stderr)}`,
    );
  }
  return String(result.stdout || "");
}

function gitOutput(args) {
  return commandOutput("git.exe", args);
}

function parseStatusPath(line) {
  if (line.length < 4) return "";
  const rawPath = line.slice(3);
  const renamePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) : rawPath;
  return renamePath.replaceAll("\\", "/");
}

function repositoryPreflight() {
  const branch = gitOutput(["branch", "--show-current"]).trim();
  const head = gitOutput(["rev-parse", "HEAD"]).trim();
  const originMain = gitOutput(["rev-parse", "origin/main"]).trim();
  const staged = gitOutput(["diff", "--cached", "--name-only"])
    .split(/\r?\n/)
    .filter(Boolean);
  const statusLines = gitOutput(["status", "--short"])
    .split(/\r?\n/)
    .filter(Boolean);
  const unexpected = statusLines
    .map(parseStatusPath)
    .filter((path) => path && !ALLOWED_WORKTREE_PATHS.has(path));

  if (branch !== "main") throw new HarnessError("BRANCH_MISMATCH", `Expected main, found ${branch}.`);
  if (head !== originMain) throw new HarnessError("REMOTE_BASE_MISMATCH", "HEAD and origin/main must match.");
  if (staged.length) throw new HarnessError("STAGED_FILES_PRESENT", "Browser QA requires an empty staged index.");
  if (unexpected.length) {
    throw new HarnessError("UNEXPECTED_WORKTREE_CHANGE", `Unexpected working-tree paths: ${unexpected.join(", ")}`);
  }

  return { branch, head, originMain, stagedCount: staged.length, statusPaths: statusLines.map(parseStatusPath) };
}

async function fetchWithTimeout(url, timeoutMs = 2_000, options = {}) {
  const boundedTimeout = Math.min(timeoutMs, 2_000);
  return fetch(url, {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(boundedTimeout),
  });
}

async function httpStatus(url) {
  try {
    const response = await fetchWithTimeout(url, 2_000);
    return response.status;
  } catch {
    return null;
  }
}

function normalizeForComparison(path) {
  return resolve(path).toLocaleLowerCase("en-US");
}

function copySnapshot(repositoryRoot, appRoot) {
  const excludedDirectories = new Set([".git", ".next", "node_modules", ".agent-runs"]);
  const excludedFiles = new Set([
    "docs/project/QA_CHECKLIST.md",
    "docs/project/QA_CHECKLIST.pdf",
  ]);
  cpSync(repositoryRoot, appRoot, {
    recursive: true,
    dereference: false,
    verbatimSymlinks: true,
    filter(source) {
      const relativePath = relative(repositoryRoot, source).replaceAll("\\", "/");
      if (!relativePath) return true;
      const topLevel = relativePath.split("/")[0];
      if (excludedDirectories.has(topLevel)) return false;
      return !excludedFiles.has(relativePath);
    },
  });
}

function verifySnapshotBoundary(appRoot) {
  const forbidden = [
    ".git",
    ".next",
    ".agent-runs",
    "docs/project/QA_CHECKLIST.md",
    "docs/project/QA_CHECKLIST.pdf",
  ];
  for (const relativePath of forbidden) {
    if (existsSync(join(appRoot, relativePath))) {
      throw new HarnessError("SNAPSHOT_EXCLUSION_FAILED", `Excluded snapshot path exists: ${relativePath}`);
    }
  }
}

async function isPortFree(port) {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolvePromise(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close(() => resolvePromise(true));
    });
  });
}

function netstatListeners() {
  const output = commandOutput("netstat.exe", ["-ano", "-p", "TCP"]);
  const listeners = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
    if (!match) continue;
    listeners.push({ address: match[1], port: Number(match[2]), pid: Number(match[3]) });
  }
  return listeners;
}

function listenerPid(port) {
  return netstatListeners().find((listener) => listener.port === port)?.pid || null;
}

function listenersInQaRange() {
  return netstatListeners().filter((listener) => listener.port >= QA_PORT_MIN && listener.port <= QA_PORT_MAX);
}

function resolvePowerShell() {
  for (const candidate of POWERSHELL_CANDIDATES) {
    if (!candidate.includes("\\") || existsSync(candidate)) return candidate;
  }
  throw new HarnessError("POWERSHELL_MISSING", "PowerShell is required for exact Windows process ancestry.");
}

function processTable() {
  const script = [
    "$items = Get-Process -ErrorAction SilentlyContinue | ForEach-Object {",
    "  $parentId = $null",
    "  try { if ($_.Parent) { $parentId = $_.Parent.Id } } catch {}",
    "  [pscustomobject]@{ id = $_.Id; parentId = $parentId; name = $_.ProcessName }",
    "}",
    "@($items) | ConvertTo-Json -Compress",
  ].join("\n");
  const output = commandOutput(resolvePowerShell(), ["-NoProfile", "-Command", script]).trim();
  if (!output) return [];
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function descendantDepths(rootPid, table = processTable()) {
  const childrenByParent = new Map();
  for (const process of table) {
    const parentId = Number(process.parentId);
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(Number(process.id));
  }

  const depths = new Map([[Number(rootPid), 0]]);
  const queue = [Number(rootPid)];
  while (queue.length) {
    const parentId = queue.shift();
    for (const childId of childrenByParent.get(parentId) || []) {
      if (depths.has(childId)) continue;
      depths.set(childId, depths.get(parentId) + 1);
      queue.push(childId);
    }
  }
  return depths;
}

function verifyOwnedPid(rootPid, expectedPid) {
  const depths = descendantDepths(rootPid);
  if (!depths.has(Number(expectedPid))) {
    throw new HarnessError(
      "PROCESS_OWNERSHIP_UNPROVEN",
      `PID ${expectedPid} is not the launcher or a verified descendant of PID ${rootPid}.`,
    );
  }
  return true;
}

async function terminateOwnedProcessTree(rootPid, knownPids = [], protectedPids = []) {
  if (!rootPid) return [];
  const table = processTable();
  const existingIds = new Set(table.map((process) => Number(process.id)));
  const existingKnownPids = knownPids.filter((pid) => pid && existingIds.has(Number(pid)));
  if (!existingIds.has(Number(rootPid)) && !existingKnownPids.length) return [];

  const depths = descendantDepths(rootPid, table);
  for (const knownPid of existingKnownPids) {
    if (!depths.has(Number(knownPid))) {
      throw new HarnessError("PROCESS_OWNERSHIP_UNPROVEN", `Owned PID verification failed for ${knownPid}.`);
    }
  }
  for (const protectedPid of protectedPids.filter(Boolean)) {
    if (depths.has(Number(protectedPid))) {
      throw new HarnessError("PROTECTED_PROCESS_IN_OWNED_TREE", "Founder Preview appeared in the QA process tree.");
    }
  }

  const ordered = [...depths.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([pid]) => pid);
  const stopped = [];
  for (const pid of ordered) {
    try {
      process.kill(pid);
      stopped.push(pid);
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  return stopped;
}

class CdpConnection {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Set();
    this.sequence = 0;
  }

  async open(timeoutMs = 5_000) {
    await new Promise((resolvePromise, rejectPromise) => {
      const socket = new WebSocket(this.url);
      const timer = setTimeout(() => {
        socket.close();
        rejectPromise(new HarnessError("CDP_CONNECT_TIMEOUT", `CDP connection exceeded ${timeoutMs}ms.`));
      }, timeoutMs);
      socket.addEventListener(
        "open",
        () => {
          clearTimeout(timer);
          this.socket = socket;
          resolvePromise();
        },
        { once: true },
      );
      socket.addEventListener(
        "error",
        () => {
          clearTimeout(timer);
          rejectPromise(new HarnessError("CDP_CONNECT_FAILED", "Chrome DevTools connection failed."));
        },
        { once: true },
      );
      socket.addEventListener("message", (message) => this.#handleMessage(message.data));
      socket.addEventListener("close", () => {
        for (const pending of this.pending.values()) {
          pending.reject(new HarnessError("CDP_CONNECTION_CLOSED", "Chrome DevTools connection closed."));
        }
        this.pending.clear();
      });
    });
    return this;
  }

  #handleMessage(data) {
    const message = JSON.parse(String(data));
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) {
        pending.reject(new HarnessError("CDP_COMMAND_FAILED", message.error.message || "CDP command failed."));
      } else {
        pending.resolve(message.result || {});
      }
      return;
    }
    if (!message.method) return;
    this.sequence += 1;
    const event = { method: message.method, params: message.params || {}, sequence: this.sequence };
    for (const handler of this.handlers) handler(event);
  }

  onEvent(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(method, params = {}, timeoutMs = 5_000) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new HarnessError("CDP_NOT_CONNECTED", "CDP command attempted before connection."));
    }
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectPromise(new HarnessError("CDP_COMMAND_TIMEOUT", `${method} exceeded ${timeoutMs}ms.`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolvePromise, reject: rejectPromise, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) this.socket.close();
  }
}

function findBrowserExecutable() {
  const executable = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!executable) {
    throw new HarnessError("BROWSER_RUNTIME_CAPABILITY_MISSING", "Chrome or Edge executable was not found.");
  }
  return executable;
}

async function waitForDevToolsPort(profileRoot, browserProcess) {
  const activePortPath = join(profileRoot, "DevToolsActivePort");
  return waitForCondition(
    async () => {
      if (browserProcess.exitCode !== null) {
        throw new HarnessError("BROWSER_EXITED_EARLY", `Browser exited with code ${browserProcess.exitCode}.`);
      }
      if (!existsSync(activePortPath)) return false;
      const [portLine, browserPath] = readFileSync(activePortPath, "utf8").trim().split(/\r?\n/);
      const port = Number(portLine);
      if (!Number.isInteger(port) || !browserPath) return false;
      return { port, browserPath };
    },
    { timeoutMs: 10_000, intervalMs: 100, description: "Chrome DevTools readiness" },
  );
}

async function evaluateValue(connection, expression, contextId = null) {
  const parameters = {
    expression,
    returnByValue: true,
    awaitPromise: true,
  };
  if (Number.isFinite(contextId)) parameters.contextId = contextId;
  const result = await connection.send("Runtime.evaluate", parameters);
  if (result.exceptionDetails) throw new HarnessError("PAGE_EVALUATION_FAILED", "Browser DOM evaluation failed.");
  return result.result?.value;
}

function readinessStateExpression() {
  return `(() => {
    const elements = document.querySelectorAll("#titleInput1");
    const input = elements[0] || null;
    const rect = input?.getBoundingClientRect();
    const style = input ? getComputedStyle(input) : null;
    return {
      url: location.href,
      origin: location.origin,
      readyState: document.readyState,
      inputCount: elements.length,
      inputVisible: !!input && !!rect && rect.width > 0 && rect.height > 0 && style?.visibility !== "hidden" && style?.display !== "none",
      inputEnabled: !!input && !input.disabled
    };
  })()`;
}

function createLifecycleEvidence() {
  return {
    lastEvent: null,
    loadEventObserved: false,
    frameNavigatedCount: 0,
    lifecycleEventCount: 0,
    runtimeExceptionCount: 0,
    consoleErrorCount: 0,
    events: [],
    droppedEventCount: 0,
  };
}

function applyLifecycleEvent(state, event) {
  let sanitizedEvent = null;
  if (event.method === "Page.frameNavigated") {
    state.frameNavigatedCount += 1;
    sanitizedEvent = {
      method: event.method,
      sequence: event.sequence,
      frameId: sanitizedId(event.params?.frame?.id),
      url: sanitizeBrowserUrl(event.params?.frame?.url),
    };
  } else if (event.method === "Page.loadEventFired") {
    state.loadEventObserved = true;
    sanitizedEvent = {
      method: event.method,
      sequence: event.sequence,
      timestamp: Number.isFinite(event.params?.timestamp) ? event.params.timestamp : null,
    };
  } else if (event.method === "Page.lifecycleEvent") {
    state.lifecycleEventCount += 1;
    sanitizedEvent = {
      method: event.method,
      sequence: event.sequence,
      name: sanitizedId(event.params?.name),
      frameId: sanitizedId(event.params?.frameId),
    };
  } else if (event.method === "Runtime.exceptionThrown") {
    state.runtimeExceptionCount += 1;
    sanitizedEvent = { method: event.method, sequence: event.sequence };
  } else if (
    (event.method === "Runtime.consoleAPICalled" && event.params?.type === "error") ||
    (event.method === "Log.entryAdded" && event.params?.entry?.level === "error")
  ) {
    state.consoleErrorCount += 1;
    sanitizedEvent = { method: event.method, sequence: event.sequence };
  }

  if (sanitizedEvent) {
    state.lastEvent = sanitizedEvent.method;
    appendBoundedEvent(state, sanitizedEvent);
  }
  return state;
}

function inputStateExpression() {
  return `(() => {
    const elements = document.querySelectorAll("#titleInput1");
    const input = elements[0] || null;
    const rect = input?.getBoundingClientRect();
    const style = input ? getComputedStyle(input) : null;
    return {
      count: elements.length,
      value: input?.value || "",
      focused: document.activeElement === input,
      visible: !!input && !!rect && rect.width > 0 && rect.height > 0 && style?.visibility !== "hidden" && style?.display !== "none",
      enabled: !!input && !input.disabled
    };
  })()`;
}

function fillInputExpression(value) {
  return `(() => {
    const input = document.querySelector("#titleInput1");
    if (!input) return false;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ${JSON.stringify(value)} }));
    return true;
  })()`;
}

function suggestionStateExpression() {
  return `(() => {
    const list = document.querySelector('[role="listbox"][aria-label="작품 1 검색 후보"]');
    const items = list ? Array.from(list.querySelectorAll(".suggestion-item")) : [];
    return {
      visible: !!list && !!(list.offsetWidth || list.offsetHeight || list.getClientRects().length),
      count: items.length,
      text: list?.innerText || ""
    };
  })()`;
}

function fixtureResponseBody() {
  return Buffer.from(
    JSON.stringify({
      source: "fixture",
      results: [
        {
          providerId: "tmdb",
          providerContentId: "157336",
          tmdbId: 157336,
          mediaType: "movie",
          title: "인터스텔라",
          originalTitle: "Interstellar",
          year: "2014",
          type: "movie",
          label: "영화",
          poster: null,
        },
      ],
    }),
    "utf8",
  ).toString("base64");
}

async function runBalanceScenario({ page, origin, evidenceDirectory, targetIdentity }) {
  const consoleErrors = [];
  const lifecycle = createLifecycleEvidence();
  const executionContext = createExecutionContextTracker();
  const readinessRecorder = createReadinessSampleRecorder();
  let networkEvidence = null;
  let fetchEvidence = null;
  let fixtureFulfilled = false;
  let fixtureFailure = null;
  let navigationAcknowledgement = null;
  let readinessClassification = null;

  const removeHandler = page.onEvent((event) => {
    applyExecutionContextEvent(executionContext, event);
    applyLifecycleEvent(lifecycle, event);
    if (event.method === "Runtime.exceptionThrown") consoleErrors.push("runtime-exception");
    if (event.method === "Log.entryAdded" && event.params?.entry?.level === "error") consoleErrors.push("log-error");
    if (event.method === "Runtime.consoleAPICalled" && event.params?.type === "error") consoleErrors.push("console-error");

    const requestUrl = event.params?.request?.url || "";
    if (!matchesSuggestRequest(requestUrl, origin)) return;
    if (event.method === "Network.requestWillBeSent") {
      networkEvidence = sanitizeRequestEvidence(event, origin);
      return;
    }
    if (event.method !== "Fetch.requestPaused") return;
    fetchEvidence = sanitizeRequestEvidence(event, origin);
    page
      .send("Fetch.fulfillRequest", {
        requestId: event.params.requestId,
        responseCode: 200,
        responsePhrase: "OK",
        responseHeaders: [
          { name: "Content-Type", value: "application/json; charset=utf-8" },
          { name: "Cache-Control", value: "no-store" },
        ],
        body: fixtureResponseBody(),
      })
      .then(() => {
        fixtureFulfilled = true;
      })
      .catch((error) => {
        fixtureFailure = error;
      });
  });

  const browserEvidence = () => ({
    navigation: navigationAcknowledgement,
    target: {
      ...targetIdentity,
      events: [...targetIdentity.events],
    },
    lifecycle: {
      ...lifecycle,
      events: [...lifecycle.events],
    },
    executionContext: { ...executionContext },
    readiness: {
      maximumDurationMs: BROWSER_READINESS_TIMEOUT_MS,
      maximumSamples: readinessRecorder.maxSamples,
      observedSampleCount: readinessRecorder.observedSampleCount,
      droppedSampleCount: readinessRecorder.droppedSampleCount,
      samples: readinessSamples(readinessRecorder),
      finalSample: readinessRecorder.finalSample,
      classification: readinessClassification,
    },
  });

  function failWithEvidence(code, message) {
    const error = new HarnessError(code, message);
    error.browserEvidence = browserEvidence();
    throw error;
  }

  try {
    await page.send("Runtime.enable");
    await page.send("Page.enable");
    await page.send("Page.setLifecycleEventsEnabled", { enabled: true });
    await page.send("Log.enable");
    await page.send("Network.enable");
    await page.send("Fetch.enable", { patterns: buildFetchPatterns(origin) });

    const navigationCommand = buildPageNavigateCommand(origin);
    beginExecutionContextNavigation(executionContext, page.sequence);
    const navigationTimestamp = new Date().toISOString();
    let navigationResult;
    try {
      navigationResult = await page.send(navigationCommand.method, navigationCommand.params);
    } catch {
      readinessClassification = "NAVIGATION_COMMAND_FAILED";
      failWithEvidence(
        "NAVIGATION_COMMAND_FAILED",
        "Page.navigate failed before the selected Target acknowledged navigation.",
      );
    }
    navigationAcknowledgement = sanitizeNavigationAcknowledgement({
      targetId: targetIdentity.selectedTargetId,
      requestedUrl: origin,
      result: navigationResult,
      commandTimestamp: navigationTimestamp,
    });
    try {
      assertNavigationAcknowledgement(navigationAcknowledgement);
    } catch {
      readinessClassification = "NAVIGATION_COMMAND_FAILED";
      failWithEvidence(
        "NAVIGATION_COMMAND_FAILED",
        "Page.navigate acknowledgement was missing or reported an error.",
      );
    }
    executionContext.navigationFrameId = navigationAcknowledgement.frameId;
    if (
      executionContext.currentFrameId &&
      executionContext.currentFrameId !== executionContext.navigationFrameId
    ) {
      executionContext.currentId = null;
      executionContext.currentFrameId = null;
    }

    try {
      await waitForCondition(
        async () => {
          if (targetIdentity.detached || targetIdentity.changedOrReplaced) {
            readinessClassification = "TARGET_DETACHED_OR_REPLACED";
            failWithEvidence(
              "TARGET_DETACHED_OR_REPLACED",
              "The selected Browser Target detached or changed during readiness.",
            );
          }

          let rawState = {
            url: targetIdentity.latestUrl,
            origin: null,
            readyState: null,
            inputCount: null,
            inputVisible: false,
            inputEnabled: false,
          };
          if (executionContext.currentId) {
            try {
              rawState = await evaluateValue(
                page,
                readinessStateExpression(),
                executionContext.currentId,
              );
              targetIdentity.latestUrl =
                sanitizeBrowserUrl(rawState?.url) || targetIdentity.latestUrl;
            } catch (error) {
              if (
                error?.code === "CDP_CONNECTION_CLOSED" ||
                error?.code === "CDP_NOT_CONNECTED"
              ) {
                targetIdentity.detached = true;
                targetIdentity.changedOrReplaced = true;
                readinessClassification = "TARGET_DETACHED_OR_REPLACED";
                failWithEvidence(
                  "TARGET_DETACHED_OR_REPLACED",
                  "The selected Browser Target connection closed during readiness.",
                );
              }
              if (error?.code !== "CDP_COMMAND_FAILED") throw error;
              executionContext.currentId = null;
              executionContext.currentFrameId = null;
            }
          }

          const sample = sanitizeReadinessSample(rawState, {
            timestamp: new Date().toISOString(),
            selectedTargetId: targetIdentity.selectedTargetId,
            executionContextId: executionContext.currentId,
            lastLifecycleEvent: lifecycle.lastEvent,
            consoleErrorCount: lifecycle.consoleErrorCount,
            runtimeExceptionCount: lifecycle.runtimeExceptionCount,
            targetValid: !targetIdentity.detached && !targetIdentity.changedOrReplaced,
          });
          recordReadinessSample(readinessRecorder, sample);
          if (sample.runtimeExceptionCount > 0) {
            readinessClassification = "APPLICATION_RUNTIME_EXCEPTION";
            failWithEvidence(
              "APPLICATION_RUNTIME_EXCEPTION",
              "A blocking Runtime exception occurred before Browser readiness.",
            );
          }
          return isExpectedPageReady(sample, origin) ? sample : false;
        },
        {
          timeoutMs: BROWSER_READINESS_TIMEOUT_MS,
          intervalMs: 100,
          description: "expected QA page and input readiness",
        },
      );
    } catch (error) {
      if (error?.browserEvidence) throw error;
      if (error?.code !== "BOUNDED_WAIT_TIMEOUT") {
        error.browserEvidence = browserEvidence();
        throw error;
      }
      readinessClassification = classifyReadinessFailure({
        navigationAcknowledgement,
        targetIdentity,
        executionContext,
        finalSample: readinessRecorder.finalSample,
        loadEventObserved: lifecycle.loadEventObserved,
      });
      failWithEvidence(
        readinessClassification,
        `Browser readiness failed with ${readinessClassification}.`,
      );
    }

    readinessClassification = "READY";
    const activeContextId = executionContext.currentId;
    if (!activeContextId) {
      readinessClassification = "EXECUTION_CONTEXT_UNAVAILABLE";
      failWithEvidence(
        "EXECUTION_CONTEXT_UNAVAILABLE",
        "The selected Target has no active execution context after readiness.",
      );
    }
    const readinessEvidence = browserEvidence();

    const initial = await evaluateValue(page, inputStateExpression(), activeContextId);
    if (initial.count !== 1) throw new HarnessError("INPUT_COUNT_MISMATCH", `Expected one #titleInput1, found ${initial.count}.`);
    if (!initial.visible || !initial.enabled) {
      throw new HarnessError("INPUT_NOT_INTERACTABLE", "#titleInput1 must be visible and enabled.");
    }

    await evaluateValue(page, `document.querySelector("#titleInput1").focus(); true`, activeContextId);
    const focused = await evaluateValue(page, inputStateExpression(), activeContextId);
    if (!focused.focused) throw new HarnessError("INPUT_FOCUS_FAILED", "#titleInput1 did not receive focus.");

    const eventCursor = page.sequence;
    const observationStartedAt = new Date().toISOString();
    const fillSucceeded = await evaluateValue(page, fillInputExpression("인터스텔라"), activeContextId);
    if (!fillSucceeded) throw new HarnessError("INPUT_FILL_FAILED", "#titleInput1 fill failed.");
    const afterFill = await evaluateValue(page, inputStateExpression(), activeContextId);
    const domUpdated = afterFill.value === "인터스텔라";

    let observationTimedOut = false;
    try {
      await waitForCondition(
        async () => {
          if (fixtureFailure) throw fixtureFailure;
          return networkEvidence && fetchEvidence && fixtureFulfilled;
        },
        {
          timeoutMs: REQUEST_OBSERVATION_TIMEOUT_MS,
          intervalMs: 25,
          description: "Network and Fetch suggestion evidence",
        },
      );
    } catch (error) {
      if (error?.code !== "BOUNDED_WAIT_TIMEOUT") throw error;
      observationTimedOut = true;
    }

    let suggestion = await evaluateValue(page, suggestionStateExpression(), activeContextId);
    if (!suggestion.visible && !observationTimedOut) {
      try {
        suggestion = await waitForCondition(
          () =>
            evaluateValue(page, suggestionStateExpression(), activeContextId).then((state) =>
              state.visible ? state : false,
            ),
          { timeoutMs: 2_000, intervalMs: 50, description: "suggestion UI" },
        );
      } catch (error) {
        if (error?.code !== "BOUNDED_WAIT_TIMEOUT") throw error;
      }
    }

    const classification = classifyAutocompleteObservation({
      domUpdated,
      networkObserved: Boolean(networkEvidence),
      fetchObserved: Boolean(fetchEvidence),
      fixtureFulfilled,
      suggestionVisible: Boolean(suggestion.visible),
    });
    const correlation = correlateRequestEvidence(networkEvidence, fetchEvidence);

    if (classification !== "FETCH_PAUSED_FULFILLED_AND_RENDERED") {
      throw new HarnessError("AUTOCOMPLETE_OBSERVATION_FAILED", classification);
    }
    if (!correlation.correlated) {
      throw new HarnessError("REQUEST_CORRELATION_FAILED", correlation.reason);
    }
    if (!suggestion.text.includes("인터스텔라") || !suggestion.text.includes("Interstellar · 2014 · 영화")) {
      throw new HarnessError("SUGGESTION_TEXT_MISMATCH", "Expected approved suggestion text was not rendered.");
    }

    const screenshot = await page.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    const screenshotPath = join(evidenceDirectory, "BROWSER-BALANCE-001.png");
    writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

    return {
      scenario: "BROWSER-BALANCE-001",
      pass: true,
      origin,
      observationStartedAt,
      eventCursor,
      dom: {
        inputCount: afterFill.count,
        initialValue: initial.value,
        valueAfterFill: afterFill.value,
        focusedAfterFill: afterFill.focused,
        visibleAfterFill: afterFill.visible,
        enabledAfterFill: afterFill.enabled,
      },
      network: networkEvidence,
      fetch: fetchEvidence,
      correlation,
      fixtureFulfilled,
      browserReadiness: readinessEvidence,
      suggestion: {
        visible: suggestion.visible,
        count: suggestion.count,
        expectedTextPresent: true,
      },
      consoleErrorCount: consoleErrors.length,
      screenshotPath,
      classification,
    };
  } catch (error) {
    if (!error.browserEvidence) error.browserEvidence = browserEvidence();
    throw error;
  } finally {
    removeHandler();
    try {
      await page.send("Fetch.enable", { patterns: [] });
    } catch {}
  }
}

async function launchBrowser({ origin, runtimeRoot, evidenceDirectory, founderPid }) {
  assertQaBrowserOrigin(origin);
  const executable = findBrowserExecutable();
  const profileRoot = join(runtimeRoot, "browser-profile");
  mkdirSync(profileRoot, { recursive: true });
  const browserStdout = openSync(join(runtimeRoot, "browser.stdout.log"), "a");
  const browserStderr = openSync(join(runtimeRoot, "browser.stderr.log"), "a");
  const browserProcess = spawn(
    executable,
    [
      "--headless=new",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileRoot}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-mode",
      "--disable-extensions",
      "--disable-sync",
      "--disable-component-update",
      "--disable-features=Translate",
      "about:blank",
    ],
    {
      cwd: runtimeRoot,
      detached: false,
      windowsHide: true,
      stdio: ["ignore", browserStdout, browserStderr],
    },
  );
  closeSync(browserStdout);
  closeSync(browserStderr);

  let browserConnection = null;
  let pageConnection = null;
  let debugListenerPid = null;
  let removeTargetHandler = null;
  let targetIdentity = null;
  const pendingTargetEvents = [];
  try {
    const devTools = await waitForDevToolsPort(profileRoot, browserProcess);
    debugListenerPid = await waitForCondition(
      () => {
        const pid = listenerPid(devTools.port);
        return pid || false;
      },
      { timeoutMs: 5_000, intervalMs: 100, description: "Chrome debugger listener" },
    );
    verifyOwnedPid(browserProcess.pid, debugListenerPid);

    browserConnection = await new CdpConnection(
      `ws://127.0.0.1:${devTools.port}${devTools.browserPath}`,
    ).open();
    removeTargetHandler = browserConnection.onEvent((event) => {
      if (!event.method.startsWith("Target.")) return;
      if (targetIdentity) applyTargetIdentityEvent(targetIdentity, event);
      else if (pendingTargetEvents.length < 32) pendingTargetEvents.push(event);
    });
    await browserConnection.send("Target.setDiscoverTargets", { discover: true });
    const target = await browserConnection.send("Target.createTarget", { url: origin });
    const pageDescriptor = await waitForCondition(
      async () => {
        const response = await fetchWithTimeout(`http://127.0.0.1:${devTools.port}/json/list`, 2_000);
        if (!response.ok) return false;
        const targets = await response.json();
        return targets.find((item) => item.id === target.targetId && item.webSocketDebuggerUrl) || false;
      },
      { timeoutMs: 10_000, intervalMs: 100, description: "browser page target" },
    );
    targetIdentity = createTargetIdentityEvidence({
      createdTargetId: target.targetId,
      selectedTargetId: pageDescriptor.id,
      targetType: pageDescriptor.type,
      initialUrl: pageDescriptor.url,
    });
    for (const event of pendingTargetEvents) applyTargetIdentityEvent(targetIdentity, event);
    pageConnection = await new CdpConnection(pageDescriptor.webSocketDebuggerUrl).open();
    const evidence = await runBalanceScenario({
      page: pageConnection,
      origin,
      evidenceDirectory,
      targetIdentity,
    });
    removeTargetHandler();
    removeTargetHandler = null;
    return {
      evidence,
      browserProcess,
      browserConnection,
      pageConnection,
      debugListenerPid,
      executable,
    };
  } catch (error) {
    removeTargetHandler?.();
    pageConnection?.close();
    browserConnection?.close();
    const ownedStopped = await terminateOwnedProcessTree(
      browserProcess.pid,
      [debugListenerPid].filter(Boolean),
      [founderPid],
    );
    error.browserRuntime = {
      launcherPid: browserProcess.pid,
      listenerPid: debugListenerPid,
      ownedStopped,
      executable,
      evidence: error.browserEvidence || null,
    };
    throw error;
  }
}

function removeSnapshot(runtimeRoot, appRoot) {
  const junction = join(appRoot, "node_modules");
  if (existsSync(junction)) {
    if (!lstatSync(junction).isSymbolicLink()) {
      throw new HarnessError("JUNCTION_BOUNDARY_MISMATCH", "Snapshot node_modules is not a Junction.");
    }
    unlinkSync(junction);
  }
  if (existsSync(runtimeRoot)) rmSync(runtimeRoot, { recursive: true, force: true });
  return !existsSync(runtimeRoot);
}

function inventoriesEqual(before, after) {
  return (
    before.length === after.length &&
    before.every((item, index) => item.path === after[index]?.path && item.sha256 === after[index]?.sha256)
  );
}

async function runHarness(scenarioId) {
  const scenario = selectScenario(scenarioId);
  const runId = `${scenario}-${new Date().toISOString().replace(/[-:.]/g, "")}-${process.pid}`;
  const temporaryBase = join(tmpdir(), "myott-browser-qa");
  mkdirSync(temporaryBase, { recursive: true });
  const runtimeRoot = mkdtempSync(join(temporaryBase, `${runId}-`));
  const appRoot = join(runtimeRoot, "app");
  const evidenceDirectory = join(tmpdir(), "myott-browser-qa-evidence", runId);
  mkdirSync(evidenceDirectory, { recursive: true });

  const summary = {
    scenario,
    pass: false,
    runId,
    runtimeRoot,
    evidenceDirectory,
    repository: null,
    candidateBefore: [],
    candidateAfter: [],
    candidateUnchanged: false,
    packageUnchanged: false,
    lockfileUnchanged: false,
    founderPreview: { before: null, afterReadiness: null, final: null, pid: null },
    qaServer: {
      origin: "",
      port: null,
      launcherPid: null,
      listenerPid: null,
      ownedStopped: [],
    },
    browser: {
      launcherPid: null,
      listenerPid: null,
      ownedStopped: [],
      executable: "",
    },
    evidence: null,
    cleanup: [],
    snapshotRemoved: false,
    selectedPortClosed: false,
    remainingQaListeners: null,
    failure: null,
  };

  let qaProcess = null;
  let browserRuntime = null;
  let stdoutFd = null;
  let stderrFd = null;
  const packageBefore = sha256File(join(REPOSITORY_ROOT, "package.json"));
  const lockfileBefore = sha256File(join(REPOSITORY_ROOT, "pnpm-lock.yaml"));

  try {
    summary.repository = repositoryPreflight();
    summary.candidateBefore = candidateInventory();
    summary.founderPreview.before = await httpStatus(FOUNDER_PREVIEW_ORIGIN);
    summary.founderPreview.pid = listenerPid(3000);
    if (summary.founderPreview.before !== 200) {
      throw new HarnessError("FOUNDER_PREVIEW_UNHEALTHY", "Founder Preview did not return HTTP 200 before the run.");
    }
    if (listenersInQaRange().length) {
      throw new HarnessError("QA_PORT_RANGE_NOT_CLEAN", "Ports 3001 through 3100 must be free before the run.");
    }

    mkdirSync(appRoot, { recursive: true });
    copySnapshot(REPOSITORY_ROOT, appRoot);
    verifySnapshotBoundary(appRoot);
    symlinkSync(join(REPOSITORY_ROOT, "node_modules"), join(appRoot, "node_modules"), "junction");
    if (!lstatSync(join(appRoot, "node_modules")).isSymbolicLink()) {
      throw new HarnessError("JUNCTION_CREATION_FAILED", "Snapshot node_modules Junction was not created.");
    }

    const port = await selectLowestFreeQaPort(isPortFree);
    const origin = assertQaBrowserOrigin(`http://127.0.0.1:${port}`);
    summary.qaServer.port = port;
    summary.qaServer.origin = origin;

    stdoutFd = openSync(join(runtimeRoot, "qa-server.stdout.log"), "a");
    stderrFd = openSync(join(runtimeRoot, "qa-server.stderr.log"), "a");
    const nextBin = join(appRoot, "node_modules", "next", "dist", "bin", "next");
    if (!existsSync(nextBin)) throw new HarnessError("NEXT_RUNTIME_MISSING", "Next CLI is missing from node_modules.");
    qaProcess = spawn(
      process.execPath,
      [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
      {
        cwd: appRoot,
        env: { ...process.env, NODE_OPTIONS: "--use-system-ca" },
        detached: false,
        windowsHide: true,
        stdio: ["ignore", stdoutFd, stderrFd],
      },
    );
    closeSync(stdoutFd);
    closeSync(stderrFd);
    stdoutFd = null;
    stderrFd = null;
    summary.qaServer.launcherPid = qaProcess.pid;

    summary.qaServer.listenerPid = await waitForCondition(
      async () => {
        if (qaProcess.exitCode !== null) {
          throw new HarnessError("QA_SERVER_EXITED_EARLY", `QA server exited with code ${qaProcess.exitCode}.`);
        }
        const pid = listenerPid(port);
        if (!pid) return false;
        const status = await httpStatus(origin);
        return status === 200 ? pid : false;
      },
      { timeoutMs: READINESS_TIMEOUT_MS, intervalMs: 250, description: "isolated QA server readiness" },
    );
    verifyOwnedPid(qaProcess.pid, summary.qaServer.listenerPid);
    summary.founderPreview.afterReadiness = await httpStatus(FOUNDER_PREVIEW_ORIGIN);
    if (summary.founderPreview.afterReadiness !== 200) {
      throw new HarnessError("FOUNDER_PREVIEW_DEGRADED", "Founder Preview degraded after QA readiness.");
    }

    browserRuntime = await launchBrowser({
      origin: `${origin}/?qa=1`,
      runtimeRoot,
      evidenceDirectory,
      founderPid: summary.founderPreview.pid,
    });
    summary.browser.launcherPid = browserRuntime.browserProcess.pid;
    summary.browser.listenerPid = browserRuntime.debugListenerPid;
    summary.browser.executable = browserRuntime.executable;
    summary.evidence = browserRuntime.evidence;
    if (summary.evidence.consoleErrorCount !== 0) {
      throw new HarnessError("BROWSER_CONSOLE_ERROR", "The focused scenario reported browser console errors.");
    }
    summary.pass = true;
  } catch (error) {
    if (error?.browserRuntime) {
      const { evidence, ...browserRuntimeState } = error.browserRuntime;
      summary.browser = {
        ...summary.browser,
        ...browserRuntimeState,
      };
      summary.evidence = evidence || error.browserEvidence || null;
    } else if (error?.browserEvidence) {
      summary.evidence = error.browserEvidence;
    }
    summary.failure = { code: error?.code || "HARNESS_FAILURE", message: safeErrorMessage(error) };
  } finally {
    const cleanupSteps = [
      {
        name: "browser-close",
        run: async () => {
          if (!browserRuntime) return;
          try {
            await browserRuntime.browserConnection?.send("Browser.close", {}, 2_000);
          } catch {}
          browserRuntime.pageConnection?.close();
          browserRuntime.browserConnection?.close();
          summary.browser.ownedStopped = await terminateOwnedProcessTree(
            browserRuntime.browserProcess.pid,
            [browserRuntime.debugListenerPid].filter(Boolean),
            [summary.founderPreview.pid],
          );
        },
      },
      {
        name: "qa-server-stop",
        run: async () => {
          if (!qaProcess) return;
          summary.qaServer.ownedStopped = await terminateOwnedProcessTree(
            qaProcess.pid,
            [summary.qaServer.listenerPid].filter(Boolean),
            [summary.founderPreview.pid],
          );
        },
      },
      {
        name: "selected-port-close",
        run: async () => {
          if (!summary.qaServer.port) return;
          await waitForCondition(
            () => !listenerPid(summary.qaServer.port),
            { timeoutMs: 5_000, intervalMs: 100, description: "selected QA port closure" },
          );
          summary.selectedPortClosed = true;
        },
      },
      {
        name: "snapshot-remove",
        run: async () => {
          summary.snapshotRemoved = removeSnapshot(runtimeRoot, appRoot);
          if (!summary.snapshotRemoved) throw new HarnessError("SNAPSHOT_CLEANUP_FAILED", "Snapshot removal failed.");
        },
      },
      {
        name: "qa-range-verify",
        run: async () => {
          summary.remainingQaListeners = listenersInQaRange().length;
          if (summary.remainingQaListeners !== 0) {
            throw new HarnessError("QA_LISTENER_REMAINED", "A listener remained in ports 3001 through 3100.");
          }
        },
      },
      {
        name: "founder-final-health",
        run: async () => {
          summary.founderPreview.final = await httpStatus(FOUNDER_PREVIEW_ORIGIN);
          if (summary.founderPreview.final !== 200) {
            throw new HarnessError("FOUNDER_PREVIEW_FINAL_HEALTH_FAILED", "Founder Preview final HTTP check failed.");
          }
        },
      },
    ];
    summary.cleanup = await finalizeCleanupSteps(cleanupSteps);
    if (summary.cleanup.some((result) => !result.success)) summary.pass = false;
    if (stdoutFd !== null) closeSync(stdoutFd);
    if (stderrFd !== null) closeSync(stderrFd);

    summary.candidateAfter = candidateInventory();
    summary.candidateUnchanged = inventoriesEqual(summary.candidateBefore, summary.candidateAfter);
    summary.packageUnchanged = packageBefore === sha256File(join(REPOSITORY_ROOT, "package.json"));
    summary.lockfileUnchanged = lockfileBefore === sha256File(join(REPOSITORY_ROOT, "pnpm-lock.yaml"));
    if (!summary.candidateUnchanged || !summary.packageUnchanged || !summary.lockfileUnchanged) {
      summary.pass = false;
      summary.failure ||= {
        code: "PROTECTED_FILE_CHANGED",
        message: "Candidate, package, or lockfile state changed during Browser QA.",
      };
    }

    const evidencePath = join(evidenceDirectory, "BROWSER-BALANCE-001.json");
    writeFileSync(evidencePath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    summary.evidencePath = evidencePath;
  }

  return summary;
}

async function main() {
  let summary;
  try {
    const options = parseCliArgs(process.argv.slice(2));
    summary = await runHarness(options.scenario);
  } catch (error) {
    summary = {
      pass: false,
      failure: { code: error?.code || "HARNESS_FAILURE", message: safeErrorMessage(error) },
    };
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = summary.pass ? 0 : 1;
}

const isMain = process.argv[1] && normalizeForComparison(process.argv[1]) === normalizeForComparison(SCRIPT_PATH);
if (isMain) await main();
