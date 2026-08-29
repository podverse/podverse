# 040-mobile-package-json

**Master step:** 3.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add `apps/mobile/package.json` as a private npm workspace (`@podverse/mobile`).
- Declare Expo prebuild + dev-client dependencies (`expo`, `expo-dev-client`, `react`, `react-native`).
- Wire workspace scripts: `start`, `ios`, `android`, `prebuild`, `prebuild:clean`.
- Add `@podverse/helpers` as the first shared-package dependency (Tier A `dist/` consumer).

## Acceptance criteria

- Step 3.1 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md)
- `main` entry points at the RN root (`index.js` or equivalent added in step 3.6)
- Scripts use `expo start --dev-client` and `expo run:*` (not legacy Expo Go-only flow)
- No server/web-only packages in `dependencies` (ORM, parser, `@podverse/ui`, etc.)
- `npm install` from repo root succeeds with the new workspace

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §5](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)

## Verification

```bash
test -f apps/mobile/package.json
node -e "const p=require('./apps/mobile/package.json'); if(!p.dependencies['expo-dev-client']) process.exit(1)"
./scripts/nix/with-env npm install
```
