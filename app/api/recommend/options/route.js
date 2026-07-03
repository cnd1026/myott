import { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } from "../../../../src/lib/providers/registry";

async function recommendWithProvider(provider, filters, contentTypes, message) {
  const results = await provider.getRecommendations({
    filters,
    contentTypes,
    limit: 12,
  });

  return {
    source: provider.id,
    providerId: provider.id,
    providerName: provider.name,
    tmdbEnabled: isTmdbProviderEnabled(),
    results,
    message,
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
        providerId: activeProvider.id,
        tmdbEnabled: isTmdbProviderEnabled(),
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
      await recommendWithProvider(activeProvider, filters, contentTypes, "TMDB API key is not configured. Mock Provider results are used."),
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
    return Response.json(await recommendWithProvider(fallbackProvider, filters, contentTypes, `${message} Mock Provider results are used.`), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
