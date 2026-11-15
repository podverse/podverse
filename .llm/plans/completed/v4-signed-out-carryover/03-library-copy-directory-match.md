# 03 — v4 library copy: matching Add by RSS URLs become directory follows

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

When the signed-in v4 library copy runs, an Add by RSS URL that matches a parsed directory channel
is written as `account_following_channel`, not as an Add by RSS follow. The Add by RSS tier counts
only the URLs left. The verify step expects the same split.

## Rows

R6

## Runs after

02 in this set (phase order only; no shared files). Needs `getForFeedUrls` from
`add-by-rss-directory-match` 01.

## Files

- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.test.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts` (result and log fields)
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.test.ts`
- `docs/proposals/v4-to-v5-migration/07-account-and-data-migration-model.md` (only if a count rule
  there disagrees with the finished code)
- `release-notes/scratchpad.md`

## 1. Pure split

In `copyAccountLibraryLib.ts`:

```ts
export function splitAddByRssUrlsByDirectoryMatch(
  urls: readonly string[],
  matchedChannelIdByUrl: ReadonlyMap<string, number>
): { directoryChannelIds: number[]; addByRssUrls: string[] }
```

- Canonicalize each URL with `addByRssFeedUrlForCopy` (the copy already uses it); drop nulls.
- Dedupe on the canonical URL. Keep input order.
- A URL with userinfo always stays Add by RSS.

## 2. Apply

In `copyAddByRssGroup` (`copyAccountLibraryApply.ts` L788–847):

1. Before the transaction, call `ChannelAddByRSSDirectoryMatchService.getForFeedUrls` for the
   snapshot's URLs (no guid), in chunks of `ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS`. The worker
   already initializes the ORM data source (`getDataSourceReadWrite`).
2. `splitAddByRssUrlsByDirectoryMatch`.
3. Compute `count` and the tier plan from the `addByRssUrls` left, not the snapshot's list.
4. Inside the existing transaction, insert the directory follows with the same
   `INSERT INTO account_following_channel ... ON CONFLICT DO NOTHING` `copyDirectoryFollowGroup`
   uses, then `insertAddByRssFeeds` with only the URLs left.
5. Return the cap plus a new `addByRssMatchedToDirectory: number` on the group result. Add the
   field to the result type, the run log, and the dry-run output in `copyAccountLibrary.ts`.

`readAddByRssCap` (L753) is the dry-run reader: give it the same split so a dry run reports the
same tier the apply writes.

The directory follow limit (`account-follow-cap-500`) has not shipped. Do not add a check for
it here; that plan owns it.

## 3. Verify

`verifyAccount.ts` compares v4 facts with v5 rows. Change the Add by RSS expectation to "v4 URLs
minus the ones that now have a directory follow for a matching channel", and accept those as
directory follows. Use the same split function and the same match service, so verify and copy
cannot disagree. Counts only in its output.

## Tests

`copyAccountLibraryLib.test.ts`: split with matches, duplicates that differ only by trailing
slash or scheme, userinfo URL, empty input. `verifyAccount.test.ts`: an account whose v4 Add by
RSS list has one URL now in the directory passes.

## Release scratchpad

```markdown
## v4 library copy turns Add by RSS URLs already in the directory into subscriptions

- Surfaces: workers
- Change: the v4 library copy writes a directory subscription instead of an Add by RSS follow
  when the URL matches a parsed, public directory channel. The Add by RSS limit tier is computed
  from the URLs left. The copy result, dry run, and verify report a new
  `addByRssMatchedToDirectory` count.
- Who notices: migrated v4 accounts get full podcast pages for those shows
- Operator steps: none
```
