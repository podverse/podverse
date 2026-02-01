# Migration 02G: API Account Core Controller

## Overview

Refactor `account.ts` to use shared Joi schemas and inline non-reusable schemas.

## Scope

**Files to modify:**

- `apps/api/src/controllers/account/account.ts`

## Replace with shared imports

- `sendVerificationEmailSchema` → `emailBodySchema`
- `sendResetPasswordEmailSchema` → `emailBodySchema`
- `verifyEmailSchema` → `tokenBodySchema`
- `verifyEmailChangeSchema` → `tokenBodySchema`
- `getManyPublicRecentSchema` → `pageQuerySchema`
- `getManyPublicTopSchema` → `pageRangeQuerySchema`
- `getManySubscribedAZSchema` → `pageQuerySchema`
- `getManySubscribedRecentSchema` → `pageQuerySchema`
- `getManySubscribedTopSchema` → `pageRangeQuerySchema`

## Inline-only schemas

- `resetPasswordSchema` (token + password)
- `getByIdTextSchema` (id_text)
- `createAccountSchema`
- `updateAccountSchema`
- `sendEmailChangeVerificationSchema` (new_email)

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controller compiles without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
