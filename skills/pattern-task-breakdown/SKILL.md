---
name: pattern-task-breakdown
description: MUST load when planning complex work or when the user asks for a detailed plan; SHOULD load for unclear approaches, multi-step execution, dependency mapping, estimates, or plans that may be resumed later. Produces compact task breakdowns with dependencies and verification steps.
metadata:
  role: planner
  focus: decomposition
---

# Task Breakdown Pattern

Scope: ordered, verifiable chunks for ambiguous or multi-step work.

## Quick reference

**Process**: Scope → Phases → Tasks → Dependencies → Verification

Use when work likely touches 4+ files, takes >60 minutes, has sequencing risk, or needs user approval before execution.

## Workflow

1. **Scope**
- Restate the goal, non-goals, constraints, and known risks.
- Ask only blocking questions; otherwise state assumptions.
2. **Phase**
- Group related work into phases with a clear outcome per phase.
- Keep phases independently reviewable when possible.
3. **Task**
- Break phases into 30-120 minute tasks.
- Include files/components, dependencies, and verification for each task.
4. **Sequence**
- Identify blockers, what can run in parallel, and the critical path.
5. **Validate**
- Include test/build/docs checks and rollback concerns where relevant.

## Output format

```markdown
Goal: {one sentence}
Assumptions: {short list or none}
Risks: {top 1-3}

Plan:
1. {Phase/task title}
   - Scope: {files/components}
   - Depends on: {none|task numbers}
   - Verify: {specific check}
2. ...

Open questions: {blocking only}
Estimate: {rough total or per phase}
```

## Stored or resumable plans

If a plan will be resumed later, store execution-ready prompts rather than client-specific tool snippets.

Recommended `data.prompt_drafts` shape:

```json
{
  "prompt_drafts": {
    "handoff_prompt": "Load store: <plan-id>\n\nTask: Continue the stored plan.",
    "todo_items": [
      {
        "title": "Short step title",
        "description": "What to do, required skills, success criteria"
      }
    ]
  }
}
```

Rules:

- Keep prompts plain text so any agent/client can execute them.
- Include required skills and store references in each item.
- Replace placeholder IDs after the store item is created.

## Validation

Before handing back a plan:

- Each task has a clear owner agent/profile or can be done directly.
- Dependencies and blockers are explicit.
- Verification is specific enough to run.
- The plan is smaller than the work it describes; avoid over-planning.
