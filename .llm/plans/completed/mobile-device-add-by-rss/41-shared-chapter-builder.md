**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 41 — One chapter builder for the API and the device

The chapters-transcript endpoint turns a chapters JSON file into chapter rows in three steps:
`compatParsedChapters`, then `assignChapterEndTimes`, then an `id_text` of
`${itemIdText}-ch-${index}`. Plan 43 makes the phone do the same for feeds it parsed itself. This
plan moves the end-time step and the three-step builder into `@podverse/parser-mapping`, which
mobile already bundles, so both sides produce identical chapters. No behavior changes.

## Rows

R15

## Runs after

none

## Files

packages/parser-mapping/src/compat/chapters/chapters.ts
packages/parser-mapping/src/addByRSS/chaptersTranscript.ts
packages/parser-mapping/src/addByRSS/chaptersTranscript.test.ts
apps/api/src/controllers/account/accountAddByRSSChaptersTranscript.ts
apps/api/src/controllers/item.ts
apps/api/src/lib/chapters.ts

## Reused, not rewritten

- `assignChapterEndTimes` from `apps/api/src/lib/chapters.ts`: move the function and its doc
  comment exactly as they are, including the generic signature and the existing `as T`.
- `compatParsedChapters` in `packages/parser-mapping/src/compat/chapters/chapters.ts` (already
  exported from the package index through `export * from './compat/chapters/chapters.js'`).

## 1. `packages/parser-mapping/src/compat/chapters/chapters.ts`

Append `assignChapterEndTimes`, moved from `apps/api/src/lib/chapters.ts`, as an exported
function after `compatParsedChapters`. The package index already re-exports this file, so no index
change.

## 2. `packages/parser-mapping/src/addByRSS/chaptersTranscript.ts`

Add, after the existing exports:

```ts
/** A chapter row as the chapters-transcript endpoint returns it and the device builds it. */
export type AddByRSSChapterWithIdText = DTOItemChapterCreate & { id_text: string };

/**
 * Chapter rows for one Add by RSS item from the `chapters` array of its chapters JSON: end times
 * filled from the next table-of-contents chapter, then ids `<itemIdText>-ch-<index>`.
 */
export const buildAddByRSSChapterResponses = (
  itemIdText: string,
  chapters: PIChapter[]
): AddByRSSChapterWithIdText[] =>
  assignChapterEndTimes(compatParsedChapters(chapters)).map((chapter, index) => ({
    ...chapter,
    id_text: `${itemIdText}-ch-${index}`,
  }));
```

Imports, each on its own line, type imports separate:

- `import type { DTOItemChapterCreate } from '@podverse/helpers';`
- `import { assignChapterEndTimes, compatParsedChapters } from '../compat/chapters/chapters.js';`
- `import type { PIChapter } from '../types/partytime.js';`

Skip any of these the file already has.

## 3. `apps/api/src/controllers/account/accountAddByRSSChaptersTranscript.ts`

- Inside `if (data?.chapters && Array.isArray(data.chapters)) { … }` (around line 151), replace
  the three statements (`createChapters`, `withEndTimes`, and the `chapters = withEndTimes.map…`
  block) with `chapters = buildAddByRSSChapterResponses(itemIdText, data.chapters);`.
- Remove `import { assignChapterEndTimes } from '@api/lib/chapters.js';` and
  `import { compatParsedChapters } from '@podverse/parser-mapping';`; add
  `import { buildAddByRSSChapterResponses } from '@podverse/parser-mapping';` in the same place.
  Keep `import type { PIChapter } from '@podverse/parser-mapping';` (the `_request` generic still
  uses it).

## 4. `apps/api/src/controllers/item.ts`

Replace `import { assignChapterEndTimes } from '@api/lib/chapters.js';` (line 10) with
`import { assignChapterEndTimes } from '@podverse/parser-mapping';`, placed in the file's
`@podverse/*` import group (merge into an existing `@podverse/parser-mapping` value import if the
file has one). The call at line 1105 does not change.

## 5. Delete `apps/api/src/lib/chapters.ts`

After steps 3 and 4 nothing imports it. Search `lib/chapters` under `apps/api/src` to confirm
before deleting.

## Tests

New `packages/parser-mapping/src/addByRSS/chaptersTranscript.test.ts` (Vitest, same style as the
other tests in that folder), `describe('buildAddByRSSChapterResponses')`:

- Two table-of-contents chapters at `startTime` 0 and 30 with no `endTime`: the first gets
  `end_time` `'30'` (the next one's `start_time`), the last keeps `null`; ids are `item1-ch-0` and
  `item1-ch-1`.
- A chapter with `toc: false` and no `endTime` is dropped; one with `toc: false` and an `endTime`
  is kept with that end time; ids count only the chapters kept.
- An empty array returns `[]`.

Match `start_time` values to what `compatParsedChapters` produces (it copies `startTime`); read it
once before writing the expectations.

## Release scratchpad

none
