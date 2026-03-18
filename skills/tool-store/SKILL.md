---
name: tool-store
description: MUST load for storing/retrieving extended repository context, plans, notes, or `[store:id]` references.
license: MIT
compatibility: opencode
metadata:
  role: storage
  focus: persistent-memory
---

**CRITICAL:** Store items are **not** auto-loaded. When you see
`Load store: <id>` or `[store:<id>]`, call `storeread({ id: "<id>" })`
before proceeding.

## What belongs in the store

Use the store for **extended repository context** that should survive session
cleanup or compaction.

Good fits:

- Active plans and future plans
- Long-term notes, research notes, and implementation context
- Requirements, specs, and acceptance criteria
- Schemas, interfaces, and reference structures
- Related items that should cross-reference each other with `links`

Avoid storing:

- Temporary scratch notes
- Trivial one-off reminders
- Data that only matters for the current short interaction
- Documents that should live in the repository itself

## What you can store

The `data` field can hold either short structured content or longer free-form
content.

### Short structured data

```javascript
storewrite({
  summary: "Session handling notes for auth flow",
  tags: ["auth", "notes", "session"],
  status: "active",
  data: {
    issues: ["expiry rules differ by entry point", "validation is duplicated"],
    next_step: "create a cleanup plan for session creation and renewal",
  },
});
```

### Long-form text or plan notes

```javascript
storewrite({
  summary: "Research notes for auth redesign",
  tags: ["auth", "research", "notes"],
  status: "active",
  data: {
    notes: `Observed issues:
- Session lifetime is inconsistent
- Callback flow duplicates validation

Recommended next step:
Create a phased plan before implementation.`,
  },
});
```

### Related/dependent items

```javascript
storewrite({
  summary: "Plan: auth redesign",
  tags: ["plan", "auth", "todo-context"],
  status: "active",
  links: ["auth-spec-1", "session-decision-2"],
  data: {
    goal: "Simplify auth flow",
  },
});
```

## Tools

### `storewrite`

Create a new store item. IDs are generated internally (12-char lowercase hex).
Every call creates a new item — it never updates an existing one.

**Parameters:**

- `summary` (required): Short description of the item
- `tags` (required): Tags for discovery and grouping
- `status` (optional): `"active"` (default), `"archived"`, or `"deprecated"`
- `data` (optional): Structured or free-form JSON content
- `links` (optional): Related store item IDs

**Use for:** New plans, notes, specs, schemas, and reusable context.

Minimal example:

```javascript
storewrite({
  summary: "API error format",
  tags: ["api", "spec"],
  data: {
    shape: { error: "string", code: "string" },
  },
});
```

### `storepatch`

Update an existing store item by ID. Only the fields you provide are changed;
omitted fields are preserved. Returns `found: false` when the ID does not exist.

**Parameters:**

- `id` (required): ID of the item to update
- `summary` (optional): New summary
- `tags` (optional): New tags array
- `status` (optional): New status — `"active"`, `"archived"`, or `"deprecated"`
- `data` (optional): New data payload (replaces existing)
- `links` (optional): New links array

**Use for:** Changing status, updating tags, amending notes, or replacing data
on an existing item.

Archive an item:

```javascript
storepatch({ id: "abc123def456", status: "archived" });
```

Update tags and summary together:

```javascript
storepatch({
  id: "abc123def456",
  summary: "Updated auth design notes",
  tags: ["auth", "notes", "revised"],
});
```

### `storeread`

Retrieve store items.

**LIST mode** (no `id`):

- Lightweight discovery
- Returns summaries without the full `data` field
- Can filter by `tags`
- Excludes archived items unless `includeArchived: true`

```javascript
storeread({ tags: ["auth", "notes"] });
```

**READ mode** (with `id`):

- Returns the full item, including `data`

```javascript
storeread({ id: "auth-spec-1" });
```

### `storedelete`

Permanently remove a store item.

Use sparingly. Prefer `storepatch({ id, status: "archived" })` or
`storepatch({ id, status: "deprecated" })` when historical context may still
matter.

```javascript
storedelete({ id: "obsolete-note-1" });
```

## Best practices

- Keep `summary` short and descriptive
- Use tags consistently so LIST mode stays useful
- Store enough context to make the item useful later
- Use `links` for related or dependent items
- Prefer archive/deprecate over delete
- Review existing items first when you are unsure:
  `storeread()`

## TODO linking

When a TODO or prompt needs durable backing context, reference the item with
`[store:id]` and load it explicitly with `storeread`.

Example:

```text
Refactor auth flow [store:auth-plan-1]
```

## Summary

Use the store for extended repository context, not temporary scratch space.

- `storewrite` creates new items (ID generated automatically)
- `storepatch` updates existing items (preserves omitted fields)
- `storeread` discovers or loads items
- `storedelete` permanently removes items
- Store references must always be loaded explicitly
