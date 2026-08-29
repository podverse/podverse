# 042-metro-config-monorepo

**Master step:** 3.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add `apps/mobile/metro.config.js` extending `expo/metro-config`.
- Set `watchFolders` to the **repository root** for hoisted workspace symlinks.
- Set `resolver.nodeModulesPaths` for `apps/mobile/node_modules` and root `node_modules`.
- Ensure `@podverse/*` resolves via package `main`/`types` (`dist/`), not Tier A source trees.

## Acceptance criteria

- Step 3.3 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md)
- Monorepo root is in `watchFolders`
- Both mobile-local and root `node_modules` are searched
- No Metro alias pointing at `packages/*/src` (dist-only for Tier A)
- Matches documented requirements in APPS-MOBILE Metro section

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §4 Tier D](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [APPS-MOBILE.md § Metro monorepo configuration](/apps/mobile/APPS-MOBILE.md)
- [018-metro-monorepo-doc](/docs/proposals/mobile/_master-plan_/phase-1/details/018-metro-monorepo-doc.md)

## Verification

```bash
test -f apps/mobile/metro.config.js
grep -q watchFolders apps/mobile/metro.config.js
grep -q nodeModulesPaths apps/mobile/metro.config.js
```
