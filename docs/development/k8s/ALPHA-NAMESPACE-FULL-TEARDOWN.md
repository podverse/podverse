# Alpha Namespace Full Teardown (Safety-First)

This runbook is for fully tearing down one Kubernetes alpha namespace family at a time:

- Podverse family: `podverse-alpha`
- Boilerplate family: `boilerplate-alpha`

It is intentionally command-driven (no helper script required) and focuses on avoiding deletion from the wrong cluster.

## Scope

This process removes:

- Argo CD `Application` objects that reconcile the target namespaces
- all namespaced resources in target namespaces (Deployments, StatefulSets, Services, Ingresses, Secrets, ConfigMaps, Jobs, CronJobs, PVCs, etc.)
- orphaned PersistentVolumes related to those namespaces, when reclaim policy leaves them behind

## Safety model

Before any destructive command, verify all three identity gates:

1. exact kube context
2. expected API server URL fragment
3. expected target namespaces exist on that cluster

If any gate fails, stop immediately.

## Recommended teardown order

1. Confirm cluster identity (hard gate).
2. Inventory all namespace resources and PV associations (read-only snapshot).
3. Remove/suspend Argo CD apps that manage those namespaces (GitOps first).
4. Delete the target namespaces.
5. Delete any retained PVs tied to those namespaces.
6. Verify zero remaining namespaced and storage artifacts.

## 1) Hard cluster identity gate (required)

Pick exactly one target profile first.

Podverse profile (`bash`/`zsh`):

```bash
export EXPECTED_CONTEXT="<your-context>"
export EXPECTED_SERVER_FRAGMENT="<unique-api-server-fragment>"
export TARGET_KIND="podverse"
export TARGET_NAMESPACES="podverse-alpha"
export TARGET_PATTERN="podverse-alpha"
```

Podverse profile (`fish`):

```fish
set -x EXPECTED_CONTEXT <your-context>
set -x EXPECTED_SERVER_FRAGMENT <unique-api-server-fragment>
set -x TARGET_KIND podverse
set -x TARGET_NAMESPACES podverse-alpha
set -x TARGET_PATTERN podverse-alpha
```

Boilerplate profile (`bash`/`zsh`):

```bash
export EXPECTED_CONTEXT="<your-context>"
export EXPECTED_SERVER_FRAGMENT="<unique-api-server-fragment>"
export TARGET_KIND="boilerplate"
export TARGET_NAMESPACES="boilerplate-alpha"
export TARGET_PATTERN="boilerplate-alpha"
```

Boilerplate profile (`fish`):

```fish
set -x EXPECTED_CONTEXT <your-context>
set -x EXPECTED_SERVER_FRAGMENT <unique-api-server-fragment>
set -x TARGET_KIND boilerplate
set -x TARGET_NAMESPACES boilerplate-alpha
set -x TARGET_PATTERN boilerplate-alpha
```

Run and validate:

```bash
kubectl config current-context
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'; echo
kubectl get ns | rg "^${TARGET_PATTERN}$"
```

Block execution if mismatch:

```bash
test "$(kubectl config current-context)" = "$EXPECTED_CONTEXT"
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' | rg "$EXPECTED_SERVER_FRAGMENT"
```

## 2) Pre-delete inventory snapshot (read-only)

```bash
for ns in $TARGET_NAMESPACES; do
  echo "===== $ns ====="
  kubectl --request-timeout=10s -n "$ns" get all,ingress,pvc,cm,secret,job,cronjob || true
done
kubectl --request-timeout=10s get pv -o wide | rg "$TARGET_PATTERN" || true
kubectl --request-timeout=10s -n argocd get applications | rg "$TARGET_PATTERN" || true
```

`fish` equivalent:

```fish
for ns in $TARGET_NAMESPACES
  echo "===== $ns ====="
  kubectl --request-timeout=10s -n "$ns" get all,ingress,pvc,cm,secret,job,cronjob; or true
end
kubectl --request-timeout=10s get pv -o wide | rg "$TARGET_PATTERN"; or true
kubectl --request-timeout=10s -n argocd get applications | rg "$TARGET_PATTERN"; or true
```

## 3) Remove Argo CD ownership first (GitOps-first)

Recommended: remove/disable the related `Application` manifests in your GitOps repo, push, then sync Argo.

If using imperative delete for Argo apps, verify each app name carefully first:

```bash
kubectl -n argocd get applications | rg "$TARGET_PATTERN"
```

Then delete only confirmed targets:

```bash
# Replace with exact application names after review.
kubectl -n argocd delete application <app-name-1>
kubectl -n argocd delete application <app-name-2>
```

Wait until no matching apps remain:

```bash
kubectl -n argocd get applications | rg "$TARGET_PATTERN" || true
```

## 4) Delete namespaces

Final safety re-check:

```bash
test "$(kubectl config current-context)" = "$EXPECTED_CONTEXT"
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' | rg "$EXPECTED_SERVER_FRAGMENT"
```

Delete:

```bash
for ns in $TARGET_NAMESPACES; do kubectl delete namespace "$ns" --wait=false; done
```

Track progress:

```bash
kubectl get ns | rg "$TARGET_PATTERN" || true
```

## 5) Cleanup retained PersistentVolumes (if any)

Identify PVs still bound/released for deleted namespaces:

```bash
kubectl get pv -o wide | rg "$TARGET_PATTERN" || true
```

Inspect reclaim policy and claim reference before deleting:

```bash
kubectl get pv <pv-name> -o yaml
```

Delete only confirmed leftover PVs:

```bash
kubectl delete pv <pv-name>
```

If your storage class uses external cloud disks with `Retain`, remove backing disks/snapshots in your cloud provider after confirming ownership.

## 6) Final verification checklist

```bash
kubectl get ns | rg "$TARGET_PATTERN" || true
kubectl -n argocd get applications | rg "$TARGET_PATTERN" || true
kubectl get pv -o wide | rg "$TARGET_PATTERN" || true
```

Success criteria:

- no target namespaces present
- no matching Argo CD applications present
- no leftover PVs tied to target namespaces (unless intentionally retained and documented)

## Terminating namespace fallback

If a namespace is stuck in `Terminating`:

1. inspect finalizers and blocking resources
2. re-run cluster identity gate
3. only then remove finalizers

```bash
for ns in $TARGET_NAMESPACES; do kubectl get namespace "$ns" -o yaml; done
```

See also: [REMOTE-K8S-GITOPS](./REMOTE-K8S-GITOPS.md).
