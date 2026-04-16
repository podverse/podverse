# Deployment Artifact - local k8s

Date: 2026-04-16

## Executed Commands

```bash
make local_env_setup
make local_k8s_up
kubectl get pods -A
kubectl logs deployment/podverse-local-web-runtime-config -n podverse-local --tail=200
```

## Results

- `make local_env_setup`: pass
- `make local_k8s_up`: failed (`No rule to make target 'local_k8s_up'`)
- `kubectl get pods -A`: failed (API server timeout to configured kube endpoint)
- `kubectl logs ...`: not executed due prior cluster access failure

## Runtime-Config Payload / MetaBoost Key Evidence

K8s source env file includes MetaBoost keys:

- `NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD=`
- `NEXT_PUBLIC_APP_VALUE_METABOOST_NODE=`

Source inspected:

- `infra/k8s/base/web/source/web-sidecar.env`

No live local-k8s runtime payload could be fetched because cluster endpoint was unreachable.

## Pod/Service Health Evidence

- No pod health evidence available from local-k8s due kube API connectivity failure.

## MB1-Capable Initialization Scenario

- Could not validate against running local-k8s workload in this session due cluster access blocker.

## Status

- Blocked.
- Two blockers identified:
  1. Missing documented make target (`local_k8s_up`) in current repo makefiles.
  2. `kubectl` cannot reach configured API endpoint (`i/o timeout`).
