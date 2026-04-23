# Plan 01 - FeedFlagStatusReason

## Goal

Add reason metadata support to feed status handling so admin workflows can capture why a feed status was set, especially for takedown cases.

## Clean-Break Rule

- Use one canonical schema and contract for feed status reasons.
- No fallback handling for prior reason representations.

## Target Files

- `infra/database/migrations/*`
- `infra/k8s/base/db/source/0001_init_database.sql` (or follow-up mirrored migration file)
- `packages/orm/src/entities/feed/feed.ts`
- `packages/orm/src/entities/feed/*` (new reason entity if normalized table)
- `packages/orm/src/db/entities.ts`
- `packages/orm/src/index.ts`
- `packages/orm/src/services/feed/feed.ts`
- `apps/workers/src/commands/orm/feed/updateFlagStatus.ts`
- `apps/management-api/src/lib/database/*` (policy/metadata registration for new reason model)

## Steps

1. Implement canonical schema: normalized `feed_flag_status_reason` table with explicit relation from
   `feed`.
2. Add migration(s) and mirrored DB source updates.
3. Implement ORM entities/relations and exports.
4. Extend feed status update service methods to accept reason in canonical shape.
5. Update worker CLI command to pass reason using canonical shape.
6. Register reason model fields in the generic admin API metadata and policy allowlist.

## Acceptance Criteria

- Feed status updates persist reason via canonical schema.
- Reason persists and is retrievable in ORM reads.
- Reason fields are visible/editable in admin API only according to policy.

## Risks

- Exposing reason in public API unintentionally.
- Inconsistent reason semantics across automated vs manual status changes.
