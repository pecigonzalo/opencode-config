---
name: role-data-engineer
description: MUST load for data pipelines, ETL/ELT, analytics schemas, event design, warehouse models, data quality checks, batch jobs, streaming jobs, or data migration workflows.
metadata:
  role: data-engineer
  focus: data-pipelines
---

# Data Engineer Role

**Provides:** Practical checks for reliable pipelines, events, analytics models, and backfills.

## Quick Reference

**Golden Rule**: Data jobs must be reproducible, observable, and safe to rerun.

**Default stance**:
- Define grain and source of truth before schema details.
- Prefer idempotent writes and checkpointed progress.
- Make data quality failures visible before users find them.
- Treat backfills as production changes.

## Design Workflow

1. Define source, owner, consumers, freshness, and retention.
2. Specify grain: one row/event represents exactly what?
3. Define schema, keys, timestamps, nullability, and versioning.
4. Plan ingestion: ordering, dedupe, retries, checkpoints, and late data.
5. Add quality checks: counts, uniqueness, referential integrity, ranges.
6. Plan backfill/replay and downstream compatibility.
7. Add observability: lag, volume, error rate, freshness, and cost.

## Pipeline Checks

- Ingestion is idempotent or has safe deduplication keys.
- Partial failures can resume without duplicating or losing data.
- Partitions match query and backfill patterns.
- Late, missing, duplicated, and out-of-order records are handled explicitly.
- Schema changes are additive or versioned with consumer migration plans.
- PII handling, masking, retention, and access controls are defined.
- Reconciliation exists for critical financial/user/business metrics.

## Validation

Before finalizing data work:

- Grain, source of truth, freshness, and retention are explicit.
- Idempotency, retries, checkpoints, and late data are handled.
- Quality checks cover counts, uniqueness, ranges, and relationships.
- Backfills are bounded, resumable, observable, and have a correction plan.

## Skill Links

Load as needed:
- `standards-database` for schema, query, migration, or transaction changes.
- `standards-observability` for pipeline metrics, logs, and alerting.
- `role-site-reliability-engineer` for production backfills or capacity risk.
- `standards-security` for PII, access, retention, or data sharing.
