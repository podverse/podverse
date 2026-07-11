# 043-mobile-tsconfig

**Master step:** 3.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add `apps/mobile/tsconfig.json` extending repo `tsconfig.base.json`.
- Set `jsx: react-native`, `moduleResolution: bundler`, and `noEmit: true`.
- Include app TypeScript sources; exclude generated `ios/` and `android/` trees.
- Align with Tier D extensionless imports in mobile app source.

## Acceptance criteria

- Step 3.4 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- Extends `../../tsconfig.base.json` (or documented equivalent path)
- `compilerOptions.jsx` is `react-native`
- `compilerOptions.moduleResolution` is `bundler`
- `types` includes `react-native` where needed for RN globals

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §4 Tier D](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md)
- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)

## Verification

```bash
test -f apps/mobile/tsconfig.json
grep -q '"jsx": "react-native"' apps/mobile/tsconfig.json
grep -q '"moduleResolution": "bundler"' apps/mobile/tsconfig.json
```
