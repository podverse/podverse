# Subplan 70 - Interop and Verification

## Objective
Ensure ESM compatibility across package boundaries and verify builds and runtime behavior.

## Prereqs

- All subplans 10-60 have been applied.
- Build and dev scripts are updated for ESM output.

## Detailed Steps

1. **Interop and exports validation**
   - Confirm all workspace packages expose ESM entrypoints via `exports`.
   - Eliminate deep imports from `src/` in apps and packages.
2. **Lint and type-check**
   - Run `npm run lint` and fix any ESM-related linting issues.
   - Run `npm run type-check`.
3. **Build validation**
   - Run `npm run build:packages`.
   - Run `npm run build:apps`.
4. **Runtime smoke tests**
   - `npm run dev -w apps/api`
   - `npm run dev -w apps/workers` with at least one command
   - `npm run dev -w apps/web`
5. **Docs and context updates**
   - If config/deps change, update [docs/ARCHITECTURE.md](/Users/mitcheldowney/repos/pv/podverse/docs/ARCHITECTURE.md).
   - Update `.llm/context/` as needed for new ESM rules or conventions.

## Expected Deliverables

- Green lint/type-check/build across packages and apps.
- Verified runtime behavior for core apps.
- Documentation updated for any ESM changes that affect developer workflows.

## Acceptance Criteria

- `npm run lint` and `npm run type-check` succeed without ESM errors.
- All build commands succeed for packages and apps.
- Manual smoke tests confirm runtime behavior for API, workers, and web apps.
