import { createHash, randomUUID } from "node:crypto";
import { access, link, lstat, open, readFile, realpath, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";

const EVIDENCE_SUBPATH = ["MyOTT", "qa-evidence", "REC-QA-091", "OBSERVABILITY_V1"];
const SAFE_FILE_STEM = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function observabilityEvidenceRoot() {
  const localAppData = typeof process.env.LOCALAPPDATA === "string" && process.env.LOCALAPPDATA.trim()
    ? process.env.LOCALAPPDATA
    : resolve(homedir(), "AppData", "Local");
  return resolve(localAppData, ...EVIDENCE_SUBPATH);
}

function normalizedPath(pathValue) {
  return resolve(pathValue).toLowerCase();
}

export async function assertObservabilityEvidenceRoot() {
  const root = observabilityEvidenceRoot();
  let rootStat;
  try {
    rootStat = await lstat(root);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("EVIDENCE_ROOT_NOT_FOUND");
    throw error;
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("EVIDENCE_ROOT_MUST_BE_A_NON_SYMLINK_DIRECTORY");
  }
  const canonicalRoot = await realpath(root);
  if (normalizedPath(canonicalRoot) !== normalizedPath(root)) {
    throw new Error("EVIDENCE_ROOT_REALPATH_ESCAPES_CONFIGURED_ROOT");
  }
  return { root, canonicalRoot };
}

export function assertSafeEvidenceFileStem(fileStem) {
  if (typeof fileStem !== "string" || !fileStem || fileStem === "." || fileStem === ".." ||
    CONTROL_CHARACTER.test(fileStem) || fileStem.includes("\\") || fileStem.includes("/") ||
    isAbsolute(fileStem) || fileStem.includes("..") || !SAFE_FILE_STEM.test(fileStem)) {
    throw new TypeError("EVIDENCE_FILE_STEM_INVALID");
  }
  return fileStem;
}

export async function resolveObservabilityEvidenceOutput(fileStem) {
  const safeStem = assertSafeEvidenceFileStem(fileStem);
  const { root, canonicalRoot } = await assertObservabilityEvidenceRoot();
  const outputPath = resolve(root, `${safeStem}.json`);
  const outputRelative = relative(canonicalRoot, outputPath);
  if (!outputRelative || outputRelative.startsWith("..") || isAbsolute(outputRelative)) {
    throw new Error("EVIDENCE_OUTPUT_OUTSIDE_ROOT");
  }
  return outputPath;
}

export async function hashEvidenceFile(filePath) {
  const bytes = await readFile(filePath);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteSize: bytes.byteLength,
  };
}

export async function writeImmutableObservabilityEvidence(fileStem, value) {
  return writeImmutableObservabilityEvidenceInternal(fileStem, value);
}

async function writeImmutableObservabilityEvidenceInternal(fileStem, value, beforePublish = null) {
  const outputPath = await resolveObservabilityEvidenceOutput(fileStem);
  const existing = await lstat(outputPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (existing) throw new Error("OUTPUT_ALREADY_EXISTS");

  const root = dirname(outputPath);
  const temporaryPath = resolve(root, `.${fileStem}.${process.pid}.${randomUUID()}.tmp`);
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  let handle;
  let temporaryRemoved = false;
  try {
    try {
      handle = await open(temporaryPath, "wx");
    } catch (error) {
      if (error?.code === "EEXIST") throw new Error("TEMP_FILE_COLLISION");
      throw error;
    }
    await handle.writeFile(payload, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    if (beforePublish) await beforePublish(outputPath, temporaryPath);
    try {
      await link(temporaryPath, outputPath);
    } catch (error) {
      if (error?.code === "EEXIST") throw new Error("OUTPUT_ALREADY_EXISTS");
      if (["EXDEV", "EINVAL", "ENOTSUP", "EOPNOTSUPP", "EPERM"].includes(error?.code)) {
        throw new Error("ATOMIC_NO_CLOBBER_UNSUPPORTED");
      }
      throw new Error("ATOMIC_NO_CLOBBER_PUBLISH_FAILED");
    }
    await unlink(temporaryPath);
    temporaryRemoved = true;
  } finally {
    if (handle) await handle.close().catch(() => {});
    if (!temporaryRemoved) await unlink(temporaryPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
  return {
    path: outputPath,
    ...(await hashEvidenceFile(outputPath)),
  };
}

export async function writeImmutableObservabilityEvidenceForTest(fileStem, value, beforePublish) {
  if (typeof beforePublish !== "function") throw new TypeError("TEST_BEFORE_PUBLISH_HOOK_REQUIRED");
  return writeImmutableObservabilityEvidenceInternal(fileStem, value, beforePublish);
}

export async function assertEvidenceOutputPathIsContained(filePath) {
  const { canonicalRoot } = await assertObservabilityEvidenceRoot();
  const outputRelative = relative(canonicalRoot, resolve(filePath));
  if (!outputRelative || outputRelative.startsWith("..") || isAbsolute(outputRelative)) {
    throw new Error("EVIDENCE_OUTPUT_OUTSIDE_ROOT");
  }
  await access(resolve(canonicalRoot, outputRelative));
  return true;
}
