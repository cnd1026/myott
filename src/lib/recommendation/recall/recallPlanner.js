import {
  normalizeDisplayContentType,
  normalizeProviderMediaType,
} from "../filters/hardFilterContract.js";
import {
  genreContractFor,
  selectedTaxonomyFilters,
} from "../genres/genreContract.js";

const TYPE_ORDER = Object.freeze(["movie", "drama", "animation"]);

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function normalizeRequestedTypes(contentTypes = []) {
  return unique(contentTypes.map((value) => {
    if (["tv", "series"].includes(value)) return "drama";
    return TYPE_ORDER.includes(value) ? value : "";
  }));
}

export function minimumTypeCoverage(contentTypes = []) {
  const types = normalizeRequestedTypes(contentTypes);
  if (types.length >= 3) return 2;
  if (types.length === 2) return 3;
  return 0;
}

export function contentTypeCounts(items = []) {
  return items.reduce((counts, item) => {
    const type = normalizeDisplayContentType(item);
    if (TYPE_ORDER.includes(type)) counts[type] += 1;
    return counts;
  }, { movie: 0, drama: 0, animation: 0 });
}

export function providerMediaTypeCounts(items = []) {
  return items.reduce((counts, item) => {
    const type = normalizeProviderMediaType(item);
    if (type === "movie" || type === "tv") counts[type] += 1;
    return counts;
  }, { movie: 0, tv: 0 });
}

function normalizeSeedTitle(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function seedKeysForItem(item = {}) {
  return unique([
    ...(item.reasonSeeds || []),
    item.reasonSeed,
    ...(item.seedTitles || []),
    item.seedTitle,
  ].map(normalizeSeedTitle));
}

export function assembleBalancedExactResults({
  rankedItems = [],
  seedTitles = [],
  contentTypes = [],
  limit = 12,
} = {}) {
  const boundedLimit = Math.max(0, Number(limit || 0));
  const ranked = rankedItems.slice();
  const rankByItem = new Map(ranked.map((item, index) => [item, index]));
  const requestedTypes = normalizeRequestedTypes(contentTypes);
  const availableByType = contentTypeCounts(ranked);
  const typeCoverage = typeCoverageState(availableByType, requestedTypes, { finalLimit: boundedLimit });
  const normalizedSeeds = unique(seedTitles.map(normalizeSeedTitle));
  const availableSeedKeys = normalizedSeeds.filter((seed) => ranked.some((item) => seedKeysForItem(item).includes(seed)));
  const selected = [];
  const selectedSet = new Set();
  const representedSeeds = new Set();
  const selectedByType = { movie: 0, drama: 0, animation: 0 };

  const add = (item) => {
    if (!item || selectedSet.has(item) || selected.length >= boundedLimit) return false;
    selected.push(item);
    selectedSet.add(item);
    const type = normalizeDisplayContentType(item);
    if (TYPE_ORDER.includes(type)) selectedByType[type] += 1;
    seedKeysForItem(item).forEach((seed) => {
      if (availableSeedKeys.includes(seed)) representedSeeds.add(seed);
    });
    return true;
  };

  const bestCandidate = (predicate, score) => {
    let best = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const item of ranked) {
      if (selectedSet.has(item) || !predicate(item)) continue;
      const candidateScore = score(item);
      if (candidateScore > bestScore) {
        best = item;
        bestScore = candidateScore;
      }
    }
    return best;
  };

  // Type coverage is the hard reservation. Within each bucket, prefer a card
  // that also represents as-yet-uncovered seeds so one slot can satisfy both.
  const typesByScarcity = [...requestedTypes].sort((left, right) => (
    Number(availableByType[left] || 0) - Number(availableByType[right] || 0) ||
    requestedTypes.indexOf(left) - requestedTypes.indexOf(right)
  ));
  for (const type of typesByScarcity) {
    const target = Math.min(
      Number(typeCoverage.targets[type] || 0),
      Number(availableByType[type] || 0),
      boundedLimit,
    );
    while (selectedByType[type] < target && selected.length < boundedLimit) {
      const item = bestCandidate(
        (candidate) => normalizeDisplayContentType(candidate) === type,
        (candidate) => {
          const uncoveredSeeds = seedKeysForItem(candidate)
            .filter((seed) => availableSeedKeys.includes(seed) && !representedSeeds.has(seed))
            .length;
          return uncoveredSeeds * (ranked.length + 1) - Number(rankByItem.get(candidate) || 0);
        },
      );
      if (!add(item)) break;
    }
  }

  // Seed representation is best-effort after hard type coverage. Common
  // candidates can cover several seeds, but can no longer consume all slots
  // before the requested content types have been reserved.
  while (selected.length < boundedLimit) {
    const uncovered = availableSeedKeys.filter((seed) => !representedSeeds.has(seed));
    if (!uncovered.length) break;
    const item = bestCandidate(
      (candidate) => seedKeysForItem(candidate).some((seed) => uncovered.includes(seed)),
      (candidate) => {
        const coverage = seedKeysForItem(candidate).filter((seed) => uncovered.includes(seed)).length;
        return coverage * (ranked.length + 1) - Number(rankByItem.get(candidate) || 0);
      },
    );
    if (!add(item)) break;
  }

  for (const item of ranked) {
    if (selected.length >= boundedLimit) break;
    add(item);
  }

  selected.sort((left, right) => Number(rankByItem.get(left) || 0) - Number(rankByItem.get(right) || 0));
  const selectedCounts = contentTypeCounts(selected);
  const selectedSeedKeys = new Set(selected.flatMap(seedKeysForItem));
  return {
    selected,
    diagnostics: {
      availableExactByType: availableByType,
      selectedExactByType: selectedCounts,
      seedAvailability: Object.fromEntries(normalizedSeeds.map((seed) => [
        seed,
        ranked.filter((item) => seedKeysForItem(item).includes(seed)).length,
      ])),
      representedSeeds: availableSeedKeys.filter((seed) => selectedSeedKeys.has(seed)),
      seedRepresentationShortfall: availableSeedKeys.filter((seed) => !selectedSeedKeys.has(seed)),
    },
  };
}

export function typeCoverageState(countsByType = {}, contentTypes = [], { finalLimit = 12 } = {}) {
  const types = normalizeRequestedTypes(contentTypes);
  const minimum = minimumTypeCoverage(types);
  const available = Object.fromEntries(types.map((type) => [type, Number(countsByType[type] || 0)]));
  const targets = Object.fromEntries(types.map((type) => {
    if (types.length === 2 && types.every((entry) => Number(countsByType[entry] || 0) >= 4)) {
      return [type, Math.min(4, finalLimit)];
    }
    return [type, Math.min(minimum, finalLimit)];
  }));
  const shortfall = Object.fromEntries(types.map((type) => [
    type,
    Math.max(0, Number(targets[type] || 0) - Number(available[type] || 0)),
  ]));
  return {
    types,
    minimum,
    available,
    targets,
    shortfall,
    covered: types.length <= 1 || types.every((type) => shortfall[type] === 0),
  };
}

export function shouldStopRecall({
  exactCount = 0,
  exactTarget = 12,
  countsByType = {},
  contentTypes = [],
  semanticEvidencePending = false,
  seedSourceCoveragePending = false,
} = {}) {
  const coverage = typeCoverageState(countsByType, contentTypes, { finalLimit: exactTarget });
  return Number(exactCount || 0) >= Number(exactTarget || 0) &&
    coverage.covered &&
    !semanticEvidencePending &&
    !seedSourceCoveragePending;
}

export function planAdaptiveDiscoverTasks(
  tasks = [],
  {
    countsByType = {},
    contentTypes = [],
    remainingListBudget = tasks.length,
    initialStage = false,
  } = {},
) {
  const requestedTypes = normalizeRequestedTypes(contentTypes);
  const coverage = typeCoverageState(countsByType, requestedTypes);
  const indexed = tasks.map((task, index) => ({ task, index }));
  indexed.sort((left, right) => {
    const leftType = left.task.request?.contentType || "";
    const rightType = right.task.request?.contentType || "";
    const leftMissing = initialStage || Number(coverage.shortfall[leftType] || 0) > 0;
    const rightMissing = initialStage || Number(coverage.shortfall[rightType] || 0) > 0;
    return Number(rightMissing) - Number(leftMissing) ||
      Number(countsByType[leftType] || 0) - Number(countsByType[rightType] || 0) ||
      left.index - right.index;
  });
  return indexed.slice(0, Math.max(0, Number(remainingListBudget || 0))).map(({ task }) => task);
}

function roundRobinGroups(groups = [], limit = Number.POSITIVE_INFINITY) {
  const result = [];
  let cursor = 0;
  while (result.length < limit) {
    let added = false;
    for (const group of groups) {
      const item = group[cursor];
      if (!item) continue;
      result.push(item);
      added = true;
      if (result.length >= limit) break;
    }
    if (!added) break;
    cursor += 1;
  }
  return result;
}

function sourceDiverseOrder(groups = [], rankByItem = new Map()) {
  const heads = groups
    .map((group) => group[0])
    .filter(Boolean)
    .sort((left, right) => Number(rankByItem.get(left) || 0) - Number(rankByItem.get(right) || 0));
  const selected = new Set(heads);
  const remaining = groups
    .flat()
    .filter((item) => !selected.has(item))
    .sort((left, right) => Number(rankByItem.get(left) || 0) - Number(rankByItem.get(right) || 0));
  return [...heads, ...remaining];
}

function semanticFamiliesForItem(item = {}, filters = []) {
  const ids = new Set((item.providerGenreIds || item.genreIds || item.genre_ids || []).map(Number));
  return unique([
    ...selectedTaxonomyFilters(filters),
    ...(item.crossMediaSeedTransferValues || item.crossMediaSeedGenreValues || []),
  ].map((value) => {
    const contract = genreContractFor(value);
    if (!contract) return "";
    const mediaType = normalizeProviderMediaType(item) || "movie";
    const policy = contract[mediaType];
    const providerEvidence = [
      ...policy.providerExactIds,
      ...policy.providerCombinedIds,
      ...policy.providerAdjacentIds,
    ].some((id) => ids.has(id));
    return providerEvidence ? contract.specializationGroup || contract.value : "";
  }));
}

function detailSourceKey(item = {}, filters = []) {
  const displayType = normalizeDisplayContentType(item) || "unknown";
  const providerType = normalizeProviderMediaType(item) || "unknown";
  const source = item.candidateSource || "unknown-source";
  const families = semanticFamiliesForItem(item, filters);
  return `${displayType}:${displayType === "animation" ? providerType : "shared"}:${families.join("+") || "general"}:${source}`;
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function planDetailAllocation(
  orderedCandidates = [],
  {
    filters = [],
    contentTypes = [],
    limit = 16,
  } = {},
) {
  const requestedTypes = normalizeRequestedTypes(contentTypes);
  const types = requestedTypes.length ? requestedTypes : TYPE_ORDER;
  const rankByItem = new Map(orderedCandidates.map((item, index) => [item, index]));
  const sourceBuckets = new Map();
  for (const item of orderedCandidates) {
    const key = detailSourceKey(item, filters);
    if (!sourceBuckets.has(key)) sourceBuckets.set(key, []);
    sourceBuckets.get(key).push(item);
  }

  const byType = new Map(types.map((type) => [type, []]));
  for (const [key, group] of sourceBuckets) {
    const type = key.split(":")[0];
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(group);
  }
  const orderedByType = new Map(
    [...byType].map(([type, groups]) => [type, sourceDiverseOrder(groups, rankByItem)]),
  );
  const selected = roundRobinGroups(
    types.map((type) => orderedByType.get(type) || []),
    Math.min(Math.max(0, Number(limit || 0)), orderedCandidates.length),
  );
  const selectedSet = new Set(selected);
  const skipped = orderedCandidates.filter((item) => !selectedSet.has(item));
  const selectedFamilies = countBy(
    selected.flatMap((item) => semanticFamiliesForItem(item, filters).map((family) => ({ family }))),
    (entry) => entry.family,
  );

  return {
    selected,
    skipped,
    diagnostics: {
      detailEligibleCount: orderedCandidates.length,
      detailSelectedCount: selected.length,
      detailSelectedByMediaType: countBy(selected, (item) => normalizeProviderMediaType(item)),
      detailSelectedByContentType: countBy(selected, (item) => normalizeDisplayContentType(item)),
      detailSelectedBySemanticFamily: selectedFamilies,
      detailSkippedCount: skipped.length,
      detailSkippedByReason: skipped.length ? { "detail-budget-limit": skipped.length } : {},
    },
  };
}

export function reserveTypeCoverage(items = [], contentTypes = [], limit = 12) {
  const types = normalizeRequestedTypes(contentTypes);
  if (types.length <= 1) return items.slice(0, limit);
  const available = contentTypeCounts(items);
  const coverage = typeCoverageState(available, types, { finalLimit: limit });
  const selected = [];
  const selectedSet = new Set();

  for (const type of types) {
    let reserved = 0;
    for (const item of items) {
      if (reserved >= coverage.targets[type] || selected.length >= limit) break;
      if (normalizeDisplayContentType(item) !== type || selectedSet.has(item)) continue;
      selected.push(item);
      selectedSet.add(item);
      reserved += 1;
    }
  }
  for (const item of items) {
    if (selected.length >= limit) break;
    if (selectedSet.has(item)) continue;
    selected.push(item);
    selectedSet.add(item);
  }
  return selected;
}

export function planCrossMediaTargets({
  seedContentType = "",
  contentTypes = [],
  exactCountsByType = {},
} = {}) {
  const requestedTypes = normalizeRequestedTypes(contentTypes);
  const coverage = typeCoverageState(exactCountsByType, requestedTypes);
  return requestedTypes
    .filter((type) => Number(coverage.shortfall[type] || 0) > 0)
    .sort((left, right) => (
      Number(left === seedContentType) - Number(right === seedContentType) ||
      Number(exactCountsByType[left] || 0) - Number(exactCountsByType[right] || 0) ||
      requestedTypes.indexOf(left) - requestedTypes.indexOf(right)
    ));
}

export function classifyRecallAvailability({
  providerTotal = null,
  uniqueRawCount = null,
  exactAvailable = null,
  target = 0,
  detailEligibleCount = null,
  detailSelectedCount = null,
} = {}) {
  if (!Number.isFinite(providerTotal) || !Number.isFinite(exactAvailable)) return "not-provided";
  if (exactAvailable >= target) return "sufficient";
  const fullProviderPoolFetched = Number.isFinite(uniqueRawCount) && uniqueRawCount >= providerTotal;
  const allDetailEligibleInspected = Number.isFinite(detailEligibleCount) &&
    Number.isFinite(detailSelectedCount) &&
    detailSelectedCount >= detailEligibleCount;
  if (fullProviderPoolFetched && allDetailEligibleInspected) return "provider-scarcity";
  if (Number.isFinite(detailEligibleCount) && Number.isFinite(detailSelectedCount) && detailSelectedCount < detailEligibleCount) {
    return "detail-budget-unresolved";
  }
  return "retrieval-recall-failure";
}