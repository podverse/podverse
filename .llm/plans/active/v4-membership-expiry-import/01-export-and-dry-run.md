# 01 — Export and dry-run

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Goal

Produce a v4 expiry file and dry-run `billingImportLegacyMembershipExpiry` against v5.
No grant writes in this prompt.

## Gate

Ask whether the v4 to v5 account migration is underway and v5 already has the migrated
emails. If the answer is no, stop. Do not offer the export steps.

Confirm `billingImportLegacyMembershipExpiry` exists under `apps/workers`. If it does
not, stop.

## Export (operator, read-only)

The file holds email addresses. Save it outside the repo. Do not commit it.

v4 columns: `account_credentials.email` joined to
`account_membership_status.membership_expires_at` on `account_id`. Drop null emails and
null expirations. Format the timestamp as ISO-8601 UTC.

```sql
SELECT c.email,
  to_char(
    s.membership_expires_at AT TIME ZONE 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS"Z"'
  ) AS membership_expires_at
FROM account_credentials AS c
INNER JOIN account_membership_status AS s ON s.account_id = c.account_id
WHERE c.email IS NOT NULL
  AND s.membership_expires_at IS NOT NULL
ORDER BY c.email;
```

`psql` `\copy` writes the file on the client. Use a real absolute path.

```bash
psql "$V4_DATABASE_URL" <<'SQL'
\copy (
  SELECT c.email,
    to_char(
      s.membership_expires_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    ) AS membership_expires_at
  FROM account_credentials AS c
  INNER JOIN account_membership_status AS s ON s.account_id = c.account_id
  WHERE c.email IS NOT NULL
    AND s.membership_expires_at IS NOT NULL
  ORDER BY c.email
) TO '/absolute/path/outside/the/repo/v4-membership-expiry.csv' WITH (FORMAT csv, HEADER true)
SQL
```

Explain those steps, ask for the absolute path, and stop the turn. Do not persist the
path. The operator's reply continues this prompt.

On `skip`, give the dry-run command with a placeholder path and stop. Do not invent a
file.

## After the path arrives

- Check the file exists and the header is `email,membership_expires_at` (extra columns
  are ignored; JSON lines are allowed when the first non-empty line starts with `{`).
- Report the row count only. Do not print emails. Do not open the report into chat.
- Give the dry-run command below. Do not run it.

The same rules as
[v4 membership carryover](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover):
case-insensitive email, skip past and null expirations, skip unknown and ambiguous
emails, upsert the later `ends_at`, leave a revoked `legacy_import` grant revoked.

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
