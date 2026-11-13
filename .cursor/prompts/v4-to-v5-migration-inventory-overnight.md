# v4-to-v5 migration inventory overnight

This pass is finished. Do not run it again. New work follows
[v4-to-v5-migration-guided.md](v4-to-v5-migration-guided.md): one chunk, then stop
and ask. Do not use this file as a license to commit or push.

Later v4-to-v5 work stays in the working tree. Do not `git commit` or `git push` unless the
operator's current message explicitly asks for that command. The old exception in
**operator-only-git-operations** is closed.

The steps below are the finished pass. Do not repeat them. If someone opens this
file anyway, stop and follow the guided prompt instead of working unattended.

The operator message "Run the v4-to-v5 migration inventory overnight prompt" is the request to
follow this file. It is not a request to commit or push. No pull requests. No other branches.

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
Do not commit or push. Leave the working tree for the operator.

That unattended rule no longer applies. Later work asks the operator and waits.
