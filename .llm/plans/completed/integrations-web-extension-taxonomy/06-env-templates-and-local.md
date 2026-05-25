# Plan 06 — Env templates and local setup

## Objective

Align contributor and operator env templates with **Integrations before Extensions** ordering and new key names.

---

## 1. Shared integrations template

Create [`infra/config/env-templates/integrations.env.example`](../../../infra/config/env-templates/integrations.env.example):

```env
#####
##### Integrations (built-in — default image)
#####
# Kubernetes: infra/k8s/base/integrations/source/integrations.env → podverse-integrations-config
# Mounted on runtime-config sidecars only (web + management-web).

# Cloudflare Web Analytics
CLOUDFLARE_WEB_ANALYTICS_ENABLED=
CLOUDFLARE_WEB_ANALYTICS_TOKEN=
```

---

## 2. Extensions template (Plan 02 keys)

Update [`infra/config/env-templates/extensions.env.example`](../../../infra/config/env-templates/extensions.env.example):

- **Integrations** subsection is **not** here — stays in integrations template
- **Extensions** subsection last with `PROMETHEUS_*`, `OTEL_*` (no `EXT_`)

---

## 3. Sidecar `.env.example`

Update:

- [`apps/web/sidecar/.env.example`](../../../apps/web/sidecar/.env.example)
- [`apps/management-web/sidecar/.env.example`](../../../apps/management-web/sidecar/.env.example)
- [`infra/config/env-templates/web-sidecar.env.example`](../../../infra/config/env-templates/web-sidecar.env.example)
- management-web sidecar template

Add **Integrations** subsection **before** any **Extensions** subsection.

Add **Observability** subsection **before Integrations** in main app `.env.example` files (plan 08); use [`infra/config/env-templates/observability.env.example`](../../../infra/config/env-templates/observability.env.example) as shared reference.

```env
#####
##### Integrations (built-in — default image)
#####
CLOUDFLARE_WEB_ANALYTICS_ENABLED=
CLOUDFLARE_WEB_ANALYTICS_TOKEN=

# ... existing NEXT_PUBLIC_* sections ...

#####
##### Extensions (sidecar — separate container)
#####
# PROMETHEUS_* / OTEL_* — see infra/config/env-templates/extensions.env.example
```

For K8s cluster deploys, comment that Cloudflare keys live in `podverse-integrations-config`.

---

## 4. App `.env.example` (main containers)

Web/management-web app `.env.example`:

- `RUNTIME_CONFIG_URL` only (unchanged)
- Point to sidecar `.env.example` for integrations

Api/workers `.env.example`:

- **Extensions** remains **last section**
- Renamed keys from Plan 02

---

## 5. K8s source env comments

Update comments in:

- `infra/k8s/base/web/source/web-sidecar.env`
- `infra/k8s/base/management-web/source/management-web-sidecar.env`
- `infra/k8s/base/api/source/api.env` (extensions pointer)

---

## 6. Local env setup (optional)

If [`scripts/local-env/setup.sh`](../../../scripts/local-env/setup.sh) should merge integrations template into sidecar env on setup, add minimal hook; otherwise document manual copy from `integrations.env.example`.

---

## 7. Verification

- [ ] All `.env.example` files match section order and key names per [env-file-formatting skill](../../../.cursor/skills/env-file-formatting/SKILL.md)
- [ ] `make local_env_setup` (or doc) still valid for contributors
- [ ] K8s source env comments reference correct ConfigMap names

---

## Out of scope

- Home override stubs under `dev/env-overrides/local/` (add later if needed)
