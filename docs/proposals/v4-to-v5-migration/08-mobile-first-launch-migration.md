# 08 — Mobile First-Launch Migration

## Goal

On the first launch of a v5 build that replaced v4 in place, recover as much
**device-local** state as practical for signed-out and signed-in users.

## Status

Draft. Needs operator review. Depends on [03](03-store-identity-and-signing.md)
(same store ids). Early spike can proceed in parallel with
[06](06-database-migration-rehearsal.md).

## What we know

v4 (`podverse-rn`) stores almost all local state in AsyncStorage keys under
`PV.Keys` (see `src/resources/Keys.ts`), and secrets in Keychain
(`BEARER_TOKEN`, add-by-RSS credentials). There is no SQLite database.

Important keys include: `SUBSCRIBED_PODCAST_IDS`, `SUBSCRIBED_PODCASTS`,
`ADD_BY_RSS_PODCASTS`, `ADD_BY_RSS_PODCAST_FEED_URLS`, `QUEUE_ITEMS`,
`HISTORY_ITEMS`, `HISTORY_ITEMS_INDEX`, `NOW_PLAYING_ITEM`, download metadata
keys, and settings flags.

Downloaded files live under the background-downloader documents directory as
`{episodeId}{ext}` (add-by-RSS uses a hash id). Android may use a custom
scoped-storage URI.

v5 mobile uses different storage (SQLite schema, Expo Secure Store, and its own
prefs). Same bundle id does **not** automatically mean the same library and path
layout as bare RN AsyncStorage.

Logged-in server state is handled by [07](07-account-and-data-migration-model.md),
not by this doc. This doc is for **on-device** carryover, especially signed-out
users who have no server graph.

## Proposed approach

1. **Spike early** on a private build that uses the v4 application id: can Expo /
   the new RN stack read the existing AsyncStorage database and Keychain service
   names? Document yes/no with OS versions.
2. If readable, run a **one-shot migrator** on first v5 launch:
   - Read subscription ids and add-by-RSS URLs.
   - Call a v5 legacy-map API to resolve shortids → channels (or queue URL
     follows for add-by-RSS).
   - Import queue / history / now playing best-effort.
   - Attempt to reattach download files when paths and names still match;
     otherwise mark for re-download.
   - Do **not** reuse the v4 Bearer token against v5. Clear it after optional
     exchange spike fails or is declined ([02](02-capabilities-and-limits.md)).
3. Persist a `localMigrationCompleted` flag so the pass runs once.
4. Accept **best effort** for signed-out users: subscriptions and add-by-RSS
   first; queue/history/downloads second.

## Honest limits and risks

- If AsyncStorage is not readable from the Expo app, signed-out users reset to
  empty local state. Be honest in release notes and emails.
- Custom Android download locations may be invisible to the new app.
- Episode ids in filenames are v4 shortids; without a successful map, files are
  orphans.
- Beta installs under the prod id replace v4 before production messaging ships;
  testers need a warning ([09](09-beta-environment.md)).

## Open questions

- Spike result: can we read v4 AsyncStorage from the current Expo app?
- Should local migration wait for network (to resolve the map), or import raw
  ids and resolve later?
- Minimum success bar for "good enough" signed-out carryover?

## Future plan sets

- Storage compatibility spike report.
- First-launch migrator implementation in `apps/mobile`.
- Maestro coverage for "upgrade from fixture AsyncStorage" if feasible.
