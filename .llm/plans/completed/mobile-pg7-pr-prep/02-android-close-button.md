# 02 — Android full-player Close confirm / fix

## Goal

Decide whether `full-player-close` is broken for **real Android users**, or only for Maestro.
Fix product code only if Close fails for a real tap; keep the E2E Android `pressKey: Back`
workaround either way (Maestro reliability).

## Context

During mobile E2E debug:

- Closing the full player via Maestro `tapOn: id: full-player-close` completed without dismissing
  the native-stack modal on Android.
- Hardware Back works because `FullPlayerScreen` registers `BackHandler` → `onClose` →
  `navigation.goBack()` (with `MainTabs` fallback).
- Close was moved **outside** the `ScrollView` into a fixed header so it stays tappable when
  panels (up-next / speed / sleep) expand.

E2E already platform-splits dismiss in `apps/mobile/e2e/play-mini-player.yaml` (iOS Close,
Android Back). That is acceptable for Maestro; it does **not** prove finger Close works.

## Do

1. **Assess (prefer evidence over guessing):**
   - Read `FullPlayerScreen` header / Close `Button` wiring and RootStack `FullPlayer` `onClose`.
   - If a device/emulator is available and the operator can smoke-test: expand full player → tap
     Close with finger/mouse. Document result in the agent response.
   - If no device: treat as **confirm-later** — add a short note to `apps/mobile/APPS-MOBILE.md`
     or `apps/mobile/e2e/HOW-TO-RUN.md` under play-mini-player troubleshooting: “Android Maestro
     dismisses full player via Back; manually verify Close once before release.”

2. **Fix only if Close is product-broken** (real tap does nothing), for example:
   - Ensure `onPress` reliably calls `onClose` (Pressable hit area / `hitSlop` / avoid overlays).
   - Keep dismiss logic: `canGoBack() ? goBack() : navigate(MainTabs)`.
   - Do **not** remove the Maestro Android Back path unless Close becomes reliable under Maestro
     too (prove with focused `play-mini-player` on Android).

3. Do **not** expand scope into video collapse animation or new panels.

## Done when

- Either: documented that Close works for real Android input, **or** a minimal code fix lands
  so Close dismisses the modal.
- E2E still dismisses on Android (Back and/or Close).
- COPY-PASTA step 2 marked done.

## Out of scope

- i18n (`01`)
- Full suite re-run during agent work
- Changing iOS Close behavior that already passes E2E

## Operator verify (this step)

Manual: on **Mobile Android** E2E or manual AVD, play → expand full player → tap Close.

```bash
# Mobile Maestro (optional focused re-check after a code fix)
npm run mobile:e2e:test -- play-mini-player
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Prerequisite leave-running tabs: **Mobile Metro** (`mobile:dev:e2e`), **Mobile E2E API**,
**Mobile E2E test-assets** — see `apps/mobile/e2e/HOW-TO-RUN.md`.
