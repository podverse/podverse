# 10 — Category, Channel, Item, LiveItem, Podroll, PublisherFeed (Read Routes)

## Goal

Integration tests for the read-only browse/discovery routes that don't require authentication.

## Routes under test

### Category (`/api/v1/category`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/:id` | Get category by ID |
| GET | `/` | Get all categories |

### Channel (`/api/v1/channel`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/podcast-index/:podcast_index_id` | Channel by PodcastIndex ID |
| GET | `/global/recent` | Global recent channels |
| GET | `/global/top` | Global top channels |
| GET | `/category/recent` | Category recent channels |
| GET | `/category/top` | Category top channels |
| GET | `/subscribed/az` | Subscribed A-Z (auth) |
| GET | `/subscribed/recent` | Subscribed recent (auth) |
| GET | `/subscribed/top` | Subscribed top (auth) |
| GET | `/:idOrIdText` | Get channel by ID or id_text |

### Item (`/api/v1/item`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/chapters/:item_id_text` | Parse and get chapters |
| GET | `/channel/season/forward/:channelIdOrIdText` | Season forward |
| GET | `/channel/season/backward/:channelIdOrIdText` | Season backward |
| GET | `/channel/recent/:channelIdOrIdText` | Recent by channel |
| GET | `/channel/oldest/:channelIdOrIdText` | Oldest by channel |
| GET | `/channel/top/:channelIdOrIdText` | Top by channel |
| GET | `/channel/shuffle/:channelIdOrIdText` | Shuffle by channel |
| GET | `/queue/pub-date/:idText` | Queue by pub date (auth) |
| GET | `/queue/season/:idText` | Queue by season (auth) |
| GET | `/global/recent` | Global recent items |
| GET | `/global/top` | Global top items |
| GET | `/category/recent` | Category recent items |
| GET | `/category/top` | Category top items |
| GET | `/subscribed/recent` | Subscribed recent (auth) |
| GET | `/subscribed/top` | Subscribed top (auth) |
| GET | `/:idOrIdText` | Get item by ID or id_text |

### ItemChapter (`/api/v1/item-chapter`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/:item_chapter_id_text` | Get chapter by id_text |

### ItemSoundbite (`/api/v1/item-soundbite`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/:item_soundbite_id_text` | Get soundbite |
| GET | `/channel/:channel_id_text` | Soundbites by channel |
| GET | `/item/:item_id_text` | Soundbites by item |

### ItemTranscript (`/api/v1/item-transcript`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/:item_id_text` | Get transcript |

### LiveItem (`/api/v1/live-item`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/global/recent` | Global recent live items |
| GET | `/global/top` | Global top live items |
| GET | `/category/recent` | Category recent |
| GET | `/category/top` | Category top |
| GET | `/subscribed/recent` | Subscribed recent (auth) |
| GET | `/subscribed/top` | Subscribed top (auth) |
| GET | `/channel/:channelIdOrIdText` | Live items by channel |

### Podroll (`/api/v1/podroll`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/channel/:idOrIdText` | Podroll for channel |

### PublisherFeed (`/api/v1/publisher-feed`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/channel/:idOrIdText` | Publisher feed items |

## File

`apps/api/src/test/category-channel-item-read.test.ts`

## Test cases

### Category

- **200 /category/:id** — mocks `CategoryService.getById`, returns category object
- **200 /category/** — mocks `CategoryService.getAll`, returns array
- **404 /category/:id not found** — mocks null return

### Channel

- **200 /channel/global/recent** — returns array
- **200 /channel/global/top** — returns array
- **200 /channel/category/recent** — with category query param, returns array
- **200 /channel/:idOrIdText** — returns channel object
- **404 /channel/:idOrIdText not found** — mocks null
- **200 /channel/subscribed/recent** — authenticated, returns array
- **401 /channel/subscribed/recent without auth**
- **200 /channel/podcast-index/:id** — returns channel from PodcastIndex

### Item

- **200 /item/global/recent** — returns array
- **200 /item/global/top** — returns array
- **200 /item/category/recent** — with query params
- **200 /item/channel/recent/:channelId** — returns items for channel
- **200 /item/channel/shuffle/:channelId** — returns shuffled items
- **200 /item/:idOrIdText** — returns single item
- **404 /item/:idOrIdText not found**
- **200 /item/subscribed/recent** — authenticated
- **401 /item/subscribed/recent without auth**
- **200 /item/queue/pub-date/:idText** — authenticated
- **200 /item/queue/season/:idText** — authenticated
- **200 /item/chapters/:item_id_text** — returns chapters (may mock parser)

### ItemChapter, ItemSoundbite, ItemTranscript

- **200 get by id** for each — returns expected shape
- **404 not found** for each

### LiveItem

- **200 /live-item/global/recent** — returns array
- **200 /live-item/channel/:channelId** — returns array
- **200 /live-item/subscribed/recent** — authenticated
- **401 /live-item/subscribed/recent without auth**

### Podroll

- **200 /podroll/channel/:id** — returns podroll items
- **404 /podroll/channel/:id not found**

### PublisherFeed

- **200 /publisher-feed/channel/:id** — returns publisher feed items

## Mocking strategy

- Mock corresponding services from `@podverse/orm` for each domain
- These are mostly GET endpoints so mocking focuses on returning appropriate data shapes

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/category-channel-item-read.test.ts
```
