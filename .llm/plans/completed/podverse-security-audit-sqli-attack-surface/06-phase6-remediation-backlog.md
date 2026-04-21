# Phase 6 - Prioritized Remediation Backlog and Verification

## Priority Tiers

- P0: exploitable high-impact risks requiring immediate patching.
- P1: medium-risk controls and structural hardening.
- P2: defense-in-depth improvements.

## Backlog

| Priority | Area | Remediation Task | Target Files | Verification |
| -------- | ---- | ---------------- | ------------ | ------------ |
| P0 | Authz | Restrict management admin lookup to self (or explicit role model) and reject cross-admin access by default. | `apps/management-api/src/routes/adminAccount.ts` | Integration test: authenticated admin A cannot fetch admin B (`403`/`404`). |
| P0 | Network hardening | Add SSRF guardrail helper for parser/workers requests (scheme allowlist, internal CIDR deny, redirect policy). | `packages/helpers-requests/src/_request.ts`, `packages/parser/src/lib/_request.ts` | Unit tests for blocked URLs (`127.0.0.1`, `169.254.169.254`, private CIDRs, redirected internal hosts). |
| P1 | SQLi footgun | Replace stats raw SQL identifier interpolation with static query builder or strict identifier map constants. | `packages/orm/src/services/stats/baseStatsTrackEvent.ts` | Unit/integration tests for create/get/delete events still passing; no string interpolation from mutable values. |
| P1 | Session policy | Reduce JWT lifetime and add refresh/session rotation strategy as needed. | `apps/api/src/lib/auth/index.ts`, `apps/management-api/src/lib/auth/index.ts` | Auth tests for token expiry and re-authentication behavior. |
| P1 | Validation strictness | Enforce explicit unknown-key handling on request schemas for mutation endpoints. | `apps/api/src/lib/validation/index.ts`, affected controllers | API tests: extra keys rejected or stripped consistently. |
| P1 | Logging hygiene | Expand redaction keys and stop logging raw upstream payload blobs by default. | `packages/helpers-backend/src/redactForLog.ts`, `packages/external-services-podcast-index/src/index.ts` | Unit tests on redaction utility; log snapshot tests for sanitized output. |
| P2 | Query load control | Add guardrails for large list options and heavy `IN` list operations in hot services. | `packages/orm/src/services/queue/queueResource.ts`, related callers | Load tests or integration tests with capped `take`, bounded array sizes. |
| P2 | Client hardening | Add safe URL utility for link href normalization/allowlist and evaluate server-side auth gating on management dashboard. | `apps/web/src/components/Link/Link.tsx`, `apps/management-web/src/app/dashboard/page.tsx` | UI tests for blocked unsafe schemes and unauthorized dashboard access flow. |

## Suggested Implementation Order

1. Authz and SSRF controls (P0).
2. SQLi-footgun removal + token and validation hardening (P1).
3. Logging and query-load controls (P1/P2).
4. Frontend hardening tasks (P2).

## Test Strategy

- Add focused integration tests in API and management API for authz/validation changes.
- Add parser/helper unit tests for URL blocking and request policy behavior.
- Add regression tests for stats event ORM behavior after SQL refactor.
- Add smoke tests for login/session changes to avoid auth regressions.
