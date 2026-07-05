# 044-root-mobile-npm-scripts

**Master step:** 3.5
**Model (author + implement):** Auto
**Status:** done

## Scope

- Add root `package.json` convenience scripts delegating to `apps/mobile` workspace.
- Scripts: `dev:mobile`, `mobile:ios`, `mobile:android` (and document in APPS-MOBILE).
- Keep mobile **off** `build:packages` and `build:apps` (delegation only, no graph change).
- Mirror naming already documented in APPS-MOBILE optional scripts section.

## Acceptance criteria

- Step 3.5 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- Root scripts invoke `-w apps/mobile` targets (`start`, `ios`, `android`)
- No new mobile deps added at repo root
- APPS-MOBILE commands section lists both `-w` and convenience script forms
- Operator can run `./scripts/nix/with-env npm run dev:mobile` from monorepo root

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §5](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [APPS-MOBILE.md § Commands from repo root](/apps/mobile/APPS-MOBILE.md)
- [commands-from-monorepo-root](/.cursor/rules/commands-from-monorepo-root.mdc)

## Verification

```bash
node -e "const s=require('./package.json').scripts; ['dev:mobile','mobile:ios','mobile:android'].forEach(k=>{if(!s[k]){console.error('missing',k);process.exit(1)}})"
grep -q 'dev:mobile' apps/mobile/APPS-MOBILE.md
```
