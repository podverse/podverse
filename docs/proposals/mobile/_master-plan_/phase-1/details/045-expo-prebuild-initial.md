# 045-expo-prebuild-initial

**Master step:** 3.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add RN entry files (`index.js`, root `App` component shell) required by Expo.
- Run `expo prebuild` to generate `apps/mobile/ios/` and `apps/mobile/android/` native projects.
- Commit prebuild **source** config; treat heavy generated churn per team policy (Pods/build gitignored).
- Ensure dev-client plugin from `app.config.ts` is reflected in native projects.

## Acceptance criteria

- Step 3.6 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md)
- `ios/` and `android/` directories exist under `apps/mobile/`
- Native bundle id / application id matches `com.podverse.app.next` from step 3.2
- `npm run prebuild -w apps/mobile` is idempotent or documented when `--clean` is required
- Operator prerequisites (Xcode, Android SDK) documented before first prebuild attempt

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md)
- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)

## Verification

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run prebuild -w apps/mobile
test -d apps/mobile/ios
test -d apps/mobile/android
```
