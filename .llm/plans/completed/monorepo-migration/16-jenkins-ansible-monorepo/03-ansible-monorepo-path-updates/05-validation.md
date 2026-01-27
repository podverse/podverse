## Plan 03.05 - Validation

### Objective

Validate that alpha configuration files and assets land in the new monorepo `infra/config/alpha` hierarchy and are compatible with Jenkins and Makefile targets.

### Scope

- In scope: alpha env validation only.
- Out of scope: sandbox and production validation.

### Steps

1. Run the alpha ansible playbook(s) in a dry-run or staging environment.
2. Confirm env files are deployed under `/opt/podverse/infra/config/alpha/`.
3. Confirm Jenkins/Makefile targets read from the new `infra/config/alpha` paths.
4. Verify no sandbox or production path changes were applied.

### Acceptance Criteria

- Alpha configs exist under `/opt/podverse/infra/config/alpha/`.
- Jenkins job configuration and Makefile targets resolve to the new paths.
- No changes observed in sandbox or production files.

### Notes

- Parent plan: [00-overview.md](./00-overview.md)
