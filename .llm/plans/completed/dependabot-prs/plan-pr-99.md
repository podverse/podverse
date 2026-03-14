# Plan: PR #99 — ESLint 9 → 10

**PR**: [podverse/podverse#99](https://github.com/podverse/podverse/pull/99) — chore(deps): bump eslint from 9.39.2 to 10.0.1

**Scope**: Root and workspace `package.json` (eslint + related). ESLint 10 removes eslintrc (flat config only), tightens Node (^20.19.0 || ^22.13.0 || >=24). May require config migration.

## Steps

1. Check out or apply PR #99 (e.g. `git fetch origin pull/99/head:pr-99 && git merge pr-99` or apply patch from GitHub).
2. If the repo still uses `.eslintrc.*`, migrate to flat config (`eslint.config.js`) per ESLint 10; update `typescript-eslint` if needed for compatibility.
3. Run `npm install` in worktree root.
4. **Build and verify**: From repo root run `npm run build:packages` then `npm run lint`. Fix any new lint or type errors introduced by the upgrade. Repeat until both pass.

## Final step

Ensure everything builds and lint passes.
