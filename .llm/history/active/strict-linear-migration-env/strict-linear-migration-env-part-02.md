# strict-linear-migration-env

## Metadata

- Started: 2026-04-29
- Author: LLM session

### Session 11 - 2026-04-29

#### Prompt (Developer)

@podverse/infra/k8s/base/ops/kustomization.yaml:22 i see you changed these from v1 to v2. why? we hadn't finalized v1 yet, so i think you could just continue using v1 and make changes within it as needed instead of a new v2 sha

#### Key Decisions

- Reverted `MIGRATION_BUNDLE_SHA` from `linear-migrations-v2` to `linear-migrations-v1` in the ops kustomization to avoid unnecessary bundle-version churn before v1 finalization.
- Kept the kustomize hash-bump mechanism itself intact; only the literal version token changed back to the requested value.
- Confirmed this was a single-reference change in Podverse infra k8s ops config.

#### Files Created/Modified

- infra/k8s/base/ops/kustomization.yaml

### Session 12 - 2026-04-29

#### Prompt (Developer)

@podverse/scripts/database/run-postgres-bootstrap-in-container.sh:36-44 also whenever there are situations where there will be lists of db

name
user
password

it should be sorted in that order, with name preceding the user, and user preceding the password

#### Key Decisions

- Reordered bootstrap container env var lists to keep `name` before `user` and `user` before `password` wherever those triplets are present.
- Preserved canonical role ordering while applying the new triplet ordering rule: `owner`, `migrator`, `read_write`, `read`.
- Applied the same ordering pattern to both app and management sections in `run-postgres-bootstrap-in-container.sh`.

#### Files Modified

- scripts/database/run-postgres-bootstrap-in-container.sh

### Session 13 - 2026-04-29

#### Prompt (Developer)

Management DB grants: migrator session (Podverse)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Split Podverse `0002_create_management_db_users.sh` into owner block (CONNECT + migrator CREATE on `public`) and migrator block (USAGE on schema for runtime roles, ALL TABLES/SEQUENCES `GRANT`, `ALTER DEFAULT PRIVILEGES`), mirroring `0001_create_app_db_users.sh` so migrator-owned schema objects grant read/read-write correctly.
- Documented migrator-session grants in `docs/operations/DB-USERS.md`.

#### Files Modified

- infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh
- docs/operations/DB-USERS.md
