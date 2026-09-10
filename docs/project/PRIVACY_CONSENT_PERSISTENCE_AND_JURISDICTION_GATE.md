# Privacy Consent Persistence And Jurisdiction Gate

Status: PRODUCT PRIVACY ARCHITECTURE / NO RUNTIME IMPLEMENTATION

Task: `MYOTT_PRIVACY_CONSENT_PERSISTENCE_AND_JURISDICTION_GATE_V1`

Base commit: `c81c4d77e7d61b4815440458e3418f16907273fc`

## Authority

This document selects a Phase 1 technical architecture for durable privacy choice and jurisdiction-policy input. It does not implement storage, cookies, country policy, legal rules, Privacy Center mounting, Analytics event wiring, deployment, or Analytics activation.

The governing contracts remain:

- [Privacy And Consent Measurement Eligibility Matrix](PRIVACY_CONSENT_MEASUREMENT_ELIGIBILITY_MATRIX.md)
- [Guest Account Data Continuity Architecture](GUEST_ACCOUNT_DATA_CONTINUITY_ARCHITECTURE.md)
- [Growth Measurement Event Taxonomy](GROWTH_MEASUREMENT_EVENT_TAXONOMY.md)
- [PostHog Same-Origin Privacy Relay Architecture](POSTHOG_SAME_ORIGIN_PRIVACY_RELAY_ARCHITECTURE.md)
- [PostHog Server-Only Token Configuration Gate](POSTHOG_SERVER_ONLY_TOKEN_CONFIGURATION_GATE.md)
- [Public Launch Global-First Architecture](PUBLIC_LAUNCH_GLOBAL_FIRST_ARCHITECTURE.md)

This is a technical architecture disposition, not legal advice or a compliance certification.

## Current State

```text
PRIVACY_CENTER_FOUNDATION = READY / UNMOUNTED
CONSENT_RUNTIME = READY / MEMORY_ONLY
CONSENT_PERSISTENCE = NOT_IMPLEMENTED
JURISDICTION_POLICY_RUNTIME = NOT_IMPLEMENTED
PRODUCT_EVENT_WIRING = 0
LIVE_ANALYTICS = 0
ANALYTICS_ACTIVATION = NOT_AUTHORIZED
```

The existing runtime correctly starts fail-closed and distinguishes runtime environment, Product policy, jurisdiction state, consent state, and session-only measurement identity. The current same-origin relay validates event shape but does not yet validate a durable consent receipt or resolve a server-owned jurisdiction policy before forwarding.

## Consent vs Eligibility

```text
USER_PRIVACY_PREFERENCE != FINAL_ANALYTICS_ELIGIBILITY
CONSENT_RECORD != ANALYTICS_IDENTITY
CONSENT_RECORD != PRODUCT_GUEST_IDENTITY
CONSENT_RECORD != ACCOUNT_IDENTITY
UI_LOCALE != CONTENT_PROVIDER_REGION != LEGAL_JURISDICTION
COUNTRY_SIGNAL != LEGAL_POLICY
```

A user choice supplies only the consent dimension. Final Analytics eligibility still requires an eligible Production environment, enabled Product policy, approved jurisdiction-policy state, valid consent state, and the approved session-only identity class. Token presence and PostHog project configuration are not consent authority.

## Persistence Candidate Matrix

| Candidate | Reload persistence | Server-relay verification | Tamper / rollback resistance | Identity / cross-device | Withdrawal, expiry, versioning | Privacy / Security | FREE_FIRST / complexity | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MEMORY_ONLY` | No | No durable evidence | Runtime state only | No identity; no cross-device | Lost on reload; runtime withdrawal works | Minimal surface | No service; low | Foundation and deterministic test only |
| `LOCAL_STORAGE` | Same browser | No; client value remains untrusted | User/script writable; rollback possible | No identity required; browser-local only | Application-managed delete, expiry, migration | Exposed to page script/XSS; legal review required | No service; low-medium | Not selected |
| `UNSIGNED_FIRST_PARTY_COOKIE` | Same browser | Visible to server but unauthenticated | Forgeable and replayable | No identity required; browser-local only | Cookie replacement/expiry; no integrity | Cookie attributes help transport but not authenticity | No service; medium | Not selected |
| `SERVER_VERIFIABLE_SIGNED_FIRST_PARTY_CONSENT_RECEIPT` | Same browser | Yes, for receipt integrity and schema/version | Forgery resistant with sound signing; old valid receipt rollback/replay requires a separate policy/control | No subject identity required; no cross-device | Server-issued replacement, bounded expiry, policy-version invalidation; durable withdrawal design still needs replay review | Separate secret and focused Security review required | No new paid service; medium | Recommended Phase 1 technical architecture |
| `SERVER_DATABASE_CONSENT_RECORD` | Yes | Strong server authority | Can support revocation/audit when correctly keyed | Normally introduces lookup identity; can support account/cross-device | Strong lifecycle and revocation capability | Largest data, access, retention, breach, and operations surface | DB/infrastructure and high complexity | Future account/legal-requirement option |

The matrix does not treat more infrastructure as inherently safer. A database can improve audit and revocation while creating identity, retention, cost, and operations obligations that are disproportionate to current guest-first Phase 1.

## Memory-only

Memory-only state remains the correct foundation and test behavior. It creates no durable storage or stable identifier, but it loses the user's choice on reload and gives the relay no durable server-verifiable evidence. Repeated prompts would make a public Privacy Center misleading and inconvenient. It is not selected for public launch persistence.

## LocalStorage

`localStorage` could persist a browser choice without a server database, but it is page-script readable and writable. A browser claim copied from `localStorage` is not trusted evidence merely because it survived reload. Server relay eligibility cannot rely on `consent=allowed` supplied by Product JavaScript. Expiry, policy migration, withdrawal cleanup, and script-compromise exposure would all remain application responsibilities.

## Unsigned Cookie

An unsigned first-party cookie is automatically visible to the same-origin route and can use `Secure`, `SameSite`, `Path`, and bounded expiry attributes. Those attributes do not authenticate its value. The client can forge or restore an `allowed` value, so the relay cannot treat it as server-trusted consent evidence.

The technical storage class is `PRIVACY_PREFERENCE_STATE`. This document makes no universal claim that such storage is legally exempt from consent or disclosure requirements.

## Signed Consent Receipt

The selected Phase 1 technical candidate is a minimal, server-issued, authenticated first-party receipt. Candidate payload fields are limited to:

```text
schema_version
consent_policy_version
analytics_policy_version
analytics_choice
preferences_choice = OPTIONAL / ONLY_IF_LATER_APPROVED
issued_at
expires_at
jurisdiction_policy_version_or_state_reference = OPTIONAL / NON_LOCATION
```

It must not contain a guest ID, account ID, email, name, PostHog distinct ID, content history, precise location, raw IP, fingerprint, provider ID, or arbitrary free text. The receipt value, signature, and policy state must never be forwarded to PostHog or reused as an Analytics identifier.

The signature establishes integrity of server-issued fields. It does not prove human identity, user location, current legal eligibility, or that the receipt is the latest receipt ever issued. A stateless signed receipt can reject forgery but cannot, by itself, guarantee revocation of a previously copied still-valid `allowed` receipt. Future Security design must resolve the old-receipt rollback/replay threat through an approved bounded mechanism or explicitly block activation; a database is not silently authorized by this selection.

Potential future cookie attributes are `HttpOnly`, `Secure`, a flow-appropriate `SameSite` setting, `Path=/`, and policy-bounded expiry. Exact attributes and CSRF/cross-site behavior require implementation and Security review.

## Database Option

A server database can support authoritative withdrawal, account-linked history, cross-device choice, and auditable version transitions. It is not required for current Phase 1 and conflicts with the present no-DB authority, guest-first minimization, and no-account requirement. It remains a future option only if legal, account, audit, or adversarial rollback requirements prove that a stateless receipt is insufficient.

## Recommended Persistence

```text
RECOMMENDED_PHASE_1_CONSENT_PERSISTENCE = SERVER_VERIFIABLE_SIGNED_FIRST_PARTY_CONSENT_RECEIPT
SELECTION_CLASS = TECHNICAL_ARCHITECTURE / NOT_IMPLEMENTATION_AUTHORITY
NEW_PAID_SERVICE = 0
DATABASE_REQUIRED_FOR_BASELINE = NO
PUBLIC_MOUNT_READY = NO
```

The recommendation best balances same-origin server verification, minimal data, browser reload continuity, provider independence, FREE_FIRST cost, and guest-first identity separation. It remains conditional on exact expiry/policy decisions and focused Security review, including the rollback/replay limitation.

## Signing Secret

The future receipt requires a dedicated server-only secret concept such as `MYOTT_CONSENT_SIGNING_SECRET`. It must not reuse `POSTHOG_PROJECT_TOKEN`, a TMDB key, a session key, or any unrelated credential. This Task creates, reads, or writes no secret.

Future review must define generation, environment scope, rotation, overlap between key versions, incident response, logging redaction, and deployment rollback behavior. Secret presence must not itself enable Analytics.

## Consent Versioning

The minimum version model separates:

- `CONSENT_SCHEMA_VERSION`: receipt format and validation contract;
- `CONSENT_POLICY_VERSION`: user-facing consent purpose and choice contract;
- `ANALYTICS_POLICY_VERSION`: event/property/purpose boundary that Analytics relies on;
- `JURISDICTION_POLICY_VERSION`: approved country-to-policy registry snapshot, when one exists.

A materially expanded purpose, incompatible schema, invalid signature, unsupported version, or expired receipt returns the consent state to `CONSENT_REVIEW_REQUIRED` or `CONSENT_UNRESOLVED`. An old receipt is never silently promoted to permission for a broader purpose.

## Expiry / Retention

```text
CONSENT_RECEIPT_EXPIRY = POLICY_DECISION_REQUIRED
EXACT_DURATION = LEGAL_REVIEW_REQUIRED / PRODUCT_POLICY_REQUIRED
INDEFINITE_DEFAULT = NOT_SELECTED
```

Existing draft 30-day or 90-day values are not promoted. The implementation must support explicit expiry and deletion/replacement, but this Gate does not invent a legally final duration.

## Withdrawal

The durable withdrawal sequence is:

1. Set the in-memory canonical consent state to denied or withdrawn.
2. Resolve Analytics eligibility to suppressed before any other work.
3. Prevent future client-to-relay dispatch.
4. Best-effort abort active client requests and clear request handles.
5. Retire the ephemeral Analytics session ID.
6. Replace or expire the persisted `allowed` receipt through the future server-owned receipt endpoint.
7. Do not queue or replay prior, denied, or withdrawn events after later consent.

An old `allowed` receipt must not authorize normal future dispatch after withdrawal. The adversarial copied-receipt replay case remains a focused Security blocker until a supported revocation/rollback defense is selected. Already accepted relay or PostHog work is not retroactively revoked.

## Identity Separation

The receipt is purpose-bounded privacy preference state, not a subject key. The application must not log it as a correlation token, expose it to Product event code, place it in event properties, or use it to join sessions. Product guest/account continuity and Analytics session identity remain separate lifecycles.

## Jurisdiction Signal Candidates

| Candidate | Privacy / accuracy | Server availability | Cost / complexity | Disposition |
| --- | --- | --- | --- |
| `NO_AUTOMATIC_SIGNAL` | Maximum minimization; no automatic country evidence | Always available as unknown | Zero / low | Safe fallback, but cannot enable country-specific policy |
| `USER_SELF_DECLARED_REGION` | Explicit but may be mistaken; requires honest UX and legal treatment | Available only after a future user action | Zero / medium | Future fallback/override candidate, not silently trusted |
| `SERVER_SIDE_TRANSIENT_COARSE_COUNTRY_HINT_FROM_HOSTING_PLATFORM` | IP-derived and approximate; no Product IP persistence needed | Supported on Vercel deployment requests | Included platform capability / medium | Recommended technical signal input |
| `THIRD_PARTY_GEOLOCATION_SERVICE` | Adds a processor, network, data disclosure, and accuracy dependency | External | Potential paid cost / high | Not selected |

## Server-side Coarse Country Hint

Vercel's current official request-header documentation states that deployment requests include `x-vercel-ip-country`, a two-character ISO 3166-1 country code associated with the requester's public IP address. The documented Function example reads it from the request headers. Vercel also describes its geolocation values as general reference rather than precise location data. Sources were read on 2026-09-11:

- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [Vercel geolocation capability note](https://vercel.com/changelog/requesters-public-ip-postal-code-now-available-in-vercel-functions)

This proves a current coarse-country technical signal surface, not legal jurisdiction, residence, nationality, exact location, or compliance. The signal remains IP-derived and may be missing, inaccurate, unavailable outside Vercel deployment, or affected by proxies/VPNs. Header authenticity and overwrite behavior for hostile direct requests must be proven in a future isolated runtime test before activation.

```text
RECOMMENDED_JURISDICTION_SIGNAL_ARCHITECTURE = SERVER_SIDE_TRANSIENT_COARSE_COUNTRY_HINT_WITH_FAIL_CLOSED_POLICY_REGISTRY
RAW_IP_PERSISTED_BY_MYOTT = NO
COUNTRY_HINT_PERSISTED_FOR_ANALYTICS = NO
COUNTRY_HINT_SENT_TO_POSTHOG_AS_LEGAL_EVIDENCE = NO
PREVIEW_DEVELOPMENT_MISSING_SIGNAL = JURISDICTION_UNKNOWN
```

The server reads only the country-level hint required for transient policy lookup, does not read or persist city, latitude, longitude, postal code, or timezone for this purpose, transforms the hint into an approved policy state, and discards it from the Analytics payload path.

## Jurisdiction Policy Registry

The provider-neutral registry contract is:

```text
normalized_country_key
-> analytics_policy_state
-> consent_requirement_state
-> jurisdiction_policy_version
-> legal_review_state
```

No real country mapping is approved by this Task. The initial registry state is `NO_COUNTRY_POLICY_APPROVED`. A country hint not present in an approved versioned registry, a missing signal, malformed input, unsupported country, or a registry entry requiring review resolves to a suppressing jurisdiction state.

```text
LEGAL_POLICY_MAPPING_STATUS = NOT_COMPLETED / LEGAL_REVIEW_REQUIRED
COUNTRY_RULES_ADDED = 0
```

Neither UI locale, content-provider region, timezone, nor `Accept-Language` may populate the registry key.

## Unknown / Unsupported Fail-safe

```text
UNKNOWN_JURISDICTION -> NONESSENTIAL_ANALYTICS_OFF
UNSUPPORTED_JURISDICTION -> NONESSENTIAL_ANALYTICS_OFF
LEGAL_REVIEW_REQUIRED -> NONESSENTIAL_ANALYTICS_OFF
CORE_RECOMMENDATION -> UNAFFECTED_UNLESS_A_SEPARATE_GATE_REQUIRES_OTHERWISE
MARKETING -> OFF
```

Missing evidence is not converted to consent. Suppressed events are dropped and never queued for later replay.

## Client / Server Authority

The future client owns Privacy Center interaction and immediate runtime suppression. The server owns receipt issue/validation, transient jurisdiction-signal normalization, registry lookup, final relay eligibility, and provider projection.

The browser does not send `consent=allowed` as trusted event-body evidence. A future `HttpOnly` receipt would accompany a same-origin request through normal cookie handling and be validated independently; it must not be copied into the canonical event body or exposed as a Product-facing Analytics field.

## Relay Revalidation Requirement

Before any PostHog forwarding, the future relay must:

1. enforce request method, origin/host, body limit, canonical event, version, and property policy;
2. read and cryptographically validate the minimal same-origin consent receipt;
3. reject missing, invalid, expired, unsupported, or materially stale receipt versions;
4. acquire only the transient coarse country hint from the supported server request surface;
5. map it through the approved versioned jurisdiction policy registry;
6. resolve server-owned final eligibility, including Production environment and current Product policy;
7. forward at most one minimized event only when every dimension is eligible.

Any failure produces `POSTHOG_FORWARD_COUNT = 0`. Receipt validity alone is insufficient. The current relay does not yet perform these checks, so this is an implementation and deterministic-QA requirement, not current runtime evidence.

## Privacy Center Mount Gate

```text
PRIVACY_CENTER_PUBLIC_MOUNT_READY = NO
```

Mounting remains blocked until persistence is implemented, jurisdiction behavior is backed by an approved policy registry, effective state is honest, withdrawal survives reload under the approved threat model, ko/en copy remains complete, and focused runtime plus browser validation passes. The current unmounted view model remains the accepted foundation.

## Analytics Activation Gate

```text
ANALYTICS_ACTIVATION_READY = NO
```

Selection does not compress the remaining Gates. Activation still requires consent receipt implementation, approved jurisdiction-policy mappings, relay revalidation, public Privacy Center mount, Product event wiring, browser/network proof, PostHog retention readback, Security review, exact build evidence, Release, Production, and Deployment authority.

## Free-first Boundary

The selected baseline requires no database, KV, paid GeoIP API, paid identity service, or commercial consent-management platform. HMAC/authenticated receipt operations and an already-supported Vercel country hint can fit the current server route without a new paid service, subject to future current-plan and runtime verification.

```text
NEW_DB = 0
NEW_KV = 0
PAID_GEOLOCATION_API = 0
PAID_CMP = 0
NEW_PAID_SERVICE = 0
```

FREE_FIRST is a design boundary, not an unlimited-free guarantee.

## Security Review Boundary

No Security PASS is claimed. A focused future review must cover:

- authenticated receipt algorithm and constant-time verification;
- dedicated secret generation, scope, rotation, redaction, and rollback;
- cookie `HttpOnly`, `Secure`, `SameSite`, path, domain, and expiry attributes;
- receipt forgery, stale-policy use, copied old-allow rollback/replay, and key-version handling;
- CSRF, cross-site requests, origin/host checks, and consent endpoint abuse;
- receipt exposure in logs, errors, caches, browser code, and PostHog payloads;
- deterministic invalidation on policy/schema version changes;
- hostile or missing platform country-header behavior;
- no coupling to Product guest/account or Analytics identity.

If stateless rollback/replay cannot meet the approved withdrawal threat model, the implementation Gate must stop and return an exact server-state alternative rather than silently weakening withdrawal semantics.

## Legal Review Map

Before any country policy is activated, qualified review must answer:

- whether Analytics requires explicit opt-in for each intended launch jurisdiction;
- legal treatment and disclosure requirements for privacy-choice/consent storage;
- required public privacy notice and consent-copy content;
- PostHog processor/subprocessor disclosure and applicable contractual terms;
- consent receipt and Analytics retention/expiry requirements;
- withdrawal, deletion, and proof expectations;
- cross-border transfer treatment for the selected PostHog EU region;
- whether transient IP-derived country-hint use and disclosure are acceptable;
- whether a self-declared region fallback is appropriate and how conflicts are handled.

No worldwide legal research, country assignment, GDPR/PIPA/CCPA PASS, or global compliance claim is made.

## Decision / Remaining Blockers

```text
RECOMMENDED_PHASE_1_CONSENT_PERSISTENCE = SERVER_VERIFIABLE_SIGNED_FIRST_PARTY_CONSENT_RECEIPT
RECOMMENDED_JURISDICTION_SIGNAL_ARCHITECTURE = SERVER_SIDE_TRANSIENT_COARSE_COUNTRY_HINT_WITH_FAIL_CLOSED_POLICY_REGISTRY
LEGAL_POLICY_MAPPING_STATUS = NOT_COMPLETED / LEGAL_REVIEW_REQUIRED
PRIVACY_CENTER = UNMOUNTED
CONSENT_PERSISTENCE = NOT_IMPLEMENTED
JURISDICTION_RUNTIME = NOT_IMPLEMENTED
PRODUCT_EVENT_WIRING = 0
LIVE_ANALYTICS = 0
```

The smallest next decision-bearing task is `MYOTT_ANALYTICS_JURISDICTION_POLICY_LEGAL_REVIEW_PACKET_V1`. It should prepare exact jurisdiction questions, launch-country scope, policy-registry evidence requirements, storage/expiry questions, and qualified-review handoff without implementing country rules or Analytics.
