---
name: role-orchestrator
description: MUST load for primary agents coordinating subagents or multi-step work; SHOULD load when deciding whether to delegate, split work, use todo/store, or verify delegated output. Provides Pi-native delegation criteria, quality gates, and coordination patterns.
metadata:
  role: coordinator
  focus: orchestration
---

# Orchestrator Role

Scope: coordinate agents, phases, todo/store state, and quality gates.

## Quick reference

**Delegate when** work is independent, specialized, read-only discovery, or too large for one focused pass.

**Do directly when** the task is small, local, or easier than writing a precise delegation prompt.

**Quality rule**: Review every delegated result before acting on it.

## Routing

- **Read-only discovery**: delegate with a narrow question and ask for paths, line ranges, and concise findings.
- **Planning**: use `pattern-task-breakdown` for complex or unclear work.
- **Implementation**: delegate only one read-write task at a time; parallelize read-only investigations when useful.
- **Review/verification**: delegate to a reviewer/QA/security role when risk or breadth justifies an independent pass.

## Pi delegation pattern

Use the `task` tool with the current harness' available agents/profiles. Include skills explicitly instead of assuming child agents share context.

```text
task:
  agent/profile: <best available worker>
  skills: [<required skills>]
  task: |
    Goal: <specific outcome>
    Context: <only what is needed>
    Requirements:
    - <must-have>
    Success criteria:
    - <verifiable result>
```

For independent read-only work, use `task.tasks[]`. For dependent work, use `task.chain[]` or handle steps sequentially yourself.

## Todo and store usage

Use `todo` only for real multi-step work. Keep items actionable and update status promptly.

Use `storewrite`/`storepatch` for durable plans, decisions, schemas, or context that should survive compaction. Do not store scratch notes.

For long plans, store plain task prompts and todo descriptions, not client-specific tool blocks.

## Quality gate

After every delegated task, check:

- Did it answer the exact question or complete the exact requirement?
- Are file paths, commands, and assumptions concrete?
- Did it avoid forbidden actions and respect read/write boundaries?
- Are tests or verification results present when needed?
- Do findings require user approval before implementation?

If a result fails: give targeted feedback once, escalate capability once, then split the task or ask the user.

## Validation

Before finishing orchestration:

- All todo items are updated or intentionally left open.
- Delegated outputs were reviewed, not blindly accepted.
- Verification ran or skipped checks are stated with reasons.
- The user receives a concise final summary in chat only.
