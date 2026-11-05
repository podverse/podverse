# v4-to-v5 migration inventory overnight

Unattended pass. One agent. Do not ask the operator questions. If blocked or unsure, append
to `docs/proposals/v4-to-v5-migration/_WAKE-UP.md` and continue with other work in this prompt.

The operator message "Run the v4-to-v5 migration inventory overnight prompt" is the request to
follow this file. Git: **operator-only-git-operations** exception for this pass. Commit and
`git push` (no force) only while `HEAD` is `docs/v4-to-v5-migration-inventory` in the
`podverse_docs_v4_to_v5_migration_inventory` worktree. If `HEAD` is anything else, do not
commit or push; record that in `_WAKE-UP.md` and stop. No pull requests. No other branches.

Do not edit `release-notes/scratchpad.md`.

## Already in the tree

Use these. Do not revert them. Extend them only when the inventory proves a correction.

- Vocabulary: **abcmemory-vocabulary** (`v4 / OGen / Legacy`, `v5 / NextGen`)
- Where to read code and how to treat `V4_DATABASE_URL`: **v4-backend-reference**
- In-place store ids: **mobile-deep-links-and-prod-cutover**, linked to
  [03](/docs/proposals/v4-to-v5-migration/03-store-identity-and-signing.md)

## Do

1. From the v4 worktrees (`~/repos/pv/v4/*` and `~/repos/pv/podverse-rn`), deepen
   [04](/docs/proposals/v4-to-v5-migration/04-v4-data-inventory-and-scope.md),
   [05](/docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md), and
   [06](/docs/proposals/v4-to-v5-migration/06-database-migration-rehearsal.md) with concrete
   entity and column inventories and mapping notes. Schema source is
   `~/repos/pv/v4/podverse-api` entities on `develop` or `master`, not `v5-develop`.
2. Add read-only SQL templates for table counts and null rates into 06. Load
   `V4_DATABASE_URL` from the process environment, or if that is empty from
   `~/.config/podverse/v4-database-url` only (`KEY=value`, `#` comments). If that file is
   missing or still contains `REPLACE_WITH_`, leave the SQL in 06 and write "counts not run"
   in `_WAKE-UP.md`. Do not hunt for another database URL. When the value is real, run
   read-only counts only. Write count-only results to `.artifacts/v4-rehearsal-counts/`
   (gitignored) and a short count summary in `_WAKE-UP.md`. No emails, no raw rows, no
   connection string.
3. Fix the v4 membership export SQL in `docs/billing/BILLING-OPERATIONS.md` so it uses real
   v4 `users` columns (`email`, `membershipExpiration`). Do not use `account_credentials` or
   `account_membership_status` for that export.
4. Leave the billing behavior otherwise unchanged. Do not implement migration workers. Do
   not touch secrets, `.env` files, or dumps.

## Finish

Append a short status to `_WAKE-UP.md`: done, deferred, and what the operator should review.
Then commit the doc and abcmemory changes and push this branch only.

Cross-surface "when unsure, ask" does not apply during this pass. Log the uncertainty and
keep going.
