# Remote Kubernetes (GitOps)

Use this guide to deploy Podverse to a remote Kubernetes cluster with Argo CD and a **separate GitOps repository**.

**Working directory:** This guide always assumes you have a local **GitOps repository directory** (for example a checkout of your private GitOps repo) that contains `apps/…`, `argocd/…`, `secrets/…`, and `scripts/…` (with Podverse **secret-generator** scripts under `./scripts/secret-generators/`). All cluster-facing and GitOps steps run **from that directory**, not from a checkout of the Podverse monorepo.

The Podverse monorepo is the **source** for public base manifests (`infra/k8s/base/…`), upstream
secret-generator **source files** under
[`infra/k8s/scripts/secret-generators/`](../../../infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md)
(which you **copy** into the GitOps repo’s `./scripts/secret-generators/`). The Podverse monorepo is **not** the place to
run the GitOps secret-generation or `kubectl` phases of a remote deploy.

This document is intentionally domain-agnostic for open source use:

- Use placeholders like `<gitops-repo>`, `<namespace>`, `<env>`, `api.example.com`, `app.example.com`.
- Keep operator-specific hostnames, private repo URLs, and runbooks in your **GitOps** repository.

## Scope and model

- Podverse repository:
  - CI builds and tags images (`staging` branch -> `X.Y.Z-staging.N` + floating `:staging`); GitOps
    overlays reference those tags
  - Owns shared base manifests under `infra/k8s/base/`
  - **`infra/k8s/alpha/`** — reference **alpha** environment overlays (per-component
    `kustomization.yaml`, patches, env fragments) and **`infra/k8s/alpha/apps/`** Argo `Application`
    definitions for an in-repo App-of-Apps-style layout. A **separate GitOps repository** usually
    **mirrors** that layout under `apps/<namespace>/…` with the same remote **`infra/k8s/base/*`**
    `resources:` URLs and operator-specific values; the checklist below assumes that GitOps tree,
    not applying `infra/k8s/alpha/` directly from disk for remote deploy.
- GitOps repository:
  - Owns environment overlays (`apps/podverse-alpha/`)
  - Owns Argo `Application` manifests (`argocd/podverse-alpha/`)
  - Owns environment hostnames, ingress rules, TLS issuer selection, and encrypted secrets

## Defaults

- **Image tags (alpha):** set Podverse app images to `newTag: "staging"` in GitOps overlays.
- **Remote base refs (alpha):** set Podverse remote bases to `?ref=staging` by default.
- **Reproducible fallback:** pin all Podverse app images and remote base `?ref=` to the same immutable `X.Y.Z-staging.N` when needed.

## Encrypted secrets (GitOps repository)

Workload secrets, registry pull secrets, and other cluster credentials live **only** in your GitOps repository (commonly under `secrets/`; exact paths and filenames depend on how that repo is organized).

Typical order of operations:

- Ensure the target **namespace** exists or will be created before you apply Secrets into it.
- If your manifests reference `imagePullSecrets`, create the **container registry pull** secret your overlay expects (default encrypted file: **`secrets/github-registry-secret.enc.yaml`** at repo root when using the Podverse generator).
- Generate or author **opaque and integration** secrets using **your GitOps repository’s** documented scripts, templates, and root `.sops.yaml`. Commit **encrypted** manifests only; do not commit cleartext credentials.

Secret generator scripts and a **full ordered runbook** (below) are maintained in this document; your GitOps repository still owns hostnames, private URLs, and any repo-specific one-offs.

**Script upstream vs GitOps copy:** the reference implementations of workload and GHCR pull-secret helpers live in **this (Podverse) repository** under [`infra/k8s/scripts/secret-generators/`](../../../infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md) (for example `create_all_secrets_auto_gen.sh`, `create_github_registry_secret.sh`, and the `create_*_secret.sh` files the runner calls). **Your GitOps repository** should contain **copies** of those files under **`./scripts/secret-generators/`**, with default output paths pointing at the GitOps **`secrets/`** tree. Copy or sync from `podverse/infra/k8s/scripts/secret-generators/` when you need to update generators, then use **only** the GitOps checkout to run them (next to **`.sops.yaml`**). Upstream defaults and GitOps checkouts both use repo-root **`./secrets/…`** (same path layout; no per-repo `sed` rewrites for output paths).

Image build/tag and publish workflows are **not** part of this checklist; see
[ALPHA-DEPLOYMENT](../../operations/ALPHA-DEPLOYMENT.md) and [PUBLISH](../../operations/PUBLISH.md)
(Podverse source checkout where those docs say so; not from `<gitops-repo>`).

## End-to-end command checklist

Checklist steps use **fish** shell syntax. Set variables once (example names use `alpha`; substitute
`<namespace>`, `<env>`, and paths for your environment):

```fish
set -gx GITOPS_REPO_DIR "<absolute-path-to-your-gitops-repository>"
set -gx KUBE_CONTEXT "<kubectl-context-name>"
set -gx EXPECTED_SERVER_FRAGMENT "<unique-substring-of-api-server-url>"
set -gx NAMESPACE "podverse-alpha"
set -gx ENV "alpha"
```

Prerequisites: `kubectl`, `sops` (and keys for the GitOps repo’s `.sops.yaml`). Checklist commands use
**`$GITOPS_REPO_DIR`** as the working tree after `cd` unless a snippet says otherwise.

### 1. Hard safety gate (context + API server)

```fish
set current (kubectl config current-context)
test "$current" = "$KUBE_CONTEXT"; or begin
  echo "wrong kubectl context"
  exit 1
end
set server (kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
string match -q "*$EXPECTED_SERVER_FRAGMENT*" "$server"; or begin
  echo "API server mismatch: $server"
  exit 1
end
echo "gate ok: $server"
```

### 2. Namespace

```fish
cd "$GITOPS_REPO_DIR"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
```

### 3. Generate encrypted secrets (GitOps `./scripts/secret-generators/`)

At **`$GITOPS_REPO_DIR`**, with repo-root **`.sops.yaml`** and SOPS keys (not the Podverse monorepo). This step **writes** encrypted manifests for the dry-run and apply in the next section.

Use **`./scripts/secret-generators/`** there (kept in sync with [Podverse `infra/k8s/scripts/secret-generators/`](../../../infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md) as documented in your GitOps README), plus any **GitOps-only** scripts your operator repo adds beyond the Podverse set:

1. **Registry pull secret** (if your overlay uses `imagePullSecrets`; often interactive):

   ```fish
   chmod +x ./scripts/secret-generators/create_github_registry_secret.sh
   ./scripts/secret-generators/create_github_registry_secret.sh
   # Namespace prompt sets the Secret’s target namespace in-cluster; default file is secrets/github-registry-secret.enc.yaml — commit as generated
   ```

2. **Auto-generated opaque secrets** (random values; one invocation):

   ```fish
   chmod +x ./scripts/secret-generators/create_all_secrets_auto_gen.sh
   ./scripts/secret-generators/create_all_secrets_auto_gen.sh $ENV
   ```

   This runs, in order: `create_api_secret.sh`, `create_management_api_secret.sh`, `create_db_secret.sh`, `create_management_db_secret.sh`, `create_keyvaldb_secret.sh`, `create_mq_secret.sh`, `create_workers_add_by_rss_secret.sh` (each with `--auto-gen` as implemented by the generator). Outputs are **`./secrets/podverse-$ENV-*-opaque.enc.yaml`** at the **GitOps** repository root. Commit those files; do not commit cleartext.

3. **Manual / external credentials** (run when you have the real keys or files; these do not support the bulk auto-gen pass):

   ```fish
   chmod +x \
     ./scripts/secret-generators/create_api.podcastindex.org_secret.sh \
     ./scripts/secret-generators/create_firebase_secret.sh \
     ./scripts/secret-generators/create_workers_digital_ocean_secret.sh
   ```

   Then run only what you need:
   - `./scripts/secret-generators/create_api.podcastindex.org_secret.sh`
   - `./scripts/secret-generators/create_firebase_secret.sh`
   - `./scripts/secret-generators/create_workers_digital_ocean_secret.sh`

### 4. Validate secrets, then apply (cluster)

**`$GITOPS_REPO_DIR`**. **Requires** the encrypted files from **Generate encrypted secrets** and working SOPS decrypt for that repo’s **`.sops.yaml`**.

The GHCR pull secret (from the registry sub-step under **Generate encrypted secrets**) defaults to **`secrets/github-registry-secret.enc.yaml`** at repo root, same layout as the opaque `podverse-$ENV-*.enc.yaml` files. If that file is absent, the `github-registry` branch below is skipped.

**Server dry-run (no mutation):**

```fish
cd "$GITOPS_REPO_DIR"
test -f .sops.yaml; or begin
  echo "need .sops.yaml at gitops root"
  exit 1
end
if test -f secrets/github-registry-secret.enc.yaml
  sops -d secrets/github-registry-secret.enc.yaml | kubectl apply --dry-run=server -n $NAMESPACE -f -
end
for f in secrets/podverse-$ENV-*.enc.yaml
  test -e "$f"; or continue
  sops -d "$f" | kubectl apply --dry-run=server -n $NAMESPACE -f -
end
```

**Apply for real (after dry-run passes):**

```fish
if test -f secrets/github-registry-secret.enc.yaml
  sops -d secrets/github-registry-secret.enc.yaml | kubectl apply -f -
end
for f in secrets/podverse-$ENV-*.enc.yaml
  test -e "$f"; or continue
  sops -d "$f" | kubectl apply -f -
end
```

### 5. GitOps overlay env

In the Podverse monorepo, [`infra/k8s/alpha/`](../../../infra/k8s/alpha/) per-component `source/*.env` files are **comment-only** placeholders: add `KEY=value` lines there only when you need to override base defaults. For remote deploy, set the real values in your **GitOps** checkout under `apps/<namespace>/<component>/` (same layout), plus **patches** and **ingress** hostnames. Operator-specific values stay in your **private GitOps repository** (or in a monorepo render pipeline that writes into it).

**Recommended**

1. **Update every overlay you deploy** (`api`, `web`, `management-api`, `management-web`, `workers`, `cron`, plus `common` ingress/TLS if you maintain it there).
2. **ConfigMap vs Secret:** put non-sensitive values in **ConfigMap** / `configMapGenerator` with `envs:` (small `source/*.env` files merged into base or alpha). Put passwords and API keys in **SOPS Secrets** from the [`create_*` generator reference](../../../infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md).
3. **Ingress and workload hostnames:** use the same hostnames in ingress TLS `host` rules and in workload env (cookie domain, link generation, server-side fetch URLs) for that environment.
4. **Cluster issuer (cert-manager):** the monorepo’s [`infra/k8s/alpha/common/ingress-hosts-patch.yaml`](../../../infra/k8s/alpha/common/ingress-hosts-patch.yaml) defaults to `letsencrypt-staging`. In the **GitOps** repository, set `cert-manager.io/cluster-issuer` to `letsencrypt-prod` on the alpha ingress when you want production ACME certificates and the cluster has a `ClusterIssuer` with that name.

**References:** [`infra/k8s/README.md`](../../../infra/k8s/README.md), [`infra/k8s/K8S.md`](../../../infra/k8s/K8S.md), [`INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`](../../../infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md). If you use **Boilerplate** to render into a GitOps checkout (`configMapGenerator`, `make alpha_env_render`, etc.), follow [K8S-ENV-RENDER.md](https://github.com/podverse/boilerplate/blob/develop/docs/development/K8S-ENV-RENDER.md).

### 6. Local kustomize compile (GitOps overlays)

At **`$GITOPS_REPO_DIR`**, run `kubectl kustomize` for every application overlay (adjust the component list to match your repo). Run it again when you change overlay files or add patches.

```fish
cd "$GITOPS_REPO_DIR"
for c in common db keyvaldb mq api management-api workers cron web management-web
  kubectl kustomize "apps/$NAMESPACE/$c" --load-restrictor LoadRestrictionsNone >/dev/null
  echo "ok apps/$NAMESPACE/$c"
end
```

### 7. Argo `AppProject` and `Application` manifests

Example **AppProject** file name: `argocd/apps/project-podverse.yaml` (Argo `metadata.name` is often `podverse`; your fork may differ). **Dry-run, then apply:**

```fish
cd "$GITOPS_REPO_DIR"
kubectl apply --dry-run=server -f argocd/apps/project-podverse.yaml
kubectl apply --dry-run=server -f "argocd/$NAMESPACE/"
kubectl apply -f argocd/apps/project-podverse.yaml
kubectl apply -f "argocd/$NAMESPACE/"
```

### 8. Sync applications and verify

If the `argocd` CLI is installed, sync child apps **in the order of the loop below** (shared resources and datastores first, then APIs, workers, and cron, then web frontends). Example:

```fish
for a in common db keyvaldb mq ops api management-api workers cron web management-web
  printf 'argocd app sync %s-%s\n' $NAMESPACE $a
end
```

Or use the Argo CD UI. Then:

```fish
kubectl -n $NAMESPACE get pods
kubectl -n $NAMESPACE get svc,ingress
kubectl -n argocd get applications
curl -sI https://api.example.com/v1/health
```

## GitOps overlay contract

In your GitOps repo overlays:

- `resources:` remote bases use:
  - `https://github.com/podverse/podverse//infra/k8s/base/<component>?ref=staging`
- Podverse app `images[].newTag` use:
  - `staging` for alpha/preprod drift-forward behavior

Keep this contract consistent across `api`, `web`, `management-api`, `management-web`, `workers`, and `cron`.

## Argo CD source contract

In your GitOps repo Argo `Application` manifests:

- `spec.source.repoURL` points to **your GitOps repository**
- `spec.source.targetRevision` points to your tracked branch (commonly `main`)
- `spec.source.path` points to your local GitOps overlay path (`apps/podverse-alpha/<component>`)

Do not confuse:

- `targetRevision` for the GitOps repo branch (usually `main`)
- `?ref=` for remote Podverse base manifests (default `staging` in this guide)

## Verification checklist

- Pods are ready:

```fish
kubectl -n $NAMESPACE get pods
```

- Services and ingress exist:

```fish
kubectl -n $NAMESPACE get svc,ingress
```

- Public endpoints respond (replace placeholders):

```fish
curl -sI https://api.example.com/v1/health
```

## Related docs

- [PUBLISH](../../operations/PUBLISH.md)
- [ALPHA-DEPLOYMENT](../../operations/ALPHA-DEPLOYMENT.md) (CI, tags, local/server alpha; pairs with this guide for remote GitOps)
- [infra/k8s/README](../../../infra/k8s/README.md)

## Documentation guardrails (must pass)

- No operator-specific domains or private GitOps repository URLs in this file.
- Use placeholders (`example.com`, `<env>`, `<namespace>`, `<gitops-repo>`, `GITOPS_REPO_DIR`). The **end-to-end checklist** may use **concrete script basenames** (`create_all_secrets_auto_gen.sh`, `create_github_registry_secret.sh`, and `create_*_secret.sh`) and the example AppProject path `argocd/apps/project-podverse.yaml` as a **reference layout**; forks may rename `project-podverse` or `podverse-alpha` to match their repo. Remote deploy steps **assume** a GitOps working tree; the Podverse monorepo is referenced only for
  upstream script sources.
- Keep environment-specific hostnames and secret values in operator GitOps docs, not in cleartext here.
