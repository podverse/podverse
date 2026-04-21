# Final Security Report - Podverse SQLi and Attack Surface Audit

## Executive Summary

- Primary question answered: no confirmed direct SQL injection exploit path was found in reviewed
  Podverse runtime code.
- Highest confidence SQL-adjacent issue: dynamic SQL identifier interpolation in
  `packages/orm/src/services/stats/baseStatsTrackEvent.ts` is a future-risk pattern.
- Most actionable risks in this audit are non-SQL:
  - management API authorization scope
  - parser SSRF/DoS hardening gaps
  - session/token policy and validation/logging hygiene

## Confirmed Findings

| ID | Severity | Confidence | Title |
| -- | -------- | ---------- | ----- |
| PVSA-001 | Medium | High | Management admin record enumeration/IDOR exposure. |
| PVSA-002 | Low-Med | High | Stats raw SQL identifier interpolation footgun. |
| PVSA-003 | Medium | High | Parser outbound request SSRF-class attack surface. |
| PVSA-004 | Medium | High | Parser request body-size/response-size DoS risk. |
| PVSA-005 | Medium | High | Long-lived JWT windows in API and management API. |
| PVSA-006 | Low-Med | High | Optional token-in-body response exposure. |
| PVSA-007 | Medium | High | Non-strict unknown key handling in validation pipeline. |
| PVSA-008 | Medium | High | Limited log redaction key coverage. |
| PVSA-009 | Low-Med | Medium | Upstream API error payload logging detail. |
| PVSA-010 | Medium | High | Management dashboard client-only auth redirect gate. |

## SQL Injection Conclusion

- No high-confidence exploitable SQL injection was confirmed.
- Raw SQL exists in limited ORM paths; values are parameterized in reviewed cases.
- One structural refactor is recommended to eliminate identifier interpolation and reduce future
  regression risk.

## Residual Risk and Test Gaps

- Full exploitability of CSRF-class risks depends on API cookie/origin policy not fully validated
  in this pass.
- Full SSRF risk closure requires implementing and testing central URL/network policy controls.
- Existing route-level coverage varies; security regression tests should be added for authz and
  request policy behavior.

## Remediation Plan

- Use `06-phase6-remediation-backlog.md` as implementation order.
- Use `security-findings-tracker.md` to track state transitions from `open` to `resolved` or
  `accepted_risk`.

## Recommended Next Step

- Execute P0 backlog items first:
  1. management authz scope fix
  2. parser/helpers request SSRF controls
