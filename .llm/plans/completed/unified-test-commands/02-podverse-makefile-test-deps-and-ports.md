# Phase 02 — Podverse: Makefile `test_deps`, ports, DB init

## Prerequisites

- [`00-master-plan.md`](./00-master-plan.md) — Podverse ports **5732** (Postgres), **6679** (Valkey), containers `podverse_test_postgres`, `podverse_test_valkey`. Do not collide with Metaboost **5632** / **6579** or `metaboost_test_*`.

## Goal

Add a **Podverse-local** Make layer (pattern from Metaboost [`Makefile.local.test.mk`](../../../../../metaboost/makefiles/local/Makefile.local.test.mk)) so:

- `make test_deps` starts test Postgres + Valkey on Podverse-only ports, creates **app** and **management** test databases with roles and schema aligned to Podverse’s infra.
- `make help_test` / `make test_clean` mirror Metaboost ergonomics.
- E2E follow-up phases can depend on `e2e_deps` → `test_deps` like Metaboost.

## Canonical test DB initialization (decide before coding Make targets)

Podverse does **not** mirror Metaboost’s single `infra/k8s/base/db/postgres-init/` folder layout wholesale. Before implementing `test_db_init` / `test_db_init_management`, pick **one** authoritative path:

| Approach | Notes |
| -------- | ----- |
| **Canonical bootstrap SQL snapshot** | Reuse canonical SQL from [`infra/k8s/base/db/source/`](../../../../infra/k8s/base/db/source/) applied with `psql` into fresh `podverse_app_test` / `podverse_management_test`, then run forward-only migrations as needed. |
| **Ordered source SQL** | Apply [`infra/k8s/base/db/source/*.sql`](../../../../infra/k8s/base/db/source/) / shell bootstrap in **documented order**, consistent with [`infra/docker/local/db/docker-compose.yml`](../../../../infra/docker/local/db/docker-compose.yml) mounts. |
| **Parity with dev docker-init** | Mirror what local dev Postgres loads on first boot so test stack matches developer expectations. |

This decision is the **main technical risk** for phase 02; document it in Makefile comments or `docs/testing/` once chosen.

## Reference paths in Podverse

- Existing local DB compose: [`infra/docker/local/db/docker-compose.yml`](../../../../infra/docker/local/db/docker-compose.yml) (dev **5432** — test stack must be separate).
- K8s / SQL sources: [`infra/k8s/base/db/`](../../../../infra/k8s/base/db/), [`infra/k8s/base/db/source/`](../../../../infra/k8s/base/db/source/).
- Database scripts: [`scripts/database/`](../../../../scripts/database/) (verify-migrations, combine patterns).
- Makefile includes: check [`Makefile`](../../../../Makefile) and [`makefiles/local/Makefile.local.infra.mk`](../../../../makefiles/local/Makefile.local.infra.mk) for how local Make is structured.

## Implementation steps

1. **Root Makefile** — Include a new file e.g. `makefiles/local/Makefile.local.test.mk` from the existing local Makefile entrypoint (follow pattern used for `Makefile.local.infra.mk`).

2. **Variables** — Define with `?=` so developers can override:

   - `TEST_DB_PORT ?= 5732`
   - `TEST_VALKEY_PORT ?= 6679`
   - `TEST_PG_CONTAINER ?= podverse_test_postgres`
   - `TEST_VALKEY_CONTAINER ?= podverse_test_valkey`
   - Test DB names e.g. `podverse_app_test`, `podverse_management_test` (align with classification/env naming used by apps).

3. **`test_postgres_up`** — Same idempotent Docker pattern as Metaboost: create container if missing, start if stopped, wait for `pg_isready`. Bind **127.0.0.1:$(TEST_DB_PORT):5432**.

4. **`test_valkey_up`** — Same pattern; image/version consistent with Podverse prod/dev (e.g. Valkey 7 alpine).

5. **`test_db_init` / `test_db_init_management`** — Apply Podverse schema using the **canonical approach** chosen above (not blindly copying Metaboost path names). Read Metaboost `Makefile.local.test.mk` only for **docker exec / psql patterns**, not file paths.
   - Ensure role passwords and DB names match what `scripts/check-test-requirements.mjs` (phase 03) and API test setup will expect.

6. **`test_deps`** — Depends on Postgres + Valkey + both DB inits. **Mailpit:** omit from v1 foundation unless a smoke test requires outbound mail; when added, use **host ports distinct from Metaboost** (see master plan).

7. **`help_test`** — Print ports, container names, `make test_clean`, and pointer to `npm run test:e2e:api` once wired.

8. **`test_clean`** — Stop/remove test containers or document volumes; align with team preference (Metaboost leaves data unless cleaned).

## Documentation

- Short subsection in Podverse [`AGENTS.md`](../../../../AGENTS.md) or existing docs tree per documentation conventions — **do not add a second root README**; use e.g. `docs/testing/PODVERSE-LOCAL-TEST-DEPS.md` if a dedicated doc is needed.

## Verification

```bash
make test_deps
make test_db_list   # if implemented: list databases in podverse_test_postgres
docker ps --filter name=podverse_test_
# Confirm 127.0.0.1:5732 and :6679 published; Metaboost containers can still run on 5632/6579
```

## Definition of done

- With Metaboost `make test_deps` already running, Podverse `make test_deps` **does not fail** due to port conflicts.
- Test databases exist and match Podverse schema expectations for upcoming API Vitest setup (phase 04).
