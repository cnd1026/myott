import { hasTmdbKey, searchTmdb } from "../../../lib/tmdb";
import { getFallbackProvider } from "../../../src/lib/providers/registry";

async function searchFallbackProvider(query, message) {
  const provider = getFallbackProvider();
  const results = await provider.search({ query });

  return {
    source: provider.id,
    providerId: provider.id,
    providerName: provider.name,
    tmdbEnabled: hasTmdbKey(),
    results,
    message,
  };
}

export async function GET(request) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const tmdbEnabled = hasTmdbKey();

  if (query.length < 2) {
    return Response.json(
      {
        source: "empty",
        providerId: tmdbEnabled ? "tmdb" : "mock",
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

  if (!tmdbEnabled) {
    return Response.json(await searchFallbackProvider(query, "TMDB API key is not configured. Mock Provider results are used."), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    return Response.json(await searchTmdb(query), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TMDb search failed.";
    return Response.json(await searchFallbackProvider(query, `${message} Mock Provider results are used.`), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
