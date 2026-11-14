# 10 — An out-of-range time in a feed no longer fails the whole parse

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

## Rows

R10

## Runs after

none

## Why

`compatItemAboutDto` (`packages/parser-mapping/src/compat/partytime/item.ts`) writes
`parsedItem.duration?.toFixed(2)` with no bound. `item_about.duration` is the `media_player_time`
domain, `NUMERIC(10,2)`, so 100,000,000 seconds or more raises `numeric field overflow` and the
whole feed parse fails. One pilot feed failed this way; 920 v4 episodes carry a duration that large
(feeds that publish milliseconds or bytes) (00-FINDINGS F9). This affects ordinary v5 parsing,
not only migration. `DATABASE_CONSTANTS.getMediaPlayerNumeric` has the same gap for soundbites and
value time splits.

## Decision

A time that is not finite, is negative, or is at least 100,000,000 is not stored:

- item duration → null
- a soundbite or value time split whose start or duration is out of range → skipped
- `remote_start_time` / `remote_percentage` out of range → their existing defaults (0 / 100)
- a chapter whose start is out of range → skipped; an out-of-range end → null

## Files

- `packages/helpers/src/lib/constants/databaseConstants.ts` and a test beside it
- `packages/parser-mapping/src/compat/partytime/item.ts`
- `packages/parser-mapping/src/compat/partytime/value.ts`
- `packages/parser-mapping/src/compat/partytime/item.duration.test.ts` (new)
- the chapter writer in `packages/parser/src` (`rg -n "start_time" packages/parser/src/lib/rss -g '!*.test.ts'`) and its test
- `release-notes/scratchpad.md` (only through the final message)

## 1. Helper

In `databaseConstants.ts`:

```ts
/** `media_player_time` is NUMERIC(10,2): at most 99,999,999.99. */
media_player_time_max_exclusive: 100_000_000,
mediaPlayerTimeOrNull: (num: number | null | undefined): string | null =>
  typeof num === 'number' && Number.isFinite(num) && num >= 0 && num < 100_000_000
    ? num.toFixed(2)
    : null,
```

Keep `getMediaPlayerNumeric` for callers outside the parser; replace its parser-mapping uses.

## 2. Callers

- `item.ts` line 36: `duration: DATABASE_CONSTANTS.mediaPlayerTimeOrNull(parsedItem.duration)`.
  This also turns a `0` duration into `'0.00'` instead of null; keep today's behavior by mapping
  `0` to null (`parsedItem.duration ? … : null`), since a zero duration means unknown in feeds.
- `compatItemSoundbiteDtos`: skip a soundbite whose start or duration maps to null.
- `value.ts`: skip a time split whose start or duration maps to null; remote start and percentage
  fall back to `'0.00'` / `'100.00'` as today.
- Chapters: apply § Decision where the parser maps chapter JSON to `item_chapter` rows.

## Tests

- helper: 0, 1.234, 99,999,999.99, 100,000,000, -1, `NaN`, `Infinity`, null.
- `item.duration.test.ts`: an item with duration 1e8 maps to null; 3600 maps to `'3600.00'`;
  a soundbite with duration 1e9 is dropped and its sibling kept.
- value: a split with start 1e8 is dropped.
- chapter: a chapter with start 1e8 is dropped; end 1e8 becomes null.

## Release scratchpad

Phase 1 runs prompts together, so put this entry in the final message under
"Release notes entry" instead of writing the file:

```markdown
## Feeds with huge episode durations parse again

- Surfaces: parser
- Change: an episode duration, soundbite, chapter, or value time split of 100,000,000 seconds or more (or negative, or not a number) is dropped or stored empty instead of failing the whole feed parse.
- Who notices: listeners of feeds that publish durations in milliseconds or bytes; their episodes now appear
- Operator steps: none
```
