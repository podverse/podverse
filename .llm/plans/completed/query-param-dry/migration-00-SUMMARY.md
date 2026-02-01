# Query Param DRY Refactor - Summary

Created: 2026-01-31

## Goal

Deduplicate query param arrays and types across the monorepo, and streamline API controller
validation with shared constants and inline Joi schemas, while preserving clarity.

## Primary File Inventory (Initial)

Helpers and shared types:

- `packages/helpers-requests/src/api/queryParams.ts`
- `packages/helpers/src/lib/medium.ts`

API controllers and validation helpers:

- `apps/api/src/lib/validation/index.ts`
- `apps/api/src/controllers/itemSoundbite.ts`
- `apps/api/src/controllers/playlist/playlistResource.ts`
- `apps/api/src/controllers/item.ts`
- `apps/api/src/controllers/channel.ts`
- `apps/api/src/controllers/playlist/playlist.ts`
- `apps/api/src/controllers/clip.ts`

Web app pages (Zod usage):

- `apps/web/src/app/podcasts/page.tsx`
- `apps/web/src/app/tracks/page.tsx`
- `apps/web/src/app/profiles/page.tsx`
- `apps/web/src/app/queues/page.tsx`

## Additional Scope (Repo-Wide)

The refactor should include any other packages or apps that reference query param arrays or
types. The inventory step should find and add these files before implementation.

## Expected Duplication Targets

- Repeated sort value arrays in `queryParams.ts`
- Hardcoded Joi `valid(...)` arrays in controllers
- Overlapping query param types that can be derived from a shared base array

## Output Artifacts

- Shared generic arrays/types for identical value sets
- Controller validation moved inline and using shared helpers/constants
- Web app imports aligned with the new shared definitions
