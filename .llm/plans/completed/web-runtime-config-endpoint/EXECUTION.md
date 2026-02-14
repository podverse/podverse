# Web Runtime Config Endpoint - Execution Order

## Phase Order

1. [01-runtime-config-contract.md](01-runtime-config-contract.md)
2. [02-endpoint-bootstrap.md](02-endpoint-bootstrap.md)
3. [03-validation-updates.md](03-validation-updates.md)
4. [04-docker-make-ci.md](04-docker-make-ci.md)
5. [05-infra-ansible-k8s.md](05-infra-ansible-k8s.md)
6. [06-docs.md](06-docs.md)

## Verification (per phase)

- `npm run lint` in repo root
- `npm run build:packages` in repo root
- `npm run build` in `apps/web` and `apps/management-web`

## Rollback Notes

- If sidecar runtime-config causes issues, revert to build-time env injection and
  remove the sidecar from Docker/K8s/Ansible configs.
