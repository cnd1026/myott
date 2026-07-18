function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

const cleanArray = (values = []) => (Array.isArray(values) ? values : [])
  .map((value) => typeof value === "string" ? value : value)
  .filter((value) => typeof value !== "string" || value.trim());

export function createSubmittedPreferences({
  titles = [],
  confirmedSeeds = {},
  contentTypes = [],
  filters = [],
  ottProviders = [],
} = {}) {
  return Object.freeze({
    titles: Object.freeze(cleanArray(titles).map((title) => String(title))),
    confirmedSeeds: Object.freeze(clone(confirmedSeeds || {})),
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
