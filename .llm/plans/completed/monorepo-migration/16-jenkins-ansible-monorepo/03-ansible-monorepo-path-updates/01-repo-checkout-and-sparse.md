## Plan 03.01 - Repo Checkout and Sparse Checkout

### Objective

Update the `podverse_ops` role to clone the `podverse` monorepo into `/opt/podverse` with sparse checkout, and adjust any legacy symlink if still required.

### Scope

- In scope: alpha-only deployment paths in `podverse-ansible`.
- Out of scope: sandbox and production roles.

### Files to Update

- `/Users/mitcheldowney/repos/podverse-ansible/roles/podverse_ops/tasks/main.yaml`

### Steps

1. Change the repository URL to `https://github.com/podverse/podverse.git`.
2. Update the checkout destination from `/opt/podverse-ops` to `/opt/podverse`.
3. Implement sparse checkout using the same paths defined for Jenkins (from the Jenkins plan).
4. If still used, update the legacy symlink from `/home/mitch/podverse-ops` to `/home/mitch/podverse`.
5. Ensure the role continues to clean the checkout before sparse checkout operations (if present).

### Validation

- Confirm `/opt/podverse` contains only the sparse paths after the role runs.
- If the symlink exists, confirm it points at `/home/mitch/podverse`.

### Notes

- Keep changes limited to alpha deployments.
- Parent plan: [00-overview.md](./00-overview.md)
