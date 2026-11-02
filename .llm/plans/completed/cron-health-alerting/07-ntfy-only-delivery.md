**Cursor model:** Codex 5.3 · **Reasoning:** high

# 07 — ntfy as the only delivery path

## Rows

R8, R9, R10

## Runs after

02–05 (rewrites the delivery files 04 and 05 wrote)

## Why

The operator dropped Matrix on 2026-11-01. Alerts go to ntfy only, with no chat bot and no LLM in
the path. Prompts 04 and 05 already wrote Matrix delivery beside ntfy; this prompt removes the
Matrix half and makes ntfy carry everything.

## Goal

Every Alertmanager alert (firing and resolved) and every Argo CD deploy event posts to the
environment's ntfy topic, with ntfy priority set by severity, so a phone shows what matters loudly
and the rest quietly.

## Hosting

Hosted ntfy.sh on the **free tier, with no account**. Each environment (Podverse alpha, Metaboost
alpha) has one long random topic name. The topic name is the secret: it lives only in SOPS
Secrets, never in git. The bearer token stays optional (unused on the free tier, available after an
upgrade). ntfy Pro is the upgrade path if the daily limit starts dropping alerts.

## Priority contract

| Event | ntfy priority |
| --- | --- |
| Alert firing, `severity="critical"` | 5 (urgent) |
| Alert firing, `severity="warning"` | 3 (default) |
| Any alert resolved | 2 (low) |
| Argo CD sync failed | 5 |
| Argo CD app Degraded | 4 |
| Argo CD deploy live | 2 |

`Watchdog` (`severity="none"`) never goes to ntfy; it pings the external dead-man check only.

## Changes

1. **Delete** `infra/k8s/alpha/examples/optional-alerting/matrix-relay.yaml` and
   `infra/k8s/scripts/secret-generators/create_matrix_alert_bot_secret.sh`.
2. **`alertmanager.yaml`:** remove every Matrix receiver and route. Per environment, one route sends
   every alert to that environment's ntfy receiver (`namespace="metaboost-alpha"` → Metaboost;
   everything else, cluster alerts included → Podverse alpha). Keep `group_by`, intervals
   (`repeat_interval` 4h, 1h for critical), the Watchdog route, the PVC, and `inhibit_rules`.
   **Priority by severity is required** (the current file only says to set priority in the phone
   app; replace that). Check the ntfy publish and templating docs for the current release and pick
   one mechanism, stating which in the final message:
   - Preferred: inline templating (`?template=yes` with `title`, `message`, and `priority`
     templates) on one topic URL per environment, if ntfy templates priority from the JSON body
     and Alertmanager sends that URL unchanged.
   - Otherwise: separate receivers per severity (and a resolved path if needed), each with its own
     `url_file` key that carries `priority=N` in the URL. Name the keys
     `<env>-critical-url`, `<env>-warning-url`.
   Keep `send_resolved: true` and the optional bearer token block (commented, marked optional for
   the free tier). Update the comment on adding an environment.
3. **`create_ntfy_alerts_secret.sh`:** match the keys and default URLs to the mechanism from step 2.
   Default URLs use `https://ntfy.sh/REPLACE_WITH_<ENV>_RANDOM_TOPIC`. The token prompt stays
   optional. Bump `VERSION`.
4. **`argocd-notifications-cm.yaml`:** remove `service.webhook.matrix`, the Matrix room ids in
   `context`, and every `webhook.matrix` template section. Add `on-deployed` to ntfy per
   environment (a `service.webhook.ntfy-<env>-deployed` with priority 2, title `Argo CD Deploy
   Live`, tag `rocket`), keeping the existing sync-failed and degraded services. Subscriptions route
   all three triggers to ntfy only. Keep the single-owner warning comment. The `Authorization`
   header must not break when `ntfy-token` is unset; if Argo CD would send an empty bearer, move
   that header to a commented block marked optional.
5. **`create_argocd_notifications_secret.sh`:** drop `matrix-token`; keys are `ntfy-<env>-url` per
   environment and optional `ntfy-token`. Bump `VERSION`.
6. **Leftovers:** `rg -i matrix infra/k8s .github` must return nothing from this set's files
   (unrelated matches elsewhere in the repo stay).
7. **Free-tier limit:** look up the current ntfy.sh free-tier daily message limit on ntfy.sh (the
   pricing page or the docs on limits) and give the number with its source in "Docs for 06". That
   limit is shared by everything posting from the cluster: Alertmanager and Argo CD both count
   against it. Estimate a normal day's volume with every alert and deploy on ntfy. When ntfy rejects
   messages over the limit (HTTP 429), alerts are being dropped, and that is the point to move to
   ntfy Pro.

## Docs for 06

Put in your final message, replacing the Matrix text in 04's and 05's final messages:

- Prerequisites: hosted ntfy.sh on the free tier, no account. One long random topic per
  environment, generated with `openssl rand -hex 16`. The topic name is the secret: anyone who has
  it can read and post to the topic, so it goes only into the SOPS Secrets, never into git. The
  bearer token is optional. Subscribe the ntfy phone app (and any other device) to each topic.
- Free-tier daily limit from step 7, that it is shared by everything posting from the cluster, and
  that HTTP 429 rejections mean it is time to move to ntfy Pro.
- What goes where: everything goes to ntfy, using the priority table above. Why hosted ntfy: an
  outage alert cannot come from the cluster it is about; self-hosting is fine outside the cluster.
- The priority mechanism you chose and how to change a priority.
- Deploy order: secrets → kube-state-metrics → rules and Prometheus snippet → Alertmanager → Argo
  CD notifications → Watchdog external check (Healthchecks.io notifying ntfy; confirm it has an
  ntfy integration) → test delivery with `amtool alert add` at each severity.
- Pausing a job on purpose (silence with an end time), rotating a topic name (generate a new one,
  update the Secret, resubscribe devices), and rotating the optional token.
- One generators-doc line each for `create_ntfy_alerts_secret.sh` and
  `create_argocd_notifications_secret.sh`.

## Files

- `infra/k8s/alpha/examples/optional-alerting/matrix-relay.yaml` (delete)
- `infra/k8s/scripts/secret-generators/create_matrix_alert_bot_secret.sh` (delete)
- `infra/k8s/alpha/examples/optional-alerting/alertmanager.yaml`
- `infra/k8s/alpha/examples/optional-alerting/argocd-notifications-cm.yaml`
- `infra/k8s/scripts/secret-generators/create_ntfy_alerts_secret.sh`
- `infra/k8s/scripts/secret-generators/create_argocd_notifications_secret.sh`

## Tests

Give the exact `amtool check-config` command for the extracted Alertmanager config
(`nix shell nixpkgs#prometheus-alertmanager -c amtool check-config <tmp file>`), for 06's block.

## Release scratchpad

Surfaces: k8s, ops. Example alerting delivers through ntfy only: every alert and Argo CD deploy
event posts to a per-environment ntfy topic on hosted ntfy.sh (free tier, random topic names kept in
SOPS), with priority by severity (critical urgent, warning default, resolved and deploys low). No
Matrix relay or bot account. Secret generators `create_ntfy_alerts_secret.sh` and
`create_argocd_notifications_secret.sh`.
