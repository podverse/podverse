# 077-e2e-api-db-seed

**Master step:** 5.18
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Wire mobile API-backed E2E to existing `make test_deps` (Postgres 5732 / Valkey 6679).
- **Reuse** [`tools/web/seed-e2e.mjs`](/tools/web/seed-e2e.mjs) via `make e2e_seed_web` for
  deterministic accounts and fixtures (locked decision: no parallel mobile seed script in this
  phase).
- Document which seeded credentials Maestro auth flows will use (point at web seed constants /
  emails already inserted by `seed-e2e.mjs`).
- Add thin Make targets such as `mobile_e2e_deps` / `mobile_e2e_seed` that alias or depend on
  `e2e_deps` + `e2e_seed_web` without forcing them for UI-only `mobile:e2e:test`.

## Locked decisions

| Item                      | Decision                                          |
| ------------------------- | ------------------------------------------------- |
| Infra                     | Share `make test_deps` with web                   |
| Seed script               | Reuse `tools/web/seed-e2e.mjs` / `e2e_seed_web`   |
| Default `mobile:e2e:test` | Remains UI-only (no auto `test_deps`)             |
| API-backed flows          | Docs + optional Make wrappers require deps + seed |

## Acceptance criteria

- `mobile_e2e_deps` and `mobile_e2e_seed` (or equivalent) exist in
  [Makefile.local.e2e.mk](/makefiles/local/Makefile.local.e2e.mk)
- TEST-ENV / HOW-TO-RUN list exact operator commands for API-backed runs
- Documented mapping: at least one seeded email/password for future login Maestro

## Verification

```bash
rg -n 'mobile_e2e_deps|mobile_e2e_seed|e2e_seed_web' makefiles/local/Makefile.local.e2e.mk apps/mobile/e2e/
```

## Depends on

- 5.17 / 076

## Blocks

- 5.19–5.20, 6.11, 6.12
