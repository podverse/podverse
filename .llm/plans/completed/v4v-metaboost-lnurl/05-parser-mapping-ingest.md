# 05 - Parser Mapping and Ingest

## Goal

Map partytime `metaBoost` output into podverse ingest and persist to DB.

## Target Repo

- `/Users/mitcheldowney/repos/pv/podverse`

## Key Files

- `packages/parser-mapping/src/compat/partytime/value.ts`

## Tasks

1. **Extend mapping**
   - Read `metaBoost` from partytime output.
   - Validate schema = `"boostbox"` before mapping.

2. **Persist values**
   - Include `metaBoostSchema` and `metaBoostUrl` in mapped channel/item values.
   - Ensure metaBoost data flows into ORM create/update paths.

## Output

- metaBoost data is stored when parsing feeds with `<podcast:metaBoost>`.

