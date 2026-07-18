import { normalizeTaxonomyValue, selectedTaxonomyFilters } from "../genres/genreContract.js";

export const OTT_PROVIDER_REGISTRY = Object.freeze({
  netflix: Object.freeze({ value: "netflix", label: "Netflix", providerId: 8, providerName: "Netflix" }),
  disney: Object.freeze({ value: "disney", label: "Disney+", providerId: 337, providerName: "Disney Plus" }),
  "amazon-prime-video": Object.freeze({
    value: "amazon-prime-video",
    label: "Amazon Prime Video",
    providerId: 119,
    providerName: "Amazon Prime Video",
  }),
  "apple-tv-plus": Object.freeze({
    value: "apple-tv-plus",
    label: "Apple TV+",
    providerId: 350,
    providerName: "Apple TV",
  }),
});

const PROVIDER_LABELS_BY_ID = Object.freeze({
  2: "Apple TV Store",
  8: "Netflix",
  119: "Amazon Prime Video",
  337: "Disney+",
  350: "Apple TV+",
});

const OTT_ALIASES = Object.freeze({
  prime: "amazon-prime-video",
  amazon: "amazon-prime-video",
  "prime-video": "amazon-prime-video",
  "amazon-prime": "amazon-prime-video",
  appletv: "apple-tv-plus",
  "apple-tv": "apple-tv-plus",
  "apple-tv+": "apple-tv-plus",
});

export const PRIMARY_OTT_OPTIONS = Object.freeze(
  Object.values(OTT_PROVIDER_REGISTRY).map(({ value, label }) => Object.freeze([value, label])),
);

export const RUNTIME_FILTERS = Object.freeze({
  "runtime-short": Object.freeze({ value: "runtime-short", label: "60분 이하", max: 60 }),
  "runtime-medium": Object.freeze({ value: "runtime-medium", label: "2시간 이하", max: 120 }),
  "runtime-long": Object.freeze({ value: "runtime-long", label: "긴 작품 (2시간 이상)", min: 120 }),
});

const uniqueNumbers = (values = []) => [...new Set(
  (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite),
)];

export function normalizeProviderMediaType(item = {}) {
  const raw = String(
    item.providerMediaType || item.mediaType || item.media_type || item.providerType || "",
  ).trim().toLowerCase();
  if (["tv", "drama", "series"].includes(raw)) return "tv";
  if (raw === "movie") return "movie";
  if (item.first_air_date || item.firstAirDate) return "tv";
  if (item.release_date || item.releaseDate) return "movie";

  const compatibilityType = String(item.contentType || item.type || "").trim().toLowerCase();
  if (["tv", "drama", "series"].includes(compatibilityType)) return "tv";
  if (compatibilityType === "movie") return "movie";
  return "";
}

export function normalizeDisplayContentType(item = {}) {
  const genreIds = uniqueNumbers(item.providerGenreIds || item.genreIds || item.genre_ids || []);
  const raw = String(item.displayContentType || item.contentType || item.type || "").trim().toLowerCase();
  if (raw === "animation" || genreIds.includes(16)) return "animation";
  const providerMediaType = normalizeProviderMediaType(item);
  if (providerMediaType === "tv") return "drama";
  if (providerMediaType === "movie") return "movie";
  return raw === "drama" ? "drama" : raw === "movie" ? "movie" : "";
}

function normalizedSelectedContentTypes(contentTypes = []) {
  return [...new Set((Array.isArray(contentTypes) ? contentTypes : [])
    .map((value) => String(value || "").trim().toLowerCase())
    .map((value) => (["tv", "series"].includes(value) ? "drama" : value))
    .filter((value) => ["movie", "drama", "animation"].includes(value)))];
}

export function animationStyleSelected(filters = []) {
  return selectedTaxonomyFilters(filters)
    .map(normalizeTaxonomyValue)
    .includes("style-animation");
}

export function contentTypeMatchesSubmittedPreferences(item = {}, contentTypes = [], filters = []) {
  const selected = normalizedSelectedContentTypes(contentTypes);
  if (!selected.length) return true;

  const providerMediaType = normalizeProviderMediaType(item);
  const displayContentType = normalizeDisplayContentType(item);
  const isAnimation = displayContentType === "animation";
  const styleSelected = animationStyleSelected(filters);

  if (isAnimation && selected.includes("animation")) return ["movie", "tv"].includes(providerMediaType);
  if (isAnimation && !styleSelected) return false;
  if (isAnimation && styleSelected) {
    return (providerMediaType === "movie" && selected.includes("movie")) ||
      (providerMediaType === "tv" && selected.includes("drama"));
  }
  if (providerMediaType === "movie") return selected.includes("movie");
  if (providerMediaType === "tv") return selected.includes("drama");
  return false;
}

export function contentTypeMatrixDiagnostics(item = {}, contentTypes = [], filters = []) {
  return {
    providerMediaType: normalizeProviderMediaType(item),
    displayContentType: normalizeDisplayContentType(item),
    animationStyleSelected: animationStyleSelected(filters),
    selectedContentTypes: normalizedSelectedContentTypes(contentTypes),
    pass: contentTypeMatchesSubmittedPreferences(item, contentTypes, filters),
  };
}

export function canonicalOttFilter(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  const canonical = OTT_ALIASES[normalized] || normalized;
  return OTT_PROVIDER_REGISTRY[canonical] ? canonical : "";
}

export function serviceName(providerId, providerName = "") {
  const numericId = Number(providerId);
  if (Number.isFinite(numericId) && PROVIDER_LABELS_BY_ID[numericId]) {
    return PROVIDER_LABELS_BY_ID[numericId];
  }
  return String(providerName || "").trim();
}

export function selectedOttEntries(filters = []) {
  const seen = new Set();
  return (Array.isArray(filters) ? filters : []).reduce((entries, filter) => {
    const canonical = canonicalOttFilter(filter);
    if (!canonical || seen.has(canonical)) return entries;
    seen.add(canonical);
    entries.push(OTT_PROVIDER_REGISTRY[canonical]);
    return entries;
  }, []);
}

export function normalizeWatchAvailability(detail = {}, region = "KR") {
  const directAvailability = ["flatrate", "free", "ads", "rent", "buy"].some((group) => Array.isArray(detail[group]));
  const source = detail.watchAvailability || detail["watch/providers"]?.results?.[region] || (directAvailability ? detail : {});
  const normalizeGroup = (group) => (Array.isArray(group) ? group : []).map((provider) => ({
    id: Number(provider.id ?? provider.provider_id),
    name: String(provider.name || provider.provider_name || "").trim(),
  })).filter((provider) => Number.isFinite(provider.id) && provider.name);

  return {
    region: String(source.region || region || "KR").toUpperCase(),
    flatrate: normalizeGroup(source.flatrate),
    free: normalizeGroup(source.free),
    ads: normalizeGroup(source.ads),
    rent: normalizeGroup(source.rent),
    buy: normalizeGroup(source.buy),
  };
}

function availabilityProviderIds(availability, groups) {
  return uniqueNumbers(groups.flatMap((group) => availability[group]?.map((provider) => provider.id) || []));
}

export function streamingProviderMetadata(item = {}) {
  const availability = normalizeWatchAvailability(item.watchAvailability || {}, item.watchAvailability?.region || "KR");
  const explicitIds = uniqueNumbers(item.actualStreamingProviderIds || []);
  const explicitNames = Array.isArray(item.actualStreamingProviders) ? item.actualStreamingProviders.filter(Boolean) : [];
  const streamGroups = ["flatrate", "free", "ads"];
  const providers = streamGroups.flatMap((group) => availability[group] || []);
  const ids = explicitIds.length ? explicitIds : uniqueNumbers(providers.map((provider) => provider.id));
  const names = explicitNames.length ? [...new Set(explicitNames)] : [...new Set(providers.map((provider) => provider.name))];
  const rentBuyIds = availabilityProviderIds(availability, ["rent", "buy"]);
  return { availability, ids, names, rentBuyIds };
}

export function evaluateOttHardFilter(item = {}, filters = []) {
  const selected = selectedOttEntries(filters);
  if (!selected.length) return { status: "not-selected", pass: true, reason: "", selectedProviderIds: [] };

  const selectedProviderIds = selected.map((entry) => entry.providerId);
  const { availability, ids, names, rentBuyIds } = streamingProviderMetadata(item);
  if (availability.region !== "KR") {
    return { status: "fail", pass: false, reason: "ott-region-unavailable", selectedProviderIds, actualProviderIds: ids, actualProviders: names };
  }
  if (!ids.length) {
    const rentBuyOnly = rentBuyIds.length > 0;
    return {
      status: rentBuyOnly ? "fail" : "unknown",
      pass: false,
      reason: rentBuyOnly ? "ott-streaming-tier-unavailable" : "ott-provider-unknown",
      selectedProviderIds,
      actualProviderIds: ids,
      actualProviders: names,
    };
  }
  const pass = ids.some((id) => selectedProviderIds.includes(id));
  return {
    status: pass ? "pass" : "fail",
    pass,
    reason: pass ? "" : "ott-provider-mismatch",
    selectedProviderIds,
    actualProviderIds: ids,
    actualProviders: names,
  };
}

export function selectedRuntimeFilter(filters = []) {
  const value = (Array.isArray(filters) ? filters : []).find((filter) => RUNTIME_FILTERS[filter]);
  return value ? RUNTIME_FILTERS[value] : null;
}

export function runtimeConstraintFromFilters(filters = []) {
  const constraints = (Array.isArray(filters) ? filters : [])
    .map((filter) => RUNTIME_FILTERS[filter])
    .filter(Boolean);
  if (!constraints.length) return {};

  const maxValues = constraints.map((constraint) => constraint.max).filter(Number.isFinite);
  const minValues = constraints.map((constraint) => constraint.min).filter(Number.isFinite);
  const runtime = {};

  if (maxValues.length) runtime.max = Math.min(...maxValues);
  if (minValues.length) runtime.min = Math.max(...minValues);
  if (Number.isFinite(runtime.max) && Number.isFinite(runtime.min) && runtime.min > runtime.max) return {};
  return runtime;
}

export function runtimeMinutesForItem(item = {}) {
  const direct = Number(item.runtimeMinutes ?? item.runtime);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const episodeValues = item.episodeRunTime || item.episode_run_time || [];
  const representative = (Array.isArray(episodeValues) ? episodeValues : [episodeValues])
    .map(Number)
    .find((value) => Number.isFinite(value) && value > 0);
  return representative || null;
}

export function evaluateRuntimeHardFilter(item = {}, filters = []) {
  const selected = selectedRuntimeFilter(filters);
  if (!selected) return { status: "not-selected", pass: true, reason: "", runtimeMinutes: runtimeMinutesForItem(item) };
  const runtimeMinutes = runtimeMinutesForItem(item);
  if (!Number.isFinite(runtimeMinutes)) {
    return { status: "unknown", pass: false, reason: "runtime-unknown", runtimeMinutes: null, selected: selected.value };
  }
  const pass = (!Number.isFinite(selected.max) || runtimeMinutes <= selected.max) &&
    (!Number.isFinite(selected.min) || runtimeMinutes >= selected.min);
  return {
    status: pass ? "pass" : "fail",
    pass,
    reason: pass ? "" : "runtime-mismatch",
    runtimeMinutes,
    selected: selected.value,
  };
}

export function runtimeFilterValuesForItem(item = {}) {
  return Object.keys(RUNTIME_FILTERS).filter((value) => evaluateRuntimeHardFilter(item, [value]).pass);
}

export function evaluateHardFilters(item = {}, { contentTypes = [], filters = [] } = {}) {
  const contentType = contentTypeMatrixDiagnostics(item, contentTypes, filters);
  const ott = evaluateOttHardFilter(item, filters);
  const runtime = evaluateRuntimeHardFilter(item, filters);
  const exclusionReason = !contentType.pass
    ? "content-type-mismatch"
    : !ott.pass
      ? ott.reason
      : !runtime.pass
        ? runtime.reason
        : "";
  return {
    pass: !exclusionReason,
    exclusionReason,
    providerMediaType: contentType.providerMediaType,
    displayContentType: contentType.displayContentType,
    runtimeMinutes: runtime.runtimeMinutes,
    actualStreamingProviderIds: ott.actualProviderIds || streamingProviderMetadata(item).ids,
    actualStreamingProviders: ott.actualProviders || streamingProviderMetadata(item).names,
    hardFilterStatus: {
      contentType: contentType.pass ? "pass" : "fail",
      country: item.countryMatched === false ? "fail" : item.countryValidation === "unknown" ? "unknown" : "pass",
      genre: item.genreMatched === false ? "fail" : "pass",
      ott: ott.status,
      runtime: runtime.status,
    },
  };
}

export function ottDiscoverParameters(filters = []) {
  const entries = selectedOttEntries(filters);
  if (!entries.length) return {};
  return {
    watch_region: "KR",
    with_watch_providers: entries.map((entry) => entry.providerId).join("|"),
    with_watch_monetization_types: "flatrate|free|ads",
  };
}
