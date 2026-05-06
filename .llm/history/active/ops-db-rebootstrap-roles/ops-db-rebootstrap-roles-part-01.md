# ops-db-rebootstrap-roles

**Started:** 2026-05-06  
**Author:** Cursor Agent  
**Context:** Add ops CronJob to re-apply DB role GRANTs after `DROP SCHEMA public` so linear migrate jobs succeed.

### Session 1 - 2026-05-06

#### Prompt (Agent)

Ops job: `ops-db-rebootstrap-roles` — Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

#### Key Decisions

- New suspended CronJob `ops-db-rebootstrap-roles` runs four `psql` phases (app owner, app migrator, management owner, management migrator) mirroring `0001`/`0002` GRANT blocks only; no `CREATE ROLE` / `CREATE DATABASE`.
- `envFrom`: `podverse-db-opaque` + `podverse-management-db-opaque`; `DB_HOST`/`DB_PORT` set to `podverse-db` / `5432`.
- Documented drop → rebootstrap → migrate → verify in `infra/k8s/INFRA-K8S.md`.

#### Files Created/Modified

- `infra/k8s/base/ops/db-rebootstrap-roles.cronjob.yaml` (new)
- `infra/k8s/base/ops/kustomization.yaml`
- `infra/k8s/INFRA-K8S.md`
