# 05 — Management feed-operations contract migration

## Goal

Replace status-ID-based management feed operations with condition/lifecycle/policy contracts while
preserving operator capabilities and audit history.

This step implements runtime and UI migration against the finalized contract from
`05b-management-api-contract-lock.md`.

## Files to update

- [apps/management-api/src/lib/feed/feedFlagStatusAppDb.ts](/Users/mitcheldowney/repos/pv/podverse/apps/management-api/src/lib/feed/feedFlagStatusAppDb.ts)
- [apps/management-api/src/routes/feedFlagStatus.ts](/Users/mitcheldowney/repos/pv/podverse/apps/management-api/src/routes/feedFlagStatus.ts)
- [apps/management-api/src/routes/feedFlagStatus.integration.test.ts](/Users/mitcheldowney/repos/pv/podverse/apps/management-api/src/routes/feedFlagStatus.integration.test.ts)
- [apps/management-web/src/lib/requests/feedFlagStatus.ts](/Users/mitcheldowney/repos/pv/podverse/apps/management-web/src/lib/requests/feedFlagStatus.ts)
- [apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx](/Users/mitcheldowney/repos/pv/podverse/apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx)

## Work items

- Rename endpoint and payload contract to future-focused semantics (for example: feed operations
  policy/lifecycle update).
- Replace option lists from status/reason tables with:
  - condition type options
  - lifecycle state options
  - policy override fields where needed.
- Keep audit log snapshots before/after updates.
- Ensure operations remain expressible for:
  - spam/takedown/manual block behavior
  - pending archive and archive workflows
  - override fields such as spam threshold and max response bytes.

## Parity checks

- Operators can still perform all existing moderation and workflow actions.
- All validation rules remain explicit and strict.
- Audit logs remain complete and readable.

## Completion criteria

- Management API/database browser no longer requires status tables for feed operations.
- Management web UI no longer renders status IDs as source-of-truth controls.
- Contract implementation matches `05b` definitions with no undocumented request/response fields.
