import { tmdbProvider } from "../../../../src/lib/providers/tmdb/provider.js";

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

export async function createFirstPicksResponse(provider = tmdbProvider) {
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
    const results = Array.isArray(payload?.results) ? payload.results.slice(0, 3) : [];
    if (results.some((item) => !validFirstPick(item))) {
      throw new Error("FIRST_PICK_PROVIDER_IDENTITY_INVALID");
    }
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
