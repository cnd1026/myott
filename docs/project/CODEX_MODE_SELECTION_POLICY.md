# Codex Mode Selection Policy

Version: 4.0

Status: ACTIVE

Founder Decision Date: 2026-10-01

## Purpose

This document is the Git-canonical authority for selecting a Codex Model Family and Reasoning Level. It is intentionally short enough to reread before every new Codex task.

## Core Rules

- Universal default model: **NONE**
- Selection principle: **LOWEST SUFFICIENT MODEL + LOWEST SUFFICIENT REASONING**
- Previous task mode inheritance: **PROHIBITED**
- Mode auto-change: **PROHIBITED**
- Mode change authority: **HQ / Founder only**
- Model choice, reasoning choice, and orchestration choice are separate decisions.
- A task Return Packet must separately record `REQUESTED_MODEL`, `REQUESTED_REASONING`, and `REQUESTED_ORCHESTRATION` from `ACTUAL_MODEL`, `ACTUAL_REASONING`, and `ACTUAL_ORCHESTRATION`.
- Record actual values only from explicit UI or trusted execution evidence. Otherwise record `NOT REPORTED / NOT INFERRED`; never infer actual values from requested values.
- For a task that invokes Codex, model, reasoning, and rationale must be explicit and nonblank. Use `NOT_APPLICABLE` only when the task does not invoke Codex.
- Conversation memory is a convenience cache; Git canonical policy is authority.

When policy sources conflict, use this order:

1. Newer explicit Founder Decision
2. This Git canonical policy
3. Conversation memory

## Current General Routing Ladder

Use the lowest sufficient model and lowest sufficient reasoning for the actual task. `ASTRA_BY_DEFAULT` is prohibited.

| Model Family | State | ND Studio routing role |
| --- | --- | --- |
| GPT-6.0 Luna | CURRENT | Mechanical, routine, bounded, high-volume, deterministic verification, narrow support work. |
| GPT-6.0 Sol | CURRENT | Standard engineering, normal implementation/review, bounded multi-file work. |
| GPT-6.1 Sol | CURRENT | Complex engineering, difficult cross-file root cause, advanced judgment, higher-complexity implementation/review. |
| GPT-6.0 Astra | CURRENT | Frontier, consequential, end-to-end, architecture, difficult cross-domain recovery or highest-general-capability work when justified. |

The current operating ladder is:

`GPT-6.0 Luna -> GPT-6.0 Sol -> GPT-6.1 Sol -> GPT-6.0 Astra`

GPT-5.6 families and GPT-6 Terra are **not current selectable routes under this V4 policy**. They remain historical evidence where they were actually used or previously projected.

A model family does not imply a fixed reasoning level.

## Reasoning And Orchestration

Canonical reasoning ladder:

`LOW -> MEDIUM -> HIGH -> XHIGH -> MAX`

Select the lowest sufficient reasoning independently from model family.

`Ultra` is excluded from the current operating reasoning catalog. Historical UI observations that included Ultra remain historical evidence and must not be rewritten.

Orchestration is separate from native reasoning. Parallel/delegated execution must be recorded separately and must not be inferred from the model or reasoning choice.

## Daybreak Blue

Daybreak Blue is a defensive-security specialist track orthogonal to the general routing ladder.

It is neither above nor below Astra, is not a normal ladder step, and is not a quota fallback.

Appropriate uses include focused defensive-security work such as:

- vulnerability analysis;
- threat modeling;
- sandbox / containment review;
- filesystem trust-boundary analysis;
- canonical-path / reparse / TOCTOU defense review;
- authentication / authorization review;
- secret-handling review;
- defensive hardening and security regression validation.

Do not use Daybreak Blue for ordinary Product implementation, routine bug fixes, UI/UX, generic documentation, ordinary Git persistence, or general architecture without focused defensive-security Decision Value.

Selecting Daybreak Blue does not expand Founder authority, filesystem authority, Network authority, credential authority, Release authority, Production authority, or any Execution Security Gate.

## Requested And Actual

Requested fields:

- `REQUESTED_MODEL`
- `REQUESTED_REASONING`
- `REQUESTED_ORCHESTRATION`

Actual fields:

- `ACTUAL_MODEL`
- `ACTUAL_REASONING`
- `ACTUAL_ORCHESTRATION`

Requested values describe routing intent. Actual values require independent evidence from the execution surface.

If execution metadata is unavailable:

`ACTUAL = NOT REPORTED / NOT INFERRED`

Never rewrite a historical receipt to a newer model family. Historical execution records preserve what actually ran at that time.

## History Preservation And Supersession

Model policy history is append-preserving, not destructively rewritten.

Preserve:

`ORIGIN -> CHANGE -> CURRENT`

Rules:

- A current catalog change supersedes earlier routing authority but does not erase earlier decisions, UI observations, receipts, or execution evidence.
- Historical text must be explicitly marked historical/superseded when needed so it cannot override newer current authority.
- Past receipts keep the model/reasoning that actually ran.
- Current prompts/templates must use the current V4 catalog only.

### V4 — CURRENT — 2026-10-01

Founder current catalog:

- GPT-6.0 Luna
- GPT-6.0 Sol
- GPT-6.1 Sol
- GPT-6.0 Astra
- Daybreak Blue specialist track

### V3 — SUPERSEDED / HISTORICAL

V3 projected GPT-6 Luna, GPT-6 Terra (pending), GPT-6 Sol, GPT-6 Astra, with Daybreak Blue as the specialist track.

That projection is preserved as historical policy state. It is no longer current routing authority.

### V2 And Earlier — SUPERSEDED / HISTORICAL

Earlier GPT-5.6 Luna/Terra/Sol labels, earlier Astra/Daybreak UI snapshots, and older Ultra observations remain historical evidence where originally recorded. They are not selectable defaults for new work.

## Mandatory Reread

Reread `AGENTS.md` and this policy before:

- the first Codex execution of every new task;
- a new HQ chat or HQ migration;
- Continuity recovery or context restoration;
- a requested mode that appears copied from the previous task without task-specific rationale;
- any mode-policy uncertainty or conflict; and
- a Founder question about the mode choice.

Recent repetition is not policy.

END
