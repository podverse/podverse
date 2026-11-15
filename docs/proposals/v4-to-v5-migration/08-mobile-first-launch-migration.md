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
   - Send the subscription ids in one batch to the
     [legacy podcast lookup](05-id-mapping-and-catalog-seeding.md#legacy-podcast-lookup),
     as a queued sync job after first paint. The lookup is read-only and
     needs no sign-in. See [Signed-out carryover rules](#signed-out-carryover-rules)
     for what each answer does on the phone.
   - Keep the Add by RSS addresses. Before each one is saved, the phone asks the
     [Add by RSS directory match](#add-by-rss-directory-match). A match becomes a
     directory subscription. The rest stay Add by RSS feeds, which a signed-out
     phone parses and refreshes itself with no feed limit
     ([ADD-BY-RSS.md](/docs/features/ADD-BY-RSS.md)). Add by RSS addresses never go
     through the legacy lookup.
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
   v4 device tokens are not imported. v5 registers new tokens in Firebase
   project `podverse-app`, the project v4 already uses. Next workers send
   those tokens with service account `podverse-next-fcm`.
   After sign-in, ask this device to allow notifications only when the
   account had at least one of those rows and this device has not already
   asked. The asked flag stays on the device. If the phone already granted
   permission, register the new token and do not ask. If it has not been
   asked, ask once. If permission was denied, do not ask again.

## Signed-out carryover rules

Decided 2026-11-13. The goal is that a signed-out phone loses no subscription
it had in v4. A show already parsed in v5 becomes a directory subscription. A
show that is not in v5 yet becomes an Add by RSS feed on that phone, and later
moves to the directory on its own once v5 has it.

Per v4 subscription id, in this order:

1. The legacy lookup answers with a channel. Subscribe to that channel locally.
2. The lookup answers "not in v5 yet" with the v4 authority feed URL. Run the
   [Add by RSS directory match](#add-by-rss-directory-match) on that URL (a
   channel added since the lookup ran is found here). On a match, subscribe
   locally. Otherwise save it as a signed-out Add by RSS feed.
3. The lookup answers "not here" with no URL. Use the feed URL from the phone's
   cached v4 `SUBSCRIBED_PODCASTS` object (`feedUrls[0].url`) when that object is
   readable, then step 2's match and save. With no URL from either source, keep
   the raw id on the phone and ask the lookup again on later syncs.
4. The lookup answers "blocked" for a v4 podcast flagged `spam` or `takedown`.
   The phone drops that id, even when the cached object has a URL. It is
   counted in the device log and never becomes an Add by RSS feed.

A v4 podcast that is not public (most are on the Podcast Index dead-feed list)
gets "not in v5 yet" with its authority URL and follows step 2. It usually
fails to parse, and then it shows like any other Add by RSS feed whose host is
down.

The cached `SUBSCRIBED_PODCASTS` URL is the first source when it is readable,
because it works offline and needs no request. The lookup URL covers phones
whose cached object is missing or unreadable. The [field spike](#field-spike)
says whether the cached object is readable.

Add by RSS addresses from `ADD_BY_RSS_PODCAST_FEED_URLS` go through the
directory match too, then are saved as signed-out Add by RSS feeds. Titles come
from `ADD_BY_RSS_PODCASTS` when readable. The first device parse fills them
otherwise.

Everything here is a queued sync job after first paint, one job at a time,
behind the sync indicator. Failures go to the device error log and are retried
on the next sync. Nothing blocks the first screen.

## Add by RSS directory match

Decided 2026-11-13. This is not only a migration step. It runs for every Add by
RSS feed on every surface, so phones that start with many Add by RSS feeds after
the migration move them to the directory as v5 parses those shows.

- **When:** adding an Add by RSS feed, and refreshing Add by RSS feeds (one
  batched request per refresh). Signed out on mobile, the phone does it. Signed
  in on mobile and on the website, the API converts the account's follow, so
  every device sees the same result.
- **Match:** the feed URL after canonicalization (credentials removed, `http`
  and `https` treated as one, host case, default port, fragment, and a trailing
  path slash ignored). The query string and `www` count. When the feed carries a
  `podcast:guid` and the directory channel has a different guid, it is not a
  match. Only parsed, publicly listed, active channels match, so a blocked feed
  never matches.
- **Private feeds never convert.** A feed that needs a username and password
  stays Add by RSS.
- **What moves:** the follow becomes a directory follow. Queue, history, now
  playing, playlist rows, playback positions, downloads, and seen state that
  point at an Add by RSS episode are rewritten to the matching directory
  episode, matched by guid, then by enclosure URL. A row with no matching
  directory episode keeps its Add by RSS episode data and still plays.
- **What the person sees:** nothing interrupts them. The feed shows as a regular
  podcast. The phone records a `reconciled` entry in the device error log, and
  the API logs counts only.

## Honest limits and risks

- If AsyncStorage is not readable from the Expo app, signed-out users reset to
  empty local state. Be honest in release notes and emails.
- Custom Android download locations may be invisible to the new app.
- A show that no account subscribed to, and whose highest Matomo count is
  below 3, is not parsed at launch. A signed-out phone keeps it as an Add by
  RSS feed until v5 has the show, then the directory match moves it. Signed-out
  phones never add feeds to the catalog.
- A signed-out phone parses its Add by RSS feeds itself. Each one costs a
  request to the feed host from the phone on every refresh, the same as v4.
- A subscription with no lookup URL and no readable cached object stays a raw
  id on the phone. It shows nowhere until a later lookup can answer.
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
   token is not read. The feed-list reading below is a separate pass. Do not
   add it here.
6. Write the result into the open question below. Remove the temporary reader
   after that. Do not leave it in the app.

## Feed-list file before the phone copy

Asked for on 2026-11-13: signed-out v4 users should be encouraged to save an
OPML file before the phone copy runs. The screen is planned in
[`.llm/plans/active/v4-signed-out-carryover/`](/.llm/plans/active/v4-signed-out-carryover/00-SUMMARY.md)
and the [field spike](#field-spike) on iOS produced outlines, so the screen is next.
Android was not run.
This is not a rehearsal step in [15](15-near-term-rehearsal-checklist.md). The
account copy still starts at sign-in
([07](07-account-and-data-migration-model.md)) and does not wait for it.

The store listing and release notes for the first v5 build also ask people to
use More → Export OPML in the v4 app before they update
([10](10-user-communication.md)). That is the only backup a phone with
automatic updates may get, so it does not wait for the spike.

### What the file is

v4 More → Export OPML writes one outline per show that has a title and a feed
address (`src/lib/opmlExport.ts` in `podverse-rn`). A directory show uses
`feedUrls[0].url` from the cached `SUBSCRIBED_PODCASTS` object. An Add by RSS
show uses `addByRSSPodcastFeedUrl` from `ADD_BY_RSS_PODCASTS`. The id list
`SUBSCRIBED_PODCAST_IDS` is not an address. `ADD_BY_RSS_PODCAST_FEED_URLS`
is addresses only, and an address with no title is not an outline.

That file is the feed list on the phone. It does not include playlists, clips,
queue, history, playback position, downloaded files, or membership. The
account copy is the backup for those, and it does not wait on this file.

The v5 Export OPML control cannot produce this file before a copy. Signed
out, it reads the v5 database on the phone. Signed in, it downloads the
account export. Both are empty until a copy has already run. v4's exporter
is gone once the store update replaces the app.

The screen builds its file from the phone's cached fields only. It does not
call the legacy podcast lookup, so the screen paints with no network request
in front of it. A directory object with no cached address is left out of the
file and counted. The phone copy after Continue Migration can still recover
that show through the lookup's feed URL.

### Field spike

iOS 18.2 simulator, signed out, pass. The private build from the storage spike
was already installed over v4, so this pass did not install again and did not
uninstall. Counts from the surviving storage file matched `AsyncStorage.getItem`.
Two outlines, nothing skipped. Android not run. This answers one question:
after an in-place install, can the current app read the fields an outline needs.

It uses the same private install as the storage spike. Note the v4 counts
before that install, then read the same keys in the private build. Do not
uninstall first. Do not change the committed ids in `app.config.ts`. Do not
upload the build. Do not read `ADD_BY_RSS_PODCASTS_CREDENTIALS` or the bearer
token.

Counts only. Do not record a title, an address, or the file text. Do not
commit those values.

While v4 is still the installed app, record the platform, the OS version, and
these counts:

| Key                            | Counts                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| `SUBSCRIBED_PODCASTS`          | Objects. Objects with a title. Objects with `feedUrls[0].url`. |
| `ADD_BY_RSS_PODCASTS`          | Objects. Objects with a title. Objects with a feed address.    |
| `ADD_BY_RSS_PODCAST_FEED_URLS` | Addresses.                                                     |

A key the phone never had may be absent. Then install the private build and
record the same counts from that build. iOS and Android are separate results.

A key passes when each v5 count matches the v4 count for that key. A
directory object with no feed address is a named gap. It cannot be an
outline. An Add by RSS address with no title is the same kind of gap.

When the counts match, a temporary reader may build the outline list in
memory. Record how many outlines it produced and how many objects it skipped
for a missing title or address. Do not write that file into the repo. Remove
the reader after the count is written into the open question below. Do not
leave it in the app. Do not call the v5 account export or the signed-out
device export.

### Screen, after the spike

Write this only if the spike produced at least one outline. If the old store
cannot be read, or it has no outline, there is no screen. The phone copy
stays the automatic pass above.

- The screen paints from the local read. A network call does not sit in
  front of it.
- The sentence says the file is the feed list on this phone, and names what
  it leaves out: playlists, clips, queue, history, playback position,
  downloaded files, and membership.
- The sentence says the account copy still starts when the person signs in,
  including on the website, and does not wait for this screen.
- Export shares the outline file from the fields the spike could read.
- A checkbox records that the person saved a copy, or accepts continuing
  without one. The checkbox does not prove the file was saved.
- The button label is Continue Migration. It stays disabled until the
  checkbox is checked. The phone copy starts on that tap, and not before.
- The screen does not gate sign-in, the account copy, or the end-of-grace
  batch.

## Open questions

- Spike result, per platform: did `SUBSCRIBED_PODCAST_IDS` and
  `ADD_BY_RSS_PODCAST_FEED_URLS` come back on an in-place install? iOS 18.2
  simulator, signed out, pass. Read with `AsyncStorage.getItem` from
  `@react-native-async-storage/async-storage` 2.2.0. `SUBSCRIBED_PODCAST_IDS`
  present, 15 characters. `ADD_BY_RSS_PODCAST_FEED_URLS` present, 41 characters.
  Both match the v4 baseline and are longer than an empty array. The data
  container UUID changed on install (`00E6AF4E-6A21-4F0E-999C-2FF173D13E35` to
  `93155963-714B-4A74-9FFD-3BCA726657EC`); the storage file moved with it and
  the keys were still readable. Android not run.
- Feed-list field spike, per platform: did the outline counts match, how
  many outlines were produced, and how many objects were skipped? iOS 18.2
  simulator, signed out, pass. The private build from the storage spike was
  already installed, so v4 was not installed again and nothing was uninstalled.
  Counts from the surviving storage file, then the same keys read with
  `AsyncStorage.getItem` from `@react-native-async-storage/async-storage` 2.2.0.
  The storage file stayed 1012 bytes. `SUBSCRIBED_PODCASTS`: 1 object, 1 with a
  title, 1 with `feedUrls[0].url`. `ADD_BY_RSS_PODCASTS`: 1 object, 1 with a
  title, 1 with a feed address. `ADD_BY_RSS_PODCAST_FEED_URLS`: 1 address. Each
  count matched. Outlines: 2. Skipped: 0. The temporary reader was removed.
  Android not run.

## Plan sets

- [`add-by-rss-directory-match`](/.llm/plans/completed/add-by-rss-directory-match/00-SUMMARY.md):
  the [Add by RSS directory match](#add-by-rss-directory-match) on mobile, web,
  and the API. Ships on its own, before the migration.
- [`v4-signed-out-carryover`](/.llm/plans/active/v4-signed-out-carryover/00-SUMMARY.md):
  the legacy lookup with feed URLs, the first-launch phone copy, and the
  Continue Migration screen. Runs after the first set. Its mobile prompts wait
  for the spike results below.
- Storage compatibility spike report and feed-list field spike report. Counts
  only. Operator-run on a private install. Not a step in
  [15](15-near-term-rehearsal-checklist.md).
