# 720-defer-home-media-type-sort-coverage

**Master step:** P2.1.3
**Model (author + implement):** Codex 5.3
**Status:** draft — deferred to a future phase

## Scope

Home's sort control ships covering **Podcasts** and **Episodes** only, and Home's media-type chips
ship without an **All** option. Both are operator-deferred.

### What ships now

The sort row appears on Podcasts and Episodes, offering `A-Z` and `recent`. On Clips, Artists,
Albums, and Tracks the row is **absent** rather than present and inert, because a control that
changes nothing is worse than no control.

Those four media types also still read the global directory unconditionally, which is the wider
contradiction recorded in
[705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md).
Sorting them is downstream of deciding what they show: a sort over directory rows is a server
ranking question, not a local ordering one, so it cannot be settled ahead of that.

### What is deferred

**Sort for the remaining media types.** Clips, Artists, Albums, and Tracks. Each needs its own answer
to what `recent` means — a clip has a creation date and a source episode date, an artist has no date
of its own — and each needs a decision about whether the ordering is local or requested from the
server. Whatever they adopt goes through the same scope-keyed store, one scope per media type, so a
user's choice for one never leaks into another.

**An `All` media type covering the channel kinds.** Podcasts, artists, and albums are all channels,
and the operator wants a single view of them. That is a list-composition change before it is a sort
change: three sources with different mediums have to merge into one ordered list, and `recent` across
them needs one comparable date. `subscriptionsRepository` already merges directory follows with
add-by-RSS across both mediums, so the merge has a home; what it lacks is a chip that asks for it and
a decision about how music channels acquire a latest-publish date, since only podcast channels
currently store items locally.

## Acceptance criteria

- Each newly sorted media type defines what `recent` orders by, and it is stated here.
- Sort preferences stay per media type under the existing scope-keyed store — no new preference
  mechanism (see
  [714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)).
- An `All` chip merges the channel kinds into one list and orders it by a date every kind can supply.
- The sort control remains hidden for any media type that has not adopted it.
- E2E asserts row order actually changes, which needs a flow that creates at least two subscriptions
  with known titles and dates — Home's current flows do not.

## Web parity references

- `apps/mobile/src/prefs/homeListPrefs.ts` — `HOME_SORTABLE_MEDIA_TYPES`, the list to extend
- `apps/mobile/src/screens/home/homeFeedData.ts` — the per-media-type read paths
- `apps/mobile/src/data/repositories/subscriptionsMerge.ts` — existing comparators
- `apps/web` `/podcasts` header dropdowns — the sort vocabulary the surfaces share

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- home
```
