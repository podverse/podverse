# 02 - helpers-v4v-metadata Package

## Goal

Create a new helpers package that centralizes metaBoost and BoostBox-compatible types and utilities:
`@podverse/helpers-v4v-metadata`.

## Target Repo

- `/Users/mitcheldowney/repos/pv/podverse`

## Package Location

- `packages/helpers-v4v-metadata/`

## Tasks

1. **Create package scaffolding**
   - `package.json`, `tsconfig.json`, `src/index.ts`.
   - ESM format and `"sideEffects": false`.

2. **Define shared types**
   - `MetaBoostSchema` union: `"boostbox"`.
   - `MetaBoost` shape: `{ schema: MetaBoostSchema; url: string; }`.
   - `BoostMetadataRequest` and `BoostMetadataResponse` for BoostBox API.

3. **Add validation helpers**
   - Type guards to validate `MetaBoost`.
   - Avoid `any` and `as`.

4. **Utilities**
   - Build BoostBox-compatible payloads from V4V data.
   - Helpers to normalize schema values and URLs.

5. **Exports**
   - Export types and utilities from `src/index.ts`.

## Output

- New package published in the monorepo and referenced by API/UI/ORM code later.

