import { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } from "../../../src/lib/providers/registry";

function normalizeTmdbProviderContentId(value) {
  const candidate = String(value || "").trim();
  if (!/^\d+$/.test(candidate)) return "";

  const parsed = Number(candidate);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return "";
  return String(parsed);
}

function recommendationUnavailable(cause) {
  return Response.json({
    source: "tmdb",
    dataSource: "unavailable",
    providerId: "tmdb",
    tmdbEnabled: isTmdbProviderEnabled(),
    fallbackUsed: false,
    error: {
      code: "RECOMMENDATION_UNAVAILABLE",
      cause,
    },
  }, {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

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
  const requestedProviderContentId = request.nextUrl.searchParams.get("id")?.trim() || "";
  const providerContentId = normalizeTmdbProviderContentId(requestedProviderContentId);
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
    if (requestedProviderContentId) {
      return Response.json(
        {
          source: "empty",
          providerId: activeProvider.id,
          tmdbEnabled: isTmdbProviderEnabled(),
          results: [],
          error: {
            code: "INVALID_PROVIDER_CONTENT_ID",
          },
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }
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
    if (process.env.NODE_ENV === "production") {
      return recommendationUnavailable("tmdb-not-configured");
    }
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
    if (process.env.NODE_ENV === "production") {
      return recommendationUnavailable("tmdb-provider-failure");
    }
    const fallbackProvider = getFallbackProvider();
    const message = error instanceof Error ? error.message : "TMDb related request failed.";
    return Response.json(await relatedWithProvider(fallbackProvider, params, `${message} Mock related results are used.`), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
