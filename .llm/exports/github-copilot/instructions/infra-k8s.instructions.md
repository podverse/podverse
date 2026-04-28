---
description: "Kubernetes manifest patterns and conventions for infra/k8s"
applyTo:
  - "infra/k8s/**/*.yaml"
  - "infra/k8s/**/*.yml"
---

# Kubernetes Manifest Conventions

## Linting and Formatting

K8s YAML is formatted with Prettier using **k8s-specific overrides** (see root `.prettierrc.json`):

- **Double quotes** for string values (`singleQuote: false`)
- **2-space indentation** (`tabWidth: 2`)
- **140-character line width** (`printWidth: 140`) - wider than repo default to avoid wrapping long env values and list items

**Do not** add `infra/k8s/` to `.prettierignore`. K8s files are intentionally formatted with these overrides.

**How to format:**

- Format-on-save in VS Code/Cursor applies k8s overrides automatically
- Manual: `npm run prettier:write` or `npm run lint:fix` from repo root
- Pre-commit: `lint-staged` formats staged k8s YAML

## ConfigMap Conventions

- **Sync with env-templates:** ConfigMaps in `base/<component>/01-configmap.yaml` mirror structure of `infra/config/env-templates/<component>.env.example`
- **Section headers:** Use comments like `##### App / General #####`
- **No secrets:** Mark sensitive vars with `# in secrets` comment; actual secrets go in SOPS-encrypted files. When several consecutive lines have `# in secrets`, align that comment vertically (same column).
- **String values:** Use double quotes (e.g., `NODE_ENV: "production"`)
- **Comments:** Reference source (e.g., `# Mapped from config/podverse-api.env.example`)

## Base Resource Naming

Many component bases use numbered YAML prefixes for ordering:

- `01-configmap.yaml` - Configuration
- `02-service.yaml` - Service
- `03-deployment.yaml` or `03-statefulset.yaml` - Workload
- Additional resources: `04-`, `05-`, etc.

**`base/db/`** uses `service.yaml` and `statefulset.yaml` only. Combined DB artifacts live under
`source/` with **four-digit prefixes** (`0000_…`, `0001_…`, …) so files sort in execution order and
new steps can be added over time. The StatefulSet **mountPath** basenames under
`/docker-entrypoint-initdb.d/` match those filenames (see `statefulset.yaml` comments).

## Kustomize

Always use `--load-restrictor LoadRestrictionsNone` when building because bases live outside overlay folders:

```bash
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/api/
```

## Image Versioning

- **Base deployments:** Use image name without tag or with placeholder
- **Overlays:** Set actual tags in `kustomization.yaml` `images:` section

## Secrets

- Never commit decrypted secrets
- Use SOPS for encryption
- Create secrets via scripts in `infra/k8s/scripts/secret-generators/`
- Reference secrets with `secretRef` in Deployment `envFrom`

## Full Documentation

See `.llm/exports/github-copilot/skills/k8s/SKILL.md` and `infra/k8s/README.md` for complete patterns and workflows.
