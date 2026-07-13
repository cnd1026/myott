import {
  getActiveProvider,
  getFallbackProvider,
  isTmdbProviderEnabled,
} from "../../../../src/lib/providers/registry";

function sourceMetadata(provider, {
  message = "",
  fallbackUsed = false,
  fallbackReason = "",
  dataSource,
} = {}) {
  return {
    source: provider.id,
    dataSource: dataSource || (fallbackUsed ? "fallback" : provider.id),
    providerId: provider.id,
    providerName: provider.name,
    tmdbEnabled: isTmdbProviderEnabled(),
    fallbackUsed,
    fallbackReason,
    message,
  };
}

function stringArray(value) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function confirmedSeedArray(value) {
  return (Array.isArray(value) ? value : [])
    .filter((seed) => seed && typeof seed === "object")
    .map((seed) => ({
      inputTitle: typeof seed.inputTitle === "string" ? seed.inputTitle : "",
      inputAliases: stringArray(seed.inputAliases),
      tmdbId: Number(seed.tmdbId || seed.providerContentId),
      mediaType: typeof seed.mediaType === "string" ? seed.mediaType : "",
      contentType: typeof seed.contentType === "string" ? seed.contentType : "",
      resolvedTitle: typeof seed.resolvedTitle === "string" ? seed.resolvedTitle : "",
      originalTitle: typeof seed.originalTitle === "string" ? seed.originalTitle : "",
    }))
    .filter((seed) => Number.isFinite(seed.tmdbId));
}

async function recommendWithProvider(
  provider,
  { titles, seeds, filters, contentTypes },
  sourceOptions = {},
) {
  const payload = await provider.getSeedRecommendations({
    titles,
    seeds,
    filters,
    contentTypes,
    limit: 12,
  });
  const results = Array.isArray(payload) ? payload : payload.results || [];
  const metadata = sourceMetadata(provider, sourceOptions);
  const dataSource = !metadata.fallbackUsed && !results.length ? "empty" : metadata.dataSource;

  return {
    ...metadata,
    dataSource,
    results,
    relaxedResults: Array.isArray(payload) ? [] : payload.relaxedResults || [],
    seedResults: Array.isArray(payload) ? [] : payload.seedResults || [],
    processedSeeds: Array.isArray(payload) ? [] : payload.processedSeeds || [],
    unresolvedSeeds: Array.isArray(payload) ? [] : payload.unresolvedSeeds || [],
    deferredSeeds: Array.isArray(payload) ? [] : payload.deferredSeeds || [],
    requestedSeedCount: Array.isArray(payload) ? titles.length : payload.requestedSeedCount || 0,
    rawInputCount: Array.isArray(payload) ? titles.length : payload.rawInputCount || payload.requestedSeedCount || 0,
    normalizedInputCount: Array.isArray(payload) ? titles.length : payload.normalizedInputCount || 0,
    uniqueInputAliasCount: Array.isArray(payload) ? titles.length : payload.uniqueInputAliasCount || payload.inputAliasCount || 0,
    processedSeedCount: Array.isArray(payload) ? 0 : payload.processedSeedCount || 0,
    processedWorkCount: Array.isArray(payload) ? 0 : payload.processedWorkCount || 0,
    unresolvedSeedCount: Array.isArray(payload) ? 0 : payload.unresolvedSeedCount || 0,
    unresolvedRawInputCount: Array.isArray(payload) ? 0 : payload.unresolvedRawInputCount || 0,
    deferredSeedCount: Array.isArray(payload) ? 0 : payload.deferredSeedCount || 0,
    deferredRawInputCount: Array.isArray(payload) ? 0 : payload.deferredRawInputCount || 0,
    uniqueResolvedWorkCount: Array.isArray(payload) ? 0 : payload.uniqueResolvedWorkCount || 0,
    confirmedSeedCount: Array.isArray(payload) ? 0 : payload.confirmedSeedCount || 0,
    unconfirmedSeedCount: Array.isArray(payload) ? titles.length : payload.unconfirmedSeedCount || 0,
    searchSkippedSeedCount: Array.isArray(payload) ? 0 : payload.searchSkippedSeedCount || 0,
    resolvedByConfirmedMetadataCount: Array.isArray(payload) ? 0 : payload.resolvedByConfirmedMetadataCount || 0,
    resolvedBySearchCount: Array.isArray(payload) ? 0 : payload.resolvedBySearchCount || 0,
    inputAliasCount: Array.isArray(payload) ? titles.length : payload.inputAliasCount || 0,
    eligibleLaterSeedDeferredCount: Array.isArray(payload) ? 0 : payload.eligibleLaterSeedDeferredCount || 0,
    diagnostics: Array.isArray(payload) ? {} : payload.diagnostics || {},
  };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = {
    titles: stringArray(body?.titles),
    seeds: confirmedSeedArray(body?.seeds),
    contentTypes: stringArray(body?.contentTypes),
    filters: stringArray(body?.filters),
  };
  const activeProvider = getActiveProvider();

  if (!input.titles.length && !input.seeds.length) {
    return Response.json({
      source: "empty",
      dataSource: "empty",
      providerId: activeProvider.id,
      providerName: activeProvider.name,
      tmdbEnabled: isTmdbProviderEnabled(),
      fallbackUsed: false,
      fallbackReason: "",
      results: [],
      relaxedResults: [],
      seedResults: [],
      processedSeeds: [],
      unresolvedSeeds: [],
      deferredSeeds: [],
      requestedSeedCount: 0,
      rawInputCount: 0,
      normalizedInputCount: 0,
      uniqueInputAliasCount: 0,
      processedSeedCount: 0,
      processedWorkCount: 0,
      unresolvedSeedCount: 0,
      unresolvedRawInputCount: 0,
      deferredSeedCount: 0,
      deferredRawInputCount: 0,
      diagnostics: {},
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (activeProvider.id === "mock") {
    return Response.json(await recommendWithProvider(activeProvider, input, {
      dataSource: "fallback",
      fallbackUsed: true,
      fallbackReason: "TMDB API key is not configured.",
      message: "TMDB API key is not configured. Mock Provider results are used.",
    }), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    return Response.json(await recommendWithProvider(activeProvider, input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const fallbackProvider = getFallbackProvider();
    const message = error instanceof Error ? error.message : "TMDB multi-seed recommendation failed.";
    return Response.json(await recommendWithProvider(fallbackProvider, input, {
      dataSource: "fallback",
      fallbackUsed: true,
      fallbackReason: message,
      message: `${message} Mock Provider results are used.`,
    }), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
