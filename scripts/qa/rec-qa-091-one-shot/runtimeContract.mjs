import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const MODULE_ROOT = dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = resolve(MODULE_ROOT, "../../..");
export const ONE_SHOT_ROOT = MODULE_ROOT;
export const BASE_COMMIT = "f38b746416a13c3b2bbcac4396fee08b7c1160ea";
export const PACKAGE_JSON_SHA256 = "6322c73d9b444fb756cb4107cb03c10e39e966cbd7cd4d2eb0f2a8643e4ce800";
export const PNPM_LOCK_SHA256 = "288c70c3c4f6510d295a2dac4a534b1c6c2b3264457821761c2fad95f55c4cd3";
export const NODE_EXECUTABLE = "C:\\Program Files\\nodejs\\node.exe";
export const NODE_VERSION = "v24.18.0";
export const NODE_SHA256 = "9a4eb5f1c29c6a2e93852ead46b999e284a6a5ca8bab4d4e241d587d025a52de";
export const TMDB_HOST = "api.themoviedb.org";
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const EVIDENCE_PURPOSE = "REC_QA_091_ONE_SHOT_SOURCE_IMPLEMENTATION_V1";
export const FIXED_INPUT = deepFreeze({
  country: "us",
  semanticGenre: "horror",
  contentType: "drama",
  providerMediaType: "tv",
  limit: 12,
});
export const REQUEST_BUDGET = deepFreeze({ total: 24, list: 8, detail: 16, aggregate: 72, concurrency: 4, retry: 0 });
export const MAX_REDIRECT_HOPS = 3;
export const GOVERNANCE_BOUNDARY = "FIRST_ACTUAL_OUTBOUND_TMDB_REQUEST";
export const GOVERNANCE_AUTHORITY = "FOUNDER_HQ_EXTERNAL_GOVERNANCE";
export const TECHNICAL_PERSISTENCE_SCOPE = "CURRENT_INTEGRATED_RUN_ONLY";

export const PRODUCT_SOURCE_ROOTS = Object.freeze([
  ["one-shot-runner", "scripts/qa/rec-qa-091-one-shot/run-rec-qa-091-one-shot.mjs"],
  ["runtime-contract", "scripts/qa/rec-qa-091-one-shot/runtimeContract.mjs"],
  ["network-policy", "scripts/qa/rec-qa-091-one-shot/networkPolicy.mjs"],
  ["request-lifecycle", "scripts/qa/rec-qa-091-one-shot/requestLifecycle.mjs"],
  ["evidence-assembler", "scripts/qa/rec-qa-091-one-shot/evidenceAssembler.mjs"],
  ["offline-validator", "scripts/qa/rec-qa-091-one-shot/offlineValidator.mjs"],
  ["deterministic-fixtures", "scripts/qa/rec-qa-091-one-shot/deterministicFixtures.mjs"],
  ["one-shot-tests", "scripts/qa/rec-qa-091-one-shot/one-shot.test.mjs"],
  ["product-binding", "lib/tmdb.js"],
  ["product-request-context", "src/lib/providers/tmdb/requestContext.js"],
  ["product-observability", "src/lib/recommendation/qa/tmdbObservability.js"],
  ["correction-7-writer", "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs"],
]);

export const FORBIDDEN_EXEC_ARGV = Object.freeze([
  "--require",
  "--import",
  "--loader",
  "--experimental-loader",
  "--inspect",
  "--inspect-brk",
  "--inspect-port",
  "--openssl-legacy-provider",
]);

export const FORBIDDEN_ENVIRONMENT_KEYS = Object.freeze([
  "NODE_OPTIONS",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "NODE_EXTRA_CA_CERTS",
  "NODE_PATH",
  "TMDB_LANGUAGE",
  "TMDB_REGION",
]);

export const CREDENTIAL_ENVIRONMENT_KEYS = Object.freeze(["TMDB_API_KEY", "TMDB_BEARER_TOKEN"]);
export const GOVERNANCE_EXECUTION_CONTRACT_KEYS = Object.freeze([
  "governanceDecisionId",
  "executionAuthorizationId",
  "executionState",
  "integratedRunAllowance",
  "fixedInput",
  "sourcePins",
  "runtimePins",
  "requestBudget",
  "concurrency",
  "retry",
  "allowedNetworkDestination",
  "consumptionBoundary",
  "automaticRetry",
  "evidenceRoot",
  "evidenceFileStem",
  "trustAuthority",
  "authenticityTechnicallyVerified",
]);

// The runtime contract records its own hash in evidence; its expected hash is held by the external Founder/HQ pin to avoid self-reference.
export const PINNED_SOURCE_PINS = Object.freeze({
  "lib/tmdb.js": { sha256: "34c18fbadb937a1f84fae2f2e9bc8c71496c4dbb347908a394bf738570a4f0a8", byteSize: 113601 },
  "scripts/qa/rec-qa-091-one-shot/deterministicFixtures.mjs": { sha256: "0ecbd9c43dd4d199be9659995bbc1ccd225c07ed661ba36dff8fbda2de4e671b", byteSize: 30318 },
  "scripts/qa/rec-qa-091-one-shot/evidenceAssembler.mjs": { sha256: "42de4fc6ae185bde392eccd19f77518151411d53bb530644a8fcba8cdc191955", byteSize: 6695 },
  "scripts/qa/rec-qa-091-one-shot/networkPolicy.mjs": { sha256: "1546fbc505be49e681d1bb04e6931fcd95f58ef45b4f3199eb1fd13e740a982c", byteSize: 13571 },
  "scripts/qa/rec-qa-091-one-shot/offlineValidator.mjs": { sha256: "5af82f9c774a3acfb74e47880bcd42e1646a7a99f8048bb7c4865e157f3a2c17", byteSize: 14663 },
  "scripts/qa/rec-qa-091-one-shot/one-shot.test.mjs": { sha256: "262b479847858c1008d15ac4f849b84f2ac76cef9961cfdc5070498b9690547d", byteSize: 12179 },
  "scripts/qa/rec-qa-091-one-shot/requestLifecycle.mjs": { sha256: "214a2dcdc6d09b577ffdac6b61f73e3e6d0ed6ac002f007151c71344b4522ecf", byteSize: 10798 },
  "scripts/qa/rec-qa-091-one-shot/run-rec-qa-091-one-shot.mjs": { sha256: "e27d2a25fc4b17587da040abb4ed6b2838555d6279186e8bd7289c0f7ac80b00", byteSize: 8680 },
  "src/lib/providers/tmdb/requestContext.js": { sha256: "4c27370df98c6e5da5a537d48065caa86e04bb36d621cf59bf6fe85dae5ad814", byteSize: 18902 },
  "src/lib/recommendation/candidates/candidatePipeline.js": { sha256: "3bd3be17d43d717c32e68009704b9cbe053436bf0849e00e41c8de184017718c", byteSize: 25259 },
  "src/lib/recommendation/content/contentIdentity.js": { sha256: "7928cb8737e5a5b2748b7d891492c24483367c9475cee2c70d65fd5e7ba68845", byteSize: 2458 },
  "src/lib/recommendation/filters/hardFilterContract.js": { sha256: "b39bb6e0e0495f0b41127d12558aaa145ffff4077402c68dfff40a5f9698068f", byteSize: 12637 },
  "src/lib/recommendation/genres/genreContract.js": { sha256: "7157468b5ef686893f90d217a6141845cd54c8552b8692e8fb6ae5022448dd90", byteSize: 30002 },
  "src/lib/recommendation/genres/semanticGenreSignals.js": { sha256: "bb4455b17dd1ad144a479a056aebcd0b59db4ab71ff69c50dca798d9e8fe22d7", byteSize: 8989 },
  "src/lib/recommendation/qa/tmdbObservability.js": { sha256: "616276ccb9723e9fa5dfae4ff4d13ce4c0f56fae55102877bf6a8f2b36dc2cde", byteSize: 40625 },
  "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs": { sha256: "230b37f05c753d8e23659160baec533cf03ce843d09ea3f14751b08af50dc1d3", byteSize: 5120 },
  "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs": { sha256: "8d5413dff1c7811214a30d15444a33cb67b46377320dd6d6ebd3fb80308dc2e3", byteSize: 13319 },
  "src/lib/recommendation/recall/recallPlanner.js": { sha256: "1166469e90428e4cbd4a3ccb5b1d6c2044c6c0e8e814e6aec17d1010f67588b7", byteSize: 15074 },
  "src/lib/recommendation/scoring/recommendationWeightEngine.js": { sha256: "12a2ac554277e0c27bc2f7bf4ee137d2c6539774ac9eb547477960e8bc71c22e", byteSize: 15447 },
  "src/lib/recommendation/scoring/recommendationWeights.js": { sha256: "53eaea208b60872ccfb1009a331829b1cc046964bf2f5c5f6c4da1ef0af19c8b", byteSize: 727 },
  "src/lib/recommendation/seeds/multiSeed.js": { sha256: "90fa7879f0109c82971ff2b56b33f42c5ec7ef0d51c8699da73f0f7c67351643", byteSize: 8323 },
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizedPath(value) {
  return resolve(String(value)).replaceAll("/", "\\").toLowerCase();
}

function relativePath(value) {
  return relative(REPOSITORY_ROOT, resolve(value)).replaceAll("\\", "/");
}

function samePath(left, right) {
  return normalizedPath(left) === normalizedPath(right);
}

export function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function hashFile(filePath) {
  const bytes = await readFile(filePath);
  return { sha256: sha256Bytes(bytes), byteSize: bytes.byteLength };
}

export function directExecutionIdentity(moduleUrl = import.meta.url, argv = process.argv) {
  const scriptPath = argv[1] ? resolve(argv[1]) : "";
  return {
    isDirect: Boolean(scriptPath) && moduleUrl === pathToFileURL(scriptPath).href,
    scriptPath,
    moduleUrl,
    argvCount: argv.length,
  };
}

export function validateInvocation({ moduleUrl = import.meta.url, argv = process.argv, expectedScriptPath } = {}) {
  const identity = directExecutionIdentity(moduleUrl, argv);
  const expected = expectedScriptPath ? normalizedPath(expectedScriptPath) : "";
  const actual = identity.scriptPath ? normalizedPath(identity.scriptPath) : "";
  return {
    ok: identity.isDirect && argv.length === 2 && (!expected || actual === expected),
    direct: identity.isDirect,
    argvCount: argv.length,
    unexpectedArgCount: Math.max(0, argv.length - 2),
    pathMatches: !expected || actual === expected,
  };
}

export function validateExecArgv(execArgv = process.execArgv) {
  const unexpected = [];
  for (const value of execArgv) {
    const flag = String(value).split("=", 1)[0];
    if (FORBIDDEN_EXEC_ARGV.includes(flag)) unexpected.push(flag);
  }
  return { ok: unexpected.length === 0, unexpectedFlags: [...new Set(unexpected)] };
}

export function environmentPresence(environment = process.env) {
  const presentForbidden = FORBIDDEN_ENVIRONMENT_KEYS.filter((key) => Object.hasOwn(environment, key));
  const credentials = Object.fromEntries(CREDENTIAL_ENVIRONMENT_KEYS.map((key) => [
    key,
    typeof environment[key] === "string" && environment[key].trim().length > 0,
  ]));
  return {
    ok: presentForbidden.length === 0,
    presentForbidden,
    credentialPresence: credentials,
    valuesRedacted: true,
  };
}

export function assertFixedInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("ONE_SHOT_FIXED_INPUT_INVALID");
  const keys = Object.keys(input).sort();
  const expectedKeys = Object.keys(FIXED_INPUT).sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new TypeError("ONE_SHOT_FIXED_INPUT_INVALID");
  }
  for (const [key, expected] of Object.entries(FIXED_INPUT)) {
    if (input[key] !== expected) throw new TypeError("ONE_SHOT_FIXED_INPUT_INVALID");
  }
  return deepFreeze({ ...input });
}

async function gitRead(args) {
  const result = await execFileAsync("git", ["-C", REPOSITORY_ROOT, ...args], { windowsHide: true, encoding: "utf8" });
  return result.stdout.trim();
}

function parseStatusLine(line) {
  const statusCode = line.slice(0, 2);
  const filePath = line.slice(3).replaceAll("\\", "/");
  return { statusCode, path: filePath };
}

export async function collectRepositoryPins() {
  const [branch, head, originMain, statusOutput, packagePin, lockPin] = await Promise.all([
    gitRead(["branch", "--show-current"]),
    gitRead(["rev-parse", "HEAD"]),
    gitRead(["rev-parse", "origin/main"]),
    gitRead(["status", "--short", "--untracked-files=all"]),
    hashFile(resolve(REPOSITORY_ROOT, "package.json")),
    hashFile(resolve(REPOSITORY_ROOT, "pnpm-lock.yaml")),
  ]);
  const status = statusOutput ? statusOutput.split(/\r?\n/).filter(Boolean).map(parseStatusLine) : [];
  return {
    root: REPOSITORY_ROOT,
    branch,
    head,
    originMain,
    packageJson: packagePin,
    pnpmLock: lockPin,
    status,
    dirtyPathClassification: status.map(({ statusCode, path }) => `${statusCode} ${path}`).sort(),
  };
}

export function validateRepositoryPins(actual, expected = {}) {
  const violations = [];
  if (expected.branch && actual.branch !== expected.branch) violations.push("REPOSITORY_BRANCH_MISMATCH");
  if (expected.head && actual.head !== expected.head) violations.push("REPOSITORY_HEAD_MISMATCH");
  if (expected.originMain && actual.originMain !== expected.originMain) violations.push("REPOSITORY_ORIGIN_MISMATCH");
  if (expected.packageJsonSHA256 && actual.packageJson.sha256 !== expected.packageJsonSHA256) violations.push("PACKAGE_JSON_PIN_MISMATCH");
  if (expected.pnpmLockSHA256 && actual.pnpmLock.sha256 !== expected.pnpmLockSHA256) violations.push("PNPM_LOCK_PIN_MISMATCH");
  if (expected.dirtyPathClassification) {
    const left = JSON.stringify([...actual.dirtyPathClassification].sort());
    const right = JSON.stringify([...expected.dirtyPathClassification].sort());
    if (left !== right) violations.push("WORKING_TREE_CLASSIFICATION_MISMATCH");
  }
  return { ok: violations.length === 0, violations };
}

function importSpecifiers(source) {
  const result = [];
  const patterns = [
    /\bimport\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[^"']*?\s+from\s+["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) result.push(match[1]);
  }
  return [...new Set(result)];
}

async function resolveLocalImport(fromPath, specifier) {
  const base = resolve(dirname(fromPath), specifier);
  const candidates = [base, `${base}.js`, `${base}.mjs`, `${base}.cjs`, resolve(base, "index.js"), resolve(base, "index.mjs")];
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      // Continue through the supported ESM resolution candidates.
    }
  }
  return null;
}

export async function collectSourceInventory() {
  const queue = PRODUCT_SOURCE_ROOTS.map(([role, path]) => ({ role, path: resolve(REPOSITORY_ROOT, path) }));
  const records = new Map();
  const importedBy = new Map();
  const diagnostics = { missingRoots: [], unresolvedLocalImports: [], duplicatePaths: [], dynamicImports: [], nodeBuiltinImports: [], externalImports: [] };
  while (queue.length) {
    const current = queue.shift();
    const key = normalizedPath(current.path);
    if (records.has(key)) {
      records.get(key).roles.add(current.role);
      if (current.importedBy) importedBy.get(key)?.add(current.importedBy);
      continue;
    }
    let source;
    let hash;
    try {
      source = await readFile(current.path, "utf8");
      hash = await hashFile(current.path);
    } catch {
      diagnostics.missingRoots.push(relativePath(current.path));
      continue;
    }
    const record = {
      logicalName: current.role,
      relativePath: relativePath(current.path),
      roles: new Set([current.role]),
      importedBy: new Set(current.importedBy ? [current.importedBy] : []),
      sha256: hash.sha256,
      byteSize: hash.byteSize,
      mutableInScope: normalizedPath(current.path).startsWith(normalizedPath(ONE_SHOT_ROOT)),
      currentMatch: true,
    };
    records.set(key, record);
    importedBy.set(key, record.importedBy);
    for (const specifier of importSpecifiers(source)) {
      if (specifier.startsWith("node:")) {
        if (!diagnostics.nodeBuiltinImports.includes(specifier)) diagnostics.nodeBuiltinImports.push(specifier);
        continue;
      }
      if (!specifier.startsWith(".")) {
        if (!diagnostics.externalImports.includes(specifier)) diagnostics.externalImports.push(specifier);
        continue;
      }
      const child = await resolveLocalImport(current.path, specifier);
      if (!child) {
        diagnostics.unresolvedLocalImports.push({ from: relativePath(current.path), specifier });
        continue;
      }
      const childKey = normalizedPath(child);
      if (records.has(childKey)) importedBy.get(childKey)?.add(relativePath(current.path));
      else queue.push({ role: "transitive-product-or-runtime", path: child, importedBy: relativePath(current.path) });
    }
  }
  const output = [...records.values()].map((record) => ({
    logicalName: record.logicalName,
    relativePath: record.relativePath,
    role: [...record.roles].sort().join(","),
    sha256: record.sha256,
    byteSize: record.byteSize,
    importedBy: [...record.importedBy].sort(),
    mutableInScope: record.mutableInScope,
    currentMatch: record.currentMatch,
  })).sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const paths = output.map((record) => record.relativePath);
  diagnostics.duplicatePaths = paths.filter((path, index) => paths.indexOf(path) !== index);
  return { records: output, diagnostics };
}

export async function collectRuntimePins() {
  const executable = await hashFile(process.execPath);
  const sourceInventory = await collectSourceInventory();
  const repository = await collectRepositoryPins();
  return {
    node: {
      executablePath: process.execPath,
      version: process.version,
      execArgv: [...process.execArgv],
      ...executable,
    },
    repository,
    sourceInventory,
    correction7Writer: sourceInventory.records.find((record) => record.relativePath === "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs") || null,
  };
}

export function validateRuntimePins(runtime, { requireSourcePins = false, expectedSourcePins = PINNED_SOURCE_PINS } = {}) {
  const violations = [];
  if (!samePath(runtime.node.executablePath, NODE_EXECUTABLE)) violations.push("NODE_EXECUTABLE_MISMATCH");
  if (runtime.node.version !== NODE_VERSION) violations.push("NODE_VERSION_MISMATCH");
  if (runtime.node.sha256 !== NODE_SHA256) violations.push("NODE_BINARY_HASH_MISMATCH");
  if (!validateExecArgv(runtime.node.execArgv).ok) violations.push("NODE_EXEC_ARGV_INJECTION");
  if (requireSourcePins && Object.keys(expectedSourcePins).length === 0) violations.push("SOURCE_PIN_MANIFEST_REQUIRED");
  if (Object.keys(expectedSourcePins).length) {
    const actual = new Map(runtime.sourceInventory.records.map((record) => [record.relativePath, record]));
    for (const [path, expected] of Object.entries(expectedSourcePins)) {
      const record = actual.get(path);
      if (!record || record.sha256 !== expected.sha256 || record.byteSize !== expected.byteSize) violations.push(`SOURCE_PIN_MISMATCH:${path}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function validateEnvironment(environment = process.env) {
  const result = environmentPresence(environment);
  return { ...result, ok: result.ok };
}

export function validateGovernanceExecutionContract(contract) {
  const violations = [];
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    return { ok: false, violations: ["GOVERNANCE_EXECUTION_CONTRACT_REQUIRED"] };
  }
  const actualKeys = Object.keys(contract).sort();
  const expectedKeys = [...GOVERNANCE_EXECUTION_CONTRACT_KEYS].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) violations.push("GOVERNANCE_EXECUTION_CONTRACT_FIELD_SET_INVALID");
  for (const key of ["governanceDecisionId", "executionAuthorizationId", "executionState", "evidenceRoot", "evidenceFileStem"]) {
    if (typeof contract[key] !== "string" || !contract[key]) violations.push(`GOVERNANCE_${key.toUpperCase()}_INVALID`);
  }
  if (contract.integratedRunAllowance !== 1) violations.push("GOVERNANCE_RUN_ALLOWANCE_INVALID");
  try {
    assertFixedInput(contract.fixedInput);
  } catch {
    violations.push("GOVERNANCE_FIXED_INPUT_INVALID");
  }
  if (!contract.sourcePins || typeof contract.sourcePins !== "object" || Array.isArray(contract.sourcePins)) violations.push("GOVERNANCE_SOURCE_PINS_INVALID");
  if (!contract.runtimePins || typeof contract.runtimePins !== "object" || Array.isArray(contract.runtimePins)) violations.push("GOVERNANCE_RUNTIME_PINS_INVALID");
  if (JSON.stringify(contract.requestBudget) !== JSON.stringify(REQUEST_BUDGET)) violations.push("GOVERNANCE_REQUEST_BUDGET_INVALID");
  if (contract.concurrency !== REQUEST_BUDGET.concurrency) violations.push("GOVERNANCE_CONCURRENCY_INVALID");
  if (contract.retry !== 0 || contract.automaticRetry !== 0) violations.push("GOVERNANCE_RETRY_INVALID");
  if (contract.allowedNetworkDestination !== `https://${TMDB_HOST}`) violations.push("GOVERNANCE_NETWORK_DESTINATION_INVALID");
  if (contract.consumptionBoundary !== GOVERNANCE_BOUNDARY) violations.push("GOVERNANCE_CONSUMPTION_BOUNDARY_INVALID");
  if (contract.trustAuthority !== "EXTERNAL_GOVERNANCE" || contract.authenticityTechnicallyVerified !== false) violations.push("GOVERNANCE_TRUST_MODEL_INVALID");
  if (contract.evidenceRoot.includes("..") || contract.evidenceRoot.includes("\\") || contract.evidenceRoot.startsWith("/")) violations.push("GOVERNANCE_EVIDENCE_ROOT_INVALID");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(contract.evidenceFileStem)) violations.push("GOVERNANCE_EVIDENCE_STEM_INVALID");
  return { ok: violations.length === 0, violations: [...new Set(violations)] };
}

export function runtimeContractSnapshot() {
  return {
    fixedInput: FIXED_INPUT,
    requestBudget: REQUEST_BUDGET,
    maximumRedirectHops: MAX_REDIRECT_HOPS,
    nodeExecutable: NODE_EXECUTABLE,
    nodeVersion: NODE_VERSION,
    nodeSHA256: NODE_SHA256,
    tmdbHost: TMDB_HOST,
    tmdbBaseUrl: TMDB_BASE_URL,
    governanceBoundary: GOVERNANCE_BOUNDARY,
    governanceAuthority: GOVERNANCE_AUTHORITY,
    technicalPersistenceScope: TECHNICAL_PERSISTENCE_SCOPE,
    forbiddenExecArgv: FORBIDDEN_EXEC_ARGV,
    forbiddenEnvironmentKeys: FORBIDDEN_ENVIRONMENT_KEYS,
    credentialEnvironmentKeys: CREDENTIAL_ENVIRONMENT_KEYS,
  };
}

export { deepFreeze };
