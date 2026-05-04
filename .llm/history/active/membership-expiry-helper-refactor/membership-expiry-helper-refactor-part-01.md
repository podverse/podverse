# membership-expiry-helper-refactor

## Session 1 - 2026-05-04

#### Prompt (Developer)

@podverse/apps/web/src/components/Banner/MembershipExpiredBanner.tsx:20 is this function used anywhere else? i think this should be a reusable imported helper instead of defined individually everywhere

#### Key Decisions

- Added `isMembershipExpiredAt` in `packages/helpers/src/lib/accountMembership.ts`, implemented via existing `hasValidMembership` for one instant comparison path.
- Refactored `MembershipExpiredBanner.tsx` and `apps/web/src/app/membership/page.tsx` to use `isMembershipExpiredAt`.
- Refactored `apps/api/src/lib/auth/index.ts` membership gate to use `!hasValidMembership(membershipStatus)` (equivalent to prior null/expiry/new Date checks).
- Added `packages/helpers/src/lib/accountMembership.test.ts` (vitest + fake timers).

#### Files Created/Modified

- packages/helpers/src/lib/accountMembership.ts
- packages/helpers/src/lib/accountMembership.test.ts
- packages/helpers/dist/ (via `tsc -p packages/helpers`)
- apps/web/src/components/Banner/MembershipExpiredBanner.tsx
- apps/web/src/app/membership/page.tsx
- apps/api/src/lib/auth/index.ts
- .cursor/skills/membership-expiry-ux-contract/SKILL.md
- .llm/history/active/membership-expiry-helper-refactor/membership-expiry-helper-refactor-part-01.md

## Session 2 - 2026-05-04

#### Prompt (Developer)

For the code present, we get this error: `Module '"@podverse/helpers"' has no exported member 'isMembershipExpiredAt'.` Fix it, verify, and then give a concise explanation. @podverse/apps/web/src/components/Banner/MembershipExpiredBanner.tsx:5-8

#### Key Decisions

- Replaced `export * from './lib/accountMembership.js'` with explicit named exports in `packages/helpers/src/index.ts` so `dist/index.d.ts` lists `isMembershipExpiredAt` (clearer for TS language service after rebuild).

#### Files Modified

- packages/helpers/src/index.ts
- packages/helpers/dist/ (rebuilt)

## Session 3 - 2026-05-04

#### Prompt (Developer)

For the code present, we get this error: `Duplicate enum member value 2.` Fix it, verify, and then give a concise explanation. @podverse/packages/helpers/src/lib/accountMembership.ts:14-17

#### Key Decisions

- Removed deprecated `Basic = 2` aliases from `AccountMembershipEnum` and `AccountMembershipTrustTierLegacyMap` (duplicate numeric value with `Premium`; ESLint `no-duplicate-enum-values`).
- Updated `tools/qa/docs/faker/*.md` examples from `AccountMembershipEnum.Basic` to `Premium`.

#### Files Modified

- packages/helpers/src/lib/accountMembership.ts
- tools/qa/docs/faker/03-lookup-tables.md
- tools/qa/docs/faker/04c-account-membership.md
- tools/qa/docs/faker/04e-account-devices-purchases.md
- tools/qa/docs/faker/07f-misc.md

## Session 4 - 2026-05-04

#### Prompt (Developer)

debug (terminal lint:fix type-check failures: orm imageShrinkSource.test.ts, api accountFollowingAddByRSSChannel + auth getAccountEntitlements)

#### Key Decisions

- **ORM test:** narrowed `saveMock.mock.calls[0]` with an explicit `undefined` guard (no non-null `!`) to satisfy TS2532 and ESLint `no-non-null-assertion`.
- **API entitlements:** `getAccountEntitlements` now takes `Pick<AccountMembershipStatus, ...>` as `MembershipStatusForEntitlements` so `AccountMembershipStatus` is accepted.
- **AccountFollowingAddByRSSChannelService:** `packages/orm/dist` was stale; `npm run build -w @podverse/orm` regenerated `.d.ts` with `hasFollowedAddByRSSChannel` / `getFollowedAddByRSSChannelCount`.

#### Files Modified

- apps/api/src/lib/accountEntitlements.ts
- packages/orm/src/services/imageShrinkSource.test.ts
- packages/orm/dist/ (rebuilt)
