# Plan 04 - Docs, Validation, and Cleanup

## Objective

Document the new monorepo-based deployment workflow and verify no lingering references to `podverse-ops` remain in Jenkins or ansible.

## Documentation Targets

- Legacy doc to update or migrate:
  - `/Users/mitcheldowney/repos/podverse-ops/docs/deploy/alpha/jenkins-deployment-steps-alpha.md`
- Monorepo docs (if consolidating):
  - `/Users/mitcheldowney/repos/podverse/docs/` (choose appropriate location for Jenkins/deploy notes)
- Jenkins pipeline README (if present):
  - `/Users/mitcheldowney/repos/podverse/pipelines/jenkins/alpha/README.md`

## Steps

- Update or migrate deployment docs to reference:
  - Repo: `podverse`
  - Checkout path: `/opt/podverse`
  - Paths: `infra/docker/`, `infra/config/`, `scripts/`, `pipelines/jenkins/`
  - Sparse checkout strategy and required paths list
- Run a path audit across `podverse-ansible` and monorepo Jenkinsfiles to confirm no `podverse-ops` paths remain.
- If `podverse-ops` repo is no longer used by Jenkins jobs, document deprecation and remove any references from Jenkins job setup instructions.
- Scope guard: only update alpha deployment docs; do not change legacy production docs.
- Document any new alpha-specific files created to avoid sandbox/legacy overlap.

## Validation Checklist

- Jenkins import works with sparse checkout and jobs run successfully.
- Ansible playbooks deploy config to `infra/config/{env}` paths.
- No job or role still references `/opt/podverse-ops`.
