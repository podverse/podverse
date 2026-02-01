# Migration 02H: API Account Devices + Settings

## Overview

Refactor account device and settings controllers to use shared Joi schemas and inline others.

## Scope

**Files to modify:**

- `apps/api/src/controllers/account/accountFCMDevice.ts`
- `apps/api/src/controllers/account/accountUPDevice.ts`
- `apps/api/src/controllers/account/accountWebPushDevice.ts`
- `apps/api/src/controllers/account/accountSettings/accountSettingsLocale.ts`
- `apps/api/src/controllers/account/accountSettings/accountSettingsNotificationType.ts`

## Replace with shared imports

- `updateLocaleForAccountSchema` → `localeBodySchema`
- `updateAccountSettingsLocaleSchema` → `localeBodySchema`

## Inline-only schemas

- `createAccountFCMDeviceSchema`
- `updateAccountFCMDeviceSchema`
- `deleteAccountFCMDeviceSchema`
- `createAccountUPDeviceSchema`
- `updateAccountUPDeviceSchema`
- `createAccountWebPushDeviceSchema`
- `updateAccountWebPushDeviceSchema`
- `deleteAccountWebPushDeviceSchema`
- `createAccountSettingsNotificationTypeSchema`
- `deleteAccountSettingsNotificationTypeSchema`

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
