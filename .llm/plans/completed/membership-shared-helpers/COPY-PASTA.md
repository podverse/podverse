# COPY-PASTA — membership-shared-helpers

Pure DRY refactor of this branch's membership work: move already-tested mobile helpers **down** into
the shared packages web + mobile both use. Run one block at a time (order is flexible; both are
independent). **Agents: implement only — do not run tests.** Operator verifies at the end.

## Prompts

- [x] **Step 1 — Shared `deriveMembershipState` in `@podverse/helpers`.** _(done 2026-08-06)_ Added
  `deriveMembershipState` + `MembershipState`/`MembershipTier` to `packages/helpers/src/lib/accountMembership.ts`
  (tolerant of DTO `account_membership_id` and populated `account_membership.id`, no `as`), exported from the
  barrel, and relocated the derivation unit tests into `accountMembership.test.ts`. Mobile
  `membershipStatus.ts` is now a thin re-export (mobile-named aliases kept); its test was deleted and dropped
  from `vitest.config.ts`. Web `membership/page.tsx`, `Banner/MembershipExpiredBanner.tsx`, and
  `Toast/MembershipExpirationToast.tsx` now consume the shared helper. Mobile shows 3 stale-`dist` type errors
  until `npm run build:packages` (expected; the mobile app resolves the built package output).

**Cursor model:** Opus 4.8 — shared package + web/mobile refactor + test relocation.

```text
Read and execute .llm/plans/active/membership-shared-helpers/01-shared-derive-membership-state.md
Add a pure deriveMembershipState(account) to packages/helpers/src/lib/accountMembership.ts (returning
{ isLoggedIn, isMember, isExpired, tier, expiresAt }, tolerant of both account_membership_id and a
populated account_membership.id, no `as`). Make apps/mobile membershipStatus.ts a thin re-export, move
its unit test into packages/helpers, and refactor the 3 web derivation sites (membership/page.tsx,
MembershipExpiredBanner.tsx, MembershipExpirationToast.tsx) to consume it. Do not run tests.
```

- [x] **Step 2 — Shared membership-denial reason + i18nKey constants in `@podverse/helpers-requests`.**
  _(done 2026-08-06)_ Added `MEMBERSHIP_GATE_I18N_KEYS` + `membershipDenialReason(i18nKey)` +
  `MembershipDenialReason` next to `parseMembershipGateError` (auto-exported by `api/index.ts`), with
  categorizer unit tests in `parseMembershipGateError.test.ts`. Mobile `membershipDenial.ts` now uses the
  shared categorizer + re-exports the shared type (dropped local `reasonForI18nKey`). Web
  `modalForMembership403.tsx` uses `MEMBERSHIP_GATE_I18N_KEYS.*` (dropped its local literals). Note:
  `MembershipGateProvider.tsx` / `MoreMembershipScreen.tsx` only reference `membership.gate.*` /
  `membership.*` **UI catalog** keys — not the API 403 `i18nKey` literals — so they needed no change.
  Mobile shows stale-`dist` type errors until `npm run build:packages` (expected).

**Cursor model:** Codex 5.3 — small shared additions + literal de-duplication.

```text
Read and execute .llm/plans/active/membership-shared-helpers/02-shared-membership-denial-constants.md
Add MEMBERSHIP_GATE_I18N_KEYS + membershipDenialReason(i18nKey) next to parseMembershipGateError in
@podverse/helpers-requests and export them. Refactor apps/mobile membershipDenial.ts (drop local
reasonForI18nKey) plus the i18nKey literals in MembershipGateProvider.tsx / MoreMembershipScreen.tsx,
and apps/web modalForMembership403.tsx, to consume the shared constants/reason. Co-locate reason tests.
Do not run tests.
```

## Cumulative verification (operator — after all steps)

Rebuild shared packages first so the symlinked apps see the new exports, then unit + lint, then the
membership web E2E.

```bash
npm run build:packages
npm run test -w @podverse/helpers
npm run test -w @podverse/helpers-requests
npm run lint
make e2e_test_web_report_spec SPEC=e2e/membership-gating.spec.ts,e2e/podcast-index-feed-add-trial-blocked.spec.ts
open .artifacts/e2e-reports/latest/index.html
```

Mobile unit tests (node-only) after the mobile re-export:

```bash
npm run test -w apps/mobile
```
