import { suggestTmdb } from "../../../lib/tmdb";

export async function GET(request) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return Response.json(
      {
        source: "empty",
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
    const results = await suggestTmdb(query);
    return Response.json(
      {
        source: "tmdb",
        results,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        source: "fallback",
        results: [],
        message: error instanceof Error ? error.message : "TMDB suggestion failed.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
