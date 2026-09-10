import { canonicalEventDefinition } from "./canonicalEvents.js";
import { isAnalyticsEligible } from "./eligibility.js";
import { validateCanonicalEvent } from "./propertyPolicy.js";

export const ANALYTICS_RELAY_PATH = "/api/analytics/event";

function defaultUuid() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Secure runtime UUID generation is unavailable.");
  }
  return globalThis.crypto.randomUUID();
}

export function createAnalyticsClient({
  fetchImpl = globalThis.fetch,
  randomUuid = defaultUuid,
  now = () => new Date().toISOString(),
  abortControllerFactory = () => new AbortController(),
} = {}) {
  let measurementSessionId = null;
  let withdrawn = false;
  const activeRequests = new Set();

  function suppress(reason) {
    return Object.freeze({ status: "SUPPRESSED", reason });
  }

  async function capture({ eventName, properties = {}, context = {}, eligibility } = {}) {
    if (withdrawn || !isAnalyticsEligible(eligibility)) return suppress("INELIGIBLE");

    const definition = canonicalEventDefinition(eventName);
    if (!definition) return Object.freeze({ status: "REJECTED", reason: "INVALID_EVENT" });

    const nextSessionId = measurementSessionId || randomUuid();
    const candidate = {
      ...properties,
      event_name: eventName,
      event_version: definition.eventVersion,
      event_id: randomUuid(),
      occurred_at: now(),
      measurement_session_id: nextSessionId,
      measurement_identity_state: "SESSION_ONLY",
      ui_locale: context.uiLocale,
      content_provider_region: context.contentProviderRegion,
      legal_jurisdiction_state: context.legalJurisdictionState,
      surface: context.surface,
    };
    const validation = validateCanonicalEvent(candidate);
    if (!validation.ok) return Object.freeze({ status: "REJECTED", reason: "INVALID_EVENT" });

    if (withdrawn || !isAnalyticsEligible(eligibility)) return suppress("INELIGIBLE");

    measurementSessionId = nextSessionId;
    const controller = abortControllerFactory();
    activeRequests.add(controller);

    try {
      const response = await fetchImpl(ANALYTICS_RELAY_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.event),
        credentials: "omit",
        signal: controller.signal,
      });

      return response?.ok
        ? Object.freeze({ status: "ACCEPTED" })
        : Object.freeze({ status: "DROPPED", reason: "RELAY_REJECTED" });
    } catch (error) {
      return Object.freeze({
        status: "DROPPED",
        reason: error?.name === "AbortError" ? "ABORTED" : "TRANSPORT_FAILURE",
      });
    } finally {
      activeRequests.delete(controller);
    }
  }

  function withdraw() {
    withdrawn = true;
    measurementSessionId = null;
    for (const controller of activeRequests) controller.abort();
    activeRequests.clear();
  }

  return Object.freeze({ capture, withdraw });
}
