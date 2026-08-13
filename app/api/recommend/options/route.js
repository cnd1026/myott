import { getActiveProvider, getFallbackProvider, isTmdbProviderEnabled } from "../../../../src/lib/providers/registry";
import { sanitizeFounderDiagnostics } from "../../../../src/lib/recommendation/qa/founderDiagnostics.js";
import { createRouteFailureObserver } from "../../../../src/lib/recommendation/qa/routeFailureObservability.js";
import { TMDB_OBSERVABILITY_INTEGRITY_CODE } from "../../../../src/lib/recommendation/qa/tmdbObservability.js";

const TMDB_OBSERVABILITY_SAFE_STAGES = new Set([
  "session-creation",
  "context-binding",
  "event-emission",
  "finalization",
  "payload-validation",
]);

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

async function recommendWithProvider(provider, filters, contentTypes, sourceOptions = {}) {
  const providerPayload = await provider.getRecommendations({
    filters,
    contentTypes,
    limit: 12,
    qaDiagnostics: Boolean(sourceOptions.qaDiagnostics),
  });
  const results = Array.isArray(providerPayload) ? providerPayload : providerPayload.results || [];
  const relaxedResults = Array.isArray(providerPayload) ? [] : providerPayload.relaxedResults || [];
  const metadata = sourceMetadata(provider, sourceOptions);
  const dataSource = !metadata.fallbackUsed && !results.length ? "empty" : metadata.dataSource;
  const qaPayload = process.env.NODE_ENV !== "production" && sourceOptions.qaDiagnostics && !Array.isArray(providerPayload)
    ? sanitizeFounderDiagnostics(providerPayload.diagnostics || {})
    : null;
  const currentProductObservability = qaPayload?.currentProductObservability;
  const recommendationDebug = qaPayload
    ? Object.fromEntries(Object.entries(qaPayload).filter(([key]) => key !== "currentProductObservability"))
    : null;

  return {
    ...metadata,
    dataSource,
    results,
    relaxedResults,
    requestId: sourceOptions.requestId || "",
    ...(recommendationDebug ? { recommendationDebug } : {}),
    ...(currentProductObservability ? { currentProductObservability } : {}),
  };
}

function advanceRouteFailureObservation(observer, phase) {
  if (!observer) return null;
  try {
    return observer.transition(phase) ? observer : null;
  } catch {
    return null;
  }
}

function initializeRouteFailureObservation(qaDiagnostics) {
  if (!qaDiagnostics) return null;
  try {
    return advanceRouteFailureObservation(createRouteFailureObserver(), "qa-activated");
  } catch {
    return null;
  }
}

export async function GET(request) {
  const filters = request.nextUrl.searchParams.get("filters")?.split(",").map((value) => value.trim()).filter(Boolean) || [];
  const contentTypes = request.nextUrl.searchParams.get("types")?.split(",").map((value) => value.trim()).filter(Boolean) || [];
  const requestId = request.nextUrl.searchParams.get("requestId")?.trim() || "";
  const qaDiagnostics = process.env.NODE_ENV !== "production" && request.nextUrl.searchParams.get("qa") === "1";
  let routeObserver = initializeRouteFailureObservation(qaDiagnostics);

  try {
    routeObserver = advanceRouteFailureObservation(routeObserver, "route-ready");
    const activeProvider = getActiveProvider();

    if (!filters.length && !contentTypes.length) {
      return Response.json(
        {
          source: "empty",
          dataSource: "empty",
          providerId: activeProvider.id,
          tmdbEnabled: isTmdbProviderEnabled(),
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
      return Response.json(
        await recommendWithProvider(activeProvider, filters, contentTypes, {
          requestId,
          qaDiagnostics,
          dataSource: "fallback",
          fallbackUsed: true,
          fallbackReason: "TMDB API key is not configured.",
          message: "TMDB API key is not configured. Mock Provider results are used.",
        }),
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    try {
      routeObserver = advanceRouteFailureObservation(routeObserver, "active-provider-entered");
      const activePayload = await recommendWithProvider(activeProvider, filters, contentTypes, { requestId, qaDiagnostics });
      routeObserver = advanceRouteFailureObservation(routeObserver, "active-response-started");
      return Response.json(activePayload, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      routeObserver = advanceRouteFailureObservation(routeObserver, "active-failure-caught");
      if (error?.code === TMDB_OBSERVABILITY_INTEGRITY_CODE) {
        const stage = TMDB_OBSERVABILITY_SAFE_STAGES.has(error.stage) ? error.stage : "payload-validation";
        return Response.json({
          source: "tmdb",
          dataSource: "qa-observability-error",
          requestId,
          error: {
            code: TMDB_OBSERVABILITY_INTEGRITY_CODE,
            stage,
          },
        }, {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        });
      }
      routeObserver = advanceRouteFailureObservation(routeObserver, "fallback-entered");
      const fallbackProvider = getFallbackProvider();
      const message = error instanceof Error ? error.message : "TMDb option recommendation failed.";
      const fallbackPayload = await recommendWithProvider(fallbackProvider, filters, contentTypes, {
        requestId,
        qaDiagnostics,
        dataSource: "fallback",
        fallbackUsed: true,
        fallbackReason: message,
        message: `${message} Mock Provider results are used.`,
      });
      routeObserver = advanceRouteFailureObservation(routeObserver, "fallback-response-started");
      return Response.json(fallbackPayload, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (error) {
    if (routeObserver) {
      try {
        const terminalResponse = routeObserver.terminalResponse();
        if (terminalResponse) return terminalResponse;
      } catch {
        // Preserve the original escaping Product/framework failure.
      }
    }
    throw error;
  }
}
