export function selectLiveQaCases(allCases, requestedCaseIds = new Set()) {
  if (!Array.isArray(allCases) || allCases.length === 0) {
    throw new Error("INVALID_SELECTION");
  }
  const availableIds = new Set(allCases.map((entry) => entry?.id));
  if (availableIds.size !== allCases.length ||
      allCases.some((entry) => typeof entry?.id !== "string" || !entry.id)) {
    throw new Error("INVALID_SELECTION");
  }
  const requested = new Set(requestedCaseIds);
  if ([...requested].some((id) => !availableIds.has(id))) {
    throw new Error("INVALID_SELECTION");
  }
  const selected = requested.size
    ? allCases.filter((entry) => requested.has(entry.id))
    : allCases;
  if (!selected.length) throw new Error("INVALID_SELECTION");
  return selected;
}
