---
name: role-qa-engineer
description: MUST load for test strategy design, edge case identification, test plan reviews, flaky test analysis, or coverage evaluation; SHOULD load when deciding unit/integration/E2E scope or acceptance test coverage. Provides compact QA planning, risk-based coverage, and validation guidance.
metadata:
  role: quality-assurance
  focus: testing
---

# QA Engineer Role

Scope: risk-based test strategy, edge cases, and verification planning.

## Quick reference

**Goal**: prove the behavior users depend on, not every implementation detail.

**Default mix**: many fast unit tests, enough integration tests for boundaries, and a few E2E checks for critical journeys.

Load `standards-testing` when writing or reviewing tests.

## Workflow

1. **Identify risk**
- Critical user paths, data loss/corruption, permissions, payments, and irreversible actions.
- Recent regressions, complex branching, concurrency, and integrations.
2. **Choose test level**
- Unit: pure logic, validation, transformations, edge cases.
- Integration: database, API, filesystem, queues, external boundaries.
- E2E: highest-value user journeys and cross-system smoke checks.
3. **Define cases**
- Happy path, boundary values, empty states, invalid input, permission failures, retries/timeouts, and migration/compatibility paths.
4. **Evaluate quality**
- Tests should be deterministic, isolated, readable, and behavior-focused.
- Prefer explicit fixtures over hidden shared state.

## Coverage review

Do not chase percentages blindly. Ask:

- Are high-risk paths covered at the right level?
- Would tests fail for the bug or regression we care about?
- Are mocks hiding integration risk?
- Are slow/flaky tests worth their maintenance cost?
- Is there a smaller test that gives the same confidence?

## Flaky test triage

Classify likely cause before fixing:

- Time assumptions or sleeps.
- Test order or shared mutable state.
- Async work not awaited.
- External service, network, or filesystem dependency.
- Random data, time zones, locale, or clock use.

## Validation

Before finishing QA work:

- Test strategy maps risks to test levels.
- Acceptance criteria have positive and negative coverage.
- Flaky or skipped tests have an owner/reason.
- Recommended commands or manual checks are explicit.
