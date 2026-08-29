# membership-shared-helpers — SUMMARY

## Goal

Remove duplicated **membership** logic that this branch introduced in `apps/mobile` and re-derived
inline in `apps/web`, by moving the pure pieces **down** into the shared packages both consumers
already depend on (`@podverse/helpers`, `@podverse/helpers-requests`). No behavior change — pure
refactor to a single source of truth so web and mobile cannot drift.

## What prompted this

Reviewing this branch vs `develop`, the membership work (from `mobile-membership-and-v4v` +
`web-membership-gate-parity-followups`) already shares the **403 detector** (`parseMembershipGateError`
in `@podverse/helpers-requests`). But two smaller pieces are still duplicated:

### Opportunity 1 (primary) — membership-state derivation

Mobile has a clean pure helper:

- `apps/mobile/src/membership/membershipStatus.ts` → `deriveMembershipState(account)` returning
  `{ isLoggedIn, isMember, isExpired, tier, expiresAt }`, built from
  `hasValidMembership` / `isMembershipExpiredAt` / `AccountMembershipEnum` (all in `@podverse/helpers`).

Web re-derives the **same** state inline in ≥3 places:

- `apps/web/src/app/membership/page.tsx` (`membershipId`, `isTrialStatus`, `isPremiumStatus`,
  `isExpired`, `membershipExpiresAt` — plus a populated-`account_membership.id` fallback).
- `apps/web/src/components/Banner/MembershipExpiredBanner.tsx` (`isMembershipExpiredAt(expiresAt)`).
- `apps/web/src/components/Toast/MembershipExpirationToast.tsx` (reads `membership_expires_at`).

→ Move `deriveMembershipState` into `@podverse/helpers` (next to the primitives it uses). Mobile
`membershipStatus.ts` becomes a thin re-export; the 3 web sites consume the shared helper.

### Opportunity 2 (secondary) — membership-denial reason + i18nKey constants

The `membership.*` i18nKey **string literals** and the "which denial reason" branching are duplicated:

- `apps/mobile/src/membership/membershipDenial.ts` (`reasonForI18nKey` → `expired` /
  `insufficient_tier` / `limit`, with literal keys).
- `apps/web/src/utils/membership/modalForMembership403.tsx` (`I18N_MEMBERSHIP_EXPIRED`,
  `I18N_FEATURE_NOT_AVAILABLE` constants + inline branching).
- Same literals also appear in mobile `MembershipGateProvider.tsx` / `MoreMembershipScreen.tsx`.

→ Co-locate `MEMBERSHIP_GATE_I18N_KEYS` + `membershipDenialReason(i18nKey)` next to
`parseMembershipGateError` in `@podverse/helpers-requests`; mobile + web consume them.

## Scope

- Tier A shared packages only add pure functions/constants (no RN/Next imports) — safe for every tier.
- Refactor mobile (`membership/*`) and web (membership page, banner, toast, `modalForMembership403`).
- Add/relocate unit tests into the shared packages; keep web E2E (`membership-gating.spec.ts`) green.

## Non-goals — considered and intentionally left in `apps/mobile`

These new mobile helpers were reviewed and are **not** shared, because there is no cross-app
duplicate and moving them would add coupling for no gain:

- `src/lib/share/shareUrl.ts` — web is the share **target** (uses relative Next routes), so it has no
  `${webBaseUrl}/${resource}/${idText}` duplicate. Keep in mobile.
- `src/theme/resolveColumns.ts`, `src/theme/useResponsive.ts` — React Native `Dimensions`-based; web
  responsiveness is CSS. No shareable core.
- `src/auth/mobileClientHeaders.ts` — Expo/platform-specific; web sends no client-version header today.
  Revisit only if a cross-client header contract is introduced.
- `src/membership/checkoutUrl.ts` — mobile-only membership path constants (web uses `ROUTES`, not a
  shared package). Keep isolated as the native-IAP swap seam.
- Gate hooks (`apps/web` `useMembershipGate` vs mobile `MembershipGateProvider`) — the platform modal
  layers legitimately differ; the shared logic (`parseMembershipGateError`) is already extracted.

## Cross-surface scope (car / watch / tablet)

These shared helpers run **only where JS runs** — phone, tablet, and Android-TV RN screens — and that
is correct and complete:

- **Tablet / Android-TV** consume the same RN membership screens/components, so they inherit this
  refactor with no per-surface work.
- **Car (CarPlay / Android Auto) and watch** are native-only, app-closed consumers of the native cache
  that only browse + play **already-cached** content via a direct transport action; they issue no
  member-gated mutation API calls and playback is not a gated feature, so no membership handling is
  needed (or wanted) there. Adding an entitlement check to the native car/watch path would break the
  app-closed constraint. Documented in
  [535-device-track-scope-matrix](/docs/proposals/mobile/_master-plan_/phase-1/details/535-device-track-scope-matrix.md)
  and [car-ux-parity/000-OVERVIEW](/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md).

Therefore this plan deliberately keeps everything in the shared TS packages and adds **no** native code.

## Risk

Low. Pure moves of already-tested logic; the only subtlety is that the shared
`deriveMembershipState` input type must tolerate web's populated `account_membership.id` shape as well
as the DTO `account_membership_id` — handled with a permissive input type (no `as`).
