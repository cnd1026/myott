import { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } from "../../../src/lib/providers/registry";

async function searchProvider(provider, query, contentTypes, message) {
  const results = await provider.search({ query, contentTypes });

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
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const contentTypes = request.nextUrl.searchParams.get("types")?.split(",").map((value) => value.trim()).filter(Boolean) || [];
  const activeProvider = getActiveProvider();
  const tmdbEnabled = isTmdbProviderEnabled();

  if (query.length < 2) {
    return Response.json(
      {
        source: "empty",
        providerId: activeProvider.id,
        tmdbEnabled,
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
    return Response.json(await searchProvider(activeProvider, query, contentTypes, "TMDB API key is not configured. Mock Provider results are used."), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    return Response.json(await searchProvider(activeProvider, query, contentTypes), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const fallbackProvider = getFallbackProvider();
    const message = error instanceof Error ? error.message : "TMDb search failed.";
    return Response.json(await searchProvider(fallbackProvider, query, contentTypes, `${message} Mock Provider results are used.`), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
