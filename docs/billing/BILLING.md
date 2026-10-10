# Billing

Premium membership is a one-time month or a one-time year. PayPal sells it on web (and F-Droid
builds), the App Store sells a non-renewing purchase on iOS, and Google Play sells a prepaid base
plan on Android. Each purchase adds a grant. Grants stack. The account's `membership_expires_at`
is recomputed from that ledger.

Processor sandbox setup and operations:

- [BILLING-PAYPAL-SANDBOX.md](BILLING-PAYPAL-SANDBOX.md)
- [BILLING-PAYPAL-SANDBOX-CHECKOUT.md](BILLING-PAYPAL-SANDBOX-CHECKOUT.md)
- [BILLING-APPLE-SANDBOX.md](BILLING-APPLE-SANDBOX.md)
- [BILLING-GOOGLE-PLAY-SANDBOX.md](BILLING-GOOGLE-PLAY-SANDBOX.md)
- [BILLING-GOOGLE-PLAY-DEVICE.md](BILLING-GOOGLE-PLAY-DEVICE.md)
- [BILLING-OPERATIONS.md](BILLING-OPERATIONS.md)

## How a purchase is recorded

Every processor has an adapter (`PaymentProcessorAdapter` in `@podverse/helpers`) that turns a
webhook delivery or a store transaction into normalized billing events. Adapters emit
`payment_settled` and `refund_or_revoke` only. `BillingEventProcessor` in `@podverse/billing`
applies each event to the account's ledger once:

- A redelivered webhook, or a purchase reported by both the client and a webhook, is recorded
  once. The second report answers `duplicate`.
- A purchase stacks on paid time the account already holds.
- A refund or revoke removes the grant that transaction paid for.
- A product id that is not mapped in `billing_processor_product` produces no events.
- Sandbox events count only outside production, or for accounts listed in
  `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`.

## Routes

All routes are under `/api/v2/billing`. The API reference is `apps/api/openapi.yml` (tag
`billing`). Error bodies carry a `code` from `BILLING_API_ERROR_CODES`, and the same value is the
`i18nKey` clients translate.

| Method | Path                         | Auth     | Purpose                                                           |
| ------ | ---------------------------- | -------- | ----------------------------------------------------------------- |
| GET    | `/checkout-options`          | Optional | Processors and products offered for `platform` (and `storefront`) |
| GET    | `/status`                    | Required | The account's membership standing (`platform` optional)           |
| POST   | `/paypal/orders`             | Required | Create a PayPal order for a month or a year                       |
| POST   | `/paypal/orders/:id/capture` | Required | Capture an approved order and record the payment                  |
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

Each offered product is a one-time month or a one-time year. PayPal product ids are fixed in
code. Apple and Google Play ids come from `billing_processor_product`.

### Client version floor

A channel's `min_client_version` cuts off an app build with a purchase bug without a server
release. Store and PayPal purchase posts from mobile send `X-Podverse-Client-Platform` and
`X-Podverse-Client-Version`. When the installed version is below the floor, the route answers
**426** with `code` `billing.client_update_required` and the `min_client_version`. Web ships
with the API and has no floor.

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
Purchase and restore posts are rate limited per account (`BILLING_PURCHASE_MAX_PER_10_MINUTES`).

## Configuration

A processor runs only when its enable flag is `"true"`. Credentials alone never turn it on.
Empty, unset, and `false` are off. `true` is case-insensitive. Any other value fails startup
validation. With the flag on, every required key in the table is mandatory. With the flag off,
those keys may be set and the processor stays unregistered. Committed templates, Kubernetes
source env, and the test env leave each flag empty.

The API reads them in `apps/api/.env.example` order (see [apps/api/ENV.md](/apps/api/ENV.md)):

| Processor   | Flag                          | Keys                                                                                           |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| PayPal      | `BILLING_PAYPAL_ENABLED`      | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, optional `PAYPAL_ENVIRONMENT` |
| App Store   | `BILLING_APPLE_IAP_ENABLED`   | `APPLE_*`                                                                                      |
| Google Play | `BILLING_GOOGLE_PLAY_ENABLED` | `GOOGLE_PLAY_*`                                                                                |

The API registers adapters in `registerBillingAdapters`. Workers (Billing-category commands)
and the management API register the same processors through
`registerConfiguredBillingAdapters`. A processor whose flag is off, or whose required
credentials are missing, is left unregistered. The API, workers, and management API must use
the same flag values.

### Test processor

The `test` processor exists for local development and automated tests. It is registered only
when `NODE_ENV` is not `production`, or when `BILLING_ALLOW_TEST_ADAPTER="true"` on a staging
deployment that runs with production settings. Otherwise `POST /test/simulate` answers **403**
`billing.test_adapter_unavailable`. The simulated event always applies to the signed-in account.

## Workers reconcile, they do not charge

Every charge happens at the processor. `billingReconcile` never charges a payment method. It
retries failed webhook inbox rows and applies Google Play voids the webhook missed. The schedule
and the local command are in [BILLING-OPERATIONS.md](BILLING-OPERATIONS.md).

## Grant ledger

`account_membership_status.membership_expires_at` is a cache.
`BillingEntitlementService` recomputes it under a row lock from the grant ledger
(`computeMembershipAccess` in `@podverse/helpers`). No other code writes that timestamp.

| Source               | What it records                                               |
| -------------------- | ------------------------------------------------------------- |
| `one_time_purchase`  | A one-time month or year                                      |
| `claim_token`        | A redeemed membership claim token                             |
| `admin`              | Time an operator granted                                      |
| `trial`              | The free trial                                                |
| `legacy_import`      | Expiry carried over from the previous Podverse app            |
| `migration_baseline` | Membership an account already had when grants were introduced |

A new grant starts where the account's access already runs out (trial, admin, gifts, and paid
grants all count), or at settlement when nothing is left. A second month or year stacks on the
first. Refunds and revocations remove the grant for that transaction. Management never charges.

Sandbox purchases grant membership for every account when `NODE_ENV` is not `production`. In
production they grant only for accounts listed in `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`
(account id or `id_text`, comma-separated). Other accounts are logged after signature
verification, and the webhook still returns 200.

## Adding or removing a processor

Each vendor has one adapter factory that returns `PaymentProcessorAdapter`. Register it at
startup in both places that build the registry:

- `apps/api/src/lib/billing/registerBillingAdapters.ts` (the API keeps a `PayPalService` for
  checkout)
- `packages/billing/src/registerConfiguredBillingAdapters.ts` (workers and the management API)

Add the processor's env group in `packages/helpers-config/src/billingProcessorEnv.ts`. A
processor is registered only when its `BILLING_*_ENABLED` flag is `"true"` and its required
credential keys are set. Map store product ids with `billingSeedProcessorProductsFromEnv` or
in management web, and add a checkout channel for each platform that should offer it. A product
that is not in `billing_processor_product` produces no events.

Two switches, kept separate:

| Switch                                                                                             | What it controls                                            | How to change it                                                          |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Enable flag (`BILLING_PAYPAL_ENABLED`, `BILLING_APPLE_IAP_ENABLED`, `BILLING_GOOGLE_PLAY_ENABLED`) | Deployment capability: credentials, webhooks, and reconcile | Set the flag to `"true"` on the API, workers, and management API together |
| Checkout channel                                                                                   | Sales on a platform and storefront                          | Turn `enabled` off under **Billing → Checkout Channels**                  |

A fresh deployment leaves every flag empty, so it sells nothing. Admins extend memberships
from each user's Billing page. Gifts stack on time the account already holds. See
[BILLING-OPERATIONS.md](BILLING-OPERATIONS.md#manual-membership-management).

To stop new sales while refund webhooks still need to arrive, turn the checkout channel off and
leave the flag on. Clients stop offering that channel within the 60-second cache, and no app
release is required. Turning the flag off makes that processor's webhooks answer 404. See
[BILLING-OPERATIONS.md](BILLING-OPERATIONS.md#kill-switch) and
[Enabling a processor](BILLING-OPERATIONS.md#enabling-a-processor).

## Maintenance calendar

Stored webhook rows keep a `schema_version` so a payload can be replayed after a vendor changes
its format. Review the pinned libraries when the vendor retires that API generation.

| Surface                         | Pinned in this repo                   | Schema versions                                                                |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| PayPal Orders v2                | `@paypal/paypal-server-sdk` 2.x       | `paypal-webhook-v1`, `paypal-capture-v1`                                       |
| App Store Server API and ASN V2 | `@apple/app-store-server-library` 1.x | `apple-asn-v2`, `apple-transaction-v1`                                         |
| StoreKit on device              | `expo-iap` 2.6.3                      | —                                                                              |
| Google Play Developer API       | `@googleapis/androidpublisher` 14.x   | `google-play-rtdn-v1`, `google-play-subscription-v2`, `google-play-product-v1` |
| Play Billing on device          | `expo-iap` 2.6.3                      | —                                                                              |

## Membership email

Podverse does not send membership-expiry email. Processor receipts are the only purchase emails.
In-app expiry copy is derived from `membership_expires_at` on the account the client already
loaded; it is not a notification. See
[no-membership-expiry-notifications](/.cursor/rules/no-membership-expiry-notifications.mdc).

## Kubernetes

Credential values stay out of ConfigMaps. The keys are listed in
`infra/k8s/base/api/source/api.env`, `infra/k8s/base/workers/source/workers.env`, and
`infra/k8s/base/management-api/source/management-api.env`. The bundle id and the package name
are set there; they do not turn a processor on. PayPal, Apple, and Google credential values stay
empty until the SOPS secrets below are applied. Generate them from the monorepo root (GitOps
checkouts use their copy of the same scripts):

```bash
bash ./infra/k8s/scripts/secret-generators/create_billing_paypal_secret.sh
bash ./infra/k8s/scripts/secret-generators/create_billing_apple_iap_secret.sh
bash ./infra/k8s/scripts/secret-generators/create_billing_google_play_secret.sh
```

| Secret                                | Contents                                                        | Mount                                                                |
| ------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `podverse-billing-paypal-opaque`      | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` | `envFrom` on the API, management API, and `worker-billing-reconcile` |
| `podverse-billing-apple-iap-opaque`   | key `AuthKey.p8`                                                | `/var/secrets/apple-iap`                                             |
| `podverse-billing-google-play-opaque` | key `service-account.json`                                      | `/var/secrets/google-play`                                           |

Set `APPLE_IAP_PRIVATE_KEY_PATH` to `/var/secrets/apple-iap/AuthKey.p8` and
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH` to `/var/secrets/google-play/service-account.json` only
together with the rest of that processor's credential keys and its `BILLING_*_ENABLED` flag
set to `"true"`. A credential path without the flag does not register the processor. The
public web client id is `NEXT_PUBLIC_PAYPAL_CLIENT_ID` on the web sidecar, never the client
secret.
