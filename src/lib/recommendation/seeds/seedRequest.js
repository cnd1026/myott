import { DEFAULT_UI_LOCALE } from "../../i18n/localeContract.js";
import { getMessage } from "../../i18n/messageCatalog.js";

const normalizeKey = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

function confirmedSeedFromSuggestion(inputTitle, suggestion = {}) {
  const tmdbId = Number(suggestion.tmdbId || suggestion.providerContentId);
  if (!Number.isFinite(tmdbId)) return null;
  const mediaType = suggestion.mediaType || (suggestion.type === "drama" ? "tv" : "movie");
  return {
    inputTitle,
    displayTitle: inputTitle,
    tmdbId,
    mediaType,
    contentType: suggestion.type || (mediaType === "tv" ? "drama" : "movie"),
    year: Number(suggestion.year) || 0,
    resolvedTitle: suggestion.resolvedTitle || suggestion.title || inputTitle,
    originalTitle: suggestion.originalTitle || suggestion.title || inputTitle,
  };
}

export function applySuggestionSelection(inputTitle, suggestion = {}) {
  return {
    inputValue: inputTitle,
    confirmedSeed: confirmedSeedFromSuggestion(inputTitle, suggestion),
  };
}

export function buildSeedRequestPayload({
  titles = [],
  confirmedSeeds = {},
  contentTypes = [],
  filters = [],
} = {}) {
  const seeds = [];
  const directTitles = [];
  const workIndex = new Map();
  const confirmedAliases = new Set();

  titles.forEach((rawTitle, index) => {
    const inputTitle = typeof rawTitle === "string" ? rawTitle : "";
    if (!inputTitle.trim()) return;
    const confirmed = confirmedSeedFromSuggestion(inputTitle, confirmedSeeds[index]);
    if (!confirmed) {
      directTitles.push(inputTitle);
      return;
    }

    const workKey = `${confirmed.mediaType}:${confirmed.tmdbId}`;
    const aliases = [confirmed.inputTitle, confirmed.resolvedTitle, confirmed.originalTitle]
      .map(normalizeKey)
      .filter(Boolean);
    aliases.forEach((alias) => confirmedAliases.add(alias));
    if (workIndex.has(workKey)) {
      const existing = seeds[workIndex.get(workKey)];
      existing.inputAliases = [...new Set([...(existing.inputAliases || []), inputTitle])];
      return;
    }
    workIndex.set(workKey, seeds.length);
    seeds.push({ ...confirmed, inputAliases: [inputTitle] });
  });

  return {
    seeds,
    titles: directTitles.filter((title) => !confirmedAliases.has(normalizeKey(title))),
    contentTypes: [...contentTypes],
    filters: [...filters],
  };
}

export function buildSeedCoverageMessage(metadata = {}, locale = DEFAULT_UI_LOCALE) {
  const requested = Number(metadata.rawInputCount ?? metadata.requestedSeedCount ?? 0);
  const processed = Number(metadata.processedWorkCount ?? metadata.processedSeedCount ?? 0);
  const unresolved = Number(metadata.unresolvedSeedCount || 0);
  const hasUniqueWorkMetadata = Number.isFinite(Number(metadata.uniqueResolvedWorkCount));
  const uniqueWorks = hasUniqueWorkMetadata ? Number(metadata.uniqueResolvedWorkCount) : processed;
  if (!requested) return "";
  if (hasUniqueWorkMetadata && requested > uniqueWorks && processed === uniqueWorks && unresolved === 0 && uniqueWorks > 0) {
    return getMessage(locale, "seedCoverage.deduplicated", { requested, unique: uniqueWorks });
  }
  if (unresolved > 0 && processed > 0) {
    return getMessage(locale, "seedCoverage.unresolved", { unresolved });
  }
  if (processed >= requested) return getMessage(locale, "seedCoverage.all", { requested });
  if (processed > 0) return getMessage(locale, "seedCoverage.partial", { requested, processed });
  return getMessage(locale, "seedCoverage.none");
}

export function resolveEmptyStateMessage({
  recommendationStatus = "idle",
  selectedTypes = [],
  resultCount = 0,
  dataSource = "",
  hasSeedInput = false,
  processedSeedCount = 0,
  unresolvedSeedCount = 0,
} = {}, locale = DEFAULT_UI_LOCALE) {
  if (resultCount > 0 || recommendationStatus === "loading") return "";
  if (recommendationStatus === "idle") return getMessage(locale, "results.idle");
  if (!selectedTypes.length) return getMessage(locale, "results.selectContentType");
  if (recommendationStatus === "error" || dataSource === "error") {
    return getMessage(locale, "results.error");
  }
  if (hasSeedInput && processedSeedCount === 0 && unresolvedSeedCount > 0) {
    return getMessage(locale, "results.seedNotFound");
  }
  if (hasSeedInput && processedSeedCount > 0) {
    return getMessage(locale, "results.seedInsufficient");
  }
  return getMessage(locale, "results.filtersTooNarrow");
}
