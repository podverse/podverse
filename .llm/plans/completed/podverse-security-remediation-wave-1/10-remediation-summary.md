# Wave 1 — remediation summary

## Verification (Wave 1 close-out)

Ran master-plan baseline:

- `npm run build:packages` — passed.
- `npm run lint` — passed (workspace type-check, ESLint, Prettier). Minor Prettier drift in a few touched files was formatted so the root lint script stays green.

Subsystem tests were exercised during each remediation plan (api, management-api, helpers-requests, parser, orm, helpers-backend, external-services-podcast-index, management-web, web as applicable).

## What was fixed (by finding)

| ID | Outcome |
| ---- | ------- |
| **PVSA-001** | Management admin routes require global admin scope (`requireAdminRole`); lookup-by-id hardened per plan. |
| **PVSA-002** | Stats track-event SQL identifiers validated against entity metadata (`propertyPath`), not raw string concat. |
| **PVSA-003** | Shared outbound URL policy (DNS + IP classification, scheme allowlist, redirect validation) for parser/helpers-requests outbound paths. |
| **PVSA-004** | Response size limits and outbound request policy aligned on shared `_request` paths. |
| **PVSA-005** | JWT max age shortened (90d default) with env override and tests. |
| **PVSA-006** | Login token in JSON body gated by env + explicit client flag (api + management-api). |
| **PVSA-007** | API validation uses `stripUnknown` / bounded params-query replacement; regression tests on helpers. |
| **PVSA-008** | `redactForLog` expanded (nested keys, patterns); upstream error summarizer avoids response bodies in logs. |
| **PVSA-009** | Podcast Index failures log sanitized summaries (status, path, correlation id), not raw Axios payloads. |
| **PVSA-010** | Management dashboard gated on server (`getManagementSessionUser` + `redirect`); client check is fallback only. |

**P2 follow-ups (no separate tracker IDs):**

- **Queue load guardrails (plan 08):** `QueueResourceService` history list options merged safely (no `FindManyOptions` widening); `take`/`skip` clamped; large `IN` lists chunked; account export paginates history.
- **Web safe URLs (plan 09):** Shared `Link` uses `getSafeLinkHref` (allowlisted schemes + internal paths; blocks `javascript:` and protocol-relative `//`).

## What remains / residual risk

- **Defense in depth:** Client-side and legacy call sites may still construct URLs or requests outside the shared `Link` or validation helpers; review continues best-effort.
- **Operational:** Token theft impact reduced by shorter JWT lifetime but not eliminated; cookie flags and rotation policies remain environment-dependent.
- **Third parties:** Outbound fetch policy reduces SSRF risk; novel DNS or CDN edge cases may still need tuning.
- **Build:** Full `next build` for `apps/web` may still hit unrelated Turbopack/`node:dns` bundling issues in some environments — not introduced by Wave 1 link changes.

Overall residual risk for the original audit items is **lower** with server-enforced gates, bounded queries, outbound policy, token/logging hygiene, and safe link rendering on the primary shared component.
