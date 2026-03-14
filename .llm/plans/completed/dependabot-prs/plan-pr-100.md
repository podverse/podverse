# Plan: PR #100 — isomorphic-dompurify 2 → 3

**PR**: [podverse/podverse#100](https://github.com/podverse/podverse/pull/100) — chore(deps): bump isomorphic-dompurify from 2.36.0 to 3.0.0

**Scope**: Apps/packages that depend on `isomorphic-dompurify`. v3: ESM, named exports, `clearWindow()` for server memory leaks, no `global.DOMPurify`, Node ^20.19.0 || ^22.12.0 || >=24.

## Steps

1. Check out or apply PR #100.
2. Update any imports: prefer named imports (e.g. `sanitize`, `clearWindow`) if used; ensure no reliance on `global.DOMPurify`.
3. For long-running server usage (e.g. API/workers), consider calling `clearWindow()` where appropriate (e.g. after response or batch).
4. Run `npm install`.
5. **Build and verify**: `npm run build:packages` then `npm run lint`. Fix regressions. Optionally smoke-test web and API.

## Final step

Ensure everything builds and lint passes.
