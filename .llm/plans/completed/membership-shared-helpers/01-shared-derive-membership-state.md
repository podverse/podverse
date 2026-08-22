# 01 — Shared `deriveMembershipState` in `@podverse/helpers`

## Why

`deriveMembershipState` lives in `apps/mobile/src/membership/membershipStatus.ts`, but web re-derives
the identical state inline in `membership/page.tsx`, `MembershipExpiredBanner.tsx`, and
`MembershipExpirationToast.tsx`. Move the pure derivation down so both consume one implementation.

## Changes

### 1. Add the helper to `packages/helpers/src/lib/accountMembership.ts`

Append (do not disturb the existing `AccountMembershipEnum` / `hasValidMembership` /
`isMembershipExpiredAt`):

```ts
export type MembershipTier = 'trial' | 'premium';

export interface MembershipState {
  isLoggedIn: boolean;
  isMember: boolean;
  isExpired: boolean;
  tier: MembershipTier | null;
  expiresAt: string | null;
}

// Permissive input: DTO uses `account_membership_id`; some SSR/populated payloads use
// `account_membership.id`. Accept both without a type assertion.
type MembershipStatusInput =
  | {
      account_membership_id?: number;
      account_membership?: { id?: number };
      membership_expires_at?: string | Date | null;
    }
  | null
  | undefined;

type AccountLike = { account_membership_status?: MembershipStatusInput } | null | undefined;

const tierFromMembershipId = (membershipId: number | undefined): MembershipTier | null => {
  if (membershipId === AccountMembershipEnum.Premium) return 'premium';
  if (membershipId === AccountMembershipEnum.Trial) return 'trial';
  return null;
};

export function deriveMembershipState(account: AccountLike): MembershipState {
  if (account === null || account === undefined) {
    return { isLoggedIn: false, isMember: false, isExpired: false, tier: null, expiresAt: null };
  }
  const status = account.account_membership_status ?? null;
  const membershipId = status?.account_membership_id ?? status?.account_membership?.id;
  const rawExpiresAt = status?.membership_expires_at ?? null;
  const expiresAt = typeof rawExpiresAt === 'string' ? rawExpiresAt : null;
  return {
    isLoggedIn: true,
    isMember: hasValidMembership(status),
    isExpired: isMembershipExpiredAt(status?.membership_expires_at ?? null),
    tier: tierFromMembershipId(membershipId),
    expiresAt,
  };
}
```

Confirm it is re-exported from `packages/helpers/src/index.ts` (the barrel that already exports
`hasValidMembership`). Keep `.js` NodeNext specifiers (Tier A).

### 2. Tests → `packages/helpers/src/lib/accountMembership.test.ts`

Move the mobile cases from `apps/mobile/src/membership/membershipStatus.test.ts`: logged-out (null),
valid premium, expired premium, valid trial, null expiry, logged-in-no-status, and the
populated-`account_membership.id` case (web SSR shape).

### 3. Mobile → thin re-export

`apps/mobile/src/membership/membershipStatus.ts`:

```ts
export type {
  MembershipState as MobileMembershipState,
  MembershipTier as MobileMembershipTier,
} from '@podverse/helpers';
export { deriveMembershipState } from '@podverse/helpers';
```

- Leave `useMembership.ts` unchanged (still imports `deriveMembershipState` from `./membershipStatus`).
- Delete `apps/mobile/src/membership/membershipStatus.test.ts` and remove its entry from
  `apps/mobile/vitest.config.ts` `include` (moved to `@podverse/helpers`). Keep the file's doc comment
  in sync.

### 4. Web consumers use the shared helper

- `apps/web/src/app/membership/page.tsx`: replace the manual `membershipId` / `isTrialStatus` /
  `isPremiumStatus` / `membershipExpiresAt` / `isExpired` block with
  `const membership = deriveMembershipState(ssrLoggedInAccount);` then
  `membership.tier === 'trial'`, `membership.tier === 'premium'`, `membership.isExpired`,
  `membership.expiresAt`. Keep `calculateTimeRemaining` usage as-is (it consumes `expiresAt`).
- `apps/web/src/components/Banner/MembershipExpiredBanner.tsx`: replace the two-step
  `membershipExpiresAt` + `isMembershipExpiredAt` guard with
  `if (!deriveMembershipState(loggedInAccount).isExpired) return null;`.
- `apps/web/src/components/Toast/MembershipExpirationToast.tsx`: derive `expiresAt` /`isExpired` via
  the shared helper; keep the near-expiry `calculateTimeRemaining` toast logic unchanged.

Web is Tier B (`apps/web/src`) — keep **extensionless** import from `@podverse/helpers`.

## Out of scope

Do not change `hasValidMembership` / `isMembershipExpiredAt` signatures, the mobile
`MembershipExpiredBanner` / `MoreMembershipScreen` copy, or any modal behavior.

## Verify (operator — do not run during implementation)

```bash
npm run build:packages
npm run test -w @podverse/helpers
npm run lint
```

Web E2E (membership surfaces): `make e2e_test_web_report_spec SPEC=e2e/membership-gating.spec.ts`
