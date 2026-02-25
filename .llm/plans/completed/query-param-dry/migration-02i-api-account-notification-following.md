# Migration 02I: API Account Notifications + Following

## Overview

Refactor account notification and following controllers to use shared Joi schemas and inline others.

## Scope

**Files to modify:**

- `apps/api/src/controllers/account/accountNotificationChannelType.ts`
- `apps/api/src/controllers/account/accountNotificationChannel.ts`
- `apps/api/src/controllers/account/accountFollowingPlaylist.ts`
- `apps/api/src/controllers/account/accountFollowingChannel.ts`
- `apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts`
- `apps/api/src/controllers/account/accountFollowingAccount.ts`

## Replace with shared imports

- `createNotificationChannelSchema` → `channelIdTextParamSchema`
- `deleteNotificationChannelSchema` → `channelIdTextParamSchema`
- `getByAccountAndChannelSchema` → `channelIdTextParamSchema`
- `followPlaylistSchema` → `playlistIdTextParamSchema`
- `getFollowedPlaylistsSchema` → `accountIdTextParamSchema`
- `followChannelSchema` → `channelIdTextParamSchema`
- `getFollowedChannelsSchema` → `accountIdTextParamSchema`
- `getFollowedAddByRSSChannelsSchema` → `accountIdTextParamSchema`
- `getFollowedAccountsSchema` → `accountIdTextParamSchema`

## Inline-only schemas

- `createNotificationChannelTypeSchema`
- `deleteNotificationChannelTypeSchema`
- `getFollowedChannelsQuerySchema` (medium + page pattern)
- `addRSSChannelSchema`
- `removeRSSChannelSchema`
- `followAccountSchema`

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
