# 05 — Checkout entry (web-link until native IAP)

**Cursor model:** Codex 5.3
**Master step:** Track 19 — **new page/flow** (detail 569-mobile-checkout-entry).
**Ship bar:** The Membership screen's Sign Up / Extend button takes the user to checkout. Until native
IAP (master plan 19.2), this opens the **web** sign-up/checkout in an in-app browser; the seam is
isolated so native IAP can replace it later without touching the Membership screen.

## Why / decision

Native store IAP (StoreKit/Play Billing) is a separate track needing store accounts (19.2–19.5) and is
gated by the **publish hold**. For this set, route purchases to the existing **web** flow — consistent
with the FOSS "link to web membership" position (575) and avoiding premature IAP-policy entanglements.

## Scope

1. **Add `expo-web-browser`** (Expo-managed) to `apps/mobile`; install via
   `npm --prefix apps/mobile exec -- expo install expo-web-browser` (do not hand-pin). If adding a dep
   is undesired, fall back to `Linking.openURL`.
2. **Checkout entry module** `apps/mobile/src/membership/checkoutEntry.ts`:
   - `openCheckout({ mode: 'sign_up' | 'extend' })` opens the web URL built from
     `getMobileConfig().webBaseUrl` + the web route (`/sign-up` for logged-out sign-up, `/checkout` for
     extend) using `WebBrowser.openBrowserAsync` (fallback `Linking.openURL`).
   - Keep the web path constants in one place so a later native-IAP swap is a single edit.
3. **Wire** the Membership screen (04) CTA to `openCheckout` with the right mode.
4. **Optional native Checkout placeholder:** if the operator prefers an in-app screen over a web hand-off,
   add a `Checkout` placeholder screen instead — **flag as an open decision**; default is web hand-off.
5. **i18n:** any new copy (e.g. "Opening secure checkout…") via the mobile catalog.

## Guards

- No in-app purchase / receipt logic here (that's 19.2–19.5). Do not add store-billing SDKs.
- Keep the web-vs-native seam isolated (single module) for the future IAP swap.
- Strict equality; no `as`; `import type`.

## Acceptance

- Sign Up (logged-out) opens web sign-up; Extend (logged-in) opens web checkout, in an in-app browser
  (or `Linking` fallback).
- The hand-off target is centralized for a later native-IAP replacement.

## Verification (operator)

```bash
npm --prefix apps/mobile run test
```
