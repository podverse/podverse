# 01 — Fix deep-link + push routing (Android foreground)

## Symptom

- `deep-link` and `push` both run:

      - runFlow: shared/launch-and-connect.yaml
      - openLink: podverse-next://podcast/e2ePodChnl001
      - extendedWaitUntil: { visible: { id: podcast-detail-screen }, timeout: ${TIMEOUT_SLOWEST} }

- **Android**: `Assertion is false: id: podcast-detail-screen is visible` — app is
  connected + foregrounded, but the link does not navigate to podcast detail.
- **iOS**: masked by the connect-step flake (handled in plan 02).

Failing runs: `20260804-100037`, `20260804-100914`, `20260804-101522`.

## Files this branch changed on the deep-link / push path

- `apps/mobile/src/config/deepLinkSchemes.ts` (schemes / prefixes; pure)
- `apps/mobile/src/navigation/deepLinking.ts` (`mapIncomingPathToScopedPath` etc.; pure)
- `apps/mobile/src/navigation/index.tsx` (linking config, pending-URL buffer, subscription)
- `apps/mobile/src/push/notificationTarget.ts` (notification target → path)
- `apps/mobile/src/config/env.ts`, `apps/mobile/src/config/index.ts` (env → schemes)

`mapIncomingPathToScopedPath('/podcast/e2ePodChnl001')` → `/home/podcast/e2ePodChnl001`
looks correct in isolation, so focus on **delivery + handling while the app is already
running**, not the string mapping.

## Investigate

1. Reproduce in isolation on Android and stream logs (Mobile Android + adb):

       npm run mobile:e2e:test -- deep-link
       adb logcat | grep -iE "podverse-next|deepLink|Linking|pending|getStateFromPath|podcast"

2. In `apps/mobile/src/navigation/index.tsx`, verify the RN `Linking` subscription and the
   **pending-URL buffer** actually fire for a foreground `openLink` (warm app), not only on
   cold start. Confirm `prefixes` from `buildMobileLinkPrefixes` include `podverse-next://`
   for the E2E build (env `EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES` unset → defaults apply).
3. Confirm `getStateFromPath` maps `/home/podcast/<id>` to the Home-stack PodcastDetail
   route whose screen renders `testID=podcast-detail-screen`.
4. Confirm the notification-open path in `push/notificationTarget.ts` feeds the SAME buffer
   the deep link uses (per push.yaml comment) so one fix covers both.

## Likely fixes (pick per root cause)

- If the foreground `Linking` `url` event isn't subscribed (only initialURL handled): add a
  foreground `Linking.addEventListener('url', ...)` that routes through the same buffer.
- If the buffer is only drained once at mount: drain again when a URL arrives while mounted.
- If Android intent filter for `podverse-next` scheme is missing in `app.config.ts` native
  registration: ensure scheme registration is derived from `deepLinkSchemes.ts` for Android.

## Done when

- `npm run mobile:e2e:test -- deep-link` passes on Android (and iOS after plan 02).
- `npm run mobile:e2e:test -- push` passes on Android (and iOS after plan 02).
- Add/adjust unit coverage in `apps/mobile` for the deep-link mapping / buffer if logic
  changed (Vitest, per `resolveColumns.test.ts` precedent). Do not run tests during impl.

## RESOLUTION (2026-08-04) — COMPLETE, iOS + Android green

Two real app-code root causes plus one iOS harness issue (not the pending-buffer subscription
theory above — the buffer wiring was already correct):

1. **Linking config missing `home/` prefix.** `getStateFromPath('/home/podcast/:id')` returned
   **undefined** (verified empirically with `@react-navigation/core`), so `getStateFromPath` fell
   back to `/home`. `mapIncomingPathToScopedPath` (produces `/home/...`), `mapScopedPathToFlatPath`
   (expects `home/...`), `NAV_SCOPED_PREFIXES` (includes `/home`), and the unit tests all assumed
   Home content routes are `home/`-scoped, but the config registered them as bare
   `podcast/:podcastId`. Fix: `apps/mobile/src/navigation/index.tsx` — Home content screens are now
   `home/podcast/:podcastId`, `home/episode/:episodeId`, etc. (HomeRoot stays `home`).

2. **Custom-scheme URL host dropped.** `new URL('podverse-next://podcast/<id>')` parses `podcast`
   as the host and `/<id>` as the pathname, so `tryParseUrlPath` returned `/<id>` and the resource
   type was lost → every buffered deep link collapsed to Home. Fix: `deepLinking.ts` `tryParseUrlPath`
   keeps the host as the leading path segment for non-http(s) schemes (web links still drop the
   domain). New unit cases in `deepLinking.test.ts` cover `podverse-next://` / `podverse://`.

3. **iOS dev-client "Open in "Podverse Next"?" confirm.** Maestro `openLink` of the app's own
   scheme on iOS pops a native confirm dialog (Android delivers the intent silently). Unconfirmed,
   it blocks routing AND leaves a SpringBoard alert that breaks the next flow's connect step (this
   also explains the original `opml` iOS "Development servers" failure — collateral from a prior
   deep-link/push run). Fix: new `apps/mobile/e2e/shared/confirm-ios-open-dialog.yaml`, wired into
   `deep-link.yaml` and `push.yaml` after `openLink` (optional/guarded → no-op on Android).

Verified: `deep-link` iOS 18s / Android 42s; `push` iOS 22s / Android 38s. Unit: 22 passed.
