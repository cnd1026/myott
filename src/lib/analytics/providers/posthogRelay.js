import { CANONICAL_EVENT_REGISTRY } from "../canonicalEvents.js";

export const POSTHOG_EU_EVENT_ENDPOINT = "https://eu.i.posthog.com/i/v0/e/";

function eventSpecificProperties(event) {
  const definition = CANONICAL_EVENT_REGISTRY[event.event_name];
  const properties = {};

  for (const key of Object.keys(definition.requiredProperties)) {
    properties[key] = Array.isArray(event[key]) ? [...event[key]] : event[key];
  }
  for (const key of Object.keys(definition.optionalProperties)) {
    if (Object.hasOwn(event, key)) properties[key] = event[key];
  }

  return properties;
}

export function projectPosthogEvent(event, projectToken) {
  return {
    api_key: projectToken,
    event: event.event_name,
    distinct_id: event.measurement_session_id,
    timestamp: event.occurred_at,
    properties: {
      "$process_person_profile": false,
      "$geoip_disable": true,
      event_version: event.event_version,
      event_id: event.event_id,
      measurement_session_id: event.measurement_session_id,
      measurement_identity_state: event.measurement_identity_state,
      ui_locale: event.ui_locale,
      content_provider_region: event.content_provider_region,
      legal_jurisdiction_state: event.legal_jurisdiction_state,
      surface: event.surface,
      ...eventSpecificProperties(event),
    },
  };
}

export async function forwardPosthogEvent({ event, projectToken, fetchImpl = globalThis.fetch, signal } = {}) {
  if (typeof projectToken !== "string" || projectToken.trim() === "") {
    return Object.freeze({ delivered: false, reason: "CONFIG_MISSING" });
  }

  try {
    const response = await fetchImpl(POSTHOG_EU_EVENT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectPosthogEvent(event, projectToken)),
      redirect: "error",
      signal,
    });

    return Object.freeze({
      delivered: Boolean(response?.ok),
      reason: response?.ok ? "DELIVERED" : "PROVIDER_REJECTED",
    });
  } catch {
    return Object.freeze({ delivered: false, reason: "TRANSPORT_FAILURE" });
  }
}
