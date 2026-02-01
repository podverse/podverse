# Migration 03: Web App Updates

## Scope

Align web app imports and validation with the new shared query param constants and types.

## Files to Update

- `apps/web/src/app/podcasts/page.tsx`
- `apps/web/src/app/tracks/page.tsx`
- `apps/web/src/app/profiles/page.tsx`
- `apps/web/src/app/queues/page.tsx`

## Steps

1. Update imports to use the new generic shared constants/types.
2. Update Zod schemas or usages to align with the shared arrays.
3. Ensure any renamed exports are reflected in these files.

## Constraints

- Do not change runtime behavior; only align types and constants.
- Keep Zod validation logic equivalent to the current behavior.

## Verification

- Web pages compile with updated imports.
- Zod schemas still accept the same query param values.
