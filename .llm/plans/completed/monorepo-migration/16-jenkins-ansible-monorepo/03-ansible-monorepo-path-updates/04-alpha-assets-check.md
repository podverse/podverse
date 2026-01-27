## Plan 03.04 - Alpha Assets Verification

### Objective

Verify alpha-only non-config assets are moved to the new monorepo config hierarchy, while keeping production assets untouched.

### Scope

- In scope: alpha-only assets in `roles/*/files/opt/podverse-ops/config/...`.
- Out of scope: production assets (must remain unchanged).

### Areas to Check

- Firebase keys currently staged under:
  - `roles/*/files/opt/podverse-ops/config/google/...`
- Production-only assets that must remain untouched:
  - `roles/podverse_prod_db/files/opt/podverse-ops/manticore/...`

### Steps

1. Identify alpha-only assets under `roles/*/files/opt/podverse-ops/config/...`.
2. Move alpha-only assets to `roles/*/files/opt/podverse/infra/config/alpha/...` in the same relative structure.
3. Confirm production assets remain in their existing locations and are not referenced by alpha roles.

### Validation

- Alpha playbooks reference assets under `/opt/podverse/infra/config/alpha/...`.
- Production role file paths remain unchanged.

### Notes

- Keep all changes restricted to alpha scope.
- Parent plan: [00-overview.md](./00-overview.md)
