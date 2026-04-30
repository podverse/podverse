# Podverse Kubernetes

Deployment scripts and Kubernetes manifests for the Podverse ecosystem.

For a domain-agnostic remote-cluster guide that uses a separate GitOps repository, see
[`docs/development/k8s/REMOTE-K8S-GITOPS.md`](../../docs/development/k8s/REMOTE-K8S-GITOPS.md) (including **container probe defaults** for `infra/k8s/base` workloads).

### Local ops bundle validation (monorepo only)

Remote GitOps uses a **separate repository**; it does not include this step. When you edit
`infra/k8s/base/ops` here, compile from **monorepo root** to catch kustomize errors:

```bash
kubectl kustomize infra/k8s/base/ops --load-restrictor LoadRestrictionsNone >/dev/null
```

## Architecture Overview

This repository uses a GitOps workflow (via ArgoCD) to manage the Podverse infrastructure on a K3s cluster.

### Layers

1.  **Infrastructure (System)**: Cluster-wide services that must exist _before_ applications are deployed.
    - **Traefik**: Ingress Controller (Ports 80/443).
    - **Cert-Manager**: Automates SSL certificates via Let's Encrypt.
    - **ClusterIssuers**: Validates domain ownership (DigitalOcean/Cloudflare).
    - **StorageClass**: Local Path Provisioner (default in K3s).

2.  **Applications (Tenants)**: The actual Podverse environments.
    - **Alpha**: `podverse-alpha` namespace. Bleeding edge / Dev.
    - **Beta/Prod**: (Future) Stable environments.

## Prerequisites

Before deploying the Application manifests (in `infra/k8s/alpha`), ensure the following Infrastructure is running:

1.  **K3s Cluster**: Up and running (e.g., on NixOS/Proxmox).
2.  **Cert-Manager**: Installed in `cert-manager` namespace.
    - _Verification_: `kubectl get pods -n cert-manager`
3.  **ClusterIssuer**: configured for your DNS provider (e.g., `letsencrypt-prod`).
    - _Verification_: `kubectl get clusterissuer letsencrypt-prod`
4.  **Secrets**:
    - Cloud Provider Tokens (e.g., `digitalocean-api-token-secret`) must be present in the `cert-manager` namespace for DNS challenges.

## Directory Structure

- `infra/k8s/`
  - `system/`: Cluster-wide configs (Traefik defaults, etc.).
  - `alpha/`: Manifests for the Alpha environment.
    - `00-namespace.yaml`: Isolation boundary.
    - `api/`, `web/`, `db/`, `mq/`, `workers/`: Component manifests.
  - `scripts/`: Helper scripts; secret generators under `scripts/secret-generators/`.

## Getting Started (Alpha Environment)

### 1. Generate Secrets

We use SOPS to encrypt secrets. Run the helper scripts in `infra/k8s/scripts/secret-generators/` to generate the required encrypted files.

**Requirements Checklist:**

Before running the scripts, ensure you have the following ready:

- **Database Credentials** (`create_db_secret.sh`):
  - You will need to invent 4 passwords:
    - `DB_APP_OWNER_PASSWORD` (app database owner role, for bootstrap)
    - `DB_APP_MIGRATOR_PASSWORD` (app database migrator role, for linear migrations)
    - `DB_APP_READ_WRITE_PASSWORD` (read/write app DB user)
    - `DB_APP_READ_PASSWORD` (read-only app DB user)

- **Management DB Credentials** (`create_management_db_secret.sh`):
  - You will need to invent 4 passwords:
    - `DB_MANAGEMENT_OWNER_PASSWORD` (management database owner role, for bootstrap)
    - `DB_MANAGEMENT_MIGRATOR_PASSWORD` (management database migrator role, for linear migrations)
    - `DB_MANAGEMENT_READ_WRITE_PASSWORD` (read/write management DB user)
    - `DB_MANAGEMENT_READ_PASSWORD` (read-only management DB user)
  - Note: this secret does **not** include management app superuser credentials.
    Create/update the management app superuser separately via the on-demand ops jobs after migrations.

- **Message Queue Credentials** (`create_mq_secret.sh`):
  - An `MQ_PASSWORD` for the admin user.

- **API JWT** (`create_api_secret.sh` → Secret `podverse-api-opaque`):
  - `AUTH_JWT_SECRET`: A long random string for signing tokens.

- **Mailer** (`create_mailer_secret.sh` → Secret `podverse-mailer-opaque`):
  - `MAILER_USERNAME` and `MAILER_PASSWORD` (Optional): If using SMTP, set here—not in the ConfigMap.

- **Metaboost App Assertion** (`create_metaboost_secret.sh` → Secret `podverse-metaboost-opaque`):
  - `METABOOST_SIGNING_KEY_PEM` and `METABOOST_APP_ASSERTION_ISS` (Optional): For App Assertion minting (set both or neither).

- **API / management API non-secret auth (ConfigMap env)**: `AUTH_JWT_EXPIRATION` and `AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY` are set in `base/api/source/api.env` and `base/management-api/source/management-api.env` (session length in seconds and whether login may return a token in JSON when the client requests it).

- **Worker (add-by-RSS) keys** (`create_workers_add_by_rss_secret.sh`):
  - `PODCAST_INDEX_AUTH_KEY`: From your PodcastIndex account.
  - `PODCAST_INDEX_SECRET_KEY`: From your PodcastIndex account.

- **Firebase Config** (`create_firebase_secret.sh`):
  - A valid `firebase-key.json` service account file on your local machine. You will be prompted for its path.

**Execution:**

```bash
# Run each script and follow the prompts
bash ./infra/k8s/scripts/secret-generators/create_db_secret.sh
bash ./infra/k8s/scripts/secret-generators/create_management_db_secret.sh
bash ./infra/k8s/scripts/secret-generators/create_mq_secret.sh
bash ./infra/k8s/scripts/secret-generators/create_api_secret.sh
bash ./infra/k8s/scripts/secret-generators/create_mailer_secret.sh
bash ./infra/k8s/scripts/secret-generators/create_metaboost_secret.sh
bash ./infra/k8s/scripts/secret-generators/create_workers_add_by_rss_secret.sh
bash ./infra/k8s/scripts/secret-generators/create_firebase_secret.sh
```

**Apply**

```bash
kubectl create namespace podverse-alpha
kubectl apply -f infra/k8s/system/traefik-config.yaml


for file in secrets/podverse-alpha-*-opaque.enc.yaml; do
    sops -d "$file" | kubectl apply -f -
done

kubectl apply -f infra/k8s/alpha-application.yaml

```

```fish
kubectl create namespace podverse-alpha
kubectl apply -f infra/k8s/system/traefik-config.yaml


for file in secrets/podverse-alpha-*-opaque.enc.yaml
    sops -d $file | kubectl apply -f -
end

kubectl apply -f infra/k8s/alpha-application.yaml


```

## Kustomize

Use Kustomize to render overlays locally, matching what ArgoCD applies. Because bases live outside the overlay folders, include the relaxed load restrictor flag.

```bash
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/workers/
```

Other overlays render the same way (e.g., `infra/k8s/alpha/api`, `infra/k8s/alpha/web`, `infra/k8s/alpha/db`). Add `| kubectl apply -f - --dry-run=client` to validate locally before pushing to Git.

## ArgoCD bootstrap (App of Apps)

- Update `repoURL` and `targetRevision` in [infra/k8s/alpha-application.yaml](alpha-application.yaml) if deploying from a fork or different branch.
- Apply the root application once: `kubectl apply -f infra/k8s/alpha-application.yaml`. ArgoCD will create child apps for common, api, web, db, mq, workers, and cron.
- Leave automated sync, prune, and self-heal enabled (already configured in manifests).

## Secrets and SOPS

- Encrypted secrets live under [secrets/](secrets/) at the monorepo root. Decrypt with `sops -d` when applying manually.
- Secret generators in [infra/k8s/scripts/secret-generators/](scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md) and other scripts in [infra/k8s/scripts/](scripts/README.md) assume SOPS keys are available and `nix develop` provides required binaries.
- Never commit decrypted secrets; ArgoCD consumes the encrypted files directly.
- If an older encrypted Secret is missing keys the generators now emit, prefer re-running the matching **`create_*`** script (see [INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md](scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md)); merge with **`sops`** only when you must preserve unrelated material.

## Linting and Formatting

K8s manifests use **their own Prettier rules** (not repo-wide YAML rules) to match patterns already used in k8s files.

### Configuration

- **Tool:** Prettier
- **Where configured:** Root `.prettierrc.json`, **overrides** section for `infra/k8s/**/*.yml` and `infra/k8s/**/*.yaml`
- **Options:**
  - `singleQuote: false` (double quotes for strings)
  - `tabWidth: 2` (2-space indentation)
  - `printWidth: 140` (wider than repo default of 100 to avoid wrapping long env values and list items)

### Intent

Rules match patterns already used in k8s files (double quotes, 2 spaces, wider line length) and are **not** the same as repo-wide YAML (e.g., 100-char width elsewhere). The wider `printWidth` reduces unnecessary line breaks in long ConfigMap values and array items.

### How to Run

From repo root:

```bash
npm run prettier:write  # Format all files including k8s
npm run lint:fix         # Lint and format all files
```

**Format-on-save:** VS Code/Cursor automatically applies k8s overrides when saving files under `infra/k8s/`.

**Pre-commit:** `lint-staged` formats staged k8s YAML files automatically.

### Important

- **Do not** add `infra/k8s/` back to `.prettierignore` (it was previously ignored but now uses overrides)
- K8s files are intentionally included in normal Prettier runs with their own overrides
- See `.cursor/skills/k8s/SKILL.md` and `.cursor/rules/infra-k8s.mdc` for full patterns

# Podverse Alpha - K3s GitOps

This directory contains the Kubernetes manifests for the Podverse Alpha environment, deployed on a 3-node K3s cluster running on Proxmox/NixOS.

## Architecture: App of Apps Pattern

We utilize the **App of Apps** pattern for ArgoCD.

Instead of manually managing individual resources (Deployments, Services, etc.) or multiple ArgoCD applications, we have one **Root Application** (`alpha-application.yaml`). This root application points to the `apps/` directory, which contains definitions for all other child applications.

**Flow:**

1.  **Root App** (`alpha-application.yaml`) syncs the `apps/` folder.
2.  **Child Apps** (e.g., `web.yaml`, `api.yaml`, `db.yaml`) appear in ArgoCD.
3.  **Resources** (Deployments, Services) defined in the component folders (e.g., `web/`, `api/`) are deployed by their respective Child Apps.

## Directory Structure

```text
infra/k8s/
├── alpha-application.yaml      # ROOT APP: The entry point for ArgoCD
├── alpha/                      # The actual infrastructure and application code
│   ├── apps/                   # CHILD APPS: ArgoCD Application definitions
│   │   ├── api.yaml            # -> points to alpha/api
│   │   ├── common.yaml         # -> points to alpha/common
│   │   ├── db.yaml             # -> points to alpha/db
│   │   ├── web.yaml            # -> points to alpha/web
│   │   └── ... (others)
│   ├── api/                    # Manifests for API (Deployment, Service, ConfigMap)
│   ├── common/                 # Shared resources (Namespace, Ingress, TLS)
│   ├── db/                     # Database manifests
│   ├── mq/                     # Message Queue manifests
│   ├── web/                    # Frontend manifests
│   └── ...
└── system/
    └── traefik-config.yaml     # System-level config (if separate)
```
