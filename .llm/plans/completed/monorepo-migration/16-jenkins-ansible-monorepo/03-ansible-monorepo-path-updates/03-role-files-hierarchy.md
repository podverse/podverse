## Plan 03.03 - Role Files Hierarchy Updates

### Objective

Move role `files/` content to mirror the new destination hierarchy under `/opt/podverse/infra/config/alpha/` so Ansible `copy` sources match updated destinations.

### Scope

- In scope: alpha-only files in `roles/*/files/`.
- Out of scope: sandbox and production role files.

### Files/Directories to Update

- Any role files currently under:
  - `/Users/mitcheldowney/repos/podverse-ansible/roles/*/files/opt/podverse-ops/config/...`
- New location target:
  - `/Users/mitcheldowney/repos/podverse-ansible/roles/*/files/opt/podverse/infra/config/alpha/...`

### Steps

1. For each alpha role, move files from `roles/*/files/opt/podverse-ops/config/...` to `roles/*/files/opt/podverse/infra/config/alpha/...`.
2. Ensure the directory structure under `roles/*/files/` mirrors the new destination paths.
3. If sandbox or legacy share file names/paths with alpha, create alpha-specific copies under the new `infra/config/alpha` path and update tasks to use them.

### Validation

- Confirm each alpha role task references a file path that exists under the new `roles/*/files/opt/podverse/infra/config/alpha/...`.
- Verify no files were moved for sandbox or production roles.

### Notes

- Use alpha-specific folders when paths collide with legacy or sandbox assets.
- Parent plan: [00-overview.md](./00-overview.md)
