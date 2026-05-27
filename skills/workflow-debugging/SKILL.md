---
name: workflow-debugging
description: MUST load for bug investigation, failing tests, regressions, flaky behavior, production issues, or unexplained runtime errors. Provides a reproduce-isolate-instrument-fix-verify workflow with evidence tracking.
license: MIT
compatibility: opencode
metadata:
  role: workflow
  focus: debugging
---

# Debugging Workflow

**Provides:** A disciplined loop for finding causes before changing code.

## Quick Reference

**Golden Rule**: Do not fix before reproducing or collecting strong evidence.

**Loop**: Capture → Reproduce → Bound → Hypothesize → Inspect → Fix → Verify

**Bias**: smallest repro, smallest change, strongest verification.

## Workflow

1. **Capture**
   - Record exact command, input, error, logs, versions, and recent changes.
   - Preserve long output in a file; summarize only the relevant lines in chat.
2. **Reproduce**
   - Run the narrowest failing test or command.
   - If not reproducible, gather more evidence before modifying code.
3. **Bound the fault**
   - Identify what changed, what still works, and affected components.
   - Compare a known-good path with the failing path.
4. **Hypothesize**
   - List 1-3 likely causes with evidence for/against each.
   - Prefer hypotheses that can be falsified quickly.
5. **Inspect or instrument**
   - Read call paths and invariants before broad search.
   - Add temporary logging/assertions only when they answer a specific question.
6. **Fix**
   - Make the smallest change that addresses the confirmed cause.
   - Avoid drive-by refactors unless required for safety.
7. **Verify**
   - Add or update a regression test when practical.
   - Run the original failing command plus nearby coverage.
   - Remove temporary instrumentation.

## Evidence Note

Keep a compact trail in chat or todo, not a new file unless requested:

```markdown
Failure: {command/error}
Repro: {reliable|intermittent|not yet}
Likely cause: {cause + evidence}
Fix: {change}
Verification: {commands/tests}
```

## Guardrails

- Do not assume the stack trace root is the root cause.
- Do not mask errors to make tests pass.
- Do not broaden scope until the narrow path is understood.
- For flaky tests, separate timing/order/shared-state issues from product bugs.
- For production issues, prioritize mitigation and rollback before root-cause depth.

## Skill Links

Load as needed:
- `standards-testing` when adding regression tests or investigating flakes.
- `standards-observability` for logs, metrics, traces, or production symptoms.
- `standards-security` if the bug touches auth, secrets, or user data.
- Language-specific standards before editing implementation code.
