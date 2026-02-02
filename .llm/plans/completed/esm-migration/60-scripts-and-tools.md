# Subplan 60 - Scripts and Tools

## Objective
Convert standalone scripts and tooling configs to ESM, or isolate remaining CJS usage with
`.cjs` where necessary.

## Primary Areas

- `scripts/*`
- `tools/*`
- root config files (`eslint.config.mjs` already ESM)

## Known CJS Patterns

- Standalone scripts using `require()`:
  - `scripts/management/create-superuser.js`
  - `scripts/dev/local-utils/generate-password-hash.js`
- Shell script using `node -p "require('./package.json').version"`:
  - `scripts/publish/bump-version.sh`

## Prereqs

- Confirm ESM boundary strategy and file extension policy from subplan 10.
- Identify any scripts invoked by CI or production workflows.

## Detailed Steps

1. **Convert JS scripts to ESM**
   - Rename `.js` to `.mjs` or add `type: module` in their package scope.
   - Replace `require()` with `import`.
2. **Update shell-based Node calls**
   - Replace `node -p "require(...)"` with ESM-compatible `node -e` or a small ESM script.
3. **Tooling configs**
   - Verify all tool configs use ESM exports or are renamed to `.cjs` if they must remain CJS.
4. **Validation**
   - Run key scripts to ensure CLI behavior matches prior output.

## Expected Deliverables

- All scripts and tools are ESM-compatible or isolated as `.cjs`.
- No CommonJS runtime errors when executing scripts.

## Acceptance Criteria

- All scripts in `scripts/*` execute without CJS errors on Node 24.
- Any remaining CJS configs are explicitly named `.cjs` and documented.
