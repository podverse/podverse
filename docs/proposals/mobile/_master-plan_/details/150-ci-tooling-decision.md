# 150-ci-tooling-decision

**Master step:** 4.1
**Model (author + implement):** Opus 4.8
**Status:** ready

## Scope

- Lock CI tooling for next-gen mobile: **EAS Build + EAS Submit** as primary.
- Fastlane is **not** implemented in PG-3; document as optional future escape hatch only.
- Record choice in master plan Open decisions + phase `00-SUMMARY.md`.
- Rationale: Expo prebuild/dev-client already in use; EAS Update planned (4.19); lower macOS
  runner maintenance vs self-hosted Fastlane for early alpha.

## Architecture notes

- GitHub Actions workflows call `eas build` / `eas submit` (or `expo` CLI with EAS project) rather
  than compiling Xcode/Gradle on Actions for every channel (Actions may still orchestrate and
  upload credentials).
- Signing lives in EAS credentials / secrets — never commit keystores or `.p12`.
- Server `publish-staging` / `publish-main` remain untouched (4.7).

## Edge cases

- Offline/FOSS contributors: document that EAS cloud builds are optional for local
  `expo run:*`; F-Droid later may need local/Gradle paths (Track fdroid — out of PG-3).
- If EAS cost becomes blocking, revisit Fastlane without rewriting store identity (4.11–4.13).

## Acceptance criteria

- Open decision "CI tooling" marked **EAS chosen**
- Detail lists what Fastlane would replace if revisited
- Downstream details (4.4–4.20) assume EAS profiles, not Fastlane lanes

## Web parity references

- [DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)

## Verification

```bash
rg -n 'EAS|Fastlane|CI tooling' docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md .llm/plans/active/mobile-pg3-ci-e2e/00-SUMMARY.md
```
