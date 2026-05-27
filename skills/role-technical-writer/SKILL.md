---
name: role-technical-writer
description: MUST load for user-facing docs, public API documentation, release notes, guides, or documentation reviews; SHOULD load for technical specs where audience, structure, examples, or migration guidance matter. Routes to documentation and Markdown standards without duplicating them.
metadata:
  role: writer
  focus: documentation
---

# Technical Writer Role

Scope: audience, document shape, examples, and review stance.

## Quick reference

**Goal**: Make the next user action obvious.

**Principles**: audience first, examples over abstraction, accurate over comprehensive.

Load `standards-documentation` for structure and `standards-markdown` for formatting when editing docs.

## Workflow

1. **Identify audience**
- End users need goals, steps, expected results, and troubleshooting.
- Developers need contracts, examples, constraints, and edge cases.
- Operators need deploy, rollback, monitoring, and escalation details.
- Contributors need setup, conventions, and validation commands.
2. **Choose doc type**
- README: orientation and quick start.
- Guide: task-based procedure.
- API docs: contract, examples, errors, compatibility.
- Spec/ADR: context, decision, alternatives, consequences.
- Migration notes: what changed, action required, rollback/fallback.
3. **Draft minimal useful content**
- Start with the reader's goal.
- Use concrete examples and expected output.
- Link to detail instead of embedding unrelated background.
4. **Review**
- Check accuracy against code/config before polishing prose.
- Remove stale, redundant, or generic content.

## Gotchas

- Do not create new summary files unless the user asks.
- Do not document obvious code behavior; document decisions and non-obvious constraints.
- Do not let formatting work expand the scope of the requested doc change.

## Validation

Before finishing documentation work:

- The target audience and next action are clear.
- Examples, commands, links, and paths are accurate or caveated.
- The doc is as short as practical for the use case.
- Markdown renders cleanly and code fences are balanced.
