---
name: podverse-k8s-patterns
description: Common patterns for Kubernetes manifests in infra/k8s. Use when editing or adding K8s manifests, changing deployment config, adding env vars to ConfigMaps, or working with ArgoCD/Kustomize/SOPS.
version: 1.0.0
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
    ├── create_*_secret.sh
    ├── db-connect.sh
    └── README.md
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

### Sync with env-templates

ConfigMaps in `base/<component>/01-configmap.yaml` should mirror the structure of `infra/config/env-templates/<component>.env.example`:

- Use same section headers (e.g., `##### App / General #####`)
- Add comment: `# Mapped from config/podverse-<component>.env.example`
- Keep variable names and structure aligned

### Secrets Handling

- **Never** put secrets in ConfigMaps
- Mark sensitive variables with `# in secrets` comment
- Actual secrets go in SOPS-encrypted files under `k8s/secrets/`
- Use `secretRef` in Deployment `envFrom` to load secrets

**Example:**

```yaml
# In ConfigMap
API_PORT: '1234'
##AUTH_JWT_SECRET: "your-secret-whatever" # in secrets

# In Deployment
envFrom:
  - configMapRef:
      name: podverse-api-config
  - secretRef:
      name: podverse-api-opaque
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
    newTag: '5.1.28-alpha.0'
```

## ArgoCD Applications

Child applications in `alpha/apps/<component>.yaml` define:

- `metadata.name`: e.g., `podverse-alpha-api`
- `spec.project`: `podverse`
- `spec.source.repoURL`: GitHub repo URL
- `spec.source.targetRevision`: branch name (e.g., `alpha`)
- `spec.source.path`: path to overlay (e.g., `k8s/alpha/api`)
- `spec.destination.namespace`: `podverse-alpha`
- `spec.syncPolicy.automated`: `prune: true`, `selfHeal: true`

## Secrets and SOPS

### Creating Secrets

Use helper scripts in `infra/k8s/scripts/`:

```bash
# Run from repo root with nix develop
bash infra/k8s/scripts/create_db_secret.sh
bash infra/k8s/scripts/create_api_secret.sh
bash infra/k8s/scripts/create_mq_secret.sh
# ... etc
```

### Applying Secrets

Secrets are SOPS-encrypted and stored in `k8s/secrets/podverse-<env>-<component>-opaque.enc.yaml`.

**Manual apply:**

```bash
sops -d k8s/secrets/podverse-alpha-db-opaque.enc.yaml | kubectl apply -f -
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

## Common Tasks

### Adding a New Environment Variable

1. Add to `infra/config/env-templates/<component>.env.example` (if not secret)
2. Add to `base/<component>/01-configmap.yaml` with same section/comments
3. If secret, add to appropriate secret creation script
4. If environment-specific, override in `alpha/<component>/kustomization.yaml`

### Creating a New Component

1. Create `base/<component>/` directory
2. Add `01-configmap.yaml`, `02-service.yaml`, `03-deployment.yaml`
3. Create `base/<component>/kustomization.yaml` listing resources
4. Create `alpha/<component>/` overlay with `kustomization.yaml`
5. Add ArgoCD Application in `alpha/apps/<component>.yaml`
6. Create secrets script in `infra/k8s/scripts/create_<component>_secret.sh`

### Updating Image Versions

Edit the overlay's `kustomization.yaml` (e.g., `alpha/api/kustomization.yaml`):

```yaml
images:
  - name: ghcr.io/podverse/podverse-api/podverse-api
    newTag: '5.1.29-alpha.0' # Update this
```

ArgoCD will detect the change and sync automatically.

## Helper Scripts

Located in `infra/k8s/scripts/`:

| Script                      | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `create_db_secret.sh`       | Generate encrypted DB credentials            |
| `create_api_secret.sh`      | Generate encrypted API secrets (JWT, mailer) |
| `create_mq_secret.sh`       | Generate encrypted message queue credentials |
| `create_keyvaldb_secret.sh` | Generate encrypted Valkey/Redis password     |
| `create_firebase_secret.sh` | Generate encrypted Firebase service account  |
| `db-connect.sh`             | Port-forward and connect to PostgreSQL       |
| `keyvaldb-gui-connect.sh`   | Port-forward to RedisInsight GUI             |
| `mq-connect.sh`             | Port-forward to message queue                |

See [infra/k8s/scripts/README.md](../../infra/k8s/scripts/README.md) for details.

## References

- [infra/k8s/README.md](../../infra/k8s/README.md) - Full K8s documentation
- [docs/ALPHA-DEPLOYMENT.md](../../docs/ALPHA-DEPLOYMENT.md) - Docker/CI and alpha deployment
- [.cursor/rules/infra-k8s.mdc](../.cursor/rules/infra-k8s.mdc) - K8s cursor rules
- [.prettierrc.json](../../.prettierrc.json) - Prettier config with k8s overrides

## Related Skills

- **[API Patterns](../api/SKILL.md)** - Backend API patterns
- **[Web Patterns](../web/SKILL.md)** - Frontend patterns
- **[ORM Patterns](../orm/SKILL.md)** - Database patterns
- **[Global Patterns](../global/SKILL.md)** - Monorepo conventions
