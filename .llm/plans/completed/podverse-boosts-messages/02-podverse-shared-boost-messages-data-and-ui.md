# 02 - Podverse Shared Boost Messages Data and UI

## Scope

Build a reusable Podverse component + data layer for async paginated Boost messages that can be used by donate and channel/item tabs.

## Target Files (Podverse)

- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/` (new reusable files)
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Pagination/Pagination.tsx` (reuse only; no required edits unless needed)
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useMbrssV1BoostCapability.ts` (pattern reference)
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/` (new module styles for messages section)
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/en-US.json` (new UI copy keys)

## Implementation Steps

1. Add shared fetch helpers for paginated standards list endpoints:
   - `mb-v1` by bucket short id.
   - `mbrss-v1` by channel/item context.
2. Normalize API payloads into one front-end model:
   - `senderName` (fallback to `Anonymous`)
   - `appName`
   - `createdAt`
   - `message` (optional)
   - breadcrumb context metadata.
   - Keep server field names intact where possible; map only for UI naming consistency.
3. Build reusable `BoostMessagesSection` component:
   - Section heading + optional section-level intro.
   - Inline loading spinner while async fetch is in progress.
   - Error state text: `messages from this server are not publicly available at this time.`
   - Empty state support.
   - Pagination using existing Podverse pagination control.
4. Implement pagination scroll behavior:
   - On page change, scroll jump to top of messages section anchor/ref.
5. Add breadcrumb rendering:
   - Render breadcrumb row at top of each message only when message context is subbucket.
   - Breadcrumb labels are links when route resolution succeeds.
   - Omit breadcrumb for current-page context (no redundant top-level crumb).
6. Add deterministic breadcrumb route resolver behavior:
   - Input: `breadcrumbContext.podcastGuid` and optional `itemGuid`.
   - Resolve to Podverse IDs via existing API lookup endpoint(s).
   - In-memory cache map for GUID→ID to reduce repeated calls across pagination.
   - Non-blocking rendering: message row renders immediately; links hydrate when resolver completes.
   - On resolver error/miss: breadcrumb label remains plain text (no href).

## Verification

From Podverse repo root:

```bash
./scripts/nix/with-env npm run lint -w apps/web
./scripts/nix/with-env npm run dev:web
```

Manual checks:
- Spinner appears before list load.
- Error message appears on endpoint failure.
- Pagination changes page and scrolls to section top.
- Breadcrumb only shows for subbucket-context messages.
- Breadcrumb links appear only when resolver finds target IDs.
- Breadcrumb labels remain visible as plain text when resolver misses.

## Exit Criteria

- Shared component can be consumed by donate and channel/item surfaces with minimal page-specific wiring.
