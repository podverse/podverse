## Subscribed lists wait for parsed Add by RSS

- Surfaces: web
- Change: Subscribed podcasts, episodes, artists, albums, tracks, and livestreams read this
  browser's parsed Add by RSS feeds before the follow-stub request and before rebuilding the
  local item index. When the account follows Add by RSS feeds, those lists stay on the spinner
  until that local mix is ready, then paint once. A feed that is not parsed yet can still appear
  when its parse finishes.
- Who notices: someone refreshing a subscribed list that includes Add by RSS
- Operator steps: none

## Subscribe seeds recommendations at weight 1

- Surfaces: api, web, mobile
- Change: Following a directory show with Taste Profile on adds that show to the Taste Profile at
  recommendation weight 1 without recording a listen. Unfollowing drops that seed when there are
  still no listens and no manual weight. The Recommendations empty-state copy says recommendations
  update as you subscribe to content and as you listen.
- Who notices: someone who turns on Taste Profile and subscribes before listening; Recommendations
  and Taste Profile Settings
- Operator steps: none

## CronJob deadlines and schedule labels

- Surfaces: k8s, ops
- Change: Every CronJob has `activeDeadlineSeconds`, so a hung run is stopped instead of blocking
  later runs, and a `podverse-schedule: scheduled | manual` label for alert rules. Worker and
  management-api CronJobs fail immediately, without retries, when the container exits 78 (startup
  config missing). CI rejects a CronJob without the label, deadline, or concurrency policy.
- Who notices: operators watching CronJobs; a Job that stays Running is stopped at its deadline
- Operator steps: delete any Job that has been Running for days before syncing

## Base Prometheus Cron and Workload Alerts

- Surfaces: k8s, ops
- Change: Added `infra/k8s/base/monitoring` with a `podverse-prometheus-rules` ConfigMap generator
  and two rule files: `podverse.rules.yaml` (scheduled/suspended CronJobs, stale recent-feeds
  poller, no-success window, startup config exit code 78) and `workloads.rules.yaml` (last CronJob
  run failed with auto-resolve on later success, deadline exceeded, long-running jobs, deployment
  availability/scale-to-zero, restart bursts). Added `rules.test.yaml` for `promtool test rules`
  synthetic coverage.
- Who notices: operators running Prometheus with kube-state-metrics; on-call responders receive
  namespace-routable alerts with first-step `kubectl` guidance.
- Operator steps: deploy kube-state-metrics with
  `--metric-labels-allowlist=cronjobs=[podverse-schedule]`; mount/load the
  `podverse-prometheus-rules` ConfigMap files in Prometheus `rule_files`; run `promtool test rules`
  against `infra/k8s/base/monitoring/rules.test.yaml`.

## Example kube-state-metrics and cluster alert rules

- Surfaces: k8s, ops
- Change: New copy-and-adapt example `infra/k8s/alpha/examples/optional-alerting/` with
  kube-state-metrics v2.20.0 (list and watch on cronjobs, jobs, deployments, statefulsets,
  daemonsets, pods, nodes, namespaces, and persistentvolumeclaims; no access to Secrets or
  ConfigMaps), a Prometheus scrape and rule-loading snippet, and cluster alerts for disk, memory,
  node-exporter, kube-state-metrics, and Argo CD application health and sync.
- Who notices: operators who copy the example into a GitOps repo. Nothing in a cluster changes
  until that copy is applied.
- Operator steps: apply the example in namespace `monitoring` and merge
  `prometheus-alerting.snippet.yaml` into the existing Prometheus config. Prometheus itself stays
  in the GitOps repo.

## Optional alerting now delivers through ntfy only

- Surfaces: k8s, ops
- Change: Updated optional alerting examples so every Alertmanager alert (firing and resolved) and
  every Argo CD deploy/sync/degraded event routes to per-environment ntfy topics on hosted ntfy.sh.
  Priority is set by severity/status (critical urgent, warning default, resolved/deploy low) via
  inline ntfy templating on topic URLs. Secret generators use ntfy-only keys with placeholder
  random topic URLs.
- Who notices: operators using the optional alerting examples in GitOps environments
- Operator steps: regenerate and apply `ntfy-alerts` and `argocd-notifications-secret`, confirm
  device subscriptions to each topic, and verify delivery and priority with alert and deploy test
  events

## Optional ntfy alerting checklist

- Surfaces: k8s, ops
- Change: Documented how to adopt optional alerting. The checklist covers random ntfy topics,
  kube-state-metrics, Prometheus rules, Alertmanager, and Argo CD notifications. Deployments stay
  in GitOps. The monorepo ships the rules and the copy-and-adapt example.
- Who notices: operators setting up cluster alerts
- Operator steps: follow `infra/k8s/alpha/examples/optional-alerting/README.md` and the Optional
  alerting section in `docs/development/k8s/REMOTE-K8S-GITOPS.md`. Generate each topic with
  `openssl rand -hex 16` and store it only in SOPS.

## Notification count sits on the bell corner

- Surfaces: web, mobile
- Change: The unread count on the notifications bell sits with its center on the bell's
  top-right corner, on the web navbar and the mobile Home title bar. A single digit is a circle.
  A longer count stays that height and widens into a pill, still centered on the same corner, so
  the bell stays visible. One-digit counts elsewhere that use the same web badge are circles too.
- Who notices: anyone with unread notifications, on web and on the mobile Home bell
- Operator steps: none

## Web player scrub seeks once on release

- Surfaces: web
- Change: Dragging the local or live progress bar updates the fill and clocks only. Seeking the
  media element happens once when the pointer is released, so scrubbing no longer briefly repeats
  the landing audio. After that seek, the bar keeps the committed second until the playhead
  catches up, so a stale timeupdate cannot snap the clock back.
- Who notices: anyone scrubbing the web player while audio or video is playing
- Operator steps: none

## List row progress sits to the right of the date

- Surfaces: web, mobile
- Change: On a playing list row, the date and remaining time stay next to Play and More.
  The progress bar fills the space to their right. Directory rows and Add by RSS episode rows
  share that order, including episodes, clips, chapters, and official clips. On mobile the
  publish date stays on its own line, and the duration in the play band stays left of the bar.
- Who notices: anyone looking at a list while something is playing
- Operator steps: none

## A stuck feed parse no longer stops a parser silently (#318)

- Surfaces: workers, k8s
- Change: Each feed message gets 15 minutes (`FEED_PARSE_MAX_MINUTES`, the same window after
  which a feed's parsing lock goes stale). The budget starts fresh for every message. When one
  message runs past it, `mqRSSRunParser` logs the queue, message id, feed URL, and Podcast Index
  id, rejects the message with `podverse:handler-timeout`, closes the broker connection, and exits
  with code 1 so the container restarts clean. New optional env `MQ_CONSUMER_IN_FLIGHT_FILE` makes
  the parser write the current message's start time to a file, cleared at startup and between
  messages. The `parser-normal`, `parser-live`, and `parser-ondemand` deployments set it to
  `/logs/mq-consumer-in-flight`, and their liveness probe fails once one message has been in
  flight for 960 seconds, which also catches a worker whose event loop is stuck. Readiness is
  unchanged. OPML import, Add by RSS, image shrink, and DLQ consumers are unchanged.
- Who notices: operators. A parser that used to sit `Ready` and silent on one feed now logs an
  error naming the feed and restarts within about 16 minutes.
- Operator steps: anyone running their own manifests should copy the `MQ_CONSUMER_IN_FLIGHT_FILE`
  env and the liveness command from the base parser deployments.

## The live item listener reconnects a silent Podping socket (#319)

- Surfaces: workers
- Change: `mqRSSRunLiveItemListener` no longer waits for a `close` or `error` event to recover.
  A socket that has not opened or sent a frame for 5 minutes is terminated and replaced, which
  covers a peer that vanished without closing. The handshake times out after 10 seconds, only
  one socket or connect attempt exists at a time, and events from a replaced socket are ignored.
  Each connect attempt logs a line with an attempt counter, and open, close, and error lines name
  the attempt. The heartbeat moved from about every 28 hours to hourly and reports the age of
  the last frame, the socket state, and the attempt count.
- Who notices: operators reading the listener logs. Live items keep flowing after the Podping
  connection silently drops, instead of stopping until the pod restarts.
- Operator steps: none
