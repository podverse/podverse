# Migration 01: Helpers Query Param Deduping

## Scope

Consolidate identical query param arrays and types into generic shared definitions in helpers.

## Files to Update

- `packages/helpers-requests/src/api/queryParams.ts`
- `packages/helpers/src/lib/medium.ts`

## Steps

1. Inventory all query param arrays and types in `queryParams.ts`.
2. Group arrays with identical values and create shared base arrays with `as const`.
3. Replace duplicate arrays with references to the shared base arrays.
4. Rename types to generic names when value sets are identical.
5. Ensure all types derive from the `as const` arrays for consistent inference.
6. Check `medium.ts` for overlap and align with shared definitions if applicable.

## Constraints

- Keep clarity: generic names only when value sets are identical.
- Do not introduce `any` types.
- Maintain existing exports unless a rename is clearly beneficial and consistent.

## Verification

- All identical query param value sets share a single base array.
- Type definitions are derived from shared arrays.
- No controller or web references broken by the helpers changes.
