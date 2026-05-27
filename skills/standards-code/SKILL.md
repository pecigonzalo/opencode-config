---
name: standards-code
description: MUST load for any code writing or refactoring; SHOULD load for code reviews. Provides language-neutral maintainability rules for testable boundaries, cohesive units, explicit dependencies, clear errors, and minimal change scope.
metadata:
  role: standards
  domain: code-quality
  priority: critical
---

# Code Standards

Scope: language-neutral baseline before language-specific standards.

## Quick reference

**Golden rule**: Code is maintainable when its behavior is easy to verify.

Prefer:
- Small cohesive units with one reason to change.
- Explicit inputs, outputs, errors, and dependencies.
- Clear boundaries between pure logic and side effects.
- Simple control flow and early exits over deep nesting.
- Minimal, focused changes that preserve nearby conventions.

Avoid:
- Hidden global state and surprising side effects.
- Broad rewrites unrelated to the task.
- Error swallowing or ambiguous failure modes.
- Premature abstraction or framework cleverness.

## Design checks

Before editing:

- Identify the existing convention in the touched area.
- Find the narrowest seam for the change.
- Decide what test or command proves the behavior.
- Load language/framework standards when available.

While editing:

- Keep public interfaces stable unless the task requires a contract change.
- Validate data at system boundaries.
- Keep resource ownership obvious: open/close, acquire/release, start/stop.
- Make concurrency, caching, and retries explicit where used.
- Name things by domain meaning, not implementation detail.

## Error handling

- Preserve original error context when wrapping or translating errors.
- Return/report errors at the level that can act on them.
- Do not log secrets, tokens, or unnecessary PII.
- Distinguish validation, permission, conflict, transient, and internal errors when callers need different behavior.

## Skill links

Load as needed:

- Language skills such as `standards-go`, `standards-python`, `standards-typescript`, or `standards-shell`.
- `standards-testing` when writing or changing tests.
- `standards-security` for auth, input, secrets, or sensitive data.
- `standards-api-design` for public contracts.
- `standards-database` for persistence changes.

## Validation

Before finishing code work:

- The smallest practical verification command has run or is reported skipped.
- New behavior has a test when practical.
- Edge cases and error paths changed by the task are covered or noted.
- The diff does not contain unrelated refactors.
