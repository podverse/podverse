# abctestall deferred

## Add by RSS remote items stay on the add page

- Command: `make e2e_test_web`, then
  `make e2e_test_web_report_spec SPEC=e2e/add-by-rss-remote-items.spec.ts`
- Assertion: after Add Feed, URL matches `/add-by-rss/podcast/[^/]+$/`. Both tests stayed on
  `http://localhost:4032/add-by-rss/add`. The page said Failed and
  `Rate limited: 1 minute until you can use this action again.`
- What I tried: Ran the spec alone after a fresh seed. Same 429. `e2e/add-by-rss-remote-feed.spec.ts`
  passed when it was the first Add Feed in a batch. Did not raise the limiter.
- Competing explanations: Valkey still holds a parse or resolve counter from the full suite, and
  the e2e profile does not raise that limiter (`ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE`
  stays 30). Or Add Feed for these fixtures 429s even on a cold counter.
- Operator decision: Flush the test Valkey rate-limit keys, rerun this spec alone, and if it still
  429s, name the route and raise that cap on the `apiWebE2e` profile the way login and parse
  enqueue already are.

## Modal video and floating portal

- Command: `make e2e_test_web_report_spec SPEC=e2e/media-player-modal-video.spec.ts,e2e/media-player-seek-after-video.spec.ts,e2e/media-player-podcast-to-livestream-transition.spec.ts`
- Assertion: Report `20261031-155447`. Modal video (6 tests) and
  `e2e/media-player-podcast-to-livestream-transition.spec.ts` passed.
  `e2e/media-player-seek-after-video.spec.ts` got past the floating portal and had
  `E2E Music Track One` in the player. After the progress click, `audio.currentTime` was
  `4.02` (expected `> 55`, the middle of the 2:00 track). The player showed `0:03` and Pause,
  so the click did not move the progress UI either.
- What I tried: These three specs do not share a "nothing mounts" failure. Modal video and the
  transition mount a media element. Chromium attaches HLS through hls.js. A play that starts
  while another session is still active is loaded on this tab once that session is gone, and
  queue hydration waits while that play is pending. That got the seek spec as far as the music
  track. The progress click still leaves the playhead near the start. Timeouts were not raised.
- Competing explanations: The click does not reach the audio element's seek. Or a later play
  starts the track again from the beginning, so the poll only sees a few seconds.
- Operator decision: The remaining failure is the seek spec's progress click. The other two
  specs in this entry pass.

## Web session ended notice

- Command: `make e2e_test_web`
- Assertion: `e2e/web-session-ended-notice.spec.ts` — the refused-request test hit the 10s
  budget with no assertion line. The other-device test stayed on `http://localhost:4032/settings`
  instead of `/settings?tab=account`.
- What I tried: Read both failures. No edit. Did not raise the timeout.
- Competing explanations: The stream event never arrives, so the page never signs out. The
  settings page drops `tab=account` on that navigation.
- Operator decision: Rerun this spec alone. If the URL is still `/settings` without the tab,
  the sign-out redirect is the bug.

## iOS Maestro blocked on unmanaged API :4230

- Command: `npm run mobile:e2e:test -- --platform ios play-mini-player` (same preflight for
  every API-backed area). Earlier `api-health` / `alternate-enclosure` hits were this same
  refusal, from the other checkout.
- Assertion: runner exit 1 before Maestro: `cannot reseed while an unmanaged mobile E2E API is
  listening on :4230`. The flow did not start, so there is no Maestro assertion.
- What I tried: From `/Users/mitcheldowney/repos/pv/podverse`, `make mobile_e2e_deps` succeeded
  and `hello-world` passed. `:4230` health is `fixturesEnabled: true` and `/health/ready` is
  ok, but the listener is `podverse_combined` (cwd `apps/api`, pid 10259, that checkout's
  `.artifacts/mobile-e2e-api/api.pid`). This checkout has no `api.pid`. Did not stop that
  process. `:8081` is `npm run mobile:dev:e2e` from `podverse_combined`. `:2111` test-assets
  is the same checkout and the fixture range request returned 206. The deps step recreated
  `podverse_app_test` empty; seed did not run.
- Competing explanations: none for the reseed refusal. The listener is a healthy E2E API from
  the other checkout, which this checkout's runner cannot stop and restart around the seed.
- Operator decision: In `podverse_combined`, run `npm run mobile:e2e:api:stop`. In `podverse`,
  **Mobile E2E API**: `npm run mobile:e2e:api:bg`, then `npm run mobile:e2e:api:health`
  (`fixturesEnabled: true`). Leave `:8081` and `:2111` unless this tree's bundle or media
  fixtures are required.

## iOS handoff prompt never appears

- Command: `npm run mobile:e2e:test -- --platform ios playback-multi-device-handoff`
- Assertion: `id: playback-handoff-dialog is visible` within `TIMEOUT_SLOWEST` after relaunch.
  Home is up. The mini player still shows paused `E2E Podcast Resume P > 0`. No dialog.
- What I tried: The seed script completed (`e2ePodResume02`, play, position 57) before
  `launchApp`. Did not raise the wait. No product edit for this assertion.
- Competing explanations: Relaunch writes the local pause of episode A back to the server
  before reconcile, so there is no different-item conflict. Or reconcile runs and the leave
  grace or timestamp rule keeps the prompt closed for the whole wait.
- Operator decision: After the seed and before relaunch, confirm the server now-playing is
  `e2ePodResume02`. After relaunch, confirm whether that row is still B when the wait ends. If
  A overwrote B, stop the local pause from posting until reconcile finishes. If B is still
  now-playing, the prompt decision is what stayed closed.

## iOS signed-out notice text is not matched

- Command: `npm run mobile:e2e:test -- --platform ios auth-sessions`
- Assertion: `text: "(?s)You were signed out from another device\\..*"` on `forced-logout-modal`.
  The dialog is on Settings. The pixels say "You were signed out from another device." then the
  signed-out explanation. Maestro reports the pattern is not visible. Report `20261030-185306`
  reached the dialog; the text check failed on the next run.
- What I tried: Scrolling Signed-In Devices to the center so the tap does not open the mini
  player. The notice appears as soon as the script ends this device, so the flow no longer taps
  the row while that dialog is up. The original `\\..*` pattern and a `(?s)` dotall pattern both
  failed. Did not raise the wait. Those flow edits stay in `auth-sessions.yaml`.
- Competing explanations: The dialog body is one string, and iOS exposes it with line breaks that
  Maestro's matcher still does not treat as a match. Or the alert role hides the body text from
  the hierarchy even though the screenshot shows it.
- Operator decision: In the failure hierarchy, read the accessibility label of the dialog body. If
  the sentence is there, match that exact label. If it is missing, give the body its own test id
  and assert that.

## iOS tablet binary did not build

- Command: `npm run mobile:e2e:ios:tablet`, then
  `npm run mobile:e2e:test -- --platform ios tablet`
- Assertion: the tablet flow never started. `xcodebuild` exited 65 while installing on
  `iPad Pro 13-inch (M4) E2E`. Expo reported `[CP] Copy XCFrameworks` failed for
  `Pods/ExpoModulesJSI`, with a `swift-frontend` crash in the same log.
- What I tried: One install. Did not run the Maestro flow. Did not switch the build to Android.
- Competing explanations: The shared iOS build crashed while compiling for the iPad destination.
  Or the XCFramework copy script failed because that destination's products were incomplete.
- Operator decision: Rebuild the E2E app for `iPad Pro 13-inch (M4) E2E` after the
  `swift-frontend` crash is gone, then run `npm run mobile:e2e:test -- --platform ios tablet`.
