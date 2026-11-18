**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 50 — Seed the Podcasting 2.0 feed and its v4 ids for the download carryover E2E

## Rows

R12, R13

- R12: the download carryover E2E (plan 51) runs against the Podcasting 2.0 feed, Podcast Index
  id `920666`: a directory channel with that id in the E2E database, and a committed copy of the
  same feed for the Add by RSS half.
- R13: the feed is added to the local database by `tools/web/seed-e2e.mjs` on every seed (delete,
  then insert), so it is present whether or not an earlier run left it. Nothing fetches the
  remote feed during a run (§ Why a committed copy).

## Runs after

none

The rows are inert data. Plan 10's `POST /legacy/episode/lookup` reads them, and plan 51's flow
exercises them; neither is needed to write or seed them.

## Files

tools/test-assets/assets/e2e/v4-carryover/podcasting20.xml
tools/web/seed-e2e.mjs

`tools/web/seed-e2e.mjs` is large (about 4170 lines). Work only at the anchors named below:
the `E2E_DIRECTORY_MATCH_*` constants block (around line 115), `seedDirectoryMatchChannel`
(around line 4070), and `main()` (around line 4139).

## Why a committed copy

The live feed is `https://mp3s.nashownotes.com/pc20rss.xml`. Parsing it before each run (the
workers command `devParserRSSParsePodcasting20Feeds` in
`apps/workers/src/commands/parser/rss/parsePodcasting20Feeds.ts`) was rejected:

- it needs the network and a Podcast Index key, and the E2E stack must stay hermetic
  (`apps/api/src/lib/opml/e2eOpmlImportFixture.ts` states the same rule);
- it writes the dev database, not the E2E database (`podverse_app_test` on 5732);
- the episode list changes every week, so guids, titles, and the "episode no longer in the feed"
  case would drift between runs.

Instead the seed holds the real channel identity and four real episodes, copied once from the
live feed on 2026-11-15, and the test-assets server serves a trimmed copy of the same feed for
the Add by RSS half. Refreshing the copy is a manual edit of this plan's two files; no run ever
reads the live URL. The seeded feed row uses the live URL only as its `feed.url` value, which
nothing in E2E fetches.

## The episodes

Copied from the live feed. All four enclosures are `audio/mpeg`.

| guid | title | pubDate (RSS) | ISO | duration (s) | enclosure URL | length |
| --- | --- | --- | --- | --- | --- | --- |
| `PC20-276` | `Episode 276: "Jackleg leechers"` | `Fri, 23 Oct 2026 19:17:46 +0000` | `2026-10-23T19:17:46Z` | 5335 | `https://op3.dev/e/mp3s.nashownotes.com/PC20-276-2026-10-23-Final.mp3` | 64037934 |
| `PC20-275` | `Episode 275: "Off The Rails"` | `Fri, 16 Oct 2026 19:31:29 +0000` | `2026-10-16T19:31:29Z` | 5995 | `https://op3.dev/e/mp3s.nashownotes.com/PC20-275-2026-10-16-Final.mp3` | 71957106 |
| `PC20-274` | `Episode 274: "Vibe Cloning"` | `Fri, 09 Oct 2026 19:37:54 +0000` | `2026-10-09T19:37:54Z` | 6065 | `https://op3.dev/e/mp3s.nashownotes.com/PC20-274-2026-10-09-Final.mp3` | 72798142 |
| `PC20-273` | `Episode 273: "Advertising is the Horse and Buggies of Podcasting"` | `Fri, 02 Oct 2026 19:18:08 +0000` | `2026-10-02T19:18:08Z` | 5385 | `https://op3.dev/e/mp3s.nashownotes.com/PC20-273-2026-10-02-Final.mp3` | 64648222 |

- The directory channel and the committed feed copy hold 276, 275, and 274.
- 273 is in neither. Plan 51's v4 data downloads it from the Add by RSS copy, so it becomes the
  local episode whose item left the feed.
- 277 and 278 are the live feed's newest episodes. 277's title is profane and 278 sits next to
  it, so the window starts at 276.
- No title contains a regex metacharacter, so plan 51's Maestro `text:` selectors use them
  verbatim.

Channel identity, from the live feed: title `Podcasting 2.0`, description `The Podcast Index
presents Podcasting 2.0 - Upgrading Podcasting`, link `http://podcastindex.org`, language `en`,
`podcast:guid` `917393e3-1b1e-5cef-ace4-edaa54e1f810`, `podcast:medium` `podcast`.

## 1. Committed feed copy — `tools/test-assets/assets/e2e/v4-carryover/podcasting20.xml` (new)

Served by test-assets at `http://localhost:2111/e2e/v4-carryover/podcasting20.xml`, the same
way `assets/e2e/add-by-rss/podroll.xml` is served. `tools/test-assets/.gitignore` already
un-ignores `assets/e2e/**` (an `.xml` file there is committed; only `*.rss` names are ignored
elsewhere).

The copy keeps the real namespace URI the live feed declares. It drops everything that names a
person's contact address or points at another host, apart from the enclosures: no
`managingEditor`, `webMaster`, `itunes:owner`, `podcast:locked` owner, `podcast:value`,
`podcast:person`, `podcast:podroll`, `podcast:liveItem`, `podcast:funding`, `podcast:chapters`,
`podcast:transcript`, `podcast:socialInteract`, item images, or item links. The channel image
points at test-assets. The enclosures stay the real `op3.dev` URLs; plan 51 never streams them,
because each episode it plays is a carried local file.

Write exactly:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Trimmed copy of the Podcasting 2.0 feed (Podcast Index 920666) for the mobile v4 download carryover flow. Episodes 276, 275, and 274 match the directory channel tools/web/seed-e2e.mjs seeds; 273 is left out so a carried file of it stays a local episode. -->
<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md" version="2.0">
  <channel>
    <title>Podcasting 2.0</title>
    <description>The Podcast Index presents Podcasting 2.0 - Upgrading Podcasting</description>
    <link>http://podcastindex.org</link>
    <language>en</language>
    <itunes:author>Podcast Index LLC</itunes:author>
    <itunes:image href="http://localhost:2111/e2e/images/e2e-embed-channel-art-1400.png"/>
    <itunes:explicit>no</itunes:explicit>
    <podcast:guid>917393e3-1b1e-5cef-ace4-edaa54e1f810</podcast:guid>
    <podcast:medium>podcast</podcast:medium>
    <item>
      <title>Episode 276: "Jackleg leechers"</title>
      <description>Podcasting 2.0 episode 276.</description>
      <guid isPermaLink="false">PC20-276</guid>
      <pubDate>Fri, 23 Oct 2026 19:17:46 +0000</pubDate>
      <itunes:duration>5335</itunes:duration>
      <enclosure url="https://op3.dev/e/mp3s.nashownotes.com/PC20-276-2026-10-23-Final.mp3" type="audio/mpeg" length="64037934"/>
    </item>
    <item>
      <title>Episode 275: "Off The Rails"</title>
      <description>Podcasting 2.0 episode 275.</description>
      <guid isPermaLink="false">PC20-275</guid>
      <pubDate>Fri, 16 Oct 2026 19:31:29 +0000</pubDate>
      <itunes:duration>5995</itunes:duration>
      <enclosure url="https://op3.dev/e/mp3s.nashownotes.com/PC20-275-2026-10-16-Final.mp3" type="audio/mpeg" length="71957106"/>
    </item>
    <item>
      <title>Episode 274: "Vibe Cloning"</title>
      <description>Podcasting 2.0 episode 274.</description>
      <guid isPermaLink="false">PC20-274</guid>
      <pubDate>Fri, 09 Oct 2026 19:37:54 +0000</pubDate>
      <itunes:duration>6065</itunes:duration>
      <enclosure url="https://op3.dev/e/mp3s.nashownotes.com/PC20-274-2026-10-09-Final.mp3" type="audio/mpeg" length="72798142"/>
    </item>
  </channel>
</rss>
```

Keep it one file with these three items. Do not run Prettier on it.

## 2. Seed — `tools/web/seed-e2e.mjs`

Reuse: `seedDirectoryMatchChannel` is the pattern (delete by Podcast Index id or URL, then
insert `feed`, `feed_policy`, `channel`, `channel_about`, `item`). The item detail rows follow
the `item_about`, `item_enclosure`, and `item_enclosure_source` inserts inside
`insertPodcastItem` (around line 1496), which is a nested closure and cannot be called from
here, so write the inserts out. Descriptions use the top-level `insertSeedChannelDescription`
and `insertSeedItemDescription` helpers (around line 421).

### Constants

Directly after the `E2E_DIRECTORY_MATCH_ITEM_2_ENCLOSURE_URL` constant (before
`E2E_MUSIC_FEED_PI_ID`), add:

```js
// Podcasting 2.0 (Podcast Index 920666) for the mobile v4 download carryover flow. Ids match
// apps/mobile/src/migration/v4/e2eFixture.ts. Episodes are real items of the live feed; the
// test-assets copy is tools/test-assets/assets/e2e/v4-carryover/podcasting20.xml.
const E2E_PC20_FEED_PI_ID = 920666;
const E2E_PC20_FEED_URL = 'https://mp3s.nashownotes.com/pc20rss.xml';
const E2E_PC20_CHANNEL_ID_TEXT = 'e2ePc20Chan01';
const E2E_PC20_V4_PODCAST_ID = 'v4Pc20Pod01';
const E2E_PC20_V4_MAPPED_EPISODE_ID = 'v4Pc20Ep275';
const E2E_PC20_ITEMS = [
  {
    idText: 'e2ePc20Ep276',
    guid: 'PC20-276',
    title: 'Episode 276: "Jackleg leechers"',
    pubDate: '2026-10-23T19:17:46Z',
    durationSeconds: 5335,
    enclosureUrl: 'https://op3.dev/e/mp3s.nashownotes.com/PC20-276-2026-10-23-Final.mp3',
    enclosureLength: 64037934,
  },
  {
    idText: 'e2ePc20Ep275',
    guid: 'PC20-275',
    title: 'Episode 275: "Off The Rails"',
    pubDate: '2026-10-16T19:31:29Z',
    durationSeconds: 5995,
    enclosureUrl: 'https://op3.dev/e/mp3s.nashownotes.com/PC20-275-2026-10-16-Final.mp3',
    enclosureLength: 71957106,
  },
  {
    idText: 'e2ePc20Ep274',
    guid: 'PC20-274',
    title: 'Episode 274: "Vibe Cloning"',
    pubDate: '2026-10-09T19:37:54Z',
    durationSeconds: 6065,
    enclosureUrl: 'https://op3.dev/e/mp3s.nashownotes.com/PC20-274-2026-10-09-Final.mp3',
    enclosureLength: 72798142,
  },
];
```

Every `id_text` is 12 or 13 characters (the `nano_id_v2` domain allows 7–15). Every v4 id is 11
characters, inside the lookup's 14-character limit (`v4EpisodeLookupRef`, plan 41).
`920666` is not used by any other seed row; the OPML fixture only returns it as a resolver
answer for `https://example.com/e2e-directory.xml` and records a pending follow, which only the
parser resolves (`packages/mq/src/functions/mq/rss/processOpmlImport.ts`), so a seeded feed with
that id under a different URL does not change the OPML flows.

### `seedPodcasting20CarryoverChannel(client)` (new)

Add directly after `seedDirectoryMatchChannel` (before `async function main()`):

```js
async function seedPodcasting20CarryoverChannel(client) {
  await client.query(`DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2`, [
    E2E_PC20_FEED_PI_ID,
    E2E_PC20_FEED_URL,
  ]);

  const feedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [E2E_PC20_FEED_URL, E2E_PC20_FEED_PI_ID]
  );
  const feedId = feedResult.rows[0].id;

  await client.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, true, true)`,
    [feedId]
  );

  const channelResult = await client.query(
    `INSERT INTO channel (id_text, feed_id, medium_id, title)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1),
       'Podcasting 2.0'
     )
     RETURNING id`,
    [E2E_PC20_CHANNEL_ID_TEXT, feedId]
  );
  const channelId = channelResult.rows[0].id;
  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channelId]);
  await insertSeedChannelDescription(
    client,
    channelId,
    'The Podcast Index presents Podcasting 2.0 - Upgrading Podcasting'
  );

  for (const item of E2E_PC20_ITEMS) {
    const itemResult = await client.query(
      `INSERT INTO item (
         id_text,
         channel_id,
         guid,
         guid_enclosure_url,
         pub_date,
         title,
         item_flag_status_id
       )
       VALUES ($1, $2, $3, $4, $5::timestamptz, $6, 1)
       RETURNING id`,
      [item.idText, channelId, item.guid, item.enclosureUrl, item.pubDate, item.title]
    );
    const itemId = itemResult.rows[0].id;

    await client.query(
      `INSERT INTO item_about (item_id, duration)
       VALUES ($1, $2)`,
      [itemId, item.durationSeconds]
    );
    await insertSeedItemDescription(client, itemId, `Podcasting 2.0 ${item.title}.`);

    const enclosureResult = await client.query(
      `INSERT INTO item_enclosure (item_id, type, length, bitrate, item_enclosure_default)
       VALUES ($1, 'audio/mpeg', $2, 96, true)
       RETURNING id`,
      [itemId, item.enclosureLength]
    );
    await client.query(
      `INSERT INTO item_enclosure_source (item_enclosure_id, uri, content_type)
       VALUES ($1, $2, 'audio/mpeg')`,
      [enclosureResult.rows[0].id, item.enclosureUrl]
    );
  }

  await client.query(
    `DELETE FROM legacy_id_map
     WHERE (legacy_kind = 'podcast' AND legacy_id = $1)
        OR (legacy_kind = 'episode' AND legacy_id = $2)`,
    [E2E_PC20_V4_PODCAST_ID, E2E_PC20_V4_MAPPED_EPISODE_ID]
  );
  await client.query(
    `INSERT INTO legacy_id_map (
       legacy_kind, legacy_id, v5_kind, v5_id_text, resolve_key, v4_feed_url, status
     )
     VALUES
       ('podcast', $1, 'channel', $2, NULL, $3, 'mapped'),
       ('episode', $4, 'item', $5, NULL, NULL, 'mapped')`,
    [
      E2E_PC20_V4_PODCAST_ID,
      E2E_PC20_CHANNEL_ID_TEXT,
      E2E_PC20_FEED_URL,
      E2E_PC20_V4_MAPPED_EPISODE_ID,
      'e2ePc20Ep275',
    ]
  );

  console.log(
    `Seeded Podcasting 2.0 channel ${E2E_PC20_CHANNEL_ID_TEXT} (Podcast Index ${E2E_PC20_FEED_PI_ID}) with v4 ids ${E2E_PC20_V4_PODCAST_ID}, ${E2E_PC20_V4_MAPPED_EPISODE_ID}`
  );
}
```

What each piece is for:

- The `podcast` row maps v4 podcast `v4Pc20Pod01` to the channel, so the lookup's guid and
  media-URL checks run inside that channel (plan 10 § 4, check 5).
- The `episode` row maps v4 episode `v4Pc20Ep275` straight to item `e2ePc20Ep275` (plan 10's
  mapped-episode check). Plan 51 gives that v4 episode no guid and an older media URL, so only
  this row can answer it.
- v4 episode `v4Pc20Ep274` has no `episode` row. Its guid `PC20-274` answers through the guid
  match inside the mapped channel.
- The blocked case reuses the existing `('podcast', 'v4E2eBlkd01', …, 'dropped')` row seeded next
  to `E2E_PODCAST_CHANNEL_ID_TEXT` (around line 1446). Do not touch that block.

What the seed leaves out on purpose:

- No `stats_popularity_channel`, category, or follow rows, so the channel stays out of web and
  mobile top, recent-for-you, and category lists, as `seedDirectoryMatchChannel` does.
- No `channel.podcast_guid`. `/channel/add-by-rss-match` matches by feed URL; leaving the guid off
  keeps the Add by RSS copy (a different URL) from ever matching this channel and being promoted
  during plan 51's run.
- No `apps/web/e2e/helpers/seedConstants.ts` mirror. No web spec reads these ids.

Search impact: under E2E fixtures, Podcast Index search is a local `channel.title ILIKE` query
ordered by title (`searchLocalChannels` in
`apps/api/src/lib/feedDirectories/podcastIndexSearchProvider.ts`). `Podcasting 2.0` matches
the query `podcast` that several Maestro flows type, but it sorts after every seeded `E2E …`
title, so `search-result-row-0` in those flows is unchanged.

### `main()`

Call the new function directly after `await seedDirectoryMatchChannel(client);`:

```js
  await seedDirectoryMatchChannel(client);
  await seedPodcasting20CarryoverChannel(client);
```

## Self-check (no tests run)

- `node --check tools/web/seed-e2e.mjs` passes.
- The XML copy parses (`xmllint --noout tools/test-assets/assets/e2e/v4-carryover/podcasting20.xml`
  when `xmllint` is present).
- `git check-ignore tools/test-assets/assets/e2e/v4-carryover/podcasting20.xml` prints nothing,
  so the file is committed.

## Tests

- No new spec. Plan 51's Maestro flow `apps/mobile/e2e/v4-download-carryover.yaml` reads this
  data: the lookup answers both directory files from it, and the device parses the committed
  copy for the Add by RSS half.
- The seed is shared with web Playwright and `make mobile_e2e_seed`. The channel has no
  popularity, category, or follow rows, the same as `seedDirectoryMatchChannel`. The set's final
  verification should still include one full web report, because any seed change can move a
  list.

## Release scratchpad

none
