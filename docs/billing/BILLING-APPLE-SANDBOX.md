# Apple App Store sandbox

Apple billing uses App Store Connect products, App Store Server Notifications V2,
and App Store Server API keys.

## Shared webhook base URL

Use the same public base URL as PayPal:
[BILLING-PAYPAL-SANDBOX.md](./BILLING-PAYPAL-SANDBOX.md).

- Apple webhook URL: `<base>/api/v2/billing/webhooks/apple`
- Keep version **V2** selected in App Store Connect

## Create and capture App Store values

Save these in home overrides under
`~/.config/podverse/local-env-overrides/billing-apple.env` and
`~/.config/podverse/local-env-overrides/billing-products.env`.

### App and key values

1. Open App Store Connect, then **Apps** -> Podverse app -> **App Information**
2. Copy **Apple ID** to `APPLE_IAP_APP_APPLE_ID`
3. Open **Users and Access** -> **Integrations** -> **In-App Purchase**
4. Copy **Issuer ID** to `APPLE_IAP_ISSUER_ID`
5. Create or reuse a key, then copy its **Key ID** to `APPLE_IAP_KEY_ID`
6. Download the key (`.p8`) once, move it to
   `~/.config/podverse/secrets/`, and set `APPLE_IAP_PRIVATE_KEY_PATH` to
   that file path

Set these static values in `billing-apple.env`:

- `APPLE_IAP_BUNDLE_ID="com.podverse.app.next"`
- `APPLE_IAP_ENVIRONMENT="sandbox"` (local default unless testing production fallback)

### Product IDs

Recommended product IDs:

- `com.podverse.app.next.premium.monthly`
- `com.podverse.app.next.premium.annual`
- `com.podverse.app.next.premium.onetime.monthly`
- `com.podverse.app.next.premium.onetime.annual`

Where to create them:

- Auto-renew subscriptions:
  **Monetization** -> **Subscriptions** (same subscription group)
- One-time memberships:
  **Monetization** -> **In-App Purchases** -> **Non-Renewing Subscription**

Persist to `billing-products.env`:

- `BILLING_PRODUCT_APPLE_AUTO_RENEW_MONTHLY_ID`
- `BILLING_PRODUCT_APPLE_AUTO_RENEW_ANNUAL_ID`
- `BILLING_PRODUCT_APPLE_ONE_TIME_MONTHLY_ID`
- `BILLING_PRODUCT_APPLE_ONE_TIME_ANNUAL_ID`

## Register sandbox ASN URL

1. App Store Connect -> Podverse app -> **App Information**
2. Open **App Store Server Notifications**
3. Set **Sandbox Server URL** to `<base>/api/v2/billing/webhooks/apple`
4. Ensure **Version 2** is selected
5. Save

## Production sandbox allowlist behavior

When a sandbox Apple transaction reaches a production Podverse deployment,
membership access is granted only for accounts listed in
`BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`. Other accounts are logged and ignored
after signature verification, and the webhook still returns HTTP 200.
