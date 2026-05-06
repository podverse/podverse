# Ops DB drop both + full rebootstrap bootstrap

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Implement ops K8s jobs to drop `public` on app + management DBs and replace GRANT-only rebootstrap with full `0001`/`0002`-equivalent script over TCP.

---

### Session 1 - 2026-05-06

#### Prompt (Developer)

Ops: drop both DBs + full bootstrap prep

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `infra/k8s/base/ops/source/database/runner/rebootstrap-full-bootstrap.sh` mirroring `0001_create_app_db_users.sh` and `0002_create_management_db_users.sh` with `PGHOST`/`PGPORT`/`PGPASSWORD` per connection role.
- Included the script in existing `podverse-ops-migration-scripts` ConfigMap (`kustomization.yaml` files list) so `ops-db-rebootstrap-roles` mounts `/opt/scripts/database` like migrate jobs.
- Extended `ops-db-drop-everything` to both secrets + two `psql` DROP/CREATE `public` calls; Version 4.
- Replaced inline GRANT-only bash in `ops-db-rebootstrap-roles` with `bash /opt/scripts/database/rebootstrap-full-bootstrap.sh`; Version 2; added migration-scripts volume mount.

#### Files Created/Modified

- `infra/k8s/base/ops/source/database/runner/rebootstrap-full-bootstrap.sh`
- `infra/k8s/base/ops/kustomization.yaml`
- `infra/k8s/base/ops/db-rebootstrap-roles.cronjob.yaml`
- `infra/k8s/base/ops/db-drop-everything.cronjob.yaml`
- `infra/k8s/INFRA-K8S.md`
- `.llm/history/active/ops-db-drop-rebootstrap-full/ops-db-drop-rebootstrap-full-part-01.md`
