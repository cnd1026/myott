# Recommendation QA Operations

Status: ACTIVE OPERATIONS REFERENCE

This document standardizes how to select and invoke the approved Recommendation QA layers. It is not execution authority. Every run still requires a task that names the intended layer, source identity, network boundary, and receipt requirements.

## Scope And Boundaries

Generated deterministic QA and Browser representative QA are separate coverage layers. Their denominators must never be added together as one end-to-end result.

`REC-QA-091` is `CLOSED / PRESERVED`. Do not select or execute it. The following aggregate commands remain prohibited while they can select prohibited QA:

- `pnpm qa:recommendation`
- `pnpm check`

## Generated Deterministic QA

Suite ID: `MYOTT_RECOMMENDATION_GENERATED_CONTRACT_REGRESSION_V1`

Safe entrypoint, when a task authorizes execution:

```powershell
node --test src/lib/recommendation/qa/generatedContractMatrix.test.mjs
```

Invocation class: direct Node test-runner invocation. Run from the repository root with the task-approved Node runtime and no positional paths or extra arguments. The module uses Node's built-in test runner, writes its receipt to the task-local TEMP location, exercises deterministic Product contracts and route imports with stubs, and records Product/TMDB Network `0` and `REC-QA-091 selected/executed 0/0`.

This suite has a committed module but no dedicated safe package script. That absence alone does not justify a wrapper: the direct Node test runner preserves stdout, stderr, and exit status faithfully. A wrapper must not be introduced unless a separately approved task proves a real dispatch or result-propagation defect.

## Browser Representative QA

Historical harness source: `scripts/recommendation-browser-representative.mjs`

Historical direct entrypoint:

```powershell
node scripts/recommendation-browser-representative.mjs
```

Invocation class: task-owned, isolated Browser functional lifecycle. It is not a generic current-Main command. The committed harness preflight is intentionally pinned to its original Browser-QA checkpoint, branch, and approved base. At the integrated Main checkpoint it must not be run as a shortcut or repaired by changing its source.

When a separately approved Browser task renews the lifecycle, it must prove the exact supported Node and Chrome/CDP surface, isolated task-owned browser profile, localhost-only temporary server on `3001-3100`, task-owned process cleanup, and Founder Preview `3000` preservation. The historical A2 receipt used Next `15.5.25` and the process-local `MYOTT_BROWSER_QA_FIRST_PICKS_FIXTURE=A2_OFFLINE_FIRST_PICKS_V1` binding. That binding is default-off, non-public, and fails closed without live-provider fallback.

Browser receipts must separately ledger Browser external, Product-provider external, and third-party network. They must preserve C1 immutable request ownership, C2 desired selected-state control, visible responsive submit selection, deterministic S6 latest-request-wins evidence, and personal browser/profile/cookie isolation.

## Suite Selection

| Outcome | Select when the change materially affects |
| --- | --- |
| GENERATED | Selectable options, compatibility, country/OTT/genre/content type, Hard Filter, semantic qualification, candidate eligibility or allocation, normalization, deterministic options/seeds routes, or deterministic provider fixtures. |
| BROWSER | Visible controls, selected or submitted state, serialization, loading/result/error UI, responsive submit behavior, Browser request ownership, or client races. |
| BOTH | The change materially crosses both deterministic Recommendation contracts and Browser-facing behavior. |
| NEITHER | Documentation, router wording, or another change that alters neither Product behavior nor either suite's execution path. |
| FOCUSED_CHECK_ONLY | A narrow helper, operations, or harness-adjacent change where one necessary focused regression or selftest is sufficient. |

Generated and Browser QA do not replace existing focused regressions. Do not choose a layer from file path alone.

## Receipt Contract

Future supported receipts report, as applicable: `SOURCE_SHA`, `SUITE_ID`, `ENTRYPOINT`, `INVOCATION_CLASS`, Node/runtime identity, `GENERATED`, `SELECTED`, `EXECUTED`, `ASSERTED`, `PASS`, `FAIL`, `SKIPPED`, `BLOCKED`, `NOT_RUN`, Product/TMDB Network, `REC_QA_091_SELECTED/EXECUTED`, and artifact or manifest identity.

Historical coverage remains separate: Generated deterministic QA is `2727 generated/executed/asserted/pass`; Browser representative QA is `18 generated/executed/asserted/pass`. Neither result grants production, live-provider, Security Seal, Founder Preview, or Browser execution authority.

## Current Operational Limitation

The Browser harness remains a historical-checkpoint entrypoint. A current-Main Browser run requires a separately approved lifecycle renewal; this document does not authorize that implementation, a Browser run, a temporary Product server, a new dependency, a package change, or a new wrapper.
