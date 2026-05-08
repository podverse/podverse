# Phase 10 — Verify and docs

Final sweep across the monorepo.

## Scope

- Update `apps/management-api/APPS-MANAGEMENT-API.md` endpoint listing to match
  the new resource map (drop `/admin-account`, add `/admins/invite-link/redeem`,
  rename feeds/products/workers/stats sections).
- Confirm no leftover references to `/feed-operations`, `/admin-account`,
  `/worker-commands`, `/product/`, `/stats/top/`, `/stats/detail/`,
  `/stats/search/`, or `change-password` in any markdown, scripts, or CI.
- Run lint, typecheck, build, integration tests, full management-web E2E.

## Steps

1. Edit `apps/management-api/APPS-MANAGEMENT-API.md` endpoint list.
2. `rg` for each old path token across the repo and remove or update each hit.
3. Run from repo root:
   - `npm run lint`
   - `npm run build:packages`
   - `npm run build -w apps/management-api`
   - `npm run build -w apps/management-web`
   - `npm run test:e2e:api`
   - `make e2e_test_management_web_report`

## Key files

- `apps/management-api/APPS-MANAGEMENT-API.md`
- `makefiles/local/e2e-spec-order-management-web.txt`
- Any docs under `docs/` that reference renamed paths.

## Verification

- All commands above succeed.
- The following ripgrep returns 0 hits in `apps` and `docs`:

```bash
rg "/admin-account|/feed-operations|/worker-commands|/product/|/stats/top|/stats/detail|/stats/search|change-password" apps docs
```
