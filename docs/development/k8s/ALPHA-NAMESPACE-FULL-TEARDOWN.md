# Alpha Namespace Full Teardown (Safety-First)

This runbook is for fully tearing down the **podverse-alpha** namespace: every workload, volume claim, and Argo CD `Application` that targets it, on a Kubernetes cluster.

## Scripted teardown (recommended)

From the monorepo root, run the interactive **bash** helper (prompts for context, API server substring, pattern, and namespaces; gates; inventory; Argo `Application` deletes; namespace deletes; optional PV cleanup):

```bash
./scripts/k8s/alpha-namespace-full-teardown.sh
```

- **`--dry-run`** — identity gate + inventory only (no deletes).
- **`-y` / `--yes`** — skip typed confirmations and yes/no prompts (still dangerous; default is interactive).

Prerequisite: **`kubectl`** configured; optionally **`rg`** for faster filtered listings (`grep -F` is used otherwise).

## Manual runbook (fish)

Alternatively, use **[fish](https://fishshell.com/)** 3.x (run **`fish`**, or paste into a fish session). The sections below are intentionally command-driven for operators who prefer manual steps.

## Scope

This process removes:

- Argo CD `Application` objects that reconcile the `podverse-alpha` namespace
- all namespaced resources in `podverse-alpha` (Deployments, StatefulSets, Services, Ingresses, Secrets, ConfigMaps, Jobs, CronJobs, PVCs, etc.)
- orphaned PersistentVolumes related to that namespace, when reclaim policy leaves them behind

## Safety model

Before any destructive command, verify all three identity gates:

1. exact kube context
2. expected API server URL fragment
3. the `podverse-alpha` namespace exists on that cluster

If any gate fails, stop immediately.

## Recommended teardown order

1. Confirm cluster identity (hard gate).
2. Inventory all namespace resources and PV associations (read-only snapshot).
3. Remove/suspend Argo CD apps that manage `podverse-alpha` (GitOps first).
4. Delete the namespace.
5. Delete any retained PVs tied to that namespace.
6. Verify zero remaining namespaced and storage artifacts.

## 1) Hard cluster identity gate (required)

Set variables (edit placeholders to match your target cluster and API server URL fragment—see [REMOTE-K8S-GITOPS](./REMOTE-K8S-GITOPS.md) if you need the overall GitOps context):

```fish
set -x EXPECTED_CONTEXT "<your-context>"
set -x EXPECTED_SERVER_FRAGMENT "<unique-api-server-fragment>"
set -x TARGET_NAMESPACES podverse-alpha
set -x TARGET_PATTERN podverse-alpha
```

Run and validate:

```fish
kubectl config current-context
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'; echo
kubectl get namespace $TARGET_PATTERN
```

Block execution if these fail (context or API server not what you expect):

```fish
test (kubectl config current-context) = $EXPECTED_CONTEXT; or begin; echo "Context mismatch"; exit 1; end
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' | rg -F -- $EXPECTED_SERVER_FRAGMENT; or begin; echo "Server fragment mismatch"; exit 1; end
```

## 2) Pre-delete inventory snapshot (read-only)

```fish
for ns in $TARGET_NAMESPACES
  echo "===== $ns ====="
  kubectl --request-timeout=10s -n $ns get all,ingress,pvc,cm,secret,job,cronjob; or true
end
kubectl --request-timeout=10s get pv -o wide | rg -F -- $TARGET_PATTERN; or true
kubectl --request-timeout=10s -n argocd get applications | rg -F -- $TARGET_PATTERN; or true
```

## 3) Remove Argo CD ownership first (GitOps-first)

Recommended: remove/disable the related `Application` manifests in your GitOps repo, push, then sync Argo.

If using imperative delete for Argo apps, verify each app name carefully first:

```fish
kubectl -n argocd get applications | rg -F -- $TARGET_PATTERN
```

Then delete the child applications. For the default **Podverse** GitOps layout, `metadata.name` is `podverse-alpha-<component>` (see your repo’s `argocd/podverse-alpha/*.yaml`). **Order** is the **reverse** of the sync loop in [REMOTE-K8S-GITOPS](./REMOTE-K8S-GITOPS.md) §8: frontends and APIs first, datastores in the middle, **`podverse-alpha-common` last** (ingress / shared “common” resources).

```fish
# Requires TARGET_PATTERN from §1 (default: podverse-alpha). Override the list if your Application names differ.
set -l delete_order management-web web cron workers management-api api ops mq keyvaldb db common
for s in $delete_order
  kubectl -n argocd delete application $TARGET_PATTERN-$s
end
```

Full names, for search or one-off use: `podverse-alpha-management-web`, `podverse-alpha-web`, `podverse-alpha-cron`, `podverse-alpha-workers`, `podverse-alpha-management-api`, `podverse-alpha-api`, `podverse-alpha-ops`, `podverse-alpha-mq`, `podverse-alpha-keyvaldb`, `podverse-alpha-db`, `podverse-alpha-common`.

Wait until no matching apps remain:

```fish
kubectl -n argocd get applications | rg -F -- $TARGET_PATTERN; or true
```

## 4) Delete namespaces

Final safety re-check:

```fish
test (kubectl config current-context) = $EXPECTED_CONTEXT; or begin; echo "Context mismatch"; exit 1; end
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' | rg -F -- $EXPECTED_SERVER_FRAGMENT; or begin; echo "Server fragment mismatch"; exit 1; end
```

Delete:

```fish
for ns in $TARGET_NAMESPACES
  kubectl delete namespace $ns --wait=false
end
```

Track progress:

```fish
kubectl get ns | rg -F -- $TARGET_PATTERN; or true
```

## 5) Cleanup retained PersistentVolumes (if any)

Identify PVs still bound/released for deleted namespaces:

```fish
kubectl get pv -o wide | rg -F -- $TARGET_PATTERN; or true
```

Inspect reclaim policy and claim reference before deleting:

```fish
kubectl get pv <pv-name> -o yaml
```

Delete only confirmed leftover PVs:

```fish
kubectl delete pv <pv-name>
```

If your storage class uses external cloud disks with `Retain`, remove backing disks/snapshots in your cloud provider after confirming ownership.

## 6) Final verification checklist

```fish
kubectl get ns | rg -F -- $TARGET_PATTERN; or true
kubectl -n argocd get applications | rg -F -- $TARGET_PATTERN; or true
kubectl get pv -o wide | rg -F -- $TARGET_PATTERN; or true
```

Success criteria:

- `podverse-alpha` is not present
- no matching Argo CD applications present
- no leftover PVs tied to `podverse-alpha` (unless intentionally retained and documented)

## Terminating namespace fallback

If a namespace is stuck in `Terminating`:

1. inspect finalizers and blocking resources
2. re-run cluster identity gate
3. only then remove finalizers

```fish
for ns in $TARGET_NAMESPACES
  kubectl get namespace $ns -o yaml
end
```

See also: [REMOTE-K8S-GITOPS](./REMOTE-K8S-GITOPS.md).
