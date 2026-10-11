function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

const cleanArray = (values = []) => (Array.isArray(values) ? values : [])
  .map((value) => typeof value === "string" ? value : value)
  .filter((value) => typeof value !== "string" || value.trim());

const DEFAULT_CONTENT_TYPES = Object.freeze(["movie", "drama", "animation"]);

export function createInitialPreferenceDraft() {
  return {
    contentTypes: [...DEFAULT_CONTENT_TYPES],
    filters: [],
    ottProviders: [],
  };
}

export function createSubmittedPreferences({
  titles = [],
  confirmedSeeds = {},
  contentTypes = [],
  filters = [],
  ottProviders = [],
} = {}) {
  // Submitted titles and their confirmation keys must be compacted together.
  // A confirmation is attached to an input row, not the next surviving title.
  const submittedTitles = [];
  const submittedSeeds = {};
  (Array.isArray(titles) ? titles : []).forEach((title, sourceIndex) => {
    if (typeof title === "string" && !title.trim()) return;
    const submittedIndex = submittedTitles.length;
    submittedTitles.push(String(title));
    if (Object.hasOwn(confirmedSeeds || {}, sourceIndex)) {
      submittedSeeds[submittedIndex] = clone(confirmedSeeds[sourceIndex]);
    }
  });
  return Object.freeze({
    titles: Object.freeze(submittedTitles),
    confirmedSeeds: Object.freeze(submittedSeeds),
    contentTypes: Object.freeze([...new Set(cleanArray(contentTypes))]),
    filters: Object.freeze([...new Set(cleanArray(filters))]),
    ottProviders: Object.freeze([...new Set(cleanArray(ottProviders))]),
  });
}

export function createRecommendationRequestId(sequence = 0, now = Date.now()) {
  const random = globalThis.crypto?.randomUUID?.();
  return random || `recommendation-${now}-${sequence}`;
}

export function createRecommendationSession({
  requestId,
  requestSequence,
  endpoint = "",
  submittedAt = new Date().toISOString(),
  submittedPreferences,
  results = [],
  providerStatus = {},
  diagnostics = {},
  status = "success",
} = {}) {
  return {
    requestId,
    requestSequence,
    endpoint,
    submittedAt,
    submittedPreferences: createSubmittedPreferences(submittedPreferences),
    results: clone(results),
    providerStatus: clone(providerStatus),
    diagnostics: clone(diagnostics),
    status,
  };
}

function normalizedComparable(preferences = {}) {
  const snapshot = createSubmittedPreferences(preferences);
  return {
    titles: snapshot.titles,
    confirmedSeeds: snapshot.confirmedSeeds,
    contentTypes: [...snapshot.contentTypes].sort(),
    filters: [...snapshot.filters].sort(),
    ottProviders: [...snapshot.ottProviders].sort(),
  };
}

export function preferencesChanged(draft = {}, submitted = {}) {
  return JSON.stringify(normalizedComparable(draft)) !== JSON.stringify(normalizedComparable(submitted));
}
