# Plan 03 - podverse-ansible Monorepo Path Updates

## Objective

Update podverse-ansible to clone the `podverse` monorepo (with sparse checkout) and place env/config files under the monorepo `infra/config/` hierarchy.

## Sub-Plans

This plan is broken into 5 sub-plans:

- [01-repo-checkout-and-sparse.md](./01-repo-checkout-and-sparse.md) - Update `podverse_ops` role for monorepo checkout
- [02-alpha-config-destinations.md](./02-alpha-config-destinations.md) - Update alpha role destination paths
- [03-role-files-hierarchy.md](./03-role-files-hierarchy.md) - Move role `files/` to match new hierarchy
- [04-alpha-assets-check.md](./04-alpha-assets-check.md) - Verify alpha assets (Firebase keys)
- [05-validation.md](./05-validation.md) - End-to-end validation

## Key Files (roles to update)

- Repo checkout: `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_ops/tasks/main.yaml`
- Alpha env roles:
  - `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_api_conf/tasks/main.yml`
  - `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_db_conf/tasks/main.yml`
  - `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_keyvaldb_conf/tasks/main.yml`
  - `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_management_api_conf/tasks/main.yml`
  - `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_management_db_conf/tasks/main.yml`
  - `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_mq_conf/tasks/main.yml`
  - `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_alpha_workers_conf/tasks/main.yml`

## Out of Scope (do not modify)

- Sandbox roles and production roles must remain untouched.

## Steps

- Update `podverse_ops` role to clone `https://github.com/podverse/podverse.git` into `/opt/podverse` instead of `/opt/podverse-ops`.
  - Implement sparse checkout (same paths as Jenkins).
  - Update the legacy symlink `/home/mitch/podverse-ops` to `/home/mitch/podverse` (if still needed).
- Update all role copy destinations from `/opt/podverse-ops/config/...` to `/opt/podverse/infra/config/{env}/...`.
  - Alpha only → `/opt/podverse/infra/config/alpha/`
- Update role `files/` directories to mirror the new destination hierarchy (e.g., move from `roles/*/files/opt/podverse-ops/config/...` to `roles/*/files/opt/podverse/infra/config/...` so Ansible copies match).
- Verify any non-config assets:
  - Firebase keys currently staged under `roles/*/files/opt/podverse-ops/config/google/...`
  - Manticore config under `roles/podverse_prod_db/files/opt/podverse-ops/manticore/...`
  - Alpha-only assets should move; production assets must remain untouched.
- If sandbox and legacy share env file names/paths with alpha, add new alpha-specific files under `roles/*/files/opt/podverse/infra/config/alpha/` and update tasks to use them.

## Validation

- Run ansible playbook(s) for alpha/sandbox/prod in a dry-run or staging environment.
- Confirm env files end up in `infra/config/{env}/` and are picked up by Jenkins/Makefile targets.
