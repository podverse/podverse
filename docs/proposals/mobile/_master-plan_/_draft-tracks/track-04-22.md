# Draft: Tracks 4, 22 — CI/CD and store release train

**Store safety:** Never overwrite existing Podverse Prod/Beta App Store and Google Play listings
during next-gen development. Default: separate bundle/application id (e.g. `com.podverse.app.next`)
and internal/alpha distribution until an explicit convergence decision.

Reference:
[DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)

## Track 4 — CI/CD, alpha track, store safety

4.1. Record open decision: EAS Build/Submit vs self-hosted Fastlane on GitHub macOS runners. Model: Opus 4.8. Detail: [150-ci-tooling-decision](/docs/proposals/mobile/_master-plan_/phase-1/details/150-ci-tooling-decision.md) — _TBD_
4.2. Document required accounts: Apple Developer ($99/yr), Google Play ($25 one-time). Model: Auto. Detail: [151-store-account-costs](/docs/proposals/mobile/_master-plan_/phase-1/details/151-store-account-costs.md) — _TBD_
4.3. Document optional EAS paid tier costs for cloud builds and submit convenience. Model: Auto. Detail: [152-eas-pricing-note](/docs/proposals/mobile/_master-plan_/phase-1/details/152-eas-pricing-note.md) — _TBD_
4.4. Create `.github/workflows/mobile-internal.yml` triggered on `develop` (non-blocking). Model: Codex 5.3. Detail: [153-workflow-mobile-internal](/docs/proposals/mobile/_master-plan_/phase-1/details/153-workflow-mobile-internal.md) — _TBD_
4.5. Create `.github/workflows/mobile-staging-beta.yml` triggered on `staging` (TestFlight/closed). Model: Codex 5.3. Detail: [154-workflow-mobile-staging-beta](/docs/proposals/mobile/_master-plan_/phase-1/details/154-workflow-mobile-staging-beta.md) — _TBD_
4.6. Create `.github/workflows/mobile-production-submit.yml` triggered on `main` (manual approval gate). Model: Opus 4.8. Detail: [155-workflow-mobile-production](/docs/proposals/mobile/_master-plan_/phase-1/details/155-workflow-mobile-production.md) — _TBD_
4.7. Ensure mobile workflows never block `publish-staging.yml` / `publish-main.yml` server jobs. Model: Codex 5.3. Detail: [156-ci-isolation-from-server](/docs/proposals/mobile/_master-plan_/phase-1/details/156-ci-isolation-from-server.md) — _TBD_
4.8. Configure macOS GitHub Actions runner requirement for iOS builds. Model: Codex 5.3. Detail: [157-macos-runner-ios](/docs/proposals/mobile/_master-plan_/phase-1/details/157-macos-runner-ios.md) — _TBD_
4.9. Configure Android build job (macOS or Linux depending on toolchain choice). Model: Codex 5.3. Detail: [158-android-build-runner](/docs/proposals/mobile/_master-plan_/phase-1/details/158-android-build-runner.md) — _TBD_
4.10. Store signing credentials in GitHub Actions secrets (match/EAS credentials or Fastlane). Model: Opus 4.8. Detail: [159-signing-secrets-setup](/docs/proposals/mobile/_master-plan_/phase-1/details/159-signing-secrets-setup.md) — _TBD_
4.11. Use separate iOS bundle id and Android applicationId for next-gen app (`*.next` suffix). Model: Opus 4.8. Detail: [160-separate-app-id](/docs/proposals/mobile/_master-plan_/phase-1/details/160-separate-app-id.md) — _TBD_
4.12. Create separate App Store Connect app record for next-gen (do not reuse prod listing). Model: Opus 4.8. Detail: [161-app-store-connect-next-app](/docs/proposals/mobile/_master-plan_/phase-1/details/161-app-store-connect-next-app.md) — _TBD_
4.13. Create separate Google Play app entry or internal testing track isolated from prod. Model: Opus 4.8. Detail: [162-play-console-next-app](/docs/proposals/mobile/_master-plan_/phase-1/details/162-play-console-next-app.md) — _TBD_
4.14. Map `develop` branch builds to TestFlight Internal / Play internal testing only. Model: Codex 5.3. Detail: [163-branch-develop-internal](/docs/proposals/mobile/_master-plan_/phase-1/details/163-branch-develop-internal.md) — _TBD_
4.15. Map `staging` branch builds to TestFlight external beta / Play closed testing. Model: Codex 5.3. Detail: [164-branch-staging-beta](/docs/proposals/mobile/_master-plan_/phase-1/details/164-branch-staging-beta.md) — _TBD_
4.16. Map `main` branch to production submit workflow with human approval and staged rollout. Model: Opus 4.8. Detail: [165-branch-main-production](/docs/proposals/mobile/_master-plan_/phase-1/details/165-branch-main-production.md) — _TBD_
4.17. Integrate monotonic iOS `CFBundleVersion` and Android `versionCode` from CI build counter. Model: Codex 5.3. Detail: [166-monotonic-build-numbers](/docs/proposals/mobile/_master-plan_/phase-1/details/166-monotonic-build-numbers.md) — _TBD_
4.18. Sync marketing version `X.Y.Z` from root bump-version.sh to mobile app config. Model: Codex 5.3. Detail: [167-marketing-version-sync](/docs/proposals/mobile/_master-plan_/phase-1/details/167-marketing-version-sync.md) — _TBD_
4.19. Document OTA policy: EAS Update for JS-only; native changes require store build. Model: Codex 5.3. Detail: [168-ota-update-policy](/docs/proposals/mobile/_master-plan_/phase-1/details/168-ota-update-policy.md) — _TBD_
4.20. Add Fastlane lanes or EAS profiles: `internal`, `beta`, `production` per platform. Model: Codex 5.3. Detail: [169-fastlane-eas-profiles](/docs/proposals/mobile/_master-plan_/phase-1/details/169-fastlane-eas-profiles.md) — _TBD_
4.21. Version store metadata (screenshots, release notes) as code in repo. Model: Auto. Detail: [170-store-metadata-as-code](/docs/proposals/mobile/_master-plan_/phase-1/details/170-store-metadata-as-code.md) — _TBD_
4.22. Add operator runbook doc `docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md`. Model: Codex 5.3. Detail: [171-mobile-release-runbook](/docs/proposals/mobile/_master-plan_/phase-1/details/171-mobile-release-runbook.md) — _TBD_
4.23. CI artifact retention for signed IPAs/AABs and dSYM/mapping files. Model: Codex 5.3. Detail: [172-ci-artifact-retention](/docs/proposals/mobile/_master-plan_/phase-1/details/172-ci-artifact-retention.md) — _TBD_
4.24. Add beta tester onboarding doc (TestFlight link, Play internal link) for next-gen app only. Model: Auto. Detail: [173-beta-tester-onboarding](/docs/proposals/mobile/_master-plan_/phase-1/details/173-beta-tester-onboarding.md) — _TBD_
4.25. Record convergence decision gate: when/how to migrate from `.next` id to prod listing. Model: Opus 4.8. Detail: [174-prod-listing-convergence-gate](/docs/proposals/mobile/_master-plan_/phase-1/details/174-prod-listing-convergence-gate.md) — _TBD_

## Track 22 — Store release train and API backward compatibility

22.1. Document branch → store channel mapping aligned with STAGING-MAIN-PROMOTION server flow. Model: Auto. Detail: [175-branch-store-channel-map](/docs/proposals/mobile/_master-plan_/phase-1/details/175-branch-store-channel-map.md) — _TBD_
22.2. Define release checklist: same binary tested in beta promoted to production submit. Model: Codex 5.3. Detail: [176-promote-tested-binary](/docs/proposals/mobile/_master-plan_/phase-1/details/176-promote-tested-binary.md) — _TBD_
22.3. Plan review latency buffer in release schedule (Apple/Google approval days). Model: Auto. Detail: [177-store-review-buffer](/docs/proposals/mobile/_master-plan_/phase-1/details/177-store-review-buffer.md) — _TBD_
22.4. Implement minimum-supported-client-version API signal for forced upgrade prompts. Model: Opus 4.8. Detail: [178-min-supported-version-api](/docs/proposals/mobile/_master-plan_/phase-1/details/178-min-supported-version-api.md) — _TBD_
22.5. Document API add-only discipline for mobile DTO compatibility. Model: Auto. Detail: [179-api-add-only-discipline](/docs/proposals/mobile/_master-plan_/phase-1/details/179-api-add-only-discipline.md) — _TBD_
22.6. Add mobile client version header on all API requests for server logging. Model: Codex 5.3. Detail: [180-client-version-header](/docs/proposals/mobile/_master-plan_/phase-1/details/180-client-version-header.md) — _TBD_
22.7. Define phased rollout strategy using store percentage rollout controls. Model: Codex 5.3. Detail: [181-phased-rollout-strategy](/docs/proposals/mobile/_master-plan_/phase-1/details/181-phased-rollout-strategy.md) — _TBD_
22.8. Document rollback procedure: submit previous build, cannot un-ship. Model: Auto. Detail: [182-store-rollback-procedure](/docs/proposals/mobile/_master-plan_/phase-1/details/182-store-rollback-procedure.md) — _TBD_
22.9. Align release notes generation with monorepo changelog or bump-version output. Model: Auto. Detail: [183-release-notes-generation](/docs/proposals/mobile/_master-plan_/phase-1/details/183-release-notes-generation.md) — _TBD_
22.10. Add post-release monitoring checklist (crash analytics, API error rates). Model: Codex 5.3. Detail: [184-post-release-monitoring](/docs/proposals/mobile/_master-plan_/phase-1/details/184-post-release-monitoring.md) — _TBD_
22.11. Schedule periodic dependency and SDK compliance updates (iOS/Android target SDK). Model: Codex 5.3. Detail: [185-sdk-compliance-updates](/docs/proposals/mobile/_master-plan_/phase-1/details/185-sdk-compliance-updates.md) — _TBD_
22.12. Document coexistence period: old-gen and next-gen apps in field simultaneously. Model: Auto. Detail: [186-old-new-app-coexistence](/docs/proposals/mobile/_master-plan_/phase-1/details/186-old-new-app-coexistence.md) — _TBD_
