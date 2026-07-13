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

export function buildSeedCoverageMessage(metadata = {}) {
  const requested = Number(metadata.rawInputCount ?? metadata.requestedSeedCount ?? 0);
  const processed = Number(metadata.processedWorkCount ?? metadata.processedSeedCount ?? 0);
  const unresolved = Number(metadata.unresolvedSeedCount || 0);
  const hasUniqueWorkMetadata = Number.isFinite(Number(metadata.uniqueResolvedWorkCount));
  const uniqueWorks = hasUniqueWorkMetadata ? Number(metadata.uniqueResolvedWorkCount) : processed;
  if (!requested) return "";
  if (hasUniqueWorkMetadata && requested > uniqueWorks && processed === uniqueWorks && unresolved === 0 && uniqueWorks > 0) {
    return `입력한 ${requested}개 제목을 ${uniqueWorks}개 작품으로 확인해 추천에 반영했습니다.`;
  }
  if (unresolved > 0 && processed > 0) {
    return `입력한 작품 중 ${unresolved}개를 찾지 못해 확인된 작품을 중심으로 추천했습니다.`;
  }
  if (processed >= requested) return `입력한 ${requested}개 작품을 모두 추천에 반영했습니다.`;
  if (processed > 0) return `입력한 ${requested}개 작품 중 ${processed}개를 이번 추천에 반영했습니다.`;
  return "입력한 작품을 추천에 반영하지 못했습니다.";
}

export function resolveEmptyStateMessage({
  recommendationStatus = "idle",
  selectedTypes = [],
  resultCount = 0,
  dataSource = "",
  hasSeedInput = false,
  processedSeedCount = 0,
  unresolvedSeedCount = 0,
} = {}) {
  if (resultCount > 0 || recommendationStatus === "loading") return "";
  if (recommendationStatus === "idle") return "작품을 입력하거나 추천 옵션을 고르면 결과가 여기에 표시됩니다.";
  if (!selectedTypes.length) return "영화, 드라마, 애니 중 하나 이상 선택해 주세요.";
  if (recommendationStatus === "error" || dataSource === "error") {
    return "추천 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (hasSeedInput && processedSeedCount === 0 && unresolvedSeedCount > 0) {
    return "입력한 작품을 찾지 못했습니다. 작품 제목을 확인하거나 자동완성에서 작품을 선택해 주세요.";
  }
  if (hasSeedInput && processedSeedCount > 0) {
    return "확인된 작품을 중심으로 추천했지만 조건에 맞는 결과가 부족합니다.";
  }
  return "선택한 조건에 맞는 작품을 찾지 못했습니다. 장르나 국가 조건을 조금 넓혀 보세요.";
}
