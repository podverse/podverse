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

---

### Session 5 - 2026-02-27

#### Prompt (Developer)

review the create\_\*.sh scripts and create a script that runs allof the scripts with the --auto-gen flag

#### Key Decisions

- Added a single runner script that executes each create\_\*.sh with --auto-gen and an optional environment argument.
- Included a note that some scripts still require real credentials despite --auto-gen.

#### Files Modified

- infra/k8s/scripts/create_all_secrets_auto_gen.sh

---

### Session 6 - 2026-02-27

#### Prompt (Developer)

add this to the README.md
the scripts that require external variables should not be in the script or should have a special note/warning output that they need to be separately addressed

#### Key Decisions

- Documented the bulk auto-gen runner and highlighted scripts that still require external credentials or files.

#### Files Modified

- infra/k8s/scripts/README.md

---

### Session 7 - 2026-02-27

#### Prompt (Developer)

review the changes and prompts. validate things are correct

#### Key Decisions

- Found 4 scripts that don't support --auto-gen (podcastindex, firebase, bucket, digital ocean) were incorrectly included in the runner; they would hang or fail on interactive prompts.
- Removed those 4 from the runner's SCRIPTS array and added a MANUAL_SCRIPTS warning block printed at the end.
- Updated README to explicitly list which scripts the runner executes and which must be run manually.

#### Files Modified

- infra/k8s/scripts/create_all_secrets_auto_gen.sh
- infra/k8s/scripts/README.md

---

### Session 8 - 2026-02-27

#### Prompt (Developer)

add to the script the needed lines to decrypt and apply the files. so a user can copy and paste the commands

#### Key Decisions

- Added copy-pasteable `sops -d ... | kubectl apply -f -` commands printed at the end of the runner for each generated secret file.
- Found and fixed a bug: `create_management_api_secret.sh` used secret name `podverse-api-opaque` and output path colliding with `create_api_secret.sh`. Changed to `podverse-management-api-opaque` matching the management-api K8s deployment manifest.

#### Files Modified

- infra/k8s/scripts/create_all_secrets_auto_gen.sh
- infra/k8s/scripts/create_management_api_secret.sh

---

### Session 9 - 2026-03-05

#### Prompt (Developer)

the podverse-db and management-db should be in one pod and accessible by the regular infra and management infra

#### Key Decisions

- Pointed the management-db service at the shared podverse-db selector and port.
- Mounted management-db init scripts and secrets into the shared podverse-db StatefulSet.
- Kept a dedicated management-db ArgoCD app for the shared service/configmap while removing the duplicate StatefulSet overlay.
- Updated management API DB host to use the shared podverse-db service.

#### Files Modified

- infra/k8s/base/db/statefulset.yaml
- infra/k8s/base/management-db/service.yaml
- infra/k8s/base/management-db/kustomization.yaml
- infra/k8s/alpha/management-db/kustomization.yaml
- infra/k8s/base/management-api/configmap.yaml

---

### Session 10 - 2026-03-14

#### Prompt (Developer)

i want to merge the infra/k8s/base/management-db into the infra/k8s/base/db and just use one db server for these functions; the management interface will need access to the regular db anyway

#### Key Decisions

- Moved management DB init scripts into the shared db base and dropped the standalone management-db StatefulSet.
- Pointed the management-db ArgoCD app at the shared db overlay and removed the separate management-db overlay to avoid duplicate resources.

#### Files Created

- infra/k8s/base/db/management-init-scripts.configmap.yaml

#### Files Modified

- infra/k8s/base/db/kustomization.yaml
- infra/k8s/base/db/statefulset.yaml
- infra/k8s/base/management-api/deployment.yaml
- infra/k8s/base/management-db/kustomization.yaml
- infra/k8s/base/management-db/service.yaml
- infra/k8s/alpha/apps/management-db.yaml

#### Files Deleted

- infra/k8s/base/management-db/init-scripts.configmap.yaml
- infra/k8s/base/management-db/statefulset.yaml
- infra/k8s/alpha/management-db/kustomization.yaml

---

### Session 11 - 2026-03-14

#### Prompt (Developer)

the management-api will need access to both DBs

#### Key Decisions

- Restored the main db secret on the management API deployment to expose both sets of DB credentials.

#### Files Modified

- infra/k8s/base/management-api/deployment.yaml

---
