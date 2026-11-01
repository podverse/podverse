# CronJob health and alerting with ntfy delivery — summary

Prompts and models: [COPY-PASTA.md](COPY-PASTA.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Why this set exists

On alpha, scheduled work broke silently for days:

- The Podcast Index poller CronJob was suspended by hand and never resumed (2 days, missed episode).
- Three nightly purge CronJobs failed at startup on a missing env var (weeks).
- One admin session purge Job hung in Running and blocked every later run (`concurrencyPolicy:
  Forbid`, no `activeDeadlineSeconds`).

The cluster runs Prometheus but has no kube-state-metrics, no Alertmanager, and no alert rules.
Argo CD's notifications controller runs with an empty config. Nothing could have told anyone.

## Where the work lives

This set is in the **public Podverse monorepo**, following how the repo already shares k8s work:

| Kind | Location | Who deploys it |
| --- | --- | --- |
| Podverse-specific manifests and rules | `infra/k8s/base/**` | consumers load by remote Kustomize URL |
| Copy-and-adapt examples | `infra/k8s/alpha/examples/optional-alerting/` (new, beside `optional-extension-metrics/`) | each GitOps repo copies and edits |
| Secret generator scripts | `infra/k8s/scripts/secret-generators/` | copied into GitOps `scripts/secret-generators/` |
| Guide | `docs/development/k8s/REMOTE-K8S-GITOPS.md` and the example README | — |

Prometheus, Alertmanager, and Argo CD stay deployed from the **GitOps repo** (for Podverse alpha:
the private `k.podcastdj.com`). The examples here use placeholders (`monitoring` namespace,
`REPLACE_WITH_*` topic names), never real ids or tokens. Adopting them in
`k.podcastdj.com` is a short follow-up after this set merges.

## Locked decisions (operator answers)

- **No `suspend: false` in manifests.** Pauses stay possible. A scheduled CronJob that stays
  suspended raises an alert; an intentional pause is an Alertmanager silence with an end time.
- **Delivery is ntfy only, with no chat bot or LLM agent in any alert path.** Prometheus rules →
  Alertmanager → ntfy; Argo CD notifications → ntfy. Matrix was dropped (no relay, no bot
  accounts, no rooms), and so was the Grok Bot set. One topic per environment (Podverse alpha,
  Metaboost alpha), routed by the alert's `namespace` label. Every alert and every Argo CD deploy
  event goes to ntfy with priority from 07's table: critical 5, warning 3, resolved 2; sync failed
  5, Degraded 4, deploy live 2. Watchdog goes only to the external dead-man check. No new software
  in the cluster.
- **Hosted ntfy.sh on the free tier, no account.** An alert that the cluster is down cannot come
  from the cluster, so ntfy is not self-hosted in it (self-hosting outside the cluster is a
  documented option). Each environment has one long random topic name; the name is the secret and
  lives only in SOPS Secrets, never in git. The bearer token stays optional. ntfy Pro is the upgrade
  path if the free daily limit starts dropping alerts (HTTP 429), not the recommendation.
- **Startup config failures exit 78** (contract with set `feed-poller-catchup`, plan 04).

## Delivery

- Prompts 04 and 05 already ran with Matrix beside ntfy. Matrix was dropped afterward; 07 removes
  it from their output and makes ntfy carry everything. 06 uses 07's doc and release-notes text,
  not 04's or 05's.
- **Alertmanager → ntfy:** no bridge. `webhook_configs` with `url_file` (topic URL in a Secret)
  and an optional bearer token; 07 picks how priority is set per severity.
- **Argo CD → ntfy:** built-in generic webhook, `service.webhook.ntfy-*`, one service per
  environment and event so each sets its own `Priority` header.

## Requirement ledger

- **R3** "I am concerned about how I was unaware that the parser and potentially other workers
  were not running this whole time" — Plans: 02, 03, 04, 07
- **R5** Stuck CronJob runs blocking later runs — Plans: 01 (deadlines), 02 (alert)
- **R6** "this is a type of failure that we would like our bot to notify us about" (startup env
  failures) — Plans: 01 (fail fast on exit 78), 02 (alert). Delivered by Alertmanager, not an AI
  agent.
- **R7** "We would also like to be notified about things like this and hopefully be able to avoid
  these problems in the first place" (hung jobs) — Plans: 01 (deadlines and contract check), 02
- **R8** Separate notifications per environment when a deploy goes live or an outage happens —
  one ntfy topic per environment. Plans: 04, 05, 07
- **R9** "share this type of content in an open source way" — layout above; Plan: 06
- **R10** Alerts in a traditional way with no LLM agent, delivered through ntfy only — Plans: 04,
  05, 06, 07

## Areas and files

| Plan | Area | Main files |
| --- | --- | --- |
| 01 | CronJob contract | `infra/k8s/base/cron/*.cronjob.yaml`, `infra/k8s/base/ops/*.cronjob.yaml`, `infra/k8s/scripts/check_cronjob_contract.sh`, `.github/workflows/ci.yml` |
| 02 | Podverse alert rules | `infra/k8s/base/monitoring/**` |
| 03 | Metrics and cluster rules example | `infra/k8s/alpha/examples/optional-alerting/{kube-state-metrics,prometheus-alerting.snippet,cluster.rules}.yaml` |
| 04 | Alertmanager example (ran with Matrix; 07 removes it) | `…/optional-alerting/alertmanager.yaml`, `create_ntfy_alerts_secret.sh` |
| 05 | Argo CD notifications example (ran with Matrix; 07 removes it) | `…/optional-alerting/argocd-notifications-cm.yaml`, `create_argocd_notifications_secret.sh` |
| 07 | ntfy-only delivery | deletes `matrix-relay.yaml` and `create_matrix_alert_bot_secret.sh`; edits `alertmanager.yaml`, `argocd-notifications-cm.yaml`, both ntfy secret generators |
| 06 | Docs and adoption checklist | example `README.md`, `kustomization.yaml`, `REMOTE-K8S-GITOPS.md`, `INFRA-K8S.md`, generators doc |
