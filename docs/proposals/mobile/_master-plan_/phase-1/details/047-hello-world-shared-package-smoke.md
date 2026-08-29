# 047-hello-world-shared-package-smoke

**Master step:** 3.8
**Model (author + implement):** Auto
**Status:** done

## Scope

- Import a small symbol from `@podverse/helpers` on the hello-world screen (or adjacent module).
- Prove Metro resolves workspace package via compiled `dist/` after `build:packages`.
- Display or log a deterministic smoke value (e.g. helper constant or typed export) in dev.
- Document prerequisite: rebuild shared packages when Tier A sources change.

## Acceptance criteria

- Step 3.8 complete per [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md)
- Hello-world UI or dev log reflects successful `@podverse/helpers` import at runtime
- Metro bundling succeeds without pointing Metro at `packages/helpers/src`
- Failure mode documented: run `npm run build:packages` when import resolves to stale/missing dist
- No additional Tier A packages required beyond helpers for this smoke test

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §4 Tier D](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)
- [APPS-MOBILE.md § Metro monorepo configuration](/apps/mobile/APPS-MOBILE.md)
- [architecture-tier-dependencies](/.cursor/rules/architecture-tier-dependencies.mdc)

## Verification

```bash
./scripts/nix/with-env npm run build:packages
grep -rq '@podverse/helpers' apps/mobile/src
./scripts/nix/with-env npm run start -w apps/mobile
```
