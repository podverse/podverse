# 06 - API DTOs and Endpoints

## Goal

Expose metaBoost fields through DTOs and API responses.

## Target Repo

- `/Users/mitcheldowney/repos/pv/podverse`

## Key Files

- `packages/helpers/src/dtos/channel/channelValue.ts`
- `packages/helpers/src/dtos/item/itemValue.ts`
- `apps/api/src/controllers/*`
- `apps/api/src/routes/*`

## Tasks

1. **DTO updates**
   - Add `metaBoost` or `metaBoostSchema`/`metaBoostUrl` fields to value DTOs.
   - Ensure consistent shapes between channel and item values.

2. **API responses**
   - Include metaBoost fields in any endpoints that return value data.
   - Keep backward compatibility for clients without metaBoost support.

3. **Validation**
   - Use helpers-v4v-metadata types and validators where applicable.

## Output

- API payloads include metaBoost data when present.

