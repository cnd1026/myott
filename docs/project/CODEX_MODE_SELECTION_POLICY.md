# Codex Mode Selection Policy

Version: 2.1

Last Updated: 2026-09-11

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

## Reasoning, Ultra, and Agent Orchestration

`REASONING_CHOICE` is the Product-level reasoning effort selection. `AGENT_ORCHESTRATION` is parallel or delegated agent execution behavior. They remain conceptually distinguishable even when a Product choice can affect both.

Current official Product documentation describes `Ultra` as a reasoning choice that uses maximum reasoning and may also run additional agents for eligible users. Therefore `ULTRA != PURE_ORCHESTRATION_ONLY`. The available evidence does not prove that Ultra is identical to Max in every internal dimension or disclose its backend implementation, so neither claim may be invented.

Luna availability is user-confirmed from low through max. Terra and Sol complete UI reasoning menus are not canonically evidenced and must not be invented. A task may request a reasoning value such as `MEDIUM` or `HIGH` when available without asserting a complete menu. Requested reasoning and requested orchestration must still be recorded separately, and actual values require explicit trusted evidence.

## Daybreak Blue

Daybreak Blue is a `DEFENSIVE_SECURITY_SPECIALIST_ACCESS_TRACK` orthogonal to the general engineering ladder. Current official documentation describes it as access to supported frontier general-purpose models, including GPT-5.6 Sol, with safeguards tailored for authorized defensive-security work. Depending on the supported access surface it may appear as a Daybreak access/toggle or as an alias/model entry.

Daybreak Blue is neither above nor below Astra, is not an Astra or Sol replacement for ordinary work, and is not a normal ladder step or quota fallback. Its UI label and Product access semantics are separate evidence dimensions, and it does not itself resolve an Execution Security Gate.

Appropriate uses include vulnerability analysis, threat modeling, sandbox or trust-boundary review, security-control analysis, and defensive security review. It is not for ordinary Product implementation, routine Git persistence, generic documentation, or general architecture without focused security value. Broader architecture or operational synthesis may still use Astra when independently justified.

## Current UI Evidence Snapshot

Snapshot date: 2026-09-11

Founder directly observed the following current account UI options:

- Astra: `낮음 / 보통 / 높음 / 매우높음 / 울트라 / 맥스`
- Daybreak Blue: `낮음 / 보통 / 높음 / 매우높음 / 울트라 / 맥스`

This is `VOLATILE_PRODUCT_CATALOG_EVIDENCE`, not a timeless model taxonomy or proof of backend semantics. Future supported UI evidence may supersede the snapshot without changing the stable routing principles in this policy.

## Evidence Basis

- [ChatGPT Rate Card](https://help.openai.com/en/articles/11481834): Ultra is a reasoning choice that uses maximum reasoning and may run additional agents for eligible users.
- [OpenAI Daybreak overview](https://help.openai.com/en/articles/20001258-openai-daybreak-trusted-access-for-cyber-overview): Daybreak Blue uses GPT-5.6 Sol and supports approved defensive-security workflows through tailored safeguards/access.
- [Expanding Daybreak](https://openai.com/index/expanding-daybreak-as-the-cyber-defense-window-narrows/): Daybreak Blue provides access to frontier general-purpose models for authorized defensive work.
- Founder direct account UI observation dated 2026-09-11 supplies the volatile option-label snapshot above; it does not override official semantic evidence.

## Policy History

V2 superseded earlier informal and V1 routing rules where they conflicted while preserving V1's durable requirements: no universal default model, no prior-task inheritance, no automatic mode change, and evidence-based actual-mode reporting.

The original V2 interpretation treated Ultra as a separate orchestration preset rather than a reasoning level. Newer Founder UI evidence and official Product documentation supersede that narrow interpretation: Ultra is currently a Product-level reasoning choice using maximum reasoning and may also involve additional agents for eligible users. This correction preserves the distinction between reasoning and orchestration without inventing backend mechanics.

## Mandatory Reread

Reread `AGENTS.md` and this policy before:

- the first Codex execution of every new task;
- a new HQ chat or HQ migration;
- continuity recovery or context restoration;
- a requested mode that appears copied from the previous task without task-specific rationale;
- any mode-policy uncertainty or conflict; and
- a Founder question about the mode choice.

Recent repetition is not policy.
