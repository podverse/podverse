## Plan 03.02 - Alpha Config Destination Updates

### Objective

Update alpha config role tasks to deploy files under the monorepo hierarchy: `/opt/podverse/infra/config/alpha/`.

### Scope

- In scope: alpha config roles only.
- Out of scope: sandbox and production roles.

### Files to Update

- `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_api_conf/tasks/main.yml`
- `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_db_conf/tasks/main.yml`
- `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_keyvaldb_conf/tasks/main.yml`
- `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_management_api_conf/tasks/main.yml`
- `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_management_db_conf/tasks/main.yml`
- `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_mq_conf/tasks/main.yml`
- `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_workers_conf/tasks/main.yml`

### Steps

1. Replace any copy destinations under `/opt/podverse-ops/config/...` with `/opt/podverse/infra/config/alpha/...`.
2. Ensure any directory creation tasks align with the new `infra/config/alpha` path.
3. If tasks reference role `files/` sources by absolute paths, update them to the new hierarchy (see Plan 03.03 for file moves).

### Validation

- After a dry run, confirm files land under `/opt/podverse/infra/config/alpha/`.
- Confirm no sandbox or production paths are modified.

### Notes

- Keep updates alpha-only.
- Parent plan: [00-overview.md](./00-overview.md)
