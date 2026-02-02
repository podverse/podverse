# Subplan 40 - API Apps (api and management-api)

## Objective
Convert server-side API apps to ESM and ensure runtime behavior remains stable.

## Primary Areas

- `apps/api`
- `apps/management-api`

## Key Files

- `apps/api/tsconfig.json`
- `apps/management-api/tsconfig.json`
- `apps/api/package.json`
- `apps/management-api/package.json`
- `apps/api/src/index.ts` and/or app entrypoints

## Prereqs

- Confirm ESM output conventions for packages from subplan 20.
- Identify any runtime scripts or CLIs used by the API apps.

## Detailed Steps

1. **TS config alignment**
   - Switch to ESM-compatible module settings.
2. **Entrypoint and runtime**
   - Ensure app start scripts execute ESM outputs without Node flags.
   - Replace any `require()` usage in runtime code.
3. **Interop checks**
   - Confirm API imports from workspace packages use the new ESM entrypoints.
4. **Build and runtime verification**
   - Run `npm run dev -w apps/api` and `npm run dev -w apps/management-api`.
   - Run `npm run build -w apps/api` and `npm run build -w apps/management-api`.

## Expected Deliverables

- API apps compile and run under ESM.
- No CommonJS syntax in app runtime code.

## Acceptance Criteria

- Both API apps start in dev mode without ESM-related runtime errors.
- Production builds succeed for both API apps.
- No CJS-specific runtime shims remain unless explicitly documented.
