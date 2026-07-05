# 053-dev-client-ios-device

**Master step:** 3.14
**Model (author + implement):** Auto
**Status:** done

## Scope

- Operator-run: build Expo dev client for iOS and install on a **physical** device.
- Use Apple Developer signing (team, provisioning profile) for `com.podverse.app.next`.
- Connect device to Metro; confirm hello-world screen loads from dev bundle.
- Record any signing or entitlements blockers in APPS-MOBILE troubleshooting notes.

## Acceptance criteria

- Step 3.14 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- Dev client installed on physical iPhone (not simulator-only)
- App launches, shows app name + version from step 3.7
- Metro reload works over USB or LAN per Expo dev-client workflow
- Separate bundle id does not overwrite production Podverse TestFlight/App Store listing

## Web parity references

- [DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md)
- [APPS-MOBILE.md § Toolchain](/apps/mobile/APPS-MOBILE.md)
- [048-native-toolchain-prerequisites](/docs/proposals/mobile/_master-plan_/details/048-native-toolchain-prerequisites.md)

## Verification

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run ios -w apps/mobile -- --device
./scripts/nix/with-env npm run dev:mobile
```
