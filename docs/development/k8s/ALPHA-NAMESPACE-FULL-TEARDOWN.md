# Alpha Namespace Full Teardown (Safety-First)

This runbook is for fully tearing down Kubernetes namespaces such as:

- `podverse-alpha`
- `boilerplate-alpha`

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

Set these values first:

```bash
export EXPECTED_CONTEXT="<your-context>"
export EXPECTED_SERVER_FRAGMENT="<unique-api-server-fragment>"
export TARGET_NAMESPACES="podverse-alpha boilerplate-alpha"
```

Run and validate:

```bash
kubectl config current-context
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'; echo
kubectl get ns | rg '^(podverse-alpha|boilerplate-alpha)$'
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
  kubectl -n "$ns" get all,ingress,pvc,cm,secret,job,cronjob || true
done

kubectl get pv -o wide | rg '(podverse-alpha|boilerplate-alpha)' || true
kubectl -n argocd get applications | rg '(podverse-alpha|boilerplate-alpha)' || true
```

## 3) Remove Argo CD ownership first (GitOps-first)

Recommended: remove/disable the related `Application` manifests in your GitOps repo, push, then sync Argo.

If using imperative delete for Argo apps, verify each app name carefully first:

```bash
kubectl -n argocd get applications | rg '(podverse-alpha|boilerplate-alpha)'
```

Then delete only confirmed targets:

```bash
# Replace with exact application names after review.
kubectl -n argocd delete application <app-name-1>
kubectl -n argocd delete application <app-name-2>
```

Wait until no matching apps remain:

```bash
kubectl -n argocd get applications | rg '(podverse-alpha|boilerplate-alpha)' || true
```

## 4) Delete namespaces

Final safety re-check:

```bash
test "$(kubectl config current-context)" = "$EXPECTED_CONTEXT"
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' | rg "$EXPECTED_SERVER_FRAGMENT"
```

Delete:

```bash
kubectl delete namespace podverse-alpha --wait=false
kubectl delete namespace boilerplate-alpha --wait=false
```

Track progress:

```bash
kubectl get ns | rg '(podverse-alpha|boilerplate-alpha)' || true
```

## 5) Cleanup retained PersistentVolumes (if any)

Identify PVs still bound/released for deleted namespaces:

```bash
kubectl get pv -o wide | rg '(podverse-alpha|boilerplate-alpha)' || true
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
kubectl get ns | rg '(podverse-alpha|boilerplate-alpha)' || true
kubectl -n argocd get applications | rg '(podverse-alpha|boilerplate-alpha)' || true
kubectl get pv -o wide | rg '(podverse-alpha|boilerplate-alpha)' || true
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
kubectl get namespace podverse-alpha -o yaml
kubectl get namespace boilerplate-alpha -o yaml
```

See also: [REMOTE-K8S-GITOPS](./REMOTE-K8S-GITOPS.md).
