import { validateCanonicalEvent } from "../propertyPolicy.js";
import { forwardPosthogEvent } from "../providers/posthogRelay.js";

export const ANALYTICS_BODY_LIMIT_BYTES = 8192;

function jsonResponse(body, status) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function requestOriginIsAllowed(request, expectedOrigin) {
  let requestUrl;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return false;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const fetchSite = request.headers.get("sec-fetch-site");
  const allowedOrigin = expectedOrigin || requestUrl.origin;

  return origin === allowedOrigin
    && host === requestUrl.host
    && (!fetchSite || fetchSite === "same-origin");
}

export async function handleAnalyticsRelay(request, {
  projectToken,
  fetchImpl = globalThis.fetch,
  expectedOrigin,
} = {}) {
  if (request?.method !== "POST") {
    return jsonResponse({ status: "REJECTED", reason: "METHOD_NOT_ALLOWED" }, 405);
  }

  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return jsonResponse({ status: "REJECTED", reason: "UNSUPPORTED_MEDIA_TYPE" }, 415);
  }

  if (!requestOriginIsAllowed(request, expectedOrigin)) {
    return jsonResponse({ status: "REJECTED", reason: "ORIGIN_NOT_ALLOWED" }, 403);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > ANALYTICS_BODY_LIMIT_BYTES) {
    return jsonResponse({ status: "REJECTED", reason: "BODY_TOO_LARGE" }, 413);
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse({ status: "REJECTED", reason: "INVALID_BODY" }, 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > ANALYTICS_BODY_LIMIT_BYTES) {
    return jsonResponse({ status: "REJECTED", reason: "BODY_TOO_LARGE" }, 413);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ status: "REJECTED", reason: "INVALID_JSON" }, 400);
  }

  const validation = validateCanonicalEvent(parsed);
  if (!validation.ok) {
    return jsonResponse({ status: "REJECTED", reason: "INVALID_EVENT" }, 400);
  }

  if (typeof projectToken !== "string" || projectToken.trim() === "") {
    return jsonResponse({ status: "DISABLED", reason: "CONFIG_MISSING" }, 202);
  }

  if (request.signal?.aborted) {
    return jsonResponse({ status: "DROPPED", reason: "REQUEST_ABORTED" }, 202);
  }

  const delivery = await forwardPosthogEvent({
    event: validation.event,
    projectToken,
    fetchImpl,
    signal: request.signal,
  });

  return delivery.delivered
    ? jsonResponse({ status: "ACCEPTED" }, 202)
    : jsonResponse({ status: "DROPPED", reason: "PROVIDER_UNAVAILABLE" }, 202);
}
