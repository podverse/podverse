# PayPal sandbox

Local processor webhooks need a public HTTPS URL that forwards to the API on
`http://localhost:3000`. PayPal, Apple, and Google all use the same base URL.

## Named tunnel

The leave-running tab is **Billing Tunnel** in [`.vscode/terminals.json`](/.vscode/terminals.json).
**Dev** must already be serving the API on `:3000`.

One-time setup, from **Root**, after `cloudflared tunnel login` on the Cloudflare account
that owns the DNS zone:

```bash
cloudflared tunnel create podverse-local
cloudflared tunnel route dns podverse-local billing-local.podcastdj.com
```

`~/.cloudflared/config.yml` routes that hostname to the local API. The credentials file is
the JSON `cloudflared tunnel create` writes next to it (`~/.cloudflared/<tunnel-uuid>.json`).
Do not commit that JSON.

```yaml
tunnel: podverse-local
credentials-file: ~/.cloudflared/<tunnel-uuid>.json

ingress:
  - hostname: billing-local.podcastdj.com
    service: http://localhost:3000
  - service: http_status:404
```

Another DNS zone uses the same steps with its own hostname. `cloudflared` needs the absolute
path of the credentials file in `credentials-file`.

Start it in **Billing Tunnel** and leave it running while a processor delivers webhooks:

```bash
cloudflared tunnel run podverse-local
```

## Public base URL

`BILLING_WEBHOOK_PUBLIC_BASE_URL` is `https://billing-local.podcastdj.com` with no trailing
slash. It is stored in the home override `~/.config/podverse/local-env-overrides/billing.env`
(see [LOCAL-ENV-OVERRIDES.md](/docs/development/env/LOCAL-ENV-OVERRIDES.md)). A named tunnel
keeps that URL across restarts. A quick tunnel
(`cloudflared tunnel --url http://localhost:3000`) prints a new URL each run and is not saved.

Webhook URLs:

- `https://billing-local.podcastdj.com/api/v2/billing/webhooks/paypal`
- `https://billing-local.podcastdj.com/api/v2/billing/webhooks/apple`
- `https://billing-local.podcastdj.com/api/v2/billing/webhooks/google`

## Sandbox app webhook

Developer Dashboard → **Apps & Credentials** → **Sandbox** → open the REST app (the existing
**Podverse LLC** sandbox app). Webhooks are on that app page, under **Sandbox Webhooks**. The
sidebar item **Event Logs → Webhook Events** is the delivery log, not the subscription form.

**Add Webhook** creates another listener. Leave an older webhook that points at the v4 API in
place. An app allows 10 webhook URLs. Copy the **Webhook ID** from the new row into the home
override `PAYPAL_WEBHOOK_ID` in `~/.config/podverse/local-env-overrides/paypal.env`. The id on
an older row belongs to that older URL.

Tick individual event rows. The group checkbox selects every event in that group.

| Dashboard label                     | Event the adapter reads               |
| ----------------------------------- | ------------------------------------- |
| Payment capture completed           | `PAYMENT.CAPTURE.COMPLETED`           |
| Payment capture refunded            | `PAYMENT.CAPTURE.REFUNDED`            |
| Payment capture reversed            | `PAYMENT.CAPTURE.REVERSED`            |
| Billing subscription activated      | `BILLING.SUBSCRIPTION.ACTIVATED`      |
| Billing subscription updated        | `BILLING.SUBSCRIPTION.UPDATED`        |
| Billing subscription cancelled      | `BILLING.SUBSCRIPTION.CANCELLED`      |
| Billing subscription expired        | `BILLING.SUBSCRIPTION.EXPIRED`        |
| Billing subscription payment failed | `BILLING.SUBSCRIPTION.PAYMENT.FAILED` |
| Payment sale completed              | `PAYMENT.SALE.COMPLETED`              |

`BILLING.SUBSCRIPTION.UPDATED` covers a later status of `ACTIVE`, `CANCELLED`, `EXPIRED`, or
`SUSPENDED`. PayPal lists a successful subscription charge as **Payment sale completed**
(`PAYMENT.SALE.COMPLETED`). The dashboard does not offer `BILLING.SUBSCRIPTION.PAYMENT.COMPLETED`.
The adapter maps both names to the same settled auto-renew payment. A sale payload uses
`amount.total` and `amount.currency`, and the subscription id is `billing_agreement_id`. When
the sale omits `custom_id` or `plan_id`, the adapter loads those from the subscription.

Leave these unchecked: Payment capture declined, Payment capture denied, Payment capture
pending, Billing subscription created, Billing subscription re-activated, Billing subscription
suspended, and the Payment sale denied / pending / refunded rows. Capture declined, denied, and
pending are not membership events. A dedicated suspended event is separate from an update whose
status is `SUSPENDED`.

## Sandbox subscription plans

One-time purchases use Orders v2 and need no PayPal plan id. Auto-renew uses two sandbox billing
plans on a catalog product named **Podverse Premium**:

| Plan name                | Price            | Home override key                                   |
| ------------------------ | ---------------- | --------------------------------------------------- |
| Podverse Premium Monthly | 3.00 USD / month | `BILLING_PRODUCT_PAYPAL_AUTO_RENEW_MONTHLY_PLAN_ID` |
| Podverse Premium Annual  | 30.00 USD / year | `BILLING_PRODUCT_PAYPAL_AUTO_RENEW_ANNUAL_PLAN_ID`  |

Those prices match the local membership defaults (`MEMBERSHIP_PREMIUM_COST_MONTHLY` 3 and
`MEMBERSHIP_PREMIUM_COST_ANNUALLY` 30). The tool reads `PAYPAL_CLIENT_ID` and
`PAYPAL_CLIENT_SECRET` from the home `paypal.env`. It reuses a product or plan that already has
that name. From the repo root, in **Root**:

```bash
npm run sync-sandbox-plans -w packages/external-services-paypal
```

Write the printed plan ids into `~/.config/podverse/local-env-overrides/billing-products.env`.
Do not commit them.

## Orders and subscriptions

One-time Premium uses PayPal Orders v2 (`POST /api/v2/billing/paypal/orders`, then capture).
Those purchases have no PayPal plan id. Auto-renew uses the Subscriptions API and the two
billing plans above. The server sets `start_time` to the account's current expiry when paid
time remains, so the first subscription charge does not overlap time already paid.

## Daily sandbox plan

Renewal smoke uses a separate sandbox billing plan with `interval_unit` `DAY` and
`interval_count` `1`. The opt-in spec creates that plan through the PayPal client, checks that
the subscription is `ACTIVE`, and checks that the next billing time is one day out. It does not
wait for the day to pass. That plan is not one of the catalog ids in `billing-products.env`.
Steps and what default CI covers: [BILLING-AUTO-RENEW-TESTING.md](BILLING-AUTO-RENEW-TESTING.md).

## Local env

Home overrides (empty in the repo examples; real values only under `~/.config/podverse/`):

| File | Keys |
| --- | --- |
| `local-env-overrides/paypal.env` | `BILLING_PAYPAL_ENABLED` (empty until you are ready to sell), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT` (`sandbox` locally), `PAYPAL_WEBHOOK_ID` |
| `local-env-overrides/billing.env` | `BILLING_WEBHOOK_PUBLIC_BASE_URL`, buffer and grace expirations, `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS` |
| `local-env-overrides/billing-products.env` | `BILLING_PRODUCT_PAYPAL_AUTO_RENEW_MONTHLY_PLAN_ID`, `BILLING_PRODUCT_PAYPAL_AUTO_RENEW_ANNUAL_PLAN_ID` |

To run PayPal locally, set `BILLING_PAYPAL_ENABLED="true"` in
`~/.config/podverse/local-env-overrides/paypal.env`, then rerun setup from **Root**.
`make local_env_setup` copies `PAYPAL_CLIENT_ID` to the web sidecar as
`NEXT_PUBLIC_PAYPAL_CLIENT_ID` only while that flag is `true`. Otherwise that sidecar key is
cleared. The client secret never goes in the sidecar.

```bash
make local_env_prepare
make local_env_link
make local_env_setup
```

Where to copy each PayPal value: Developer Dashboard → **Apps & Credentials** → **Sandbox** →
the app page. **Client ID** is on the app. **Secret** is **Secret key 1** → **Show**. **Webhook
ID** is the id of the webhook row whose URL is the PayPal URL above.

## Related

- [BILLING.md](BILLING.md)
- [BILLING-OPERATIONS.md](BILLING-OPERATIONS.md)
- [BILLING-AUTO-RENEW-TESTING.md](BILLING-AUTO-RENEW-TESTING.md)
