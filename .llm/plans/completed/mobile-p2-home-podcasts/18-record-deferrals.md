# 18 — Record deferrals and close the set

**Cursor model:** Auto
**Reasoning:** low
**Details:** [710-defer-filter-pull-down-reveal](/docs/proposals/mobile/_master-plan_/phase-2/details/710-defer-filter-pull-down-reveal.md),
[711-defer-auto-renew-aware-reminders](/docs/proposals/mobile/_master-plan_/phase-2/details/711-defer-auto-renew-aware-reminders.md),
[897-defer-mobile-schema-drift-checks](/docs/proposals/mobile/_master-plan_/phase-2/details/897-defer-mobile-schema-drift-checks.md),
[896-defer-tablet-layout-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/896-defer-tablet-layout-parity.md)
**Master steps:** P2.3.8, P2.3.9, P2.3.11, P2.3.12
**Depends on:** all prior prompts

Documentation only — no production code.

## Work

1. Confirm the deferral detail docs reflect what was actually built:
   - **710** — the filter input shipped always-visible; the hidden-until-pull-down reveal is not
     implemented. Record the Android-convention question as still open.
   - **711** — already updated by prompt 01: names `shouldSuppressExpiryReminder` in
     `packages/helpers/src/lib/accessTier.ts` as the one-line seam, and corrects the original premise
     (web's `MembershipExpirationToast` already reads `auto_renew`). Verify nothing regressed.
   - **897** — schema and migration drift checks are deferred until after Phase 2, when the local
     schema has more surface area and the value of `drizzle-kit` or a custom check can be evaluated.
   - **896** — tablet still takes the left-rail branch and still has no mini player. Confirm the
     sync indicator from prompt 04 was added to that branch anyway, and that no other phone-only
     chrome landed without it.
   - Confirm no deferral doc has reintroduced a **push or email** expiry reminder; expiry is in-app
     and on demand only (rule `no-membership-expiry-notifications`).
2. Reconcile status across the Phase 2 plan: every step implemented in prompts 01–17 flips to `done`
   in the P2.1 planned-steps table, the Track P2.4 and Track P2.5 tables, and the Appendix detail
   index. Detail doc headers flip to `**Status:** done`.
3. Mark every prompt `[x]` in [COPY-PASTA.md](COPY-PASTA.md).
4. Note any decision the implementation had to change, and why, in
   [00-DIVERGENCES.md](00-DIVERGENCES.md). Do not silently diverge from a locked decision.
5. Remove `.llm/plans/active/mobile-p2-home-podcasts/` after the operator confirms the area is
   closed, per [`plan-completion`](/.cursor/skills/plan-completion/SKILL.md). Durable outcomes stay
   in the detail docs and the phase plan.

## Final response requirement

This is the last prompt in the set. Assume the operator ran every prompt back-to-back without
testing. End the response with **all** cumulative verification commands for the whole set in one
fenced `bash` block, ordered build/lint → unit → API → **web E2E** → mobile E2E, deduplicated. This
set touches web as well as mobile, so the block must include `make e2e_test_web_report_spec` runs for
`/podcasts`, the podcast detail page, and notifications alongside the Maestro commands. Name **Mobile
Metro** and **Mobile E2E API** in prose as leave-running tabs rather than putting them in the block.
