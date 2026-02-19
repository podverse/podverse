# 04 - ORM Schema and Migrations

## Goal

Persist metaBoost schema + URL alongside existing value rows.

## Target Repo

- `/Users/mitcheldowney/repos/pv/podverse`

## Key Files

- `packages/orm/src/entities/channel/channelValue.ts`
- `packages/orm/src/entities/item/itemValue.ts`
- `infra/database/main/migrations/`

## Tasks

1. **Entity fields**
   - Add `metaBoostSchema?: string` and `metaBoostUrl?: string` to channel/item value entities.
   - Keep nullable to preserve existing rows.

2. **Migrations**
   - Create migration adding the two columns to both tables.
   - Ensure down migration removes columns.

3. **ORM services**
   - Update create/update calls to accept metaBoost fields where needed.

## Output

- DB schema updated to store metaBoost data for channels and items.

