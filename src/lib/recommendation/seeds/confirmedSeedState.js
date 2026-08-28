export const CONFIRMED_SEED_STATE = Object.freeze({
  EMPTY: "EMPTY",
  RAW_TYPING: "RAW_TYPING",
  SUGGESTIONS_VISIBLE: "SUGGESTIONS_VISIBLE",
  CONFIRMED: "CONFIRMED",
  CONFIRMED_THEN_RAW_EDITED: "CONFIRMED_THEN_RAW_EDITED",
  UNRESOLVED_RAW: "UNRESOLVED_RAW",
  CONFIRMATION_REMOVED: "CONFIRMATION_REMOVED",
});

export function createSeedRow(id, raw = "") {
  return {
    id,
    raw,
    confirmed: null,
    state: raw.trim() ? CONFIRMED_SEED_STATE.RAW_TYPING : CONFIRMED_SEED_STATE.EMPTY,
  };
}

function isMeaningful(row) {
  return Boolean(row?.raw?.trim() || row?.confirmed);
}

export function normalizeSeedRows(rows, createBlankRow) {
  const next = rows.length ? [...rows] : [createBlankRow()];
  while (next.length > 1 && !isMeaningful(next.at(-1)) && !isMeaningful(next.at(-2))) {
    next.splice(next.length - 2, 1);
  }
  if (isMeaningful(next.at(-1))) next.push(createBlankRow());
  return next;
}

export function editSeedRow(rows, rowId, raw, createBlankRow) {
  const next = rows.map((row) => {
    if (row.id !== rowId) return row;
    const hadConfirmation = Boolean(row.confirmed);
    return {
      ...row,
      raw,
      confirmed: null,
      state: hadConfirmation
        ? CONFIRMED_SEED_STATE.CONFIRMED_THEN_RAW_EDITED
        : raw.trim()
          ? CONFIRMED_SEED_STATE.RAW_TYPING
          : CONFIRMED_SEED_STATE.EMPTY,
    };
  });
  return normalizeSeedRows(next, createBlankRow);
}

export function showSeedSuggestions(rows, rowId) {
  return rows.map((row) => row.id === rowId
    ? { ...row, state: CONFIRMED_SEED_STATE.SUGGESTIONS_VISIBLE }
    : row);
}

export function closeSeedSuggestions(rows, rowId) {
  return rows.map((row) => row.id === rowId && !row.confirmed && row.raw.trim()
    ? { ...row, state: CONFIRMED_SEED_STATE.UNRESOLVED_RAW }
    : row);
}

export function confirmSeedRow(rows, rowId, confirmed, createBlankRow) {
  return normalizeSeedRows(rows.map((row) => row.id === rowId
    ? { ...row, confirmed, state: CONFIRMED_SEED_STATE.CONFIRMED }
    : row), createBlankRow);
}

export function removeSeedConfirmation(rows, rowId) {
  return rows.map((row) => row.id === rowId
    ? { ...row, confirmed: null, state: CONFIRMED_SEED_STATE.CONFIRMATION_REMOVED }
    : row);
}

export function seedRowsToPreferenceState(rows) {
  return {
    titles: rows.map((row) => row.raw),
    confirmedSeeds: Object.fromEntries(rows.flatMap((row, index) => row.confirmed ? [[index, row.confirmed]] : [])),
  };
}

export function nextHighlightedSuggestion(current, count, key) {
  if (!count || !["ArrowDown", "ArrowUp"].includes(key)) return current;
  if (key === "ArrowDown") return current < 0 ? 0 : (current + 1) % count;
  return current < 0 ? count - 1 : (current - 1 + count) % count;
}
