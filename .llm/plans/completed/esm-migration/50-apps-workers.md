# Subplan 50 - Workers App

## Objective
Migrate workers to ESM without breaking the validation-first boot sequence or lazy loading.

## Primary Files

- [apps/workers/src/index.ts](/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/index.ts)
- `apps/workers/tsconfig.json`
- `apps/workers/package.json`

## Current Constraint
Workers rely on ordered `require()` calls to avoid static import hoisting. This ensures:

1. Command validation happens first.
2. Env validation runs before config is loaded.
3. Heavy modules are loaded only after validation.

## Prereqs

- Confirm the ESM strategy and output conventions from subplan 10.
- Identify the set of worker commands to use for smoke testing.

## Detailed Steps

1. **Refactor boot sequence into async flow**
   - Convert the bootstrap to an async `main()` function.
   - Replace ordered `require()` with dynamic `await import()` executed after validation.
2. **Preserve load order**
   - Keep command discovery and validation before any config imports.
   - Ensure lazy loading remains per-command (category-based).
3. **ESM-safe replacements**
   - Replace any `require()` and `module.exports` usage in workers app code.
4. **Runtime validation**
   - Run targeted worker commands to ensure validation and configs behave correctly.

## Expected Deliverables

- Workers app runs under ESM with the same validation ordering.
- No CommonJS syntax remains in workers runtime code.

## Acceptance Criteria

- Worker commands execute with validation-first behavior preserved.
- No static imports run before env validation.
- No CJS require calls remain in the workers boot path.
