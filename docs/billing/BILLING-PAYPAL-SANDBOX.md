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
cloudflared tunnel route dns podverse-local billing-local.example.com
```

`~/.cloudflared/config.yml` routes that hostname to the local API. The credentials file is
the JSON `cloudflared tunnel create` writes next to it (`~/.cloudflared/<tunnel-uuid>.json`).
Do not commit that JSON.

```yaml
tunnel: podverse-local
credentials-file: ~/.cloudflared/<tunnel-uuid>.json

ingress:
  - hostname: billing-local.example.com
    service: http://localhost:3000
  - service: http_status:404
```

`billing-local.example.com` stands in for a hostname on a DNS zone you control.
`cloudflared` needs the absolute path of the credentials file in `credentials-file`.

Start it in **Billing Tunnel** and leave it running while a processor delivers webhooks:

```bash
cloudflared tunnel run podverse-local
```

## Public base URL

`BILLING_WEBHOOK_PUBLIC_BASE_URL` is `https://billing-local.example.com` with no trailing
slash. It is stored in the home override `~/.config/podverse/local-env-overrides/billing.env`
(see [LOCAL-ENV-OVERRIDES.md](/docs/development/env/LOCAL-ENV-OVERRIDES.md)). A named tunnel
keeps that URL across restarts. A quick tunnel
(`cloudflared tunnel --url http://localhost:3000`) prints a new URL each run and is not saved.

Webhook URLs:

- `https://billing-local.example.com/api/v2/billing/webhooks/paypal`
- `https://billing-local.example.com/api/v2/billing/webhooks/apple`
- `https://billing-local.example.com/api/v2/billing/webhooks/google`

## Sandbox app webhook

Developer Dashboard → **Apps & Credentials** → **Sandbox** → open the REST app (the existing
**Podverse LLC** sandbox app). Webhooks are on that app page, under **Sandbox Webhooks**. The
sidebar item **Event Logs → Webhook Events** is the delivery log, not where you add a webhook.

**Add Webhook** creates another listener. Leave an older webhook that points at the v4 API in
place. An app allows 10 webhook URLs. Copy the **Webhook ID** from the new row into the home
override `PAYPAL_WEBHOOK_ID` in `~/.config/podverse/local-env-overrides/paypal.env`. The id on
an older row belongs to that older URL.

Tick individual event rows. The group checkbox selects every event in that group.

| Dashboard label           | Event the adapter reads     |
| ------------------------- | --------------------------- |
| Payment capture completed | `PAYMENT.CAPTURE.COMPLETED` |
| Payment capture refunded  | `PAYMENT.CAPTURE.REFUNDED`  |
| Payment capture reversed  | `PAYMENT.CAPTURE.REVERSED`  |

Leave Payment capture declined, denied, and pending unchecked. Those are not membership events.
Renewing PayPal billing plans already in the sandbox are unused and need no setup.

## Orders

Premium uses PayPal Orders v2 (`POST /api/v2/billing/paypal/orders`, then capture). Podverse names
the month and year product ids in code (`podverse_premium_one_time_monthly` and
`podverse_premium_one_time_annual`). There is no PayPal plan id to copy into `billing-products.env`.
Prices match the local membership defaults (`MEMBERSHIP_PREMIUM_COST_MONTHLY` 3 and
`MEMBERSHIP_PREMIUM_COST_ANNUALLY` 30). A second purchase stacks on time the account already holds.

## Opt-in sandbox purchase

`make e2e_test_web_paypal_sandbox` is not part of the default E2E run. When
`dev/env-overrides/local/billing-e2e.env` exists, that target sources
`E2E_PAYPAL_SANDBOX_BUYER_EMAIL` and `E2E_PAYPAL_SANDBOX_BUYER_PASSWORD`, then runs
`apps/web/e2e/checkout-paypal-sandbox.spec.ts` with `E2E_PAYPAL_SANDBOX=1`. Merchant credentials
come from the home `paypal.env`.

## Local env

Home overrides (empty in the repo examples; real values only under `~/.config/podverse/`):

| File                              | Keys                                                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local-env-overrides/paypal.env`  | `BILLING_PAYPAL_ENABLED` (empty until you are ready to sell), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT` (`sandbox` locally), `PAYPAL_WEBHOOK_ID` |
| `local-env-overrides/billing.env` | `BILLING_WEBHOOK_PUBLIC_BASE_URL`, `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`                                                                                                |

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
