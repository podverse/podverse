# Migration 02: API Joi Refactor (Inline + Shared Helpers)

> **Status**: This plan has been split into smaller subplans to stay under complexity limits.
> Use the files below for execution.

## Subplans

- `migration-02a-api-shared-schemas.md`
- `migration-02b-api-channel-item.md`
- `migration-02c-api-clip-playlist.md`
- `migration-02d-api-playlist-resources.md`
- `migration-02e-api-item-soundbite-queue.md`
- `migration-02f-api-queue-resources.md`
- `migration-02g-api-account-core.md`
- `migration-02h-api-account-devices-settings.md`
- `migration-02i-api-account-notification-following.md`
- `migration-02j-api-misc-content.md`
- `migration-02k-api-misc-services.md`
- `migration-02l-api-stats-controllers.md`

## Overview

Apply the new Joi validation rule:

- **Reusable schemas** should live in a shared helper and be imported.
- **Non-reusable schemas** should be defined inline inside the controller method middleware.

This migration changes **where schemas live** across controllers, not just which constants they
use.

## Scope

- **Controllers scanned:** all files under `apps/api/src/controllers/**`
- **Schemas found:** ~150 (params, query, and body)
- **Duplicates:** many repeated shapes (id_text, pagination, medium+page, etc.)
- **Goal:** centralize shared schemas in a global helper and move everything else inline

## New Shared Helper Location

Create a new file for reusable Joi schemas:

- `apps/api/src/lib/validation/querySchemas.ts`

Export shared Joi schemas here and re-export from
`apps/api/src/lib/validation/index.ts` for consistent imports.

## Shared Schema Catalog

Create and export these schemas in `querySchemas.ts`.

### ID Param Schemas

These are reused across multiple controllers.

- `idOrIdTextParamSchema`
  - `{ idOrIdText: Joi.string().required() }`
- `playlistIdTextParamSchema`
  - `{ playlist_id_text: Joi.string().required() }`
- `queueIdTextParamSchema`
  - `{ queue_id_text: Joi.string().required() }`
- `channelIdTextParamSchema`
  - `{ channel_id_text: Joi.string().required() }`
- `itemIdTextParamSchema`
  - `{ item_id_text: Joi.string().required() }`
- `clipIdTextParamSchema`
  - `{ clip_id_text: Joi.string().required() }`
- `itemSoundbiteIdTextParamSchema`
  - `{ item_soundbite_id_text: Joi.string().required() }`
- `accountIdTextParamSchema`
  - `{ account_id_text: Joi.string().required() }`

### Query Pagination Schemas

These are reused across many controllers.

- `pageQuerySchema`
  - `{ page: Joi.number().integer().min(1).required() }`
- `pageDefaultQuerySchema`
  - `{ page: Joi.number().integer().min(1).default(1) }`
- `pageRangeQuerySchema`
  - `{ page: Joi.number().integer().min(1).required(), range: Joi.string()
.valid(...QUERY_PARAMS_STATS_RANGE_VALUES).required() }`

### Medium + Page Schemas

Used across item/channel/clip/playlist controllers.

- `mediumPageQuerySchema`
  - `{ medium: Joi.string().valid(...QUERY_PARAMS_MEDIUMS).required(),
  page: Joi.number().integer().min(1).required() }`
- `mediumPageRangeQuerySchema`
  - `{ medium: Joi.string().valid(...QUERY_PARAMS_MEDIUMS).required(),
  page: Joi.number().integer().min(1).required(),
  range: Joi.string().valid(...QUERY_PARAMS_STATS_RANGE_VALUES).required() }`
- `mediumCategoryPageQuerySchema`
  - `{ medium: Joi.string().valid(...QUERY_PARAMS_MEDIUMS).required(),
  category: Joi.string().valid(...CATEGORY_MAPPING_KEYS).required(),
  page: Joi.number().integer().min(1).required() }`
- `mediumCategoryPageRangeQuerySchema`
  - `{ medium: Joi.string().valid(...QUERY_PARAMS_MEDIUMS).required(),
  category: Joi.string().valid(...CATEGORY_MAPPING_KEYS).required(),
  page: Joi.number().integer().min(1).required(),
  range: Joi.string().valid(...QUERY_PARAMS_STATS_RANGE_VALUES).required() }`

### Queue / Playlist Position Schemas

Shared across multiple queue and playlist resource controllers.

- `positionBetweenBodySchema`
  - `{ position1: Joi.number().min(0).required(),
  position2: Joi.number().min(Joi.ref('position1')).required() }`

### Locale / Token / Email Schemas

Shared across account-related controllers.

- `localeBodySchema`
  - `{ locale: Joi.string().required() }`
- `tokenBodySchema`
  - `{ token: Joi.string().required() }`
- `emailBodySchema`
  - `{ email: Joi.string().email().required() }`

## Inline-Only Rule

Any schema **not** in the shared catalog above should be defined inline inside the controller
method, directly in the middleware call:

```typescript
static async someHandler(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    foo: Joi.string().required(),
    bar: Joi.number().optional(),
  });
  validateQueryObject(schema, req, res, async () => {
    // handler logic
  });
}
```

## Controller-by-Controller Changes

For each controller, apply two actions:

1. **Replace top-level schemas** with shared helper imports when reusable.
2. **Inline the rest** inside the method middleware.

### `apps/api/src/controllers/channel.ts`

Reusable schemas:

- `getByIdOrIdTextSchema` → `idOrIdTextParamSchema`
- `getManyGlobalRecentSchema` → `mediumPageQuerySchema`
- `getManyGlobalTopSchema` → `mediumPageRangeQuerySchema`
- `getManyCategoryRecentSchema` → `mediumCategoryPageQuerySchema`
- `getManyCategoryTopSchema` → `mediumCategoryPageRangeQuerySchema`
- `getManySubscribedAZSchema` → `mediumPageQuerySchema`
- `getManySubscribedRecentSchema` → `mediumPageQuerySchema`
- `getManySubscribedTopSchema` → `mediumPageRangeQuerySchema`

Inline-only schemas:

- `getByPodcastIndexIdSchema` (unique to this controller)

### `apps/api/src/controllers/item.ts`

Reusable schemas:

- `getByIdOrIdTextSchema` → `idOrIdTextParamSchema`
- `getManyGlobalRecentSchema` → `mediumPageQuerySchema` plus inline `liveItemType`
- `getManyGlobalTopSchema` → `mediumPageRangeQuerySchema` plus inline `liveItemType`
- `getManyCategoryRecentSchema` → `mediumCategoryPageQuerySchema` plus inline `liveItemType`
- `getManyCategoryTopSchema` → `mediumCategoryPageRangeQuerySchema` plus inline `liveItemType`
- `getManySubscribedRecentSchema` → `mediumPageQuerySchema` plus inline `liveItemType`
- `getManySubscribedTopSchema` → `mediumPageRangeQuerySchema` plus inline `liveItemType`
- `getManyByChannelQuerySchemaRecent` → `pageQuerySchema`
- `getManyByChannelQuerySchemaOldest` → `pageQuerySchema`
- `getManyByChannelBySeasonQuerySchema` → `pageQuerySchema`
- `getManyByChannelTopQuerySchema` → `pageRangeQuerySchema`
- `getManyForQueueByPubDateQuerySchema` → inline, but use
  `QUERY_PARAMS_DIRECTION_VALUES`
- `getManyForQueueBySeasonQuerySchema` → inline, but use
  `QUERY_PARAMS_DIRECTION_VALUES`
- `parseAndGetChaptersSchema` → `itemIdTextParamSchema`

Inline-only schemas:

- `getManyByChannelParmsSchema` (channelIdOrIdText field)
- `getManyByChannelShuffleQuerySchema` (page + shuffleHash)
- `getManyForQueueByPubDateParamsSchema` (idText key)
- `getManyForQueueBySeasonParamsSchema` (idText key)

### `apps/api/src/controllers/clip.ts`

Reusable schemas:

- `clipIdSchema` → `clipIdTextParamSchema`
- `getByChannelIdTextSchema` → `channelIdTextParamSchema`
- `getByItemIdTextSchema` → `itemIdTextParamSchema`
- `getClipsPublicManyRecentSchema` → `mediumPageQuerySchema`
- `getClipsPublicManyOldestSchema` → `mediumPageQuerySchema`
- `getClipsPublicTopSchema` → `mediumPageRangeQuerySchema`
- `getClipsPublicManyCategoryRecentSchema` → `mediumCategoryPageQuerySchema`
- `getClipsPublicManyCategoryOldestSchema` → `mediumCategoryPageQuerySchema`
- `getClipsPublicManyCategoryTopSchema` → `mediumCategoryPageRangeQuerySchema`
- `getClipsPublicByChannelRecentSchema` → `pageQuerySchema`
- `getClipsPublicByChannelOldestSchema` → `pageQuerySchema`
- `getClipsPublicByChannelTopSchema` → `pageRangeQuerySchema`
- `getClipsPublicByItemRecentSchema` → `pageQuerySchema`
- `getClipsPublicByItemOldestSchema` → `pageQuerySchema`
- `getClipsPublicByItemTopSchema` → `pageRangeQuerySchema`
- `getManySubscribedRecentSchema` → `mediumPageQuerySchema`
- `getManySubscribedTopSchema` → `mediumPageRangeQuerySchema`

Inline-only schemas:

- `clipCreateSchema` and `clipUpdateSchema` (domain-specific)

### `apps/api/src/controllers/playlist/playlist.ts`

Reusable schemas:

- `playlistIdSchema` → `playlistIdTextParamSchema`
- `getManyPublicTopSchema` → `mediumPageRangeQuerySchema`
- `getManyPrivateRecentSchema` → `mediumPageQuerySchema`
- `getManyPrivateOldestSchema` → `mediumPageQuerySchema`
- `getManyPrivateAZSchema` → `mediumPageQuerySchema`
- `getManyPrivateTopSchema` → `mediumPageRangeQuerySchema`
- `getManyPrivateFollowedTopSchema` → `mediumPageRangeQuerySchema`
- `getManyPrivateFollowedRecentSchema` → `mediumPageQuerySchema`
- `getManyPrivateFollowedOldestSchema` → `mediumPageQuerySchema`
- `getManyPrivateFollowedAZSchema` → `mediumPageQuerySchema`

Inline-only schemas:

- `createPlaylistSchema` and `updatePlaylistSchema`

### `apps/api/src/controllers/playlist/playlistResource.ts`

Reusable schemas:

- `playlistIdSchema` → `playlistIdTextParamSchema`
- `getManyForQueueByListPositionParamsSchema` → `playlistIdTextParamSchema`
- `getManyByPlaylistShuffleParamsSchema` → `playlistIdTextParamSchema`
- `getManyByPlaylistShuffleQuerySchema` → inline, but use `pageDefaultQuerySchema`

Inline-only schemas:

- `getManyForQueueByListPositionQuerySchema` (direction + id_text options)

### `apps/api/src/controllers/itemSoundbite.ts`

Reusable schemas:

- `itemSoundbiteIdTextSchema` → `itemSoundbiteIdTextParamSchema`
- `getByChannelIdTextSchema` → `channelIdTextParamSchema`
- `getByItemIdTextSchema` → `itemIdTextParamSchema`

Inline-only schemas:

- `getItemSoundbitesByChannelIdTextSchema` (page + sort)
- `getItemSoundbitesByItemIdTextSchema` (page + sort)

### `apps/api/src/controllers/queue/queue.ts`

Reusable schemas:

- `queueIdTextParamsSchema` → `queueIdTextParamSchema`

Inline-only schemas:

- `updateIsActiveQueueSchema` (unique to this controller)

### `apps/api/src/controllers/queue/queueResource.ts`

Reusable schemas:

- `queueIdSchema` → `queueIdTextParamSchema`

### `apps/api/src/controllers/queue/queueResourceItem.ts`

Reusable schemas:

- `queueAndItemIdSchema` → combine `queueIdTextParamSchema` + `itemIdTextParamSchema`
  as inline Joi schema or new shared helper if reused elsewhere
- `addItemToQueueBetweenSchema` → `positionBetweenBodySchema`

Inline-only schemas:

- `queueResourceNowPlayingSchema` (already exported and specific)

### `apps/api/src/controllers/queue/queueResourceClip.ts`

Reusable schemas:

- `queueAndClipIdSchema` → combine `queueIdTextParamSchema` + `clipIdTextParamSchema`
- `addClipToQueueBetweenSchema` → `positionBetweenBodySchema`

### `apps/api/src/controllers/queue/queueResourceItemSoundbite.ts`

Reusable schemas:

- `queueAndSoundbiteIdSchema` → combine `queueIdTextParamSchema` +
  `itemSoundbiteIdTextParamSchema`
- `addItemSoundbiteToQueueBetweenSchema` → `positionBetweenBodySchema`

### `apps/api/src/controllers/queue/queueResourceItemAddByRSS.ts`

Reusable schemas:

- `queueIdSchema` → `queueIdTextParamSchema`
- `addItemToQueueBetweenSchema` → inline with `positionBetweenBodySchema` plus
  `add_by_rss_resource_data`

Inline-only schemas:

- `addItemToQueueSchema` (add_by_rss_resource_data only)
- `queueAndRSSHashIdSchema` (queue + add_by_rss_hash_id)

### `apps/api/src/controllers/playlist/playlistResourceItem.ts`

Reusable schemas:

- `playlistAndItemIdSchema` → combine `playlistIdTextParamSchema` + `itemIdTextParamSchema`
- `addItemToPlaylistBetweenSchema` → `positionBetweenBodySchema`

### `apps/api/src/controllers/playlist/playlistResourceClip.ts`

Reusable schemas:

- `playlistAndClipIdSchema` → combine `playlistIdTextParamSchema` + `clipIdTextParamSchema`
- `addClipToPlaylistBetweenSchema` → `positionBetweenBodySchema`

### `apps/api/src/controllers/playlist/playlistResourceItemSoundbite.ts`

Reusable schemas:

- `playlistAndSoundbiteIdSchema` → combine `playlistIdTextParamSchema` +
  `itemSoundbiteIdTextParamSchema`
- `addItemSoundbiteToPlaylistBetweenSchema` → `positionBetweenBodySchema`

### `apps/api/src/controllers/playlist/playlistResourceItemAddByRSS.ts`

Reusable schemas:

- `playlistIdSchema` → `playlistIdTextParamSchema`
- `addItemToPlaylistBetweenSchema` → inline with `positionBetweenBodySchema` plus
  `add_by_rss_resource_data`

Inline-only schemas:

- `addItemToPlaylistSchema` (add_by_rss_resource_data only)
- `playlistAndRSSHashIdSchema` (playlist + add_by_rss_hash_id)

### `apps/api/src/controllers/profileContent.ts`

Reusable schemas:

- `getByAccountIdTextSchema` → `accountIdTextParamSchema`
- `getPaginatedSchema` → `pageQuerySchema`

### `apps/api/src/controllers/publisherFeed.ts`

Reusable schemas:

- `getPublisherFeedRemoteItemsForChannelSchema` → `idOrIdTextParamSchema`

### `apps/api/src/controllers/podroll.ts`

Reusable schemas:

- `getPodrollForChannelSchema` → `idOrIdTextParamSchema`

### `apps/api/src/controllers/itemTranscript.ts`

Reusable schemas:

- `getByIdOrIdTextSchema` → `itemIdTextParamSchema`

### `apps/api/src/controllers/itemChapter.ts`

Reusable schemas:

- `itemChapterByIdTextSchema` → inline (unique id name)

### `apps/api/src/controllers/mq/mq.ts`

Inline-only schemas:

- `addToOnDemandMQSchema` (unique to this controller)

### `apps/api/src/controllers/membershipClaimToken.ts`

Reusable schemas:

- `claimSchema` → `tokenBodySchema`

### `apps/api/src/controllers/liveItem.ts`

Inline-only schemas:

- `getManyLiveSchema` (simple but unique)

### `apps/api/src/controllers/feed.ts`

Inline-only schemas:

- `getFeedByPodcastIndexIdSchema` (unique)

### `apps/api/src/controllers/externalServices/podcastIndex.ts`

Inline-only schemas:

- `podcastIndexFeedParamsSchema`
- `podcastIndexSearchPodcastsQuerySchema`

### `apps/api/src/controllers/account/account.ts`

Reusable schemas:

- `sendVerificationEmailSchema` → `emailBodySchema`
- `sendResetPasswordEmailSchema` → `emailBodySchema`
- `verifyEmailSchema` → `tokenBodySchema`
- `verifyEmailChangeSchema` → `tokenBodySchema`
- `resetPasswordSchema` → inline (token + password)
- `getByIdTextSchema` → inline (id_text)
- `getManyPublicRecentSchema` → `pageQuerySchema`
- `getManyPublicTopSchema` → `pageRangeQuerySchema`
- `getManySubscribedAZSchema` → `pageQuerySchema`
- `getManySubscribedRecentSchema` → `pageQuerySchema`
- `getManySubscribedTopSchema` → `pageRangeQuerySchema`

Inline-only schemas:

- `createAccountSchema`, `updateAccountSchema`
- `sendEmailChangeVerificationSchema` (new_email)

### `apps/api/src/controllers/account/accountFCMDevice.ts`

Reusable schemas:

- `updateLocaleForAccountSchema` → `localeBodySchema`

Inline-only schemas:

- `createAccountFCMDeviceSchema`
- `updateAccountFCMDeviceSchema`
- `deleteAccountFCMDeviceSchema`

### `apps/api/src/controllers/account/accountUPDevice.ts`

Reusable schemas:

- `updateLocaleForAccountSchema` → `localeBodySchema`

Inline-only schemas:

- `createAccountUPDeviceSchema`
- `updateAccountUPDeviceSchema`

### `apps/api/src/controllers/account/accountWebPushDevice.ts`

Reusable schemas:

- `updateLocaleForAccountSchema` → `localeBodySchema`

Inline-only schemas:

- `createAccountWebPushDeviceSchema`
- `updateAccountWebPushDeviceSchema`
- `deleteAccountWebPushDeviceSchema`

### `apps/api/src/controllers/account/accountSettings/accountSettingsLocale.ts`

Reusable schemas:

- `updateAccountSettingsLocaleSchema` → `localeBodySchema`

### `apps/api/src/controllers/account/accountSettings/accountSettingsNotificationType.ts`

Inline-only schemas:

- `createAccountSettingsNotificationTypeSchema`
- `deleteAccountSettingsNotificationTypeSchema`

### `apps/api/src/controllers/account/accountNotificationChannelType.ts`

Inline-only schemas:

- `createNotificationChannelTypeSchema`
- `deleteNotificationChannelTypeSchema`

### `apps/api/src/controllers/account/accountNotificationChannel.ts`

Reusable schemas:

- `createNotificationChannelSchema` → `channelIdTextParamSchema`
- `deleteNotificationChannelSchema` → `channelIdTextParamSchema`
- `getByAccountAndChannelSchema` → `channelIdTextParamSchema`

### `apps/api/src/controllers/account/accountFollowingPlaylist.ts`

Reusable schemas:

- `followPlaylistSchema` → `playlistIdTextParamSchema`
- `getFollowedPlaylistsSchema` → `accountIdTextParamSchema`

### `apps/api/src/controllers/account/accountFollowingChannel.ts`

Reusable schemas:

- `followChannelSchema` → `channelIdTextParamSchema`
- `getFollowedChannelsSchema` → `accountIdTextParamSchema`

Inline-only schemas:

- `getFollowedChannelsQuerySchema` (medium + page pattern, consider `mediumPageQuerySchema`)

### `apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts`

Reusable schemas:

- `getFollowedAddByRSSChannelsSchema` → `accountIdTextParamSchema`

Inline-only schemas:

- `addRSSChannelSchema`
- `removeRSSChannelSchema`

### `apps/api/src/controllers/account/accountFollowingAccount.ts`

Reusable schemas:

- `getFollowedAccountsSchema` → `accountIdTextParamSchema`

Inline-only schemas:

- `followAccountSchema`

### `apps/api/src/controllers/category.ts`

Inline-only schemas:

- `getCategorySchema`

### `apps/api/src/controllers/stats/*`

Inline-only schemas:

- `createStatsTrackEvent*Schema` (playlist, item, clip, channel, account)

## Imports and Re-exports

Update `apps/api/src/lib/validation/index.ts` to export the new shared schemas:

- `export * from './querySchemas'`

Update controllers to import shared schemas from:

- `@api/lib/validation`

## Verification Checklist

- [ ] All reusable schemas moved to `querySchemas.ts`
- [ ] All other schemas defined inline within their methods
- [ ] No top-level schema constants remain in controllers unless exported as shared helpers
- [ ] Controllers compile without TypeScript errors
- [ ] `npm run build:packages` succeeds
- [ ] `npm run lint` passes for apps/api
- [ ] Validation behavior unchanged

## Testing Strategy

1. Build packages: `npm run build:packages`
2. API build: `cd apps/api && npm run build`
3. Type check: `cd apps/api && npx tsc --noEmit`
4. Manual spot tests on representative endpoints:
   - Channel and Item `getByIdOrIdText` endpoints
   - Pagination + medium endpoints (channel/item/clip)
   - Queue and playlist resource endpoints (positionBetween)
   - Account locale and token endpoints

## Dependencies

- Migration 01 must be complete first (shared query param constants)
- Migration 03 can proceed after this migration completes
