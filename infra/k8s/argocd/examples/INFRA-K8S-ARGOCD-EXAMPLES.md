# Argo CD examples (`infra/k8s/argocd/examples`)

These files are **templates** for GitOps repositories.

- Keep live environment-specific `Application` objects in your GitOps repo.
- Copy these files to `argocd/<env>/` in that repo and replace placeholders.
- Expected sync waves:
  - common: `-3`
  - db, keyvaldb, mq: `-2`
  - ops: `-1`
  - api, management-api: `0`
  - web, management-web: `1`
