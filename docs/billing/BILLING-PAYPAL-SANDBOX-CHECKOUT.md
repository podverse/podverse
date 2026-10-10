# PayPal sandbox checkout test

Buy Premium on local web and confirm the account received a PayPal grant.

The sandbox app, named tunnel, webhook, and env keys are in
[BILLING-PAYPAL-SANDBOX.md](BILLING-PAYPAL-SANDBOX.md). Finish that setup first. How a
purchase is recorded is in [BILLING.md](BILLING.md).

## Before the purchase

**Dev** must be serving the API on `:3000` and web on `:3002`. Restart **Dev** after any
change to `paypal.env` so the API reloads `BILLING_PAYPAL_ENABLED`.

Use the **Dev** env files (`apps/api/.env` and the matching workers and management API
files). Those stay on `NODE_ENV=development`, so a sandbox purchase grants every account
and `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS` stays empty. The Docker copies under
`infra/config/local/` set `NODE_ENV=production`. Sandbox purchases against that API grant
membership only for accounts listed in `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`.

**Billing Tunnel** can stay up while you buy. The PayPal button captures the order and
grants membership on that response. The tunnel is how a later webhook reaches the API.
Start it when you also want to see that delivery. Ingress and the start command are in
the sandbox guide.

PayPal product ids are fixed in code. Checkout sells a cadence only after that id is a
row in `billing_processor_product`. From **Root**, with local Postgres up:

```bash
npm run build -w apps/workers
npm run billing_seed_processor_products_from_env -w apps/workers
```

That command maps `podverse_premium_one_time_monthly` and
`podverse_premium_one_time_annual`. Apple and Google ids come from `billing-products.env`
and are skipped when empty. The same command is in
[Sandbox checkout](/docs/QUICKSTART.md#sandbox-checkout). The command refuses to run when
`NODE_ENV` is `production`, which is why it belongs on the workers app env, not the
Docker env.

The web PayPal channel is enabled by the schema seed. Management web can turn it off
under **Billing → Checkout Channels**.

Pay with a PayPal **personal** sandbox account. The business account that owns the REST
app is the merchant. Developer Dashboard → **Testing Tools** → **Sandbox Accounts** →
**Create account** → **Personal** (the address ends in `@personal.example.com`). Type
that email and password in the PayPal window. Podverse does not store them.

## Buy

Seeded app logins and the shared password are in the
[QUICKSTART seed table](/docs/QUICKSTART.md#3-recreate-infra-and-seed-the-database).
Those accounts already hold trial or premium time. **Your membership is active.** on the
success page means billing status has a future expiry, including time from the seed.
Write down **Expires On** before you pay, and treat a later date as the proof.

1. Sign in at http://localhost:3002.
2. Open http://localhost:3002/settings?tab=account and note **Expires On**.
3. Open http://localhost:3002/checkout.
4. Choose a month or a year. When the account already has time left, the page says when
   the new time starts and when membership then expires.
5. Complete the PayPal window with the personal sandbox account.
6. The browser lands on http://localhost:3002/checkout/success. It shows **Confirming
   your membership.** and then **Your membership is active.** The timeout sentence means
   billing status still had no future expiry after 30 seconds.
7. Return to **Settings → Account**. **Expires On** should match the end date from
   checkout.

A second purchase stacks on that date. If the webhook arrives after the button already
captured the order, the ledger records the payment once.

| What you see                                     | What it means                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| PayPal button on `/checkout`                     | Public client id is set, the web channel is on, and a product row exists |
| `This plan is not available.`                    | PayPal is offered and that cadence has no product row                    |
| `Memberships can't be purchased here right now.` | PayPal is not offered on this server                                     |
| `Your membership is active.`                     | Status has a future expiry, including time the account already held      |
| **Expires On** is later than the date you noted  | This purchase added a grant                                              |

A contact address instead of the PayPal button is the same case as the "can't be
purchased" sentence: the server is not offering PayPal.

## Ledger

**Root**, with `podverse_local_db` running. Replace the email with the account you bought
on.

```bash
docker exec -i podverse_local_db psql -U podverse_app_owner -d podverse_app -c "
SELECT a.email,
       t.amount,
       t.currency_code,
       t.is_sandbox,
       t.settled_at,
       g.starts_at,
       g.ends_at
FROM billing_transaction t
JOIN account a ON a.id = t.account_id
JOIN billing_membership_grant g ON g.billing_transaction_id = t.id
WHERE t.processor_id = 'paypal'
  AND g.source = 'one_time_purchase'
  AND a.email = 'local-trial@example.com'
ORDER BY t.settled_at DESC
LIMIT 5;
"
```

`is_sandbox` is true for a sandbox capture. One row per purchase is the grant.

Webhook delivery, when the tunnel is running: Developer Dashboard → **Event Logs** →
**Webhook Events**. Look for **Payment capture completed** sent to the PayPal webhook URL
in the sandbox guide. A later delivery of the same capture is a duplicate and does not
add a second grant.

## Opt-in order spec

`make e2e_test_web_paypal_sandbox` creates an order with the merchant credentials from
the home `paypal.env`, signs the buyer into PayPal, and captures. It stops at PayPal. The
browser steps above are what record a Podverse grant. Use the spec to prove the sandbox
app and a buyer can complete an order.

The buyer email and password live in `dev/env-overrides/local/billing-e2e.env`
(`E2E_PAYPAL_SANDBOX_BUYER_EMAIL`, `E2E_PAYPAL_SANDBOX_BUYER_PASSWORD`). `make
local_env_setup` does not apply that file. Empty values skip the spec. Copy
`dev/env-overrides/local/billing-e2e.env.example` when the file is missing. Do not commit
real values. It is not part of the default E2E run.

**Root:**

```bash
make e2e_test_web_paypal_sandbox
```

## Related

- [BILLING-PAYPAL-SANDBOX.md](BILLING-PAYPAL-SANDBOX.md)
- [BILLING.md](BILLING.md)
- [Sandbox checkout](/docs/QUICKSTART.md#sandbox-checkout)
