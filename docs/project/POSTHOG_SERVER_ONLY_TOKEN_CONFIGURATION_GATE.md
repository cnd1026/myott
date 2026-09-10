# PostHog Server-Only Token Configuration Gate

## Authority / Current State

- Task: `MYOTT_POSTHOG_SERVER_ONLY_TOKEN_CONFIGURATION_GATE_V1`
- Base commit: `fe9ca650b757674f2cc3cf88a9cb4dd1be097d90`
- This is a docs-only configuration Gate. No token, environment variable, deployment, runtime, or event was created or changed.
- `ANALYTICS_PROVIDER = POSTHOG_CLOUD / SELECTED`
- `PHASE_1_TRANSPORT = MYOTT_SAME_ORIGIN_PRIVACY_RELAY`
- `ANALYTICS_RUNTIME = NOT_IMPLEMENTED`
- `EVENT_SEND = 0`
- `ACTIVATION = NOT_AUTHORIZED`

The account/project creation lifecycle is closed and must not be reopened by this Gate.

## Founder Empty Project Receipt

The Founder-provided manual receipt is accepted as the current external state:

| Field | Readback |
| --- | --- |
| Account/project | `CREATED / MANUAL_ACTION_SUCCESS` |
| Organization | `ND Studio` |
| Project | `MyOTT` |
| Region | `EU_CLOUD` |
| Free plan | `YES` |
| Payment required/added | `NO / NO` |
| Project token | `PRESENT / VALUE_REDACTED_NOT_REPORTED` |
| MyOTT events/test events | `0 / 0` |
| SDK/external data source/team invite | `0 / 0 / 0` |
| Autocapture/web-vitals/dead-click | `OFF / OFF / OFF` |
| Heatmap/session replay | `OFF / OFF` |
| IP discard | `ENABLED` |
| Retention | `NOT_PROVEN` |

`IP_DISCARD = ENABLED` does not prove zero transport-level IP processing. The selected relay must still avoid forwarding raw browser IP, and live activation still requires the provider/IP/GeoIP evidence defined by the existing architecture.

## Token Classification

- `POSTHOG_PROJECT_TOKEN = PROJECT_INGESTION_ROUTING_TOKEN`
- `MYOTT_TOKEN_HANDLING = SERVER_ONLY_OPERATIONAL_CREDENTIAL`
- It is not a personal API key, admin API secret, or user authorization token.
- `PROJECT_TOKEN_VALID != EVENT_AUTHENTICITY`

PostHog's public capture endpoint can accept the project token without private API authentication. MyOTT nevertheless keeps it server-only to preserve provider abstraction, reduce direct endpoint abuse, and strengthen metric integrity.

## Server-Only Policy

Only the future server-side PostHog provider adapter may read the token:

```text
Product feature
-> analytics client
-> same-origin analytics route
-> server validation
-> PostHog provider adapter
-> process.env.POSTHOG_PROJECT_TOKEN
```

The client must not import, receive, render, serialize, or introspect the token. The same-origin route must never return it in success or error responses.

Token presence is configuration availability only. It does not authorize capture and must not cause SDK loading, background activity, pageviews, telemetry, or automatic event sending.

## Environment Name

- Required name: `POSTHOG_PROJECT_TOKEN`.
- Prohibited names: `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_TOKEN`, and any browser-public equivalent.
- Prohibited storage: source, committed JSON, HTML, query strings, client bundles, public runtime configuration, docs, screenshots, logs, and command history.
- Vercel value type target: `Secret` where the current project surface supports it.

## EU Host Boundary

The provider adapter uses the fixed EU ingestion origin:

```text
https://eu.i.posthog.com
```

The host is not an arbitrary user-controlled environment value. If an implementation later proves a host variable necessary, it must accept only the exact approved EU origin and fail closed for every other value. This prevents region drift and provider-host injection.

## Vercel Environment Scope

Current official Vercel documentation establishes that variables can be scoped independently to Production, Preview, and Development, and that Next.js `NEXT_PUBLIC_` variables are browser-available:

- [Environment variables](https://vercel.com/docs/environment-variables)
- [Framework environment variables](https://vercel.com/docs/environment-variables/framework-environment-variables)

Target configuration:

| Environment | `POSTHOG_PROJECT_TOKEN` | Analytics state |
| --- | --- | --- |
| Production | `PRESENT` only after separate Founder action | Still disabled until runtime and activation Gates pass |
| Preview | `ABSENT` | `SUPPRESSED` |
| Development | `ABSENT` | `SUPPRESSED` |
| QA/local | `ABSENT` | `SUPPRESSED` |

No shared variable across environments is permitted. Runtime environment eligibility must be checked independently from token presence.

## Token Presence vs Analytics Activation

`TOKEN_PRESENT != ANALYTICS_ENABLED`.

Before forwarding, the future relay must require all of:

1. Eligible production runtime environment.
2. Resolved and eligible jurisdiction state.
3. Eligible Product-owned analytics consent state.
4. Canonical event name/version validity.
5. Exact property allowlist and redaction validity.
6. Current provider configuration availability.

Failure of any condition yields zero forwarding. PostHog internal consent state is not authoritative; `MYOTT_PRIVACY_CONSENT_STATE` remains canonical.

## Fail-Closed Missing Token

If `POSTHOG_PROJECT_TOKEN` is absent or unusable:

- `POSTHOG_FORWARD = 0`.
- Product recommendation behavior remains unaffected.
- Analytics returns a local, nonfatal disabled/config-missing result.
- No user-facing technical error or Product crash occurs.
- No fallback to a client token, hard-coded token, another PostHog region, queue, retry, or alternate provider occurs.

## Client Exposure Prevention

The future implementation and review must prove:

- No `NEXT_PUBLIC_` token variable.
- No token reference from Client Components or browser bundles.
- No config/status endpoint returning the token.
- No HTML, response JSON, URL, source map, build artifact, or browser log exposure.
- No request body containing `api_key` crosses the server-to-browser response boundary.
- Preview/Development/QA cannot access the Production token.

`CLIENT_EXPOSURE_PREVENTION = DEFINED`.

## Logging / Redaction

The future relay must not log:

- Full token or environment dumps.
- Provider request bodies containing `api_key`.
- Headers/configuration containing the token.
- URLs containing credential material.
- Generic serialized provider errors that echo request configuration.

Permitted observability is boolean and non-sensitive only:

```text
TOKEN_PRESENT = YES / NO
TOKEN_VALUE = REDACTED / NOT_REPORTED
```

No token plaintext may enter chat, documentation, screenshots, test fixtures, evidence, or Git.

## Manual Founder Write Procedure

This procedure belongs to the separate `MYOTT_POSTHOG_SERVER_ONLY_TOKEN_CONFIGURATION_FOUNDER_ACTION_V1` action.

### Do

1. Open the official PostHog `MyOTT` EU project and the official Vercel `MyOTT` project in Founder-controlled sessions.
2. Copy the PostHog project token directly from PostHog into the Vercel environment-variable value field without passing it through chat, a local file, clipboard evidence, or command history beyond the direct manual transfer.
3. Use the exact name `POSTHOG_PROJECT_TOKEN`.
4. Select Production scope only and use the Vercel Secret type when available.
5. Confirm Preview and Development are not selected.
6. Save the configuration without deploying or redeploying.
7. Return only the redacted receipt below.

### Do not

- Do not create or paste a personal API key.
- Do not use any `NEXT_PUBLIC_` variable.
- Do not add Preview, Development, QA, or local scope.
- Do not deploy, redeploy, push, merge, install an SDK, implement the relay, or send an event.
- Do not disclose the token in chat, screenshots, logs, source, `.env*`, or documentation.
- Stop if Production-only scope or secret-value handling cannot be confirmed.

Exact dashboard labels can change and must be read from the current official UI. This document does not invent them.

## Deployment Separation

Vercel documents that environment changes do not affect previous deployments and apply only to new deployments. Therefore:

```text
ENV_CONFIGURED
!= ENV_CONSUMED_BY_DEPLOYMENT
!= ANALYTICS_RUNTIME_ACTIVE
```

- `REDEPLOY_REQUIRED_AFTER_ENV_WRITE = YES` for an existing deployment to consume the newly configured value.
- `DEPLOYMENT_GATE = SEPARATE / NOT_AUTHORIZED`.
- The Founder token action must not trigger or perform deployment.
- Current Product source, Main, Production parity, build, release, and deployment remain unchanged.

## Token Exposure Incident

If token material reaches Git, chat, a public screenshot, client bundle, browser-accessible configuration, or logs:

- `TOKEN_EXPOSURE_STATE = COMPROMISED_FOR_MYOTT_POLICY`.
- Stop analytics forwarding if active.
- Remove accessible copies without rewriting unrelated history.
- Determine the current official PostHog token regeneration/replacement path.
- Replace the Vercel Secret in a separately authorized action.
- Verify the old token is revoked and client exposure is absent before any activation.

PostHog's project documentation states that the write-only project token can be regenerated and the old token is immediately revoked, but exact current UI steps require provider readback. No rotation is performed here.

## Security Review Boundary

Server-only storage improves token and provider isolation. It does not produce Security Seal, Release, deployment, or metric-authenticity PASS.

The later relay requires focused review of environment exposure, server logging, arbitrary forwarding, origin/host abuse, schema bypass, body limits, rate abuse, SSRF/provider-host injection, raw-IP forwarding, and fail-closed behavior. Global Security Seal remains unchanged.

## Retention Readback Boundary

- `RETENTION_READBACK = NOT_PROVEN`.
- `RETENTION_READBACK_BLOCKS_TOKEN_CONFIG = NO` because configuration alone sends no event.
- `RETENTION_READBACK = ANALYTICS_ACTIVATION_PREREQUISITE` before the first live event.

The current free-plan historical/current pricing evidence does not substitute for exact project readback.

## Founder Action Packet

Next action: add the existing PostHog project token to the Vercel `MyOTT` project as `POSTHOG_PROJECT_TOKEN`, Production scope only, using a secret value field. Do not expose the value and do not deploy.

The action requires explicit Founder authorization and must return the evidence receipt. It authorizes no Product, runtime, event, release, or deployment work.

## Evidence Receipt Template

```text
VERCEL_PROJECT = MyOTT
ENV_NAME = POSTHOG_PROJECT_TOKEN
PRODUCTION_SCOPE = YES / NO
PREVIEW_SCOPE = YES / NO
DEVELOPMENT_SCOPE = YES / NO
TOKEN_PRESENT = YES / NO
TOKEN_VALUE = REDACTED / NOT_REPORTED
DEPLOYMENT_TRIGGERED = 0
ANALYTICS_EVENT_SENT = 0
TOKEN_EXPOSED_TO_BROWSER = NO / NOT_PROVEN
```

No screenshot may show the full secret. A screenshot is optional and must be redacted before it enters any evidence packet.

## Gate Result

- `SERVER_ONLY_TOKEN_CONFIGURATION_ARCHITECTURE = READY`
- `PRODUCTION_ONLY_ENV_SCOPE = READY`
- `CLIENT_EXPOSURE_PREVENTION = DEFINED`
- `TOKEN_WRITE_FOUNDER_ACTION_READY = YES`
- `REDEPLOY_REQUIRED_AFTER_ENV_WRITE = YES`
- `RETENTION_READBACK_BLOCKS_TOKEN_CONFIG = NO`
- `ANALYTICS_ACTIVATION_READY = NO`

This Gate authorizes only the next explicitly approved Founder manual token-configuration action. Relay implementation, consent implementation, event transmission, deployment, and Analytics activation remain separate and unauthorized.
