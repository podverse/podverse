# Sub-Plan 4: Complex Tags — Placeholders

## Objective

Document and stub the complex Podcast Namespace tags so that a future sub-plan can "figure out" the exact XML shape and faker strategy. No full implementation in this step; only placeholders and notes.

## Status

**Placeholder sub-plan.** Do not implement full XML generation for these tags yet. Add code comments or a small "TODO" section in the generator and reference this document.

## Tags in Scope (Placeholder Only)

### podcast:value (channel and item)

- **Complexity:** Nested structure: `type`, `method`, `suggested`, plus `podcast:valueRecipient` children; item-level can have `podcast:valueTimeSplit`. Partytime phase-4; parser-mapping `value.ts`.
- **Placeholder action:** Document in generator README or code: "Value generation: deferred. See [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md). Emit empty or skip for now."

### podcast:alternateEnclosure (item)

- **Complexity:** Multiple sources, optional integrity; Partytime phase-3; item enclosure compat.
- **Placeholder action:** Document: "Alternate enclosure: deferred. See [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md). Omit for now."

### podcast:liveItem (channel)

- **Complexity:** Status, start/end, enclosure, contentLinks; Partytime phase-4; compatLiveItemsDtos.
- **Placeholder action:** Document: "Live item: deferred. See [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md). Omit for now."

### podcast:remoteItem / podcast:podroll (channel)

- **Complexity:** feedGuid (required), itemGuid, feedUrl, medium, title; Partytime phase-6.
- **Placeholder action:** Document: "Remote item / podroll: deferred. See [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md). Omit for now."

### podcast:publisher (channel)

- **Complexity:** feedGuid (required), feedUrl; Partytime phase-7.
- **Placeholder action:** Document: "Publisher: deferred. See [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md). Omit for now."

## Implementation Steps (Minimal)

1. **README or design doc** — In `tools/test-assets/` (e.g. TOOLS-TEST-ASSETS.md or comments in `generate-feed-cli.ts`) add a "Future work" or "Complex tags" section that lists the five areas above and points to [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md) for full implementation.
2. **Code comments** — Where the generator builds channel/item XML, add comments such as `// PLACEHOLDER: podcast:value - see future/07-complex-tags-implementation.md`.
3. **No failing tests** — If there are tests that expect these tags, skip or expect "absent" until the future plan is executed.

## Acceptance Criteria

- All five complex tag groups are documented as placeholders with a pointer to [future/07-complex-tags-implementation.md](future/07-complex-tags-implementation.md).
- Generator still produces valid feeds without these tags; Partytime and parser-mapping continue to work for all already-implemented tags.

## Run after this plan

From repo root: `npm run generate -w podverse-test-assets -- 2`. Or: `cd tools/test-assets && npm run generate -- 2`.

Confirm:

1. Feeds still generate and parse; no regression from adding placeholder docs and code comments.
2. TOOLS-TEST-ASSETS.md or generator code includes a "Future work" / "Complex tags" section pointing to future/07.

## References

- Partytime: `phase-4.ts` (value, liveItem), `phase-3.ts` (alternateEnclosure), `phase-6.ts` (remoteItem, podroll), `phase-7.ts` (publisher).
- Parser-mapping: `value.ts`, `channel.ts` (remoteItem, podroll, publisher), `item.ts` (enclosure for alternateEnclosure); parser `liveItem/liveItem.ts`.
