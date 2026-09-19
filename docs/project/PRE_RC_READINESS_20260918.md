# Pre-RC readiness — refreshed 2026-09-19

Status: `PARTIAL / CURRENT_PR_CI_GREEN_PREVIEW_SOURCE_BEHIND_AND_AUTH_ARTIFACT_OPEN`.
Scope: public-safe documentation plus read-only GitHub/Vercel metadata. No Product implementation, provider execution, secret read, deployment, Main merge, Production or Release action occurred in this refresh.

## Source identities
- Product behavior checkpoint: `5cc0eaf19bb411f7f6de52ef1917fccf4af781f3` on open PR #4. The later PR head does not by itself mean Product behavior changed.
- Current PR #4 head / offline-CI source: `503797075a4180fc342999ce8961f702386bb0e0`. The current head adds bounded CI/test portability evidence and is open / unmerged.
- Status/mode documentation checkpoint: `7c631f6e6ac8c8fbb2e9d924ce5b7cf55fb4bd72`, open PR #5, stacked on the feature branch.
- Current readiness-document checkpoint before this refresh: `0bcb77c4cb304159ce222b639e3e4090c5c41893`, open PR #6, stacked on PR #5.
- Operating ND Studio engine identity is separate from Product source and remains outside this Product readiness document.

## Current remote CI evidence
GitHub Actions run `35400294943` reports PR #4 head `503797075a4180fc342999ce8961f702386bb0e0` and concluded `success`.
The `myott-core-offline` job `105778411964` and `myott-targeted-offline` job `105778412196` both concluded `success`. Checkout logs show the jobs actually checked out `refs/pull/4/merge` at integration SHA `7500fb6e85ec2612b8e37cb85e33dcddf3c2eff6`, recorded as merging head `503797...` into then-main `5467e9a2f8ed05202bfd70d14490c51c808c34e2`.
Current default main is now `1097fe5f9638c8ef2176a5f8d6b6faa4971781d1`; the reviewed `5467e9a...` → `1097fe5...` delta is limited to `README.md`, `DEVELOPMENT_STATUS.md`, and `docs/dev-log.md`. The existing CI is therefore preserved as exact historical integration evidence, not relabeled as a new run against the later main ref.
This is offline CI evidence for the current PR head plus that recorded integration ref. It is not a fresh provider-Live run, Founder Product QA, Preview artifact proof, current-main integration proof or Release approval.

## Current Preview metadata
Fresh read-only Vercel metadata on 2026-09-19 reports latest Preview `dpl_CxmPxQmcvoWJj2jPhr4951WS6nsW` as `READY`, source `cli`, with metadata source `5cc0eaf19bb411f7f6de52ef1917fccf4af781f3`.
That Preview metadata source is behind the current PR #4 head `503797...`; therefore it cannot be treated as the current PR-head Preview.
Metadata identifies a source label, not exact deployed bytes. No authenticated application `/api/status` response or exact artifact/source binding was obtained in this metadata-only refresh.

## Evidence retained, not rerun
The existing exact-checkpoint receipts for Unit `275/275`, deterministic recommendation QA `107/107`, focused security `82/82`, Live TMDB cold `66/66`, Browser `24/24 OFFLINE/MOCK` and managed build remain historical evidence for their recorded source.
They were not rerun in this documentation refresh and are not relabeled as current remote-Live or current Preview evidence.

## Remaining gates and concrete closure evidence
| Gate | Current finding | Evidence required to close |
| --- | --- | --- |
| Current PR-head Preview | Latest Preview metadata is on `5cc0eaf...`, while PR #4 head is `503797...`. | A reviewed Preview tied to the exact intended RC candidate source. |
| Authenticated Preview app response | Not obtained in this refresh. | Authorized app response such as `/api/status`, bound to the exact Preview and excluding sensitive data. |
| Exact artifact/source provenance | Not proven. Source metadata alone is insufficient. | Reviewed clean build/source manifest and deployment artifact binding, or verified equivalent provenance. |
| Credential readiness | Unknown; no secret value was read. | Non-secret capability/configuration evidence through an approved path. |
| Remote provider validation | Not executed. | Separate bounded Remote Live authorization after preceding gates; preserve existing budgets. |
| Founder / HQ / Main / Production / Release | No new approval or action. | Separate protected decisions with current-source evidence. |

## Next bounded step
Establish an exact intended RC candidate and close Preview source alignment, authenticated app-response evidence and artifact/source provenance without weakening authentication, reading secret values, redeploying automatically or repeating completed tests for activity.
