# Feature: unify-main-and-management-db (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `unify-main-and-management-db-part-02.md`.

## Metadata

- Started: 2026-03-15
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/133
- Branch: chore/unify-main-and-management-db
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 1 - 2026-03-15

#### Prompt (Developer)

[First prompt will go here]

#### Key Decisions

- [Decision and rationale]

#### Files Changed

- [List of files]

---

### Session 2 - 2026-03-15

#### Prompt (Developer)

@podverse/docs/development/LOCAL-ENV-OVERRIDES.md:45-47 this documentation should be clearer since "read" and "read_write" shouldn't exist in either database now, more specific names should be used

#### Key Decisions

- Replaced generic `read`/`read_write` wording with explicit role names for both databases.
- Clarified that `local_db_init` creates/updates four distinct roles sourced from `infra/config/local/db.env`.

#### Files Changed

- `.llm/history/active/unify-main-and-management-db/unify-main-and-management-db-part-01.md`
- `docs/development/LOCAL-ENV-OVERRIDES.md`

---

### Session 3 - 2026-03-15

#### Prompt (Developer)

implement

#### Key Decisions

- Applied strict management-only env key rename from `POSTGRES_MANAGEMENT_*` / `SUPERUSER_MANAGEMENT_*` to `MANAGEMENT_POSTGRES_*` / `MANAGEMENT_SUPERUSER_*` with no compatibility aliases.
- Updated default DB owner usernames to `postgres_user_app` (main) and `postgres_user_management` (management).
- Updated local/alpha make and script consumers to use renamed variables end-to-end, including management init and superuser bootstrap flows.

#### Files Changed

- `.llm/history/active/unify-main-and-management-db/unify-main-and-management-db-part-01.md`
- `infra/config/env-templates/db.env.example`
- `infra/config/local/db.env`
- `scripts/local-env/setup.sh`
- `makefiles/local/Makefile.local.infra.mk`
- `makefiles/alpha/Makefile.alpha.infra.mk`
- `infra/database/management/init-scripts/01-create-users.sh`
- `scripts/management/create-superuser.sh`
- `scripts/management/create-superuser.mjs`
- `infra/k8s/scripts/create_management_db_secret.sh`
- `infra/k8s/base/db/management-init-scripts.configmap.yaml`
- `infra/k8s/base/management-api/deployment.yaml`
- `infra/k8s/base/management-api/configmap.yaml`
- `infra/k8s/scripts/create_db_secret.sh`
- `infra/docker/local/management-db/docker-compose.yml`
- `infra/docker/alpha/management-db/docker-compose.yml`
- `infra/docker/local/pgadmin/docker-compose.yml`
- `infra/docker/local/pgadmin/servers.json`
- `infra/config/env-templates/management-db.env.example`
- `infra/config/local/management-db.env`
- `docs/QUICKSTART.md`
- `infra/k8s/README.md`
- `dev/env-overrides/local/management-superuser.env.example`

---

### Session 4 - 2026-03-15

#### Prompt (Developer)

Rename Database to podverse_app and Superusers to postgres_user_app / postgres_user_management. Implement the plan as specified.

#### Key Decisions

- Database name: `podverse_main` → `podverse_app` everywhere; management stays `podverse_management`.
- Superuser env values: `POSTGRES_USER="postgres_user_app"`, `POSTGRES_MANAGEMENT_USER="postgres_user_management"` (replaced `postgres_app` / `postgres_management`).
- No backward-compatibility aliases.

#### Files Created/Modified

- `infra/config/env-templates/db.env.example`
- `scripts/local-env/setup.sh`
- `infra/docker/local/pgadmin/servers.json`
- `infra/docker/local/pgadmin/docker-compose.yml`
- `makefiles/local/Makefile.local.infra.mk`
- `infra/k8s/scripts/create_db_secret.sh`
- `infra/k8s/scripts/create_management_db_secret.sh`
- `scripts/management/create-superuser.mjs`
- `scripts/management/create-superuser.sh`
- `docs/QUICKSTART.md`
- `apps/api/.env.example`
- `apps/workers/.env.example`
- `.llm/history/active/unify-main-and-management-db/unify-main-and-management-db-part-01.md`

---

### Session 5 - 2026-03-15

#### Prompt (Developer)

do not allow an empty password. implement the plan.

#### Key Decisions

- Require non-empty `POSTGRES_MANAGEMENT_PASSWORD` via `: "${POSTGRES_MANAGEMENT_PASSWORD:?Missing POSTGRES_MANAGEMENT_PASSWORD}"` (fails when unset or empty).
- After creating management DB, run as app user: `ALTER USER <management_user> WITH PASSWORD '...'` with password escaped for SQL (single quotes doubled).
- Pass `POSTGRES_MANAGEMENT_PASSWORD` from both local and alpha Makefiles into the init script env.

#### Files Created/Modified

- `infra/database/management/init-scripts/01-create-users.sh`
- `makefiles/local/Makefile.local.infra.mk`
- `makefiles/alpha/Makefile.alpha.infra.mk`
- `.llm/history/active/unify-main-and-management-db/unify-main-and-management-db-part-01.md`

---

### Session 6 - 2026-03-15

#### Prompt (Developer)

No Escaping: Constrain Password Generation Instead — Implement the plan as specified.

#### Key Decisions

- Removed ESCAPED_PASS from init script; use raw POSTGRES_MANAGEMENT_PASSWORD. DB passwords must not contain single quotes; automatic generators emit hex-only.
- setup.sh: use generate_hex_32 for the five DB password variables (POSTGRES_READ_PASSWORD, POSTGRES_READ_WRITE_PASSWORD, POSTGRES_MANAGEMENT_PASSWORD, POSTGRES_MANAGEMENT_READ_PASSWORD, POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD).
- create_management_db_secret.sh: generate_password() uses openssl rand -hex 32 (hex-only); removed PASSWORD_LENGTH.
- db.env.example: added one-line note that DB passwords must not contain single quotes (auto-generated values comply).

#### Files Created/Modified

- `infra/database/management/init-scripts/01-create-users.sh`
- `scripts/local-env/setup.sh`
- `infra/k8s/scripts/create_management_db_secret.sh`
- `infra/config/env-templates/db.env.example`
- `.llm/history/active/unify-main-and-management-db/unify-main-and-management-db-part-01.md`

---

### Session 7 - 2026-03-15

#### Prompt (Developer)

Default to Auto-Gen for create_management_db_secret.sh — Implement the plan as specified.

#### Key Decisions

- Default AUTO_GEN=true so script auto-generates all passwords and uses default DB/user names; optional environment as first arg.
- Added --interactive flag to set AUTO_GEN=false for prompt-based flow when dev wants to supply own values.
- Kept --auto-gen as valid flag for backward compatibility with create_all_secrets_auto_gen.sh.
- README: documented default = auto-gen and --interactive for manual flow; updated Execution example.

#### Files Created/Modified

- `infra/k8s/scripts/create_management_db_secret.sh`
- `infra/k8s/README.md`
- `.llm/history/active/unify-main-and-management-db/unify-main-and-management-db-part-01.md`

---

## Related Resources

- [Link to PR]
- [Link to related issues]
