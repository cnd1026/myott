export const INITIAL_VISIBLE_RESULT_COUNT = 3;

export const RESULT_SHORTLIST_ACTIONS = Object.freeze({
  COLLAPSE: "COLLAPSE",
  RESULTS_COMMITTED: "RESULTS_COMMITTED",
  REVEAL: "REVEAL",
});

export function createResultShortlistState() {
  return { expanded: false };
}

export function reduceResultShortlist(state, action) {
  if (action?.type === RESULT_SHORTLIST_ACTIONS.REVEAL) {
    return { expanded: true };
  }

  if (
    action?.type === RESULT_SHORTLIST_ACTIONS.COLLAPSE
    || action?.type === RESULT_SHORTLIST_ACTIONS.RESULTS_COMMITTED
  ) {
    return createResultShortlistState();
  }

  return state;
}

export function presentResultShortlist(results, state, { shortlistEnabled = true } = {}) {
  const rankedResults = Array.isArray(results) ? results : [];
  const expanded = state?.expanded === true;
  const hasAdditionalResults = shortlistEnabled && rankedResults.length > INITIAL_VISIBLE_RESULT_COUNT;
  const visibleResults = hasAdditionalResults && !expanded
    ? rankedResults.slice(0, INITIAL_VISIBLE_RESULT_COUNT)
    : rankedResults;

  return {
    expanded,
    hasAdditionalResults,
    remainingCount: hasAdditionalResults
      ? rankedResults.length - INITIAL_VISIBLE_RESULT_COUNT
      : 0,
    showCollapse: hasAdditionalResults && expanded,
    showReveal: hasAdditionalResults && !expanded,
    totalCount: rankedResults.length,
    visibleResults,
  };
}
