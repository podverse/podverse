# COPY-PASTA — mobile-membership-and-v4v

Run one block at a time, in order (1 and 2 may run in parallel; 6 is independent and can go first).
**Agents: implement only — do not run tests.** The operator runs verification after each step.

## Prompts

- [x] **Step 1 — Shared membership-403 parser + contract docs (Track 19.4/19.11).** _(done 2026-08-05)_

**Cursor model:** Opus 4.8 — shared package + web refactor + OpenAPI + integration tests.

```text
Read and execute .llm/plans/active/mobile-membership-and-v4v/01-api-membership-response-contract.md
Do NOT change the API 403 shape (it already distinguishes expired vs feature-not-available vs limits via
i18nKey + renewPath). Promote a shared parseMembershipGateError() into @podverse/helpers-requests
(generalize web's readMembership403Payload), refactor apps/web modalForMembership403 to use it, document
the membership 403 schema in apps/api/openapi.yml, and add API integration tests locking the existing
expired + feature_not_available payloads. Do not run tests.
```

- [x] **Step 2 — Mobile membership state `useMembership` (Track 19.4, mobile side).** ✅ Done — pure `membershipStatus.ts` (`deriveMembershipState`) + `membershipDenial.ts` (`mapMembershipDenial`, shared parser) + thin `useMembership()` hook; unit tests registered in `vitest.config.ts`.

**Cursor model:** Codex 5.3 — pure derivation + hook + tests.

```text
Read and execute .llm/plans/active/mobile-membership-and-v4v/02-mobile-membership-state.md
Add pure membershipStatus.ts (deriveMembershipState) + membershipDenial.ts mapper (no RN/Expo imports)
and a thin useMembership() hook reading useAuth().account, using @podverse/helpers. Add unit tests and
register them in apps/mobile/vitest.config.ts. Do not run tests.
```

- [x] **Step 3 — Premium blocked-action modal + gate wiring (Track 19.4).** ✅ Done — `PremiumGateModal` + `MembershipGateProvider`/`useMembershipGate` (`openGate`/`runGated`/`handleGateError` via shared parser) + `MembershipExpiredBanner`; mounted in `App.tsx`; `navigateToMembershipScreen()` added. Wired subscribe, add-by-RSS parse, Podcast Index add (replaces inline message), playlist create/edit, add-to-playlist, queue add, notifications toggle. Added `membership.gate.*` consumer catalog keys. Stats toggle has no mobile UI yet (nothing to gate).

**Cursor model:** Codex 5.3 — RN modal + gate context + call-site wiring.

```text
Read and execute .llm/plans/active/mobile-membership-and-v4v/03-mobile-premium-gate-modal.md
Add PremiumGateModal (Cancel + context-aware Renew/Sign Up), MembershipGateProvider/useMembershipGate
(runGated intercepts membership 403s via the 01 contract + membershipDenial.ts), and a persistent
MembershipExpiredBanner. Wire known member-only actions (subscribe/follow, playlist create/edit,
add-by-RSS parse, stats/notifications toggles) to the gate; replace the inline Podcast Index message.
Localize all copy via the mobile i18n catalog; keep testIDs. Do not run tests.
```

- [x] **Step 4 — Membership screen (web parity) (Track 19, new page 568).** ✅ Done — real `MoreMembershipScreen` (replaces placeholder): auth/tier/expiry status copy, public pricing via `reqMembershipGetPricing()` (graceful hide on failure), Free·Premium tiers using the real `trial_limitations_*` differentiators (web `FEATURES` are placeholders), auth-based CTA (Sign Up logged-out / Extend logged-in). Added a pure `checkoutUrl.ts` (buildCheckoutUrl + unit test, RN-free) with `checkoutEntry.ts` `openCheckout` (`Linking` for now; Step 5 swaps to `expo-web-browser`). Kept route id `MoreMembership` + `testID="more-membership-screen"`.

**Cursor model:** Opus 4.8 — parity mapping + CTA logic.

```text
Read and execute .llm/plans/active/mobile-membership-and-v4v/04-mobile-membership-screen.md
Replace the MoreMembership placeholder with a real screen: tiers (Free vs Premium) from web parity +
pricing (graceful fallback), expired/trial messaging, and CTA logic via useMembership() (Sign Up
logged-out / Extend logged-in) routing to the checkout entry (05). Keep route id + testID. Localize via
the mobile catalog. Do not run tests.
```

- [x] **Step 5 — Checkout entry (web-link) (Track 19, new flow 569).** ✅ Done — added `expo-web-browser@~14.0.2` (via `expo install`, SDK 52-correct; standalone mobile lockfile). `checkoutEntry.openCheckout` now opens the in-app browser (`WebBrowser.openBrowserAsync`) with a `Linking.openURL` fallback; URL building stays in the pure `checkoutUrl.ts`. Membership screen CTA already wired in Step 4. **Native dep → dev-client rebuild required** before device E2E (`npm run mobile:e2e:ios` / `:android`).

**Cursor model:** Codex 5.3 — isolated web hand-off seam.

```text
Read and execute .llm/plans/active/mobile-membership-and-v4v/05-mobile-checkout-entry.md
Add expo-web-browser (expo install) and a single checkoutEntry.ts that opens web /sign-up (sign_up) or
/checkout (extend) from webBaseUrl; wire the Membership screen CTA to it. Keep the seam isolated for a
later native-IAP swap; no billing SDKs. Do not run tests.
```

- [x] **Step 6 — V4V placeholder screen (Track 19.6 placeholder slice).** ✅ Done — new `V4vInfoScreen` (`testID="v4v-info-screen"`, root route `V4vInfo`, deep link `v4v`, modal), full-player `full-player-v4v` button now navigates there via a new `onOpenV4v` prop (inline `full-player-v4v-notice` toggle + its state removed). Added `media_player.value_for_value_body` copy. **Button gated by `isV4vEnabled` (hidden by default) — operator confirmed:** default stays hidden (not flipped); enable per build/E2E with `EXPO_PUBLIC_MOBILE_V4V_ENABLED=1`. Real mobile V4V approach is operator-TBD (web's browser-extension flow doesn't map to mobile); this slice is placeholder + env gating + E2E only (doc 359 updated). Type-check clean for these changes (the two tsc errors are pre-existing Steps 1–3 helpers-requests resolution, cleared by `npm run build:packages`).

**Cursor model:** Auto — one small screen + button rewire.

```text
Read and execute .llm/plans/active/mobile-membership-and-v4v/06-mobile-v4v-placeholder.md
Add a V4vInfoScreen placeholder, register a V4vInfo route, and rewire the full-player V4V button to
navigate there (remove the inline coming-soon notice; keep the button visible + testID). Localize copy.
Do not run tests.
```

- [x] **Step 7 — E2E: gate + renew nav + V4V (Track 19.8 / 567).** ✅ Done — added two Maestro flows. **`membership-gate.yaml`** (API-backed, no test-assets): logged-out Membership screen shows the **Sign Up** CTA, then the seeded **Trial** `e2e-user` taps Podcast Index directory **Add** (`unparsedfixture` → `pi-feed-add-button`) → **real** `membership.feature_not_available_for_account_type` **403** → `premium-gate-modal` → `premium-gate-renew` → `more-membership-screen` (**Extend My Membership** CTA). No seed change needed — the directory-add capability gate (`allowDirectoryAddByRSS=false` for Trial) is **not** bypassed by `PODVERSE_E2E_FIXTURES`. **`v4v.yaml`** (API + test-assets): plays a seeded episode → full player → taps `full-player-v4v` → asserts `v4v-info-screen`. Registered `membership-gate` (api) + `v4v` (api + test-assets) in `scripts/mobile/e2e-test.sh`; `dev-e2e.sh` now exports `EXPO_PUBLIC_MOBILE_V4V_ENABLED=1` so the (default-hidden) V4V button renders for E2E; documented both in `HOW-TO-RUN.md`. Per **mobile-maestro-timeouts** the decisive asserts use `TIMEOUT_SLOW` (network 403 / playback) and `TIMEOUT_FAST` (local nav). **Do not run tests** — operator verifies via the Mobile Maestro block below.

**Cursor model:** Codex 5.3 — Maestro flows + runner wiring.

```text
Read and execute .llm/plans/active/mobile-membership-and-v4v/07-e2e-membership-and-v4v.md
Add Maestro flows for the premium gate modal → renew → Membership screen (expired/non-member seed) and
the V4V button → placeholder; register in scripts/mobile/e2e-test.sh + HOW-TO-RUN.md. Follow
mobile-maestro-timeouts + mobile-e2e-screenshots. Do not run tests.
```

- [x] **Step 8 — Web membership-gating parity (Track 19.4, web side).** ✅ Done — added a centralized `apps/web/src/hooks/useMembershipGate.ts` (`tryHandleMembershipGateError(error, { featureContext })`) that uses the shared `parseMembershipGateError` (Step 1) + `getMembership403ModalProps` and opens the existing `modalLoginRequired` slot; added a `'generic'` `Membership403FeatureContext`. Refactored the 2 existing call sites (`PodcastIndexFeedInfo`, `ListChannelSettings.checkFeedForUpdates`) to the hook and wired the full member-only action set so a logged-in expired user gets the membership modal (Renew → `renewPath`) instead of a generic error/toast/console: `ListChannelSettings.toggleNotificationType`, `SubscribeButton` (channel/playlist/account toggles), `NotificationIconButton`, `SettingsNotifications` (`toggleDefaultType`, `enableUP`), `ModalPlaylistAddTo` (now `showToast` success/error so the gate replaces the error toast — no double-show), playlist create/edit/delete forms, `ListQueueResources` (drag reorder), `AddByRSSAddFeedPageClient`, clip create (`ModalClip`) + edit (`ClipEditPageForm`) + delete (`ClipForm`). Logged-out paths keep their existing login modal (gate only fires on logged-in 403s). Added `apps/web/e2e/membership-gating.spec.ts` (mocked expired 403 on playlist create → membership modal → Renew → `/membership/renew`), following the existing trial-blocked spec's `page.route` mock pattern (no expired seed needed). The 2 existing membership specs are unchanged. **Do not run tests** — operator verifies via the Web block below.

**Cursor model:** Opus 4.8 — cross-cutting web wiring + Playwright E2E.

```text
Read and execute .llm/plans/active/mobile-membership-and-v4v/08-web-membership-gating-parity.md
Centralize web membership-403 handling (shared parseMembershipGateError from Step 1 + getMembership403ModalProps
via the Modals context) and wire it to the full member-only action set (subscribe/follow, notifications,
playlist create/edit + add-to, queue mutations, add-by-RSS add, clip create) so a logged-in expired user
sees the membership modal (Renew) instead of a generic error. Keep the login modal for logged-out users;
web app only (not management-web). Add/extend a Playwright membership-gating spec. Do not run tests.
```

## Leave-running (named tabs — for Steps 4–7 device verification)

**Mobile Metro**

```bash
npm run mobile:dev
```

**Mobile E2E API** (API-backed flows in Step 7)

```bash
npm run mobile:e2e:api
```

**Mobile iOS** / **Mobile Android** (install once; rebuild after native dep add in Step 5)

```bash
npm run mobile:e2e:ios
npm run mobile:e2e:android
```

## Final cumulative verification (after the last step)

**Root** — API contract + packages:

```bash
npm run build:packages
npm run test:e2e:api
```

**Mobile** — unit tests:

```bash
npm --prefix apps/mobile run test
```

**Web** — membership-gating parity E2E (Step 8):

```bash
make e2e_test_web_report_spec SPEC=e2e/membership-gating.spec.ts
open .artifacts/e2e-reports/latest/index.html
```

**Mobile Maestro** — focused reports:

```bash
npm run mobile:e2e:test -- membership-gate
npm run mobile:e2e:test -- v4v
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
