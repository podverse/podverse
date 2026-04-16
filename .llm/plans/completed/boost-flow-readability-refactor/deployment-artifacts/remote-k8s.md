# Deployment Artifact - remote k8s

Date: 2026-04-16

## Executed Commands

```bash
git diff -- infra/k8s
git diff --cached -- infra/k8s
kubectl get applications -A
kubectl get pods -A
```

## Results

- `git diff -- infra/k8s`: no unstaged output
- `git diff --cached -- infra/k8s`: staged diff confirms MetaBoost keys added in:
  - `infra/k8s/base/web/source/web-sidecar.env`
- `kubectl get applications -A`: failed (API server timeout)
- `kubectl get pods -A`: failed (API server timeout)

## Runtime-Config Payload / MetaBoost Key Evidence

GitOps-tracked staged manifest diff includes:

- `NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD=`
- `NEXT_PUBLIC_APP_VALUE_METABOOST_NODE=`

No live remote runtime payload could be fetched due cluster connectivity timeout.

## Pod/Service Health Evidence

- No remote pod health evidence available from this session because `kubectl` could not connect.

## MB1-Capable Initialization Scenario

- Could not validate live remote sidecar/web startup in this session due kube API connectivity blocker.

## Status

- Blocked on remote cluster access from current environment.
- Manifest-side readiness evidence exists (staged k8s env update present).
