### Session 1 - 2026-02-19

#### Prompt (Developer)

I to take what is in infra/docker/alpha/management-api want and make a management-api in infra/k8s/base like what is in infra/k8s/base/management-web

#### Key Decisions

- Modeled the base Kubernetes resources after `infra/k8s/base/management-web` and aligned config data with `apps/management-api/.env.example` and the alpha docker compose settings.
- Added a dedicated ConfigMap and wired it into the Deployment with a placeholder secret reference for sensitive values.

#### Files Modified

- infra/k8s/base/management-api/kustomization.yaml
- infra/k8s/base/management-api/configmap.yaml
- infra/k8s/base/management-api/service.yaml
- infra/k8s/base/management-api/deployment.yaml
