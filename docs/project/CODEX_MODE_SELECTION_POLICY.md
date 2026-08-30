# Codex Mode Selection Policy

Version: 1.0

Status: ACTIVE

## Purpose

This document is the Git-canonical authority for selecting a Codex Model Family and Reasoning Level. It is intentionally short enough to reread before every new Codex task.

## Core Rules

- Universal default model: **NONE**
- Selection principle: **LOWEST SUFFICIENT MODE PER TASK**
- Previous task mode inheritance: **PROHIBITED**
- Mode auto-change: **PROHIBITED**
- Mode change authority: **HQ / Founder only**
- Requested model/reasoning and actual model/reasoning are different records.
- Record actual values only from explicit UI or trusted execution evidence. Otherwise record `NOT REPORTED / NOT INFERRED`.
- For a task that invokes Codex, model, reasoning, and rationale must be explicit and nonblank. Use `NOT_APPLICABLE` only when the task does not invoke Codex.
- Conversation memory is a convenience cache; Git canonical policy is authority.

When policy sources conflict, use this order:

1. Newer explicit Founder Decision
2. This Git canonical policy
3. Conversation memory

## Supported Families

| Model Family | Supported Reasoning Levels | Primary Guidance |
| --- | --- | --- |
| 5.6 Luna | 낮음, 보통, 높음, 매우높음, 맥스 | Bounded writing, local implementation, deterministic tests, hashes, and small reversible corrections. |
| 5.6 Terra | 낮음, 보통, 높음, 매우높음, 울트라, 맥스 | Long read-only analysis, architecture/context synthesis, independent review, and canonical-source reconciliation. |
| 5.6 Sol | 낮음, 보통, 높음, 매우높음, 울트라, 맥스 | Security boundaries, production or external mutation, one-shot network authority, and rollback/recovery contracts. |
| Daybreak Blue | Conditional; defensive security only | Use only for defensive-security work. It is not an ordinary Product-work default. |

`Luna 울트라` is invalid and does not exist. Model Family and Reasoning Level are independent selections: do not assume Luna is low, Terra is medium, or Sol is high.

Select both based on task complexity, read/write scope, reversibility, external mutation, security boundary, evidence-synthesis burden, cost, and latency.

## Mandatory Reread

Reread `AGENTS.md` and this policy before:

- the first Codex execution of every new task;
- a new HQ chat or HQ migration;
- continuity recovery or context restoration;
- a requested mode that appears copied from the previous task without task-specific rationale;
- any mode-policy uncertainty or conflict; and
- a Founder question about the mode choice.

Recent repetition is not policy.
