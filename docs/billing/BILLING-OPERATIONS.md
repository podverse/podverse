# Billing operations

Routes, adapters, and the grant ledger are described in [BILLING.md](BILLING.md).

## Reconcile

`billingReconcile` brings the ledger in line with deliveries the server missed. It **never
charges a payment method**. PayPal, the App Store, and Google Play take the payment, and this
command only retries stored rows and applies Google Play voids.

Each run does two things, and a failure in one step does not stop the other:

1. **Failed webhook inbox rows.** Up to 100 `billing_webhook_event` rows with status `failed`,
   received more than 15 minutes ago, are retried, least recently attempted first. Each row is
   retried at most once per run. A row that keeps failing stays `failed` with its
   `process_error`, and `attempts` counts every try.
2. **Google Play voided purchases.** When Google Play is configured, the last 48 hours of Google's
   voided-purchase list is read and each refund or chargeback revokes the grants of the purchase
   it names. Voids for purchases this server never recorded are skipped. Re-reading the same void
   on a later run is recorded once.

The job exits non-zero when a whole step stops early (for example the database or a processor
API is unreachable). A single inbox row or void that fails is logged and counted without failing
the job.

### Schedule

The Kubernetes CronJob `worker-billing-reconcile`
(`infra/k8s/base/cron/worker-billing-reconcile.cronjob.yaml`) runs the command every 30 minutes
with `concurrencyPolicy: Forbid`. The workers environment needs the same processor keys as the
API (see [apps/workers/ENV.md](/apps/workers/ENV.md)) for the command to read those processors.

### Run it locally

Build the workers app, then run the command from the **Workers** tab. It reads the processors
configured in `apps/workers/.env`:

```bash
npm run build -w apps/workers
npm run billing_reconcile -w apps/workers
```

The last log line summarizes the run: inbox rows recovered and still failing, and Google Play
voids applied and skipped.

### Webhook replay

The management **Billing** section lists the webhook inbox. Replay on a stored row runs that
payload through the same processor again. A refund or revocation that the first delivery missed
lands as `refund_or_revoke` and removes the grant for that transaction.

## Kill switch

Checkout channels decide which processor a platform can offer, per storefront country, and the
minimum client version that platform must run. Management web edits them under **Billing →
Checkout Channels** (`/billing/checkout-channels`); turning `enabled` off is the kill switch, and
it needs no app release.

The API caches the channel list for at most 60 seconds, so a change reaches checkout within a
minute. In development, restart the API to see it immediately.

The same **Billing** section maps processor product ids to a cadence, shows one account's
transactions, grants, and webhook events (linked from the user detail page) with resync and
[manual membership management](#manual-membership-management), and lists the webhook inbox with
a replay for a stored event. Resync refetches recorded purchases, so the management API needs
the same processor credentials as the API and workers. A purchase whose processor is not
configured on this server is left uncounted.

## Enabling a processor

PayPal, Apple In-App Purchase, and Google Play each stay off until that flag is `"true"`:

| Flag                          | Processor             |
| ----------------------------- | --------------------- |
| `BILLING_PAYPAL_ENABLED`      | PayPal                |
| `BILLING_APPLE_IAP_ENABLED`   | Apple In-App Purchase |
| `BILLING_GOOGLE_PLAY_ENABLED` | Google Play           |

Empty or unset means off. `true` and `false` are case-insensitive. Any other value fails startup
validation. With the flag on, every credential key that processor needs is required. With the
flag off, credentials may be set and startup still passes; the processor is not registered.

The API, workers, and management API read the same three flags. They must match, the same way
their credentials already match. `make local_env_setup` copies each flag from its home override
(`paypal.env`, `billing-apple.env`, `billing-google-play.env`) into all three. It copies
`PAYPAL_CLIENT_ID` to the web sidecar as `NEXT_PUBLIC_PAYPAL_CLIENT_ID` only while
`BILLING_PAYPAL_ENABLED` is `true`. Otherwise that sidecar key is cleared.

Checkout channels are the sales kill switch. A flag is the deployment capability: credentials,
webhooks, and reconcile. An enabled channel offers nothing while its processor's flag is off.

Leave a processor's flag on while recorded purchases still need refund webhooks. Turning the
flag off makes those webhooks answer 404. To stop new sales, disable its checkout channels
instead.

With every flag off, the deployment sells nothing. Extend memberships from each user's Billing
page. See [Manual membership management](#manual-membership-management).

## Resync one account

On the user's **Billing** page in management web (`/users/<id>/billing`), **Resync** calls
`POST /api/v2/billing/accounts/<accountId>/resync`. That retries the account's failed inbox rows
and refetches each recorded purchase from its processor. The response counts `retried`,
`refetched`, and `failed`.

## Manual membership management

On that same Billing page, **Extend by** is shown when the admin's `billing_account` permission
includes create. A gift stacks on time the account already holds. There is no gate that blocks
a gift because the account already has paid time.

| Mode           | What it sends                                     |
| -------------- | ------------------------------------------------- |
| Plan Length    | `{ "cadence": "monthly" }` or `"annual"`          |
| Number of Days | `{ "days": N }` for a whole number from 1 to 3660 |
| Until Date     | `{ "ends_at": "<ISO-8601>" }` in the future       |

`POST /api/v2/billing/accounts/<accountId>/grants` writes an `admin` grant and recomputes
`membership_expires_at`. It does not set the expiry column by itself. When the ledger already
holds that time, the response is `applied: false`. An end that is not later than current
access answers 422: "Use End Access to shorten a membership."

Remediation notes live at `/billing/help` (gifting, Apple refunds, resync, wrong account).

An optional note, at most 500 characters, is stored on the management audit log for the
extend, the end, and the revoke. It is not stored on the grant.

**End Access** needs the `billing_account` delete bit. **Set End Date** and **End Access Now**
both confirm, then call `POST .../membership-end` with `ends_at`. That cuts or revokes
admin-editable grants at that time and recomputes. Admin-editable grants are `admin`, `trial`,
`legacy_import`, and `migration_baseline` rows with no transaction or claim token. A date later
than current access answers 422: "Use Extend to lengthen a membership."

**Revoke** on a grant row with `admin_editable: true` uses the same delete bit.
`POST .../grants/<grantId>/revoke` removes that grant's remaining time and recomputes.

Processor-paid grants (`one_time_purchase`) and `claim_token` grants cannot be removed from the
portal. End or revoke that would cut that access answers 409 and changes nothing. Refund or
revoke that purchase with the processor; the webhook, a replay, or reconcile applies
`refund_or_revoke`. When paid access still runs past the requested end, the message is "Paid
access continues past the requested end. Cancel or refund it with the processor." and the body
includes `access_ends_at`. Revoking the protected grant itself answers "This grant was paid
through a processor or claim token and cannot be changed here."

| `billing_account` bit | Allows                |
| --------------------- | --------------------- |
| read                  | The Billing page      |
| update                | Resync                |
| create                | Extend                |
| delete                | End access and revoke |

An account whose cached expiry has no grant is repaired the first time an admin or a processor
writes to it: that uncovered time becomes a `migration_baseline` grant. No separate command is
required. `make local_db_reset` gives a clean local database when you want one.

The v4 expiry import is [v4 membership carryover](#v4-membership-carryover).

## v4 membership carryover

`billingImportLegacyMembershipExpiry` copies expiry from the previous Podverse app into
`legacy_import` grants. It reads email and `membership_expires_at` only. It does not import
payment transactions or email anyone.

Run it only after v5 already has the migrated accounts, with the same emails. Until that
account migration is underway, leave the v4 database alone. The steps below are the runbook
for that later pass.

Export those two columns from the v4 database (read-only). Join `account_credentials.email`
to `account_membership_status.membership_expires_at`, drop null expirations, and format the
timestamp as ISO-8601 UTC. Save the file outside this repo. It contains email addresses.

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

CSV shape (JSON lines with the same two fields are also accepted, one object per line):

```text
email,membership_expires_at
user@example.com,2027-01-15T00:00:00.000Z
```

`YYYY-MM-DD` is read as UTC midnight. Any other timestamp is invalid and reported.

- Email match is case-insensitive.
- A missing account, or more than one account for that email, is listed in the report and
  skipped. The command does not create accounts.
- A null expiry, or an expiry already in the past, is skipped.
- A second run keeps the later `ends_at` when a `legacy_import` grant already exists.
- A revoked `legacy_import` grant stays revoked. The import does not add a second grant for
  that account.
- Each create or update recomputes that account. The new grant starts at import time and ends
  at the exported expiry.

The log line is counts only. Emails are written only to the optional report. The workers npm
script uses `apps/workers` as its working directory, so pass an absolute path. `--help` prints
the input format. The command needs Base and ORM env only, not payment processor keys.

Build workers, then run from the **Workers** tab. `--dry-run` prints counts and writes nothing.

```bash
npm run build -w apps/workers
npm run billing_import_legacy_membership_expiry -w apps/workers -- \
  --file /absolute/path/v4-membership-expiry.csv \
  --dry-run \
  --report /absolute/path/v4-membership-expiry-report.csv
```

## Related

- [BILLING.md](BILLING.md)
- [LOCAL-ENV-OVERRIDES.md](/docs/development/env/LOCAL-ENV-OVERRIDES.md)
