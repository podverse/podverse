**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 62 — Podcast Index Add Feed: refuse the on-demand add and hide the button under the allowlist

While the allowlist is set, the API refuses `POST /mq/rss/add/on-demand`, and the Podcast Index
feed page shows the feed without its Add Feed button. In open mode, nothing on either side
changes, whatever Add by RSS is set to. Opening the page never adds a feed; that is true today and
stays true.

## Rows

R77, R78, R79

## Runs after

11, 12

## Files

- apps/api/src/controllers/mq/mq.ts
- apps/api/openapi.yml
- apps/api/src/test/catalog-on-demand-add.integration.test.ts (new)
- apps/web/src/components/SearchDetail/SearchDetail.tsx
- apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx
- packages/i18n-catalog/consumer/originals/en-US.json
- packages/i18n-catalog/consumer/originals/es.json
- packages/i18n-catalog/consumer/originals/fr.json
- packages/i18n-catalog/consumer/originals/el-GR.json
- apps/web/e2e/catalog-restricted-podcast-index-add-feed.spec.ts (new)
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

- **Only the allowlist turns this off.** The API refuses and the button hides when
  `podcastIndexIdAllowlist !== null`, even for a listed id; listed feeds are added by plan 61's
  command. Music off and Add by RSS off do not affect the button or the route (R78).
- **Music off in open mode keeps the button.** A music feed's add is accepted by the API and
  refused by the worker (plan 60), so the page reaches its existing timed-out status. The API
  does not look up the Podcast Index medium.
- **Refresh is unchanged.** `POST /mq/rss/refresh/on-demand` refreshes stored feeds and stays
  open under the allowlist.
- **Refusal shape:** HTTP 403, `{ message: 'This instance does not add feeds on request.', code: 'catalog_add_disabled' }`.
  It runs after authentication and body validation and before the blocked-feed check, the
  hourly limit, the dedupe key, and the enqueue, so a refused request spends nothing.
- **The page keeps rendering the feed** (title, art, description, RSS Link) and replaces the
  explanation with "This feed is not in our directory." There is no Add Feed button.
- **R79 needs no code change.** The page server component and `PodcastIndexFeedClient` only read
  (`reqPodcastIndexFeedById`, `reqFeedGetByPodcastIndexId`, `reqChannelGetByPodcastIndexId`) and
  redirect when a stored channel exists. The only directory add is the button's click. The lane
  spec below asserts no add request is sent on open.
- **Mobile is unchanged.** A mobile client against an allowlisted API gets the 403 and shows its
  existing error.

## API

### `apps/api/src/controllers/mq/mq.ts`

- Imports: remove the `import type { OnDemandParserEventType } from '@podverse/helpers';` line
  and add `OnDemandParserEventType` to the value import from `@podverse/helpers` below it
  (alphabetical, after `MQ_QUEUES`). It is still used as a type in the existing signatures.
- Inside `validateBodyObject(bodySchema, req, res, async () => {`, directly after the
  `const finalDto = { … };` block and before `try {`:

```typescript
              if (
                type === OnDemandParserEventType.ADD &&
                config.catalog.podcastIndexIdAllowlist !== null
              ) {
                res.status(403).json({
                  message: 'This instance does not add feeds on request.',
                  code: 'catalog_add_disabled',
                });
                return;
              }
```

  Read `config.catalog` inside the handler (not at module scope) so tests can swap it.

### `apps/api/openapi.yml`

Under `/mq/rss/add/on-demand` → `post`:

- Append to `description`: "While the instance's Podcast Index id allowlist is set, returns 403
  with code `catalog_add_disabled` and does not enqueue."
- Replace the `"403"` description with: "Forbidden. `feed_blocked` when the feed's lifecycle or
  policy blocks parse or add. `catalog_add_disabled` while the instance's Podcast Index id
  allowlist is set. Neither response enqueues a parse or spends the on-demand dedupe key."

Leave `/mq/rss/refresh/on-demand` as it is.

## Web

### `apps/web/src/components/SearchDetail/SearchDetail.tsx`

- `SearchDetailProps.primaryAction`: change to `primaryAction: SearchDetailPrimaryAction | null;`
  with the doc comment `/** Null hides the primary button. */`.
- Render the primary `<Button variant="primary" …>` only when `primaryAction !== null`
  (`{primaryAction !== null ? (<Button …>{primaryAction.label}</Button>) : null}`). Keep the
  `buttonRow` div and the RSS Link button as they are.

`AddByRSSRemoteFeedPageClient.tsx` keeps passing an object; do not edit it.

### `apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx`

- After `const config = useConfig();`, add
  `const directoryAddEnabled = config.public.catalog.podcastIndexIdAllowlist === null;`
  (plan 10 adds `public.catalog`).
- In the returned `SearchDetail`:

```tsx
      explanation={
        directoryAddEnabled
          ? tFeatures('add_feed.add_feed_explanation')
          : tFeatures('add_feed.not_in_directory')
      }
      primaryAction={
        directoryAddEnabled
          ? {
              label: tFeatures('add_feed.add_feed'),
              icon: <FaCirclePlus />,
              isLoading,
              onClick: addFeedOnClick,
            }
          : null
      }
```

Leave `addFeedOnClick`, the polling, and the membership gate as they are.

### i18n originals

In `features.add_feed` of each consumer originals file, add `not_in_directory` directly after
`add_feed_explanation`:

| File | Value |
| --- | --- |
| en-US.json | This feed is not in our directory. |
| es.json | Este feed no está en nuestro directorio. |
| fr.json | Ce flux n'est pas dans notre annuaire. |
| el-GR.json | Αυτή η ροή δεν είναι στον κατάλογό μας. |

These match the first sentence of each file's existing `add_feed_explanation`. `compiled/` is
generated; do not add it.

## Tests

### `apps/api/src/test/catalog-on-demand-add.integration.test.ts` (new)

Follow `feed-blocked.integration.test.ts`: the same `vi.hoisted` `mqRSSAddMock` and
`@podverse/mq` / `@podverse/orm` mocks, `startTestApp` / `stopTestApp`, and its
`createPremiumAccount` helper (copy it; prefix the email `catalog-on-demand-`). Import
`{ config } from '@api/config/index.js'`. `describe('on-demand add under the catalog allowlist')`:

- "refuses the on-demand add with catalog_add_disabled and does not enqueue": save
  `const original = config.catalog;`, set
  `config.catalog = { ...original, podcastIndexIdAllowlist: [920666] };`, POST
  `/mq/rss/add/on-demand` with `{ url: 'https://catalog-on-demand.example.com/feed.xml', podcast_index_id: 920666 }`.
  Expect 403 and `code: 'catalog_add_disabled'`, and `mqRSSAddMock` not called. Restore
  `config.catalog = original` in `finally`.
- "keeps the on-demand refresh open under the allowlist": same override; POST
  `/mq/rss/refresh/on-demand` with a fresh URL and id. Expect 201 and `mqRSSAddMock` called once.
  Restore in `finally`.
- "accepts the on-demand add in open mode with Add by RSS off": set
  `config.catalog = { ...original, podcastIndexIdAllowlist: null, addByRSSEnabled: false };`,
  POST the add with a fresh URL and id (use the `nextPodcastIndexId` helper copied from
  `feed-blocked.integration.test.ts`). Expect 201 and `mqRSSAddMock` called once. Restore in
  `finally`.

Call `mqRSSAddMock.mockClear()` at the start of each test.

### `apps/web/e2e/catalog-restricted-podcast-index-add-feed.spec.ts` (new)

Runs on plan 11's restricted lane. Its allowlist does not contain the mock Podcast Index id
`2147483640` (the same id `podcast-index-feed-add-trial-blocked.spec.ts` uses), and no channel is
stored for it, so the page renders the preview.

Top-level `test.describe('Podcast Index feed page with the catalog allowlist set')`. One test,
"the feed preview shows no Add Feed button and opening it sends no add request", with steps
(capture each with `capturePageLoad` from `./helpers/stepScreenshots`, passing the verified
element):

1. Before navigating, collect requests:
   `const addRequests: string[] = []; page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/mq/rss/add/on-demand')) addRequests.push(r.url()); });`
2. "The feed preview renders with the not-in-directory sentence": `page.goto('/podcast-index/feed/2147483640')`;
   expect `page.getByText('This feed is not in our directory.')` visible and
   `page.getByRole('heading', { level: 2 })` visible.
3. "The Add Feed button is not shown and the RSS Link stays": expect
   `page.getByRole('button', { name: /add feed/i })` to have count 0; expect
   `page.getByRole('link', { name: /rss link/i })` visible.
4. "Opening the page sent no add request": `expect(addRequests).toEqual([])`.

No login. Use the default 10 s budget (no `test.setTimeout`). Open mode is covered by the existing
default-lane spec `podcast-index-feed-add-trial-blocked.spec.ts`, which asserts the button is
visible; do not change it.

## Release scratchpad

```markdown
## Podcast Index Add Feed is off while the allowlist is set

- Surfaces: api, web
- Change: while `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` is set, `POST /mq/rss/add/on-demand` returns
  403 with code `catalog_add_disabled` and enqueues nothing, and the web Podcast Index feed page
  shows the feed with "This feed is not in our directory." and no Add Feed button. On-demand
  refresh is unchanged. With the allowlist blank the button and route behave as before, whether
  or not Add by RSS or Music is off.
- Who notices: visitors and API clients of narrowed instances
- Operator steps: none beyond the catalog keys
```
