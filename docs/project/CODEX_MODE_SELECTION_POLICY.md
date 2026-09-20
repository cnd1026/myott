# Codex Mode Selection Policy

Version: 2.2
Last Updated: 2026-09-18
Status: ACTIVE

## Purpose

This document is the Git-canonical Product projection for selecting a Codex model, reasoning level and orchestration mode. It preserves stable selection rules while keeping the current Founder-confirmed operating catalog explicit.

## Core Rules

- Universal default model: **NONE**
- Selection principle: **LOWEST SUFFICIENT MODEL + LOWEST SUFFICIENT REASONING**
- Previous task mode inheritance: **PROHIBITED**
- Automatic silent mode change: **PROHIBITED**
- Model, reasoning and orchestration are separate execution dimensions.
- A Return Packet separates requested values from independently evidenced actual values.
- If actual execution mode is not evidenced, record `NOT REPORTED / NOT INFERRED`.
- A stronger model does not create Architecture, Security, Network, Main, Production or Release authority.

## Current Founder-Confirmed Operating Catalog

General-capability models:

| Model | Product role |
| --- | --- |
| Luna | Mechanical, routine, high-volume or cost-sensitive bounded work |
| Terra | Standard engineering and normal implementation work |
| Sol | Complex engineering, cross-domain synthesis and advanced judgment |
| Astra | Frontier or highly consequential general-capability work |

Specialist track:

| Model | Product role |
| --- | --- |
| Daybreak Blue | Defensive-security specialist work when focused security value is present |

Daybreak Blue is a separate specialist track. It is not above or below Astra and is not a quota fallback for ordinary engineering.
## Reasoning

Current operating levels:

`low / medium / high / xhigh / max`

`Ultra` is excluded from the current MyOTT operating catalog.

Reasoning is chosen independently from the model. A model name does not imply a fixed reasoning level. Use the lowest level that reliably satisfies complexity, ambiguity, consequence and verification burden.

## Orchestration

`ORCHESTRATION = SEPARATE FROM REASONING`

Default: `OFF` unless parallel decomposition or delegated coordination has clear value.

Do not infer orchestration from model choice or reasoning level.

## Requested vs Actual

When mode reporting matters, record:

- `REQUESTED_MODEL`
- `REQUESTED_REASONING`
- `REQUESTED_ORCHESTRATION`
- `ACTUAL_MODEL`
- `ACTUAL_REASONING`
- `ACTUAL_ORCHESTRATION`

Requested values describe routing intent. Actual values require trusted execution evidence.

## Availability and Quota

Model availability, quota and UI presentation can change. A temporary quota failure does not redefine this catalog and does not automatically authorize a different model, paid credit purchase or API fallback.

Deterministic work such as fixed tests, hashing, bounded Git inspection and evidence assembly should not consume a model call when a reviewed local tool can perform it safely.

## Authority and Conflict Order

When sources conflict:

1. newer explicit Founder decision;
2. this Git-canonical Product policy;
3. current approved Task/HQ projection where it does not conflict with 1–2;
4. conversation memory and historical notes.

Mode selection never overrides the repository's Gate, QA, security or Git contracts.

## Mandatory Reread

Reread `AGENTS.md` and this policy before a new Codex task, after migration/continuity recovery, or whenever a requested mode appears copied from a previous task without a task-specific rationale.
