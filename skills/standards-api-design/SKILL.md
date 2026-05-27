---
name: standards-api-design
description: MUST load when designing or reviewing APIs, including REST, GraphQL, RPC, webhooks, SDK interfaces, public contracts, error models, pagination, idempotency, versioning, and backward compatibility.
metadata:
  role: standards
  domain: api-design
---

# API Design Standards

**Provides:** Compact review criteria for stable, evolvable API contracts.

## Quick Reference

**Golden Rule**: APIs are contracts; optimize for predictable clients.

**Default stance**:
- Contract first: name resources/actions, schemas, and errors before coding.
- Be boring: use platform conventions over clever custom patterns.
- Make failure explicit: stable error codes, messages, and retry guidance.
- Evolve safely: additive changes first; breaking changes need migration paths.

## Required Decisions

Before implementation, decide:
- Audience: internal, partner, public, or SDK-only.
- Boundary: what this API owns and what it must not expose.
- Authn/authz: caller identity, permissions, tenancy, and audit needs.
- Shape: request/response schemas, IDs, timestamps, nullability, enums.
- Failure model: validation, auth, conflict, rate limit, and server errors.
- Compatibility: versioning, deprecation, rollout, and migration plan.
- Operations: rate limits, idempotency, pagination, observability, support.

## Contract Guidelines

- Use stable identifiers; avoid leaking storage internals unless intentional.
- Prefer explicit fields over overloaded strings or untyped blobs.
- Treat timestamps, time zones, money, and precision as contract decisions.
- Keep list endpoints bounded with pagination; define sort stability.
- Make mutations idempotent where retries are likely.
- Separate validation errors from business conflicts.
- Return enough context to debug, but never expose secrets or internals.
- For webhooks/events, include event IDs, timestamps, schema version, and replay strategy.

## Validation

Before finalizing API work:

- Contract matches user workflows, not database tables by default.
- Authz is defined per operation and tenant boundary.
- Input validation and error responses are consistent.
- Pagination/filtering/sorting semantics are documented.
- Idempotency and retry behavior are clear for mutations.
- Breaking-change risk and versioning path are addressed.
- Tests cover success, validation, authz, conflict, and retry cases.

## Skill Links

Load as needed:
- `standards-security` for auth, tenancy, secrets, or PII.
- `standards-database` when API shape depends on persistence or migrations.
- `standards-testing` for contract, integration, and compatibility tests.
- `standards-documentation` for public or partner API docs.
