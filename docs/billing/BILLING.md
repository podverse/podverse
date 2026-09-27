# Billing

Premium membership is sold through payment processors: PayPal on web (and F-Droid builds), the
App Store on iOS, and Google Play on Android. The processor charges the buyer. Podverse records
what the processor reports in a grant ledger, and the account's `membership_expires_at` is
recomputed from that ledger.

Processor sandbox setup:

- [BILLING-PAYPAL-SANDBOX.md](BILLING-PAYPAL-SANDBOX.md)
- [BILLING-APPLE-SANDBOX.md](BILLING-APPLE-SANDBOX.md)
- [BILLING-GOOGLE-PLAY-SANDBOX.md](BILLING-GOOGLE-PLAY-SANDBOX.md)

## How a purchase is recorded

Every processor has an adapter (`PaymentProcessorAdapter` in `@podverse/helpers`) that turns a
webhook delivery, a store transaction, or a subscription record into normalized billing events.
`BillingEventProcessor` in `@podverse/billing` applies each event to the account's ledger once:

- A redelivered webhook, or a purchase reported by both the client and a webhook, is recorded
  once. The second report answers `duplicate`.
- Events can arrive out of order. An event older than the subscription's last status change does
  not move the status back, so a late expiry cannot cancel a renewal that already happened.
- One-time purchases stack on paid time the account already holds. Subscription charges cover
  their own period.
- A refund or revoke removes the grant it paid for.
- Sandbox events count only outside production, or for accounts listed in
  `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`.

## Routes

All routes are under `/api/v2/billing`. The API reference is `apps/api/openapi.yml` (tag
`billing`). Error bodies carry a `code` from `BILLING_API_ERROR_CODES`, and the same value is the
`i18nKey` clients translate.

| Method | Path                         | Auth     | Purpose                                                           |
| ------ | ---------------------------- | -------- | ----------------------------------------------------------------- |
| GET    | `/checkout-options`          | Optional | Processors and products offered for `platform` (and `storefront`) |
| GET    | `/status`                    | Required | The account's membership and subscription standing                |
| POST   | `/paypal/orders`             | Required | Create a PayPal order for a one-time product                      |
| POST   | `/paypal/orders/:id/capture` | Required | Capture an approved order and record the payment                  |
| POST   | `/paypal/subscriptions`      | Required | Create a PayPal auto-renew subscription                           |
| POST   | `/subscriptions/:id/cancel`  | Required | Turn off auto-renew, or send the user to the store                |
| POST   | `/apple/transactions`        | Required | Record an App Store transaction                                   |
| POST   | `/google/purchases`          | Required | Verify a Play purchase, record it, then acknowledge it            |
| POST   | `/restore`                   | Required | Re-record store purchases the device still holds                  |
| POST   | `/webhooks/paypal`           | None     | PayPal webhook deliveries                                         |
| POST   | `/webhooks/apple`            | None     | App Store Server Notifications V2                                 |
| POST   | `/webhooks/google`           | None     | Real-time developer notifications (Pub/Sub push)                  |
| POST   | `/test/simulate`             | Required | Apply a test-processor event (non-production only)                |

### Checkout options

`GET /checkout-options` lists a processor only when its `billing_checkout_channel` row for that
platform is enabled and the processor is configured on this server. Channel rows are cached for
up to 60 seconds, so a channel turned off in the database stops being offered within a minute.

### Client version floor

A channel's `min_client_version` cuts off an app build with a purchase bug without a server
release. Store and PayPal purchase posts from mobile send `X-Podverse-Client-Platform` and
`X-Podverse-Client-Version`. When the installed version is below the floor, the route answers
**426** with `code` `billing.client_update_required` and the `min_client_version`. Web ships
with the API and has no floor.

### PayPal subscriptions start after paid time

When the account still has paid time, `POST /paypal/subscriptions` sets the PayPal
`start_time` to the current `membership_expires_at`. The first charge lands when that time runs
out instead of overlapping it. An account with a subscription that already renews gets **409**
`billing.subscription_already_active`.

### Cancel

`POST /subscriptions/:id/cancel` answers `cancelled` for PayPal, where the server turns off
auto-renew and access continues to the end of the paid period. App Store and Play
subscriptions answer `manage_in_store`: the client opens the store's subscription settings, and
the store's notification updates the status.

## Webhooks

Processors sign the exact bytes they send, so these paths receive the raw body. The raw parser
in `apps/api/src/app.ts` is mounted on `/api/v2/billing/webhooks` ahead of the JSON parsers:

- `/api/v2/billing/webhooks/paypal`
- `/api/v2/billing/webhooks/apple`
- `/api/v2/billing/webhooks/google`

Responses:

| Status | Meaning                                                               |
| ------ | --------------------------------------------------------------------- |
| 200    | Delivery accepted, including duplicates and events the ledger ignored |
| 400    | Signature or payload verification failed                              |
| 404    | That processor is not configured on this server                       |
| 500    | Unexpected error; the processor retries                               |

Webhooks are rate limited per client IP and processor (`BILLING_WEBHOOK_MAX_PER_MINUTE`).
Purchase, cancel, and restore posts are rate limited per account
(`BILLING_PURCHASE_MAX_PER_10_MINUTES`).

## Configuration

Each processor is off until its keys are set. Setting any key of a processor makes all of its
required keys mandatory at startup. The API reads them in `apps/api/.env.example` order (see
[apps/api/ENV.md](/apps/api/ENV.md)):

| Processor   | Keys                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------- |
| PayPal      | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, optional `PAYPAL_ENVIRONMENT` |
| App Store   | `APPLE_*`                                                                                      |
| Google Play | `GOOGLE_PLAY_*`                                                                                |

`registerBillingAdapters` registers the configured processors once at startup, in both the API
and workers (workers only for commands in the Billing category).

### Test processor

The `test` processor exists for local development and automated tests. It is registered only
when `NODE_ENV` is not `production`, or when `BILLING_ALLOW_TEST_ADAPTER="true"` on a staging
deployment that runs with production settings. Otherwise `POST /test/simulate` answers **403**
`billing.test_adapter_unavailable`. The simulated event always applies to the signed-in account.

## Workers reconcile, they do not charge

Every charge happens at the processor. Worker jobs never charge a card. They compare the ledger
with the processor's own records and apply what the ledger missed, such as a renewal whose
webhook never arrived.
