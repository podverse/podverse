# Migration 02K: API Misc Service Controllers

## Overview

Refactor service-style controllers to inline unique schemas and use shared helpers when applicable.

## Scope

**Files to modify:**

- `apps/api/src/controllers/mq/mq.ts`
- `apps/api/src/controllers/membershipClaimToken.ts`
- `apps/api/src/controllers/liveItem.ts`
- `apps/api/src/controllers/feed.ts`
- `apps/api/src/controllers/externalServices/podcastIndex.ts`
- `apps/api/src/controllers/category.ts`

## Replace with shared imports

- `claimSchema` → `tokenBodySchema`

## Inline-only schemas

- `addToOnDemandMQSchema`
- `getManyLiveSchema`
- `getFeedByPodcastIndexIdSchema`
- `podcastIndexFeedParamsSchema`
- `podcastIndexSearchPodcastsQuerySchema`
- `getCategorySchema`

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
