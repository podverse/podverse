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

## Recent-feeds poller resumes from a saved Podcast Index position

- Surfaces: workers, k8s (app migration), api (readiness marker)
- Change: `mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex` (`worker-recent-feeds`) saves how far it
  read the Podcast Index `/recent/data` stream in the new `podcast_index_stream_cursor` table
  (`stream_key = 'recent_data'`) and starts the next run 60 seconds before that point. It works
  one page at a time and saves a page's position only after every feed on it was queued, so a
  skipped tick, a run stopped by the 240-second cap, or a crash no longer drops feed updates. A
  failed queue send leaves the position in place and exits non-zero, so the Job is marked Failed.
  A Postgres advisory lock stops a second run (such as a manual Job) from reading the stream at
  the same time; that run exits 0. `-sr` now means the look-back used only when there is no saved
  position or it is more than 23 hours old, and that case logs at error level.
- Who notices: operators; feed updates are no longer lost after a suspended, failed, or slow
  poller run (within Podcast Index's 24-hour window)
- Operator steps: apply app migrations through `0004_podcast_index_stream_cursor.sql`; API
  readiness (`API_EXPECTED_MIGRATION_FILENAME`) waits on it. Overlays that override
  `API_EXPECTED_MIGRATION_FILENAME` must point at `0004_podcast_index_stream_cursor.sql`. No
  CronJob change.

## Recent-feeds poller catches up after an outage longer than a day

- Surfaces: workers
- Change: when `mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex` finds its `recent_data` cursor
  missing or more than 23 hours old (Podcast Index keeps `/recent/data` for 24 hours), it checks
  every feed in the database against Podcast Index `/episodes/byfeedid?newest`, 200 feeds per
  request, and queues only feeds whose newest Podcast Index episode is not our newest item
  (matched by guid, then enclosure URL), plus feeds Podcast Index lists nothing for that have not
  parsed since the gap began. Feeds whose lifecycle state blocks parsing are skipped. The run logs
  one error line with the gap length and counts. The sweep has an 8-minute cap per run and saves
  progress in `podcast_index_stream_cursor` (`stream_key = 'gap_sweep'`); later runs continue it
  before reading `/recent/data`, and reading then resumes from the time the sweep started.
  New manual command `mqRSSCatchUpFromPodcastIndex -q rss-normal -since <epoch seconds>` runs the
  same sweep for any gap start; rerunning with the same `-since` continues it, and an unfinished
  manual sweep is finished by the poller.
- Who notices: operators; after a suspended or failed poller, new episodes are picked up
  automatically instead of being lost
- Operator steps: none. No migration beyond `0004_podcast_index_stream_cursor.sql`; no CronJob
  change.

## Purge workers start without the Add by RSS key

- Surfaces: workers
- Change: Worker commands that do not handle Add by RSS credentials no longer require `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY`. This fixes the nightly account content log purge, account session purge, and notifications purge CronJobs, which failed at startup.
- Who notices: operators of deployments where those CronJobs failed at startup for a missing key
- Operator steps: none. Those CronJobs do not need the Add by RSS secret mounted.

## Startup config failures exit 78; manifests are checked against required env

- Surfaces: workers, management-api, api, k8s base env (workers, management-api ConfigMaps)
- Change: A missing or invalid env var, or a failed module config check at startup, now exits with code 78 (`EX_CONFIG`) instead of 1 in workers, management-api, and api. Runtime startup failures (for example KeyValDB unreachable) still exit 1. New unit tests fail when a workers CronJob or Deployment, or the management-api admin session purge CronJob, does not mount an env var its command requires. The base workers and management-api ConfigMaps now set `OTEL_TRACES_EXPORT=none`, which startup has required. `adminSessionPurge` no longer requires the KeyValDB keys.
- Who notices: operators; alerting can tell misconfigured jobs from failing ones by exit code 78
- Operator steps: overlays that set `OTEL_TRACES_EXPORT` keep their value; none required otherwise

## API base env sets traces export

- Surfaces: k8s base env (api ConfigMap)
- Change: `infra/k8s/base/api/source/api.env` sets `OTEL_TRACES_EXPORT=none`. The API reads that
  key at startup, and the base file did not set it. Overlays that already set it keep their value.
- Who notices: operators of deployments that use the base API env without their own
  `OTEL_TRACES_EXPORT`
- Operator steps: none when an overlay already sets the key

## Absorbing a duplicate show finishes

- Surfaces: api
- Change: Absorbing a duplicate show no longer rolls back. The step that drops the old show's
  recommendations after a Hidden Channels move passed an unused SQL parameter Postgres could not
  type, so the absorb never committed: follows, queue progress, and the merged lifecycle stayed
  on the old show.
- Who notices: operators merging duplicate shows; listeners who followed the old copy
- Operator steps: none

## Concurrent listens no longer deadlock

- Surfaces: api
- Change: A burst of listen reports for one account takes the per-account popularity lock before
  it share-locks settings. Five new sessions at once inside the minimum interval were deadlocking
  and failing the write.
- Who notices: listeners whose apps report a new session more than once at the same moment
- Operator steps: none

## Recommendations refresh is a known worker command

- Surfaces: workers, management-api
- Change: `statsRecommendationsRefresh` is registered with the other worker commands. The daily
  and weekly recommendations CronJobs already run it; the management workers list and the env
  contract now recognize that command.
- Who notices: operators looking at the workers command list
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

## Suspended job to enqueue every feed after an ingestion stall (#320)

- Surfaces: k8s, ops
- Change: A suspended `mq-rss-add-all` CronJob runs `mqRSSAddAll -q rss-normal`, which loads every
  feed and sends one parse message per feed to `rss-normal`. It is never scheduled. The only run
  is `kubectl create job --from=cronjob/mq-rss-add-all`. The Job allows 2Gi and 6 hours because it
  holds the full feed list. `-f` force-parses every feed and is not in the manifest; add it only
  on a one-off Job for that recovery.
- Who notices: operators recovering from a parser stall
- Operator steps: create the Job in the target namespace after the GitOps branch that contains the
  CronJob is pushed. Do not unsuspend the CronJob.
