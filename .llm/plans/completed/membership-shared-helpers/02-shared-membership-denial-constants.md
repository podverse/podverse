# 02 — Shared membership-denial reason + i18nKey constants in `@podverse/helpers-requests`

## Why

The `membership.*` i18nKey **string literals** and the "expired vs premium-feature vs limit" branching
are duplicated between mobile `membershipDenial.ts` (`reasonForI18nKey`) and web
`modalForMembership403.tsx` (`I18N_MEMBERSHIP_EXPIRED` / `I18N_FEATURE_NOT_AVAILABLE` + inline
branching), and the same literals recur in mobile `MembershipGateProvider.tsx` /
`MoreMembershipScreen.tsx`. Co-locate them with the parser both already import.

## Changes

### 1. Add to `@podverse/helpers-requests` (next to `parseMembershipGateError`)

In `packages/helpers-requests/src/api/parseMembershipGateError.ts` (or a sibling
`membershipDenialReason.ts` re-exported from `api/index.ts`):

```ts
export const MEMBERSHIP_GATE_I18N_KEYS = {
  expired: 'membership.membership_expired',
  featureNotAvailable: 'membership.feature_not_available_for_account_type',
} as const;

export type MembershipDenialReason = 'expired' | 'insufficient_tier' | 'limit';

/** Categorises a membership 403 `i18nKey` into a coarse reason for message/banner copy. */
export function membershipDenialReason(i18nKey: string): MembershipDenialReason {
  if (i18nKey === MEMBERSHIP_GATE_I18N_KEYS.expired) return 'expired';
  if (i18nKey === MEMBERSHIP_GATE_I18N_KEYS.featureNotAvailable) return 'insufficient_tier';
  // add_by_rss_feed_limit_reached / manual_refresh_hourly_limit_reached / future membership.* limits.
  return 'limit';
}
```

Export from `packages/helpers-requests/src/api/index.ts`. Tier A — `.js` NodeNext specifiers.

### 2. Tests

Add `membershipDenialReason` cases to a test in `packages/helpers-requests/src/api/`
(expired, feature-not-available, a limit key, and an unknown `membership.*` key → `limit`). If the mobile
`membershipDenial.test.ts` becomes a thin wrapper, keep only mobile-specific mapping assertions there.

### 3. Mobile `membershipDenial.ts`

Replace the local `reasonForI18nKey` with the shared `membershipDenialReason`:

```ts
import { membershipDenialReason, parseMembershipGateError } from '@podverse/helpers-requests';
// ...
return {
  reason: membershipDenialReason(parsed.i18nKey),
  i18nKey: parsed.i18nKey,
  ...(parsed.renewPath !== undefined ? { renewPath: parsed.renewPath } : {}),
};
```

Keep `MembershipDenial` / `MembershipDenialReason` exported for mobile call sites (re-export the shared
`MembershipDenialReason` type). Update `MembershipGateProvider.tsx` / `MoreMembershipScreen.tsx` to use
`MEMBERSHIP_GATE_I18N_KEYS.*` instead of raw `'membership.membership_expired'` literals where they
compare i18nKeys.

### 4. Web `modalForMembership403.tsx`

Replace the local `I18N_MEMBERSHIP_EXPIRED` / `I18N_FEATURE_NOT_AVAILABLE` constants with
`MEMBERSHIP_GATE_I18N_KEYS.expired` / `MEMBERSHIP_GATE_I18N_KEYS.featureNotAvailable`. The two-branch
copy logic can stay as explicit `if (i18nKey === MEMBERSHIP_GATE_I18N_KEYS.expired)` checks (optionally
switch on `membershipDenialReason(i18nKey)` — cosmetic, keep the existing message copy identical).

Web is Tier B — extensionless import from `@podverse/helpers-requests`.

## Out of scope

No change to the 403 API shape, `parseMembershipGateError` behavior, message copy, or the auth-based
Renew/Sign-Up label logic (still decided at call sites).

## Verify (operator — do not run during implementation)

```bash
npm run build:packages
npm run test -w @podverse/helpers-requests
npm run lint
```

Web E2E: `make e2e_test_web_report_spec SPEC=e2e/membership-gating.spec.ts,e2e/podcast-index-feed-add-trial-blocked.spec.ts`
