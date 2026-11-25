**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 51 — API refuses Add by RSS parses and new follows when Add by RSS is off

When `config.catalog.addByRSSEnabled` is false, the API refuses the three routes that parse an
Add by RSS feed or save a new one, with one 403 shape. Every route that reads, plays, reorders,
or removes something already saved stays open, so saved rows keep working and can be removed.
When the flag is true (the key blank or `false`), nothing changes.

The web app never calls the refused routes while the flag is off (plan 50). This plan is what a
client that does not know the setting meets: mobile, an API-key script, or an older web tab.

## Rows

R73

## Runs after

12

## Files

- packages/helpers/src/lib/addByRSS/addByRSSDisabled.ts
- packages/helpers/src/index.ts
- apps/api/src/routes/account.ts
- apps/api/openapi.yml
- apps/api/src/test/account-add-by-rss-disabled.integration.test.ts
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

- **Refused** while off, all three in `apps/api/src/routes/account.ts`:
  - `POST /follow/add-by-rss-channel` — the whole route: a new follow, a re-post that updates an
    existing follow's title or credentials flag, and a URL that matches a directory channel. A
    client that wants the directory channel subscribes to it with the normal channel follow.
  - `POST /add-by-rss/parse`
  - `POST /add-by-rss/parse/all`
- **Kept open** while off. Each one either reads, or changes only something already saved:
  - `POST /unfollow/add-by-rss-channel` and `POST /unfollow/bulk` — removal (R73, R75).
  - `GET /follow/add-by-rss-channel/:account_id_text` — the followed list; web and mobile build
    saved rows from it.
  - `GET /add-by-rss/parse/status/:request_id` — reads a request made before the switch; starts no
    work.
  - `GET /add-by-rss/feed-limit`, `/channel-seen/add-by-rss`, `/channel-seen/mark-add-by-rss` —
    reads and seen markers for saved feeds.
  - `POST /add-by-rss/convert-to-channel` — moves a saved feed into a directory follow and removes
    the Add by RSS follow. It shrinks the Add by RSS set and adds nothing from outside the
    directory.
  - `POST /add-by-rss/remote-item/lookup` and `POST /add-by-rss/remote-item/resolve` — match
    `podcast:remoteItem` refs inside a feed the client already holds. Signed-out mobile depends
    on them, and they save no Add by RSS follow. On web their callers sit on `/add-by-rss` pages,
    which are not-found while off.
  - `POST /add-by-rss/chapters-transcript` — reads chapters and transcripts for an item that is
    saved or playing.
  - Every `item-add-by-rss` route in `apps/api/src/routes/queue.ts` (`now-playing`, `next`,
    `last`, `between`, `history`, delete) and `apps/api/src/routes/playlist.ts` (`first`,
    `between`, `last`, delete). Web uses them to save playback position, reorder, mark played,
    and remove saved rows. They store a copy of an item's metadata in a queue or playlist row
    and create no follow and no parse.
- The refusal runs before authentication, the way `requireEmailFlows` does. With the switch off,
  a signed-out request to a refused route also gets 403, not 401. The feature is off for
  everyone, so there is nothing for signing in to change.
- Status 403 with body `{ message: ADD_BY_RSS_DISABLED_MESSAGE, code: ADD_BY_RSS_DISABLED_CODE }`
  and no `i18nKey`. Without `i18nKey`, `parseMembershipGateError` in `@podverse/helpers-requests`
  returns `null`, so no client shows a membership or upgrade prompt for it.
- The constants live in `@podverse/helpers` so plan 52 and, later, mobile can match them.
- API-key semantics do not change. `x-api-key-permission` stays `add_by_rss create` on the three
  routes, and the api-key route tables are not edited: they run with the flag on.
- Mobile code is not changed (00-REQUEST: mobile code stays as it is).

## `packages/helpers/src/lib/addByRSS/addByRSSDisabled.ts` (new)

```typescript
/** Error code the API sends when a request needs Add by RSS and the server has it turned off. */
export const ADD_BY_RSS_DISABLED_CODE = 'add_by_rss_disabled' as const;

/** Message sent with {@link ADD_BY_RSS_DISABLED_CODE}. */
export const ADD_BY_RSS_DISABLED_MESSAGE = 'Add by RSS is turned off on this server.';
```

In `packages/helpers/src/index.ts`, add
`export * from './lib/addByRSS/addByRSSDisabled.js';` directly above the existing
`export * from './lib/addByRSS/feedLimitTier.js';` line.

## `apps/api/src/routes/account.ts`

Anchors: `const requireEmailFlows`, `'/follow/add-by-rss-channel'`,
`router.post('/add-by-rss/parse', …)`, `router.post('/add-by-rss/parse/all', …)`.

Directly after `requireEmailFlows`, add:

```typescript
const requireAddByRSSEnabled = (_req: Request, res: Response, next: NextFunction): void => {
  if (!config.catalog.addByRSSEnabled) {
    res.status(403).json({
      message: ADD_BY_RSS_DISABLED_MESSAGE,
      code: ADD_BY_RSS_DISABLED_CODE,
    });
    return;
  }
  next();
};
```

Add `ADD_BY_RSS_DISABLED_CODE` and `ADD_BY_RSS_DISABLED_MESSAGE` to the existing
`import { getAccountSignupModeCapabilities } from '@podverse/helpers';` line.

Insert `requireAddByRSSEnabled` as the first handler after the path on exactly these three
routes, and on no other:

- `router.post('/follow/add-by-rss-channel', requireAddByRSSEnabled, …existing handlers)`
- `router.post('/add-by-rss/parse', requireAddByRSSEnabled, asyncHandler(AccountAddByRSSParseController.enqueueParse));`
- `router.post('/add-by-rss/parse/all', requireAddByRSSEnabled, asyncHandler(AccountAddByRSSParseController.enqueueParseAll));`

The flag is read per request, so a test that swaps `config.catalog` sees the change at once.

## `apps/api/openapi.yml`

Paths `/account/follow/add-by-rss-channel` (`apiPostAccountFollowAddByRssChannel`),
`/account/add-by-rss/parse` (`apiPostAccountAddByRssParse`), and
`/account/add-by-rss/parse/all` (`apiPostAccountAddByRssParseAll`). Each already lists a `403`
with `AuthorizationErrorResponse`.

- Append one sentence to each operation's `description`: "When Add by RSS is turned off on this
  server (`CATALOG_ADD_BY_RSS_DISABLED`), returns 403 with code `add_by_rss_disabled` before
  authentication." For the two parse operations, turn the one-line `description:` into a `>-`
  block like the follow operation's, keeping the existing text first.
- In each `"403"` `description`, add a line: "`add_by_rss_disabled` when Add by RSS is turned off
  on this server. Sent before authentication, so a signed-out request gets it too." For the parse
  operations, replace `Forbidden` with a `>-` block that starts with `Forbidden.` and then this
  line.
- Leave security, `x-api-key-permission`, request bodies, and the other responses as they are.

## What an existing client sees

Write this section into the PR description; no code acts on it.

- **Web on this instance:** does not call the refused routes (plan 50 hides adding, stops
  background refresh and first parses, and makes `/add-by-rss` not-found). An open tab from
  before the switch that tries an add gets the 403 and shows its existing add-failed toast.
- **Signed-in mobile, adding a feed:** `useAddByRssAddFlow` gets the 403. `handleGateError`
  finds no `i18nKey` and does nothing, so the flow logs the error with its code to the error
  log and shows `error_log.add_by_rss.add_failed`. Nothing is saved.
- **Signed-in mobile, background refresh:** the `parse/all` request fails and is logged quietly
  to the sync log, per **mobile-sync-orchestration**. Saved feeds keep the parse already stored
  on the phone and keep playing. Remove still works through unfollow.
- **Mobile sign-up or login carry of signed-out feeds** (`addByRssLoginSettle`): the follow 403
  is classified as `rethrow` by `classifySignupCarryFollowError`, so the settle job fails, logs,
  and runs again on the next refresh. The signed-out feeds stay on the phone. The v4 download
  carryover's follow treats the same error as a network failure and retries later.
- **Signed-out mobile:** parses on the phone and calls no refused route, so it keeps adding feeds
  to the phone. The server cannot stop that; it only refuses saving them to an account.
- **API-key scripts:** the same 403 and code on the three routes, before key checks.

## Tests

`apps/api/src/test/account-add-by-rss-disabled.integration.test.ts` (new). Copy the setup from
`account-add-by-rss-feed-limit.integration.test.ts`: the `@podverse/orm` `CategoryService` mock,
`startTestApp` / `stopTestApp`, `accountBase`, `createAccount` (email prefix `abr-off-`),
`followCount`, and a `seedFollow(accountId, url)` that inserts one
`account_following_add_by_rss_channel` row. Feed URLs are
`https://abr-off-${accountId}-${label}.example.com/feed.xml`.

A helper switches the flag for one block and always restores it:

```typescript
async function withAddByRSSOff<T>(run: () => Promise<T>): Promise<T> {
  const previous = config.catalog;
  config.catalog = { ...previous, addByRSSEnabled: false };
  try {
    return await run();
  } finally {
    config.catalog = previous;
  }
}
```

An `expectDisabled(res)` helper asserts `res.status === 403` and
`res.body` equals `{ message: ADD_BY_RSS_DISABLED_MESSAGE, code: ADD_BY_RSS_DISABLED_CODE }`.

`describe('Add by RSS turned off')`:

1. `refuses a new follow, a parse, and parse-all, and saves nothing` — inside `withAddByRSSOff`:
   `POST /follow/add-by-rss-channel` `{ feed_url }` → `expectDisabled`, `followCount` is 0;
   `POST /add-by-rss/parse` `{ feed_url }` → `expectDisabled`;
   `POST /add-by-rss/parse/all` `{}` → `expectDisabled`. All with `authHeaders`.
2. `refuses a re-post of a feed the account already follows` — seed one follow, then inside
   `withAddByRSSOff` post the same URL with a new `title` → `expectDisabled`; `followCount` is
   still 1.
3. `refuses a signed-out follow with the same 403` — inside `withAddByRSSOff`, post the follow
   with no auth headers → `expectDisabled`.
4. `keeps the followed list, the feed limit, and unfollow open` — seed one follow, then inside
   `withAddByRSSOff`: `GET /follow/add-by-rss-channel/${idText}` → 200 and the body lists the
   seeded `feed_url`; `GET /add-by-rss/feed-limit` → 200; `POST /unfollow/add-by-rss-channel`
   `{ feed_url }` → 204; `followCount` is 0.
5. `accepts a new follow when Add by RSS is on` — no wrapper: post a new URL → 201, `followCount`
   is 1. This pins the blank-key default.

Queue, playlist, convert, remote-item, and chapters routes are not called here; they have no
refusal to test, and their own suites run with the flag on. The restricted web lane (plan 50)
exercises the queue `item-add-by-rss/last` and delete routes against an API with the flag off.

## Release scratchpad

```markdown
## API refuses Add by RSS parses and new follows when Add by RSS is off

- Surfaces: api
- Change: with `CATALOG_ADD_BY_RSS_DISABLED=true`, `POST /account/follow/add-by-rss-channel`,
  `POST /account/add-by-rss/parse`, and `POST /account/add-by-rss/parse/all` return 403 with
  code `add_by_rss_disabled`, before authentication. Unfollow, the followed list, parse status,
  convert-to-channel, remote-item lookup and resolve, chapters and transcripts, and the queue and
  playlist Add by RSS routes stay open, so saved rows keep playing and can be removed. Blank
  keeps today's behavior.
- Who notices: mobile users on an instance with Add by RSS off see the add-failed message when
  they add a feed while signed in; their saved feeds keep playing from the parse on the phone
- Operator steps: set the key on the API with the same value as the web sidecar's
  `NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED`
```
