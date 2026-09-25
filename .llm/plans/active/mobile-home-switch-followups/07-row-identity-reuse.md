# 07 — Keep unchanged Home rows as the same objects across reloads

## Goal

Every Home load (`refresh`, `retry`, `synced` after background sync) builds new row objects, so
every memoized row re-renders even when nothing about it changed. A background sync on an idle
Home therefore re-renders the whole list. Reuse the previous object for each row whose contents
are unchanged, and return the previous array when nothing changed at all (React then skips the
update). `mergeDownloadedCountsIntoHomeRows` already follows this rule; the load path does not.

**Prediction:** `rowRenders.refreshLoad` p50 (R7) falls from about the number of mounted rows to
about the number of rows whose data changed (often 0). Chips metrics do not move.

## Preconditions

- 06b done and P6/C6 reviewed.

## Files

- New: `apps/mobile/src/screens/home/reconcileHomeFeedRows.ts`
- New: `apps/mobile/src/screens/home/reconcileHomeFeedRows.test.ts`
- `apps/mobile/src/screens/home/HomeScreen.tsx`
- `apps/mobile/vitest.config.ts`

## Step 1 — `reconcileHomeFeedRows.ts` (new)

```ts
import { isEqual } from '@podverse/helpers';

/**
 * Reuse the previous object for every row whose id and contents are unchanged, so memoized rows
 * skip re-rendering when a reload returns the same data. When every row matches in the same order
 * the previous array itself comes back, and React skips the update entirely.
 */
export function reconcileHomeFeedRows<T extends { id: string }>(previous: T[], next: T[]): T[] {
  if (previous.length === 0) {
    return next;
  }
  const previousById = new Map<string, T>();
  for (const row of previous) {
    previousById.set(row.id, row);
  }
  let isUnchanged = previous.length === next.length;
  const reconciled = next.map((row, index) => {
    const prior = previousById.get(row.id);
    if (prior === undefined || !isEqual(prior, row)) {
      isUnchanged = false;
      return row;
    }
    if (previous[index] !== prior) {
      isUnchanged = false;
    }
    return prior;
  });
  return isUnchanged ? previous : reconciled;
}
```

## Step 2 — `reconcileHomeFeedRows.test.ts` (new)

```ts
import { describe, expect, it } from 'vitest';

import { reconcileHomeFeedRows } from './reconcileHomeFeedRows';

type Row = { id: string; metadata?: { unseen: number }; title: string };

const rowsOf = (...titles: string[]): Row[] =>
  titles.map((title) => ({ id: title.toLowerCase(), title }));

describe('reconcileHomeFeedRows', () => {
  it('returns the previous array when a reload brings identical rows', () => {
    const previous = rowsOf('A', 'B');
    expect(reconcileHomeFeedRows(previous, rowsOf('A', 'B'))).toBe(previous);
  });

  it('reuses unchanged rows and takes changed ones', () => {
    const previous = rowsOf('A', 'B');
    const next: Row[] = [
      { id: 'a', title: 'A' },
      { id: 'b', metadata: { unseen: 2 }, title: 'B' },
    ];
    const result = reconcileHomeFeedRows(previous, next);
    expect(result).not.toBe(previous);
    expect(result[0]).toBe(previous[0]);
    expect(result[1]).toBe(next[1]);
  });

  it('keeps row objects through a reorder but returns a new array', () => {
    const previous = rowsOf('A', 'B');
    const result = reconcileHomeFeedRows(previous, rowsOf('B', 'A'));
    expect(result).not.toBe(previous);
    expect(result[0]).toBe(previous[1]);
    expect(result[1]).toBe(previous[0]);
  });

  it('notices nested changes and new rows', () => {
    const previous: Row[] = [{ id: 'a', metadata: { unseen: 1 }, title: 'A' }];
    const next: Row[] = [
      { id: 'a', metadata: { unseen: 3 }, title: 'A' },
      { id: 'c', title: 'C' },
    ];
    const result = reconcileHomeFeedRows(previous, next);
    expect(result[0]).toBe(next[0]);
    expect(result[1]).toBe(next[1]);
  });

  it('passes the next rows through when there were none before', () => {
    const next = rowsOf('A');
    expect(reconcileHomeFeedRows([], next)).toBe(next);
  });
});
```

In `apps/mobile/vitest.config.ts`, directly after `      'src/screens/home/homeRowMetadata.test.ts',`
add `      'src/screens/home/reconcileHomeFeedRows.test.ts',`.

## Step 3 — `HomeScreen.tsx`

3a. Directly above `import type { QueueActionPosition } from './useHomeRowPlayback';` add
`import { reconcileHomeFeedRows } from './reconcileHomeFeedRows';`.

3b. Replace the single line `          setFeedRows(rows);` (inside `loadFeed`, directly after
`perfMark('home.rows.set', selectedMediaType);`) with:

```tsx
          setFeedRows((previous) => reconcileHomeFeedRows(previous, rows));
```

Leave every other `setFeedRows` call as it is.

## Do not

- Do not apply this to Browse (its feed state is a composite object, and it reloads rarely).
- Do not change `mergeDownloadedCountsIntoHomeRows`.

## Done when

- [ ] `rg -n "reconcileHomeFeedRows" apps/mobile/src` shows the module, its test, and two lines
      in `HomeScreen.tsx`.
- [ ] Prettier run on the changed files. COPY-PASTA 07 ticked; file moved to `completed/`.

## Keep / revert

- **Keep** when R7 `rowRenders.refreshLoad` p50 falls by at least half versus R0 and rows still
  update when their data changes (unseen badges, titles, download counts).
- **Revert** when any row shows stale content after a refresh or sync. Revert = restore
  `setFeedRows(rows);`, delete the import, the two new files, and the vitest line.

## Operator checkpoint — R7

**Mobile** — unit tests:

```bash
npm --prefix apps/mobile run test -- src/screens/home
```

Capture **R7** (`refresh` gesture on the Episodes chip) per [CHECKPOINT.md](./CHECKPOINT.md).
Reply `collected R7` with the impression.
