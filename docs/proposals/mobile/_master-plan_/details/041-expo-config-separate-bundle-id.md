# 041-expo-config-separate-bundle-id

**Master step:** 3.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add `app.config.ts` (or `app.json`) for Expo prebuild configuration.
- Set iOS `bundleIdentifier` and Android `package` to a **separate** id (e.g. `com.podverse.app.next`).
- Configure app display name, slug, scheme, and New Architecture flag consistent with Track 4 store safety.
- Keep config typed with `ExpoConfig` where using TypeScript.

## Acceptance criteria

- Step 3.2 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- Bundle id / application id does **not** match production Podverse store apps
- `name`, `slug`, and `scheme` identify the next-gen app (not prod listing overwrite risk)
- Config is consumable by `expo prebuild` without manual native edits
- Documented in APPS-MOBILE or master plan that `.next` id is intentional until convergence (Track 4)

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [001-MASTER-PLAN.md Track 4 store safety](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)

## Verification

```bash
test -f apps/mobile/app.config.ts || test -f apps/mobile/app.json
grep -q 'com.podverse.app.next' apps/mobile/app.config.ts apps/mobile/app.json 2>/dev/null
```
