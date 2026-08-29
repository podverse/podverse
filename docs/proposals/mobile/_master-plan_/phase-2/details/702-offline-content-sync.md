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
- Sync failures degrade quietly — the user keeps the last known local state and sees an error only
  where they explicitly asked to refresh.
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
