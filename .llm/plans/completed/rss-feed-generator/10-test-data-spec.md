# Test Data Specifications

These rules apply to all generated RSS feeds and media assets. Implement across sub-plans 01–03, 06, and future/07 and future/09 as each touches the relevant area.

## Media files (images, audio, video)

- **URLs:** Every field that expects an image, audio, or video file must point to a URL served at **localhost:2111** (e.g. `http://localhost:2111/image-001.jpg`). Assets live in flat `tools/test-assets/assets/`; no namespace subpath.
- **Hard cap:** The generator (in `tools/test-assets`) must **never** produce more than **100** files per type: JPEG, MP3, MP4, OGG, WebM. Use a fixed naming scheme (e.g. `image-001.jpg` … `image-100.jpg`, `audio-001.mp3`/`audio-001.ogg` … `audio-100.*`, `video-001.mp4`/`video-001.webm` … `video-100.*`) so the maximum is explicit.
- **Do not recreate:** If any of files 1–100 **already exist** at their paths in the assets directory, the script must **not** recreate or overwrite them. Check existence first; only generate when the file is missing.
- **Ensure existence:** Before referencing a file path in an RSS feed, ensure the file exists: if it exists, do nothing; if not, generate one (via AssetGenerator). Never exceed 100 per type.
- **Reuse:** Reuse the same media files across RSS feeds (assign by index or round-robin); do not create new files beyond what is needed up to the cap.

## Multi-value tags (array-like elements, except item count)

- **Default count:** Any RSS tag that accepts **multiple items** (funding, person, transcript, etc.) — but **not** the number of `<item>` elements — should have **2 values** by default.
- **Configurable:** The `**--multi**` parameter controls these multi-value tags only. It can be a **single number** (e.g. `--multi 3`) or a **range** (e.g. `--multi 2-10`); if range, randomly choose a count per feed and per attribute.
- **Item count is separate:** The number of `<item>` elements per channel is controlled by `**--items**` (default **20**). It can be a single number or a range (e.g. `--items 10-30`); if range, random items per feed.

## Live items

- **Which feeds:** **Some** channel-level tags should have live items (not necessarily every feed); choose a subset of feeds to include exactly one `<podcast:liveItem>` each.
- **Count:** Where a feed has live items, it has **exactly 1 live item**.
- **Status variety:** Different feeds that have a live item should use **different statuses** (e.g. pending, live, ended) so tests cover all states.

## Medium types and feed naming

- The generator produces **nine feed types per set**. The positional **count** is the number of **sets**; each set yields 9 feed files:
  - **Non-season (5 types)** — no `itunes:season`, no `itunes:episode`:
    - **feed-{N}.rss** — no `<podcast:medium>` tag
    - **feed-podcast-{N}.rss** — `<podcast:medium>podcast</podcast:medium>`
    - **feed-video-{N}.rss** — `<podcast:medium>video</podcast:medium>`
    - **feed-music-{N}.rss** — `<podcast:medium>music</podcast:medium>`
    - **feed-publisher-{N}.rss** — `<podcast:medium>publisher</podcast:medium>`
  - **Season (4 types)** — each item has `itunes:season` and `itunes:episode` (e.g. one season per feed, 10 items per season):
    - **feed-season-{N}.rss** — no medium
    - **feed-podcast-season-{N}.rss** — medium podcast
    - **feed-video-season-{N}.rss** — medium video
    - **feed-music-season-{N}.rss** — medium music
- So count = 5 produces 45 files (5 × 9).

## Publisher feeds and remote items

- **Spec:** Publisher feeds follow [The Publisher Medium](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/publishers/publishers.md) and [medium](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/medium.md): channel must have `<podcast:medium>publisher</podcast:medium>`, a valid `<podcast:guid>`, and one or more `<podcast:remoteItem>` linking to child feeds.
- **Publisher feeds:** For feeds with medium **publisher**, the **remote items** within them (e.g. podcast:remoteItem, podroll) must **always have a medium tag**.
- **Same medium per feed:** For the 2 remote items in a publisher feed, **each** remote item must have the **same** inline medium tag (e.g. both `podcast:medium` = podcast, or both music).

## remoteItem / podroll / publisher (pointing to existing feeds)

- **Target URLs:** All remoteItem-like tags (podcast:remoteItem, podcast:podroll, podcast:publisher) must point to **other already-existing feeds** at their **expected localhost:2111** URLs (e.g. `http://localhost:2111/feed-3.rss`).
- **Random selection:** Choose which existing feed(s) to reference **randomly** from the set of feeds that have already been written in this run.
- **First feed:** The **first** generated feed **cannot** include remoteItem (or podroll/publisher that reference another feed) because there are no existing feeds to point to yet. Generate feeds in order; only feeds 2..N can reference feeds 1..N-1 (or any subset of previously written feed URLs).

## Value tags (07a)

- **Default:** Generated feeds do **not** include value blocks (podcast:value, valueRecipient, valueTimeSplit).
- **Opt-in:** Value tags (07a) are only present when the generator is run with `--add-fake-value-tags` and the user confirms at the CLI prompt; otherwise feeds are generated without value blocks. The data is fake and must not be used for real payments.

## Summary


| Topic                        | Rule                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media URLs                   | Always localhost:2111; never >100 per type (JPEG, MP3, MP4, OGG, WebM); if file 1–100 exists, do not recreate; ensure exists (create only if missing); reuse across feeds                                                                                                                                  |
| Multi-value count (non-item) | Default 2; `--multi` (number or range); applies to funding, person, transcript, etc., not item count                                                                                                                                                                                     |
| Channel items                | Default 20; `--items` (number or range) controls item count per feed                                                                                                                                                                                                                     |
| Live items                   | 1 per feed where applicable; different statuses across feeds                                                                                                                                                                                                                             |
| Medium                       | Nine feed types per set: 5 without season (feed-{N}, feed-podcast-{N}, feed-video-{N}, feed-music-{N}, feed-publisher-{N}), 4 with season (feed-season-{N}, feed-podcast-season-{N}, feed-video-season-{N}, feed-music-season-{N}). No itunes:season/itunes:episode on non-season feeds. |
| Publisher remote items       | Always have medium tag; 2 remote items, same medium each                                                                                                                                                                                                                                 |
| remoteItem targets           | Point to existing feeds at localhost:2111; random choice; first feed has no remoteItem                                                                                                                                                                                                   |
| Value tags (07a)             | Omitted by default; only present when run with `--add-fake-value-tags` and user confirms. Data is fake; do not use for payments.                                                                                                                                                         |


