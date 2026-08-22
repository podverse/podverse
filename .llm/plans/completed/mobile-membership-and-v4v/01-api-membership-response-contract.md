# 01 — Membership 403 contract: shared parser + docs (no behavior change)

**Cursor model:** Opus 4.8 (shared package + web refactor + OpenAPI + integration tests)
**Master step:** Track 19.4/19.11 (563) — the shared client contract both web and mobile consume.
**Ship bar:** Web and mobile read the **same** membership-denial contract through **one shared parser**,
the contract is documented, and regression tests lock it — so the two clients cannot drift.

## Key finding (why this step is small)

The API **already sends adequate, distinguishing 403s** — no new fields are needed:

| Situation | HTTP | `code` / `i18nKey` | `renewPath` |
| --- | --- | --- | --- |
| Logged-in, membership expired/invalid | 403 | `membership_expired` / `membership.membership_expired` | `/membership/renew` |
| Valid membership, capability missing (e.g. trial) | 403 | `feature_not_available_for_account_type` / `membership.feature_not_available_for_account_type` | `/membership/renew` |
| Add-by-RSS feed limit | 403 | `add_by_rss_feed_limit_reached` / `membership.add_by_rss_feed_limit_reached` | `/membership/renew` |
| Manual refresh hourly limit | 403 | `manual_refresh_hourly_limit_reached` / `membership.manual_refresh_hourly_limit_reached` | `/membership/renew` |

`i18nKey` already distinguishes **expired** vs **premium-feature** vs **limit** for message copy. The
renew/sign-up **button label is auth-based** (logged-out → Sign Up, logged-in → Renew), so the client
does **not** need an expired-vs-never discriminator. (A truly non-authenticated request → 401, not 403;
and every logged-in account got a free trial, so "renew" is always correct when logged in.)

**Therefore: no API response-shape change.** Web already keys off `i18nKey`; mobile must do the same.

## Scope

1. **Promote a shared parser** to `@podverse/helpers-requests` — new
   `packages/helpers-requests/src/api/parseMembershipGateError.ts`:
   - `parseMembershipGateError(error: unknown): { code?: string; i18nKey: string; message?: string;
     renewPath?: string } | null` — generalize web's `readMembership403Payload` (reads
     `error.response.status === 403` + `data.{code,i18nKey,message,renewPath}`; returns `null` when it
     is not a `membership.*` 403). Export from the package index.
   - Keep `skipApiRequestErrorLogForMembershipGate` semantics (both can share the `membership.` prefix
     check).
2. **Refactor web to use it:** `apps/web/src/utils/membership/modalForMembership403.tsx` calls the
   shared parser instead of its private `readMembership403Payload` (delete the local copy). No web
   behavior change in this step (broad wiring is step 08).
3. **Document the contract:** add the membership 403 response schema (`code`, `i18nKey`, `message`,
   `renewPath`) to `apps/api/openapi.yml` (a shared response component referenced by the gated routes),
   and reference the **membership-expiry-ux-contract** / **entitlement-gating-rollout** skills.
4. **Regression tests (write, do not run):**
   - API integration (`apps/api`): the expired-membership 403 asserts `code`, **`i18nKey`**, and
     **`renewPath`** (strengthened in `account-follows-notifications.test.ts`).
   - Shared parser unit test (`@podverse/helpers-requests`): locks how clients read **both** the
     `membership_expired` and `feature_not_available_for_account_type` (+ limit) payloads via
     `parseMembershipGateError`. (The server-side capability-denial integration test needs the
     billing-catalog service mocked; add it with the capability-gating tests — the payload shape is
     already locked here at the client-contract level.)

## Out of scope

- No new response fields, no `membershipState`. No receipt/IAP. No behavior change to gating.

## Guards

- **Add-only / no-break:** do not rename or drop existing `code` / `i18nKey` / `message` / `renewPath`.
- Strict equality; no `as` (use the `isRecord`/type-guard style already in `modalForMembership403`);
  `import type` for type-only imports; Tier A `.js` specifiers in `helpers-requests`.

## Acceptance

- `parseMembershipGateError` exists in `@podverse/helpers-requests`, exported, and used by web.
- OpenAPI documents the membership 403 schema.
- Integration tests assert the existing expired + insufficient-tier payloads.

## Verification (operator)

```bash
npm run build:packages
npm run test:e2e:api
```
