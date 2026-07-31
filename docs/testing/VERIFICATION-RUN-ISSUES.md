# Verification Run Issues

Issues found during the full-repo verification pass (Run 1). Deterministic,
branch-related fixes were applied directly; items requiring an operator decision
or an operator-only command are logged here.

---

## ISSUE 1 (RESOLVED by operator `npm install`): host node_modules missing darwin native binaries

- **Root cause:** The host `node_modules` is missing the macOS arm64 optional native
  binaries that the (Linux-canonical) lockfile lists for every platform. This single
  gap breaks BOTH the Next.js build and the Vitest test tiers. The lockfile is NOT
  wrong — the host `node_modules` is the stale artifact. See
  [native-deps-platform-mismatch](/.cursor/skills/native-deps-platform-mismatch/SKILL.md)
  and [LOCKFILE-LINUX.md](/docs/development/tooling/LOCKFILE-LINUX.md).
- **Observed errors:**
  - `npm run build` (`apps/web`, `apps/management-web` `next build`):
    ```
    Error: No prebuild or local build of @parcel/watcher found.
    Tried @parcel/watcher-darwin-arm64. Please ensure it is installed.
    ```
  - `npm run test:unit` (every workspace `test`, Vitest 4 / rolldown):
    ```
    Error: Cannot find native binding ... Cannot find module '@rolldown/binding-darwin-arm64'
    ```
    No test assertions ran — all workspaces failed at Vitest startup.
- **Why not auto-fixed:** The skill explicitly forbids the agent from running
  `npm install` / `npm ci` / `npm rebuild` autonomously (can subtly mutate the
  lockfile across platforms). This is an operator-only command.
- **Operator fix (run from repo root):**
  ```bash
  npm install
  ```
  This materializes the platform-specific optional deps already listed in the
  lockfile without modifying `package-lock.json`.
- **Impact / blocked steps (all resolved by the one `npm install`):**
  - `npm run build`: `build:packages`, `api`, `workers`, `management-api`, and
    sidecars built successfully; only the two Next.js apps failed. `build:tools`
    did not run (short-circuited after `build:apps`).
  - `npm run test:unit`: fully blocked (rolldown binding).
  - `npm run test:e2e:api`: also Vitest-based — will hit the same rolldown error;
    not run to avoid a guaranteed failure.
  - Web / management-web E2E: run `next build` internally — blocked by the
    `@parcel/watcher` gap.
- **Passed before the blocker (not affected):** `npm run lint` (incl. type-check +
  prettier + i18n:compile), `npm run openapi:check`, `npm run i18n:validate`.
- **Resume after `npm install`:** `npm run build` → `npm run test:unit` →
  `npm run test:e2e:api` → web E2E (OPML spec, then aggregated report).
- **Status:** Operator ran `npm install`; darwin arm64 binaries present. `npm run build`
  and `npm run test:unit` both green after resume (see ISSUE 2).

---

## ISSUE 2 (FIXED): stale unit/API tests after OPML branch changes

Deterministic, branch-related failures fixed directly during Run 1:

- **`apps/workers` unit** — `longRunningCommands.test.ts` asserted `size === 5`, but the
  OPML branch added `mqOpmlImportRun` (now 6). Updated the assertion + added the
  `mqOpmlImportRun` check.
- **`apps/api` integration — OPML enqueue 429 bleed (6 tests).** The burn-in test
  intentionally exhausts the OPML enqueue limiter, but that limiter uses
  express-rate-limit's **in-memory** store (persists for the process), and `beforeEach`
  only cleared the Valkey per-feed counter. Every later `POST /account/opml/import`
  bled a 429. Fix: `rateLimitAuthEndpoint` now exposes `resetForUser(userId)`;
  `accountOpmlImport` exports the limiter; the test's `beforeEach` resets it per case.
- **`apps/api` integration — add-by-RSS burn test dedupe-429 (flaky on re-run).** The
  add-by-RSS parse dedupe cache (short TTL) survived back-to-back test invocations, so
  the burn test hit a duplicate-429 instead of the rate-limit 429. Fix: burn URLs now
  include a per-run nonce so they never collide with a prior run's dedupe entries.
- **`apps/api` — `e2eUnparsedSearchFixture.test.ts` import path (unrelated).** Imported
  the sibling fixture via `../` (parent dir) instead of `./`; module not found. Fixed
  to `./e2eUnparsedSearchFixture.js`.

---

## ISSUE 3 (DECISION MADE + FOLLOW-UP LOGGED): OPML parse http vs https

- **Original conflict:** `opml-parse.test.ts` asserted `parseOpml` upgrades `http`→`https`
  and dedupes cross-scheme, but the shared `canonicalHttpOrHttpsUrl` deliberately
  preserves scheme.
- **Decision (owner):** `parseOpml` is a pure parser and the feed URL is an identifier —
  it must **preserve the scheme** (`http` stays `http`); `http` and `https` of the same
  path are distinct feeds. The 2 tests were rewritten to match, and a design note was
  added to `parseOpml`.
- **FOLLOW-UP FEATURE (not implemented this run):** Prefer `https` when it is actually
  reachable, with a **silent fallback to `http`** (no visible app error) when the https
  probe fails and http succeeds. This is an **async fetch/lookup-time** concern, not a
  parse-time one. Must also coordinate with the Podcast Index lookup, which may need to
  try **both** `https` and `http`.   Suggested home: the feed fetch/resolve path (and a
  note in [docs/features/OPML.md](/docs/features/OPML.md)). Needs its own design + tests;
  do not fold into `parseOpml`.

---

## ISSUE 4 (FIXED): web E2E seed Valkey race + apps/api import order

Found while running the targeted OPML web E2E report
(`make e2e_test_web_report_spec SPEC=apps/web/e2e/settings-opml-export.spec.ts`):

- **Seed crash — `tools/web/seed-e2e.mjs` `clearOpmlImportKeyvalState`.** The ioredis client
  was created with `enableOfflineQueue: false` and issued a `SCAN` before the socket was
  connected → `Stream isn't writeable`. Fix: `lazyConnect: true` + an awaited
  `redis.connect()` before commands (keeps fail-fast semantics).
- **`apps/api` lint (blocked webServer build).** The new `randomUUID` import in
  `opml-import.test.ts` needed `simple-import-sort` ordering; the web E2E webServer runs
  `apps/api` `lint && tsc` and `--max-warnings 0` failed. Fixed via eslint autofix.

## ISSUE 5 (RESOLVED, env setup): Playwright browser not installed

- `browserType.launch: Executable doesn't exist ... chrome-headless-shell`. One-time
  environment setup, not a code defect. Fixed by running
  `npm exec -w apps/web -- playwright install chromium`.

---

## Run 1 result

All Run 1 tiers green after the fixes above: `lint` / type-check / `openapi:check` /
`i18n:validate`, `npm run build`, `npm run test:unit`, `npm run test:e2e:api`
(api 409, management-api 238), and the OPML web E2E spec (3/3). Remaining follow-up:
ISSUE 3's https-availability-probe feature (tracked, not implemented).

---

## ISSUE 6 (FIXED): iOS 26 black screen blocked mobile E2E (Run 2 gate)

Found while starting Run 2 (mobile Maestro): the iOS E2E simulator (**iPhone 17 Pro E2E,
iOS 26.5**) launched to a **black screen** (Android was fine). Root cause is an iOS 26
platform change, not our JS:

- **iOS 26 makes the UIScene lifecycle mandatory.** Because `AppDelegate` implements
  `application:configurationForConnectingSceneSession:options:` (for CarPlay), iOS 26 also
  routes the **phone** window through a `UIWindowScene`. Expo SDK 52 / `RCTAppDelegate`
  still creates `self.window` in `didFinishLaunchingWithOptions` before any scene exists, so
  the window is never attached → `RCTKeyWindow()` nil → black screen. (Earlier this branch
  produced a `SIGABRT` from a `[super …]` scene-config dispatch; that was the same root cause
  one layer up.)
- **Fix (native, no manifest):** added a phone `PodversePhoneSceneDelegate` whose
  `scene:willConnectToSession:options:` re-attaches the existing `AppDelegate.window` to the
  `UIWindowScene` (`window.windowScene = …; makeKeyAndVisible`) and forwards `openURLContexts`
  for deep links. The phone scene-config branch now returns a Default Configuration with
  `delegateClass = PodversePhoneSceneDelegate`. CarPlay branch is unchanged and independent
  (app-closed CarPlay still works). Applied to `apps/mobile/ios/PodverseNext/AppDelegate.mm`
  (rebuild picks it up now) and mirrored in `apps/mobile/plugins/withPodverseCarPlay.js` so
  `mobile:prebuild` stays correct. Regression guard: CARPLAY-SIMULATOR-CHECKLIST §0.
- **Operator action:** this is a **native** change — rebuild the iOS app
  (`npm run mobile:e2e:ios`), not just a Metro reload. Confirm the phone reaches the JS UI and
  **Mobile Metro** logs an `iOS Bundled … index.js` line before starting the suite.
- **Refs:** RN `SceneDelegate` migration (facebook/react-native#53744, #53602), Expo prebuild
  UIScene-required (expo/expo#46664), Apple TN3187.

---

## ISSUE 7 (FIXED): mobile E2E flows failed in the shared dev-client connect step

Found on the first full Run 2 suite: **every** flow was at risk because the shared
`apps/mobile/e2e/shared/connect-dev-client.yaml` **hard-waited** for the Expo dev-client
first-launch onboarding card (`"Continue"`). On the current dev-client / iOS 26 build the app
connects straight through to the JS bundle and that card never appears, so the shared step failed
before any flow's own assertions (the `❌` screenshot showed Home already loaded).

- **Fix (flow):** reach `home-screen` directly first via an **optional** `extendedWaitUntil`
  (`TIMEOUT_SLOW`); only dismiss the onboarding card when it actually appears (guarded
  `runFlow when: visible "Continue"` → tap Continue → close the dev-menu sheet via the scrim), then
  require `home-screen` at `TIMEOUT_SLOWEST`. Handles both paths (card present / absent) without the
  async-bundle race and without wasting the slowest timeout when the card is absent. Validated by
  `hello-world` (iOS + Android pass).

---

## ISSUE 8 (FIXED): two mobile flows asserted wrong post-navigation state

Both were **flow-logic** mismatches (no app bug); confirmed against the app source:

- **`auth-logout.yaml`.** Asserted `home-screen` after logout, but `App.tsx` `onRequestLogout`
  only calls `logout()` + `setAuthMode('anonymous')` — it does **not** route to Home. The mounted
  tab navigator stays on the **More** tab, which re-renders as the anonymous shell (Login / Sign
  Up). Fixed the flow to assert the anonymous More shell (`more-screen` + `anonymous-login-cta`) in
  place. (Reproduced on both iOS and Android.)
- **`tab-switch-playback.yaml`.** After drilling Search → Podcast → Episode to start playback, the
  Search tab retains its own stack. Which screen it shows on return is **platform-dependent** (iOS
  keeps the Episode detail; Android reset to SearchRoot — Android passed, iOS failed on
  `search-screen`). The invariant under test is *mini-player persistence across tab switches*, so the
  flow now asserts only `mini-player` after re-selecting Search (no screen-id assert).

---

## ISSUE 9 (FIXED): OPML import E2E not hermetic across iOS + Android (shared account)

iOS + Android E2E share **one** Mobile E2E API account (`:4230`). The embedded sample OPML
(`apps/mobile/src/lib/opml/e2eSampleOpml.ts`) used a **fixed** unknown feed URL
(`e2e-unknown.xml`). The `added_by_rss` branch immediately subscribes the account
(`AccountFollowingAddByRSSChannelService.addOrUpdateRSSChannel`), so whichever platform imported
**second** got `already_subscribed` and the flow's `opml-import-result-added_by_rss` assertion
failed (seen on Android; iOS ran first and passed). The directory feed only records a *pending*
follow, so it correctly stayed `enqueued_indexed` on re-import.

- **Fix (E2E fixture determinism):** `e2eSampleOpml` is now a builder
  (`buildE2eSampleOpml()`) that gives the unknown feed a **unique URL per import**
  (`e2e-unknown-<ts>-<rand>.xml`), so it always exercises the `added_by_rss` branch regardless of
  prior runs / platform order. The directory sentinel (`e2e-directory`) stays fixed. Mirrors the
  per-run-nonce pattern used for the add-by-RSS API integration test (ISSUE 2). Validated: OPML
  passes on iOS **and** Android.

---

## Run 2 result (mobile Maestro E2E, iOS + Android phone)

Ran every top-level `apps/mobile/e2e/<area>.yaml` flow. First full-suite pass surfaced 3 unique
failures (ISSUE 7 masked as 2 iOS + carried into others; ISSUE 8 auth-logout + tab-switch; ISSUE 9
OPML on Android). After the fixes above, all three previously-failing flows pass on **both**
platforms (Auth Logout, Tab Switch Playback, OPML Export Screen); the other 17 flows passed
throughout. All fixes were flow/E2E-fixture changes plus the shared connect-flow resiliency — no
app-behavior changes were required for ISSUE 7–9.

---

## ISSUE 10 (FIXED): full web E2E report 429s — `/auth/login` limiter not relaxed for E2E

`make e2e_test_report` failed 28+ specs, all at the `loginSeedUser` step with
`{"tooManyRequests":true,...}` (HTTP 429 from `buildRateLimit429Body`). Every failing spec was an
otherwise-passing test gated by login (`media-player-*`, `set-password-invite-session`,
`settings-opml-export`, `podcast-index-feed-add-trial-blocked`).

- **Root cause (limiter defaults).** This branch wired `POST /auth/login` through
  `rateLimitEndpoint(config.rateLimits.authLogin)` (`apps/api/src/routes/auth.ts`), an **IP-based**
  limiter defaulting to **5/min** (`AUTH_LOGIN_MAX_PER_MINUTE`, `defaultMax: 5`).
  `AUTH_LOGIN_MAX_PER_MINUTE` was set only in the `apiVitest` profile (`100`), **not** in
  `apiWebE2e` / `apiMobileE2e`, so both E2E API servers fell back to `5/min`. The full web suite's
  login-heavy cluster all logs in from one localhost IP → blew past 5/min → cascade of 429s.
  (Mobile passed only because its logins are sparse across a ~20-min run — a latent flake.)
- **Root cause (stale dist on re-run).** Source fix set `AUTH_LOGIN_MAX_PER_MINUTE: '100000'` on
  both E2E profiles in `packages/helpers-config/src/podverseTestEnv.ts`, but the next
  `make e2e_test_report` still 429'd: Playwright bakes the API env prefix at **config-load time**
  via `buildE2eWebApiEnvPrefix` → `buildPodverseApiTestEnv({ profile: 'apiWebE2e' })`, which imports
  the **built** `@podverse/helpers-config` dist. The API `webServer` command rebuilds
  `helpers-config` in-recipe, but that is **too late** — the env prefix was already computed from
  stale dist (missing the override), so the API still started at 5/min.
- **Fix.** (1) Env override in `podverseTestEnv.ts` for `apiWebE2e` / `apiMobileE2e`. Login-429
  behavior remains covered by `apps/api/src/test/auth.test.ts` under `apiVitest` (unchanged at
  `100`). (2) Report targets now depend on `e2e_build_packages` (`npm run build:packages`) in
  `makefiles/local/Makefile.local.e2e.mk` so fresh package dist exists before Playwright
  config-load (`e2e_test_report`, `e2e_test_web_report_spec`,
  `e2e_test_web_custom_themes_report`, `e2e_test_management_web_report_spec`,
  `e2e_test_report_scoped`).

---

## ISSUE 11 (WATCH): embed-routes clip/soundbite title assertion flake

On the same stormy run as ISSUE 10, `e2e/embed-routes.spec.ts` (“Clip and soundbite embeds hide
chapter info”) failed once asserting clip title `"Through the Telescope"` while the UI briefly
showed episode title `"The Solar System"` + `embed-title-toggle` (pre-`mpClip` state in
`EmbedPlayerInfo`). The same clip fixture passed in `embed-clip-soundbite-end.spec.ts` in that
run, and the test passed in the prior report run — treated as storm-induced / timing flake.

- **Action.** Revisit only if it fails again on a clean `make e2e_test_report` (with
  `e2e_build_packages` / no login-429 storm). Harden the assertion or wait for clip title then.
