# 05 — RSS domain hooks and service split

## Objective

Split `AddByRssRootScreen` into reusable domain logic pieces to keep UI concise and maintainable.

## Targets

- `apps/mobile/src/screens/rss/AddByRssRootScreen.tsx`
- `apps/mobile/src/prefs/addByRSSFeeds.ts`

## Planned extractions

1. Create RSS domain service module (`apps/mobile/src/lib/addByRss/`):
   - parse preview extraction
   - URL validation
   - status polling
   - feed merge/build helpers
2. Create hooks:
   - `useAddByRssFeeds` (load, sync, remove)
   - `useAddByRssAddFlow` (validate, follow, parse, persist)
   - `useAddByRssPlayback` (policy + bridge execution)
3. Keep screen component as composition layer for inputs/buttons/list rendering only.

## Acceptance criteria

- `AddByRssRootScreen` file complexity reduced substantially.
- RSS API/persistence/polling/playback logic moved to shared domain hook/service code.
- Existing flow testIDs and behavior preserved.

## Completion

When this final step is implemented, provide cumulative verification commands for the full
`mobile-reusability-pass` set and archive the plan directory.
