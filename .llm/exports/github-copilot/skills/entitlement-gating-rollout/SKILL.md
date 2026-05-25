---
name: entitlement-gating-rollout
description: Roll out trust/entitlement gating from schema to runtime safely. Use when replacing coarse membership checks with capability-based gates.
---


# Entitlement Gating Rollout

Use this skill when moving from schema foundations to real feature gating.

## Rollout order

1. Create a centralized entitlement resolver.
2. Define env-configurable trust-tier defaults.
3. Apply per-account override precedence on top of tier defaults.
4. Enforce membership-expired guard before capability checks.
5. Replace coarse flags (for example free-trial checks) with capability checks.

## Contract requirements

- Return stable denial payloads from API:
  - `code`
  - `i18nKey`
  - optional `renewPath`
- Keep denial semantics non-alarming for expired memberships.
- Use one shared mapping from entitlement outcomes to API error contracts.

## Coverage areas

- Add-by-RSS add/refresh/limits
- Stats tracking eligibility
- Notification eligibility
- Management override editing paths
- Web blocked-action UX

## Testing expectations

- Integration tests for capability allow/deny paths.
- Integration tests for per-user override precedence.
- E2E for blocked action messages, renew navigation, and admin overrides.
