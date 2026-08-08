import {
  TMDB_OBSERVABILITY_LIMITS,
  validateCorrectedEventLimitContract,
  createTmdbObservabilitySession,
  emitTmdbObservabilityEvent,
} from "./tmdbObservability.js";
import {
  assertObservabilityEvidenceRoot,
  hashEvidenceFile,
  writeImmutableObservabilityEvidence,
  writeImmutableObservabilityEvidenceForTest,
} from "./tmdbObservabilityOutput.mjs";
import { mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function cloneArgs(baseArgs) {
  return {
    ...baseArgs,
    input: structuredClone(baseArgs.input),
    productContract: structuredClone(baseArgs.productContract),
    runs: baseArgs.runs.map((run) => ({
      ...run,
      result: structuredClone(run.result),
    })),
    candidateRegistry: structuredClone(baseArgs.candidateRegistry),
    finalCandidateIds: [...baseArgs.finalCandidateIds],
    excludedCandidates: structuredClone(baseArgs.excludedCandidates),
    terminalProvenance: structuredClone(baseArgs.terminalProvenance),
    rankingProvenance: structuredClone(baseArgs.rankingProvenance),
    sourceHashes: structuredClone(baseArgs.sourceHashes),
    redactionValidation: structuredClone(baseArgs.redactionValidation),
    outputBoundaryValidation: structuredClone(baseArgs.outputBoundaryValidation),
    resourceLimits: structuredClone(baseArgs.resourceLimits),
    eventLimitFixtureValidation: structuredClone(baseArgs.eventLimitFixtureValidation),
    noClobberPublishValidation: structuredClone(baseArgs.noClobberPublishValidation),
    staticValidation: structuredClone(baseArgs.staticValidation),
    integrity: structuredClone(baseArgs.integrity),
  };
}

function fixtureRunWithEventCount(run, eventCount) {
  return {
    ...run,
    ledger: JSON.stringify({ events: Array.from({ length: eventCount }, (_, index) => ({ sequence: index + 1 })) }),
  };
}

function expectedEventLimitReject(id, runs, resourceLimits, results) {
  let rejected = false;
  try {
    validateCorrectedEventLimitContract(runs, resourceLimits);
  } catch {
    rejected = true;
  }
  results.push({ id, status: rejected ? "PASS" : "UNEXPECTED_PASS", expected: "REJECT" });
}

export async function runTmdbObservabilityEventLimitFixtures({ runs, resourceLimits } = {}) {
  const results = [];
  const modes = ["cold", "warm-prime", "warm-measure"];
  const actualRuns = Array.isArray(runs) ? runs : [];
  const validLimits = structuredClone(resourceLimits);
  try {
    const positive = validateCorrectedEventLimitContract(actualRuns, validLimits);
    results.push({
      id: "EVL-001",
      status: positive.actualAggregateEventCount === 543 ? "PASS" : "FAIL",
      expected: "PASS",
    });
  } catch {
    results.push({ id: "EVL-001", status: "FAIL", expected: "PASS" });
  }
  for (const [index, mode] of modes.entries()) {
    const mutated = actualRuns.map((run) => run.runMode === mode ? fixtureRunWithEventCount(run, 513) : run);
    expectedEventLimitReject(`EVL-${String(index + 2).padStart(3, "0")}`, mutated, validLimits, results);
  }
  const aggregateOverLimit = actualRuns.map((run, index) => fixtureRunWithEventCount(run, index === 2 ? 513 : 512));
  expectedEventLimitReject("EVL-005", aggregateOverLimit, validLimits, results);
  expectedEventLimitReject("EVL-006", [...actualRuns, fixtureRunWithEventCount(actualRuns[0], 1)], validLimits, results);
  const aggregateMismatch = { ...validLimits, actualAggregateEventCount: 542 };
  expectedEventLimitReject("EVL-007", actualRuns, aggregateMismatch, results);
  const runCountMismatch = {
    ...validLimits,
    actualEventCountByRun: { ...validLimits.actualEventCountByRun, cold: 180 },
  };
  expectedEventLimitReject("EVL-008", actualRuns, runCountMismatch, results);
  const missingScope = { ...validLimits };
  delete missingScope.eventLimitScope;
  expectedEventLimitReject("EVL-009", actualRuns, missingScope, results);
  expectedEventLimitReject("EVL-010", actualRuns, { ...validLimits, eventLimitScope: "PER_SESSION" }, results);
  return {
    status: results.every((result) => result.status === "PASS") ? "PASS" : "FAIL",
    total: results.length,
    passed: results.filter((result) => result.status === "PASS").length,
    failed: results.filter((result) => result.status !== "PASS").length,
    unexpectedPasses: results.filter((result) => result.status === "UNEXPECTED_PASS").length,
    results,
  };
}

async function temporaryFiles(root, stem) {
  return (await readdir(root)).filter((name) => name.startsWith(`.${stem}.`) && name.endsWith(".tmp"));
}

async function withTemporaryEvidenceRoot(callback) {
  const originalLocalAppData = process.env.LOCALAPPDATA;
  const temporaryBase = await mkdtemp(join(tmpdir(), "myott-observability-output-"));
  const root = join(temporaryBase, "MyOTT", "qa-evidence", "REC-QA-091", "OBSERVABILITY_V1");
  await mkdir(root, { recursive: true });
  process.env.LOCALAPPDATA = temporaryBase;
  try {
    return await callback({ temporaryBase, root });
  } finally {
    if (originalLocalAppData === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = originalLocalAppData;
    await rm(temporaryBase, { recursive: true, force: true });
  }
}

export async function runTmdbObservabilityImmutableOutputFixtures() {
  return withTemporaryEvidenceRoot(async ({ temporaryBase, root }) => {
    const value = { fixture: "immutable-output", complete: true };
    const checks = {
      atomicNoClobberHardLinkPublish: false,
      existingDestinationRejected: false,
      destinationRacePreserved: false,
      concurrentSingleWinner: false,
      noRenameOverwriteFallback: false,
      noCopyOverwriteFallback: false,
      tempFileCleanup: false,
      symlinkBoundaryRejected: false,
    };
    let raceError = "";
    try {
      const published = await writeImmutableObservabilityEvidence("atomic-fixture", value);
      checks.atomicNoClobberHardLinkPublish = (await hashEvidenceFile(published.path)).sha256 === published.sha256;
      checks.tempFileCleanup = (await temporaryFiles(root, "atomic-fixture")).length === 0;

      const existingAttempt = await writeImmutableObservabilityEvidence("atomic-fixture", { changed: true })
        .then(() => "UNEXPECTED_PASS")
        .catch((error) => error.message);
      checks.existingDestinationRejected = existingAttempt === "OUTPUT_ALREADY_EXISTS" &&
        JSON.stringify(JSON.parse(await readFile(published.path, "utf8"))) === JSON.stringify(value);

      const raceAttempt = await writeImmutableObservabilityEvidenceForTest("race-fixture", { race: "writer" }, async (destination) => {
        await writeFile(destination, "sentinel", { flag: "wx" });
      }).then(() => "UNEXPECTED_PASS").catch((error) => error.message);
      raceError = raceAttempt;
      const racePath = join(root, "race-fixture.json");
      checks.destinationRacePreserved = raceAttempt === "OUTPUT_ALREADY_EXISTS" &&
        (await readFile(racePath, "utf8")) === "sentinel" &&
        (await temporaryFiles(root, "race-fixture")).length === 0;

      const outcomes = await Promise.allSettled([
        writeImmutableObservabilityEvidence("concurrent-fixture", { winner: 1 }),
        writeImmutableObservabilityEvidence("concurrent-fixture", { winner: 2 }),
      ]);
      const successes = outcomes.filter((outcome) => outcome.status === "fulfilled");
      const alreadyExists = outcomes.filter((outcome) => outcome.status === "rejected" && outcome.reason?.message === "OUTPUT_ALREADY_EXISTS");
      const concurrentPayload = JSON.parse(await readFile(join(root, "concurrent-fixture.json"), "utf8"));
      checks.concurrentSingleWinner = successes.length === 1 && alreadyExists.length === 1 &&
        [1, 2].includes(concurrentPayload.winner) &&
        (await temporaryFiles(root, "concurrent-fixture")).length === 0;

      const outputSource = await readFile(new URL("./tmdbObservabilityOutput.mjs", import.meta.url), "utf8");
      checks.noRenameOverwriteFallback = !/\brename(?:Sync)?\s*\(/.test(outputSource);
      checks.noCopyOverwriteFallback = !/\bcopyFile(?:Sync)?\s*\(/.test(outputSource);

      const outside = join(temporaryBase, "outside");
      await mkdir(outside, { recursive: true });
      await rm(root, { recursive: true, force: true });
      await symlink(outside, root, "junction");
      const symlinkAttempt = await assertObservabilityEvidenceRoot()
        .then(() => "UNEXPECTED_PASS")
        .catch((error) => error.message);
      checks.symlinkBoundaryRejected = symlinkAttempt !== "UNEXPECTED_PASS";
    } finally {
      await rm(root, { recursive: true, force: true }).catch(() => {});
    }
    const residualTemporaryFiles = (await readdir(temporaryBase, { recursive: true })).filter((name) => String(name).endsWith(".tmp"));
    checks.tempFileCleanup = checks.tempFileCleanup && residualTemporaryFiles.length === 0;
    return {
      status: Object.values(checks).every(Boolean) ? "PASS" : "FAIL",
      atomicNoClobberHardLinkPublish: checks.atomicNoClobberHardLinkPublish,
      existingDestinationRejected: checks.existingDestinationRejected,
      destinationRacePreserved: checks.destinationRacePreserved,
      concurrentSingleWinner: checks.concurrentSingleWinner,
      noRenameOverwriteFallback: checks.noRenameOverwriteFallback,
      noCopyOverwriteFallback: checks.noCopyOverwriteFallback,
      tempFileCleanup: checks.tempFileCleanup,
      symlinkBoundaryRejected: checks.symlinkBoundaryRejected,
      raceError,
      residualTemporaryFileCount: residualTemporaryFiles.length,
      temporaryRootCleanup: true,
    };
  });
}

export async function runTmdbObservabilitySecurityFixtures({
  baseArgs,
  buildEvidence,
  resolveOutput,
} = {}) {
  const results = [];

  async function expectedReject(id, operation) {
    let rejected = false;
    try {
      await operation();
    } catch {
      rejected = true;
    }
    results.push({ id, status: rejected ? "PASS" : "UNEXPECTED_PASS", expected: "REJECT" });
  }

  async function rejectEvidence(id, mutate) {
    await expectedReject(id, () => {
      const args = cloneArgs(baseArgs);
      mutate(args);
      return buildEvidence(args);
    });
  }

  await rejectEvidence("SEC-001", (args) => {
    args.input.cookieProbe = "cookie=fixture-value";
  });
  await rejectEvidence("SEC-002", (args) => {
    args.input.sessionProbe = "session=fixture-value";
  });
  await rejectEvidence("SEC-003", (args) => {
    args.input.processProbe = "process.env.TMDB_API_KEY";
  });
  await rejectEvidence("SEC-004", (args) => {
    args.input.authorizationProbe = "Authorization: fixture-value";
  });
  await rejectEvidence("SEC-005", (args) => {
    args.input.bearerProbe = "Bearer fixture-token";
  });
  await rejectEvidence("SEC-006", (args) => {
    args.input.urlProbe = "https://example.test/path?api_key=fixture";
  });
  await rejectEvidence("SEC-007", (args) => {
    args.input.pathProbe = "prefix C:\\Users\\fixture\\secret.txt";
  });
  await rejectEvidence("SEC-008", (args) => {
    args.input.pathProbe = "prefix \\\\server\\share\\fixture.txt";
  });
  await expectedReject("SEC-009", () => resolveOutput("../escape"));
  await expectedReject("SEC-010", () => resolveOutput("D:\\escape"));
  await rejectEvidence("SEC-011", (args) => {
    args.input = JSON.parse('{"__proto__":"fixture"}');
  });
  await rejectEvidence("SEC-012", (args) => {
    args.input = JSON.parse('{"constructor":"fixture"}');
  });
  await rejectEvidence("SEC-013", (args) => {
    args.runs[0].result.traceSummary.requestBudget.total = 25;
  });
  await rejectEvidence("SEC-014", (args) => {
    args.runs[0].result.traceSummary.requestBudget.concurrency = 5;
  });
  await rejectEvidence("SEC-015", (args) => {
    args.input.circular = args.input;
  });
  await rejectEvidence("SEC-016", (args) => {
    args.candidateRegistry = Array.from({ length: TMDB_OBSERVABILITY_LIMITS.maximumCandidateRegistry + 1 }, (_, index) => ({
      candidateId: `tmdb:tv:${index + 1}`,
    }));
  });
  await expectedReject("SEC-017", () => {
    const session = createTmdbObservabilitySession({
      runId: "security-fixture-event-limit",
      runMode: "fixture",
      sourceComponent: "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs",
    });
    for (let index = 0; index <= TMDB_OBSERVABILITY_LIMITS.maximumEventCount; index += 1) {
      emitTmdbObservabilityEvent(session, "input", {
        dataSource: "DETERMINISTIC_FIXTURE",
        sourceComponent: "src/lib/recommendation/qa/tmdbObservabilitySecurityFixtures.mjs",
        inputCount: index,
        outputCount: index,
      });
    }
  });
  await rejectEvidence("SEC-018", (args) => {
    args.input.largeEvidence = Array.from({ length: 1_100 }, () => "x".repeat(2_000));
  });
  await rejectEvidence("SEC-019", (args) => {
    let value = "leaf";
    for (let index = 0; index < TMDB_OBSERVABILITY_LIMITS.maximumNestingDepth + 4; index += 1) {
      value = { nested: value };
    }
    args.input.deep = value;
  });

  return {
    total: results.length,
    passed: results.filter((result) => result.status === "PASS").length,
    failed: results.filter((result) => result.status !== "PASS").length,
    unexpectedPasses: results.filter((result) => result.status === "UNEXPECTED_PASS").length,
    results,
  };
}
