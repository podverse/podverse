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
     `https://billing-local.podcastdj.com/api/v2/billing/webhooks/google`
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
