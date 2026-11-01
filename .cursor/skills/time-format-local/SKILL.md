---
name: time-format-local
description: Ensures client-side calendar and wall-clock displays use the shared date helpers. Use when rendering dates/times in the UI or when the user mentions time formatting or local timezone display.
---

# Local Time Formatting

## Instructions

- For client-side UI that displays a **calendar date only** (item list rows, grid tiles, channel
  last-pub labels), use `formatDateAbbrev` from `@podverse/helpers` (`Oct 26, 2026`).
- For client-side UI that displays a **calendar date and wall-clock time** (item detail headers,
  feed parse status, settings timestamps), use `formatDateTimeAbbrev` from `@podverse/helpers`.
- Pass the active locale (typically from `useLocale()` / `next-intl` / `i18n.language`) to keep
  i18n consistent.
- The date-and-time label is the local calendar date, `-`, then the local time
  (`Oct 26, 2026 - 11:16 PM`). Omit `timeZone` so the clock is the device timezone, and do not
  append a zone abbreviation or the word “at”.
- On web, `ReadableDate` defaults to date-only; pass `includeTime` on item detail headers and the
  embed player.
- **Not this skill:** playhead, duration, clip, chapter, and transcript clocks. Those use
  `formatHHMMSS` — see **playback-timestamp-format**.

## Example

```ts
import { formatDateAbbrev, formatDateTimeAbbrev } from '@podverse/helpers';
import { useLocale } from 'next-intl';

const locale = useLocale();
const listLabel = formatDateAbbrev(pubDate, locale);
const detailLabel = formatDateTimeAbbrev(pubDate, locale);
```
