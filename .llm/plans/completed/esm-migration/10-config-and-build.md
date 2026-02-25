# Subplan 10 - Config and Build Alignment

## Objective
Align workspace-level configuration and TypeScript build settings to produce ESM outputs
consistently across packages and apps.

## Primary Files

- [package.json](/Users/mitcheldowney/repos/pv/podverse/package.json)
- [tsconfig.base.json](/Users/mitcheldowney/repos/pv/podverse/tsconfig.base.json)
- `packages/*/tsconfig.json`
- `apps/*/tsconfig.json`
- `tools/*/tsconfig.json`

## Decisions to Make Up Front

1. **ESM boundary strategy**
   - Option A: add `"type": "module"` to each package/app and keep root without `"type"`.
   - Option B: add `"type": "module"` at root and use `.cjs` for remaining CJS files.
2. **Output extension strategy**
   - Keep `.js` output with `"type": "module"` OR
   - Use `.mjs` outputs and update `"main"`/`"exports"` fields.

## Prereqs

- Confirm Node 24 runtime for all apps and scripts.
- Decide whether to keep root `package.json` as CJS or switch to ESM.

## Detailed Steps

1. **Inventory and classify** all workspace `package.json` files for ESM settings
   (type, main, exports, bin).
2. **Normalize TS module settings**
   - Switch package/app `tsconfig.json` from `CommonJS` to `NodeNext`/`ESNext` as needed.
   - Keep root `tsconfig.base.json` as NodeNext (already set).
3. **Define output conventions**
   - Establish a consistent policy for `main`, `types`, and `exports` across all workspace
     packages.
   - Decide whether `exports` will include `types`, `import`, and `default` for each package.
4. **Update build scripts** where needed
   - Ensure `tsc` produces ESM outputs with correct paths.
   - Ensure `tsc-alias` still resolves path aliases in ESM builds.
5. **Identify runtime entrypoints**
   - Confirm how apps are started in `apps/*/package.json` scripts and whether Node needs
     flags (should not on Node 24 with ESM).
6. **Add file extension policy**
   - Decide on `.js` in source with `"type": "module"` or `.mts`/`.cts` conversions.
   - Document the chosen approach in the plan notes for all subplans.

## Deliverables

- Clear, documented ESM strategy (type field location and extension policy).
- Updated tsconfig settings for packages/apps/tools aligned with ESM.
- Consistent package.json entrypoint/exports definitions.

## Acceptance Criteria

- All workspace `tsconfig.json` files align with the selected ESM strategy.
- All workspace `package.json` files reflect consistent ESM entrypoint conventions.
- No app or package requires Node flags to execute compiled output.

## Notes

- Root currently has no `"type"` field, so default is CJS. See
  [package.json](/Users/mitcheldowney/repos/pv/podverse/package.json).
- Base TS config already uses NodeNext; packages/apps currently override to CommonJS.
