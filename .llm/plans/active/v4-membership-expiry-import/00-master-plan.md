# v4 membership expiry import

Parked. Do not start until the operator says the v4 to v5 account migration is underway
and v5 already has those emails.

This set loads membership expiry only. It is not the migration of feeds, items,
playlists, clips, queues, or any other v4 table.

## Goal

Load future v4 membership expirations into v5 as `legacy_import` grants. The command
`billingImportLegacyMembershipExpiry` already ships with membership payments. This set
runs it. It does not rebuild it.

## Start only when all of these are true

- The operator has explicitly started this set.
- v5 `account_credentials` already holds the emails from v4. This set does not create
  accounts. An email with no v5 account is reported and skipped.
- `billingImportLegacyMembershipExpiry` is present under `apps/workers`. If it is
  missing, stop. Do not reimplement it here.

## What a run does

- Reads `email,membership_expires_at` from a file saved outside the repo.
- Matches email case-insensitively to one existing v5 account.
- Creates or raises a `legacy_import` grant to the later end, then recomputes
  `membership_expires_at`.
- Skips a null or past expiry, an unknown email, and an email that matches more than one
  account.
- Leaves a revoked `legacy_import` grant revoked.

## Non-goals

- Do not import PayPal, Apple, or Google purchase rows.
- Do not create processor records.
- Do not email anyone.
- Do not persist the export path.
- Do not print emails from the file or the report.

## Order

1. [01-export-and-dry-run.md](./01-export-and-dry-run.md)
2. [02-apply-import.md](./02-apply-import.md), only after the operator accepts the dry-run
   report

Column names, flags, and the worker command are in
[v4 membership carryover](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover).
