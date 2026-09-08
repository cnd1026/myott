import { tmdbProvider } from "../../../../src/lib/providers/tmdb/provider.js";
import { selectFirstPicksForBucket } from "../../../../src/lib/recommendation/content/firstPickSelection.js";

const successCache = "public, s-maxage=300";
const emptyCache = "public, s-maxage=60";
const errorCache = "no-store";

function response(payload, status, cacheControl) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": cacheControl },
  });
}

function validFirstPick(item = {}) {
  return item.providerId === "tmdb" &&
    String(item.providerContentId || item.tmdbId || "").trim() &&
    ["movie", "tv"].includes(item.providerMediaType) &&
    ["movie", "drama", "animation"].includes(item.displayContentType) &&
    String(item.title || "").trim();
}

export async function createFirstPicksResponse(provider = tmdbProvider, { now = Date.now() } = {}) {
  if (provider?.id !== "tmdb" || typeof provider.isEnabled !== "function" || !provider.isEnabled() ||
      typeof provider.getFirstPicks !== "function") {
    return response({
      source: "tmdb",
      providerId: "tmdb",
      dataSource: "unavailable",
      fallbackUsed: false,
      results: [],
    }, 503, errorCache);
  }

  try {
    const payload = await provider.getFirstPicks();
    const candidates = Array.isArray(payload?.results) ? payload.results : [];
    if (candidates.some((item) => !validFirstPick(item))) {
      throw new Error("FIRST_PICK_PROVIDER_IDENTITY_INVALID");
    }
    const results = selectFirstPicksForBucket(candidates, now, 3);
    if (!results.length) {
      return response({
        source: "tmdb",
        providerId: "tmdb",
        dataSource: "empty",
        fallbackUsed: false,
        results: [],
      }, 200, emptyCache);
    }
    return response({
      source: "tmdb",
      providerId: "tmdb",
      dataSource: "tmdb",
      fallbackUsed: false,
      results,
    }, 200, successCache);
  } catch {
    return response({
      source: "tmdb",
      providerId: "tmdb",
      dataSource: "unavailable",
      fallbackUsed: false,
      results: [],
    }, 503, errorCache);
  }
}

export async function GET() {
  return createFirstPicksResponse();
}
