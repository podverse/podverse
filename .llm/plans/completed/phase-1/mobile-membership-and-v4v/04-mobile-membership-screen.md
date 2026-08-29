# 04 — Membership screen (web parity)

**Cursor model:** Opus 4.8 (parity mapping + CTA logic)
**Master step:** Track 19 — **new page** (detail 568-mobile-membership-screen).
**Ship bar:** `MoreMembership` is a real screen (replacing the placeholder) that explains the tiers and
shows the correct primary CTA (Sign Up vs Extend), with an expired-state message when applicable.

## Why

The operator's flow needs a destination: the gate modal's "Renew / Sign Up" and the expired banner both
route here. Today it is `PlaceholderScreen title="Membership Placeholder"`.

## Web parity to mirror (source, not pixel-copy)

- `apps/web/src/app/membership/page.tsx`, `MembershipCTA.tsx`, `TrialLimitationsCollapsible.tsx`,
  `components/FeatureComparison/FeatureComparison.tsx`. i18n namespace `membership.*` (Free/Premium,
  pricing_monthly/annually, buy_premium_membership, extend_my_membership, trial_limitations_*).

## Scope

1. **Screen** `apps/mobile/src/screens/more/MoreMembershipScreen.tsx` (replace placeholder). Sections:
   - **Tier explanation:** Free vs Premium comparison (what Premium unlocks). Reuse the web feature rows
     / trial-limitations copy via i18n; do not invent product claims.
   - **Pricing:** fetch from the API pricing source used by web (`GET /membership/pricing` via a typed
     helper in `@podverse/helpers-requests` if reachable from mobile; otherwise
     `GET /product/membership`). Show monthly/annual + savings when available. Degrade gracefully if
     pricing is unavailable (hide prices, keep CTA).
   - **Expired/tier state:** if `useMembership().isExpired`, show the non-alarming "expired — renew"
     message (web: `membership_expired_text_*`); trial → upsell copy.
2. **CTA logic** (mirror `MembershipCTA.tsx`) via `useMembership()` — **auth-based binary**:
   - logged-out → **Sign Up** (prominent) → checkout entry (05) in sign-up mode.
   - logged-in (any state — expired, trial, or premium-with-expiry) → **Extend Membership** → checkout
     entry (05). This is the same logged-in path the gate modal (03) labels **"Renew"**; both verbs mean
     "log-in user extends/renews their membership" (web i18n `extend_my_membership`). Keep the wording
     consistent between the modal and this screen.
   - Respect a "contact-only" signup mode if mobile config exposes it (else default to the standard CTA).
3. **Navigation:** keep route id `MoreMembership` (deep link `more/membership`) so the gate modal (03)
   and banner route here unchanged. Keep `testID="more-membership-screen"`.
4. **i18n:** all copy via the mobile catalog; reuse `membership.*` keys where the web strings apply.

## Guards

- Tokens/primitives only; no hardcoded hex; virtualize any long list (feature comparison is short —
  a simple view is fine).
- No purchase logic here (that's 05 → web checkout until native IAP).
- Strict equality; no `as`; `import type`.

## Acceptance

- Real Membership screen shows tiers + pricing (or graceful fallback) + correct CTA per auth/membership
  state, with an expired message when expired.
- Reachable from the gate modal, the expired banner, and the More menu.

## Verification (operator)

```bash
npm --prefix apps/mobile run test
npm run mobile:e2e:test -- membership
```
