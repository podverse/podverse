# Plan 02 — seed + test_deps Make aliases

Read and implement detail
[077-e2e-api-db-seed](/docs/proposals/mobile/_master-plan_/details/077-e2e-api-db-seed.md).

## Work

1. In [`makefiles/local/Makefile.local.e2e.mk`](/makefiles/local/Makefile.local.e2e.mk), add:
   - `mobile_e2e_deps` → `e2e_deps` / `test_deps`
   - `mobile_e2e_seed` → `e2e_seed_web` (reuse web seed; do not invent a second seed script)
2. Keep existing `mobile_e2e_test` / `mobile:e2e:test` **without** requiring deps/seed.
3. In TEST-ENV (and briefly HOW-TO-RUN if needed), document:
   - When to run `make mobile_e2e_deps` + `make mobile_e2e_seed`
   - At least one seeded email/password from `tools/web/seed-e2e.mjs` for future 6.11 login
4. Optionally add `make help` / comment near mobile targets explaining API-backed vs UI-only.

## Done when

```bash
rg -n 'mobile_e2e_deps|mobile_e2e_seed' makefiles/local/Makefile.local.e2e.mk apps/mobile/e2e/
```

Mark master-plan step **5.18** and Appendix C **077** → `done`; detail header → `done`.
