### Session 1 - 2026-05-02

#### Prompt (Developer)

add the more durable fixes. make sure podverse and metaboost have it if they could benefit from it

#### Key Decisions

- Add API startup migration-readiness init container in Podverse Kubernetes base deployment
  to wait for app migration history availability before launching the API container.
- Use read-only app DB credentials and table/row checks against `linear_migration_history`
  to reduce race windows during fresh bootstrap and migration runs.

#### Files Modified

- `infra/k8s/base/api/deployment.yaml`
- `.llm/history/active/api-migration-startup-gate/api-migration-startup-gate-part-01.md`

### Session 2 - 2026-05-02

#### Prompt (Developer)

if you didn't already you should add corresponding changes to management for podverse and
metaboost and k.podcastdj.com and metaboost.cc if they are relevant so that migrations are
handling properly for both api and mgmt api. if you already did this or don't think the work
applies to mgmt, then do nothing

#### Key Decisions

- Added `wait-management-migrations` init container to
  `infra/k8s/base/management-api/deployment.yaml` so Podverse management-api waits for
  management DB migration history before startup.
- Used `podverse-management-db-opaque` secrets with `DB_MANAGEMENT_READ_*` + `DB_MANAGEMENT_NAME`
  and checks for `linear_migration_history` table existence and non-empty rows.
- Added matching overlay patch in `k.podcastdj.com/apps/podverse-alpha/management-api` because
  that environment pins an older Podverse base ref and would not automatically inherit the base
  startup gate yet.

#### Files Modified

- `infra/k8s/base/management-api/deployment.yaml`
- `.llm/history/active/api-migration-startup-gate/api-migration-startup-gate-part-01.md`
