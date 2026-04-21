# Phase 4 - Web and Management Web Client Surface Audit

## Confirmed Findings

| Severity | Confidence | Finding | Evidence |
| -------- | ---------- | ------- | -------- |
| High (API-dependent final impact) | Medium | CSRF-sensitive pattern: management-web requests include credentials by default. | `apps/management-web/src/lib/requests/_request.ts` sets `withCredentials: true`. |
| Medium | High | Management dashboard auth gate is client-side `useEffect` redirect, not server-enforced. | `apps/management-web/src/app/dashboard/page.tsx`. |
| Low-Medium | High | `/settings` page in web lacks SSR auth gate while sensitive tabs are gated in client code. | `apps/web/src/app/settings/page.tsx`, `apps/web/src/components/Settings/Settings.tsx`. |
| Low | Medium | Custom link component does not enforce safe scheme allowlist for caller-provided hrefs. | `apps/web/src/components/Link/Link.tsx`. |

## XSS/Injection Surface Review

- HTML rendering uses sanitizer with tag/attr allowlists:
  - `apps/web/src/components/Description/DescriptionRenderer.tsx`
- Runtime config script serialization escapes `<` before inline injection:
  - `packages/helpers-browser/src/runtimeConfigScript.ts`

Result:
- No direct exploitable reflected XSS was confirmed in reviewed client code paths.
- Residual risk remains policy-based (sanitizer bypasses, unsafe caller-provided href values).

## SQLi Relevance For Phase 4

- No SQL injection vectors identified in frontend code.
- Client-side findings are session and navigation control related, not database query related.

## Follow-Up Verification Targets

1. Confirm management API CSRF protections (same-site policy, origin checks, anti-CSRF tokens).
2. Decide if management dashboard should add server-side middleware/session enforcement.
3. Add centralized safe URL utility for user-controlled links where needed.
