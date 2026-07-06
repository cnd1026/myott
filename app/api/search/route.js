import { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } from "../../../src/lib/providers/registry";

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

async function searchProvider(provider, query, contentTypes, sourceOptions = {}) {
  const results = await provider.search({ query, contentTypes });
  const metadata = sourceMetadata(provider, sourceOptions);
  const dataSource = !metadata.fallbackUsed && !results.length ? "empty" : metadata.dataSource;

  return {
    ...metadata,
    dataSource,
    results,
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
        dataSource: "empty",
        providerId: activeProvider.id,
        tmdbEnabled,
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
    return Response.json(await searchProvider(activeProvider, query, contentTypes, {
      dataSource: "fallback",
      fallbackUsed: true,
      fallbackReason: "TMDB API key is not configured.",
      message: "TMDB API key is not configured. Mock Provider results are used.",
    }), {
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
    return Response.json(await searchProvider(fallbackProvider, query, contentTypes, {
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
