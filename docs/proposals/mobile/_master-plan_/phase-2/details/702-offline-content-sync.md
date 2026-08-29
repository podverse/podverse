# 702-offline-content-sync

**Master step:** P2.4.3
**Model (author + implement):** Opus 5
**Status:** planned

## Scope

Offline listening is a headline mobile feature, not a degraded mode. Everything a user is subscribed
to must be browsable and playable with no connection — channels **and** their items, not only the
episodes already downloaded as media files.

This step defines what is stored locally and the background sync that keeps it current.

### Storage depth

| Source                  | Depth                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| Server-side (directory) | A **recent window** per channel — latest 50 items, extended on demand |
| **Add-by-RSS**          | The **entire feed**, no cap                                           |

Add-by-RSS feeds are stored whole because the user explicitly chose them and there is no server-side
pagination to fall back on. Large feeds are accepted as-is.

The window extends when the user scrolls past it while online, and stays as-is when offline.

### Background sync

A sync process reconciles local storage with the server and with add-by-RSS feeds whenever the
network is available, so what is stored converges on what is current. It covers new items for
subscribed channels, channel metadata changes, removals, and add-by-RSS re-parse results. It runs on
app foreground, on manual pull-to-refresh, and opportunistically when connectivity returns.

**This sync does not own its own scheduling.** It registers jobs with the serial queue from
[717](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md), which
runs one at a time and reports them through the indicator in
[718](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md). This is
the largest producer of sync work in the app — a channel-item pass over a full subscription list is
exactly the case the queue exists to keep off the boot path and out of parallel execution.

Each job carries a user-facing label and contributes to the indicator's remaining count. A
per-channel pass enqueues work as it discovers channels, so the total grows mid-run; that is
expected and handled by the queue's progress model.

Screens that browse, filter, or sort **subscribed** content read local storage exclusively, so they
behave identically offline. Network search and directory browse stay online-only surfaces.

## Acceptance criteria

- With the network disabled, a subscribed user can open Home, see their channels, filter and sort
  them, open a channel, and see its stored items.
- Server-backed channels store the latest 50 items by default; scrolling past that while online
  extends the window and the extension persists.
- Add-by-RSS feeds store every item in the feed.
- Sync runs on foreground, pull-to-refresh, and connectivity restore, and converges without
  duplicating rows on repeated runs.
- Every sync pass runs through the serial queue — never in parallel with another sync pass, and
  never on the startup path — and is visible in the sync indicator while it runs.
- Sync failures degrade quietly — the user keeps the last known local state and sees an error only
  where they explicitly asked to refresh — and are appended to the sync event log with their error
  code ([719](/docs/proposals/mobile/_master-plan_/phase-2/details/719-sync-event-log.md)).
- Storage growth is bounded for server-backed feeds and measured in a test with a large fixture.
- Unit tests cover window extension, sync idempotency, and removal reconciliation.

## Web parity references

- `apps/mobile/src/data/repositories/` — `subscriptionsRepository`, `addByRssRepository`,
  `playbackContentRepository`
- `apps/mobile/src/data/db/` — schema and migrations
- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- Skill: **mobile-data-layer**

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- home
```
