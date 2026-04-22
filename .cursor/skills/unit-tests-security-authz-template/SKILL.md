---
name: unit-tests-security-authz-template
description: Provides a repeatable case template for auth, permission, and security-sensitive unit tests. Use when testing JWT, assertion validation, cookie/session helpers, or similar allow/deny logic.
version: 1.0.0
---

# Unit Tests - Security/Authz Template

## Use This Skill When

- Testing auth token helpers and claim validation.
- Testing permission policy (role/message CRUD decisions).
- Testing security-sensitive request binding and replay controls.

## Standard Case Template

For each function/module, cover these case buckets:

1. **Accept valid input** — Confirm expected allow/success behavior.
2. **Reject invalid input** — Missing/empty/malformed token, claim, or id.
3. **Enforce boundary rule** — Time window, max TTL, min/max limits.
4. **Enforce deny precedence** — Non-owner or missing permission remains denied.
5. **Preserve safe failure** — Errors return non-privileged result.

## Assertions Checklist

- Assert on outcome and error code/message contract where relevant.
- Verify no accidental allow behavior in negative paths.
- Keep fixtures minimal and explicit.
- Mock only unstable boundaries (network, time, cache, external services).

## Matrix Update Rule

When introducing a new auth/authz/security module:

1. Add the module to the active test target matrix plan.
2. Add at least one test from each relevant case bucket above.
3. Record any intentionally deferred cases and why they are lower priority.
