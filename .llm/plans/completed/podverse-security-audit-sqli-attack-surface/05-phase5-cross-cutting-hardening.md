# Phase 5 - Cross-Cutting Hardening Review

## Validation Surface

| Severity | Confidence | Finding | Evidence |
| -------- | ---------- | ------- | -------- |
| Medium | High | Most Joi object validations do not explicitly strip/forbid unknown keys. | `apps/api/src/lib/validation/index.ts` runs `schema.validate(...)` with default options; sparse `unknown(false)` usage in route controllers. |
| Low | High | Numeric coercion mutates only selected body keys (`position1`, `position2`) and relies on schema follow-up. | `apps/api/src/lib/validation/index.ts`. |

## Token and Session Policy

| Severity | Confidence | Finding | Evidence |
| -------- | ---------- | ------- | -------- |
| Medium | High | Long-lived auth tokens (`365d`) increase stolen-token impact window. | `apps/api/src/lib/auth/index.ts`, `apps/management-api/src/lib/auth/index.ts`. |
| Low-Medium | High | Optional token echo in login response increases exposure risk in compromised clients/logging paths. | `includeTokenInResponseBody` in both auth modules. |
| Positive control | High | API binds JWT email + id to current account on each authenticated request. | `verifyTokenAndMembership` in `apps/api/src/lib/auth/index.ts`. |

## Rate Limit and Abuse Controls

| Severity | Confidence | Finding | Evidence |
| -------- | ---------- | ------- | -------- |
| Positive control | High | Reusable endpoint and per-user auth rate limit middleware exists and is used in sensitive routes. | `apps/api/src/lib/rateLimiter.ts`; `apps/api/src/controllers/account/accountAddByRSSParse.ts`. |
| Medium | Medium | Coverage is partial; all high-cost mutation and parse-triggering routes should be reviewed for equivalent limits. | Route/controller audit indicates selective usage, not universal enforcement. |

## Logging and Redaction

| Severity | Confidence | Finding | Evidence |
| -------- | ---------- | ------- | -------- |
| Medium | High | Redaction key list is narrow and may miss additional sensitive keys in structured logs. | `packages/helpers-backend/src/redactForLog.ts` only redacts `basic_auth_password`. |
| Low-Medium | Medium | Some error logging paths include upstream payload data and stack traces. | `packages/external-services-podcast-index/src/index.ts` logs error response details. |

## Startup Validation Controls

- Strong startup validation exists for both API and management API envs:
  - `apps/api/src/lib/startup/validation.ts`
  - `apps/management-api/src/lib/startup/validation.ts`
- This reduces misconfiguration risk but does not substitute for runtime authorization and
  input hardening.
