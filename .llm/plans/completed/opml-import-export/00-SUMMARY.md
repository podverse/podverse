# OPML Import/Export — Summary

Server-first OPML import and export for **web** and **mobile**, consistent with the existing
add-by-RSS server job. Export is delivered first (lowest risk), then the import foundation, then
import UI on both surfaces.

## Goal

- **Export:** one server endpoint builds an OPML document from the user's directory follows +
  add-by-RSS follows. Web downloads it; mobile writes + shares it.
- **Import:** upload an OPML file to an **async server job** (MQ + worker + Valkey status, mirroring
  `/account/add-by-rss/parse`). The server parses the OPML XML and processes each feed with a
  3-tier resolution, isolating per-feed failures, and returns a per-feed report the client polls.

## Confirmed today (research)

- **Add-by-RSS is already server-backed on both surfaces** via `POST /account/follow/add-by-rss-channel`
  + `POST /account/add-by-rss/parse` (ActiveMQ `add-by-rss-on-demand` →
  [runAddByRSSParser.ts](/apps/workers/src/commands/mq/rss/runAddByRSSParser.ts) → Valkey → poll).
  Web: [apps/web/src/utils/addByRSS/](/apps/web/src/utils/addByRSS/actions.ts). Mobile:
  [useAddByRssAddFlow.ts](/apps/mobile/src/hooks/useAddByRssAddFlow.ts).
- **No OPML exists** anywhere except mobile nav placeholders
  ([apps/mobile/src/navigation/index.tsx](/apps/mobile/src/navigation/index.tsx) lines 747-796).
- **DB feed-URL lookup** already normalizes http/https preferring https:
  [FeedService.getByUrl](/packages/orm/src/services/feed/feed.ts) (81-105) via
  `deriveHttpsAndHttpUrlsFromInput`.
- **Podcast Index by-feed-URL lookup does NOT exist** in
  [external-services-podcast-index](/packages/external-services-podcast-index/src/index.ts) — must add.
- **Rate limiting**: Valkey hourly-counter pattern exists in
  [mq.ts](/apps/api/src/controllers/mq/mq.ts) (59-75); web `handleRateLimitAlert`
  ([apps/web/src/utils/rateLimit/rateLimitAlert.ts](/apps/web/src/utils/rateLimit/rateLimitAlert.ts));
  mobile has none yet.
- **Web settings tabs**: [Settings.tsx](/apps/web/src/components/Settings/Settings.tsx) `?tab=` +
  `@podverse/ui` `Tabs`. **Mobile More tab** already bottom-right.

## Locked design decisions

1. **Import runs as an async server job** (MQ + Valkey status + client poll), like add-by-RSS parse.
2. **Rate limit = 50 new feeds/hour per account** (`OPML_IMPORT_MAX_FEEDS_PER_HOUR`, default 50).
   Only **new work** counts: Podcast Index enqueues + add-by-RSS additions. Instant DB-match
   subscribes do **not** count.
3. **Pending-follow record**: when a feed is not in our DB but found in Podcast Index, enqueue the
   indexed on-demand parse and store a **pending follow** (new ORM table) that auto-resolves to a
   real directory follow when the parse creates the channel.

## Per-feed import resolution (server, per OPML `<outline>` feed URL)

1. Canonicalize URL; **look up our DB** (`FeedService.getByUrl`, http/https, prefer https).
   - Found → **directory-follow** that channel (instant; does not count toward rate limit).
2. Not in DB → **Podcast Index feed-URL lookup** (`podcastGetByFeedUrl`).
   - Found → enqueue **indexed on-demand parse** + write a **pending follow** (counts as new work).
3. Not in PI → **add-by-RSS**: follow (`AccountFollowingAddByRSSChannelService`) + enqueue
   `add-by-rss` parse (counts as new work).

Any single feed failure is recorded in the report and does **not** stop the run.

## Surface parity checklist (confirmed)

| Surface | Add-by-RSS | OPML Import | OPML Export |
| ------- | ---------- | ----------- | ----------- |
| Web     | exists     | **done**    | **done**    |
| Mobile  | exists     | **done**    | **done**    |

Shipped architecture and endpoints: [docs/features/OPML.md](/docs/features/OPML.md).

## Feed sets / phases

- **Phase 1 — Export** (server → web → mobile): plans 01, 02, 03.
- **Phase 2 — Import foundation** (server, sequential): plans 04, 05, 06.
- **Phase 3 — Import UI** (parallel): plans 07 (web), 08 (mobile).
- **Phase 4 — Docs/master-plan sync**: plan 09.

See [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) and [COPY-PASTA.md](./COPY-PASTA.md).
