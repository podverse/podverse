# 054-dev-client-android-device

**Master step:** 3.15
**Model (author + implement):** Auto
**Status:** done

## Scope

- Operator-run: build Expo dev client APK/AAB debug variant and install on physical Android device.
- Enable USB debugging; accept install for `com.podverse.app.next` application id.
- Launch app against Metro; confirm hello-world screen and `@podverse/helpers` smoke (3.8).
- Document adb / Gradle path issues in APPS-MOBILE if encountered.

## Acceptance criteria

- Step 3.15 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- Dev client runs on physical Android device (not emulator-only)
- Hello-world title and version visible on device
- Application id matches separate `.next` package from step 3.2
- No dependency on Play Store internal track for this verification step

## Web parity references

- [DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md)
- [APPS-MOBILE.md § Commands from repo root](/apps/mobile/APPS-MOBILE.md)
- [048-native-toolchain-prerequisites](/docs/proposals/mobile/_master-plan_/details/048-native-toolchain-prerequisites.md)

## Verification

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run android -w apps/mobile -- --device
./scripts/nix/with-env npm run dev:mobile
```
