# Migration 02: API Joi Refactor

## Scope

Use shared query param constants in API validation, move Joi schemas inline within controller
methods, and reduce repetition with small Joi helper(s).

## Files to Update

- `apps/api/src/lib/validation/index.ts`
- `apps/api/src/controllers/itemSoundbite.ts`
- `apps/api/src/controllers/playlist/playlistResource.ts`
- `apps/api/src/controllers/item.ts`
- `apps/api/src/controllers/channel.ts`
- `apps/api/src/controllers/playlist/playlist.ts`
- `apps/api/src/controllers/clip.ts`

## Steps

1. Replace hardcoded `Joi.valid(...)` arrays with shared constants from helpers-requests.
2. Move controller Joi validation definitions inline inside their handler functions.
3. Add a small helper in validation utilities to reduce repeated Joi patterns.
4. Update controller imports to use the new shared constants and helper.

## Constraints

- Keep validation logic close to the controller method it applies to.
- Do not change validation behavior unless explicitly needed to match shared constants.

## Verification

- All query param validation uses shared constants, no hardcoded arrays remain.
- Joi schemas are defined inside controller methods.
- Validation behavior remains the same for existing query params.
