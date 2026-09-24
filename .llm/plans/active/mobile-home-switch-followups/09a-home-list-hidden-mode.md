# 09a — Let a Home list stay mounted while hidden (no behavior change yet)

## Goal

09b keeps up to three Home lists mounted and shows one. This milestone gives the list what it
needs to sit hidden safely, while the screen still shows exactly one list (`isActive` is always
true), so nothing changes for the user yet:

- New pure helpers `showKeptList` / `trimKeptLists` / `keptListPolicy` decide which lists stay
  mounted (most recently shown first; limit 3 and a 1.5 s idle delay in the app, limit 1 and no
  delay under E2E so flows only ever see one list).
- The list takes an `isActive` prop. While hidden it:
  - never reads: refresh, sync-finished, download, and first-load triggers mark it **stale**
    instead;
  - abandons its first read if it is hidden before that read lands;
  - stamps nothing, does not fire `home.paint`, does not report `canMarkAllSeen`, and turns
    `scrollsToTop` off (iOS honors the status-bar tap only when exactly one scroll view has it).
- When shown again it picks up a filter typed on another list and, if stale, reloads quietly
  (`synced`, which keeps rows on screen) — or with `initial` if it never finished a read.
- The list component is wrapped in `memo`, so hidden lists skip renders caused by the screen.

**Prediction:** no change in any metric. There is no capture; the unit tests and type-check are the
checkpoint.

## Preconditions

- 08 done and C8 reviewed as kept.

## Files

- New: `apps/mobile/src/lib/lists/keptLists.ts`
- New: `apps/mobile/src/lib/lists/keptLists.test.ts`
- `apps/mobile/src/screens/home/HomeMediaTypeList.tsx`
- `apps/mobile/src/screens/home/HomeScreen.tsx` (one prop)
- `apps/mobile/vitest.config.ts`
- Plan input: `.llm/plans/active/mobile-home-switch-followups/tools/home-kept-lists-a.edits`

## Step 1 — Back up the two Home files

```bash
cp apps/mobile/src/screens/home/HomeScreen.tsx .llm/plans/active/mobile-home-switch-followups/backup/HomeScreen.pre09a.tsx.txt
cp apps/mobile/src/screens/home/HomeMediaTypeList.tsx .llm/plans/active/mobile-home-switch-followups/backup/HomeMediaTypeList.pre09a.tsx.txt
```

## Step 2 — `keptLists.ts` (new)

```ts
/**
 * Which lists a chip row keeps mounted after the user leaves them, most recently shown first. The
 * first entry is the list on screen and is never dropped.
 */

export type KeptListPolicy = {
  /** How long taps must pause before lists past the limit are dropped; 0 drops them at once. */
  evictDelayMs: number;
  /** Lists mounted at most, counting the one on screen. */
  limit: number;
};

export const KEPT_LIST_LIMIT = 3;
export const KEPT_LIST_EVICT_DELAY_MS = 1500;

/** E2E keeps one list, so a flow only ever sees one list's rows and test IDs. */
export function keptListPolicy(isE2e: boolean): KeptListPolicy {
  return isE2e
    ? { evictDelayMs: 0, limit: 1 }
    : { evictDelayMs: KEPT_LIST_EVICT_DELAY_MS, limit: KEPT_LIST_LIMIT };
}

/** Drops the least recently shown lists past `limit`; the list on screen always stays. */
export function trimKeptLists<T>(kept: T[], limit: number): T[] {
  const keep = Math.max(1, limit);
  return kept.length > keep ? kept.slice(0, keep) : kept;
}

/** Moves `shown` to the front. With no eviction delay, lists past the limit go at once. */
export function showKeptList<T>(kept: T[], shown: T, policy: KeptListPolicy): T[] {
  const next = kept[0] === shown ? kept : [shown, ...kept.filter((entry) => entry !== shown)];
  return policy.evictDelayMs === 0 ? trimKeptLists(next, policy.limit) : next;
}
```

## Step 3 — `keptLists.test.ts` (new)

```ts
import { describe, expect, it } from 'vitest';

import { keptListPolicy, showKeptList, trimKeptLists } from './keptLists';

const APP = keptListPolicy(false);
const E2E = keptListPolicy(true);

describe('showKeptList', () => {
  it('moves the shown list to the front and keeps the rest in recency order', () => {
    expect(showKeptList(['a', 'b', 'c'], 'c', APP)).toEqual(['c', 'a', 'b']);
    expect(showKeptList(['a', 'b'], 'd', APP)).toEqual(['d', 'a', 'b']);
  });

  it('returns the same array when the shown list is already in front', () => {
    const kept = ['a', 'b'];
    expect(showKeptList(kept, 'a', APP)).toBe(kept);
  });

  it('leaves lists past the limit for the delayed trim', () => {
    expect(showKeptList(['c', 'b', 'a'], 'd', APP)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('keeps only the shown list at once under E2E', () => {
    expect(showKeptList(['a'], 'b', E2E)).toEqual(['b']);
  });
});

describe('trimKeptLists', () => {
  it('drops the least recently shown lists past the limit', () => {
    expect(trimKeptLists(['d', 'c', 'b', 'a'], 3)).toEqual(['d', 'c', 'b']);
  });

  it('never drops the list on screen', () => {
    expect(trimKeptLists(['a', 'b'], 0)).toEqual(['a']);
  });

  it('returns the same array when nothing is past the limit', () => {
    const kept = ['a', 'b'];
    expect(trimKeptLists(kept, 3)).toBe(kept);
  });
});
```

## Step 4 — Apply the list edits

```bash
./scripts/nix/with-env node .llm/plans/active/mobile-home-switch-followups/tools/move-blocks.mjs apply-edits .llm/plans/active/mobile-home-switch-followups/tools/home-kept-lists-a.edits
```

Expect 19 `applied …` lines. If it fails it writes nothing: stop and report the output. For review,
the edits:

1. Add `'src/lib/lists/keptLists.test.ts'` to the vitest include list.
2. Import `memo`; add the `isActive` prop (with a doc comment) and destructure it.
3. After `loadFeedRef.current = loadFeed;`, add `isActiveRef` and `isStaleRef`.
4. First-load effect, `homeFeedRefresh` subscriber, download-store subscriber, and the
   sync-finished branch: when hidden, set `isStaleRef.current = true` and return instead of
   reading.
5. `home.paint` effect and the `list.visible` stamp run only while active; `showsLoading` (the
   spinner stamp) requires `isActive`.
6. `scrollsToTop={isActive}` on the list, `isActive` in the `feedList` dependencies, and a
   rewritten comment above `feedList`.
7. `onCanMarkAllSeenChange` fires only while active.
8. Two new effects: leaving a list before its first read lands abandons that read and marks it
   stale; showing a list re-reads the shared filter term and reloads quietly if stale.
9. Export `memo(forwardRef(HomeMediaTypeListInner))` with a doc comment that mentions hidden lists.
10. The screen passes `isActive` (always true until 09b).

## Step 5 — Format and check

```bash
./scripts/nix/with-env npx prettier --write apps/mobile/src/lib/lists/keptLists.ts apps/mobile/src/lib/lists/keptLists.test.ts apps/mobile/src/screens/home/HomeMediaTypeList.tsx apps/mobile/src/screens/home/HomeScreen.tsx apps/mobile/vitest.config.ts
rg -c "isStaleRef.current = true" apps/mobile/src/screens/home/HomeMediaTypeList.tsx
rg -n "memo\(forwardRef\(HomeMediaTypeListInner\)\)" apps/mobile/src/screens/home/HomeMediaTypeList.tsx
```

Expect `5` from the count and one line from the second search.

## Do not

- Do not change `HomeScreen.tsx` beyond the one `isActive` prop; 09b rewrites the screen side.
- Do not add a `display: 'none'` style anywhere; a hidden list must keep its native views so it can
  reappear in one frame with its scroll position.

## Done when

- [ ] Steps 1–5 done; outputs match.
- [ ] COPY-PASTA 09a ticked; this file moved to `.llm/plans/completed/mobile-home-switch-followups/`.

## Keep / revert

Nothing to measure. If 09b is later reverted, keep 09a: an always-active list behaves exactly as
before. Revert 09a only when the operator's unit test or type-check fails because of it: copy both
`backup/*.pre09a.tsx.txt` files back, delete the two new files, and remove the vitest line.

## Operator checkpoint

**Mobile** — unit tests for the new helpers, then the type-check:

```bash
npm --prefix apps/mobile run test -- src/lib/lists
npm run type-check:mobile
```

Reply `done 09a` with the result, then paste prompt 09b.
