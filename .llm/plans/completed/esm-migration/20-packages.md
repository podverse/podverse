# Subplan 20 - Packages Migration

## Objective
Convert all workspace packages to ESM output and update package boundaries for stable
ESM consumption.

## Primary Areas

- `packages/helpers`
- `packages/helpers-*`
- `packages/external-services`
- `packages/orm`
- `packages/notifications`
- `packages/parser`
- `packages/mq`

## Key Files and References

- [packages/helpers-validation/package.json](/Users/mitcheldowney/repos/pv/podverse/packages/helpers-validation/package.json)
- [packages/helpers-validation/client.js](/Users/mitcheldowney/repos/pv/podverse/packages/helpers-validation/client.js)
- `packages/*/tsconfig.json`
- `packages/*/package.json`

## Prereqs

- Agree on the global ESM strategy from subplan 10.
- Identify any packages used by external consumers that might need dual export support.

## Detailed Steps

1. **Package.json updates**
   - Add `"type": "module"` (or apply root-level strategy).
   - Standardize `main`, `types`, and `exports` for each package.
   - Remove or replace any CommonJS wrapper files.
2. **TS config updates**
   - Ensure each package compiles to ESM (NodeNext/ESNext).
3. **Code conversion**
   - Replace `require()` / `module.exports` with `import` / `export`.
   - Fix any `__dirname`/`__filename` usage with `import.meta.url` utilities.
4. **Exports map hardening**
   - Add `exports` for each package to prevent deep imports.
   - Include subpath exports if currently relied upon by apps.
5. **Build verification**
   - Confirm build order remains valid (`helpers` first, then other helpers, then remaining packages).
   - Run package builds to validate ESM output.

## Special Case: helpers-validation

- Replace or remove the CJS `client.js` wrapper.
- Update `exports` to provide ESM-compatible entrypoints for the client subpath.

## Expected Deliverables

- All packages build with ESM output.
- Consistent exports and entrypoint metadata across packages.
- No remaining CommonJS module syntax in package source.

## Acceptance Criteria

- `npm run build:packages` succeeds after ESM conversions.
- All workspace package imports resolve without deep `src/` paths.
- No remaining CJS wrapper files unless explicitly required and documented.
