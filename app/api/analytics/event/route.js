import { handleAnalyticsRelay } from "../../../../src/lib/analytics/server/relayHandler.js";

export async function POST(request) {
  return handleAnalyticsRelay(request, {
    projectToken: process.env.POSTHOG_PROJECT_TOKEN,
    expectedOrigin: new URL(request.url).origin,
  });
}
