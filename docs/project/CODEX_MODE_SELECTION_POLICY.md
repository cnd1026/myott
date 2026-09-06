# Codex Mode Selection Policy

Version: 2.0

Status: ACTIVE

## Purpose

This document is the Git-canonical authority for selecting a Codex Model Family and Reasoning Level. It is intentionally short enough to reread before every new Codex task.

## Core Rules

- Universal default model: **NONE**
- Selection principle: **LOWEST SUFFICIENT MODEL + LOWEST SUFFICIENT REASONING**
- Previous task mode inheritance: **PROHIBITED**
- Mode auto-change: **PROHIBITED**
- Mode change authority: **HQ / Founder only**
- Model choice and reasoning choice are independent decisions.
- A task Return Packet must separately record `REQUESTED_MODEL`, `REQUESTED_REASONING`, and `REQUESTED_ORCHESTRATION` from `ACTUAL_MODEL`, `ACTUAL_REASONING`, and `ACTUAL_ORCHESTRATION`.
- Record actual values only from explicit UI or trusted execution evidence. Otherwise record `NOT REPORTED / NOT INFERRED`; never infer actual values from requested values.
- For a task that invokes Codex, model, reasoning, and rationale must be explicit and nonblank. Use `NOT_APPLICABLE` only when the task does not invoke Codex.
- Conversation memory is a convenience cache; Git canonical policy is authority.

When policy sources conflict, use this order:

1. Newer explicit Founder Decision
2. This Git canonical policy
3. Conversation memory

## Model Routing Ladder

Use the lowest sufficient model and the lowest sufficient reasoning for the actual task. `ASTRA_BY_DEFAULT` is prohibited.

| Model Family | Role |
| --- | --- |
| GPT-5.6 Luna | Mechanical, cost-sensitive, high-volume, and routine bounded work. |
| GPT-5.6 Terra | Standard engineering. |
| GPT-5.6 Sol | Complex engineering, advanced judgment, and higher-complexity work where Astra is not necessary. |
| GPT-6 Astra | Frontier, consequential, end-to-end, or highest-general-capability work when the task actually requires it. |

Select both model and reasoning from task complexity, read/write scope, reversibility, external mutation, security boundary, evidence-synthesis burden, cost, and latency. A model family does not imply a fixed reasoning level.

## Reasoning and Ultra

Astra native reasoning levels evidenced by the UI are `LOW`, `MEDIUM`, `HIGH`, `XHIGH`, and `MAX`.

`Ultra` is not a sixth Astra reasoning level. It is a separate Codex-level orchestration preset, off by default, and may be used only when `PARALLEL_DECOMPOSITION_VALUE = PROVEN`. It must not be described as simply more reasoning.

Luna availability is user-confirmed from low through max. Terra and Sol complete UI reasoning menus are not canonically evidenced and must not be invented. A task may request a reasoning value such as `MEDIUM` or `HIGH` when available without asserting a complete menu.

## Daybreak Blue

Daybreak Blue is a defensive-security specialist track orthogonal to the general engineering ladder. It is neither above nor below Astra, is not a normal ladder step or quota fallback, and does not itself resolve an Execution Security Gate.

Appropriate uses include vulnerability analysis, threat modeling, sandbox or trust-boundary review, security-control analysis, and defensive security review. It is not for ordinary Product implementation, routine Git persistence, generic documentation, or general architecture without focused security value. Broader architecture or operational synthesis may still use Astra when independently justified.

Daybreak Blue UI reasoning evidence is `낮음`, `보통`, `높음`, `매우높음`, `맥스`, and `울트라`. Do not map Daybreak Ultra automatically to Astra Ultra semantics.

## Policy History

V2 supersedes earlier informal and V1 routing rules where they conflict while preserving V1's durable requirements: no universal default model, no prior-task inheritance, no automatic mode change, and evidence-based actual-mode reporting.

## Mandatory Reread

Reread `AGENTS.md` and this policy before:

- the first Codex execution of every new task;
- a new HQ chat or HQ migration;
- continuity recovery or context restoration;
- a requested mode that appears copied from the previous task without task-specific rationale;
- any mode-policy uncertainty or conflict; and
- a Founder question about the mode choice.

Recent repetition is not policy.
