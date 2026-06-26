import { hasTmdbKey, LANGUAGE, REGION } from "../../../lib/tmdb";

export function GET() {
  return Response.json(
    {
      ok: true,
      tmdbEnabled: hasTmdbKey(),
      language: LANGUAGE,
      region: REGION,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
