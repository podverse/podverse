# Authoring: Tracks 4, 22 — CI/CD and store release train

**Phase:** B (parallel). **Output file:**
`docs/proposals/mobile/_master-plan_/_draft-tracks/track-04-22.md`

**Detail ID range:** 150–199

## Store safety constraint

Steps must emphasize **never overwriting** existing Podverse Prod/Beta App Store and Google Play
listings during next-gen development. Default: separate bundle/application id (e.g.
`com.podverse.app.next`) and internal/alpha distribution until explicit convergence decision.

Reference:
[DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)

## Instructions for the executing agent

Write **Track 4** first, then **Track 22**, in one output file. Use master-plan line format with
**Model** on each line.

## Track 4 — CI/CD, alpha track, store safety

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 4.1 | Record open decision: EAS Build/Submit vs self-hosted Fastlane on GitHub macOS runners. | Opus 4.8 | 150-ci-tooling-decision |
| 4.2 | Document required accounts: Apple Developer ($99/yr), Google Play ($25 one-time). | Auto | 151-store-account-costs |
| 4.3 | Document optional EAS paid tier costs for cloud builds and submit convenience. | Auto | 152-eas-pricing-note |
| 4.4 | Create `.github/workflows/mobile-internal.yml` triggered on `develop` (non-blocking). | Codex 5.3 | 153-workflow-mobile-internal |
| 4.5 | Create `.github/workflows/mobile-staging-beta.yml` triggered on `staging` (TestFlight/closed). | Codex 5.3 | 154-workflow-mobile-staging-beta |
| 4.6 | Create `.github/workflows/mobile-production-submit.yml` triggered on `main` (manual approval gate). | Opus 4.8 | 155-workflow-mobile-production |
| 4.7 | Ensure mobile workflows never block `publish-staging.yml` / `publish-main.yml` server jobs. | Codex 5.3 | 156-ci-isolation-from-server |
| 4.8 | Configure macOS GitHub Actions runner requirement for iOS builds. | Codex 5.3 | 157-macos-runner-ios |
| 4.9 | Configure Android build job (macOS or Linux depending on toolchain choice). | Codex 5.3 | 158-android-build-runner |
| 4.10 | Store signing credentials in GitHub Actions secrets (match/EAS credentials or Fastlane). | Opus 4.8 | 159-signing-secrets-setup |
| 4.11 | Use separate iOS bundle id and Android applicationId for next-gen app (`*.next` suffix). | Opus 4.8 | 160-separate-app-id |
| 4.12 | Create separate App Store Connect app record for next-gen (do not reuse prod listing). | Opus 4.8 | 161-app-store-connect-next-app |
| 4.13 | Create separate Google Play app entry or internal testing track isolated from prod. | Opus 4.8 | 162-play-console-next-app |
| 4.14 | Map `develop` branch builds to TestFlight Internal / Play internal testing only. | Codex 5.3 | 163-branch-develop-internal |
| 4.15 | Map `staging` branch builds to TestFlight external beta / Play closed testing. | Codex 5.3 | 164-branch-staging-beta |
| 4.16 | Map `main` branch to production submit workflow with human approval and staged rollout. | Opus 4.8 | 165-branch-main-production |
| 4.17 | Integrate monotonic iOS `CFBundleVersion` and Android `versionCode` from CI build counter. | Codex 5.3 | 166-monotonic-build-numbers |
| 4.18 | Sync marketing version `X.Y.Z` from root bump-version.sh to mobile app config. | Codex 5.3 | 167-marketing-version-sync |
| 4.19 | Document OTA policy: EAS Update for JS-only; native changes require store build. | Codex 5.3 | 168-ota-update-policy |
| 4.20 | Add Fastlane lanes or EAS profiles: `internal`, `beta`, `production` per platform. | Codex 5.3 | 169-fastlane-eas-profiles |
| 4.21 | Version store metadata (screenshots, release notes) as code in repo. | Auto | 170-store-metadata-as-code |
| 4.22 | Add operator runbook doc `docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md`. | Codex 5.3 | 171-mobile-release-runbook |
| 4.23 | CI artifact retention for signed IPAs/AABs and dSYM/mapping files. | Codex 5.3 | 172-ci-artifact-retention |
| 4.24 | Add beta tester onboarding doc (TestFlight link, Play internal link) for next-gen app only. | Auto | 173-beta-tester-onboarding |
| 4.25 | Record convergence decision gate: when/how to migrate from `.next` id to prod listing. | Opus 4.8 | 174-prod-listing-convergence-gate |

## Track 22 — Store release train and API backward compatibility

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 22.1 | Document branch → store channel mapping aligned with STAGING-MAIN-PROMOTION server flow. | Auto | 175-branch-store-channel-map |
| 22.2 | Define release checklist: same binary tested in beta promoted to production submit. | Codex 5.3 | 176-promote-tested-binary |
| 22.3 | Plan review latency buffer in release schedule (Apple/Google approval days). | Auto | 177-store-review-buffer |
| 22.4 | Implement minimum-supported-client-version API signal for forced upgrade prompts. | Opus 4.8 | 178-min-supported-version-api |
| 22.5 | Document API add-only discipline for mobile DTO compatibility. | Auto | 179-api-add-only-discipline |
| 22.6 | Add mobile client version header on all API requests for server logging. | Codex 5.3 | 180-client-version-header |
| 22.7 | Define phased rollout strategy using store percentage rollout controls. | Codex 5.3 | 181-phased-rollout-strategy |
| 22.8 | Document rollback procedure: submit previous build, cannot un-ship. | Auto | 182-store-rollback-procedure |
| 22.9 | Align release notes generation with monorepo changelog or bump-version output. | Auto | 183-release-notes-generation |
| 22.10 | Add post-release monitoring checklist (crash analytics, API error rates). | Codex 5.3 | 184-post-release-monitoring |
| 22.11 | Schedule periodic dependency and SDK compliance updates (iOS/Android target SDK). | Codex 5.3 | 185-sdk-compliance-updates |
| 22.12 | Document coexistence period: old-gen and next-gen apps in field simultaneously. | Auto | 186-old-new-app-coexistence |

## Verification

- Track 4 steps 4.1–4.25 and Track 22 steps 22.1–22.12 present.
- Detail IDs 150–174 and 175–186 used.
- Separate app id and prod listing safety called out in Track 4 intro.
