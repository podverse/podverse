# mobile-membership-and-v4v — summary

**Parallel group:** Track 19 (monetization / entitlement) mobile UX. **Created:** 2026-08-05.
**Phase state:** planned (detailed; execute one COPY-PASTA prompt at a time).

## Goal

Give the mobile app a reliable **membership-gated UX** and a **V4V placeholder**, matching the web
entitlement model, so member-only actions are discoverable but clearly gated, and expired members get
an accurate, non-alarming explanation driven by the **API response** (not guesswork).

## What the operator asked for

1. **V4V:** the full-player V4V button just opens a **placeholder screen** (full LNURL flow stays
   deferred — master plan 19.6 / detail 565).
2. **Membership gating (reliable):**
   - Member-only actions stay **visible** but trigger a **premium modal/alert** with **two** actions:
     **Cancel** (dismiss) and a **renew/sign-up** action whose label is **auth-based (binary)**:
     logged-out → **"Sign Up"**; logged-in → **"Renew"** (every account gets a free trial at sign-up,
     so a logged-in user always has a membership to renew — there is no "Upgrade" variant). Gated
     mutations require auth, so logged-out users hit the existing login prompt; the modal is in practice
     shown to logged-in users → "Renew".
   - Renew/Sign Up → a real **Membership screen** explaining tiers (web parity) with a prominent
     **Sign Up** (logged-out) or **Extend Membership** (logged-in) button → **checkout**.
   - When a logged-in user's membership is **expired**, the FE must **read the API response** and render
     an appropriate "expired — renew to use this" message. (The API **already** sends adequate,
     distinguishing 403s via `i18nKey` + `renewPath`; the FE just needs to consume them.)
3. **Web/mobile parity:** the same gating UX on web and mobile (management-web excluded — admin-only).

## Current state (survey findings)

- **API gate:** `apps/api/src/lib/auth/index.ts#verifyTokenAndMembership` → `403 { message, code,
  i18nKey: 'membership.membership_expired', renewPath: '/membership/renew' }`; capability denials use
  `feature_not_available_for_account_type`; limits use `add_by_rss_feed_limit_reached` /
  `manual_refresh_hourly_limit_reached`. **Does not** distinguish expired vs never-subscribed.
- **Status source:** `GET /auth/me` → `DTOAccount.account_membership_status` (`membership_expires_at`,
  tier override columns, nested `account_membership.tier`). Entitlements are server-only on `req.user`.
- **Helpers:** `hasValidMembership`, `isMembershipExpiredAt`, `AccountMembershipEnum` in
  `@podverse/helpers`.
- **Mobile:** `AuthProvider`/`useAuth` (`status`, `account`); `account_membership_status` arrives but is
  **unused**. `MoreMembership` is a **placeholder**; **no Checkout screen**; **no shared modal**;
  only one inline 403 message (`features.search.add_needs_membership`). External URLs via `Share`/deep
  links only (no in-app browser).
- **Web parity:** `/membership` (Free vs Premium + pricing from `GET /membership/pricing`), CTA logic
  in `MembershipCTA.tsx`, stub `/checkout`, `MembershipExpiredBanner`, `modalForMembership403`.

## Gaps this set closes (missing pages/behavior added to proposals)

| Gap | Where |
| --- | --- |
| No shared 403 parser + contract is undocumented (clients can drift) | 01 (shared `parseMembershipGateError` + OpenAPI; **no API behavior change**) |
| Mobile never reads membership status | 02 (`useMembership()`) |
| No premium blocked-action modal / gate on mobile | 03 |
| Membership screen is a placeholder | 04 (real screen, web parity) |
| No checkout entry on mobile | 05 (web-link checkout until native IAP) |
| V4V button shows inline notice, not a screen | 06 (placeholder screen) |
| No E2E for gating / renew / V4V (mobile) | 07 |
| **Web** membership modal wired to only 2 of many member-only actions (no web/mobile parity) | 08 (broaden web modal + E2E) |

## Web/mobile parity

The API **already** sends distinguishing 403s (`i18nKey`: `membership.membership_expired` vs
`feature_not_available_for_account_type` vs limit codes, plus `renewPath`). Web keys off `i18nKey`
today, so **no API response-shape change is needed** — parity means: mobile consumes the same contract
(02/03), both clients share one parser (01), and **web broadens** the modal to the same member-only
action set mobile gates (08). Management-web is intentionally excluded (admin-only UX).

## Key decisions (baked in; override in a prompt if desired)

- **Checkout:** until native IAP (master plan 19.2), the mobile "Sign Up / Extend" opens the **web**
  membership/checkout in an in-app browser (`expo-web-browser`). No in-app purchase in this set
  (respects the publish hold + FOSS "link to web membership" 575). Native IAP is a later track.
- **No API behavior change:** the existing 403 contract (`code`/`i18nKey`/`message`/`renewPath`) is
  already adequate; 01 only promotes a **shared parser** and documents/regression-tests the contract.
  Both clients key message copy off `i18nKey` (parity); the renew/sign-up button label is auth-based.
- **Gate is reactive + proactive:** intercept membership 403s app-wide → show the modal; also expose
  `useMembership()` so screens can pre-disable/annotate known member-only actions.

## Publish hold

This is feature work and may proceed on branches. It does **not** lift the master-plan **publish
hold** (no alpha/internal test-track publish until operator manual polish is done).

## Master plan mapping

Track 19: **19.4/19.11** (563 gating UI + shared 403 contract) ← 01+02+03 (mobile) and 08 (web parity);
**19.6** (565 V4V) ← 06 is the placeholder-only slice (full LNURL still `_TBD_`); **19.8** (567 E2E
gate) ← 07; **new pages** Membership screen (568) + Checkout entry (569) added to Track 19.
