import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const EXACT_BASE_SHA = "67a403c2a0156a6eba9ce908d621522c2f119b22";
export const EXPECTED_BRANCH = "qa/recommendation-browser-representative-v1";
export const QA_PORT_MIN = 3001;
export const QA_PORT_MAX = 3100;
export const FOUNDER_PORT = 3000;
export const EXPECTED_NEXT_VERSION = "15.5.25";
export const FIRST_PICKS_QA_BINDING = "A2_OFFLINE_FIRST_PICKS_V1";
export const VIEWPORTS = Object.freeze([
  Object.freeze({ id: "desktop", width: 1440, height: 900 }),
  Object.freeze({ id: "tablet", width: 768, height: 1024 }),
  Object.freeze({ id: "mobile", width: 390, height: 844 }),
]);
export const SCENARIOS = Object.freeze([
  Object.freeze({ id: "S1", name: "clean/default", route: null }),
  Object.freeze({ id: "S2", name: "Netflix submit/result", route: "/api/recommend/options" }),
  Object.freeze({ id: "S3", name: "Japan + SF + Drama/TV", route: "/api/recommend/options" }),
  Object.freeze({ id: "S4", name: "Japan + Horror + Drama/TV", route: "/api/recommend/options" }),
  Object.freeze({ id: "S5", name: "draft/submitted change + reset", route: "/api/recommend/seeds" }),
  Object.freeze({ id: "S6", name: "deterministic latest-request-wins", route: "/api/recommend/options" }),
]);
export const ALLOWED_CHANGED_PATHS = Object.freeze([
  "app/api/recommend/first-picks/route.js",
  "scripts/recommendation-browser-representative.mjs",
  "scripts/recommendation-browser-representative.test.mjs",
  "src/lib/providers/tmdb/testing/firstPickBrowserFixture.js",
]);

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const CHROME_CANDIDATES = Object.freeze([
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
]);

export class HarnessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "HarnessError";
    this.code = code;
  }
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function safeError(error) {
  return String(error?.message || error || "Unknown error")
    .replace(/(authorization|bearer|token|password|cookie|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/\b(sk-|ghp_|github_pat_)[a-zA-Z0-9_-]+\b/g, "[REDACTED]");
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
      `${basename(command)} failed with exit ${result.status}: ${safeError(result.stderr)}`,
    );
  }
  return String(result.stdout || "");
}

function gitOutput(args) {
  return commandOutput("git.exe", args);
}

function parseStatusPath(line) {
  const raw = line.slice(3);
  return (raw.includes(" -> ") ? raw.split(" -> ").at(-1) : raw).replaceAll("\\", "/");
}

export function validateRepositoryState({ branch, head, originMain, staged, statusPaths }) {
  const unexpected = statusPaths.filter((path) => !ALLOWED_CHANGED_PATHS.includes(path));
  if (branch !== EXPECTED_BRANCH) throw new HarnessError("BRANCH_MISMATCH", `Expected ${EXPECTED_BRANCH}, found ${branch}.`);
  if (head !== EXACT_BASE_SHA || originMain !== EXACT_BASE_SHA) {
    throw new HarnessError("BASE_MISMATCH", "HEAD and origin/main must match the approved base.");
  }
  if (staged.length) throw new HarnessError("STAGED_PRESENT", "Browser QA requires an empty staged index.");
  if (unexpected.length) {
    throw new HarnessError("UNEXPECTED_CHANGED_PATH", `Unexpected changed paths: ${unexpected.join(", ")}`);
  }
  return { branch, head, originMain, stagedCount: 0, changedPaths: [...statusPaths] };
}

function repositoryPreflight() {
  const statusLines = gitOutput(["status", "--short"]).split(/\r?\n/).filter(Boolean);
  return validateRepositoryState({
    branch: gitOutput(["branch", "--show-current"]).trim(),
    head: gitOutput(["rev-parse", "HEAD"]).trim(),
    originMain: gitOutput(["rev-parse", "refs/remotes/origin/main"]).trim(),
    staged: gitOutput(["diff", "--cached", "--name-only"]).split(/\r?\n/).filter(Boolean),
    statusPaths: statusLines.map(parseStatusPath),
  });
}

export function selectLowestFreePort(results) {
  const free = results.find((entry) => entry.free && entry.port >= QA_PORT_MIN && entry.port <= QA_PORT_MAX);
  if (!free) throw new HarnessError("NO_FREE_QA_PORT", `No free port in ${QA_PORT_MIN}-${QA_PORT_MAX}.`);
  return free.port;
}

async function portIsFree(port) {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolvePromise(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => server.close(() => resolvePromise(true)));
  });
}

async function choosePort() {
  const observations = [];
  for (let port = QA_PORT_MIN; port <= QA_PORT_MAX; port += 1) {
    observations.push({ port, free: await portIsFree(port) });
    if (observations.at(-1).free) break;
  }
  return selectLowestFreePort(observations);
}

function netstatListeners() {
  const output = commandOutput("netstat.exe", ["-ano", "-p", "TCP"]);
  const listeners = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
    if (match) listeners.push({ address: match[1], port: Number(match[2]), pid: Number(match[3]) });
  }
  return listeners;
}

function listenerPid(port) {
  return netstatListeners().find((item) => item.port === Number(port))?.pid || null;
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
  const output = commandOutput("C:\\Program Files\\PowerShell\\7\\pwsh.exe", ["-NoProfile", "-Command", script]).trim();
  if (!output) return [];
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function descendantDepths(rootPid, table = processTable()) {
  const children = new Map();
  for (const item of table) {
    const parent = Number(item.parentId);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(Number(item.id));
  }
  const depths = new Map([[Number(rootPid), 0]]);
  const queue = [Number(rootPid)];
  while (queue.length) {
    const parent = queue.shift();
    for (const child of children.get(parent) || []) {
      if (depths.has(child)) continue;
      depths.set(child, depths.get(parent) + 1);
      queue.push(child);
    }
  }
  return depths;
}

function assertOwnedPid(rootPid, expectedPid) {
  if (!descendantDepths(rootPid).has(Number(expectedPid))) {
    throw new HarnessError("PROCESS_OWNERSHIP_UNPROVEN", `PID ${expectedPid} is not owned by launcher ${rootPid}.`);
  }
}

async function waitFor(check, { timeoutMs = 20_000, intervalMs = 100, description = "condition" } = {}) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started <= timeoutMs) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, intervalMs));
  }
  if (lastError) throw lastError;
  throw new HarnessError("BOUNDED_WAIT_TIMEOUT", `${description} did not complete within ${timeoutMs}ms.`);
}

async function terminateOwnedTree(rootPid, protectedPids = []) {
  if (!rootPid) return [];
  const table = processTable();
  const existing = new Set(table.map((item) => Number(item.id)));
  if (!existing.has(Number(rootPid))) return [];
  const depths = descendantDepths(rootPid, table);
  for (const protectedPid of protectedPids.filter(Boolean)) {
    if (depths.has(Number(protectedPid))) {
      throw new HarnessError("PROTECTED_PROCESS_IN_TREE", `Protected PID ${protectedPid} is inside task-owned tree.`);
    }
  }
  const ordered = [...depths.entries()].sort((a, b) => b[1] - a[1]).map(([pid]) => pid);
  const stopped = [];
  for (const pid of ordered) {
    try {
      process.kill(pid);
      stopped.push(pid);
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
  await waitFor(
    () => {
      const ids = new Set(processTable().map((item) => Number(item.id)));
      return ordered.every((pid) => !ids.has(pid));
    },
    { timeoutMs: 8_000, intervalMs: 100, description: "owned process cleanup" },
  );
  return stopped;
}

function copySnapshot(source, destination) {
  const excludedDirs = new Set([".git", ".next", "node_modules", ".agent-runs"]);
  cpSync(source, destination, {
    recursive: true,
    dereference: false,
    verbatimSymlinks: true,
    filter(item) {
      const rel = relative(source, item).replaceAll("\\", "/");
      if (!rel) return true;
      if (excludedDirs.has(rel.split("/")[0])) return false;
      if (basename(rel).startsWith(".env")) return false;
      return true;
    },
  });
}

function resolveDependencyRoot() {
  const configured = String(process.env.MYOTT_BROWSER_QA_NODE_MODULES || "").trim();
  if (!configured) {
    throw new HarnessError("DEPENDENCY_REUSE_UNAVAILABLE", "MYOTT_BROWSER_QA_NODE_MODULES is required.");
  }
  const value = resolve(configured);
  const nextPackage = realpathSync(join(value, "next"));
  const nextBin = join(nextPackage, "dist", "bin", "next");
  const packagePath = join(nextPackage, "package.json");
  if (!existsSync(nextBin) || !existsSync(packagePath)) {
    throw new HarnessError("DEPENDENCY_REUSE_UNAVAILABLE", "MYOTT_BROWSER_QA_NODE_MODULES must reference an existing dependency tree.");
  }
  const version = JSON.parse(readFileSync(packagePath, "utf8")).version;
  if (version !== EXPECTED_NEXT_VERSION) {
    throw new HarnessError("NEXT_VERSION_MISMATCH", `Expected Next ${EXPECTED_NEXT_VERSION}, found ${version}.`);
  }
  return {
    root: value,
    nextPackage,
    nextBin,
    version,
    packagePath,
    packageSha256: sha256File(packagePath),
  };
}

function browserExecutable() {
  const path = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!path) throw new HarnessError("BROWSER_RUNTIME_MISSING", "Chrome or Edge is unavailable.");
  return path;
}

async function localHttpStatus(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(2_000) })).status;
  } catch {
    return null;
  }
}

class CdpConnection {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Set();
  }

  async open() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => rejectPromise(new HarnessError("CDP_TIMEOUT", "CDP connection timed out.")), 5_000);
      this.socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolvePromise();
      }, { once: true });
      this.socket.addEventListener("error", () => {
        clearTimeout(timer);
        rejectPromise(new HarnessError("CDP_FAILED", "CDP connection failed."));
      }, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.#message(event));
    return this;
  }

  #message(event) {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new HarnessError("CDP_COMMAND_FAILED", message.error.message));
      else pending.resolve(message.result || {});
      return;
    }
    for (const handler of this.handlers) handler(message);
  }

  onEvent(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(method, params = {}, timeoutMs = 10_000) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new HarnessError("CDP_NOT_CONNECTED", "CDP command attempted before connection."));
    }
    const id = this.nextId++;
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

async function evalValue(page, expression) {
  const response = await page.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) throw new HarnessError("PAGE_EVALUATION_FAILED", "Page evaluation failed.");
  return response.result?.value;
}

function callExpression(fn, value = undefined) {
  return `(${fn.toString()})(${JSON.stringify(value)})`;
}

function clickSelector(selector) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) return { clicked: false, reason: "missing" };
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  if (!rect.width || !rect.height || style.visibility === "hidden" || style.display === "none") {
    return { clicked: false, reason: "not-visible" };
  }
  element.click();
  return { clicked: true, checked: "checked" in element ? element.checked : null };
}

function setCheckboxDesired({ selector, desired }) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLInputElement) || element.type !== "checkbox") {
    return { pass: false, reason: "missing-checkbox", before: null, after: null, clickCount: 0 };
  }
  const before = element.checked;
  let clickCount = 0;
  if (before !== desired) {
    element.click();
    clickCount = 1;
  }
  return { pass: element.checked === desired, reason: "", before, after: element.checked, clickCount };
}

function setInputValue({ selector, value }) {
  const input = document.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter.call(input, value);
  input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  return input.value === value;
}

function visibleSubmitControl() {
  const accessibleName = "내 취향으로 추천받기";
  const candidates = [...document.querySelectorAll('button[type="submit"]')].map((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      element,
      accessibleName: (element.getAttribute("aria-label") || element.textContent || "").trim(),
      visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none",
      disabled: Boolean(element.disabled),
    };
  });
  const selected = candidates.find((candidate) => candidate.accessibleName === accessibleName
    && candidate.visible && !candidate.disabled);
  if (!selected) return null;
  selected.element.scrollIntoView({ block: "center", inline: "center" });
  const rect = selected.element.getBoundingClientRect();
  return {
    accessibleName: selected.accessibleName,
    id: selected.element.id || "",
    form: selected.element.getAttribute("form") || selected.element.form?.id || "",
    mobileSticky: Boolean(selected.element.closest(".mobile-sticky-action")),
    visible: true,
    disabled: false,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function domState() {
  const diagnostics = document.querySelector('[aria-label="Founder QA diagnostics"]');
  const fields = diagnostics
    ? Object.fromEntries([...diagnostics.querySelectorAll("dt")].map((node) => [
        node.textContent.trim(),
        node.nextElementSibling?.textContent.trim() || "",
      ]))
    : {};
  const checked = [...document.querySelectorAll('input[type="checkbox"]:checked')].map((node) => ({
    name: node.name,
    value: node.value,
    label: node.closest("label")?.textContent.trim() || "",
  }));
  const resultCount = Number.parseInt(document.querySelector("#resultCount")?.textContent || "0", 10) || 0;
  return {
    url: `${location.origin}${location.pathname}`,
    ready: document.readyState === "complete" && Boolean(document.querySelector("#recommendButton")),
    viewport: { width: innerWidth, height: innerHeight },
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    checked,
    recommendDisabled: Boolean(document.querySelector("#recommendButton")?.disabled),
    loadingVisible: Boolean(document.querySelector("#loadingState")),
    emptyVisible: Boolean(document.querySelector("#emptyState")),
    dirtyVisible: Boolean(document.querySelector(".preferences-dirty-banner")),
    appliedVisible: Boolean(document.querySelector(".applied-preferences")),
    resultCount,
    diagnostics: fields,
    inputValue: document.querySelector("#titleInput1")?.value || "",
  };
}

function installResponseController(expectedCount) {
  const originalFetch = window.fetch.bind(window);
  const state = {
    expectedCount,
    ready: [],
    released: [],
    routePayloads: [],
    resolvers: [],
  };
  window.__myottQaResponseControl = state;
  window.fetch = async (...args) => {
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const parsed = new URL(requestUrl, location.origin);
    const isRecommendation = ["/api/recommend/options", "/api/recommend/seeds"].includes(parsed.pathname);
    const response = await originalFetch(...args);
    if (!isRecommendation || state.ready.length >= state.expectedCount) return response;
    let body = {};
    try { body = await response.clone().json(); } catch {}
    let requestBody = {};
    try { requestBody = JSON.parse(args[1]?.body || "{}"); } catch {}
    const index = state.ready.length;
    state.routePayloads.push({
      index,
      path: parsed.pathname,
      method: String(args[1]?.method || "GET").toUpperCase(),
      status: response.status,
      filters: parsed.pathname.endsWith("/options")
        ? (parsed.searchParams.get("filters") || "").split(",").filter(Boolean)
        : Array.isArray(requestBody.filters) ? requestBody.filters : [],
      types: parsed.pathname.endsWith("/options")
        ? (parsed.searchParams.get("types") || "").split(",").filter(Boolean)
        : Array.isArray(requestBody.contentTypes) ? requestBody.contentTypes : [],
      titles: Array.isArray(requestBody.titles) ? requestBody.titles : [],
      requestIdPresent: parsed.searchParams.has("requestId") || typeof requestBody.requestId === "string",
      providerId: body.providerId || null,
      source: body.source || null,
      fallbackUsed: Boolean(body.fallbackUsed),
      resultCount: Array.isArray(body.results) ? body.results.length : 0,
      requestsUsed: Number(body.diagnostics?.requestsUsed || body.recommendationDebug?.requestsUsed || 0),
    });
    state.ready.push(index);
    await new Promise((resolvePromise) => { state.resolvers[index] = resolvePromise; });
    state.released.push(index);
    return response;
  };
  return true;
}

function responseControlState() {
  const state = window.__myottQaResponseControl;
  if (!state) return null;
  return {
    expectedCount: state.expectedCount,
    ready: [...state.ready],
    released: [...state.released],
    routePayloads: state.routePayloads.map((item) => ({ ...item })),
  };
}

async function firstPicksReadinessRequest() {
  const response = await fetch("/api/recommend/first-picks", { cache: "no-store" });
  let body = {};
  try { body = await response.json(); } catch {}
  return {
    status: response.status,
    providerId: body.providerId || null,
    source: body.source || null,
    fallbackUsed: Boolean(body.fallbackUsed),
    results: Array.isArray(body.results)
      ? body.results.map((item) => ({
          providerId: item.providerId || null,
          providerContentId: item.providerContentId || null,
          title: item.title || "",
        }))
      : [],
  };
}

function releaseControlledResponse(index) {
  const state = window.__myottQaResponseControl;
  const resolver = state?.resolvers?.[index];
  if (typeof resolver !== "function") return false;
  state.resolvers[index] = null;
  resolver();
  return true;
}

function submitFormDirectly() {
  const form = document.querySelector("#recommendationForm");
  if (!(form instanceof HTMLFormElement)) return false;
  form.requestSubmit();
  return true;
}

function animationFrames() {
  return new Promise((resolvePromise) => requestAnimationFrame(() => requestAnimationFrame(resolvePromise)));
}

function sanitizeNetworkUrl(value, origin) {
  try {
    const parsed = new URL(value);
    const expected = new URL(origin);
    const local = ["data:", "blob:"].includes(parsed.protocol)
      || (parsed.hostname === expected.hostname && parsed.port === expected.port && ["http:", "ws:"].includes(parsed.protocol));
    const safeParams = {};
    if (parsed.origin === origin) {
      for (const key of ["filters", "types", "qa"]) {
        if (parsed.searchParams.has(key)) safeParams[key] = parsed.searchParams.get(key);
      }
      if (parsed.searchParams.has("requestId")) safeParams.requestId = "[PRESENT]";
      if (parsed.searchParams.has("excludeContentIdentities")) safeParams.excludeContentIdentities = "[PRESENT]";
    }
    return { origin: parsed.origin, path: parsed.pathname, protocol: parsed.protocol, local, params: safeParams };
  } catch {
    return { origin: "", path: "", protocol: "unknown", local: false, params: {} };
  }
}

export function assignImmutableRequestOwner(ownerMap, requestId, activeCaseId) {
  if (!requestId) return null;
  if (!ownerMap.has(requestId)) ownerMap.set(requestId, activeCaseId || null);
  return ownerMap.get(requestId);
}

export function desiredSelectionTransition(current, desired) {
  return {
    before: Boolean(current),
    desired: Boolean(desired),
    clickCount: Boolean(current) === Boolean(desired) ? 0 : 1,
    after: Boolean(desired),
  };
}

export function selectVisibleSubmitCandidate(candidates) {
  return candidates.find((candidate) => candidate.accessibleName === "내 취향으로 추천받기"
    && candidate.visible && !candidate.disabled) || null;
}

function relevantLocalProductRequest(safe, method) {
  return safe.local && safe.protocol === "http:" && ["GET", "POST"].includes(String(method).toUpperCase())
    && (safe.path === "/" || safe.path.startsWith("/api/"));
}

export function evaluateBaselineState(state) {
  const selectedTypes = new Set((state.checked || []).filter((item) => item.name === "contentType").map((item) => item.value));
  const selectedOther = (state.checked || []).filter((item) => item.name !== "contentType");
  const pass = ["movie", "drama", "animation"].every((value) => selectedTypes.has(value))
    && selectedTypes.size === 3
    && selectedOther.length === 0
    && state.inputValue === ""
    && state.resultCount === 0
    && !state.dirtyVisible
    && !state.appliedVisible;
  return { pass, selectedTypes: [...selectedTypes], selectedOtherCount: selectedOther.length };
}

function caseExpected(scenarioId) {
  if (scenarioId === "S1") return { routeCount: 0 };
  if (scenarioId === "S2") return { routeCount: 1, path: "/api/recommend/options", filters: ["netflix"], types: [] };
  if (scenarioId === "S3") return { routeCount: 1, path: "/api/recommend/options", filters: ["country-jp", "genre-sf"], types: ["drama"] };
  if (scenarioId === "S4") return { routeCount: 1, path: "/api/recommend/options", filters: ["country-jp", "genre-horror"], types: ["drama"] };
  if (scenarioId === "S5") return { routeCount: 1, path: "/api/recommend/seeds", filters: [], types: [], titles: ["인터스텔라"] };
  if (scenarioId === "S6") return { routeCount: 2, path: "/api/recommend/options", finalTypes: ["drama"] };
  throw new HarnessError("UNKNOWN_SCENARIO", scenarioId);
}

export function evaluateCaseEvidence(caseEvidence) {
  const expected = caseExpected(caseEvidence.scenarioId);
  const failures = [];
  if (caseEvidence.consoleErrors.length) failures.push("console-errors");
  if (caseEvidence.pageErrors.length) failures.push("page-errors");
  if (caseEvidence.owningCaseErrors.length) failures.push("local-product-errors");
  if (caseEvidence.externalNetworkCount) failures.push("external-network");
  if (!caseEvidence.baseline?.pass) failures.push("baseline-state");
  if (caseEvidence.finalState.horizontalOverflow) failures.push("horizontal-overflow");
  if (caseEvidence.routes.length !== expected.routeCount) failures.push("route-count");
  if (expected.path && caseEvidence.routes.some((route) => route.path !== expected.path)) failures.push("route-path");
  if (caseEvidence.routes.some((route) => route.status !== 200)) failures.push("route-status");
  if (caseEvidence.routes.some((route) => route.providerId !== "mock" || route.requestsUsed !== 0)) failures.push("provider-network-contract");
  if (caseEvidence.routes.some((route) => !route.requestIdPresent)) failures.push("request-id");
  if (caseEvidence.routes.some((route) => route.method !== (route.path.endsWith("/seeds") ? "POST" : "GET"))) failures.push("route-method");
  if (caseEvidence.scenarioId !== "S1" && !caseEvidence.submitControl?.visible) failures.push("visible-submit-control");
  if (caseEvidence.scenarioId !== "S1" && caseEvidence.viewport.id === "mobile" && !caseEvidence.submitControl?.mobileSticky) failures.push("mobile-submit-control");
  if (expected.filters && !expected.filters.every((value) => caseEvidence.routes[0]?.filters.includes(value))) failures.push("serialized-filters");
  if (expected.types && !expected.types.every((value) => caseEvidence.routes[0]?.types.includes(value))) failures.push("serialized-types");
  if (expected.titles && !expected.titles.every((value) => caseEvidence.routes[0]?.titles.includes(value))) failures.push("serialized-titles");
  if (caseEvidence.scenarioId !== "S1" && !caseEvidence.loadingObserved) failures.push("loading-not-observed");
  if (caseEvidence.scenarioId === "S1") {
    const defaults = new Set((caseEvidence.finalState.checked || []).filter((item) => item.name === "contentType").map((item) => item.value));
    if (caseEvidence.finalState.recommendDisabled || caseEvidence.finalState.resultCount !== 0 || !caseEvidence.finalState.emptyVisible
      || !["movie", "drama", "animation"].every((value) => defaults.has(value))) failures.push("default-state");
  }
  if (["S2", "S3", "S4", "S6"].includes(caseEvidence.scenarioId) && !caseEvidence.finalState.appliedVisible) failures.push("submitted-state");
  if (["S2", "S3", "S4", "S6"].includes(caseEvidence.scenarioId)
    && caseEvidence.finalState.resultCount === 0 && !caseEvidence.finalState.emptyVisible) failures.push("result-or-empty-state");
  if (caseEvidence.scenarioId === "S5" && (!caseEvidence.dirtyObserved || !caseEvidence.resetObserved)) failures.push("draft-reset-state");
  if (caseEvidence.scenarioId === "S6" && (!caseEvidence.latestRequestWins || !caseEvidence.routes[1]?.types.includes("drama"))) failures.push("latest-request-wins");
  return { pass: failures.length === 0, failures };
}

export function detectKnownBadControl(caseEvidence) {
  const knownBad = structuredClone(caseEvidence);
  if (!knownBad.routes.length) knownBad.routes.push({ path: "/api/recommend/options", status: 500, providerId: "mock", requestsUsed: 0, filters: [], types: [] });
  else knownBad.routes[0].status = 500;
  const result = evaluateCaseEvidence(knownBad);
  return { detected: !result.pass && result.failures.includes("route-status"), failures: result.failures };
}

async function click(page, selector) {
  const result = await evalValue(page, callExpression(clickSelector, selector));
  if (!result?.clicked) throw new HarnessError("UI_CLICK_FAILED", `${selector}: ${result?.reason || "unknown"}`);
  await evalValue(page, callExpression(animationFrames));
  return result;
}

async function clickVisibleSubmit(page) {
  const control = await evalValue(page, callExpression(visibleSubmitControl));
  if (!control) throw new HarnessError("VISIBLE_SUBMIT_NOT_FOUND", "No actionable submit named 내 취향으로 추천받기 was found.");
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: control.x, y: control.y });
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: control.x, y: control.y, button: "left", clickCount: 1 });
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: control.x, y: control.y, button: "left", clickCount: 1 });
  await evalValue(page, callExpression(animationFrames));
  return control;
}

async function input(page, selector, value) {
  const result = await evalValue(page, callExpression(setInputValue, { selector, value }));
  if (!result) throw new HarnessError("UI_INPUT_FAILED", selector);
  await evalValue(page, callExpression(animationFrames));
}

async function openConditions(page) {
  const panelVisible = await evalValue(page, `(() => {
    const element = document.querySelector(".condition-panel");
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  })()`);
  if (panelVisible) return false;
  await click(page, ".condition-summary");
  await waitFor(() => evalValue(page, `document.querySelector(".condition-shell")?.classList.contains("is-open")`), {
    description: "condition panel",
  });
  return true;
}

async function chooseCheckbox(page, name, value, desired = true) {
  const selector = `input[name="${name}"][value="${value}"]`;
  const result = await evalValue(page, callExpression(setCheckboxDesired, { selector, desired }));
  if (!result?.pass) throw new HarnessError("UI_STATE_CONTROL_FAILED", `${name}:${value} desired=${desired}: ${result?.reason || "mismatch"}`);
  const expectedClicks = desiredSelectionTransition(result.before, desired).clickCount;
  if (result.clickCount !== expectedClicks || result.after !== desired) {
    throw new HarnessError("UI_STATE_CONTROL_NON_IDEMPOTENT", `${name}:${value} desired=${desired}`);
  }
  await evalValue(page, callExpression(animationFrames));
  return result;
}

async function chooseQuickPick(page, value, searchText) {
  await input(page, '.option-search-field input[type="text"]', searchText);
  const selector = `input[name="quickPick"][value="${value}"]`;
  await waitFor(() => evalValue(page, `Boolean(document.querySelector(${JSON.stringify(selector)}))`), {
    description: `${value} option visibility`,
  });
  await chooseCheckbox(page, "quickPick", value);
  await input(page, '.option-search-field input[type="text"]', "");
}

async function configureOptions(page, { ott = [], types = [], filters = [] }) {
  const modal = await openConditions(page);
  for (const value of ott) await chooseCheckbox(page, "ott", value);
  if (types.length) {
    for (const value of ["movie", "drama", "animation"]) {
      await chooseCheckbox(page, "contentType", value, types.includes(value));
    }
  }
  if (filters.length) {
    await click(page, "#quickPickButton");
    await waitFor(() => evalValue(page, `Boolean(document.querySelector("#quickPickOverlay"))`), { description: "quick pick" });
    const labels = { "country-jp": "일본", "genre-sf": "SF", "genre-horror": "공포" };
    for (const value of filters) await chooseQuickPick(page, value, labels[value]);
    await click(page, '[aria-label="추천 옵션 닫기"]');
  }
  if (modal) await click(page, ".condition-done-button");
}

async function waitControlled(page, count) {
  return waitFor(
    async () => {
      const state = await evalValue(page, callExpression(responseControlState));
      return state?.ready.length >= count ? state : false;
    },
    { timeoutMs: 20_000, intervalMs: 50, description: `${count} controlled route responses` },
  );
}

async function release(page, index) {
  const result = await evalValue(page, callExpression(releaseControlledResponse, index));
  if (!result) throw new HarnessError("RESPONSE_RELEASE_FAILED", String(index));
}

async function waitRecommendationSettled(page) {
  return waitFor(
    async () => {
      const state = await evalValue(page, callExpression(domState));
      return !state.loadingVisible && state.diagnostics.Endpoint ? state : false;
    },
    { timeoutMs: 20_000, intervalMs: 50, description: "recommendation UI settlement" },
  );
}

async function submitControlled(page, expectedCount = 1) {
  await evalValue(page, callExpression(installResponseController, expectedCount));
  const submitControl = await clickVisibleSubmit(page);
  const loading = await evalValue(page, callExpression(domState));
  const control = await waitControlled(page, 1);
  await release(page, 0);
  const finalState = await waitRecommendationSettled(page);
  return { loadingObserved: loading.loadingVisible, control, finalState, submitControl };
}

function newCaseEvidence(scenarioId, viewport) {
  return {
    id: `${scenarioId}-${viewport.id}`,
    scenarioId,
    viewport: { ...viewport },
    pass: false,
    failures: [],
    loadingObserved: false,
    dirtyObserved: false,
    resetObserved: false,
    latestRequestWins: false,
    routes: [],
    submitControl: null,
    baseline: null,
    quiescence: null,
    owningCaseErrors: [],
    finalState: {},
    consoleErrors: [],
    infrastructureErrors: [],
    pageErrors: [],
    network: [],
    externalNetworkCount: 0,
    screenshotPath: "",
  };
}

async function executeScenario(page, scenarioId) {
  if (scenarioId === "S1") return { finalState: await evalValue(page, callExpression(domState)), routes: [] };
  if (scenarioId === "S2") {
    await configureOptions(page, { ott: ["netflix"] });
    return submitControlled(page);
  }
  if (scenarioId === "S3") {
    await configureOptions(page, { types: ["drama"], filters: ["country-jp", "genre-sf"] });
    return submitControlled(page);
  }
  if (scenarioId === "S4") {
    await configureOptions(page, { types: ["drama"], filters: ["country-jp", "genre-horror"] });
    return submitControlled(page);
  }
  if (scenarioId === "S5") {
    await input(page, "#titleInput1", "인터스텔라");
    const result = await submitControlled(page);
    await input(page, "#titleInput1", "다른 작품");
    const dirtyState = await waitFor(
      async () => {
        const state = await evalValue(page, callExpression(domState));
        return state.dirtyVisible ? state : false;
      },
      { description: "dirty submitted state" },
    );
    await click(page, "#resetAllButton");
    const resetState = await waitFor(
      async () => {
        const state = await evalValue(page, callExpression(domState));
        return !state.dirtyVisible && state.resultCount === 0 && !state.diagnostics.Endpoint && state.inputValue === "" ? state : false;
      },
      { description: "reset state" },
    );
    return { ...result, dirtyObserved: dirtyState.dirtyVisible, resetObserved: true, finalState: resetState };
  }
  if (scenarioId === "S6") {
    await configureOptions(page, { ott: ["netflix"], types: ["movie"] });
    await evalValue(page, callExpression(installResponseController, 2));
    const submitControl = await clickVisibleSubmit(page);
    const firstLoading = await evalValue(page, callExpression(domState));
    await waitControlled(page, 1);
    const modal = await openConditions(page);
    for (const value of ["movie", "drama", "animation"]) {
      await chooseCheckbox(page, "contentType", value, value === "drama");
    }
    if (modal) await click(page, ".condition-done-button");
    const submitted = await evalValue(page, callExpression(submitFormDirectly));
    if (!submitted) throw new HarnessError("SECOND_SUBMIT_FAILED", "The second form submit was not dispatched.");
    const control = await waitControlled(page, 2);
    await release(page, 1);
    const secondState = await waitRecommendationSettled(page);
    await release(page, 0);
    await evalValue(page, callExpression(animationFrames));
    const finalState = await evalValue(page, callExpression(domState));
    const finalSequence = Number(finalState.diagnostics.Sequence || 0);
    return {
      loadingObserved: firstLoading.loadingVisible,
      control,
      finalState,
      submitControl,
      latestRequestWins: finalSequence === 2 && secondState.diagnostics["Content Types"]?.includes("drama") && finalState.diagnostics.Sequence === secondState.diagnostics.Sequence,
    };
  }
  throw new HarnessError("UNKNOWN_SCENARIO", scenarioId);
}

async function waitCaseQuiescence(page, eventState, caseId) {
  const requiredPaths = ["/", "/api/search", "/api/recommend/first-picks", "/api/options"];
  const result = await waitFor(() => {
    const relevant = eventState.network.filter((item) => item.relevant && item.caseId === caseId);
    const observed = new Set(relevant.map((item) => item.path));
    if (!requiredPaths.every((path) => observed.has(path))) return false;
    const pending = relevant.filter((item) => !item.completed);
    return pending.length === 0 ? { relevantRequestCount: relevant.length, pendingCount: 0, requiredPaths } : false;
  }, { timeoutMs: 15_000, intervalMs: 50, description: `${caseId} relevant Product request quiescence` });
  await evalValue(page, callExpression(animationFrames));
  return result;
}

async function runCommonReadiness({ page, eventState, origin }) {
  const caseId = "COMMON_READINESS";
  eventState.activeCase = caseId;
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.send("Page.navigate", { url: `${origin}/?qa=1&commonReadiness=1` });
  const pageState = await waitFor(
    async () => {
      const state = await evalValue(page, callExpression(domState));
      return state.ready ? state : false;
    },
    { timeoutMs: 30_000, intervalMs: 100, description: "common page readiness" },
  );
  const initialQuiescence = await waitCaseQuiescence(page, eventState, caseId);
  const response = await evalValue(page, callExpression(firstPicksReadinessRequest));
  await waitFor(() => {
    const relevant = eventState.network.filter((item) => item.relevant && item.caseId === caseId);
    return relevant.every((item) => item.completed) ? true : false;
  }, { timeoutMs: 15_000, intervalMs: 50, description: "common readiness request settlement" });
  const network = eventState.network.filter((item) => item.caseId === caseId);
  const firstPicksRequests = network.filter((item) => item.path === "/api/recommend/first-picks");
  const consoleErrors = eventState.consoleErrors.filter((item) => item.caseId === caseId);
  const pageErrors = eventState.pageErrors.filter((item) => item.caseId === caseId);
  const externalNetworkCount = network.filter((item) => item.external).length;
  const fixtureIdentity = response.results.length === 3
    && response.results.every((item) => item.providerId === "tmdb" && /^91000[1-6]$/.test(String(item.providerContentId)));
  return {
    pass: pageState.ready
      && response.status === 200
      && response.providerId === "tmdb"
      && response.source === "tmdb"
      && response.fallbackUsed === false
      && fixtureIdentity
      && firstPicksRequests.length >= 2
      && firstPicksRequests.every((item) => item.status === 200 && item.completed)
      && consoleErrors.length === 0
      && pageErrors.length === 0
      && externalNetworkCount === 0,
    pageReady: pageState.ready,
    response,
    fixtureIdentity,
    requestCount: network.filter((item) => item.relevant).length,
    firstPicksRequestCount: firstPicksRequests.length,
    firstPicksStatuses: firstPicksRequests.map((item) => item.status),
    consoleErrorCount: consoleErrors.length,
    pageErrorCount: pageErrors.length,
    externalNetworkCount,
    initialQuiescence,
  };
}

function reconcileCaseEvidence(evidence, eventState) {
  evidence.network = eventState.network.filter((item) => item.caseId === evidence.id);
  evidence.consoleErrors = eventState.consoleErrors.filter((item) => item.caseId === evidence.id);
  evidence.pageErrors = eventState.pageErrors.filter((item) => item.caseId === evidence.id);
  evidence.infrastructureErrors = eventState.infrastructureErrors.filter((item) => item.caseId === evidence.id);
  evidence.owningCaseErrors = evidence.network
    .filter((item) => item.relevant && (item.failed || Number(item.status || 0) >= 400))
    .map((item) => ({ requestId: item.requestId, path: item.path, status: item.status, failed: item.failed, errorText: item.errorText || "" }));
  evidence.externalNetworkCount = evidence.network.filter((item) => item.external).length;
  const evaluation = evaluateCaseEvidence(evidence);
  evidence.pass = evaluation.pass;
  evidence.failures = evaluation.failures;
  return evidence;
}

async function runCase({ page, scenario, viewport, origin, evidenceDirectory, eventState }) {
  const evidence = newCaseEvidence(scenario.id, viewport);
  eventState.activeCase = evidence.id;
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.id === "mobile",
  });
  await page.send("Page.navigate", { url: `${origin}/?qa=1&browserCase=${scenario.id}-${viewport.id}` });
  await waitFor(
    async () => {
      const state = await evalValue(page, callExpression(domState));
      return state.ready && state.viewport.width === viewport.width ? state : false;
    },
    { timeoutMs: 30_000, intervalMs: 100, description: `${evidence.id} page readiness` },
  );
  evidence.baseline = evaluateBaselineState(await evalValue(page, callExpression(domState)));
  const outcome = await executeScenario(page, scenario.id);
  const control = await evalValue(page, callExpression(responseControlState));
  evidence.loadingObserved = Boolean(outcome.loadingObserved);
  evidence.dirtyObserved = Boolean(outcome.dirtyObserved);
  evidence.resetObserved = Boolean(outcome.resetObserved);
  evidence.latestRequestWins = Boolean(outcome.latestRequestWins);
  evidence.routes = control?.routePayloads || outcome.routes || [];
  evidence.submitControl = outcome.submitControl || null;
  evidence.finalState = outcome.finalState;
  evidence.quiescence = await waitCaseQuiescence(page, eventState, evidence.id);
  const screenshot = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, 20_000);
  evidence.screenshotPath = join(evidenceDirectory, `${evidence.id}.png`);
  writeFileSync(evidence.screenshotPath, Buffer.from(screenshot.data, "base64"));
  return reconcileCaseEvidence(evidence, eventState);
}

async function launchBrowser(runtimeRoot, origin, founderPid) {
  const executable = browserExecutable();
  const profileRoot = join(runtimeRoot, "browser-profile");
  mkdirSync(profileRoot, { recursive: true });
  const stdoutFd = openSync(join(runtimeRoot, "browser.stdout.log"), "a");
  const stderrFd = openSync(join(runtimeRoot, "browser.stderr.log"), "a");
  const browserProcess = spawn(executable, [
    "--headless=new",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileRoot}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-mode",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--disable-features=Translate,OptimizationHints,MediaRouter",
    "--metrics-recording-only",
    "--safebrowsing-disable-auto-update",
    "--host-resolver-rules=MAP * 0.0.0.0, EXCLUDE 127.0.0.1",
    "about:blank",
  ], { cwd: runtimeRoot, detached: false, windowsHide: true, stdio: ["ignore", stdoutFd, stderrFd] });
  closeSync(stdoutFd);
  closeSync(stderrFd);
  let browser = null;
  let page = null;
  try {
    const activePortPath = join(profileRoot, "DevToolsActivePort");
    const devTools = await waitFor(() => {
      if (browserProcess.exitCode !== null) throw new HarnessError("BROWSER_EXITED", `Browser exit ${browserProcess.exitCode}.`);
      if (!existsSync(activePortPath)) return false;
      const [portLine, path] = readFileSync(activePortPath, "utf8").trim().split(/\r?\n/);
      const port = Number(portLine);
      return Number.isInteger(port) && path ? { port, path } : false;
    }, { timeoutMs: 12_000, intervalMs: 100, description: "browser DevTools endpoint" });
    const debugPid = await waitFor(() => listenerPid(devTools.port) || false, { timeoutMs: 5_000, description: "browser debug listener" });
    assertOwnedPid(browserProcess.pid, debugPid);
    browser = await new CdpConnection(`ws://127.0.0.1:${devTools.port}${devTools.path}`).open();
    const target = await browser.send("Target.createTarget", { url: "about:blank" });
    const descriptor = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${devTools.port}/json/list`, { signal: AbortSignal.timeout(2_000) });
      const targets = await response.json();
      return targets.find((item) => item.id === target.targetId && item.webSocketDebuggerUrl) || false;
    }, { timeoutMs: 10_000, description: "browser page target" });
    page = await new CdpConnection(descriptor.webSocketDebuggerUrl).open();
    const eventState = {
      activeCase: null,
      network: [],
      consoleErrors: [],
      pageErrors: [],
      infrastructureErrors: [],
      unownedErrors: [],
      requests: new Map(),
      requestOwners: new Map(),
    };
    page.onEvent((event) => {
      if (event.method === "Network.requestWillBeSent") {
        const safe = sanitizeNetworkUrl(event.params?.request?.url || "", origin);
        const requestId = event.params?.requestId || null;
        const method = event.params?.request?.method || null;
        const relevant = relevantLocalProductRequest(safe, method);
        const caseId = relevant
          ? assignImmutableRequestOwner(eventState.requestOwners, requestId, eventState.activeCase)
          : eventState.activeCase;
        const item = {
          caseId,
          requestId,
          method,
          relevant,
          completed: false,
          errorText: "",
          ...safe,
          external: ["http:", "https:", "ws:", "wss:"].includes(safe.protocol) && !safe.local,
          status: null,
          failed: false,
        };
        eventState.requests.set(item.requestId, item);
        eventState.network.push(item);
      } else if (event.method === "Network.responseReceived") {
        const item = eventState.requests.get(event.params?.requestId);
        if (item) item.status = event.params?.response?.status || null;
      } else if (event.method === "Network.loadingFinished") {
        const item = eventState.requests.get(event.params?.requestId);
        if (item) item.completed = true;
      } else if (event.method === "Network.loadingFailed") {
        const item = eventState.requests.get(event.params?.requestId);
        if (item) {
          item.failed = true;
          item.completed = true;
          item.errorText = String(event.params?.errorText || "").slice(0, 300);
        }
      } else if (event.method === "Network.webSocketCreated") {
        const safe = sanitizeNetworkUrl(event.params?.url || "", origin);
        eventState.network.push({
          caseId: eventState.activeCase,
          requestId: event.params?.requestId || null,
          method: "WEBSOCKET",
          relevant: false,
          completed: false,
          errorText: "",
          ...safe,
          external: ["ws:", "wss:"].includes(safe.protocol) && !safe.local,
          status: null,
          failed: false,
        });
      } else if (event.method === "Runtime.exceptionThrown") {
        eventState.pageErrors.push({ caseId: eventState.activeCase, type: "runtime-exception" });
      } else if (event.method === "Runtime.consoleAPICalled" && event.params?.type === "error") {
        eventState.consoleErrors.push({ caseId: eventState.activeCase, type: "console-error" });
      } else if (event.method === "Log.entryAdded" && event.params?.entry?.level === "error") {
        const entry = event.params.entry;
        const networkRequestId = entry.networkRequestId || null;
        const request = networkRequestId ? eventState.requests.get(networkRequestId) : null;
        const errorEvidence = {
          caseId: request?.caseId ?? eventState.activeCase,
          type: "log-error",
          source: entry.source || "",
          networkRequestId,
          url: sanitizeNetworkUrl(entry.url || "", origin),
          text: String(entry.text || "").slice(0, 300),
        };
        if (request?.relevant) eventState.consoleErrors.push(errorEvidence);
        else if (request) eventState.infrastructureErrors.push(errorEvidence);
        else eventState.unownedErrors.push(errorEvidence);
      }
    });
    await page.send("Runtime.enable");
    await page.send("Page.enable");
    await page.send("Log.enable");
    await page.send("Network.enable");
    return { executable, profileRoot, browserProcess, debugPid, browser, page, eventState, founderPid };
  } catch (error) {
    page?.close();
    browser?.close();
    await terminateOwnedTree(browserProcess.pid, [founderPid]);
    throw error;
  }
}

function finalCounts(cases) {
  const result = { generated: 18, executed: cases.length, asserted: cases.length, pass: 0, fail: 0, skipped: 0, blocked: 0, notRun: 18 - cases.length };
  for (const item of cases) item.pass ? result.pass++ : result.fail++;
  return result;
}

async function run() {
  const startedAt = new Date().toISOString();
  const evidenceDirectory = join(tmpdir(), "myott-recommendation-browser-representative-v1", startedAt.replace(/[-:.]/g, ""));
  const runtimeRoot = mkdtempSync(join(tmpdir(), "myott-browser-runtime-v1-"));
  const appRoot = join(runtimeRoot, "app");
  mkdirSync(evidenceDirectory, { recursive: true });
  const summary = {
    task: "MYOTT_RECOMMENDATION_BROWSER_REPRESENTATIVE_AUTOMATION_V1",
    startedAt,
    exactBaseSha: EXACT_BASE_SHA,
    branch: EXPECTED_BRANCH,
    runtimeRecoveryStrategyUsed: "A2_OFFLINE_RESOLVED_RUNTIME_MATERIALIZATION",
    productStartAttemptsUsed: 1,
    nextRuntime: null,
    repository: null,
    browserExecutionSurface: "existing local Chrome + Node 24 native CDP WebSocket",
    qaServer: {
      port: null,
      origin: "",
      launcherPid: null,
      listenerPid: null,
      owner: "task-owned exact process tree",
      sourceSha: EXACT_BASE_SHA,
      command: "",
      stdoutEvidencePath: join(evidenceDirectory, "server.stdout.log"),
      stderrEvidencePath: join(evidenceDirectory, "server.stderr.log"),
    },
    founderPreview: { initialPid: listenerPid(FOUNDER_PORT), finalPid: null, mutated: false },
    browser: { executable: "", launcherPid: null, debugPid: null, profileRoot: "", personalProfileAccess: 0 },
    commonReadiness: null,
    cases: [],
    counts: null,
    knownBadControl: null,
    infrastructureErrors: [],
    unownedErrors: [],
    network: { browserExternal: 0, productServerProvider: 0, thirdParty: 0 },
    cleanup: { browserStopped: [], serverStopped: [], portClosed: false, profileRemoved: false, runtimeRemoved: false, taskOwnedListeners: 0 },
    packageLockChange: 0,
    evidenceManifestPath: join(evidenceDirectory, "coverage-manifest.json"),
    pass: false,
    failure: null,
  };
  let serverProcess = null;
  let browserRuntime = null;
  let junction = null;
  const packageBefore = sha256File(join(REPOSITORY_ROOT, "package.json"));
  const lockBefore = sha256File(join(REPOSITORY_ROOT, "pnpm-lock.yaml"));
  try {
    summary.repository = repositoryPreflight();
    mkdirSync(appRoot, { recursive: true });
    copySnapshot(REPOSITORY_ROOT, appRoot);
    const dependency = resolveDependencyRoot();
    summary.nextRuntime = {
      realpath: dependency.nextPackage,
      version: dependency.version,
      packageSha256: dependency.packageSha256,
      packageMutation: null,
    };
    junction = join(appRoot, "node_modules");
    symlinkSync(dependency.root, junction, "junction");
    if (!lstatSync(junction).isSymbolicLink()) throw new HarnessError("JUNCTION_FAILED", "node_modules Junction was not created.");
    const port = await choosePort();
    const origin = `http://127.0.0.1:${port}`;
    summary.qaServer.port = port;
    summary.qaServer.origin = origin;
    const stdoutFd = openSync(join(runtimeRoot, "server.stdout.log"), "a");
    const stderrFd = openSync(join(runtimeRoot, "server.stderr.log"), "a");
    const serverArgs = [dependency.nextBin, "dev", appRoot, "--hostname", "127.0.0.1", "--port", String(port)];
    summary.qaServer.command = [process.execPath, ...serverArgs].map((part) => JSON.stringify(part)).join(" ");
    serverProcess = spawn(process.execPath, serverArgs, {
      cwd: appRoot,
      detached: false,
      windowsHide: true,
      stdio: ["ignore", stdoutFd, stderrFd],
      env: {
        ...process.env,
        TMDB_API_KEY: "",
        TMDB_BEARER_TOKEN: "",
        MYOTT_BROWSER_QA_FIRST_PICKS_FIXTURE: FIRST_PICKS_QA_BINDING,
        NEXT_TELEMETRY_DISABLED: "1",
        NO_PROXY: "*",
        no_proxy: "*",
      },
    });
    closeSync(stdoutFd);
    closeSync(stderrFd);
    summary.qaServer.launcherPid = serverProcess.pid;
    summary.qaServer.listenerPid = await waitFor(async () => {
      if (serverProcess.exitCode !== null) throw new HarnessError("SERVER_EXITED", `QA server exit ${serverProcess.exitCode}.`);
      const pid = listenerPid(port);
      if (!pid) return false;
      return (await localHttpStatus(origin)) === 200 ? pid : false;
    }, { timeoutMs: 60_000, intervalMs: 250, description: "QA server readiness" });
    assertOwnedPid(serverProcess.pid, summary.qaServer.listenerPid);
    browserRuntime = await launchBrowser(runtimeRoot, origin, summary.founderPreview.initialPid);
    summary.browser = {
      executable: browserRuntime.executable,
      launcherPid: browserRuntime.browserProcess.pid,
      debugPid: browserRuntime.debugPid,
      profileRoot: browserRuntime.profileRoot,
      personalProfileAccess: 0,
    };
    summary.commonReadiness = await runCommonReadiness({
      page: browserRuntime.page,
      eventState: browserRuntime.eventState,
      origin,
    });
    if (!summary.commonReadiness.pass) {
      throw new HarnessError("COMMON_READINESS_FAILED", JSON.stringify(summary.commonReadiness));
    }
    for (const viewport of VIEWPORTS) {
      for (const scenario of SCENARIOS) {
        const caseEvidence = await runCase({
          page: browserRuntime.page,
          scenario,
          viewport,
          origin,
          evidenceDirectory,
          eventState: browserRuntime.eventState,
        });
        summary.cases.push(caseEvidence);
      }
    }
    summary.cases = summary.cases.map((item) => reconcileCaseEvidence(item, browserRuntime.eventState));
    summary.counts = finalCounts(summary.cases);
    summary.knownBadControl = detectKnownBadControl(summary.cases.find((item) => item.scenarioId === "S2"));
    summary.infrastructureErrors = browserRuntime.eventState.infrastructureErrors;
    summary.unownedErrors = browserRuntime.eventState.unownedErrors;
    summary.network.browserExternal = browserRuntime.eventState.network.filter((item) => item.external).length;
    summary.network.thirdParty = summary.network.browserExternal;
    summary.network.productServerProvider = summary.cases.some((item) => item.routes.some((route) => route.providerId !== "mock" || route.requestsUsed !== 0)) ? 1 : 0;
    summary.pass = summary.counts.pass === 18
      && summary.counts.fail === 0
      && summary.knownBadControl.detected
      && summary.unownedErrors.length === 0
      && Object.values(summary.network).every((value) => value === 0);
  } catch (error) {
    summary.failure = { code: error?.code || "HARNESS_FAILURE", message: safeError(error) };
  } finally {
    try {
      if (browserRuntime) {
        try { await browserRuntime.browser.send("Browser.close", {}, 2_000); } catch {}
        browserRuntime.page.close();
        browserRuntime.browser.close();
        summary.cleanup.browserStopped = await terminateOwnedTree(browserRuntime.browserProcess.pid, [summary.founderPreview.initialPid]);
      }
    } catch (error) {
      summary.pass = false;
      summary.failure ||= { code: "BROWSER_CLEANUP_FAILED", message: safeError(error) };
    }
    try {
      if (serverProcess) summary.cleanup.serverStopped = await terminateOwnedTree(serverProcess.pid, [summary.founderPreview.initialPid]);
      if (summary.qaServer.port) {
        await waitFor(() => !listenerPid(summary.qaServer.port), { timeoutMs: 8_000, description: "QA port closure" });
        summary.cleanup.portClosed = true;
      }
    } catch (error) {
      summary.pass = false;
      summary.failure ||= { code: "SERVER_CLEANUP_FAILED", message: safeError(error) };
    }
    for (const stream of ["stdout", "stderr"]) {
      const runtimeLog = join(runtimeRoot, `server.${stream}.log`);
      const evidenceLog = summary.qaServer[`${stream}EvidencePath`];
      if (existsSync(runtimeLog)) writeFileSync(evidenceLog, readFileSync(runtimeLog));
    }
    summary.founderPreview.finalPid = listenerPid(FOUNDER_PORT);
    summary.founderPreview.mutated = summary.founderPreview.initialPid !== summary.founderPreview.finalPid;
    if (junction && existsSync(junction)) unlinkSync(junction);
    if (existsSync(runtimeRoot)) rmSync(runtimeRoot, { recursive: true, force: true });
    summary.cleanup.profileRemoved = !browserRuntime?.profileRoot || !existsSync(browserRuntime.profileRoot);
    summary.cleanup.runtimeRemoved = !existsSync(runtimeRoot);
    summary.cleanup.taskOwnedListeners = summary.qaServer.port && listenerPid(summary.qaServer.port) ? 1 : 0;
    summary.packageLockChange = packageBefore === sha256File(join(REPOSITORY_ROOT, "package.json")) && lockBefore === sha256File(join(REPOSITORY_ROOT, "pnpm-lock.yaml")) ? 0 : 1;
    if (summary.nextRuntime) {
      summary.nextRuntime.packageMutation = summary.nextRuntime.packageSha256 === sha256File(summary.nextRuntime.realpath + "\\package.json") ? 0 : 1;
    }
    if (summary.founderPreview.mutated || summary.cleanup.taskOwnedListeners || !summary.cleanup.profileRemoved || !summary.cleanup.runtimeRemoved || summary.packageLockChange || summary.nextRuntime?.packageMutation) summary.pass = false;
    summary.endedAt = new Date().toISOString();
    summary.counts ||= finalCounts(summary.cases);
    writeFileSync(summary.evidenceManifestPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    summary.evidenceManifestSha256 = sha256File(summary.evidenceManifestPath);
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH);
if (isMain) {
  const summary = await run();
  process.exitCode = summary.pass ? 0 : 1;
}
