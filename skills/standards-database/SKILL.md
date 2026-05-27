---
name: standards-database
description: MUST load when designing or reviewing database schemas, migrations, indexes, queries, transactions, constraints, backfills, data retention, or data integrity changes.
license: MIT
compatibility: opencode
metadata:
  role: standards
  domain: database
---

# Database Standards

**Provides:** Compact checks for safe schema, query, migration, and data integrity work.

## Quick Reference

**Golden Rule**: Prefer explicit data integrity over application-only assumptions.

**Default stance**:
- Model the invariant, not just the current UI.
- Add constraints where the database can enforce truth.
- Make migrations incremental, observable, and rollback-aware.
- Index for known access patterns, not guesses.

## Design Decisions

Before changing persistence, decide:
- Ownership: source of truth, lifecycle, retention, and deletion semantics.
- Shape: keys, uniqueness, nullability, defaults, timestamps, and enums.
- Relationships: foreign keys, cascade behavior, and orphan handling.
- Consistency: transaction boundaries, isolation needs, and concurrency conflicts.
- Access: expected queries, filters, sort order, cardinality, and growth.
- Migration: deploy order, backfill plan, rollback, and verification.
- Privacy: PII classification, encryption, masking, and audit needs.

## Migration Safety

Prefer expand/contract for live systems:

1. Add nullable/new structures without breaking old code.
2. Dual-write or backfill in bounded batches when needed.
3. Verify counts, constraints, and application reads.
4. Switch reads/writes.
5. Remove old structures in a later change.

Avoid long locks, unbounded backfills, and irreversible destructive changes without
explicit approval.

## Query and Index Review

- Confirm the query matches an indexed access path for expected scale.
- Check selectivity, ordering, pagination, and join cardinality.
- Avoid N+1 patterns unless bounded and intentional.
- Keep transactions short; do not hold locks across network calls.
- Treat time zones, money, and precision as schema-level concerns.

## Checklist

- [ ] Constraints protect required invariants.
- [ ] Migration can run safely in the target environment.
- [ ] Backfill is bounded, resumable, and verifiable when needed.
- [ ] Indexes match real read/write paths and do not duplicate existing ones.
- [ ] Transactions handle concurrency and failure cases.
- [ ] Rollback or forward-fix plan is clear.
- [ ] Tests cover constraints, migration behavior, and representative queries.

## Skill Links

Load as needed:
- `standards-security` for PII, tenancy, secrets, or audit requirements.
- `standards-api-design` when persistence choices leak into contracts.
- `role-site-reliability-engineer` for production migrations or rollback risk.
- `standards-testing` for migration, repository, and integration tests.
