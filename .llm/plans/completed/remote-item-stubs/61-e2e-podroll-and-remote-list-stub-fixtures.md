**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 61 — E2E fixtures: a podroll and a remote item list with stub references

The web E2E seed (which the mobile E2E seed reuses through `make mobile_e2e_seed`) has stub
coverage only for the artist's Not Yet Added album (plan 31). This plan seeds two more channels
so device and browser flows can see every row kind side by side:

- **E2E Podroll Podcast** — a podcast whose `podcast:podroll` lists a parsed album, a channel
  stub, an item stub, and a feed no one knows.
- **E2E Remote List** — a `musicL` channel whose own `podcast:remoteItem` list holds a parsed
  track, an item stub, and an item no one knows.

Both reuse plan 31's channel stub for "E2E Not Yet Added Album" and add one item stub under it.
Fixtures only; no product code.

## Rows

R2, R28, R29, R33

## Runs after

31

## Files

tools/web/seed-e2e.mjs
apps/web/e2e/helpers/seedConstants.ts

## Constants — `tools/web/seed-e2e.mjs` (top of file)

Add beside `E2E_ARTIST_UNKNOWN_ALBUM_PODCAST_GUID` (near line 217), under one comment:
`// Remote stub list fixtures. Must match apps/web/e2e/helpers/seedConstants.ts.`

```js
const E2E_ARTIST_NOT_YET_ADDED_TRACK_GUID = 'e2e-nya-track-01';
const E2E_ARTIST_NOT_YET_ADDED_TRACK_TITLE = 'E2E Not Yet Added Track';
const E2E_ARTIST_NOT_YET_ADDED_TRACK_PROVIDER_ITEM_ID = '2147483632';
const E2E_UNKNOWN_TRACK_GUID = 'e2e-unknown-track-01';
const E2E_PODROLL_PODCAST_ID_TEXT = 'e2ePodroll0001'; // 14
const E2E_PODROLL_PODCAST_TITLE = 'E2E Podroll Podcast';
const E2E_PODROLL_PODCAST_GUID = '11111111-2222-4333-8444-555555555550';
const E2E_PODROLL_PODCAST_FEED_URL = 'https://e2e-seed-podcast.example/podroll.xml';
const E2E_PODROLL_PODCAST_FEED_PI_ID = 876543227;
const E2E_REMOTE_LIST_ID_TEXT = 'e2eRemoteList01'; // 15
const E2E_REMOTE_LIST_TITLE = 'E2E Remote List';
const E2E_REMOTE_LIST_PODCAST_GUID = '11111111-2222-4333-8444-555555555551';
const E2E_REMOTE_LIST_FEED_URL = 'https://e2e-seed-music.example/remote-list.xml';
const E2E_REMOTE_LIST_FEED_PI_ID = 876543228;
```

Both `id_text` values are 9–15 characters (**e2e-seed-nano-id-limits**). Podcast Index ids
876543227 and 876543228 are unused in the seed today; confirm with a search before adding. Plan
50 takes 876543225–876543226, and plan 73's management seed takes 876543250–876543252 in the same
app database, so do not use those.

## Seed function — `seedRemoteStubListFixtures(client)` (new)

Add it after `seedMediaPlayerAndEmbedFixtures` (which ends before `seedMergedChannelRedirect`).
Call it in `main()` (near line 3493) right after `await seedMediaPlayerAndEmbedFixtures(client, accountId);`,
because it reads the channel stub that function seeds. Steps, in order:

1. **Item stub under the Not Yet Added channel stub.**

   ```sql
   SELECT id FROM remote_channel_stub
   WHERE index_provider = 'podcast_index' AND provider_feed_id = $1;
   ```

   with `String(E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID)`. Throw
   `new Error('Remote stub list fixtures need the Not Yet Added album stub')` when no row comes
   back. Then:

   ```sql
   INSERT INTO remote_item_stub (
     remote_channel_stub_id, item_guid, provider_item_id, title, image_url, pub_date, duration_seconds
   ) VALUES ($1, $2, $3, $4, NULL, '2026-01-15T00:00:00Z', 180);
   ```

   `image_url` stays null so rows exercise the fallback to the channel stub's image. No
   `ON CONFLICT`: plan 31 deletes and re-inserts the channel stub on every seed, and the delete
   cascades to its item stubs.

2. **Podroll podcast.** Delete, then insert, following the unclaimed album block in
   `seedMediaPlayerAndEmbedFixtures` (near lines 2136–2187), with these differences:
   - `DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2` with the podroll PI id and URL.
   - `feed` → `feed_log` → `feed_policy (parse_allowed, public_visible, add_allowed all true)`.
   - `channel (id_text, feed_id, medium_id, title, podcast_guid)` with medium
     `(SELECT id FROM medium WHERE value = 'podcast' LIMIT 1)`.
   - `channel_about`, `insertSeedChannelDescription(client, channelId, 'E2E seeded podcast whose podroll lists parsed, stub, and unknown feeds.')`,
     and `channel_image` with `E2E_FIXTURE_CHANNEL_IMAGE_URL`, 1400.
   - `INSERT INTO channel_podroll (channel_id) VALUES ($1) RETURNING id`.
   - One `INSERT INTO channel_podroll_remote_item (channel_podroll_id, feed_guid, feed_url, item_guid, title, medium_id)`
     with four rows, in this order (the table's `id` order is the feed order):

     | feed_guid | feed_url | item_guid | title | medium value | Expected row |
     | --- | --- | --- | --- | --- | --- |
     | `E2E_MUSIC_ALBUM_PODCAST_GUID` | `E2E_MUSIC_FEED_URL` | NULL | `'E2E Music Album'` | `music` | parsed channel |
     | `E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID` | `E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL` | NULL | `'E2E Not Yet Added Album'` | `music` | channel stub |
     | `E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID` | `E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL` | `E2E_ARTIST_NOT_YET_ADDED_TRACK_GUID` | `E2E_ARTIST_NOT_YET_ADDED_TRACK_TITLE` | `music` | item stub |
     | `E2E_ARTIST_UNKNOWN_ALBUM_PODCAST_GUID` | NULL | NULL | `'E2E Unknown Album'` | `music` | hidden |

   The clients list channels before items, so the podroll reads, top to bottom: E2E Music
   Album, E2E Not Yet Added Album, E2E Not Yet Added Track.

3. **Remote list channel.** The same feed and channel steps with the remote list constants,
   medium `(SELECT id FROM medium WHERE value = 'musicL' LIMIT 1)`, and description
   `'E2E seeded music list whose remote items point at parsed, stub, and unknown tracks.'`.
   Then one `INSERT INTO channel_remote_item (channel_id, feed_guid, feed_url, item_guid, title, medium_id)`
   with three rows, in this order:

   | feed_guid | feed_url | item_guid | title | medium value | Expected row |
   | --- | --- | --- | --- | --- | --- |
   | `E2E_MUSIC_ALBUM_PODCAST_GUID` | `E2E_MUSIC_FEED_URL` | `` `${E2E_MUSIC_FEED_URL}#track-one` `` | `'E2E Music Track One'` | `music` | parsed item |
   | `E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID` | `E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL` | `E2E_ARTIST_NOT_YET_ADDED_TRACK_GUID` | `E2E_ARTIST_NOT_YET_ADDED_TRACK_TITLE` | `music` | item stub |
   | `E2E_ARTIST_UNKNOWN_ALBUM_PODCAST_GUID` | NULL | `E2E_UNKNOWN_TRACK_GUID` | `'E2E Unknown Track'` | `music` | hidden |

   `${E2E_MUSIC_FEED_URL}#track-one` is the GUID `seedMediaPlayerAndEmbedFixtures` gives Track
   One (`musicTrackOneGuid`, near line 2060); rebuild it here from the constant.

4. `console.log(`Seeded remote stub list E2E channels ${E2E_PODROLL_PODCAST_ID_TEXT} (podroll) and ${E2E_REMOTE_LIST_ID_TEXT} (remote items)`);`

Neither channel gets categories, items, or a subscription, so they stay out of the seeded
account's library and out of item lists.

## `apps/web/e2e/helpers/seedConstants.ts`

Add beside `E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID` (near line 109):

```ts
export const E2E_ARTIST_NOT_YET_ADDED_TRACK_TITLE = 'E2E Not Yet Added Track';
export const E2E_PODROLL_PODCAST_ID_TEXT = 'e2ePodroll0001';
export const E2E_PODROLL_PODCAST_TITLE = 'E2E Podroll Podcast';
export const E2E_REMOTE_LIST_ID_TEXT = 'e2eRemoteList01';
export const E2E_REMOTE_LIST_TITLE = 'E2E Remote List';
```

## Reuse

- The unclaimed album insert block in `seedMediaPlayerAndEmbedFixtures` for the feed and
  channel rows.
- Plan 31's Not Yet Added channel stub (provider id 2147483631), so the preview fixture
  `buildE2eArtistNotYetAddedAlbumByIdResponse` already answers taps on every stub row here.
- Area E's Playwright specs can read the same channels; if area E's plans seed an equivalent
  fixture, Close keeps one.

## Tests

- No new test file: this plan is the fixture. Plan 62's `apps/mobile/e2e/remote-item-stubs.yaml`
  drives both channels. `apps/mobile/e2e/artist.yaml` and
  `apps/web/e2e/artist-page-albums-and-tracks.spec.ts` keep passing (the artist's references
  are unchanged).
- Self-check: `node --check tools/web/seed-e2e.mjs` parses the file; it does not run the seed.

## Release scratchpad

none
