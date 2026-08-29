# 01 — Access tiers and the gating seam

**Cursor model:** Opus 5
**Reasoning:** high
**Detail:** [700-access-tiers-and-membership-gating](/docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md)
**Master step:** P2.4.1

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 25–34 before starting.

## Goal

One place answers "what can this user do", covering three tiers — Anonymous, Account, Membership —
plus the lapsed-membership state. Every other prompt in this set gates against it instead of
re-deriving gating from auth plus membership fields.

## The seam is shared, not mobile-only

Web today splits gating in two places: call sites check `loggedInAccount` before an API call, and
`useMembershipGate` handles the resulting 403. There is no single tier concept.

Put the resolver in **`packages/helpers-requests`**, extending the existing
`parseMembershipGateError` / `MembershipDenialReason` types rather than adding a second parallel
model. Mobile consumes it through a hook; web's `useMembershipGate` refactors onto it.

**Web's refactor must be behavior-preserving** — existing login modals and 403 membership modals keep
working, now derived from one tier model instead of two independent checks.

## Work

1. Add the shared tier resolver in `packages/helpers-requests`, extending
   `parseMembershipGateError.ts`. Respect architecture tier dependencies — it may not import from
   apps.
2. Add a mobile capability module under `apps/mobile/src/auth/` (or the nearest existing auth domain)
   that consumes the shared resolver and exposes a per-feature gate query. Follow the generic-helper
   placement guidance in [`mobile-react-native`](/.cursor/rules/mobile-react-native.mdc).
3. Refactor `apps/web/src/hooks/useMembershipGate.ts` onto the shared resolver without changing
   behavior. `SubscribeButton.tsx` is the reference for the current login-then-403 split.
4. Encode the tier assignments from
   [`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc)
   as data, not scattered conditionals. Note that **subscribing** has three behaviors and
   **unsubscribing is never gated** — see decisions 28–29.
5. Add a shared gated-control presentation on mobile: working feature, upgrade affordance, or renewal
   affordance. Reuse existing feedback/banner components under `apps/mobile/src/components/` rather
   than building new chrome; extract a shared component if none fits.
6. Migrate existing ad-hoc checks to the seam — start with the add-by-RSS strings
   `features.search.add_needs_login` and `add_needs_membership`, which currently imply a two-state
   model.
7. Build the four renewal reminder surfaces: at the gated feature, a persistent row in More/settings,
   a dismissible Home banner, and a push notification near expiry. Leave the auto-renew suppression
   as a single named predicate that currently returns `false`, so detail 711 is a one-line change.
8. Lapsed behavior for add-by-RSS: existing feeds stay visible and playable, refresh stops, adding is
   blocked.
9. i18n: mobile-chrome strings go in the mobile overlay; anything web could reuse goes in
   **`consumer`**. No hardcoded copy.
10. Unit tests for tier resolution across anonymous, account, membership, and lapsed, in the shared
    package so both surfaces are covered once.

## Constraints

- No `any`, no type assertions; model tiers as a discriminated union.
- Do not gate anything the device can do alone — check each control against the gate test first.
- Web behavior must not change: this is a refactor onto a shared model, not a UX change.
- Do not run tests during implementation.

## Done when

Tier resolution is centralized in the shared package and consumed by both mobile and web, every gated
mobile control renders one of the three presentations, web behaves exactly as before, a lapsed member
retains anonymous- and account-tier capability, and unit tests cover all four states.
