# 04 - Podverse Channel/Item Boosts Tabs and Breadcrumb Links

## Scope

Add `Boosts` tab and content on channel/item pages using `mbrss-v1` public list endpoints, gated to metaboost-enabled channels only, including breadcrumb link navigation to Podverse routes.

## Target Files (Podverse)

- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id]/PodcastPageListHeader.tsx`
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx`
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/podcast/[channel_id]/PodcastPageContext.tsx`
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id]/EpisodePageListHeader.tsx`
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id]/EpisodePageList.tsx`
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/episode/[item_id]/EpisodePageContext.tsx`
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostSelection.ts` (metaboost-enabled gating reference)

## Implementation Steps

1. Add new `Boosts` tab key to channel/item list-header tab sets.
2. Gate tab visibility:
   - Show only when channel has metaboost-enabled `mbrss-v1` metadata.
   - Do not show for non-metaboost channels.
3. Add tab panel render path that mounts shared `BoostMessagesSection`.
4. Wire endpoint context:
   - Channel page: query by `bucketShortId + podcastGuid`.
   - Item page: query by item context (`itemGuid`) with channel linkage.
5. Implement breadcrumb link resolver in Podverse:
   - Convert breadcrumb metadata (`podcastGuid`, `itemGuid`) into Podverse page links by looking up matching channel/item records.
   - Use clickable breadcrumb labels where resolvable.
   - If unresolved, render label text without navigation.
   - Omit breadcrumb row when message belongs to current page context.
   - Deterministic suppression rules:
     - Channel page: suppress breadcrumb when `breadcrumbContext.level === 'channel'` and `isSubBucket === false`.
     - Item page: suppress breadcrumb when `breadcrumbContext.level === 'item'` and `isSubBucket === false`.
     - Only show breadcrumb when `breadcrumbContext.isSubBucket === true`.
   - Deterministic route targets:
     - If `itemGuid` resolves: link to `/episode/[item_id]`.
     - Else if `podcastGuid` resolves: link to `/podcast/[channel_id]`.
     - Else: no link.

## Verification

From Podverse repo root:

```bash
./scripts/nix/with-env npm run lint -w apps/web
./scripts/nix/with-env npm run dev:web
```

Manual checks:
- `Boosts` tab appears only for metaboost-enabled channels.
- Channel and item tab message queries paginate correctly.
- Breadcrumb links navigate to expected Podverse channel/item pages when available.
- No breadcrumb shown for current-page context.
- Item breadcrumb prefers episode route when both podcast/item are present and resolvable.

## Exit Criteria

- Channel/item `Boosts` tabs are fully wired with breadcrumb-aware message display and navigation.
