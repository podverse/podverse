# Migration Part 4: List Components QueryParams

## Scope

Update QueryParams imports in combined channel list components.

## Files to Update (4)

All files import `QueryParamsMedium` from `@podverse/helpers`:

1. `apps/web/src/components/List/ListCombinedChannels/ListCombinedChannelGridNode.tsx`
2. `apps/web/src/components/List/ListCombinedChannels/ListCombinedChannelNodes.tsx`
3. `apps/web/src/components/List/ListCombinedChannels/ListCombinedChannelRow.tsx`
4. `apps/web/src/components/List/ListCombinedChannels/ListCombinedChannels.tsx`

**Action**: No changes needed
**Reason**: `QueryParamsMedium` correctly stays in `@podverse/helpers`

## Result

✅ All files are already correct

## Status

✅ Complete
