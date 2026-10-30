**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 11 — Document above-zero directory Top for all five list types

Rewrite § Public range sorts in `docs/features/POPULARITY-AND-TASTE-PROFILE.md` so it states the
rule plan 10 (channels and items ranked-only; live-item global and category Top keep the fill) and
area B's plans (clips, playlists, profiles) implement. Area A owns this file for all five list
types; area B does not edit it.

## Rows

R8, R10, R11, R12, R14, R17

## Runs after

10, and every area B plan in block 20–29 that changes clip, playlist, or profile public Top

## Files

docs/features/POPULARITY-AND-TASTE-PROFILE.md

## Change

Anchor: the heading `## Public range sorts` (about line 233). Replace the section body, from the
line after the heading up to the line before `## Channel Merge`, with exactly this text:

```markdown
Top lists for channels, items and live items, clips, playlists, and profiles read the
`stats_popularity_*` table for their type through `StatsPopularity<Type>Service`.

- `range` maps to a column through `STATS_POPULARITY_COUNT_FIELDS`; ties order by the entity id.
- The refresh job resets a window to zero rather than deleting the row, so zero counts are common.
  Readers that exclude zeros filter them; the table does not.
- Directory Top lists include only entities whose count for the chosen range is above zero. They
  are global and category Top for channels, items, and clips, public playlists Top, and public
  profiles Top. A range with no count above zero returns an empty list, and a short page is not
  padded. Recent is a separate sort the listener picks; these lists never fall back to it.
- Global and category live-item Top, subscribed Top for channels, items, and live items, and the
  Top sort on a channel's episode list pad a short page with recent entities from the same scope
  (`fillTopPage` in `@podverse/helpers`). They fall back to recent entities when nothing in scope
  is above zero, so those pages include rows whose count for the range is zero.
- Subscribed clip and profile Top, the account's own and followed playlists Top, and a channel's or
  episode's clip Top list every row in scope, zero counts included, and do not pad.
- Requests never sum daily rows; freshness follows the refresh job's schedule.
```

### Matching area B

Before writing, read the `## Files` and `## Decisions` of each area B plan (`20-*.md` through
`29-*.md` in this set). The text above assumes area B makes global and category clip Top, public
playlists Top, and public profiles Top above-zero only, and leaves every list in the
"list every row" bullet unchanged. Global and category live-item Top stay in the pad bullet.
Area B does not own them. Do not move them into the directory bullet.

- If an area B plan makes a list in the "list every row" bullet above-zero only, move that list
  into the "Directory Top lists" bullet's second sentence and drop it from the "list every row"
  bullet.
- If an area B plan leaves one of global or category clip Top, public playlists Top, or public
  profiles Top unchanged, stop and report it instead of editing; the request requires all five
  directory types to be above-zero only.
- If area B adds a public playlists Recent read, add nothing here; this section covers Top only.

Keep the rest of the document unchanged. Lines under `docs/` follow the 100-character limit in
`markdown-formatting`; the block above already fits.

## Tests

none — documentation only.

## Release scratchpad

none
