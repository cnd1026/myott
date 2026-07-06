import { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } from "../../../../src/lib/providers/registry";

function sourceMetadata(provider, { message = "", fallbackUsed = false, fallbackReason = "", dataSource } = {}) {
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

async function recommendWithProvider(provider, filters, contentTypes, sourceOptions = {}) {
  const results = await provider.getRecommendations({
    filters,
    contentTypes,
    limit: 12,
  });
  const metadata = sourceMetadata(provider, sourceOptions);
  const dataSource = !metadata.fallbackUsed && !results.length ? "empty" : metadata.dataSource;

  return {
    ...metadata,
    dataSource,
    results,
  };
}

export async function GET(request) {
  const filters = request.nextUrl.searchParams.get("filters")?.split(",").map((value) => value.trim()).filter(Boolean) || [];
  const contentTypes = request.nextUrl.searchParams.get("types")?.split(",").map((value) => value.trim()).filter(Boolean) || [];
  const activeProvider = getActiveProvider();

  if (!filters.length && !contentTypes.length) {
    return Response.json(
      {
        source: "empty",
        dataSource: "empty",
        providerId: activeProvider.id,
        tmdbEnabled: isTmdbProviderEnabled(),
        fallbackUsed: false,
        fallbackReason: "",
        results: [],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (activeProvider.id === "mock") {
    return Response.json(
      await recommendWithProvider(activeProvider, filters, contentTypes, {
        dataSource: "fallback",
        fallbackUsed: true,
        fallbackReason: "TMDB API key is not configured.",
        message: "TMDB API key is not configured. Mock Provider results are used.",
      }),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    return Response.json(await recommendWithProvider(activeProvider, filters, contentTypes), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const fallbackProvider = getFallbackProvider();
    const message = error instanceof Error ? error.message : "TMDb option recommendation failed.";
    return Response.json(await recommendWithProvider(fallbackProvider, filters, contentTypes, {
      dataSource: "fallback",
      fallbackUsed: true,
      fallbackReason: message,
      message: `${message} Mock Provider results are used.`,
    }), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
