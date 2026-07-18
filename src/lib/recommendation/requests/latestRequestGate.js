export function createLatestRequestGate() {
  let latestSequence = 0;
  let controller = null;
  let staleCommitCount = 0;

  return {
    begin() {
      controller?.abort();
      controller = new AbortController();
      latestSequence += 1;
      return { sequence: latestSequence, signal: controller.signal };
    },
    canCommit(sequence) {
      const allowed = sequence === latestSequence && !controller?.signal.aborted;
      if (!allowed) staleCommitCount += 1;
      return allowed;
    },
    abort() {
      controller?.abort();
    },
    diagnostics() {
      return { latestSequence, staleCommitCount };
    },
  };
}
