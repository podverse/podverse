# Remote Kubernetes (GitOps)

Use this guide to deploy Podverse to a remote Kubernetes cluster with Argo CD and a **separate GitOps repository**.

**Working directory:** This guide always assumes you have a local **GitOps repository directory** (for example a checkout of your private GitOps repo) that contains `apps/…`, `argocd/…`, `secrets/…`, and `scripts/…` (with Podverse **secret-generator** scripts under `./scripts/secret-generators/`). All cluster-facing and GitOps steps run **from that directory**, not from a checkout of the Podverse monorepo. Reference Podverse with **remote Kustomize** `resources` URLs to `https://github.com/podverse/podverse//…?ref=…` and **copy** secret-generator scripts from the monorepo into your GitOps tree as needed.

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
  - CI builds and tags images (`staging` branch -> immutable `X.Y.Z-staging.N` Git tags + GHCR); GitOps
    overlays pin the same `X.Y.Z-staging.N` for remote `?ref=` and `images[].newTag`
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

### Ownership boundary (portable Argo model)

- Keep **live** Argo CD `Application` manifests in the GitOps repository for each environment.
- Keep **portable source artifacts** in Podverse:
  - Argo application-set examples (copy/paste starter files)
  - Sync-wave ordering contract and rationale
  - Reusable validation scripts that GitOps CI can call
- Do **not** apply Podverse `infra/k8s/alpha/apps/*` directly as your environment source of truth unless
  your team intentionally runs GitOps from this monorepo.

## Defaults

- **Image tags (alpha):** set Podverse app images to `newTag: "X.Y.Z-staging.N"` (same value CI publishes to GHCR).
- **Remote base refs (alpha):** set Podverse remote bases to `?ref=X.Y.Z-staging.N` (same immutable Git tag).
- **Bump together:** when you promote a staging release, update both `?ref=` and `newTag` to the new `X.Y.Z-staging.N` (example: `X.X.X-staging.N`).

## Health readiness semantics (management-api vs Metaboost)

- **Main API:** Readiness (`…/health/ready`) checks database and KeyValDB reachability (see [`apps/api/src/lib/health/registerHealthRoutes.ts`](../../../apps/api/src/lib/health/registerHealthRoutes.ts)).
- **Management API:** Readiness checks **management database and app database only**—no KeyValDB probe (see [`apps/management-api/src/lib/health/registerHealthRoutes.ts`](../../../apps/management-api/src/lib/health/registerHealthRoutes.ts)). Base manifests wait for Postgres and management migrations; there is **no** KeyVal wait init on management-api.
- **Metaboost:** Management-api readiness there also requires **Valkey** unless the app is configured to skip that check; base manifests include a Valkey TCP wait init before migrations. When copying mental models or runbooks between products, do not assume identical management-api readiness semantics.

## Encrypted secrets (GitOps repository)

Workload secrets, registry pull secrets, and other cluster credentials live **only** in your GitOps repository (commonly under `secrets/`; exact paths and filenames depend on how that repo is organized).

Typical order of operations:

- Ensure the target **namespace** exists or will be created before you apply Secrets into it.
- If your manifests reference `imagePullSecrets`, create the **container registry pull** secret your overlay expects (default encrypted file: **`secrets/github-registry-secret.enc.yaml`** at repo root when using the Podverse generator).
- Generate or author **opaque and integration** secrets using **your GitOps repository’s** documented scripts, templates, and root `.sops.yaml`. Commit **encrypted** manifests only; do not commit cleartext credentials.
- If Argo CD must clone a **private GitHub** GitOps repository over HTTPS, use **`create_argocd_github_repo_secret.sh`** from the GitOps repo root (see [`INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`](../../../infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md)); the same file may be vendored elsewhere for discoverability. Prefer the script’s derived **`<slug>-repo-creds`** / **`./secrets/<slug>-argoc-repo.enc.yaml`** convention so every GitOps URL follows one pattern; repository Secrets always belong in the **`argocd`** namespace.

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
   ./scripts/secret-generators/create_github_registry_secret.sh
   # Namespace prompt sets the Secret’s target namespace in-cluster; default file is secrets/github-registry-secret.enc.yaml — commit as generated
   ```

2. **Auto-generated opaque secrets** (random values; one invocation):

   ```fish
   ./scripts/secret-generators/create_all_secrets_auto_gen.sh $ENV
   ```

   This runs the generators in dependency order (see [INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md](../../../infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md)); each uses **`--auto-gen`**. Outputs are **`./secrets/podverse-$ENV-*-opaque.enc.yaml`** at the **GitOps** repository root. Commit those files; do not commit cleartext. The bulk runner’s end-of-run **NOTE** lists optional follow-ups (for example web-push env).

3. **Pre-sync contract checks (required):**

   ```fish
   ./scripts/secret-generators/check_db_secret_contract.sh $ENV
   ./scripts/check_podverse_alpha_version_contract.sh
   ```

   These checks must pass before Argo sync:
   - DB secrets include `OWNER`, `MIGRATOR`, `READ_WRITE`, and `READ` keys for both app and management DB.
   - All Podverse alpha `?ref=` values are identical and all Podverse app `images[].newTag` values match that same release string.

4. **Additional credential scripts** (run individually when credentials are available):

   Run only what you need:
   - `./scripts/secret-generators/create_api.podcastindex.org_secret.sh`
   - `./scripts/secret-generators/create_firebase_secret.sh`
   - `./scripts/secret-generators/create_mailer_secret.sh`
   - `./scripts/secret-generators/create_metaboost_secret.sh`
   - `./scripts/secret-generators/create_workers_digital_ocean_secret.sh`

5. **Cloudflare API token for cert-manager DNS01** (optional; when ACME uses Cloudflare-managed zones):

   Create a Cloudflare API token with `Zone - DNS - Edit` and `Zone - Zone - Read`, scoped only to the
   required zones. Generate the encrypted manifest:

   ```fish
   ./scripts/secret-generators/create_cloudflare_api_token_secret.sh
   ```

   Default encrypted file: **`secrets/cloudflare-api-token-secret.enc.yaml`**. Apply it with the
   optional Cloudflare branches in **§4** (dry-run and apply); the manifest targets namespace
   `cert-manager` with key `api-token`, not `$NAMESPACE`. Align ingress `ClusterIssuer` and DNS01 wiring
   with **§5** below.

### 4. Validate secrets, then apply (cluster)

**`$GITOPS_REPO_DIR`**. **Requires** the encrypted files from **Generate encrypted secrets** and working SOPS decrypt for that repo’s **`.sops.yaml`**.

The GHCR pull secret (from the registry sub-step under **Generate encrypted secrets**) defaults to **`secrets/github-registry-secret.enc.yaml`** at repo root, same layout as the opaque `podverse-$ENV-*.enc.yaml` files. If that file is absent, the `github-registry` branch below is skipped.

The Cloudflare DNS01 secret from **§3 step 4** defaults to **`secrets/cloudflare-api-token-secret.enc.yaml`** at repo root. The decrypted manifest sets **`metadata.namespace: cert-manager`** (do not pass `-n $NAMESPACE`). If that file is absent, the Cloudflare branches below are skipped. **`cert-manager`** must exist before server dry-run / apply (normally created when cert-manager is installed).

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
if test -f secrets/cloudflare-api-token-secret.enc.yaml
  sops -d secrets/cloudflare-api-token-secret.enc.yaml | kubectl apply --dry-run=server -f -
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
if test -f secrets/cloudflare-api-token-secret.enc.yaml
  sops -d secrets/cloudflare-api-token-secret.enc.yaml | kubectl apply -f -
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
5. **Cloudflare DNS01 token secret (when using Cloudflare-managed zones):** run the generator and apply
   the Secret per **§3 step 4** (upstream reference:
   [`infra/k8s/scripts/secret-generators/create_cloudflare_api_token_secret.sh`](../../../infra/k8s/scripts/secret-generators/create_cloudflare_api_token_secret.sh)).

**References:** [`infra/k8s/INFRA-K8S.md`](../../../infra/k8s/INFRA-K8S.md), [`infra/k8s/K8S.md`](../../../infra/k8s/K8S.md), [`INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`](../../../infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md). If you use **Boilerplate** to render into a GitOps checkout (`configMapGenerator`, `make alpha_env_render`, etc.), follow [K8S-ENV-RENDER.md](https://github.com/podverse/boilerplate/blob/develop/docs/development/K8S-ENV-RENDER.md).

### 6. Local kustomize compile (GitOps overlays)

At **`$GITOPS_REPO_DIR`**, run `kubectl kustomize` for every application overlay (adjust the component list to match your repo). Run it again when you change overlay files or add patches.

```fish
cd "$GITOPS_REPO_DIR"
for c in common db keyvaldb mq ops api management-api workers cron web management-web
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

Canonical wave contract reference: [ARGOCD-SYNC-WAVE-CONTRACT.md](ARGOCD-SYNC-WAVE-CONTRACT.md).

Or use the Argo CD UI. Then:

```fish
kubectl -n $NAMESPACE get pods
kubectl -n $NAMESPACE get svc,ingress
kubectl -n argocd get applications
# API responds on `/` and on `${API_PREFIX}${API_VERSION}/` (default `/api/v2/`) when env matches base api.env
curl -sI https://api.example.com/api/v2/
```

### 9. Post-sync DB bootstrap verification (required)

Use the suspended ops CronJob template added in the Podverse base to verify extension/baseline/grant contracts after DB sync:

```fish
kubectl -n $NAMESPACE create job --from=cronjob/ops-db-verify-bootstrap-contract ops-db-verify-bootstrap-contract-manual
kubectl -n $NAMESPACE logs -f job/ops-db-verify-bootstrap-contract-manual
```

Expected result includes: `Bootstrap contract verification passed for app and management databases.`

If it fails, do **not** proceed to app rollouts until the DB bootstrap contract is green.

### 10. Deterministic recovery for partial initdb persistence

If DB init scripts partially ran (for example `0003` failed once, PVC kept partial data, and later restarts skipped init scripts), use this exact recovery sequence:

1. Scale down Podverse workloads that depend on DB (`api`, `management-api`, `workers`, `cron`, `web`, `management-web`).
2. Delete the DB StatefulSet pod and PVC for the target namespace.
3. Re-sync `db` app so Postgres initializes from a clean volume and re-runs `0001`/`0002`/`0003`/`0004`.
4. Run **post-sync DB bootstrap verification** (section above) and confirm success.
5. Re-sync / scale up app workloads only after verification passes.

Example commands (adjust names if your overlays differ):

```fish
kubectl -n $NAMESPACE scale deploy/podverse-api deploy/podverse-management-api deploy/podverse-workers deploy/podverse-web deploy/podverse-management-web --replicas=0
kubectl -n $NAMESPACE delete cronjob podverse-cron
kubectl -n $NAMESPACE delete pod podverse-db-0
kubectl -n $NAMESPACE delete pvc db-data-podverse-db-0
```

## GitOps overlay contract

In your GitOps repo overlays:

- `resources:` remote bases use:
  - `https://github.com/podverse/podverse//infra/k8s/base/<component>?ref=X.Y.Z-staging.N`
- Keep each Podverse leaf base self-contained (no sibling `../` imports).
- For API and management-api overlays, include `base/product-membership` explicitly alongside `base/api` or `base/management-api`:
  - `https://github.com/podverse/podverse//infra/k8s/base/product-membership?ref=X.Y.Z-staging.N`
- Podverse app `images[].newTag` use the **same** immutable tag as `?ref=` (not a floating `:staging` tag).

Keep this contract consistent across `api`, `web`, `management-api`, `management-web`, `workers`, and `cron`.

Migration note: if your GitOps repo previously relied on product-membership being pulled transitively from `base/api` or `base/management-api`, add the explicit `base/product-membership` resource in the same change that bumps your `?ref=` tag.

## Argo CD source contract

In your GitOps repo Argo `Application` manifests:

- `spec.source.repoURL` points to **your GitOps repository**
- `spec.source.targetRevision` points to your tracked branch (commonly `main`)
- `spec.source.path` points to your local GitOps overlay path (`apps/podverse-alpha/<component>`)

Do not confuse:

- `targetRevision` for the GitOps repo branch (usually `main`)
- `?ref=` for remote Podverse base manifests (immutable Git tag `X.Y.Z-staging.N`, matching images)

**Database `Application` (PostgreSQL StatefulSet):** The API server may add `apiVersion` and `kind` on each entry under `spec.volumeClaimTemplates` on the live `StatefulSet` while manifests in Git omit those fields. Argo CD then reports **OutOfSync** even after a successful sync. Fix by adding `spec.ignoreDifferences` on the DB child `Application` for `group: apps`, `kind: StatefulSet`, and `jqPathExpressions` such as `.spec.volumeClaimTemplates[0].apiVersion` and `.spec.volumeClaimTemplates[0].kind` (adjust the index if you use more than one claim template). See `infra/k8s/alpha/apps/db.yaml` in the Podverse monorepo for a concrete example.

## Verification checklist

- Pods are ready:

```fish
kubectl -n $NAMESPACE get pods
```

- Services and ingress exist:

```fish
kubectl -n $NAMESPACE get svc,ingress
```

- Public endpoints respond (replace `api.example.com`; path follows API env, default below):

```fish
curl -sI https://api.example.com/api/v2/
```

## Related docs

- [PUBLISH](../../operations/PUBLISH.md)
- [ALPHA-DEPLOYMENT](../../operations/ALPHA-DEPLOYMENT.md) (CI, tags, local/server alpha; pairs with this guide for remote GitOps)
- [infra/k8s/README](../../../infra/k8s/INFRA-K8S.md)

## Documentation guardrails (must pass)

- No operator-specific domains or private GitOps repository URLs in this file.
- Use placeholders (`example.com`, `<env>`, `<namespace>`, `<gitops-repo>`, `GITOPS_REPO_DIR`). The **end-to-end checklist** may use **concrete script basenames** (`create_all_secrets_auto_gen.sh`, `create_github_registry_secret.sh`, and `create_*_secret.sh`) and the example AppProject path `argocd/apps/project-podverse.yaml` as a **reference layout**; forks may rename `project-podverse` or `podverse-alpha` to match their repo. Remote deploy steps **assume** a GitOps working tree; the Podverse monorepo is referenced only for
  upstream script sources.
- Keep environment-specific hostnames and secret values in operator GitOps docs, not in cleartext here.
