# Security Findings Tracker

| ID | Finding | Primary File(s) | Fix Owner | Severity | Status | Resolution |
| -- | ------- | --------------- | --------- | -------- | ------ | ------------ |
| PVSA-001 | Management admin account enumeration/IDOR risk by numeric id lookup. | `apps/management-api/src/routes/adminAccount.ts` | management-api | Medium | resolved | Admin routes require global admin scope / hardened lookup per remediation plan 01. |
| PVSA-002 | Stats raw SQL identifier interpolation (`entityName`/`entityIdField`) is a future SQLi footgun. | `packages/orm/src/services/stats/baseStatsTrackEvent.ts` | orm | Low-Med | resolved | Identifier resolved via TypeORM metadata (`propertyPath`); invalid fields throw before SQL. |
| PVSA-003 | Parser request paths allow broad outbound URL fetch without central SSRF policy. | `packages/parser/src/lib/_request.ts`, `packages/helpers-requests/src/_request.ts` | parser/helpers-requests | Medium | resolved | Shared outbound policy (DNS/IP checks, redirect validation, scheme allowlist) on outbound request paths. |
| PVSA-004 | Parser/feed fetch pipeline lacks shared response-size guardrails. | `packages/helpers-requests/src/_request.ts`, `packages/parser/src/lib/rss/parser.ts` | parser/helpers-requests | Medium | resolved | Max body size and outbound policy aligned on shared helpers-requests outbound stack. |
| PVSA-005 | Long-lived JWT expiration (365d) increases token theft impact. | `apps/api/src/lib/auth/index.ts`, `apps/management-api/src/lib/auth/index.ts` | api + management-api | Medium | resolved | Shorter default JWT max age (90d) with env override and tests (plan 04). |
| PVSA-006 | Optional login token in response body broadens leakage paths. | `apps/api/src/lib/auth/index.ts`, `apps/management-api/src/lib/auth/index.ts` | api + management-api | Low-Med | resolved | Token-in-body requires env flag plus explicit client opt-in (plan 04). |
| PVSA-007 | Validation helper defaults do not enforce strict unknown-key policy globally. | `apps/api/src/lib/validation/index.ts` | api | Medium | resolved | Global Joi `stripUnknown`; params/query replaced safely; tests added (plan 05). |
| PVSA-008 | Narrow redaction list may expose additional sensitive fields in logs. | `packages/helpers-backend/src/redactForLog.ts` | helpers-backend | Medium | resolved | Deep redaction with expanded key patterns; tests (plan 06). |
| PVSA-009 | Podcast Index error logging includes rich error payload details by default. | `packages/external-services-podcast-index/src/index.ts` | external-services-podcast-index | Low-Med | resolved | Logs use `summarizeUpstreamHttpErrorForLog`; no raw response bodies (plan 06). |
| PVSA-010 | Management dashboard relies on client-side auth redirect rather than server gate. | `apps/management-web/src/app/dashboard/page.tsx` | management-web | Medium | resolved | Server-side session check + `redirect` before render; client verify is fallback only (plan 07). |

## Notes

- Status values: `open`, `in_progress`, `resolved`, `accepted_risk`.
- This tracker intentionally includes only high-confidence and medium-confidence issues from this audit run.
- **Wave 1 P2 items** (queue list guardrails, web safe `Link` policy) are documented in `.llm/plans/completed/podverse-security-remediation-wave-1/10-remediation-summary.md` and do not map 1:1 to extra rows above.
