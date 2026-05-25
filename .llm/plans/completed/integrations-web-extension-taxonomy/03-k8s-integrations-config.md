# Plan 03 — K8s `podverse-integrations-config`

## Objective

Add shared **Integrations** ConfigMap (mirrors extensions pattern) and mount it **only** on runtime-config sidecar containers.

---

## 1. New base bundle

```
infra/k8s/base/integrations/
  kustomization.yaml
  source/integrations.env
```

### `source/integrations.env`

```env
# Integrations (built-in — default image)
# podverse-integrations-config: shared web integration settings.
# Compose in alpha/common. Mounted on runtime-config sidecars only (web + management-web).
# Contract: docs/operations/extensions/INTEGRATIONS-WEB.md

# Cloudflare Web Analytics
CLOUDFLARE_WEB_ANALYTICS_ENABLED=false
CLOUDFLARE_WEB_ANALYTICS_TOKEN=
```

### `kustomization.yaml`

```yaml
configMapGenerator:
  - name: podverse-integrations-config
    envs:
      - source/integrations.env
generatorOptions:
  disableNameSuffixHash: true
```

---

## 2. Alpha common

Update [`infra/k8s/alpha/common/kustomization.yaml`](../../../infra/k8s/alpha/common/kustomization.yaml):

```yaml
resources:
  - ...
  - https://github.com/podverse/podverse//infra/k8s/base/integrations?ref=X.Y.Z-staging.N
  - https://github.com/podverse/podverse//infra/k8s/base/extensions?ref=X.Y.Z-staging.N
```

Alpha may merge-override `integrations.env` for environment-specific tokens.

---

## 3. Deployment patches

### Web — [`infra/k8s/base/web/deployment.yaml`](../../../infra/k8s/base/web/deployment.yaml)

**runtime-config** container `envFrom` (add second ConfigMap):

```yaml
envFrom:
  - configMapRef:
      name: podverse-web-runtime-config
  - configMapRef:
      name: podverse-integrations-config
```

**Do not** add `podverse-integrations-config` to the main `web` container.

Main `web` container keeps `podverse-extensions-config` (renamed keys from Plan 02).

### Management-web

Same pattern on `runtime-config` sidecar in [`infra/k8s/base/management-web/deployment.yaml`](../../../infra/k8s/base/management-web/deployment.yaml).

---

## 4. Per-app sidecar source env

In `web-sidecar.env` / `management-web-sidecar.env`:

- Keep `NEXT_PUBLIC_*` only
- Comment: `# CLOUDFLARE_WEB_ANALYTICS_* → podverse-integrations-config (alpha/common)`

Do **not** duplicate Cloudflare keys in sidecar source files when cluster uses shared ConfigMap.

---

## 5. Local template

Add [`infra/config/env-templates/integrations.env.example`](../../../infra/config/env-templates/integrations.env.example) aligned with K8s source (Integrations subsection).

---

## 6. Verification

```bash
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/common/
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/web/
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/management-web/
```

Inspect rendered Deployment: `runtime-config` container has `podverse-integrations-config`; main app container does not.

Update [`infra/k8s/INFRA-K8S.md`](../../../infra/k8s/INFRA-K8S.md) or base doc index if present.

---

## Out of scope

- Enabling Cloudflare in production (operator sets token after merge)
- api/workers mounting integrations-config
