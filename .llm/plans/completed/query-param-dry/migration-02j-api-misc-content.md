# Migration 02J: API Misc Content Controllers

## Overview

Refactor smaller content controllers to use shared Joi schemas and inline others.

## Scope

**Files to modify:**

- `apps/api/src/controllers/profileContent.ts`
- `apps/api/src/controllers/publisherFeed.ts`
- `apps/api/src/controllers/podroll.ts`
- `apps/api/src/controllers/itemTranscript.ts`
- `apps/api/src/controllers/itemChapter.ts`

## Replace with shared imports

- `getByAccountIdTextSchema` → `accountIdTextParamSchema`
- `getPaginatedSchema` → `pageQuerySchema`
- `getPublisherFeedRemoteItemsForChannelSchema` → `idOrIdTextParamSchema`
- `getPodrollForChannelSchema` → `idOrIdTextParamSchema`
- `getByIdOrIdTextSchema` → `itemIdTextParamSchema`

## Inline-only schemas

- `itemChapterByIdTextSchema` (unique id name)

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
