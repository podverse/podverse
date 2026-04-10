### Metadata

- Started: 2026-04-03
- Author: Agent
- Context: Drop numeric prefixes on k8s db `source/` artifacts and align consumers

### Session 1 - 2026-04-03

#### Prompt (Developer)

did you update the prefixes like i asked to all the files that need it?

#### Key Decisions

- Prior pass only touched **Boilerplate** `infra/k8s/base` manifests; **Podverse** `infra/k8s/base/db/source/` still had `00_` / `01_` names — completed here.
- Renamed combined SQL and copied init scripts to **`init_database.sql`**, **`init_management_database.sql`**, **`create_app_db_users.sh`**, **`create_management_users.sh`**.
- **`configMapGenerator`** keys match those basenames; StatefulSet **`subPath`** matches. **`mountPath`** uses **`a_`…`d_`** prefixes (letters, not digits) for lex order in **`docker-entrypoint-initdb.d/`**.
- **`combine-migrations.sh`** / **`verify-migrations-combined.sh`** and local/alpha **db** docker-compose host paths updated. Canonical **`infra/database/.../01-create-users.sh`** templates unchanged (container mount targets still **`01-create-users.sh`**).

#### Files Created/Modified

- infra/k8s/base/db/source/\* (renamed four files)
- infra/k8s/base/db/kustomization.yaml
- infra/k8s/base/db/statefulset.yaml
- scripts/database/combine-migrations.sh
- scripts/database/verify-migrations-combined.sh
- infra/docker/local/db/docker-compose.yml
- infra/docker/alpha/db/docker-compose.yml
- .cursor/rules/infra-k8s.mdc
- .llm/history/active/k8s-db-source-filenames/k8s-db-source-filenames-part-01.md

### Session 2 - 2026-04-10

#### Prompt (Developer)

@podverse/infra/docker/alpha/db/docker-compose.yml:21-24 these files should be prefixed with 0000* or 0001* etc since they are required for the db schema and we want to be able to handle migrations over time in a logical sequence

#### Key Decisions

- Renamed `infra/k8s/base/db/source/` artifacts to **four-digit prefixes** in Postgres init order:
  `0000_create_app_db_users.sh`, `0001_init_database.sql`, `0002_create_management_users.sh`,
  `0003_init_management_database.sql`.
- **Kustomize** ConfigMap keys and StatefulSet **subPath** / **mountPath** use the same names;
  **docker-compose** host paths updated; container paths under `/opt/database/...` unchanged for Make targets.
- **`combine-migrations.sh`** / **`verify-migrations-combined.sh`** read/write the prefixed combined SQL paths;
  scripts bumped to **Version: 4**.

#### Files Created/Modified

- infra/k8s/base/db/source/0000_create_app_db_users.sh (renamed from create_app_db_users.sh)
- infra/k8s/base/db/source/0001_init_database.sql (renamed from init_database.sql)
- infra/k8s/base/db/source/0002_create_management_users.sh (renamed from create_management_users.sh)
- infra/k8s/base/db/source/0003_init_management_database.sql (renamed from init_management_database.sql)
- infra/k8s/base/db/kustomization.yaml
- infra/k8s/base/db/statefulset.yaml
- infra/docker/alpha/db/docker-compose.yml
- infra/docker/local/db/docker-compose.yml
- scripts/database/combine-migrations.sh
- scripts/database/verify-migrations-combined.sh
- .cursor/rules/infra-k8s.mdc
- .llm/history/active/k8s-db-source-filenames/k8s-db-source-filenames-part-01.md

### Session 3 - 2026-04-10

#### Prompt (Developer)

rename to 0002_create_management_db_users.sh for consistency iwth 0000_create_app_db_users.sh

the volumes should also be assigned in sequential order if that is logical

#### Key Decisions

- Renamed **`0002_create_management_users.sh`** → **`0002_create_management_db_users.sh`** (parity with `0000_create_app_db_users.sh`); updated Kustomize keys, StatefulSet **mountPath**/**subPath**, **`combine-migrations.sh`** output path, and docker-compose host paths.
- **Docker Compose** service `volumes` lists reordered to **0000 → 0001 → seeds (local only) → 0002 → 0003 → management seeds** so prefixed source files appear in numeric sequence (alpha compose has no main seed mount).

#### Files Created/Modified

- infra/k8s/base/db/source/0002_create_management_db_users.sh (renamed from 0002_create_management_users.sh)
- infra/k8s/base/db/kustomization.yaml
- infra/k8s/base/db/statefulset.yaml
- infra/docker/local/db/docker-compose.yml
- infra/docker/alpha/db/docker-compose.yml
- scripts/database/combine-migrations.sh
- .llm/history/active/k8s-db-source-filenames/k8s-db-source-filenames-part-01.md
