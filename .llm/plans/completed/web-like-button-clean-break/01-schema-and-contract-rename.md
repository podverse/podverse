# Plan 01 - Schema And Contract Rename To Likes

## Goal

Rename favorites terminology to likes across foundational schema and core contracts so the system uses one canonical naming model.

## Target Files

- `infra/database/migrations/0004_playlist.sql`
- `infra/k8s/base/db/source/0001_init_database.sql`
- `packages/orm/src/entities/playlist/playlist.ts`
- `packages/orm/src/services/playlist/playlist.ts`
- `packages/helpers/src/dtos/playlist/playlist.ts`
- `apps/api/src/controllers/playlist/playlist.ts`
- `apps/api/src/routes/playlist.ts`
- `packages/helpers-requests/src/api/playlist/playlist.ts`
- `packages/helpers-requests/src/api/_request.ts`

## Steps

1. Rename `is_default_favorites` to `is_default_likes` in create-table SQL and associated unique index names.
2. Rename ORM entity field and all read/write/select usage to `is_default_likes`.
3. Rename favorites DTOs/helpers to likes naming (including index-generator naming).
4. Rename favorites endpoint path and corresponding API/controller/helper request naming to likes.
5. Update all references in web/api code to compile against likes naming only.

## Acceptance Criteria

- No active-code references to `is_default_favorites` remain.
- Default-likes playlist uniqueness remains one per account per medium.
- API and request helpers expose likes naming consistently.
- TypeScript build passes for renamed DTO/service signatures.
