# v4 flagged feed block

Request: [00-REQUEST.md](00-REQUEST.md). Prompts: [COPY-PASTA.md](COPY-PASTA.md).

Runs in this checkout, on the current branch. Do not open a worktree. Start only after
`add-by-rss-directory-match` is complete. Both sets edit the Add by RSS follow controller;
whichever lands second keeps the blocked-feed check before the directory match.

**Root** tab, after the local rehearsal parsers finish:

```bash
./scripts/abcplan/run.sh run v4-flagged-feed-block
```

One prompt per phase. By hand: one Cursor window, **Cursor Grok 4.7**, reasoning **high**, Fast
off. Paste prompt 1, wait until it finishes, then prompt 2.

## Rules for every prompt

- Read and execute your plan. When the code disagrees with a path, trust the code and keep the
  plan's intent.
- Do not run tests. Do not run `v4ImportFlaggedFeeds`. Do not commit, push, or open a pull request.
- Comments follow **comments-future-forward**.
- Prompt 1 appends no scratchpad entry. Prompt 2 appends the entry in its plan, then moves this
  set to `.llm/plans/completed/v4-flagged-feed-block/`.

## What this set does

v4 `spam` and `takedown` do not carry a block into v5 today. The catalog seed skips those shows, and `FeedService.getOrCreate` will later insert a normal feed for the same Podcast Index id or authority URL.

This set writes a blocked v5 feed for every v4 podcast with those two flags, then refuses the paths that would parse, list, or add that feed. `none`, `other`, and `always-allow` are not blocks. `isPublic = false` stays out of this set. The launch queue and `isSeedablePodcast` stay as they are.

## Order

1. `01-import-v4-flag-blocks.md` — worker command that writes the blocked feeds.
2. `02-refuse-blocked-feed-entry.md` — parser, subscribe, Add by RSS, and OPML refuse those feeds.

Prompt 2 can be written against the policy functions before prompt 1 has been run on a database. The import is what fills the rows the gate reads.

## Out of scope

- Do not seed `spam` or `takedown` into the parse queue.
- Do not change clip, playlist, history, queue, or now-playing handling.
- Do not run `v4ImportFlaggedFeeds` against the v4 database during implementation.
- Do not commit, push, or open a pull request unless the operator asks in that session.

## Cumulative verification

The operator runs this once, after prompt 2, from the **Root** tab:

```bash
npm run test -w apps/workers -- src/commands/orm/v4Catalog/importFlaggedFeedsLib.test.ts
npm run test -w packages/orm -- src/services/feed/feedEntryBlock.test.ts
npm run test -w packages/parser -- src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts
npm run test -w apps/api -- src/test/feed-blocked.integration.test.ts
```
