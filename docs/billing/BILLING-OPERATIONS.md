# Billing operations

Routes, adapters, and the grant ledger are described in [BILLING.md](BILLING.md).

## Reconcile

`billingReconcileSubscriptions` brings the ledger in line with what the processors report. It
**never charges a payment method**: PayPal, the App Store, and Google Play run every renewal and
charge, and this command only reads their records and applies what the ledger missed.

Each run does three things, and a failure in one step does not stop the others:

1. **Subscriptions near a boundary.** Subscriptions that are `active`, `in_grace_period`,
   `past_due`, or `cancelled_active`, with a period end or grace end within 48 hours of now
   (either side), are fetched from their processor in batches of 200. The processor's view is
   applied the same way a webhook is, and the account's access is recomputed. A subscription the
   processor no longer knows about is logged and skipped. Test-processor subscriptions are
   skipped because their records live only in the process that created them.
2. **Failed webhook inbox rows.** Up to 100 `billing_webhook_event` rows with status `failed`,
   received more than 15 minutes ago, are retried, least recently attempted first. Each row is
   retried at most once per run. A row that keeps failing stays `failed` with its
   `process_error`, and `attempts` counts every try.
3. **Google Play voided purchases.** When Google Play is configured, the last 48 hours of Google's
   voided-purchase list is read and each refund or chargeback revokes the grants of the purchase
   it names. Voids for purchases this server never recorded are skipped. Re-reading the same void
   on a later run is recorded once.

A processor with no credentials in the workers environment is skipped. The job exits non-zero
when a whole step stops early (for example the database or a processor API is unreachable); a
single subscription or inbox row that fails is logged and counted without failing the job.

### Schedule

The Kubernetes CronJob `worker-billing-renewals`
(`infra/k8s/base/cron/worker-billing-renewals.cronjob.yaml`) runs the command every 30 minutes
with `concurrencyPolicy: Forbid`. The workers environment needs the same processor keys as the
API (see [apps/workers/ENV.md](/apps/workers/ENV.md)) for the command to read those processors.

### Run it locally

Build the workers app, then run the command from the **Workers** tab. It reads the processors
configured in `apps/workers/.env`:

```bash
npm run build -w apps/workers
npm run billing_reconcile_subscriptions -w apps/workers
```

The last log line summarizes the run: subscriptions applied, not found, and skipped; inbox rows
recovered and still failing; and Google Play voids applied and skipped.

## Kill switch

Checkout channels decide which processor a platform can offer, per storefront country, and the
minimum client version that platform must run. Management web edits them under **Billing →
Checkout Channels** (`/billing/checkout-channels`); turning `enabled` off is the kill switch, and
it needs no app release.

The API caches the channel list for at most 60 seconds, so a change reaches checkout within a
minute. In development, restart the API to see it immediately.

The same **Billing** section maps processor product ids to a cadence and purchase kind, shows one
account's subscriptions, transactions, grants, and webhook events (linked from the user detail
page) with resync and a manual grant, and lists the webhook inbox with a replay for a stored
event. Resync reads each subscription from its processor, so the management API needs the same
processor credentials as the API and workers. A processor without credentials is reported as
skipped rather than failing the resync.
