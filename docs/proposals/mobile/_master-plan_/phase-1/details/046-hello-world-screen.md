# 046-hello-world-screen

**Master step:** 3.7
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Implement a hello-world screen showing app display name and version string.
- Use `expo-constants` (or config) for version; show readable title on iOS and Android.
- Wire the screen as the initial route in the root `App` component (navigation scaffold in 3.13).
- Style minimally with React Native core components (no `@podverse/ui`).

## Acceptance criteria

- Step 3.7 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md)
- Screen renders app name (e.g. "Podverse Next") and semver from Expo config
- Visible on iOS simulator and Android emulator via dev client
- Tier D extensionless relative imports in `apps/mobile/src/**`
- No web-only imports (`next/*`, DOM APIs, Playwright)

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2 `src/screens/`](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [APPS-MOBILE.md § Project layout](/apps/mobile/APPS-MOBILE.md)
- [mobile-react-native](/.cursor/rules/mobile-react-native.mdc)

## Verification

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run start -w apps/mobile
test -f apps/mobile/src/screens/HelloWorldScreen.tsx || test -f apps/mobile/src/screens/HelloWorldScreen.ts
grep -rq 'Podverse' apps/mobile/src
```
