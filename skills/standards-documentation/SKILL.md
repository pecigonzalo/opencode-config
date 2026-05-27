---
name: standards-documentation
description: MUST load when writing READMEs, API docs, guides, release notes, migration notes, or code comments; SHOULD load for documentation reviews. Provides concise structure and clarity rules for useful, maintainable technical docs.
metadata:
  role: standards
  domain: documentation
---

# Documentation Standards

Scope: documentation structure and clarity. Use `standards-markdown` for formatting details.

## Quick reference

**Golden rule**: Document what helps the reader act correctly.

Document:
- Purpose, setup, usage, public contracts, and common failure modes.
- Why a non-obvious decision was made.
- Constraints, compatibility notes, and migration steps.

Avoid:
- Restating obvious code.
- Large background sections the reader does not need.
- Stale examples or unverified commands.

## Common structures

README:

```markdown
# Project name

One or two sentences explaining what this is for.

## Quick start
## Usage
## Development
## Contributing
```

Guide:

```markdown
## Goal
## Prerequisites
## Steps
## Verify
## Troubleshooting
```

API docs:

```markdown
## Endpoint or function

Purpose, inputs, response/return value, errors, example, compatibility notes.
```

Decision/spec:

```markdown
## Context
## Decision
## Alternatives considered
## Consequences
## Rollout or migration
```

## Comments

Add comments for:

- Invariants the code relies on.
- Workarounds and when to remove them.
- Surprising side effects or ordering requirements.
- Links to external algorithms, specs, or incidents.

Do not comment what clear code already says.

## Validation

Before finishing docs:

- The reader can tell whether the doc applies to them.
- Required commands/examples are current or explicitly unverified.
- Public contracts list inputs, outputs, and errors.
- Any code change that affects docs is reflected in the same update.
