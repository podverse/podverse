# Mobile E2E — get every flow green (2026-08-04)

## Goal

Get every top-level `apps/mobile/e2e/*.yaml` flow passing on the E2E phones, plus the
`tablet` flow on tablet E2E devices, following this branch's deep-link / push /
navigation changes.

## Leave-running stack (named tabs)

- **Mobile Metro**: `npm run mobile:dev:e2e`
- **Mobile E2E API**: `npm run mobile:e2e:api` (`:4230`, must report `fixturesEnabled:true`)
- **Mobile E2E test-assets**: `npm run mobile:e2e:test-assets` (`:2111`, playback flows)

Both E2E phones were rebuilt + installed after the branch changes
(`npm run mobile:e2e:ios`, `npm run mobile:e2e:android`).

## Status

### Passing (19 / 22 phone flows)

hello-world, api-health, home, auth-login, auth-logout, search, search-unparsed,
podcast-episode, locale-switch-home-smoke, add-by-rss, queue-add, auto-queue-advance,
library-subscriptions, library-downloads, library-playlists, play-mini-player,
tab-switch-playback, video-transition, engine-audio-spike

### Remaining

- [x] `deep-link` — DONE (iOS 18s / Android 42s). See `completed/01-deep-link-push-routing.md`.
- [x] `push` — DONE (iOS 22s / Android 38s). Same fix as deep-link.
- [x] `opml` — DONE (iOS 32s / Android 1m16s). Was collateral from deep-link/push leaving a
      SpringBoard confirm alert; fixed by the Step 1 `confirm-ios-open-dialog.yaml` handling. This
      also resolves Step 2 (iOS connect flakiness) with no timeout/retry change.
- [x] `tablet` — DONE (iOS 33s / Android 1m7s). Fixed a real render crash (`below-icon` + left
      rail; now `beside-icon`) and gated `setOrientation` to Android (`when: platform: Android`)
      so the iPad dev client isn't rotated mid-flow. See `completed/03-tablet-flow.md`.

All flows green on every slot (22 phone flows + both tablet slots). Nothing outstanding.

### Final confirmation run (Step 4)

Full phone matrix `20260804-120055`: **iOS 22/22** (11m35s), **Android 22/22** (28m34s), zero
FAILED/ERROR. Tablet `20260804-124205`: **iOS 1/1** (35s), **Android 1/1** (55s). Plan set complete
and archived to `.llm/plans/completed/mobile-e2e-green/`.

## Failure theory (two distinct causes)

1. **deep-link + push (real signal on Android).** Both do
   `openLink: podverse-next://podcast/e2ePodChnl001` then wait `podcast-detail-screen`.
   Android connects and foregrounds but the link does not route to detail. This branch
   edited exactly this path: `apps/mobile/src/config/deepLinkSchemes.ts`,
   `apps/mobile/src/navigation/deepLinking.ts`, `apps/mobile/src/navigation/index.tsx`,
   `apps/mobile/src/push/notificationTarget.ts`. Pure path mapping
   (`mapIncomingPathToScopedPath('/podcast/x')` → `/home/podcast/x`) looks correct, so
   suspect **foreground URL delivery / pending-URL buffer processing**, not the mapping.

2. **iOS late-suite connect flake (environmental).** iOS failures on all 3 remaining
   flows are the shared `connect-dev-client.yaml` wait for `"Development servers"`. `opml`
   uses no `openLink` yet fails the same way on iOS → generic dev-client / Metro
   degradation after ~19 sequential `clearState` relaunches, not a code bug. The existing
   `launch-and-connect.yaml` `retry maxRetries: 2` was not enough here.

## Reports reference

- Hub / per-slot: `.artifacts/mobile-e2e-reports/latest/index.html`
- Failures JSON: `.artifacts/mobile-e2e-reports/latest/failures.json`
- iOS / Android: `.artifacts/mobile-e2e-reports/latest/{ios-phone,android-phone}/index.html`

Confirmed failing runs: `20260804-100037` (deep-link), `20260804-100914` (push),
`20260804-100459` (opml, iOS only), `20260804-101522` (deep-link retry).
