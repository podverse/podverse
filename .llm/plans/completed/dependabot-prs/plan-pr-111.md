# Plan: PR #111 — production-minor-patch group (9 updates)

**PR**: [podverse/podverse#111](https://github.com/podverse/podverse/pull/111) — chore(deps): bump the production-minor-patch group with 9 updates

**Scope**: firebase-admin, axios, pg, podverse-partytime, express-rate-limit, ioredis, nodemailer, react-icons, react-virtuoso (minor/patch bumps across apps/packages/tools).

## Steps

1. Check out or apply PR #111.
2. Run `npm install`.
3. **Build and verify**: `npm run build:packages` then `npm run lint`. Run a quick smoke test (e.g. `npm run dev:api` or `npm run dev:web`) if any updated package is critical to runtime.

## Final step

Ensure everything builds and lint passes.
