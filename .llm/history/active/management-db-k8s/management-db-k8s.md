# Feature: Management DB K8s

## Metadata

- Started: 2026-02-25
- Completed: In Progress
- Author: OpenCode
- LLM(s): gpt-5.2-codex
- GitHub Issues: None
- Branch: feature/mr00
- Origin: git@github.com:suorcd/podverse.git
- Is Fork: yes

## Context

Add Kubernetes manifests for the management database and an ArgoCD application in alpha.

## Sessions

### Session 1 - 2026-02-25

#### Prompt (Developer)

review the infra/k8s/base/management-web and infra/k8s/alpha/management-web folders for the task and use them as references.

i want you to create a management-db config in the infra/k8s/base/ dir based off of the infra/docker/alpha/management-db docker-compose files and add a deployment argocd manifest in the infra/k8s/alpha

#### Key Decisions

- Modeled management-db manifests on base/db patterns and alpha/db overlay conventions.
- Generated init scripts configmap from management database SQL and user setup scripts.

#### Files Created

- infra/k8s/base/management-db/kustomization.yaml
- infra/k8s/base/management-db/service.yaml
- infra/k8s/base/management-db/statefulset.yaml
- infra/k8s/base/management-db/init-scripts.configmap.yaml
- infra/k8s/alpha/management-db/kustomization.yaml
- infra/k8s/alpha/apps/management-db.yaml

---

### Session 2 - 2026-02-25

#### Prompt (Developer)

take a look at infra/k8s/scripts/create_db_secret.sh and create a script for management-db

#### Key Decisions

- Added a management-db secret generator mirroring db secret behavior with management-specific secret naming and superuser fields.

#### Files Created

- infra/k8s/scripts/create_management_db_secret.sh

---

### Session 3 - 2026-02-25

#### Prompt (Developer)

yes

#### Key Decisions

- Documented the management-db secret generator in the k8s README.

#### Files Modified

- infra/k8s/README.md

---

### Session 4 - 2026-02-25

#### Prompt (Developer)

yes

#### Key Decisions

- Added a usage note for the management DB secret script in the k8s scripts README.

#### Files Modified

- infra/k8s/scripts/README.md
