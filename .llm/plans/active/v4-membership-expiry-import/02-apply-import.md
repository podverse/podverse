# 02 — Apply the import

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Goal

Write `legacy_import` grants from the file already dry-run in 01.

## Gate

Start only after the operator accepts the 01 dry-run report. If they have not, stop and
point them back at 01.

Use the same absolute file path from 01. If it was not kept in the conversation, ask for
it again and stop the turn. Do not persist it.

Confirm the command is still `billingImportLegacyMembershipExpiry`. If it is missing,
stop.

## Apply

Give the operator the write command. Do not run it. Do not print emails.

The command is the 01 dry-run without `--dry-run`. Keep `--report` so skipped and
unmatched rows are listed on disk. Emails stay in that file, not in logs and not in chat.

A second run is safe: it raises `ends_at` only when the file has a later expiry, and it
does not restore a revoked `legacy_import` grant.

Do not create accounts for unmatched rows. Do not import payment tables. Do not email
users.

## Operator commands

**Workers** — writes grants, then recomputes each touched account. Absolute paths.

```bash
npm run billing_import_legacy_membership_expiry -w apps/workers -- \
  --file /absolute/path/v4-membership-expiry.csv \
  --report /absolute/path/v4-membership-expiry-report.csv
```

After it finishes, the operator checks one known account in v5:
`membership_expires_at` equals the later of the exported expiry and any grant that was
already there. Revoked imports stay revoked.

## Done when

- The write command has been handed to the operator and they have run it, or they have
  said to stop.
- Counts are recorded in the reply (no emails).
- This file and the rest of `v4-membership-expiry-import` are archived under
  `.llm/plans/completed/v4-membership-expiry-import/`.
