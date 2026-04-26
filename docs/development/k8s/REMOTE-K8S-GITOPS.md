# Remote Kubernetes (GitOps)

Use this guide to deploy Podverse to a remote Kubernetes cluster with Argo CD and a separate GitOps repository.

This document is intentionally domain-agnostic for open source use:

- Use placeholders like `<gitops-repo>`, `<namespace>`, `<env>`, `api.example.com`, `app.example.com`.
- Keep operator-specific hostnames, private repo URLs, and local runbooks in your GitOps repository docs.

## Scope and model

- Podverse repository:
  - Builds/publishes images (`staging` branch -> `X.Y.Z-staging.N` + floating `:staging`)
  - Owns shared base manifests under `infra/k8s/base/`
- GitOps repository:
  - Owns environment overlays (`apps/podverse-<env>/`)
  - Owns Argo `Application` manifests (`argocd/podverse-<env>/`)
  - Owns environment hostnames, ingress rules, TLS issuer selection, and encrypted secrets

## Defaults

- **Image tags (alpha):** set Podverse app images to `newTag: "staging"` in GitOps overlays.
- **Remote base refs (alpha):** set Podverse remote bases to `?ref=staging` by default.
- **Reproducible fallback:** pin all Podverse app images and remote base `?ref=` to the same immutable `X.Y.Z-staging.N` when needed.

## Dry-run first workflow

Before writing cluster state or committing changes:

1. Render and compile overlays locally:

```bash
kubectl kustomize apps/podverse-<env>/common --load-restrictor LoadRestrictionsNone >/dev/null
kubectl kustomize apps/podverse-<env>/api --load-restrictor LoadRestrictionsNone >/dev/null
kubectl kustomize apps/podverse-<env>/web --load-restrictor LoadRestrictionsNone >/dev/null
kubectl kustomize apps/podverse-<env>/management-api --load-restrictor LoadRestrictionsNone >/dev/null
kubectl kustomize apps/podverse-<env>/management-web --load-restrictor LoadRestrictionsNone >/dev/null
kubectl kustomize apps/podverse-<env>/workers --load-restrictor LoadRestrictionsNone >/dev/null
kubectl kustomize apps/podverse-<env>/cron --load-restrictor LoadRestrictionsNone >/dev/null
```

2. Validate Argo and app YAML before apply:

```bash
kubectl apply --dry-run=server -f argocd/apps/<project>.yaml
kubectl apply --dry-run=server -f argocd/podverse-<env>/
```

3. Validate encrypted secrets before apply:

```bash
sops -d secrets/<namespace>/<secret>.enc.yaml | kubectl apply --dry-run=server -n <namespace> -f -
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
- `spec.source.path` points to your local GitOps overlay path (`apps/podverse-<env>/<component>`)

Do not confuse:

- `targetRevision` for the GitOps repo branch (usually `main`)
- `?ref=` for remote Podverse base manifests (default `staging` in this guide)

## Recommended sync order

Sync in dependency order:

1. `common`
2. `db`, `keyvaldb`, `mq`
3. `api`, `management-api`, `workers`, `cron`
4. `web`, `management-web`

## Verification checklist

- Pods are ready:

```bash
kubectl -n <namespace> get pods
```

- Services and ingress exist:

```bash
kubectl -n <namespace> get svc,ingress
```

- Public endpoints respond (replace placeholders):

```bash
curl -sI https://api.example.com/v1/health
```

## Related docs

- [PUBLISH](../../operations/PUBLISH.md)
- [ALPHA-DEPLOYMENT](../../operations/ALPHA-DEPLOYMENT.md)
- [infra/k8s/README](../../../infra/k8s/README.md)

## Documentation guardrails (must pass)

- No operator-specific domains or repo URLs in this file.
- Use placeholders (`example.com`, `<env>`, `<namespace>`, `<gitops-repo>`).
- Keep environment-specific values in operator GitOps docs, not Podverse OSS docs.
