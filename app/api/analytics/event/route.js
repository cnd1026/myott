import { handleAnalyticsRelay } from "../../../../src/lib/analytics/server/relayHandler.js";

export const PHASE1_ANALYTICS_SERVER_POLICY = Object.freeze({
  enabled: false,
  reason: "ANALYTICS_DISABLED",
});

export async function POST(request) {
  if (!PHASE1_ANALYTICS_SERVER_POLICY.enabled) {
    return Response.json({
      status: "DISABLED",
      reason: PHASE1_ANALYTICS_SERVER_POLICY.reason,
    }, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return handleAnalyticsRelay(request, {
    projectToken: process.env.POSTHOG_PROJECT_TOKEN,
    expectedOrigin: new URL(request.url).origin,
  });
}
