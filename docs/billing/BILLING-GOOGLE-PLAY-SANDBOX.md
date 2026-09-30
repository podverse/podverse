# Google Play sandbox

Google billing uses a Play Console subscription product, Google Cloud Pub/Sub
Real-time developer notifications (RTDN), and a Google service account JSON key.

## Shared webhook base URL

Use the same public base URL as PayPal:
[BILLING-PAYPAL-SANDBOX.md](./BILLING-PAYPAL-SANDBOX.md).

- Google webhook URL: `<base>/api/v2/billing/webhooks/google`

## Save local override values

Write these keys in home overrides:

- `~/.config/podverse/local-env-overrides/billing-google-play.env`
- `~/.config/podverse/local-env-overrides/billing-products.env`

Do not commit real values.

## Service account and JSON key

1. Open Google Cloud Console for the Play-linked project.
2. Go to **IAM & Admin** -> **Service Accounts**.
3. Create or reuse a service account dedicated to billing RTDN.
4. Create a JSON key and download it once.
5. Move the JSON file to `~/.config/podverse/secrets/`.
6. Set `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH` to that local file path.
7. Set `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL` to the service account email.

## Pub/Sub topic and push subscription (RTDN)

1. In Play Console, open **Monetize** -> **Monetization setup**.
2. Link the app to the same Google Cloud project.
3. In Cloud Console, open **Pub/Sub** and create or reuse an RTDN topic.
4. In Play Console RTDN settings, select that topic.
5. Create a push subscription on that topic:
   - Push endpoint:
     `https://billing-local.example.com/api/v2/billing/webhooks/google`
   - Authentication: enable OIDC
   - Audience: `podverse-local-rtdn` (or your selected value)
   - Service account: the same billing RTDN service account email
6. Save `GOOGLE_PLAY_RTDN_PUSH_AUDIENCE` in `billing-google-play.env`.

## Subscription product and base plans

1. Play Console -> **Monetize** -> **Products** -> **Subscriptions**.
2. Create or reuse subscription id `premium`.
3. Add base plans:
   - `monthly` (auto-renew)
   - `annual` (auto-renew)
   - `prepaid-monthly` (prepaid)
   - `prepaid-annual` (prepaid)
4. Save these ids in `billing-products.env`:
   - `BILLING_PRODUCT_GOOGLE_SUBSCRIPTION_ID`
   - `BILLING_PRODUCT_GOOGLE_AUTO_RENEW_MONTHLY_BASE_PLAN_ID`
   - `BILLING_PRODUCT_GOOGLE_AUTO_RENEW_ANNUAL_BASE_PLAN_ID`
   - `BILLING_PRODUCT_GOOGLE_PREPAID_MONTHLY_BASE_PLAN_ID`
   - `BILLING_PRODUCT_GOOGLE_PREPAID_ANNUAL_BASE_PLAN_ID`

Draft plans are fine while wiring local sandbox flows. Activation is only needed
when you are ready to sell through Google Play.

Auto-renew base plans (`monthly`, `annual`) renew on their own. Prepaid base
plans (`prepaid-monthly`, `prepaid-annual`) are the one-time purchase: Play
does not renew them, and Podverse records one grant for the prepaid period.

## Play Console access for the service account

1. Play Console → **Users and permissions** → **Invite new users**
2. Invite the service account email from the JSON key
3. Grant the app permission to view financial data and to manage orders and
   subscriptions

## Real-time developer notifications

On the Pub/Sub topic, grant
`google-play-developer-notifications@system.gserviceaccount.com` the **Pub/Sub
Publisher** role so Play can publish. After **Send test notification** in Play
Console monetization setup, confirm the push subscription delivers to the
Google webhook URL.

## License testers

Play Console → **Settings** → **License testing**. Add the Google accounts that
will buy on a device. Those accounts can complete a purchase with a Play test
card. A declined test card is how a human exercises billing grace. Podverse
does not store tester passwords. This path is manual; default CI does not call
Play. See [BILLING-AUTO-RENEW-TESTING.md](BILLING-AUTO-RENEW-TESTING.md).

## Voided purchases

A refund or chargeback shows up two ways:

- Play sends a voided-purchase real-time developer notification to the Google
  webhook. The adapter revokes the grants for that purchase.
- `billingReconcileSubscriptions` reads Google's voided-purchase list for the
  last 48 hours and revokes the same grants. A void for a purchase this server
  never recorded is skipped. Seeing the same void on a later run is recorded
  once.

In Play Console, **Order management** is where a tester refund is issued.

## Local env

To run Google Play locally, set `BILLING_GOOGLE_PLAY_ENABLED="true"` in
`~/.config/podverse/local-env-overrides/billing-google-play.env`, then rerun setup from
**Root**:

```bash
make local_env_prepare
make local_env_link
make local_env_setup
```

`GOOGLE_PLAY_PACKAGE_NAME` is `com.podverse.app.next`. The JSON key path points
at a file under `~/.config/podverse/secrets/`. On Kubernetes that file is a
SOPS secret mounted at `/var/secrets/google-play/service-account.json`
([BILLING.md](BILLING.md#kubernetes)). `GOOGLE_PLAY_RTDN_PUSH_AUDIENCE` for a
local tunnel is `podverse-local-rtdn` unless you chose another audience on the
push subscription.

## Related

- [BILLING.md](BILLING.md)
- [BILLING-PAYPAL-SANDBOX.md](BILLING-PAYPAL-SANDBOX.md) (shared tunnel)
- [BILLING-OPERATIONS.md](BILLING-OPERATIONS.md)
- [BILLING-AUTO-RENEW-TESTING.md](BILLING-AUTO-RENEW-TESTING.md)
