# Phase 1 - API and Management API Entry Point Audit

## SQLi Assessment At Entry Points

- `apps/api` controllers do not build raw SQL directly; they pass validated input to ORM services.
- `apps/management-api` route/service layer uses TypeORM repository lookups (`findOne`, `save`).
- No direct SQL injection primitives were found in route/controller code.

## Confirmed Findings

| Severity | Confidence | Finding | Evidence |
| -------- | ---------- | ------- | -------- |
| Medium | High | Management IDOR: any authenticated admin can enumerate other admin records by numeric id. | `apps/management-api/src/routes/adminAccount.ts` fetches `adminAccountService.get(id)` without ownership check. |
| Medium | High | Payment completion flow is not explicitly bound to caller account at the controller boundary. | `apps/api/src/controllers/account/accountPayPalOrder.ts` completes by payment id from body through service call path. |
| Low | High | Stats event tracking accepts arbitrary target entity id_text values from authenticated users. | `apps/api/src/controllers/stats/statsTrackEvent*.ts` forwards `*_id_text` to service `_create`. |
| Low-Medium | Medium | Public transcript read path can trigger server-side fetches of stored transcript URLs. | `apps/api/src/controllers/itemTranscript.ts` fetches `item_transcript.url` via request helper. |

## SQLi-Safe Patterns Verified In This Phase

- `apps/api/src/controllers/stats/statsTrackEventItem.ts`
  - Body field `item_id_text` is forwarded to ORM; no SQL string building at controller layer.
- `apps/management-api/src/orm/services/adminAccount.ts`
  - Repository `where` conditions use parameterized ORM behavior.

## Notes For Next Phases

- SQL injection risk in this repo is concentrated in ORM-level sink code, not route files.
- Authz and ownership assurance must be proven end-to-end for:
  - admin account reads
  - payment completion mutation routes
  - stats event abuse controls
