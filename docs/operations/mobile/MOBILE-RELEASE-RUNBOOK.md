# Mobile release runbook (`.next` app)

This runbook covers Track 4 release operations for the next-gen mobile app (`com.podverse.app.next`).

## Store-safety rule

- Never overwrite existing Podverse production/beta listings during PG-3.
- Keep all builds/submits scoped to the `.next` app identity until convergence gate `4.25` is
  explicitly approved.

## On-demand store builds (decision)

Mobile store builds are **operator-triggered only**. Merging to `staging` or `main` publishes
**server images only**. It never builds or submits the mobile app.

| EAS profile  | EAS environment | Distribution target                         | How to ship                                      |
| ------------ | --------------- | ------------------------------------------- | ------------------------------------------------ |
| `internal`   | `development`   | Dev client / internal distribution          | Local Make when needed (not a store track)       |
| `beta`       | `preview`       | TestFlight internal + Play internal (draft) | `make mobile_eas_ios_*` / `mobile_eas_android_*` |
| `production` | `production`    | App Store / Play production                 | Same Make targets with `PROFILE=production`      |

Signing and `EXPO_PUBLIC_*` config live on EAS. Local and any future GitHub `workflow_dispatch`
button must read the same profile → environment map so they produce the same binary. Do **not**
add push/merge triggers that call `eas build` or `eas submit`. See
[`.cursor/rules/mobile-store-builds-on-demand.mdc`](/.cursor/rules/mobile-store-builds-on-demand.mdc).

### Release commands (**Mobile** tab)

```bash
# Android — beta .aab → Play internal draft (testers get nothing until Console rollout)
make mobile_eas_android_build
make mobile_eas_android_submit
make mobile_eas_android_submit ROLLOUT=1   # type the versionCode to publish the track

# iOS — beta .ipa → TestFlight (type the build number; no draft state)
make mobile_eas_ios_build
make mobile_eas_ios_submit

# Inspect
make mobile_eas_android_list
make mobile_eas_ios_list
make mobile_eas_android_version
make mobile_eas_ios_version
```

Defaults: `PROFILE=beta`. For production binaries: `PROFILE=production`. Store profiles refuse a
dirty working tree. The script runs with `EXPO_NO_DOTENV=1` so a local `apps/mobile/.env` cannot
override the EAS environment.

Store profiles also require committed user-facing notes before `build` and `submit`.
The shared file is `release-notes/mobile/X.Y.Z.md`. Add `X.Y.Z.ios.md` or
`X.Y.Z.android.md` only when that store should differ. Update those files in place
across builds of the same version. EAS uploads the binary only; the script prints
the notes to paste into Play Release notes or TestFlight What to Test. GitHub
release notes stay in `release-notes/X.Y.Z.md` and are not the store text.

A store `build` also refuses while `release-notes/scratchpad.md` has entries. Ask an
agent to run abcreleasenotes, which moves those entries into the notes and empties
the scratchpad, then commit that change before building.

Before the first iOS submit, replace `REPLACE_WITH_ASC_APP_ID` and `REPLACE_WITH_APPLE_TEAM_ID` in
[`apps/mobile/eas.json`](/apps/mobile/eas.json) `submit.beta.ios` (and `submit.production.ios`).
Store the App Store Connect API key and Play service account on EAS (`eas credentials`).

Alpha / internal-tester pointing: the `beta` profile reads the EAS **`preview`** environment.
Set one variable from the repo root (`PROFILE=production` selects that profile's environment):

```bash
make mobile_eas_env_set NAME=EXPO_PUBLIC_MOBILE_WEB_BASE_URL VALUE=https://example.com
```

Firebase client config is a file variable, not a string. Download `GoogleService-Info.plist` and
`google-services.json` for `com.podverse.app.next` into a directory outside the repo. The Firebase
project is the one alpha workers already use, and Cloud Messaging needs an APNs auth key for team
`DF9KG8H54B`. Set both files on each environment you build (`PROFILE=internal`, `PROFILE=beta`,
`PROFILE=production`). Run one command at a time from the **Mobile** tab:

```bash
make mobile_eas_env_set NAME=GOOGLE_SERVICES_INFO_PLIST VALUE=$HOME/path/GoogleService-Info.plist TYPE=file VISIBILITY=secret
```

```bash
make mobile_eas_env_set NAME=GOOGLE_SERVICES_JSON VALUE=$HOME/path/google-services.json TYPE=file VISIBILITY=secret
```

A build without those files still compiles. It does not register an FCM token. Do not commit the files.

Which `EXPO_PUBLIC_*` values belong on that environment:
[DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md).

## Updates

This app does not use over-the-air updates (EAS Update). JavaScript changes ship in the next
store binary, the same as native changes. Turning OTA on is a major change and waits for an
explicit operator request in that conversation. See **mobile-store-builds-on-demand**.

## EAS profiles and versioning

- Source of truth: `apps/mobile/eas.json`.
- Required profiles: `internal`, `beta`, `production`. Each extends `base`, which pins the build
  server's Node to the repo's major version, and sets `environment` so EAS injects the matching
  env-var set at build time.
- Run EAS through the `make mobile_eas_*` targets. `scripts/mobile/eas-store.sh` enters
  `apps/mobile` because `eas-cli` has no flag for another project directory.
- The build server receives only committed-or-unignored files, so shared package `dist/` and
  compiled i18n catalogs do not exist there. `apps/mobile/package.json` hooks rebuild them:
  `eas-build-pre-install` runs `scripts/mobile/eas-build-pre-install.sh` (root `npm ci` plus the
  shared packages mobile imports, which `app.config.ts` needs), and `eas-build-post-install` runs
  `i18n-compile` before Gradle bundles the JS.
- Build numbers (`CFBundleVersion` / `versionCode`) must be monotonic; do not reset sequences.
- Marketing version (`X.Y.Z`) is synced from `apps/mobile/package.json` via
  `scripts/publish/bump-version.sh`.

## Accounts and pricing

- Apple Developer Program: approximately `$99/year`.
- Google Play Console registration: approximately `$25` one-time.
- EAS pricing can change; use [Expo pricing](https://expo.dev/pricing) as source of truth.

## Secrets and signing checklist

- Local / optional CI runtime auth:
  - Expo login (`make mobile_eas_login`), or `EXPO_TOKEN` for a robot account
- Signing strategy:
  - Prefer EAS-managed credentials for iOS certs/profiles and Android keystores.
  - Keep `.next` credentials isolated from current production-app credentials.
- Never commit keystores, `.p12`, provisioning profiles, or API keys.

## CI artifact retention

For each beta/production candidate, keep:

- Signed binaries (IPA/AAB artifact references from EAS build history)
- iOS dSYM bundles
- Android mapping files / symbols

Retention baseline:

- Keep release-critical artifact references for at least one full release cycle plus rollback window.
- For GitHub-uploaded helper artifacts (if used), set explicit retention days in workflow config and
  align with incident-response needs.

## Beta tester onboarding

Use `docs/operations/mobile/MOBILE-BETA-TESTER-ONBOARDING.md` for operator-facing onboarding steps and
placeholder link management.

## Manual car QA gate — Android Auto (Track 12)

Car browse+play is **not fully automatable** (no Maestro/DHU in CI), so it is a **manual acceptance
gate** for any release that ships or changes the Android Auto surface (`podverse-media-engine`
native code, the browse tree, or the media service).

- **Gate:** run the Android Auto **DHU browse+play** checklist with the phone app **force-stopped** —
  browse Library + Downloads and play an offline and a streamed item, app never opened.
- **Steps + evidence:** follow
  [`apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md`](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md)
  (do not duplicate steps here); record the result in the release ticket.
- **Play Console declaration:** before shipping Android Auto to users, complete
  [`ANDROID-AUTO-DECLARATION.md`](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DECLARATION.md).

## Manual car QA gate — iOS CarPlay (Track 12)

CarPlay browse+play is a **manual acceptance gate** for any release that ships or changes the CarPlay
surface (`podverse-media-engine` native code, the CarPlay scene/templates, or the media engine).

- **Gate:** run the CarPlay **Simulator browse+play** checklist with the phone app **force-quit** —
  browse Library + Downloads and play an offline (and, when present, a streamed) item, app never
  opened, one shared engine.
- **Steps + evidence:** follow
  [`apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md`](/apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md)
  (do not duplicate steps here); record the result in the release ticket.
- **Entitlement / App Group:** provisioned for `com.podverse.app.next` — see
  [`CARPLAY-ENTITLEMENT.md`](/apps/mobile/modules/podverse-media-engine/CARPLAY-ENTITLEMENT.md).

## Production convergence gate (`4.25`)

Convergence from `.next` to production listing is a separate decision gate and is **not executed in
PG-3**.

Minimum criteria before convergence:

- Feature parity and stability targets met for next-gen app
- QA sign-off on rollout and rollback procedures
- Store-review plan prepared (App Store + Play)
- Dual-app coexistence and migration UX agreed
- Credential/signing migration plan documented and rehearsed

Until the gate is approved, all CI/workflows stay on `com.podverse.app.next`.
