# CronJob health and alerting — execution order

Prompts and models: [COPY-PASTA.md](COPY-PASTA.md).

## Phase 1 (parallel; disjoint files)

- 01 — CronJob contract. Owns `infra/k8s/base/cron/*.cronjob.yaml`,
  `infra/k8s/base/ops/*.cronjob.yaml`, `infra/k8s/scripts/check_cronjob_contract.sh`,
  `.github/workflows/ci.yml`.
- 03 — kube-state-metrics, Prometheus snippet, cluster rules example. Owns its three new files in
  `infra/k8s/alpha/examples/optional-alerting/`.
- 05 — Argo CD notifications example. Owns `argocd-notifications-cm.yaml` in the example folder and
  `create_argocd_notifications_secret.sh`.

## Phase 2 (parallel; disjoint files)

- 02 — Podverse alert rules (after 01: joins on the `podverse-schedule` label and the
  `podFailurePolicy` reason 01 adds). Owns `infra/k8s/base/monitoring/**`.
- 04 — Alertmanager example (ran with a Matrix relay that 07 removes) (after 03: adds `alerting:` to 03's Prometheus snippet
  and the Watchdog rule to 03's cluster rules). Owns `alertmanager.yaml`,
  `create_ntfy_alerts_secret.sh`, plus those two targeted edits, and the dropped Matrix relay files.

## Phase 3 (alone)

- 07 — ntfy-only delivery (after 04 and 05: rewrites their files). Deletes `matrix-relay.yaml` and
  `create_matrix_alert_bot_secret.sh`; edits `alertmanager.yaml`, `argocd-notifications-cm.yaml`,
  `create_ntfy_alerts_secret.sh`, `create_argocd_notifications_secret.sh`.

## Phase 4 (alone)

- 06 — Example `kustomization.yaml` and `README.md`, guide sections, generators doc, `INFRA-K8S.md`
  label and rules contract, then close the set (scratchpad, archive, verification).

## Shared files

Only 06 edits docs (`REMOTE-K8S-GITOPS.md`, `INFRA-K8S.md`,
`INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`, the example README) and the release scratchpad. Earlier
prompts, 07 included, put their text under "Docs for 06". 06 uses 07's text instead of the Matrix
text in 04's and 05's final messages.
