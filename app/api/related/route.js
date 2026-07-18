import { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } from "../../../src/lib/providers/registry";

async function relatedWithProvider(provider, params, message) {
  const results = typeof provider.getRelated === "function" ? await provider.getRelated(params) : [];

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
  const providerContentId = request.nextUrl.searchParams.get("id")?.trim() || "";
  const contentType = request.nextUrl.searchParams.get("type")?.trim() || "movie";
  const providerMediaType = request.nextUrl.searchParams.get("mediaType")?.trim() || "";
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const originalTitle = request.nextUrl.searchParams.get("originalTitle")?.trim() || "";
  const activeProvider = getActiveProvider();
  const params = {
    providerContentId,
    providerMediaType,
    contentType,
    title,
    originalTitle,
    contentTypes: contentType ? [contentType] : [],
    limit: 12,
  };

  if (!providerContentId) {
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
    return Response.json(await relatedWithProvider(activeProvider, params, "TMDB API key is not configured. Mock related results are used."), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    return Response.json(await relatedWithProvider(activeProvider, params), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const fallbackProvider = getFallbackProvider();
    const message = error instanceof Error ? error.message : "TMDb related request failed.";
    return Response.json(await relatedWithProvider(fallbackProvider, params, `${message} Mock related results are used.`), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
