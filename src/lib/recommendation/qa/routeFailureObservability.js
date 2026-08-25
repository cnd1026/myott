export const ROUTE_FAILURE_HANDLER_PHASES = Object.freeze([
  "qa-activated",
  "request-parsing-complete",
  "route-ready",
  "active-provider-entered",
  "active-response-started",
  "active-failure-caught",
  "fallback-entered",
  "fallback-response-started",
]);

const ROUTE_FAILURE_TRANSITIONS = Object.freeze({
  "": Object.freeze(["qa-activated"]),
  "qa-activated": Object.freeze(["request-parsing-complete"]),
  "request-parsing-complete": Object.freeze(["route-ready"]),
  "route-ready": Object.freeze(["active-provider-entered"]),
  "active-provider-entered": Object.freeze(["active-response-started", "active-failure-caught"]),
  "active-response-started": Object.freeze(["active-failure-caught"]),
  "active-failure-caught": Object.freeze(["fallback-entered"]),
  "fallback-entered": Object.freeze(["fallback-response-started"]),
  "fallback-response-started": Object.freeze([]),
});

const ROUTE_FAILURE_BODIES = Object.freeze({
  "qa-activated": "{\"schemaVersion\":\"myott.route-failure-observability.v2\",\"classification\":\"route-handler-failure\",\"handlerPhase\":\"qa-activated\"}",
  "request-parsing-complete": "{\"schemaVersion\":\"myott.route-failure-observability.v2\",\"classification\":\"route-handler-failure\",\"handlerPhase\":\"request-parsing-complete\"}",
  "route-ready": "{\"schemaVersion\":\"myott.route-failure-observability.v2\",\"classification\":\"route-handler-failure\",\"handlerPhase\":\"route-ready\"}",
  "active-provider-entered": "{\"schemaVersion\":\"myott.route-failure-observability.v2\",\"classification\":\"route-handler-failure\",\"handlerPhase\":\"active-provider-entered\"}",
  "active-response-started": "{\"schemaVersion\":\"myott.route-failure-observability.v2\",\"classification\":\"route-handler-failure\",\"handlerPhase\":\"active-response-started\"}",
  "active-failure-caught": "{\"schemaVersion\":\"myott.route-failure-observability.v2\",\"classification\":\"route-handler-failure\",\"handlerPhase\":\"active-failure-caught\"}",
  "fallback-entered": "{\"schemaVersion\":\"myott.route-failure-observability.v2\",\"classification\":\"route-handler-failure\",\"handlerPhase\":\"fallback-entered\"}",
  "fallback-response-started": "{\"schemaVersion\":\"myott.route-failure-observability.v2\",\"classification\":\"route-handler-failure\",\"handlerPhase\":\"fallback-response-started\"}",
});

export function createRouteFailureObserver() {
  let phase = null;
  let valid = true;

  return Object.freeze({
    transition(nextPhase) {
      if (!valid) return false;
      try {
        const allowed = ROUTE_FAILURE_TRANSITIONS[phase || ""];
        if (!allowed?.includes(nextPhase)) {
          valid = false;
          return false;
        }
        phase = nextPhase;
        return true;
      } catch {
        valid = false;
        return false;
      }
    },

    terminalResponse() {
      if (!valid || phase === null) return null;
      const body = ROUTE_FAILURE_BODIES[phase];
      if (typeof body !== "string") {
        valid = false;
        return null;
      }
      return new Response(body, {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    },
  });
}
