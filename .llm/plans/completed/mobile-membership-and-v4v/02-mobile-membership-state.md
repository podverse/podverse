# 02 — Mobile membership state (`useMembership`)

**Cursor model:** Codex 5.3
**Master step:** Track 19.4 (563) — mobile state side.
**Ship bar:** The app exposes a single, tested source of truth for the current user's membership
status (member / expired / none, tier, expiry) derived from `/auth/me`, ready for the gate modal (03)
and Membership screen (04).

## Why

`account_membership_status` already arrives on `/auth/me` (`AuthProvider.account`) but nothing reads
it. Screens and the gate need a small, pure, testable derivation.

## Scope

1. **Pure derivation module** `apps/mobile/src/membership/membershipStatus.ts` (no RN/Expo imports so
   it stays in the node unit-test graph):
   - `deriveMembershipState(account: DTOAccount | null): MobileMembershipState` where
     `MobileMembershipState = { isLoggedIn: boolean; isMember: boolean; isExpired: boolean; tier:
     'trial' | 'premium' | null; expiresAt: string | null }`.
   - Use `hasValidMembership` / `isMembershipExpiredAt` and `AccountMembershipEnum` from
     `@podverse/helpers` — do not reimplement expiry logic.
   - `isMember = hasValidMembership(status)`; `isExpired = isMembershipExpiredAt(expiresAt)`;
     `tier` from nested `account_membership.tier` (or `account_membership_id`).
2. **Hook** `apps/mobile/src/membership/useMembership.ts` (RN-coupled) reading `useAuth().account`
   and returning `deriveMembershipState(account)`. Keep it thin; the logic lives in the pure module.
3. **Denial-reason mapping** `apps/mobile/src/membership/membershipDenial.ts` (pure): build on the
   **shared** `parseMembershipGateError` from `@podverse/helpers-requests` (added in 01 — do **not**
   re-implement the 403 parsing) and map its `i18nKey` to a normalized
   `{ reason: 'expired' | 'insufficient_tier' | 'limit'; i18nKey: string; renewPath?: string }` the
   modal (03) consumes — **the same i18nKey→reason mapping web uses**, for parity:
   - `membership.membership_expired` → `expired`
   - `membership.feature_not_available_for_account_type` → `insufficient_tier`
   - `membership.add_by_rss_feed_limit_reached` / `membership.manual_refresh_hourly_limit_reached` →
     `limit`
   `reason` selects **body copy only** — the modal's renew/sign-up **button label is auth-based**
   (`isLoggedIn`), so the mapper does not decide the label.

## Tests (write, do not run)

- `apps/mobile/src/membership/membershipStatus.test.ts`: logged-out, valid premium, expired premium,
  trial (valid), null expiry (none). Register in `apps/mobile/vitest.config.ts`.
- `apps/mobile/src/membership/membershipDenial.test.ts`: maps each `membership.*` `i18nKey` to the
  right `reason` (expired / insufficient_tier / limit) and returns `null` for non-membership errors.
  Register in `vitest.config.ts`.

## Guards

- Pure modules import **no** RN/Expo (keep them node-testable, mirroring `mobileClientHeaders.ts`).
- Strict equality; no `as`; `import type` for type-only imports; `.js` specifiers where Tier A applies
  (mobile app follows its own tsconfig — match existing mobile import style).

## Acceptance

- `useMembership()` returns correct state for logged-out / member / expired / trial from `/auth/me`.
- Denial mapper resolves all three API states plus a legacy fallback.
- New pure tests registered and passing locally.

## Verification (operator)

```bash
npm --prefix apps/mobile run test
```
