---
name: standards-markdown
description: MUST load when writing or reviewing Markdown files; SHOULD load for docs, READMEs, SKILL.md files, or content reviews. Provides concise formatting rules, skill-file exceptions, and Markdown validation checks without forcing verbose document structure.
metadata:
  role: standards
  domain: markdown
---

# Markdown Standards

Scope: readable, portable Markdown with minimal formatting churn.

## Quick reference

- Use ATX headings (`#`, `##`, `###`) with sentence-case labels.
- Keep heading hierarchy ordered; do not skip levels.
- Do not hard-wrap prose in the middle of sentences; keep sentences or short paragraphs on one line unless structure requires a break.
- Use fenced code blocks with language tags.
- Use descriptive link text; avoid raw URLs as link text when practical.
- Prefer lists over tables for prose-heavy content.
- Prefer Markdown over HTML unless Markdown cannot express the content.
- Avoid trailing whitespace and formatting-only churn.

## `SKILL.md` exception

For AI Agent skill files, prioritize trigger quality and context size over general documentation structure:

- Do not require filename-matching H1s, `[TOC]`, or `## See also`.
- Keep `SKILL.md` compact; move conditional detail to `references/`.
- Put trigger guidance in frontmatter `description`, not only in the body.
- Include only examples and validation that change agent behavior.

## Layout guidance

For regular docs:

- Start with one H1 and a short intro.
- Use `##` for major sections and `###` for subsections.
- Put supplemental links near the relevant text or at the end.

For short operational docs, a predictable checklist can be better than a full narrative.

Avoid reflowing unchanged paragraphs. Markdown hard wraps create noisy diffs and can split ideas across lines in ways that are awkward for agents to edit.

## Lists and code

- Use ordered lists for sequences and bullets for unordered items.
- Use lazy numbering (`1.`) for long lists that may change.
- Indent nested list content consistently.
- Use backticks for commands, paths, fields, and literals.
- When showing Markdown that contains code fences, use a longer outer fence or simplify the example.

## Validation

Before finishing Markdown changes:

- Headings are ordered and descriptive.
- Code fences open and close cleanly.
- Links and paths are intentional.
- Prose is not hard-wrapped mid-sentence, and unchanged paragraphs were not reflowed.
- The document is no longer than needed for its purpose.
