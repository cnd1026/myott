const normalizeWhitespace = (value) => String(value || "").trim().replace(/\s+/g, " ");

export function normalizeSeedKey(value) {
  return normalizeWhitespace(value).toLocaleLowerCase();
}

export function normalizeSeedTitles(values = []) {
  const requestedSeeds = (Array.isArray(values) ? values : []).filter((value) => typeof value === "string");
  const seen = new Set();
  const entries = [];

  for (const originalTitle of requestedSeeds) {
    const title = normalizeWhitespace(originalTitle);
    const key = normalizeSeedKey(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    entries.push({ originalTitle, title, key });
  }

  return {
    requestedSeeds,
    normalizedSeeds: entries.map((entry) => entry.title),
    entries,
  };
}

function normalizedMediaType(value) {
  return ["tv", "drama", "series"].includes(String(value || "").toLowerCase()) ? "tv" : "movie";
}

export function normalizeSeedInputs({ titles = [], seeds = [] } = {}) {
  const confirmedByWork = new Map();
  const confirmedAliasKeys = new Set();
  const requestedSeeds = [];
  const rawInputs = [];

  for (const seed of Array.isArray(seeds) ? seeds : []) {
    if (!seed || typeof seed !== "object") continue;
    const tmdbId = Number(seed.tmdbId || seed.providerContentId);
    if (!Number.isFinite(tmdbId)) continue;
    const mediaType = normalizedMediaType(seed.mediaType || seed.contentType || seed.type);
    const inputAliases = uniqueStrings([
      ...(Array.isArray(seed.inputAliases) ? seed.inputAliases : []),
      seed.inputTitle,
      seed.displayTitle,
    ]);
    inputAliases.forEach((inputTitle) => rawInputs.push({ inputTitle, key: normalizeSeedKey(inputTitle), confirmed: true }));
    const resolvedTitle = normalizeWhitespace(seed.resolvedTitle || seed.title || inputAliases[0]);
    const originalTitle = normalizeWhitespace(seed.originalTitle || resolvedTitle);
    if (!inputAliases.length && !resolvedTitle) continue;
    requestedSeeds.push(...inputAliases);
    uniqueStrings([...inputAliases, resolvedTitle, originalTitle]).forEach((alias) => {
      confirmedAliasKeys.add(normalizeSeedKey(alias));
    });
    const workKey = `${mediaType}:${tmdbId}`;
    const current = confirmedByWork.get(workKey);
    if (current) {
      current.inputTitles = uniqueStrings([...current.inputTitles, ...inputAliases]);
      current.inputAliases = [...current.inputTitles];
      continue;
    }
    confirmedByWork.set(workKey, {
      originalTitle: inputAliases[0] || resolvedTitle,
      title: inputAliases[0] || resolvedTitle,
      key: normalizeSeedKey(inputAliases[0] || resolvedTitle),
      inputTitles: inputAliases.length ? inputAliases : [resolvedTitle],
      inputAliases: inputAliases.length ? inputAliases : [resolvedTitle],
      confirmed: true,
      workKey,
      seed: {
        tmdbId,
        mediaType,
        type: seed.contentType || (mediaType === "tv" ? "drama" : "movie"),
        title: resolvedTitle,
        originalTitle,
        genreIds: uniqueNumbers(seed.genreIds || []),
      },
    });
  }

  const unconfirmed = normalizeSeedTitles(titles);
  unconfirmed.requestedSeeds
    .map((inputTitle) => ({ inputTitle, key: normalizeSeedKey(inputTitle), confirmed: false }))
    .filter((entry) => entry.key)
    .forEach((entry) => rawInputs.push(entry));
  const unconfirmedEntries = unconfirmed.entries
    .filter((entry) => !confirmedAliasKeys.has(entry.key))
    .map((entry) => ({ ...entry, inputTitles: [entry.title], inputAliases: [entry.title], confirmed: false, seed: null }));
  requestedSeeds.push(...unconfirmed.requestedSeeds);
  const entries = [...confirmedByWork.values(), ...unconfirmedEntries];
  const uniqueInputAliasCount = new Set(requestedSeeds.map(normalizeSeedKey).filter(Boolean)).size;

  return {
    requestedSeeds,
    normalizedSeeds: entries.map((entry) => entry.title),
    entries,
    rawInputs,
    rawInputCount: rawInputs.length,
    normalizedInputCount: requestedSeeds.map(normalizeWhitespace).filter(Boolean).length,
    uniqueInputAliasCount,
    confirmedSeedCount: confirmedByWork.size,
    unconfirmedSeedCount: unconfirmedEntries.length,
    inputAliasCount: uniqueInputAliasCount,
  };
}

function candidateKey(item = {}) {
  const id = item.tmdbId || item.providerContentId || item.id;
  const mediaType = item.mediaType || item.contentType || item.type || "content";
  if (id) return `${mediaType}:${id}`;
  return `${mediaType}:${normalizeSeedKey(item.originalTitle || item.title)}`;
}

function candidateTitles(item = {}) {
  return [item.title, item.originalTitle, item.name, item.originalName]
    .map(normalizeSeedKey)
    .filter(Boolean);
}

function uniqueNumbers(values = []) {
  return [...new Set(values.map(Number).filter(Number.isFinite))];
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function mergeCandidate(existing, incoming) {
  const reasonSeeds = uniqueStrings([
    ...(existing.reasonSeeds || []),
    existing.reasonSeed,
    ...(incoming.reasonSeeds || []),
    incoming.reasonSeed,
  ]);
  const candidateSources = uniqueStrings([
    ...(existing.candidateSources || []),
    existing.candidateSource,
    ...(incoming.candidateSources || []),
    incoming.candidateSource,
  ]);

  return {
    ...existing,
    reasonSeed: reasonSeeds.length === 1 ? reasonSeeds[0] : "",
    reasonSeeds,
    seedTitle: reasonSeeds.length === 1 ? reasonSeeds[0] : "",
    seedTitles: reasonSeeds,
    seedCount: reasonSeeds.length,
    seedGenreIds: uniqueNumbers([
      ...(existing.seedGenreIds || []),
      ...(incoming.seedGenreIds || []),
    ]),
    seedSupplement: Boolean(existing.seedSupplement && incoming.seedSupplement),
    candidateSources,
    reason: reasonSeeds.length > 1 ? "여러 취향을 함께 반영한 추천" : existing.reason,
    popularity: Math.max(Number(existing.popularity || 0), Number(incoming.popularity || 0)),
    rating: Math.max(Number(existing.rating || 0), Number(incoming.rating || 0)),
  };
}

export function mergeMultiSeedCandidates(seedGroups = [], seedTitles = []) {
  const excludedTitles = new Set(seedTitles.map(normalizeSeedKey).filter(Boolean));
  const excludedIds = new Set(
    seedGroups.map((group) => group.seed?.tmdbId).filter(Boolean).map((value) => String(value)),
  );
  const merged = new Map();

  for (const group of seedGroups) {
    const reasonSeed = group.title || group.seed?.title;
    const seedGenreIds = group.seed?.genreIds || [];
    for (const candidate of group.candidates || []) {
      if (candidateTitles(candidate).some((title) => excludedTitles.has(title))) continue;
      if (candidate.tmdbId && excludedIds.has(String(candidate.tmdbId))) continue;

      const decorated = {
        ...candidate,
        reasonSeed,
        reasonSeeds: [reasonSeed],
        seedTitle: reasonSeed,
        seedTitles: [reasonSeed],
        seedCount: 1,
        seedGenreIds: uniqueNumbers([...(candidate.seedGenreIds || []), ...seedGenreIds]),
        seedSupplement: Boolean(candidate.seedSupplement || group.seedSupplement),
        candidateSources: uniqueStrings([candidate.candidateSource]),
      };
      const key = candidateKey(decorated);
      merged.set(key, merged.has(key) ? mergeCandidate(merged.get(key), decorated) : decorated);
    }
  }

  return [...merged.values()];
}
