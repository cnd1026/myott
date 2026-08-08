import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { builtinModules } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const V2_ROOT = "scripts/qa/rec-qa-091-live-v2";
const GRAPH_ROOTS = [
  `${V2_ROOT}/entrypoint.mjs`,
  `${V2_ROOT}/fixtures.mjs`,
  `${V2_ROOT}/independentValidator.mjs`,
  `${V2_ROOT}/architecture.test.mjs`,
  `${V2_ROOT}/generate-external-governance-correction.mjs`,
  `${V2_ROOT}/negativeFixtures.mjs`,
  `${V2_ROOT}/canonicalExpectedContract.mjs`,
];
const RELATED_OUTPUT_WRITER = "src/lib/recommendation/qa/tmdbObservabilityOutput.mjs";

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeRelative(pathValue) {
  return relative(REPOSITORY_ROOT, resolve(REPOSITORY_ROOT, pathValue)).replaceAll("\\", "/");
}

function isFile(pathValue) {
  try {
    return statSync(pathValue).isFile();
  } catch {
    return false;
  }
}

function roleFor(pathValue) {
  if (pathValue.startsWith(`${V2_ROOT}/`)) return pathValue.endsWith(".test.mjs") ? "v2-test" : "v2-source";
  if (pathValue === "lib/tmdb.js") return "product-read-only-binding";
  if (pathValue === "src/lib/providers/tmdb/requestContext.js") return "product-request-context";
  if (pathValue === "src/lib/recommendation/qa/tmdbObservability.js") return "product-observability-contract";
  if (pathValue === RELATED_OUTPUT_WRITER) return "correction-7-related-output-writer";
  if (pathValue === "src/lib/recommendation/qa/tmdbObservabilityFixture.mjs") return "direct-fixture-import";
  return "transitive-import";
}

function importedSpecifiers(source) {
  const staticImports = [];
  const dynamicImports = [];
  const staticPattern = /\b(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["']([^"'`]+)["']/g;
  const dynamicPattern = /\bimport\s*\(\s*["']([^"'`]+)["']\s*\)/g;
  const requirePattern = /\brequire\s*\(\s*["']([^"'`]+)["']\s*\)/g;
  for (const match of source.matchAll(staticPattern)) staticImports.push({ specifier: match[1], kind: "static" });
  for (const match of source.matchAll(dynamicPattern)) dynamicImports.push({ specifier: match[1], kind: "dynamic" });
  for (const match of source.matchAll(requirePattern)) dynamicImports.push({ specifier: match[1], kind: "require" });
  return [...staticImports, ...dynamicImports];
}

function resolveRelativeImport(fromPath, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(REPOSITORY_ROOT, dirname(fromPath), specifier);
  const candidates = [
    base,
    `${base}.mjs`,
    `${base}.js`,
    `${base}.cjs`,
    `${base}.json`,
    resolve(base, "index.mjs"),
    resolve(base, "index.js"),
    resolve(base, "index.cjs"),
    resolve(base, "index.json"),
  ];
  return candidates.find((candidate) => existsSync(candidate) && isFile(candidate)) || null;
}

async function readRecord(relativePath, importedBy = []) {
  const absolutePath = resolve(REPOSITORY_ROOT, relativePath);
  const bytes = await readFile(absolutePath);
  const fileStat = await stat(absolutePath);
  return {
    logicalName: relativePath.split("/").at(-1),
    relativePath,
    role: roleFor(relativePath),
    sha256: hashBytes(bytes),
    byteSize: bytes.byteLength,
    importedBy: [...new Set(importedBy)].sort(),
    mutableInScope: relativePath.startsWith(`${V2_ROOT}/`),
    currentMatch: true,
    modifiedMs: fileStat.mtimeMs,
    sourceText: bytes.toString("utf8"),
  };
}

export async function collectV2SourceGraph() {
  const records = new Map();
  const queue = GRAPH_ROOTS.map((pathValue) => ({ pathValue, importedBy: [] }));
  const missingRoots = [];
  const unresolvedLocalImports = [];
  const dynamicImports = [];
  const nodeBuiltinImports = new Set();
  const externalImports = new Set();
  while (queue.length) {
    const { pathValue, importedBy } = queue.shift();
    if (!isFile(resolve(REPOSITORY_ROOT, pathValue))) {
      missingRoots.push(pathValue);
      continue;
    }
    if (records.has(pathValue)) {
      records.get(pathValue).importedBy.push(...importedBy);
      continue;
    }
    const record = await readRecord(pathValue, importedBy);
    records.set(pathValue, record);
    for (const importRecord of importedSpecifiers(record.sourceText)) {
      const { specifier, kind } = importRecord;
      if (kind !== "static") dynamicImports.push({ from: pathValue, kind, specifier });
      if (specifier.startsWith(".")) {
        const absolute = resolveRelativeImport(pathValue, specifier);
        if (!absolute) {
          unresolvedLocalImports.push({ from: pathValue, kind, specifier });
          continue;
        }
        const childPath = normalizeRelative(absolute);
        queue.push({ pathValue: childPath, importedBy: [pathValue] });
        continue;
      }
      if (specifier.startsWith("node:") || builtinModules.includes(specifier)) nodeBuiltinImports.add(specifier);
      else externalImports.add(specifier);
    }
  }
  if (!records.has(RELATED_OUTPUT_WRITER)) records.set(RELATED_OUTPUT_WRITER, await readRecord(RELATED_OUTPUT_WRITER, []));
  const entries = [...records.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return {
    records: entries.map(({ sourceText, ...record }) => record),
    diagnostics: {
      missingRoots: [...new Set(missingRoots)].sort(),
      unresolvedLocalImports: unresolvedLocalImports.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
      duplicatePaths: [],
      dynamicImports: dynamicImports.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
      nodeBuiltinImports: [...nodeBuiltinImports].sort(),
      externalImports: [...externalImports].sort(),
    },
  };
}

export async function collectV2SourceInventory() {
  return (await collectV2SourceGraph()).records;
}

export async function collectV2SourcePins() {
  const inventory = await collectV2SourceInventory();
  return Object.fromEntries(inventory.map((record) => [record.relativePath, {
    sha256: record.sha256,
    byteSize: record.byteSize,
  }]));
}

export function sourceInventoryRoots() {
  return [...GRAPH_ROOTS];
}
