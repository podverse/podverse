# 03 — Add by RSS values that are not feed URLs are skipped, not fatal

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Rows

R3

## Runs after

02 (shares `copyAccountLibraryApply.ts` and `verifyAccount.ts`)

## Why

`addByRssFeedUrlForCopy` keeps the raw string when `canonicalAddByRSSFeedUrl` returns null. The
`varchar_url` domain (`CHECK (VALUE ~ '^https?://')`) rejects it, and the whole Add by RSS group
rolls back. The pilot account with 8 values starting with `#` lost all 30 of its feeds. Full v4:
31 accounts hold 275 such values: Android `content://` file references, hashtags, JSON fragments,
words, a `file:///` path (00-FINDINGS F6). None is a feed.

## Decision

A value whose `canonicalAddByRSSFeedUrl` is null is not a feed: not written, not counted toward
the cap, reported as the count `addByRssNotFeedUrl`. The canonicalizer already repairs an
uppercase scheme, surrounding space, and `https:/host`, so those stay.

## Files

- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.test.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts` (dry-run counts and the log line)
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.test.ts`
- `release-notes/scratchpad.md` (only through the final message)

## 1. Lib

In `copyAccountLibraryLib.ts`:

- `addByRssFeedUrlForCopy(url)`: return `canonicalAddByRSSFeedUrl(url)` (already trimmed, http or
  https only, no trailing path slash). Return null when that is null. Keep the existing length cut
  to `DATABASE_CONSTANTS.varchar_url`. Update its doc comment: "Feed URL stored on an Add by RSS
  follow, or null when the value is not an http(s) URL."
- Add `countAddByRssNotFeedUrl(urls: readonly string[]): number` — non-blank values whose
  `addByRssFeedUrlForCopy` is null.
- `countAddByRssFeeds` and `splitAddByRssUrlsByDirectoryMatch` already skip null; no change.

## 2. Report the count

Add `addByRssNotFeedUrl: number` beside the other Add by RSS counts in the copy result type in
`copyAccountLibraryApply.ts` (the type that carries `addByRssMatchedToDirectory`) and fill it with
`countAddByRssNotFeedUrl(snapshot.addByRssUrls)`. Add it to the dry-run counts and the copy's
summary log line in `copyAccountLibrary.ts`. Counts only; never log the values.

## 3. Verify

In `verifyAccount.ts` `countAddByRss`, skip a value whose `canonicalAddByRSSFeedUrl` is null
instead of keying it as `raw\n…`. That makes `count` (used by `capTier`, `capCut`, and
`needsOperator`) the feed count the copy used.

## Tests

- `copyAccountLibraryLib.test.ts`: `#tag`, `content://…`, `{"a":1}`, `file:///x`, and a bare word
  return null from `addByRssFeedUrlForCopy` and count in `countAddByRssNotFeedUrl`;
  `HTTP://Example.com/feed`, ` https://example.com/feed `, and `https:/example.com/feed` are kept;
  a list mixing both writes only the feeds and `countAddByRssFeeds` counts only the feeds.
- `verifyAccount.test.ts`: an account whose v4 list has 30 feeds and 8 non-URL values, with 30
  feeds written, passes; `capTier` does not count the non-URL values.

## Release scratchpad

This prompt shares its phase with another, so put this entry in the final message under
"Release notes entry" instead of writing the file:

```markdown
## v4 Add by RSS copy skips values that are not feed URLs

- Surfaces: workers (v4 migration)
- Change: v4 Add by RSS entries that are not http(s) URLs (file references, hashtags, stray text) are skipped and counted instead of failing the account's whole Add by RSS copy.
- Who notices: about 31 v4 accounts that would otherwise have lost every Add by RSS feed
- Operator steps: none
```
