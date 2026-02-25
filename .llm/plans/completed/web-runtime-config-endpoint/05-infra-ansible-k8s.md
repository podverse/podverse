# Subplan 05 - Infra, Ansible, and K8s

## Objective

Ensure deploy-time env provisioning supplies runtime-config values to the
**sidecar containers** for both apps.

## Tasks

1. Update Ansible roles to provision runtime `.env.production` for sidecars.
2. Update K8s Deployments to add a sidecar container and mount env values.
3. Ensure sidecar port is not exposed publicly (no Service/Ingress).
4. Confirm app reads config from sidecar over `localhost`.

## Target Files (expected)

- `infra/k8s/base/web/01-configmap.yaml`
- `infra/k8s/base/web/03-deployment.yaml`
- `infra/k8s/base/management-web/*` (if present)
- `../podverse-ansible/roles/podverse_sandbox_srv_conf/tasks/main.yaml`
- `../podverse-ansible/roles/podverse_prod_srv/tasks/main.yaml`

## Notes

- Keep env handling consistent between Ansible and K8s deployments.
- Sidecar should be internal-only and share pod network namespace.
