# 02 - Parser-Mapping Channel MetaBoost

## Objective

Map Partytime channel-level `metaBoost` into Podverse compat DTOs so downstream value metadata can surface MetaBoost context.

## Current Gap

- `packages/parser-mapping/src/compat/partytime/channel.ts` currently sets `channelMetaBoost = null`.
- item/channel value compat objects often emit `meta_boost: null`.

## Implementation Plan

1. Add explicit mapper from Partytime shape:
   - input: `parsedFeed.metaBoost` (`{ standard, node }`)
   - output: Podverse compat `DTOValueMetaBoost` shape
2. Map `standard` into Podverse model fields in a deterministic way:
   - keep mapping centralized (single helper) so future standards are easy to add.
3. Replace hardcoded `channelMetaBoost = null` with mapped value when valid.
4. Ensure item-level compatibility behavior remains unchanged unless intentionally inheriting channel metadata.
5. Preserve existing behavior for feeds without `metaBoost`.

## Files to Update

- `packages/parser-mapping/src/compat/partytime/channel.ts`
- `packages/parser-mapping/src/compat/partytime/value.ts` (if needed)
- `packages/parser-mapping/src/compat/partytime/item.ts` (if needed)
- potential helper file under `packages/parser-mapping/src/compat/partytime/`

## Test Plan

- Channel with valid MetaBoost maps non-null value metadata.
- Channel with missing/invalid MetaBoost still maps safely with null/no metadata.
- Legacy value-tag-only feeds are unaffected.

## Acceptance Criteria

- Parsed feed channel MetaBoost is no longer dropped during compat mapping.
- Existing parser + ORM value flows remain backward compatible for non-MetaBoost feeds.
