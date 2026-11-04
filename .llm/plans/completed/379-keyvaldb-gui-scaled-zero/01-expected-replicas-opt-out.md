**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 01 — Opt-out label and DeploymentScaledToZero unless

## Rows

R1, R2, R3

## Runs after

none

## Problem

`DeploymentScaledToZero` fires whenever any Deployment stays at desired replicas 0 for more than
2 hours. `podverse-keyvaldb-gui` is meant to sit at 0 until an operator scales it up. Alpha's live
Prometheus rules are a hand copy of the monorepo files; kube-state-metrics currently publishes
only the CronJob `podverse-schedule` label, so a deployment opt-out label is invisible until the
allowlist grows.

## Decisions (locked)

1. **Label.** On the keyvaldb GUI Deployment metadata, set
   `podverse.fm/expected-replicas: "0"` (same `podverse.fm/` prefix as other ops labels). Do not
   put that label on `worker-image-shrink-consumer`; that zero-replica state should keep warning.
2. **PromQL.** Replace the `DeploymentScaledToZero` expr with:

   ```yaml
   expr: |
     kube_deployment_spec_replicas == 0
     unless on (namespace, deployment)
     kube_deployment_labels{label_podverse_fm_expected_replicas="0"} == 1
   ```

   Keep `for: 2h`, severity, summary, and description as they are.
3. **Allowlist.** kube-state-metrics must export the label. Change the flag from
   `cronjobs=[podverse-schedule]` to
   `cronjobs=[podverse-schedule],deployments=[podverse.fm/expected-replicas]` in every place that
   sets it (example + live Deployment + docs that quote the flag).
4. **Base + alpha patch.** Add the label on
   `infra/k8s/base/ops/keyvaldb-gui.deployment.yaml`. Alpha ops still pins
   `?ref=5.6.0-staging.6`, so also add a strategic-merge patch on Deployment
   `podverse-keyvaldb-gui` in
   `../k.podcastdj.com/apps/podverse-alpha/ops/kustomization.yaml` that sets the same label. The
   patch stays valid after the next pin already has the label.
5. **Live rules copy.** Update the `DeploymentScaledToZero` expr inside
   `../k.podcastdj.com/apps/prometheus/manifests/podverse-prometheus-rules.yaml` to match the
   monorepo. Do not rewrite other alerts in that ConfigMap.
6. **Tests.** Append two `promtool` cases to `infra/k8s/base/monitoring/rules.test.yaml` (same
   `interval: 1m` and `eval_time: 180m` shape as the CronJob suspend case):
   - `kube_deployment_spec_replicas{namespace="podverse-alpha",deployment="podverse-api"}` at 0
     for 181 samples → alert fires.
   - Same series for `deployment="podverse-keyvaldb-gui"` plus
     `kube_deployment_labels{namespace="podverse-alpha",deployment="podverse-keyvaldb-gui",label_podverse_fm_expected_replicas="0"}`
     at 1 → `exp_alerts: []`.
7. **Ticket reply.** Write
   `.llm/plans/active/379-keyvaldb-gui-scaled-zero/proposed-reply.md` and repeat the same text in
   a fenced `text` block in the final message. Do not run `gh issue comment` or any other write
   to the tracker.
8. **No cluster apply.** Do not run `kubectl`. Leave GitOps push and Argo sync to the operator.

## Work

1. Edit `infra/k8s/base/monitoring/workloads.rules.yaml`: set the locked `expr` on
   `DeploymentScaledToZero`.

2. Edit `infra/k8s/base/monitoring/rules.test.yaml`: append the two locked cases.

3. Edit `infra/k8s/base/ops/keyvaldb-gui.deployment.yaml`: under `metadata.labels`, add
   `podverse.fm/expected-replicas: "0"` next to the existing `app` / `component` labels.

4. Edit `infra/k8s/INFRA-K8S.md` under `## Prometheus rules (`base/monitoring`)`: change the
   allowlist line to include `deployments=[podverse.fm/expected-replicas]`, and add one sentence
   that a Deployment labeled `podverse.fm/expected-replicas: "0"` is excluded from
   `DeploymentScaledToZero`.

5. Edit `infra/k8s/alpha/examples/optional-alerting/kube-state-metrics.yaml`: update the
   `--metric-labels-allowlist=` arg to the locked string.

6. Edit `infra/k8s/alpha/examples/optional-alerting/README.md`: update the allowlist prose so it
   also mentions the deployment label on `kube_deployment_labels` as
   `label_podverse_fm_expected_replicas`.

7. Edit sibling GitOps paths (relative to this worktree):
   - `../k.podcastdj.com/apps/prometheus/manifests/podverse-prometheus-rules.yaml` — same
     `DeploymentScaledToZero` expr.
   - `../k.podcastdj.com/apps/kube-state-metrics/manifests/kube-state-metrics.yaml` — same
     allowlist arg.
   - `../k.podcastdj.com/apps/podverse-alpha/ops/kustomization.yaml` — add under `patches:`:

     ```yaml
     - target:
         kind: Deployment
         name: podverse-keyvaldb-gui
       patch: |-
         apiVersion: apps/v1
         kind: Deployment
         metadata:
           name: podverse-keyvaldb-gui
           labels:
             podverse.fm/expected-replicas: "0"
     ```

     Leave Service and CronJob patches as they are. Leave commit and push of that repo to the
     operator.

8. Append the release scratchpad entry below to `release-notes/scratchpad.md`.

9. Write `proposed-reply.md` with the text under **Ticket reply** below.

10. Close the set: move `01-expected-replicas-opt-out.md`, `00-SUMMARY.md`,
    `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, and `proposed-reply.md` to
    `.llm/plans/completed/379-keyvaldb-gui-scaled-zero/`, then remove the empty
    `active/379-keyvaldb-gui-scaled-zero/` directory.

## Files

- `infra/k8s/base/monitoring/workloads.rules.yaml`
- `infra/k8s/base/monitoring/rules.test.yaml`
- `infra/k8s/base/ops/keyvaldb-gui.deployment.yaml`
- `infra/k8s/INFRA-K8S.md`
- `infra/k8s/alpha/examples/optional-alerting/README.md`
- `infra/k8s/alpha/examples/optional-alerting/kube-state-metrics.yaml`
- `../k.podcastdj.com/apps/prometheus/manifests/podverse-prometheus-rules.yaml`
- `../k.podcastdj.com/apps/kube-state-metrics/manifests/kube-state-metrics.yaml`
- `../k.podcastdj.com/apps/podverse-alpha/ops/kustomization.yaml`
- `release-notes/scratchpad.md`
- `.llm/plans/active/379-keyvaldb-gui-scaled-zero/proposed-reply.md` (new; moves to completed with the set)

## Tests

- `promtool` cases in `infra/k8s/base/monitoring/rules.test.yaml` for `DeploymentScaledToZero`
  (fires without the opt-out label; stays quiet with
  `label_podverse_fm_expected_replicas="0"`). No unit, API, Playwright, or Maestro specs.

## Release scratchpad

```markdown
## DeploymentScaledToZero ignores expected zero replicas

- Surfaces: k8s, ops
- Change: Deployments labeled `podverse.fm/expected-replicas: "0"` no longer raise
  `DeploymentScaledToZero`. The keyvaldb GUI Deployment carries that label. kube-state-metrics
  allowlists the label on Deployments so the PromQL `unless` can see it.
- Who notices: alpha operators; the repeating keyvaldb-gui scaled-to-zero warning stops after
  the rule, allowlist, and label sync
- Operator steps: push monorepo and k.podcastdj.com changes; after Argo syncs prometheus,
  kube-state-metrics, and podverse-alpha-ops, wait for the next rule evaluation
```

## Ticket reply

Write this into `proposed-reply.md` and the final message. Operator pastes it on the issue after
the change is on `develop` and alpha `main`. No file names, plan numbers, or refactors.

```text
The keyvaldb GUI is meant to sit at zero replicas until someone scales it up, so that state no longer raises DeploymentScaledToZero. Other Deployments that stay at zero without the expected-replicas label still warn after two hours.
```
