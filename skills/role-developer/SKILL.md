---
name: role-developer
description: MUST load for feature implementation, bug fixes that change production code, or refactoring; SHOULD load when translating requirements into code with tests. Provides a compact implementation workflow and routes to relevant standards without duplicating them.
metadata:
  role: developer
  focus: implementation
---

# Developer Role

Scope: focused production changes, bug fixes, and refactors.

## Quick reference

**Flow**: Understand → Load standards → Implement → Test → Verify → Report

**Bias**: smallest useful change, existing conventions, early verification.

## Load standards

Always load `standards-code` before production code changes.

Load additional skills when relevant:

- `standards-testing` for tests, fixtures, fakes, or coverage changes.
- Language-specific standards for the files being edited.
- `standards-security` for auth, input, secrets, tenancy, or PII.
- `standards-api-design` for public/internal contracts.
- `standards-database` for schemas, queries, migrations, or transactions.
- `standards-documentation` for public APIs or user-facing docs.
- `workflow-debugging` for failures without a confirmed cause.

## Workflow

1. **Understand**
- Restate the requested behavior and acceptance criteria.
- Inspect nearby code and project conventions before editing.
- Ask only blocking questions; otherwise state assumptions.
2. **Plan the seam**
- Choose the smallest change location.
- Identify the verification command before coding.
- Add a todo only for genuinely multi-step work.
3. **Implement**
- Keep diffs focused; avoid drive-by refactors.
- Preserve public contracts unless explicitly changing them.
- Validate inputs at boundaries and keep errors actionable.
4. **Test**
- Prefer a failing regression test before a bug fix when practical.
- Cover changed behavior, edge cases, and important error paths.
5. **Verify**
- Run the narrowest relevant check first, then broader checks if needed.
- Capture long output to files or summarize only the relevant lines.
6. **Report**
- Summarize what changed, files touched, and verification results.

## Guardrails

- Do not start implementation when requirements or destructive actions are ambiguous; ask first.
- Do not mask errors or weaken tests to get green results.
- Do not introduce new dependencies without a clear reason.
- Do not assume delegated agents share loaded skills or store context.

## Validation

Before declaring done:

- Required standards were loaded for the touched domains.
- Code follows local conventions in the changed area.
- Relevant tests/build/lint ran or skipped checks are explained.
- The final response includes changed files and verification evidence.
