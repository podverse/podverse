# 07 — Tests and removal cutover

## Goal

Prove parity, remove old status structures, and finalize a future-focused codebase without
status-table references.

This step executes against the finalized fixture matrix in `07b-parity-fixture-matrix.md`.

## Files to update

- Relevant test files in:
  - [packages/orm/src/](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/)
  - [packages/parser/src/](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/)
  - [apps/management-api/src/](/Users/mitcheldowney/repos/pv/podverse/apps/management-api/src/)
  - [apps/management-web/e2e/](/Users/mitcheldowney/repos/pv/podverse/apps/management-web/e2e/)
  - [apps/web/](/Users/mitcheldowney/repos/pv/podverse/apps/web/)
- DB schema/migration cleanup files under
  [infra/k8s/base/ops/source/database/linear-migrations/app/](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/ops/source/database/linear-migrations/app/)

## Work items

- Add or update tests for:
  - multi-condition coexistence behavior
  - parser allow/block behavior from policy/lifecycle
  - archiver lifecycle transitions
  - management feed operations contract behavior
  - blocked/takedown web/i18n behavior
- Ensure each scenario from `07b-parity-fixture-matrix.md` is mapped to at least one automated test.
- Add removal migration that drops:
  - `feed.feed_flag_status_id`
  - `feed.feed_flag_status_reason_id`
  - `feed.feed_flag_status_reason_note`
  - `feed_flag_status`
  - `feed_flag_status_reason`
- Remove status-table-related permissions and UI browse metadata if still present.

## Verification commands

```bash
./scripts/nix/with-env npm run lint -w @podverse/orm
./scripts/nix/with-env npm run test -w @podverse/orm
./scripts/nix/with-env npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/podcast-index-feed.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/feed-operations-flag-status.spec.ts
```

## Completion criteria

- All targeted tests pass with status tables removed.
- Runtime code and docs use future-focused condition/lifecycle terminology only.
- Parity fixtures from `07b` are fully covered and passing.
