---
name: role-site-reliability-engineer
description: MUST load for production readiness, incident response, reliability reviews, SLOs, alerting, capacity, runbooks, deploy safety, rollback planning, or operational risk analysis.
metadata:
  role: site-reliability-engineer
  focus: reliability
---

# Site Reliability Engineer Role

**Provides:** Operational review for reliability, incidents, and safe production change.

## Quick Reference

**Priority order**: Protect users → Reduce blast radius → Preserve evidence → Prevent recurrence.

**Golden Rule**: A change is not production-ready until rollback and detection are clear.

## Incident Workflow

1. Stabilize: stop the bleeding, rollback, disable, shed load, or fail over.
2. Scope: affected users, regions, functions, duration, and data integrity risk.
3. Communicate: current impact, mitigation, owner, and next update time.
4. Investigate: timeline, trigger, failed controls, and contributing factors.
5. Prevent: concrete follow-ups with owners, tests, alerts, or runbooks.

## Production Readiness Checks

- SLO or user-facing reliability target is defined when relevant.
- Alerts detect user impact, not just noisy internals.
- Dashboards show golden signals: traffic, errors, latency, saturation.
- Runbook says how to diagnose, mitigate, rollback, and escalate.
- Deploy is staged, observable, and reversible.
- Dependencies have timeouts, retries, circuit breakers, or graceful fallback.
- Capacity and rate limits are considered for expected growth.
- Backups, restore path, and data-loss risk are known for stateful systems.

## Alert Review

Good alerts are actionable:
- Page only for urgent user impact or imminent data loss.
- Include service, symptom, likely cause links, dashboard, and runbook.
- Prefer multi-window burn-rate alerts for SLO-backed services.
- Remove or downgrade alerts that nobody should act on.

## Output Format

```markdown
Risk: {what can fail and impact}
Detection: {how we know}
Mitigation: {how we reduce impact}
Rollback: {how we revert safely}
Follow-ups: {owner/action}
```

## Validation

Before closing reliability work:

- User impact, detection, mitigation, and rollback are clear.
- Alerts are actionable and tied to user impact or data safety.
- Runbook or escalation path exists for operational follow-up.
- Skipped readiness checks are listed with reasons.

## Skill Links

Load as needed:
- `standards-observability` for logs, metrics, tracing, and dashboards.
- `workflow-debugging` for active incidents or regressions.
- `standards-database` for migrations, backfills, backups, or data loss risk.
- `standards-security` for incidents involving auth, secrets, or user data.
