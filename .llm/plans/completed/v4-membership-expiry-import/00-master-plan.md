# v4 membership expiry import

The paid-expiry command already ships. This set runs it. It does not rebuild it.
The account copy sets the tier and writes a carried trial. This set does not.

## Goal

Load future paid v4 expiries into v5 as `legacy_import` grants, after those
accounts already exist. The command is `billingImportLegacyMembershipExpiry`.

## Locked decisions

- The command reads `email` and `membership_expires_at` only. It writes the
  grant and the expiry. It does not change `account_membership.tier`.
- v4 columns are `users.email` and `users.membershipExpiration`. There is no
  `account_credentials` table in v4. The export in
  [v4 membership carryover](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover)
  is the base query.
- Build that file in the same sitting as the dry-run, and again in the same
  sitting as the apply. A file from an earlier day is stale for the cap below.
- An account with an `appStorePurchase` whose `purchase_date_ms` falls on
  2023-12-27 through 2024-01-31, and whose paid expiry is more than five years
  ahead, is written into that file as five years after the moment the file is
  built. The purchase row is not imported. Every other future paid expiry is
  written as stored. On the 2026-10-30 snapshot that cap is 297 accounts.
  154 already end within five years and stay as stored.
- The account copy sets Premium when the paid expiry is still in the future.
  It writes a `trial` grant, and sets Trial, only when `freeTrialExpiration`
  is still in the future, ends within 90 days, and the paid expiry is null or
  already past. A trial more than 90 days ahead is not imported. A past trial
  grants nothing. No second signup trial.
- The rehearsal account keeps the stored paid expiry. Its trial timestamp is
  null, and none of its App Store rows fall in the window, so the cap does
  not apply. The account copy sets Premium. This command does not.

## Start only when all of these are true

- The v5 database this file targets already has the accounts to match. This
  set does not create accounts. An email with no v5 account is skipped.
- The target is the local database for the rehearsal. Do not point the file
  at alpha.
- `billingImportLegacyMembershipExpiry` is present under `apps/workers`. If it
  is missing, stop. Do not reimplement it here.

## What a run does

- Reads the file from outside the repo.
- Matches email case-insensitively to one existing v5 account.
- Creates or raises a `legacy_import` grant to the later end, then recomputes
  `membership_expires_at`.
- Skips a null or past expiry, an unknown email, and an email that matches
  more than one account.
- Leaves a revoked `legacy_import` grant revoked.

## Non-goals

- Do not import PayPal, Apple, or Google purchase rows.
- Do not create processor records.
- Do not write a `trial` grant from this command.
- Do not set Premium or Trial from this command.
- Do not email anyone.
- Do not persist the export path.
- Do not print emails from the file or the report.

## Order

1. [01-export-and-dry-run.md](./01-export-and-dry-run.md)
2. [02-apply-import.md](./02-apply-import.md), only after the operator accepts the dry-run
   report

Column names, flags, and the worker command are in
[v4 membership carryover](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover).
The tier and trial rules are in
[07](/docs/proposals/v4-to-v5-migration/07-account-and-data-migration-model.md#membership-on-the-copied-account).
