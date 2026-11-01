**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 06 — Docs, adoption checklist, and close

## Rows

R9

## Runs after

01–05 and 07

## Inputs

From `.artifacts/plan-runner/cron-health-alerting/` (when run by plan-runner; otherwise ask the
operator to paste them):

- "Docs for 06" and "Release notes entry" from prompts 01, 02, and 03.
- "Docs for 06" and "Release notes entry" (or "Release scratchpad") from prompt 07.
- **Use 07's text instead of** the "Docs for 06" and "Release notes entry" sections in 04's and
  05's final messages. Those describe a Matrix design that was dropped and that 07 removed.

Notifications go to **ntfy only**. Nothing in the docs mentions Matrix, Matrix rooms, a Matrix
relay, or an AI assistant. If any input text does, drop that part.

## Changes

1. `infra/k8s/alpha/examples/optional-alerting/kustomization.yaml`: lists `kube-state-metrics.yaml`,
   `cluster.rules.yaml`, and `alertmanager.yaml`, with `namespace: monitoring`. Include the Podverse
   rules as a **commented** remote resource
   (`https://github.com/podverse/podverse//infra/k8s/base/monitoring?ref=X.Y.Z-staging.N`), the
   same way `infra/k8s/alpha/common/kustomization.yaml` comments optional remote bases, so
   `kustomize build` of the example works offline. Do not include `argocd-notifications-cm.yaml`
   (different namespace) or `prometheus-alerting.snippet.yaml` (a merge snippet, not a resource);
   the README covers both.
2. `infra/k8s/alpha/examples/optional-alerting/README.md`: a GitOps checklist in the style of
   `optional-extension-metrics/README.md`:
   - Prerequisites: hosted ntfy.sh on the **free tier, no account**. One long random topic per
     environment (Podverse alpha, Metaboost alpha), generated with `openssl rand -hex 16`. The topic
     name is the secret: anyone who has it can read and post, so it lives only in the SOPS Secrets,
     never in git. The bearer token is optional. Subscribe each topic on a phone through the ntfy
     iPhone app, and on a Mac through the ntfy.sh web app with browser notifications granted.
   - Free-tier daily limit from 07 (shared by everything posting from the cluster); HTTP 429
     rejections mean alerts are being dropped and it is time to move to ntfy Pro.
   - What goes where: 07's priority table (critical 5, warning 3, resolved 2; sync failed 5,
     Degraded 4, deploy live 2). Watchdog goes only to the external dead-man check.
   - Why ntfy is hosted and not in the cluster: an outage alert cannot come from the cluster it is
     about. Self-hosting is fine outside the cluster.
   - Order: secrets → kube-state-metrics → rules and Prometheus snippet → Alertmanager → Argo CD
     notifications → Watchdog external check → test delivery at each severity (07's `amtool`
     commands), checked on the phone and the Mac.
   - Pausing a job on purpose (silence with an end time).
   - What each piece can and cannot see: Alertmanager and Argo CD hold only ntfy topic URLs and an
     optional token; nothing reads Kubernetes Secrets; kube-state-metrics cannot list Secrets or
     ConfigMaps.
   - Rotating a topic name: generate a new one, update the Secret, resubscribe devices.
   - Pinning: bump the monitoring base `?ref=` with the other `?ref=` pins.
3. `docs/development/k8s/REMOTE-K8S-GITOPS.md`: an "Optional alerting (ntfy)" section after
   "Optional cluster metrics" linking the README, and the two new generator scripts in the secrets
   list. Adjust the sentence saying Prometheus and Grafana live only in GitOps so it is accurate:
   deployments live in GitOps; the monorepo ships rules and copy-and-adapt examples.
4. `infra/k8s/INFRA-K8S.md`: the CronJob contract (label, deadline, exit-78 fail-fast, check
   script) and the `base/monitoring` section, from 01's and 02's text.
5. `infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`: one line each for
   the two new scripts (`create_ntfy_alerts_secret.sh`, `create_argocd_notifications_secret.sh`),
   from 07's text. They are optional; do not add them to `create_all_secrets_auto_gen.sh`.
6. Append to `release-notes/scratchpad.md`, each as its own entry: the entries from 01, 02, 03, and
   07 (not 04 or 05), plus one for this prompt's docs if it changes operator steps.
7. Move the set to `.llm/plans/completed/cron-health-alerting/` per the plan-completion skill.

## Final message

End with this verification block for the operator (Root tab), adding the exact `promtool`
commands prompt 03 gave and the `amtool check-config` command prompt 07 gave:

```
bash infra/k8s/scripts/check_cronjob_contract.sh
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/cron
kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/base/ops
kustomize build infra/k8s/base/monitoring
kustomize build infra/k8s/alpha/examples/optional-alerting
nix shell nixpkgs#prometheus -c promtool check rules infra/k8s/base/monitoring/podverse.rules.yaml infra/k8s/base/monitoring/workloads.rules.yaml
nix shell nixpkgs#prometheus -c promtool test rules infra/k8s/base/monitoring/rules.test.yaml
nix shell nixpkgs#prometheus-alertmanager -c amtool check-config <path from 07's final message>
```
