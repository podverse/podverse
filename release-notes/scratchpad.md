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
