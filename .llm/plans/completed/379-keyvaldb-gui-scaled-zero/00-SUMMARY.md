# Summary — silence expected scale-to-zero for keyvaldb GUI

Issue: [podverse/podverse#379](https://github.com/podverse/podverse/issues/379).
Prompts: [COPY-PASTA.md](COPY-PASTA.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Why this set exists

Alertmanager keeps firing `DeploymentScaledToZero` for
`podverse-alpha/podverse-keyvaldb-gui`. That Deployment ships `replicas: 0` on purpose: operators
scale it to 1 when they need RedisInsight, and Argo ignores `/spec/replicas` so a manual scale
survives sync. The alert expression is `kube_deployment_spec_replicas == 0` with no opt-out, so
the normal state looks like a warning on every cycle.

## Requirement ledger

- **R1** (area A) "Silence this alert for `podverse-keyvaldb-gui`, or retune it so the expected
  scaled-to-zero state doesn't fire." — Plan: 01
- **R2** (area A) "Exclude deployments with an opt-out label … in the `DeploymentScaledToZero`
  PromQL, by joining on `kube_deployment_labels`, and add that label to the keyvaldb-gui
  Deployment" — Plan: 01
- **R3** (area A) Ticket reply for the people in the issue thread after the change lands —
  Plan: 01 (`proposed-reply.md`)

## Areas

### Area A — Opt-out label and rule

- **Rows:** R1, R2, R3
- **Plan number block:** 01–09
- **Starts from:** `infra/k8s/base/monitoring/workloads.rules.yaml`,
  `infra/k8s/base/ops/keyvaldb-gui.deployment.yaml`,
  `../k.podcastdj.com/apps/prometheus/manifests/podverse-prometheus-rules.yaml`,
  `../k.podcastdj.com/apps/kube-state-metrics/manifests/kube-state-metrics.yaml`,
  `../k.podcastdj.com/apps/podverse-alpha/ops/kustomization.yaml`
- **Depends on:** no other area
- **Shared files with other areas:** none
