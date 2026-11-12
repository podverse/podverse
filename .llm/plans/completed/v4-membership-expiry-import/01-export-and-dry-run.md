# 01 — Export and dry-run

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Goal

Build a paid-expiry file and dry-run `billingImportLegacyMembershipExpiry`
against the local v5 database. No grant writes in this prompt.

## Gate

Ask whether the local v5 accounts this file should match already exist. For
the rehearsal, that is the one seeded account. If the answer is no, stop.
Do not offer the export. Do not point the dry-run at alpha.

Confirm `billingImportLegacyMembershipExpiry` exists under `apps/workers`. If it
does not, stop.

## Export (operator, read-only)

The file holds email addresses. Save it outside the repo. Do not commit it.
Build it in this sitting. An older file is not reused.

Start from the `users` export in
[v4 membership carryover](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover).
v4 stores the address on `users.email` and the expiry on
`users.membershipExpiration`. Drop null emails and null expirations.

Before the file is written, replace the timestamp for each account that has
an `appStorePurchase` with `purchase_date_ms` on 2023-12-27 through
2024-01-31 and a paid expiry more than five years ahead. That timestamp is
five years after the moment the file is built. Every other future expiry
stays as stored. On the 2026-10-30 snapshot the replaced set is 297 accounts.
If a count of that set is not 297, stop and report the count. Do not print
emails.

The operator command is fish-safe. The heredoc in the billing doc is not.
Replace the placeholder path. From the **Root** tab:

```bash
psql "$V4_DATABASE_URL" -c "COPY (SELECT email, to_char(\"membershipExpiration\", 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS membership_expires_at FROM users WHERE email IS NOT NULL AND \"membershipExpiration\" IS NOT NULL ORDER BY email) TO STDOUT WITH (FORMAT csv, HEADER true)" > /absolute/path/outside/the/repo/v4-membership-expiry.csv
```

That command is the base export. The capped timestamps are applied to that
file in the same sitting, before the dry-run. Explain the cap, ask for the
absolute path, and stop the turn. Do not persist the path. The operator's
reply continues this prompt.

On `skip`, give the dry-run command with a placeholder path and stop. Do not
invent a file.

## After the path arrives

- Check the file exists and the header is `email,membership_expires_at` (extra columns
  are ignored; JSON lines are allowed when the first non-empty line starts with `{`).
- Report the row count only. Do not print emails. Do not open the report into chat.
- Give the dry-run command below. Do not run it.

The same rules as
[v4 membership carryover](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover):
case-insensitive email, skip past and null expirations, skip unknown and ambiguous
emails, upsert the later `ends_at`, leave a revoked `legacy_import` grant revoked.
A full file against the local database matches only the seeded accounts. The
rest are unmatched. That is the expected rehearsal result.

## Operator commands

**Root** — build first, if workers have not been built since the importer landed:

```bash
npm run build -w apps/workers
```

**Workers** — dry-run. Pass absolute paths. This writes nothing.

```bash
npm run billing_import_legacy_membership_expiry -w apps/workers -- \
  --file /absolute/path/v4-membership-expiry.csv \
  --dry-run \
  --report /absolute/path/v4-membership-expiry-report.csv
```

The operator reads the report locally. Bring counts back (created, updated, unchanged,
skipped, unmatched, ambiguous, invalid). Do not paste emails into chat.

## Done when

- The dry-run command has been handed to the operator, or the gate stopped the set.
- No grants were written by the agent.
- This file is archived. 02 stays unstarted until the operator accepts the report.
