# PostHog Browser SDK Withdrawal Pending-Queue Proof

## Authority

- Task: `MYOTT_POSTHOG_BROWSER_SDK_WITHDRAWAL_PENDING_QUEUE_PROOF_V1`
- Class: privacy activation blocker / official-source proof / docs-only
- Research date: 2026-09-10 KST
- Product base: `ec3ff32c2154c3794a7ec42eb0b79008438423a6`
- Official-source network was read-only. The SDK was not installed or executed, and no event was sent.
- Founder withdrawal semantics are unchanged: after eligibility withdrawal, unsent or retry-pending nonessential events must be discarded, not transmitted later.

## Current Blocker

The accepted session-only architecture requires both pre-consent suppression and a supported mid-session withdrawal path. The unresolved blocker was whether the PostHog Browser SDK exposes public APIs that can discard every ordinary pending request and retry without later unload or reconnect transmission.

This proof resolves that blocker negatively for the pinned source snapshot. It does not reverse the PostHog Cloud provider selection and does not authorize Analytics activation.

## Research Snapshot

| Item | Evidence |
| --- | --- |
| Browser SDK version | `1.428.10` from the pinned repository package metadata |
| Git commit | `412c97ccf43b525e5a12606ba049eab14c440ed0` |
| Commit date | `2026-09-10T07:11:45Z` |
| Commit | [PostHog/posthog-js 412c97c](https://github.com/PostHog/posthog-js/commit/412c97ccf43b525e5a12606ba049eab14c440ed0) |
| Snapshot scope | Browser core, request transport, RequestQueue, RetryQueue, public types, and focused official tests |
| Material docs/source conflict | None found for the queue-withdrawal question. Public `shutdown()` documentation and source both describe/implement queue flushing rather than discard. |

The GitHub tree API reported the pinned tree as complete, not truncated. Version alone was not treated as capability evidence; the verdict follows the exact source and public type surface.

## Public API Inventory

| API/configuration | Classification | Withdrawal relevance |
| --- | --- | --- |
| `capture` | `PUBLIC_SUPPORTED` | Creates an event and enters the batching or retriable-send path. It returns event data, not a queue or network cancellation handle. |
| `before_send` | `PUBLIC_SUPPORTED` | Can reject an event before its first request is formed. It is not re-entered for a RetryQueue retry. |
| `opt_out_capturing` | `PUBLIC_SUPPORTED` | Disables future capture and updates consent/persistence state; it does not clear ordinary RequestQueue or RetryQueue contents. |
| `opt_in_capturing` | `PUBLIC_SUPPORTED` | Enables capture and can emit the opt-in event. It is not a pending-event discard operation. |
| `shutdown` | `PUBLIC_SUPPORTED` | Explicitly unloads both queues, which flushes/sends pending entries. Unsafe as a withdrawal discard mechanism. |
| `reset` | `PUBLIC_SUPPORTED` | Resets consent, identity, persistence, flags, and session state. It does not clear ordinary request/retry queues. |
| `set_config` | `PUBLIC_SUPPORTED` | Changes configuration and related subsystems; no pending request/retry discard is exposed. |
| `request_batching` | `PUBLIC_SUPPORTED` | Chooses whether eligible captures enter RequestQueue. It does not disable RetryQueue. |
| `send_instantly` | `PUBLIC_SUPPORTED` | Skips RequestQueue for that capture. Normal active-page transport failures still enter RetryQueue. |
| `disable_persistence` / `persistence` | `PUBLIC_SUPPORTED` | Controls browser persistence/identity state, not the in-memory request and retry queues. |
| `request_queue_config` | `PUBLIC_SUPPORTED` | Exposes `flush_interval_ms` only; no discard, cancel, or pause-and-drop control. |
| retry-disable configuration | `NOT_FOUND` | No supported public configuration disables RetryQueue for ordinary captures. |
| request/transport cancellation | `NOT_FOUND` | No public fetch/XHR/sendBeacon cancellation handle is returned. |
| queue clear/discard/cancel | `NOT_FOUND` | No public PostHog Browser API clears both ordinary queues without sending them. |
| `disable_beacon` | `PUBLIC_BUT_NOT_RELEVANT` | Transport selection is not a discard contract; changing it does not remove pending entries or prevent normal retry dispatch. |
| `_requestQueue`, `_retryQueue`, their `_queue`/`_poller` fields | `PRIVATE_INTERNAL` | Official tests inspect these fields, but they are not part of the public PostHog interface and are prohibited for MyOTT production use. |

Public interface evidence: [`PostHogInterface`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/types/src/posthog.ts#L73-L209), [consent and configuration methods](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/types/src/posthog.ts#L550-L607), [`CaptureOptions.send_instantly`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/types/src/capture.ts#L90-L104), and [`RequestQueueConfig`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/types/src/posthog-config.ts#L1019-L1027).

## Capture Path

The canonical manual capture path at the pinned snapshot is:

```text
capture()
  -> event construction
  -> before_send
  -> requestOptions construction
  -> if request_batching and not send_instantly: RequestQueue.enqueue()
  -> otherwise: _send_retriable_request()
  -> RetryQueue.retriableRequest()
  -> _send_request()
  -> selected transport
```

The core creates RequestQueue and RetryQueue during initialization. `before_send` executes before `requestOptions` is formed. A batched capture enters RequestQueue; an unbatched or `send_instantly` capture calls the retriable path directly. [`posthog-core.ts`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/posthog-core.ts#L885-L889), [`capture` dispatch](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/posthog-core.ts#L1847-L1907).

### `request_batching = true`

- Ordinary captures enter RequestQueue unless an option such as `send_instantly` skips batching.
- RequestQueue flush dispatches through the normal retriable request path.
- A retriable failure can therefore create RetryQueue state.
- Withdrawal risk exists in both queue classes.

### `request_batching = false`

- Ordinary captures bypass RequestQueue.
- `_send_retriable_request()` still uses RetryQueue.
- Therefore `request_batching = false` eliminates only RequestQueue exposure for new ordinary captures; it does not eliminate retry-pending state.

### `send_instantly = true`

- The capture skips RequestQueue.
- On an active page, a status `0` or `503` response is retained in RetryQueue by the official focused test.
- It is not a no-retry or withdrawal-safe mode. [`posthog-core.instant-send-retry.test.ts`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/posthog-core.instant-send-retry.test.ts#L47-L57)

## RequestQueue

`enqueue()` appends a timestamped item to private `_queue` and schedules a flush. Normal flush formats and empties the queue only as part of dispatching its contents. `unload()` clears the timer, formats every remaining entry, and calls the send function with `transport: 'sendBeacon'`; it does not discard. No clear, discard, cancel, or pause-and-drop method exists on the class. [`request-queue.ts`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/request-queue.ts#L18-L109)

The official test verifies that unload sends all queued groups with `sendBeacon`. [`request-queue.test.ts`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/request-queue.test.ts)

`REQUEST_QUEUE_PUBLIC_DISCARD = NOT_SUPPORTED`

## RetryQueue

`retriableRequest()` sends immediately and enqueues already-formed `requestOptions` when the response is retriable. The source treats non-200 status below 400 or at least 500 as retriable. It allows three retries for status `0` and ten for other retriable responses. Delay uses jittered exponential backoff with a 30-minute raw-delay cap.

The queue pauses delivery while offline, resumes and flushes on `online`, and has its own poller. `unload()` clears the poller and listeners, then sends every pending retry with `transport: 'sendBeacon'` before emptying the queue. There is no public clear, discard, cancel, or supported retry-disable switch. [`retry-queue.ts`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/retry-queue.ts#L27-L203)

Official tests verify both unload-to-beacon and reconnect flushing, and directly access private `_queue`/poller state for test inspection. [`retry-queue.test.ts`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/retry-queue.test.ts)

`RETRY_QUEUE_PUBLIC_DISCARD = NOT_SUPPORTED`

`RETRY_DISABLE_PUBLIC_CONFIG = NOT_SUPPORTED`

## `before_send` Retry Semantics

`before_send` is evaluated once before the first request options are built. RetryQueue stores those already-formed request options and later calls `_send_request()` directly. Its retry path does not call `capture()` or `_runBeforeSend()` again.

Consequently, an event accepted while consent was valid is not re-evaluated against a later MyOTT eligibility state when RetryQueue dispatches it.

`BEFORE_SEND_REEVALUATED_ON_RETRY = NO`

## `shutdown()`

The public type describes shutdown as flushing queued events and performing best-effort cleanup. The implementation explicitly calls both `_requestQueue.unload()` and `_retryQueue.unload()`. Those unload methods send pending items, normally with `sendBeacon`. Official shutdown tests assert that both queue unload methods are called. [`shutdown` source](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/posthog-core.ts#L3738-L3787), [`shutdown` tests](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/posthog-core.shutdown.test.ts#L18-L44)

`SHUTDOWN_WITH_PENDING_EVENTS = FLUSH_SEND`

Shutdown is therefore contraindicated as a strict-consent withdrawal operation.

## `opt_out_capturing()`

The method records opt-out consent and synchronizes persistence state. The only explicit buffered-event discard in that method concerns session recording in a specific cookieless rejection mode. It does not clear the ordinary RequestQueue or RetryQueue. Existing ordinary queue entries can remain eligible for timer, reconnect, shutdown, or lifecycle dispatch. [`opt_out_capturing` source](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/posthog-core.ts#L4686-L4725)

`OPT_OUT_DISCARDS_EXISTING_PENDING = NO`

Future capture suppression is not proof of old pending-event disposal.

## `reset()`

`reset()` clears consent, identities, persistence, flags, and session state. It does not clear ordinary RequestQueue or RetryQueue. It can also perform other lifecycle work, including feature-flag reload behavior, so it is not a network-queue disposal primitive. [`reset` source](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/posthog-core.ts#L3600-L3735)

`RESET_SAFE_PENDING_DISCARD = NO`

## In-flight Cancellation

The fetch transport creates an internal `AbortController` for SDK timeout handling, but does not expose that controller to `capture()` callers. XHR request objects are likewise internal. The public capture/request surface returns no abort handle. An accepted `sendBeacon` has no cancellation handle. [`request.ts`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/request.ts#L312-L469), [`request` entry point](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/request.ts#L533-L557)

`PUBLIC_INFLIGHT_ABORT = NOT_SUPPORTED`

The states remain distinct:

- `ALREADY_DISPATCHED`: cannot be retroactively retracted.
- `QUEUED_UNSENT`: no supported public discard API.
- `RETRY_PENDING`: no supported public discard or retry-disable API.

## Unload / BFCache

On the ordinary pagehide/unload path with batching enabled, the core unloads both queues. Each queue sends its remaining contents by beacon. When batching is disabled, the core does not unload RequestQueue on that branch, but active-page failures remain represented by RetryQueue and normal connectivity handling remains relevant.

On `pageshow`, the core clears the unloading flag and resumes RetryQueue when the client was not explicitly shut down. The official BFCache test verifies that retry connectivity survives pagehide/pageshow and that a queued retry can send after an online transition. [`page lifecycle source`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/posthog-core.ts#L1028-L1044), [`unload handler`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/posthog-core.ts#L1357-L1383), [`BFCache retry test`](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/posthog-core.bfcache-retry.test.ts)

Because opt-out does not remove ordinary queue entries, a post-withdrawal timer, reconnect, page lifecycle, or explicit shutdown may transmit previously accepted pending data.

`POST_WITHDRAWAL_LIFECYCLE_SEND_RISK = YES`

## Private Internal APIs

Official tests inspect or spy on `_requestQueue`, `_retryQueue`, private `_queue`, and `_poller` state. That is evidence about implementation behavior, not a stable public contract. The public PostHog interface does not expose a supported all-queue discard operation.

`MYOTT_PRIVATE_INTERNAL_API_DEPENDENCY = PROHIBITED`

MyOTT must not mutate underscore fields, monkey-patch transports, or depend on private queue layout for a privacy-critical guarantee.

## Configuration Matrix

| Configuration | RequestQueue exposure | RetryQueue exposure | Strict withdrawal result |
| --- | --- | --- | --- |
| `request_batching = false` | New ordinary captures bypass it | Yes; retriable dispatch is still used | `FAIL`: retry-pending events cannot be publicly discarded |
| `request_batching = false` plus `send_instantly` | Same as unbatched; option adds no discard | Yes; official test proves instant-send retry retention | `FAIL` |
| `request_batching = true` | Yes for ordinary batched captures | Yes after flush/failure | `FAIL`: both queue classes are exposed |
| `disable_persistence = true` | Still created | Still created | `FAIL`: persistence and network queues are separate concerns |

No combination supplies public queue clearing, retry cancellation, in-flight abort, or a guarantee against unload/reconnect transmission.

## Strict Founder Pass Matrix

| # | Required criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | No pending RequestQueue events after withdrawal | `FAIL` | Opt-out does not clear it; no public discard API exists. |
| 2 | No pending RetryQueue events after withdrawal | `FAIL` | Opt-out does not clear it; no public discard API exists. |
| 3 | No later lifecycle sendBeacon | `FAIL` | Queue unload methods send pending entries by beacon. |
| 4 | No later retry after withdrawal | `FAIL` | RetryQueue preserves formed requests; reconnect/BFCache can resume delivery. |
| 5 | No private queue mutation | `PASS` | MyOTT prohibition remains intact; no private workaround is accepted. |
| 6 | No monkey patching | `PASS` | No monkey patch is proposed or used. |
| 7 | No unsupported SDK internals | `PASS` | The verdict rejects private internals as a solution. |
| 8 | No pre-consent load/network | `PASS` | Existing architecture keeps this independent requirement; this proof performed no SDK load or event send. |
| 9 | No persistent Analytics identity | `PASS` | Existing Phase 1 requirement remains unchanged; persistence controls do not resolve queue safety. |
| 10 | No redefinition of withdrawal semantics | `PASS` | An event's earlier eligibility is not treated as permission for post-withdrawal retry. |

Strict matrix: `6 PASS / 4 FAIL`. Any one queue-class failure is dispositive, so the Browser SDK strict-withdrawal result is `FAIL`.

## Verdict

```text
REQUEST_QUEUE_PUBLIC_DISCARD = NOT_SUPPORTED
RETRY_QUEUE_PUBLIC_DISCARD = NOT_SUPPORTED
RETRY_DISABLE_PUBLIC_CONFIG = NOT_SUPPORTED
BEFORE_SEND_REEVALUATED_ON_RETRY = NO
SHUTDOWN_WITH_PENDING_EVENTS = FLUSH_SEND
OPT_OUT_DISCARDS_EXISTING_PENDING = NO
RESET_SAFE_PENDING_DISCARD = NO
PUBLIC_INFLIGHT_ABORT = NOT_SUPPORTED
POST_WITHDRAWAL_LIFECYCLE_SEND_RISK = YES
PUBLIC_API_WITHDRAWAL_SAFE_DISCARD = NOT_SUPPORTED
BROWSER_SDK_STRICT_WITHDRAWAL = FAIL
```

The pinned supported public API cannot guarantee that every unsent or retry-pending nonessential event is discarded on mid-session withdrawal. The existing activation blocker is therefore proven, not merely untested.

```text
POSTHOG_CLOUD_PROVIDER = STILL_SELECTED
POSTHOG_BROWSER_SDK_PHASE_1 = NOT_ELIGIBLE_UNDER_CURRENT_STRICT_WITHDRAWAL
ANALYTICS_RUNTIME = NOT_IMPLEMENTED
ACTIVATION = NOT_AUTHORIZED
```

## Next Architecture Path

`MYOTT_POSTHOG_WITHDRAWAL_SAFE_DIRECT_INGESTION_TRANSPORT_ARCHITECTURE_V1`

That future docs-first Task may evaluate a MyOTT-owned minimal transport with no SDK auto behavior, no hidden internal queue, no retry unless explicitly designed, an owned AbortController where applicable, the canonical five-event payload, strict property allowlist/redaction, and the EU ingestion target. It must not implement or activate Analytics without its own authority.

## Sources

Official PostHog sources inspected at the pinned commit:

- [Browser core](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/posthog-core.ts)
- [RequestQueue](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/request-queue.ts)
- [RetryQueue](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/retry-queue.ts)
- [Browser request transports](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/request.ts)
- [Public PostHog interface](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/types/src/posthog.ts)
- [Capture options and `before_send` types](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/types/src/capture.ts)
- [Browser configuration types](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/types/src/posthog-config.ts)
- [RequestQueue tests](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/request-queue.test.ts)
- [RetryQueue tests](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/retry-queue.test.ts)
- [`shutdown()` tests](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/posthog-core.shutdown.test.ts)
- [`send_instantly` retry tests](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/posthog-core.instant-send-retry.test.ts)
- [BFCache retry tests](https://github.com/PostHog/posthog-js/blob/412c97ccf43b525e5a12606ba049eab14c440ed0/packages/browser/src/__tests__/posthog-core.bfcache-retry.test.ts)
- [JavaScript SDK configuration](https://posthog.com/docs/libraries/js/config)
- [JavaScript SDK usage](https://posthog.com/docs/libraries/js/usage)
- [PostHog data collection and privacy](https://posthog.com/docs/privacy/data-collection)

Cross-contract sources:

- `POSTHOG_SESSION_ONLY_MEASUREMENT_IMPLEMENTATION_ARCHITECTURE.md`
- `PRIVACY_CONSENT_MEASUREMENT_ELIGIBILITY_MATRIX.md`
- `GROWTH_MEASUREMENT_EVENT_TAXONOMY.md`
- `FREE_FIRST_ANALYTICS_PROVIDER_DECISION_PACKET.md`

No supported assertion in this proof depends on private queue mutation, an installed SDK, or a runtime experiment.
