# Codex Mode Selection Policy

Version: 3.0

Status: ACTIVE

## Purpose

This document is the Git-canonical authority for selecting a Codex Model Family and Reasoning Level. It is intentionally short enough to reread before every new Codex task.

## Core Rules

- Universal default model: **NONE**
- Selection principle: **LOWEST SUFFICIENT MODEL + LOWEST SUFFICIENT REASONING**
- Previous task mode inheritance: **PROHIBITED**
- Mode auto-change: **PROHIBITED**
- Model choice and reasoning choice are independent decisions.
- A task Return Packet must separately record `REQUESTED_MODEL`, `REQUESTED_REASONING`, and `REQUESTED_ORCHESTRATION` from `ACTUAL_MODEL`, `ACTUAL_REASONING`, and `ACTUAL_ORCHESTRATION`.
- Record actual values only from explicit UI or trusted execution evidence. Otherwise record `NOT REPORTED / NOT INFERRED`; never infer actual values from requested values.
- For a task that invokes Codex, model, reasoning, and rationale must be explicit and nonblank. Use `NOT_APPLICABLE` only when the task does not invoke Codex.
- Conversation memory is a convenience cache; Git canonical policy is authority.

When policy sources conflict, use this order:

1. Newer explicit Founder Decision
2. This Git canonical policy
3. Conversation memory

## GPT-6 Model Routing Ladder

Use the lowest sufficient model and the lowest sufficient reasoning for the actual task. `ASTRA_BY_DEFAULT` is prohibited.

| Model Family | Availability | Role |
| --- | --- | --- |
| GPT-6 Luna | CURRENT | Mechanical, cost-sensitive, high-volume, routine bounded work, narrow repository mapping, and fast support work. |
| GPT-6 Terra | PENDING_AVAILABILITY | Standard engineering and balanced implementation/review work once current UI/runtime evidence confirms availability. Do not invent an actual Terra execution before that evidence exists. |
| GPT-6 Sol | CURRENT | Complex engineering, multi-module implementation, advanced judgment, and higher-complexity work where Astra is not necessary. |
| GPT-6 Astra | CURRENT | Frontier, consequential, end-to-end, highest-general-capability, architecture, or difficult cross-domain work when the task actually requires it. |

The active routing policy is GPT-6-family-first. Pre-GPT-6 model families are historical execution evidence only and are not selected for new work under this policy.

Select both model and reasoning from task complexity, read/write scope, reversibility, external mutation, security boundary, evidence-synthesis burden, cost, and latency. A model family does not imply a fixed reasoning level.

## Availability Evidence

The current public OpenAI model guidance identifies the GPT-6 family as Astra, Sol, and Luna. Founder has separately confirmed GPT-6 Terra is expected to join the operating menu soon.

Therefore:

- Luna / Sol / Astra may be requested when exposed by the current product/runtime.
- Terra remains `PENDING_AVAILABILITY` until the current Codex/Work UI, execution metadata, or other trusted product evidence shows GPT-6 Terra is actually selectable.
- A stale UI entry or historical receipt does not restore a deprecated operating route.
- Catalog changes update this projection; they do not change the stable lowest-sufficient selection principle.

## Reasoning and Orchestration

Canonical reasoning ladder:

`LOW -> MEDIUM -> HIGH -> XHIGH -> MAX`

`Ultra` is excluded from the normal reasoning ladder. If a product later exposes a separate orchestration preset with a similar name, it must be treated as orchestration rather than silently promoted to a reasoning level.

A task may request only a reasoning level supported by the selected model/runtime. Do not infer a complete per-model menu from another model's UI.

## Daybreak Blue

Daybreak Blue is a defensive-security specialist track orthogonal to the GPT-6 general engineering ladder. It is neither above nor below Astra, is not a normal ladder step or quota fallback, and does not itself resolve an Execution Security Gate.

Appropriate uses include vulnerability analysis, threat modeling, sandbox or trust-boundary review, security-control analysis, and defensive security review. It is not for ordinary Product implementation, routine Git persistence, generic documentation, or general architecture without focused security value.

Use the currently supported GPT-6 backing model only when trusted product evidence confirms it. Do not assume future Terra support until exposed.

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

## Policy History

V3 supersedes V2's active model catalog while preserving the durable rules:

- no universal default model;
- no prior-task inheritance;
- lowest sufficient model and reasoning;
- Requested/Actual separation;
- Daybreak as a specialist track;
- evidence-based actual-mode reporting.

Past append-only logs may retain historical model names because they are execution evidence, not current routing authority.

## Mandatory Reread

Reread `AGENTS.md` and this policy before:

- the first Codex execution of every new task;
- a new HQ chat or HQ migration;
- continuity recovery or context restoration;
- a requested mode that appears copied from the previous task without task-specific rationale;
- any mode-policy uncertainty or conflict; and
- a Founder question about the mode choice.

Recent repetition is not policy.
