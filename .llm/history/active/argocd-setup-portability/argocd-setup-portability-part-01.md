# argocd-setup-portability

## Started

2026-05-03

## Context

Portable Argo CD setup model for Podverse/Metaboost monorepos and GitOps repos.

### Session 1 - 2026-05-03

#### Prompt (Developer)

Argo CD Setup Portability Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

you stalled. continue

#### Key Decisions

- Kept ownership boundary explicit: live Argo `Application` manifests remain in GitOps repositories; monorepo now provides templates/contracts/check scripts.
- Added Podverse reusable Argo examples under `infra/k8s/argocd/examples/podverse-alpha` with canonical sync-wave annotations.
- Added Podverse sync-wave contract documentation and reusable Argo app contract checker script.
- Added references to wave contract in Podverse remote GitOps runbook.

#### Files Modified

- `docs/development/k8s/REMOTE-K8S-GITOPS.md`
- `docs/development/k8s/ARGOCD-SYNC-WAVE-CONTRACT.md`
- `infra/k8s/argocd/examples/INFRA-K8S-ARGOCD-EXAMPLES.md`
- `infra/k8s/argocd/examples/podverse-alpha/common.yaml`
- `infra/k8s/argocd/examples/podverse-alpha/db.yaml`
- `infra/k8s/argocd/examples/podverse-alpha/keyvaldb.yaml`
- `infra/k8s/argocd/examples/podverse-alpha/mq.yaml`
- `infra/k8s/argocd/examples/podverse-alpha/ops.yaml`
- `infra/k8s/argocd/examples/podverse-alpha/api.yaml`
- `infra/k8s/argocd/examples/podverse-alpha/management-api.yaml`
- `infra/k8s/argocd/examples/podverse-alpha/web.yaml`
- `infra/k8s/argocd/examples/podverse-alpha/management-web.yaml`
- `infra/k8s/scripts/check_argocd_app_contract.sh`
