**Cursor model:** Codex 5.3 · **Reasoning:** high

# 04 — Example: Alertmanager with Matrix and ntfy delivery per environment

> **Done; Matrix since dropped.** This prompt ran before the operator dropped Matrix on
> 2026-11-01. Its Matrix parts are kept below as a record of what ran; 07 removes them, and the
> docs follow 07, not this file.

## Rows

R3, R8, R9, R10

## Runs after

03 (edits its Prometheus snippet and cluster rules)

## Goal

Every firing and resolved alert posts to a Matrix room chosen by the alert's `namespace`. Critical
alerts also push to phones through ntfy, so someone hears about an outage without Matrix open.
Works on matrix.org: the relay logs in as an ordinary bot user, no appservice registration.

## Decisions

1. **Matrix relay.** Alertmanager has no Matrix receiver. Pick a maintained webhook-to-Matrix
   relay. Start with `metio/matrix-alertmanager-receiver`: confirm it is maintained (recent
   release), its image name and current tag, its config format, how it maps receivers or URL paths
   to rooms, and that it reads the access token from a file or env var. If it is unmaintained,
   pick another and explain why in the final message. Do not write a custom relay. Note whether it
   supports encrypted rooms; the README tells operators to create alert rooms without encryption
   unless it does.
2. `matrix-relay.yaml`: Deployment + Service + config ConfigMap in `monitoring`. Non-root,
   read-only root filesystem. Rooms keyed by name with placeholders:
   `podverse-alpha` → `REPLACE_WITH_PODVERSE_ALPHA_ROOM_ID`,
   `metaboost-alpha` → `REPLACE_WITH_METABOOST_ALPHA_ROOM_ID`. Message: severity, alert name,
   namespace, summary, description, start time; a short resolved message when it clears.
   Homeserver `https://matrix-client.matrix.org` as the commented default, overridable. Token from
   Secret `matrix-alert-bot`.
3. **ntfy, no extra software.** Alertmanager posts straight to ntfy with `webhook_configs`:
   - `url_file` pointing at a file from Secret `ntfy-alerts` (one key per environment, for example
     `podverse-alpha-url`, `metaboost-alpha-url`), so topic names never appear in git. A free-tier
     topic name acts as a password.
   - `http_config.authorization.credentials_file` for the bearer token (key `token`), commented as
     optional for free-tier topics.
   - ntfy's built-in template: `?template=alertmanager` (ntfy v2.14+; confirm in the ntfy docs).
     The built-in template sets no priority and ignores a `priority` URL parameter. Prefer inline
     templating (`?template=yes` with `title`, `message`, and `priority` templates; priority 5 for
     firing critical, 3 for resolved) if Alertmanager can send that URL unchanged; otherwise use
     the built-in template and say in the README that phones should raise that topic's priority in
     the ntfy app. Verify against the ntfy publish docs and say which you chose.
   - `send_resolved: true`.
4. `alertmanager.yaml`: `prom/alertmanager` pinned to a current release, a small PVC so silences
   survive restarts, config in a ConfigMap:
   - `group_by: [alertname, namespace]`, `group_wait: 30s`, `group_interval: 5m`,
     `repeat_interval: 4h` (1h for `severity="critical"`).
   - Per environment, the Matrix route matches the namespace and every alert. A route on
     `severity="critical"` sends to that environment's ntfy receiver with `continue: true` so
     Matrix still gets it. `namespace="metaboost-alpha"` → Metaboost receivers; everything else →
     Podverse alpha receivers (cluster alerts too, until a cluster room exists). Comment how to add
     an environment.
   - `alertname="Watchdog"` → a receiver that pings an **external dead-man check** (commented
     example: a Healthchecks.io ping URL from Secret `ntfy-alerts` key `watchdog-url`, every 5
     min). If pings stop, that external service notifies ntfy and Matrix: the only way to learn
     that Prometheus, Alertmanager, or the whole cluster is down. Confirm Healthchecks.io offers
     ntfy and Matrix integrations; if not, name a service that does. Default to a `null` receiver
     until the operator fills the URL.
   - `inhibit_rules`: a critical alert suppresses the warning with the same alertname and
     namespace; `KubeStateMetricsDown` suppresses workload alerts it would make stale.
   - Cluster-internal Service only. Document `kubectl port-forward` for the silences UI.
5. Append to 03's `prometheus-alerting.snippet.yaml` the `alerting.alertmanagers` block, and to
   03's `cluster.rules.yaml` a `Watchdog` rule (`vector(1)`, severity `none`).
6. **Secret generators**, copying the style of `create_grafana_admin_secret.sh` (prompt without
   echo, write with SOPS under `./secrets/`, never print values, namespace default `monitoring`):
   - `create_matrix_alert_bot_secret.sh` → `matrix-alert-bot` (bot access token).
   - `create_ntfy_alerts_secret.sh` → `ntfy-alerts` (per-environment topic URLs, optional token,
     optional watchdog URL).
7. Put README text in your final message under "Docs for 06": deploy order; routing (Matrix gets
   everything, ntfy gets critical); creating unencrypted alert rooms on matrix.org and inviting the
   bot; ntfy setup (hosted ntfy.sh recommended because an outage alert cannot come from the cluster
   it is about; Supporter tier for reserved topics; free tier with a long random topic otherwise;
   subscribing on a phone); **pausing a job on purpose** (suspend it, then create a silence with an
   end time matching that CronJob; when the silence ends and the job is still suspended the alert
   fires again); testing delivery with `amtool alert add`; rotating tokens. Plus one line per new
   script for the generators doc.

## Files

- `infra/k8s/alpha/examples/optional-alerting/alertmanager.yaml` (new)
- `infra/k8s/alpha/examples/optional-alerting/matrix-relay.yaml` (new)
- `infra/k8s/alpha/examples/optional-alerting/prometheus-alerting.snippet.yaml` (append)
- `infra/k8s/alpha/examples/optional-alerting/cluster.rules.yaml` (append)
- `infra/k8s/scripts/secret-generators/create_matrix_alert_bot_secret.sh` (new)
- `infra/k8s/scripts/secret-generators/create_ntfy_alerts_secret.sh` (new)

## Tests

Closing block runs `amtool check-config` on the Alertmanager config (extract the data key to a
temp file; give the exact command, using `nix shell nixpkgs#prometheus-alertmanager -c amtool …`).

## Release scratchpad

Surfaces: k8s, ops. Example Alertmanager: every alert posts to a Matrix room per environment,
routed by namespace, and critical alerts also push to phones through ntfy, with resolved messages
and silences that survive restarts. An optional Watchdog ping to an external check reports when
alerting itself is down. New `create_matrix_alert_bot_secret.sh` and `create_ntfy_alerts_secret.sh`
store tokens and topic URLs with SOPS.
