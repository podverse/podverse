### Session 1 - 2026-02-19

#### Prompt (Developer)

I want you to create a new k8s base manifests based on infra/k8s/base/web/ for apps/management-web.

add the overlay for alpha

#### Key Decisions

- Mirrored the web base manifests with management-web naming, ports (3100/3101), and runtime-config sidecar settings.
- Used management-web runtime env defaults from apps/management-web/.env.example and local compose configs.
- Kept ArgoCD link placeholder and alpha environment label to match existing web base conventions.
- Added alpha overlay and ArgoCD child app for management-web following the web/api alpha patterns.
- Set alpha overlay image tags to the current alpha version placeholders used by other alpha kustomizations.

#### Files Modified

- infra/k8s/base/management-web/configmap.yaml
- infra/k8s/base/management-web/deployment.yaml
- infra/k8s/base/management-web/service.yaml
- infra/k8s/base/management-web/kustomization.yaml
- infra/k8s/alpha/management-web/kustomization.yaml
- infra/k8s/alpha/management-web/deployment-link-patch.yaml
- infra/k8s/alpha/apps/management-web.yaml
