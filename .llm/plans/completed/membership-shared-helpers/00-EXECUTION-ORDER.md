# membership-shared-helpers — EXECUTION ORDER

Two independent refactors. Either order works; both add pure code to shared packages, then refactor
mobile + web consumers, then move tests down. After **each** step, rebuild packages so the symlinked
`apps/mobile` / `apps/web` see the new exports.

1. **01 — Shared `deriveMembershipState` in `@podverse/helpers`.**
   Add the pure helper next to `hasValidMembership`/`isMembershipExpiredAt`/`AccountMembershipEnum`;
   make mobile `membershipStatus.ts` a thin re-export; refactor the 3 web derivation sites; relocate
   the mobile unit test into `packages/helpers`.

2. **02 — Shared membership-denial reason + i18nKey constants in `@podverse/helpers-requests`.**
   Add `MEMBERSHIP_GATE_I18N_KEYS` + `membershipDenialReason(i18nKey)` next to
   `parseMembershipGateError`; refactor mobile `membershipDenial.ts` and web `modalForMembership403.tsx`
   to consume them; co-locate reason unit tests.

Dependencies: 01 and 02 are independent (different packages, different files). Both depend on
`@podverse/helpers` / `@podverse/helpers-requests` being rebuilt before the mobile/web type-checks pass
(same `build:packages` gotcha noted in `mobile-membership-and-v4v`).

Verification (operator, after both steps) is in `COPY-PASTA.md`.
