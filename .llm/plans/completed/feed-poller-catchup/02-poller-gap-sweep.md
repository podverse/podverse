**Cursor model:** Opus 5.5 · **Reasoning:** high

# 02 — Catch up after a gap longer than 24 hours

## Rows

R2

## Runs after

01

## Goal

When the poller's cursor is missing or older than Podcast Index keeps `/recent/data` (24 hours),
the poller checks every feed we have against Podcast Index and queues only the feeds that changed.
An operator can also run the same catch-up by hand for any start time.

## Decisions

1. **Trigger.** In the mq function from plan 01, replace the "no usable cursor" branch: run the
   sweep, then run a normal `/recent/data` pass from `now - sinceRange` and save the cursor. Log
   one **error** line with the gap length and the sweep's counts, so the alert pipeline and logs
   both show that an outage happened.
2. **Sweep source of truth.** Feeds in our database whose lifecycle state allows parsing, paged by
   `feed.id` in chunks of 200 (`podcast_index_id` is required on `feed`).
3. **Change detection per chunk.** Call `/episodes/byfeedid?id=<200 ids>&newest` through a new
   `PodcastIndexService` method (use `podcastIndexAPIRequest` so retries, timeouts, and sanitized
   errors apply). For each returned episode, compare with our newest item for that feed's channel
   (`item` by `channel_id`, newest `pub_date`; match on `guid` first, then enclosure URL). Queue
   the feed when Podcast Index's newest episode is not in our database or is newer than ours.
   Queue feeds Podcast Index returned nothing for only when `feed_log.last_finished_parse_time` is
   older than the gap start (Podcast Index may not list them; a parse settles it cheaply).
4. **Before relying on the response shape**, the implementer confirms the `/episodes/byfeedid`
   multi-id + `newest` fields against the Podcast Index API docs
   (`https://podcastindex-org.github.io/docs-api/pi_api.json`) and writes the type in
   `packages/external-services-podcast-index` (no `any`; the existing `/recent/data` `any` stays
   scoped to its block).
5. **Budget.** The sweep has its own wall-clock cap (constant beside the plan 01 constants, 8
   minutes) and must fit the CronJob's `activeDeadlineSeconds: 600`. When the cap stops it, the
   cursor is **not** written, so the next tick sweeps again from the first unswept chunk: persist
   the last swept `feed.id` in the cursor table (a second `stream_key`, `'gap_sweep'`, using
   `next_since` for the gap start and `position` for the last feed id) and clear it when the sweep
   finishes.
6. **Manual command.** Add `mqRSSCatchUpFromPodcastIndex -q <queue> -since <epoch seconds>` that
   runs only the sweep for that gap start. Register it per the **workers** skill
   (`commandNames.ts`, `categoriesForCommand.ts` with the same categories as the poller,
   `ENV.md`).

## Files

- `packages/external-services-podcast-index/src/index.ts` — new batch newest-episodes method
  (place it below `recentGetData`)
- `packages/external-services-podcast-index/src/**` — response type
- `packages/orm/src/services/**` — newest item per channel for a set of feeds, sweep feed paging
- `packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.ts`
- `packages/mq/src/functions/mq/rss/catchUpFeedsFromPodcastIndex.ts` (new)
- `packages/mq/src/index.ts` — export
- `apps/workers/src/commands/mq/rss/mqRSSCatchUpFromPodcastIndex.ts` (new)
- `apps/workers/src/commands/index.ts`, `apps/workers/src/commands/commandNames.ts`,
  `apps/workers/src/lib/startup/categoriesForCommand.ts`, `apps/workers/ENV.md`
- `docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md` — gap catch-up paragraph and the manual command

## Tests

- Unit tests for change detection: unknown guid queues; same newest guid skips; Podcast Index
  empty plus stale `last_finished_parse_time` queues; blocked lifecycle state skips.
- Unit tests for the sweep resume: cap stop keeps `gap_sweep` progress; finished sweep clears it
  and writes the `recent_data` cursor.
- Request-shape unit test for the new Podcast Index method (URL with comma-joined ids and
  `newest`), following `podcastGetByFeedUrl.test.ts`.

## Release scratchpad

Surfaces: workers. After an outage longer than a day, the recent-feeds poller checks every feed in
the database against Podcast Index and queues the ones with new episodes. New manual command
`mqRSSCatchUpFromPodcastIndex -q rss-normal -since <epoch>`.
