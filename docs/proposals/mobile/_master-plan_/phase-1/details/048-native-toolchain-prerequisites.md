# 048-native-toolchain-prerequisites

**Master step:** 3.9
**Model (author + implement):** Auto
**Status:** done

## Scope

- Expand `apps/mobile/APPS-MOBILE.md` with Xcode and Android SDK prerequisites.
- Clarify these tools live **outside** the Nix flake (local macOS install).
- List minimum versions or install paths (Xcode, CocoaPods, Android Studio, SDK platforms).
- Note operator responsibility for physical device provisioning (Apple team, USB debugging).

## Acceptance criteria

- Step 3.9 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md)
- APPS-MOBILE has a dedicated **Toolchain** or **Native prerequisites** subsection beyond Nix/Node
- Documents that prebuild, `expo run:ios`, and `expo run:android` require local native SDKs
- Links to Expo prebuild docs where helpful; no machine-specific absolute paths
- Distinguishes Nix-wrapped Node/npm from non-Nix Xcode/Android Studio

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)
- [CURSOR-NIX-WITH-ENV.md](/docs/development/tooling/CURSOR-NIX-WITH-ENV.md)

## Verification

```bash
grep -qi xcode apps/mobile/APPS-MOBILE.md
grep -qi 'android sdk\|android studio' apps/mobile/APPS-MOBILE.md
```
