# podverse-test-db-init-linear-migrations

## Started

2026-04-30

---

### Session 1 - 2026-04-30

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/14.txt:8-371 debug

#### Key Decisions

- `test_db_init` passed `DB_USER`/`DB_PASSWORD`/`DB_NAME` into `run-linear-migrations.sh`, which ignores those; it uses `DB_APP_MIGRATOR_*` / `DB_APP_NAME` or sources `infra/config/local/db.env`. That led to connecting to the test Postgres on 5732 as `podverse_app_migrator` with the dev password from `db.env` → authentication failure.
- Makefile now passes `DB_APP_MIGRATOR_USER`/`PASSWORD`/`DB_APP_NAME` and management equivalents using `TEST_PG_USER`/`TEST_PG_PASSWORD`/`TEST_*_DB_NAME` so migrations always use the test container superuser and never pull migrator creds from local `db.env`.

#### Files Modified

- makefiles/local/Makefile.local.test.mk
