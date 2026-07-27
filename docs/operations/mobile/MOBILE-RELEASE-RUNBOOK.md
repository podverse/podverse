# Mobile release runbook (`.next` app)

This runbook covers Track 4 release operations for the next-gen mobile app (`com.podverse.app.next`).

## Store-safety rule

- Never overwrite existing Podverse production/beta listings during PG-3.
- Keep all builds/submits scoped to the `.next` app identity until convergence gate `4.25` is
  explicitly approved.

## Branch-to-channel map

| Branch    | Workflow                                         | EAS profile  | Distribution target             |
| --------- | ------------------------------------------------ | ------------ | ------------------------------- |
| `develop` | `.github/workflows/mobile-internal.yml`          | `internal`   | Internal testing                |
| `staging` | `.github/workflows/mobile-staging-beta.yml`      | `beta`       | Beta testing                    |
| `main`    | `.github/workflows/mobile-production-submit.yml` | `production` | Production submit (manual gate) |

## OTA policy (EAS Update)

- Use EAS Update only for JavaScript/content-only updates.
- Native-impacting changes require a new store build/submit:
  - `app.config.ts` plugin/config changes
  - iOS/Android native project changes
  - native module updates (including `podverse-media-engine`)
  - ABI-impacting dependency changes

## EAS profiles and versioning

- Source of truth: `apps/mobile/eas.json`.
- Required profiles: `internal`, `beta`, `production`.
- Build numbers (`CFBundleVersion` / `versionCode`) must be monotonic; do not reset sequences.
- Marketing version (`X.Y.Z`) is synced from `apps/mobile/package.json` via
  `scripts/publish/bump-version.sh`.

## Accounts and pricing

- Apple Developer Program: approximately `$99/year`.
- Google Play Console registration: approximately `$25` one-time.
- EAS pricing can change; use [Expo pricing](https://expo.dev/pricing) as source of truth.

## Secrets and signing checklist

- CI runtime auth:
  - `EXPO_TOKEN` (required for authenticated EAS operations)
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
- iOS CarPlay QA is a later slice (CarPlay entitlement not provisioned yet).

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
