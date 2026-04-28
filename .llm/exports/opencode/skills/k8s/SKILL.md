---
name: k8s
description: Common patterns for Kubernetes manifests in infra/k8s. Use when editing or adding K8s manifests, changing deployment config, adding env vars to ConfigMaps, or working with ArgoCD/Kustomize/SOPS.
version: 1.0.4
---


# Podverse K8s Development Patterns

This skill provides quick reference for common patterns used in the Podverse Kubernetes infrastructure.

## When to Use This Skill

Use this skill when:

- Editing or adding files under `infra/k8s/`
- Changing deployment configuration
- Adding environment variables to ConfigMaps
- Working with ArgoCD, Kustomize, or SOPS in this repo
- Creating new K8s components or services

## GitOps and remote Kustomize

Remote deploys use a **separate GitOps repository** with Kustomize overlays and Argo CD. Reference Podverse with **remote Kustomize** URLs under `infra/k8s/base/…` and **copy** `scripts/secret-generators` from this repo. See [REMOTE-K8S-GITOPS.md](../../../docs/development/k8s/REMOTE-K8S-GITOPS.md).

## Directory Structure

```
infra/k8s/
├── alpha-application.yaml    # Root ArgoCD app (App of Apps)
├── base/                      # Shared manifests (all environments)
│   ├── api/
│   │   ├── 01-configmap.yaml
│   │   ├── 02-service.yaml
│   │   ├── 03-deployment.yaml
│   │   └── kustomization.yaml
│   ├── web/
│   ├── workers/
│   ├── db/
│   ├── mq/
│   ├── keyvaldb/
│   ├── cron/
│   ├── ops/
│   └── common/               # Shared resources (Ingress, TLS)
├── alpha/                    # Alpha environment overlays
│   ├── apps/                 # ArgoCD Application definitions
│   │   ├── api.yaml
│   │   ├── web.yaml
│   │   ├── common.yaml
│   │   └── ...
│   ├── api/
│   │   ├── kustomization.yaml
│   │   └── deployment-link-patch.yaml
│   ├── web/
│   ├── workers/
│   └── ...
├── system/                   # Cluster-wide config
│   └── traefik-config.yaml
└── scripts/                  # Helper scripts
    ├── README.md
    ├── secret-generators/   # SOPS: create_*_secret.sh, create_all_*.sh
    ├── db/                 # db-connect.sh
    ├── mq/                 # mq-connect.sh
    ├── keyvaldb/            # keyvaldb-gui-connect.sh
    └── list_images.sh      # list cluster image refs (monorepo root)
```

## Architecture: App of Apps Pattern

The deployment uses ArgoCD's **App of Apps** pattern:

1. **Root Application** (`alpha-application.yaml`) syncs the `alpha/apps/` directory
2. **Child Applications** (e.g., `alpha/apps/api.yaml`, `alpha/apps/web.yaml`) appear in ArgoCD
3. **Resources** (Deployments, Services, ConfigMaps) are deployed by their respective child apps

**Flow:**

```
alpha-application.yaml → alpha/apps/*.yaml → alpha/<component>/kustomization.yaml → base/<component>/*.yaml
```

### Argo CD `Application` YAML named `ops.yaml` (editors / GitOps repos)

The [JSON Schema Store](https://www.schemastore.org/) maps **`ops.yaml` / `ops.yml`** to an unrelated "Ops configuration" spec, so editors can mis-validate a real Argo CD `Application`. **Podverse** uses a **line 1** `# yaml-language-server: $schema=...` modeline in [`infra/k8s/alpha/apps/ops.yaml`](../../../infra/k8s/alpha/apps/ops.yaml). A matching GitOps checkout (e.g. k.podcastdj.com) should add the same **first-line modeline** on `argocd/.../ops.yaml` and may also commit `.vscode/settings.json` for backup. **Prefer the modeline**; rename or user `yaml.schemas` if needed. For the operator GitOps repo, see the **argocd-yaml-schema-ops-filename** skill (`.llm/exports/opencode/skills/` there).

## Kustomize Usage

### Building Overlays

Always use the `--load-restrictor LoadRestrictionsNone` flag because bases live outside overlay folders:

```bash
# From repo root
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/api/
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/workers/
```

### Validating Locally

Add dry-run to validate before pushing to Git:

```bash
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/api/ | kubectl apply -f - --dry-run=client
```

### Base vs Overlay Structure

**Base manifests** (`base/<component>/`):

- Shared resources for all environments
- Use numbered naming: `01-configmap.yaml`, `02-service.yaml`, `03-deployment.yaml`
- Image tags may be placeholders (overlays set actual tags)
- ConfigMap names like `podverse-api-config`, `podverse-workers-config`

**Alpha overlays** (`alpha/<component>/`):

- Reference base resources in `kustomization.yaml`
- Set `namespace: podverse-alpha`
- Apply common labels with `includeSelectors: true`
- Override ConfigMap values with `configMapGenerator` (behavior: merge)
- Set image tags in `images:` section
- Apply patches (e.g., `deployment-link-patch.yaml`)

## ConfigMap Conventions

### Sync with env templates

ConfigMaps in `base/<component>/01-configmap.yaml` should mirror the structure of the authoritative app `.env.example` files (e.g. `apps/api/.env.example`, `apps/workers/.env.example`). Infra env-templates for apps are link-only stubs.

- Use same section headers (e.g., `##### App / General #####`)
- Add comment: `# Mapped from apps/<component>/.env.example`
- Keep variable names and structure aligned

### Secrets Handling

- **Never** put secrets in ConfigMaps
- Mark sensitive variables with `# in secrets` comment
- **Align comments:** When several consecutive lines have `# in secrets` (or `# in secrets (...)`), align the `# in secrets` part vertically (same column) by padding with spaces after the value so the comment starts at the same position
- Actual secrets go in SOPS-encrypted files under repo-root `secrets/`
- Use `secretRef` in Deployment `envFrom` to load secrets

**Example (aligned `# in secrets` in a sequence):**

```yaml
# In ConfigMap – consecutive "in secrets" lines aligned
  # DB_APP_NAME: ""                      # in secrets
  # DB_APP_READ_USER: ""                 # in secrets
  # DB_APP_READ_WRITE_USER: ""           # in secrets
  # DB_APP_READ_WRITE_PASSWORD: ""      # in secrets

# In Deployment (API loads JWT, mailer, and Metaboost from separate Secrets)
envFrom:
  - configMapRef:
      name: podverse-api-config
  - secretRef:
      name: podverse-api-opaque
  - secretRef:
      name: podverse-mailer-opaque
  - secretRef:
      name: podverse-metaboost-opaque
```

### Environment Overrides

Override ConfigMap values in alpha (or other environment) overlays using `configMapGenerator`:

```yaml
# alpha/api/kustomization.yaml
configMapGenerator:
  - name: podverse-api-config
    behavior: merge
    literals:
      - API_ALLOWED_CORS_ORIGINS="http://podverse-web:3000,https://alpha-podverse.k.podverse.fm"
      - COOKIE_DOMAIN=".k.podverse.fm"
```

## Image Versioning

**Base deployments:**

- Use image name without tag or with placeholder tag
- Example: `image: ghcr.io/podverse/podverse/api`

**Overlay kustomization:**

- Set actual image tags in `images:` section
- Example:

```yaml
images:
  - name: ghcr.io/podverse/podverse-api/podverse-api
    newTag: '5.1.28-staging.0'
```

## ArgoCD Applications

Child applications in `alpha/apps/<component>.yaml` define:

- `metadata.name`: e.g., `podverse-alpha-api`
- `spec.project`: `podverse`
- `spec.source.repoURL`: GitHub repo URL
- `spec.source.targetRevision`: branch or tag in the app repo (e.g., `staging`)
- `spec.source.path`: path to overlay (e.g., `k8s/alpha/api`)
- `spec.destination.namespace`: `podverse-alpha`
- `spec.syncPolicy.automated`: `prune: true`, `selfHeal: true`

## Secrets and SOPS

### Creating Secrets

Use secret generator scripts in `infra/k8s/scripts/secret-generators/`:

```bash
# Run from repo root with nix develop
bash infra/k8s/scripts/secret-generators/create_db_secret.sh
bash infra/k8s/scripts/secret-generators/create_api_secret.sh
bash infra/k8s/scripts/secret-generators/create_mq_secret.sh
# ... etc
```

### Applying Secrets

Secrets are SOPS-encrypted and stored in `secrets/podverse-<env>-<component>-opaque.enc.yaml` (monorepo root).

**Manual apply:**

```bash
sops -d secrets/podverse-alpha-db-opaque.enc.yaml | kubectl apply -f -
```

**ArgoCD:** Consumes encrypted files directly (SOPS plugin configured).

### Never Commit Decrypted Secrets

- All secrets must be encrypted with SOPS before committing
- `.gitignore` should exclude decrypted secret files
- Scripts generate encrypted files automatically

## Linting and Formatting

### K8s-Specific Prettier Rules

`infra/k8s/` uses **its own Prettier rules** (not repo-wide YAML rules):

- **Where configured:** Root `.prettierrc.json`, **overrides** section for `infra/k8s/**/*.yml` and `infra/k8s/**/*.yaml`
- **Options:**
  - `singleQuote: false` (double quotes for strings)
  - `tabWidth: 2` (2-space indentation)
  - `printWidth: 140` (wider than repo default of 100 to avoid wrapping long env values and list items)

### How to Apply

- **Format-on-save:** VS Code/Cursor automatically applies k8s overrides when saving files under `infra/k8s/`
- **Manual format:** From repo root:
  ```bash
  npm run prettier:write
  npm run lint:fix
  ```
- **Pre-commit:** `lint-staged` runs Prettier on staged k8s YAML files

### Important

- **Do not** add `infra/k8s/` to `.prettierignore` (it was previously ignored but now uses overrides)
- K8s files are intentionally formatted with these k8s-specific rules
- The wider `printWidth` matches existing k8s patterns and avoids unnecessary line breaks

## Resource Naming Patterns

### Base Manifests

Use numbered prefixes for ordering:

- `01-configmap.yaml` - Configuration
- `02-service.yaml` - Service
- `03-deployment.yaml` or `03-statefulset.yaml` - Workload
- Additional resources: `04-`, `05-`, etc.

### Resource Names

- ConfigMaps: `podverse-<component>-config` (e.g., `podverse-api-config`)
- Services: `podverse-<component>` (e.g., `podverse-db`)
- Deployments: `podverse-<component>` (e.g., `podverse-api`)
- Secrets: `podverse-<component>-opaque` (e.g., `podverse-db-opaque`)

### Labels

Apply consistent labels in overlays:

```yaml
labels:
  - pairs:
      app: podverse-api
      environment: alpha
    includeSelectors: true
```

## Database: linear migrations and bootstrap

- **One source of truth for SQL migrations:** `infra/k8s/ops/source/app/` and `infra/k8s/ops/source/management/`. Additive, ordered files (`0001_*.sql`, …); the migration runner applies them in order and records them in `linear_migration_history` (the runner creates that table; do not add a “history table” migration for it).
- **Bootstrap in init:** `infra/k8s/base/db/source/bootstrap/` — `0001` and `0002` shell scripts create users/roles and the management database; the generated `0003_linear_baseline.sql` (do not hand-edit) materializes the full schema after the linear chain. See `docs/operations/LINEAR-MIGRATIONS.md` and `scripts/database/generate-linear-baseline.sh`. In cluster, **ops** migration jobs also apply the same files from ConfigMaps.
- **Runners and validation:** From repo root, `bash scripts/database/run-linear-migrations.sh --database app|management` (always pass `--database`); `bash scripts/database/validate-linear-migrations.sh` checks filenames, ordering, and that every SQL file in `source/app` and `source/management` is listed in `infra/k8s/base/ops/kustomization.yaml` (ops bundle must stay in sync with disk).
- **Kustomize and ops:** When rendering `infra/k8s/base/ops/`, Kustomize may include files under `scripts/`; use a load policy that allows files outside the ops directory, e.g. `kubectl kustomize infra/k8s/base/ops --load-restrictor LoadRestrictionsNone`.
- **DB credentials naming:** Authoritative admin keys in secrets and env are `DB_APP_ADMIN_USER` / `DB_APP_ADMIN_PASSWORD` and `DB_MANAGEMENT_ADMIN_USER` / `DB_MANAGEMENT_ADMIN_PASSWORD` (plus read/write keys per `infra/config/env-templates/db.env.example`). The official **postgres** image still expects `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` **inside the container** only—map from the `DB_*` keys in StatefulSet or Compose, not the other way around.

**Read more:** [docs/operations/DB-MIGRATIONS.md](../../docs/operations/DB-MIGRATIONS.md), [docs/operations/LINEAR-MIGRATIONS.md](../../docs/operations/LINEAR-MIGRATIONS.md).

## Common Tasks

### Adding a New Environment Variable

1. Add to `apps/<component>/.env.example` (if not secret)
2. Add to `base/<component>/01-configmap.yaml` with same section/comments
3. If secret, add to appropriate secret creation script
4. If environment-specific, override in `alpha/<component>/kustomization.yaml`

### Creating a New Component

1. Create `base/<component>/` directory
2. Add `01-configmap.yaml`, `02-service.yaml`, `03-deployment.yaml`
3. Create `base/<component>/kustomization.yaml` listing resources
4. Create `alpha/<component>/` overlay with `kustomization.yaml`
5. Add ArgoCD Application in `alpha/apps/<component>.yaml`
6. Create secrets script in `infra/k8s/scripts/secret-generators/create_<component>_secret.sh`

### Updating Image Versions

Edit the overlay's `kustomization.yaml` (e.g., `alpha/api/kustomization.yaml`):

```yaml
images:
  - name: ghcr.io/podverse/podverse-api/podverse-api
    newTag: '5.1.29-staging.0' # Update this
```

ArgoCD will detect the change and sync automatically.

## Helper Scripts

**Secret generators** live in `infra/k8s/scripts/secret-generators/` (see [INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md](../../infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md)):

| Script                             | Purpose                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `create_db_secret.sh`              | Generate encrypted DB credentials                                                                                                     |
| `create_api_secret.sh`             | Generate encrypted API secrets (JWT, mailer)                                                                                          |
| `create_mq_secret.sh`              | Generate encrypted message queue credentials                                                                                          |
| `create_keyvaldb_secret.sh`        | Generate encrypted Valkey/Redis password                                                                                              |
| `create_firebase_secret.sh`        | `podverse-workers-firebase-opaque`; base mounts it at `/var/secrets/firebase` (optional volume) for API + workers + cron              |
| `create_workers_webpush_secret.sh` | VAPID private key in `podverse-workers-webpush-opaque`; `--auto-gen` also sets public keys in workers/web source env when paths exist |

**Other** scripts (DB/MQ/Valkey connect, image listing) under `infra/k8s/scripts/<topic>/` and `list_images.sh` at `scripts/`:

| Path / script                      | Purpose                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `db/db-connect.sh`                 | Port-forward and connect to PostgreSQL                                                                              |
| `keyvaldb/keyvaldb-gui-connect.sh` | Port-forward to RedisInsight GUI (GUI workload is in the ops app; scale `podverse-keyvaldb-gui` if `replicas` is 0) |
| `mq/mq-connect.sh`                 | Port-forward to message queue                                                                                       |
| `list_images.sh`                   | List image references in use (see script)                                                                           |

See [infra/k8s/scripts/README.md](../../infra/k8s/scripts/README.md) for details.

## References

- [infra/k8s/README.md](../../infra/k8s/README.md) - Full K8s documentation
- [docs/operations/ALPHA-DEPLOYMENT.md](../../docs/operations/ALPHA-DEPLOYMENT.md) - Docker/CI and alpha deployment
- [docs/operations/DB-MIGRATIONS.md](../../docs/operations/DB-MIGRATIONS.md) - DB migrations and ops jobs
- [docs/operations/LINEAR-MIGRATIONS.md](../../docs/operations/LINEAR-MIGRATIONS.md) - Linear migration contract
- [.llm/exports/opencode/instructions/infra-k8s.instructions.md](../.llm/exports/opencode/instructions/infra-k8s.instructions.md) - K8s cursor rules
- [.prettierrc.json](../../.prettierrc.json) - Prettier config with k8s overrides

## Related Skills

- **[API Patterns](../api/SKILL.md)** - Backend API patterns
- **[Web Patterns](../web/SKILL.md)** - Frontend patterns
- **[ORM Patterns](../orm/SKILL.md)** - Database patterns
- **[Global Patterns](../global/SKILL.md)** - Monorepo conventions
