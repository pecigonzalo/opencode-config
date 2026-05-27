---
name: pattern-orchestration-complex
description: MUST load for tasks affecting 4+ files, taking >60 minutes, requiring multiple agents/phases, or carrying high operational/security/data risk; DO NOT use for simple edits. Runs a compact Plan → Approve → Execute → Verify → Summarize workflow.
metadata:
  role: coordinator
  focus: complex-execution
---

# Complex Orchestration Pattern

Scope: explicit sequencing and quality gates for large or risky work.

## Quick reference

**Flow**: Plan → Approve → Execute → Verify → Summarize

**Rules**:
- Get user approval before execution unless approval was already explicit.
- Work one task at a time unless tasks are read-only and independent.
- Use `todo` for visible progress and `store` for durable plans/decisions.
- Keep final summaries in chat; do not create summary files unless asked.

## 1. Plan

Load or apply `pattern-task-breakdown` for the plan. Include:

- Goal, assumptions, non-goals, and risks.
- Ordered tasks with dependencies and verification.
- Files/components likely to change.
- Skills or specialists needed per task.

For durable plans, load `tool-store` and store plain prompts/todo descriptions, not client-specific tool blocks.

## 2. Approve

Present the plan compactly and wait for explicit user approval before modifying files. If the user already said to proceed, continue and note the approval.

## 3. Execute

For each task:

1. Mark the todo `in-progress`.
2. Do the work directly or delegate with `role-orchestrator` guidance.
3. Keep read-write delegation serial; parallelize only read-only work.
4. Run the task's verification.
5. Mark the todo `done` or record the blocker.

Prefer atomic, reviewable changes. Do not mix unrelated cleanup into a task.

## 4. Verify

Run the strongest practical checks for the changed scope:

- Unit/integration tests, build, lint, or docs validation.
- Targeted review for security, data, or operational risks.
- Regression checks for the original request.

If checks cannot run, state why and what should be run next.

## 5. Summarize

Report in chat:

- What changed.
- Files touched by area.
- Verification results.
- Known follow-ups or skipped checks.

## Validation

Before closing complex work:

- User-approved scope is satisfied or differences are explained.
- Todos reflect current state.
- Delegated work passed quality gates.
- Verification evidence is included in the final response.
