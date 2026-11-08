# 08 — Mobile First-Launch Migration

## Goal

On the first launch of a v5 build that replaced v4 in place, recover as much
**device-local** state as practical for signed-out and signed-in users.

## Status

Draft. Needs a close review before any implementation. Depends on
[03](03-store-identity-and-signing.md) (same store ids). This is the plan for
on-device files and for mapping v4 local storage onto the v5 schema. The
announcement work does not implement it. Early spike can proceed in parallel
with [06](06-database-migration-rehearsal.md).

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

1. **Spike early** on a private build that uses the v4 application id. The
   steps are in [Storage spike](#storage-spike). This pass writes the steps
   and does not run them.
2. If readable, run a **one-shot migrator** on first v5 launch:
   - Read subscription ids and add-by-RSS URLs. Save those raw ids on the
     device first. Resolve them through the legacy map when the network is
     available. Do not hold the first screen for that request. An offline
     open still keeps the raw ids.
   - Import queue / history / now playing best-effort.
   - Attempt to reattach download files when paths and names still match;
     otherwise mark for re-download.
   - Do **not** reuse the v4 Bearer token against v5. Clear it. There is no
     session exchange ([02](02-capabilities-and-limits.md)).
3. Persist a `localMigrationCompleted` flag so the pass runs once.
4. Signed-out carryover is good enough when the subscribed podcasts and Add
   by RSS addresses that were on the phone are present. Queue, history, and
   downloaded files are best-effort and may be missing. If the old storage
   cannot be read, the phone starts empty. The signed-in library copy remains
   the reliable path ([07](07-account-and-data-migration-model.md)).

5. Notification settings are not copied. The account uses v5's own defaults.
   The person changes them later if they want. v4 `notifications` rows are
   only a signal: one row means that account had a podcast notification.
   v4 device tokens are not imported. v5 uses its own Firebase project.
   After sign-in, ask this device to allow notifications only when the
   account had at least one of those rows and this device has not already
   asked. The asked flag stays on the device. If the phone already granted
   permission, register the new token and do not ask. If it has not been
   asked, ask once. If permission was denied, do not ask again.

## Honest limits and risks

- If AsyncStorage is not readable from the Expo app, signed-out users reset to
  empty local state. Be honest in release notes and emails.
- Custom Android download locations may be invisible to the new app.
- Episode ids in filenames are v4 shortids; without a successful map, files are
  orphans.
- Beta installs under the prod id replace v4 before production messaging ships;
  testers need a warning ([09](09-beta-environment.md)).

## Storage spike

This answers one question: after an in-place install, can the current app
read the two keys that define signed-out carryover.

v4 writes them with `@react-native-community/async-storage` 1.12.1. The
current app reads with `@react-native-async-storage/async-storage` 2.x. The
same store id keeps the app sandbox. It does not mean the new library opens
the file the old library wrote. The keys are `SUBSCRIBED_PODCAST_IDS` and
`ADD_BY_RSS_PODCAST_FEED_URLS`.

1. Use a phone that already has v4 installed, and that already has at least
   one subscribed podcast or one Add by RSS address. Note which of the two
   keys that phone should have. Record the OS version.
2. Install a private build over that app. iOS bundle `com.podverse.fm`.
   Android package `com.podverse`. Do not uninstall first. Do not change the
   committed ids in `app.config.ts` (`com.podverse.app.next`). Do not upload
   the build to the public listing.
3. On launch, read only those two keys. Record the platform, the OS version,
   the key name, present or absent, and the character length. Do not record
   the contents.
4. A key the phone had passes when the value is present and longer than an
   empty array. A key the phone never had may be absent. iOS and Android are
   separate results.
5. Queue, history, downloads, and Keychain stay out of this spike. The bearer
   token is not read.
6. Write the result into the open question below. Remove the temporary reader
   after that. Do not leave it in the app.

## Open questions

- Spike result, per platform: did `SUBSCRIBED_PODCAST_IDS` and
  `ADD_BY_RSS_PODCAST_FEED_URLS` come back on an in-place install? Not run.

## Future plan sets

- Storage compatibility spike report.
- First-launch migrator implementation in `apps/mobile`.
- Maestro coverage for "upgrade from fixture AsyncStorage" if feasible.
