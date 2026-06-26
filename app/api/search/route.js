import { hasTmdbKey, searchTmdb } from "../../../lib/tmdb";

export async function GET(request) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return Response.json(
      {
        source: "empty",
        tmdbEnabled: hasTmdbKey(),
        results: [],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    return Response.json(await searchTmdb(query), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        source: "error",
        tmdbEnabled: hasTmdbKey(),
        results: [],
        message: error instanceof Error ? error.message : "TMDb search failed.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
