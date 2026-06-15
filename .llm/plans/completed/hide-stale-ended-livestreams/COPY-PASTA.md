# Hide stale ended livestreams — COPY-PASTA prompts

Sequential phases. Run one prompt, wait for completion, then the next. Do not run tests during implementation; the operator verifies at the end.

Progress:

- [x] 01 helpers visibility
- [x] 02 ORM where filter
- [x] 03 channel controller
- [x] 04 tests + docs

---

## Phase 1

```
Read and execute .llm/plans/active/hide-stale-ended-livestreams/01-helpers-visibility.md
Add LIVE_ITEM_ENDED_VISIBILITY_MAX_AGE_MS, getEndedLiveItemVisibilityCutoff, and isLiveItemEndedAndStale to @podverse/helpers with unit tests.
```

## Phase 2

```
Read and execute .llm/plans/active/hide-stale-ended-livestreams/02-orm-where-filter.md
Apply the ended cutoff (end_time >= cutoff OR end_time IS NULL AND start_time >= cutoff) as a where-array in ItemService.getMany, getManyByChannels, StatsAggregatedItemService.getMany, and getManyByChannelsAndCount when liveItemType === 'ended'.
```

## Phase 3

```
Read and execute .llm/plans/active/hide-stale-ended-livestreams/03-channel-controller.md
Filter stale ended items out of LiveItemController.getManyByChannel before partitioning, using isLiveItemEndedAndStale.
```

## Phase 4

```
Read and execute .llm/plans/active/hide-stale-ended-livestreams/04-tests-and-docs.md
Add apps/api integration tests (incl. null end_time fallback, live/pending unaffected, detail endpoint still returns) and update live-item API docs.
```
