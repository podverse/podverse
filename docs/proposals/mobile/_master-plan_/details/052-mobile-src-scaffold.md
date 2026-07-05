# 052-mobile-src-scaffold

**Master step:** 3.13
**Model (author + implement):** Auto
**Status:** done

## Scope

- Create initial `apps/mobile/src/navigation/` and `apps/mobile/src/screens/` directory scaffold.
- Add placeholder index/README or minimal barrel files documenting intended layout.
- Wire hello-world screen through a simple root navigator or direct `App` import.
- Reserve sibling folders (`hooks/`, `bridge/`, `state/`, `storage/`) as documented targets only.

## Acceptance criteria

- Step 3.13 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- `src/navigation/` and `src/screens/` directories exist with at least one screen module
- Hello-world screen lives under `src/screens/` (not only inline in root `App.tsx`)
- Layout matches [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- No premature feature code (auth, queue, player) in scaffold files

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [APPS-MOBILE.md § Project layout](/apps/mobile/APPS-MOBILE.md)
- [mobile-react-native](/.cursor/rules/mobile-react-native.mdc)

## Verification

```bash
test -d apps/mobile/src/navigation
test -d apps/mobile/src/screens
find apps/mobile/src/screens -name '*.tsx' -o -name '*.ts' | grep -q .
```
