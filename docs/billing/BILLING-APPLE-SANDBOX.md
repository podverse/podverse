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

The same four ids are in `apps/mobile/storekit/PodverseMembership.storekit`.
An empty one-time key stays unmapped, and checkout then offers auto-renew only.

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
after signature verification, and the webhook still returns HTTP 200. The
allowlist is not used for local development: outside production every sandbox
purchase counts. Leave `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS` empty locally.

## Sandbox testers

Sandbox Apple Accounts sign in on the device. Podverse does not store their
passwords.

1. App Store Connect → **Users and Access** → **Sandbox** → **Test Accounts**
2. Add a tester. Use an email that is not already an Apple Account.
3. On a physical iPhone, sign in as that Sandbox Apple Account when the
   purchase sheet asks, or under **Settings** → **Developer** → **Sandbox Apple
   Account**.

Sandbox purchases cannot be completed in the iOS Simulator. Apple supports the
sandbox only on a physical device. In the simulator, use StoreKit Testing below.

## Two ways to test a purchase

| Where           | Store                     | API setting                       | Apple credentials     |
| --------------- | ------------------------- | --------------------------------- | --------------------- |
| iOS Simulator   | StoreKit Testing in Xcode | `APPLE_IAP_ENVIRONMENT="xcode"`   | Bundle id only        |
| Physical iPhone | App Store sandbox         | `APPLE_IAP_ENVIRONMENT="sandbox"` | Issuer, key id, `.p8` |

Both paths need the four product ids in `billing-products.env` and seeded, so
the API can map a purchase to its cadence. From **Root**:

```bash
make local_env_setup
npm run build -w apps/workers
npm run billing_seed_processor_products_from_env -w apps/workers
```

## StoreKit Testing (simulator)

`apps/mobile/storekit/PodverseMembership.storekit` is the local store catalog.
**Auto-Renew** off buys the non-renewing id for the selected cadence. The file
is attached only when Xcode runs the scheme. Open
`apps/mobile/ios/PodverseNext.xcworkspace`, leave **Mobile Metro** running, set
**Run** → **Options** → **StoreKit Configuration** to that file, and press
**Run**. A launch from **Mobile iOS** does not attach it. Do not copy the file
into the generated `apps/mobile/ios` project. Renewal rate and the product
table are in [BILLING-AUTO-RENEW-TESTING.md](BILLING-AUTO-RENEW-TESTING.md).

These transactions are not on Apple's servers, so the App Store Server API has
no record of them. With `APPLE_IAP_ENVIRONMENT="xcode"`, the API instead reads
the signed transaction the app posts with the purchase, and the purchase grants
membership. Set in `billing-apple.env`:

```bash
BILLING_APPLE_IAP_ENABLED="true"
APPLE_IAP_BUNDLE_ID="com.podverse.app.next"
APPLE_IAP_ENVIRONMENT="xcode"
```

The issuer id, key id, and `.p8` path may stay empty. Rerun
`make local_env_setup` and restart **Dev** after a change.

Xcode signs these transactions with a local certificate, so the API cannot prove
the app did not write one itself. The API, workers, and management API refuse to
start with `xcode` when `NODE_ENV` is `production`.

Limits of this mode:

- Xcode sends no App Store Server Notifications, so renewals, refunds, and
  cancellations made in Xcode's **Transaction Manager** do not reach the API
  that way. The app posts a renewed transaction StoreKit hands it, and restores
  current purchases each time the membership checkout opens.
- `billingReconcileSubscriptions` finds no record for these purchases and leaves
  them as they are.

## App Store sandbox (physical iPhone)

A sandbox purchase uses the App Store Connect products, a Sandbox Apple Account,
the App Store Server API keys, and `APPLE_IAP_ENVIRONMENT="sandbox"`. Set
**StoreKit Configuration** to **None**, or install with **Mobile iOS**, which
never attaches the file. With the phone on USB, `npm run mobile:ios -- --device`
opens the device list ([APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)). The phone
cannot reach `localhost` on the Mac, so point
`EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS` in `apps/mobile/.env` at the Mac's LAN
address before starting **Mobile Metro**.

## Local env

To run Apple In-App Purchase locally, set `BILLING_APPLE_IAP_ENABLED="true"` in
`~/.config/podverse/local-env-overrides/billing-apple.env`, then rerun setup from **Root**:

```bash
make local_env_prepare
make local_env_link
make local_env_setup
```

`APPLE_IAP_BUNDLE_ID` is `com.podverse.app.next`. `APPLE_IAP_ENVIRONMENT` is
`xcode` for simulator testing and `sandbox` for a physical iPhone. The `.p8` path points at a file under
`~/.config/podverse/secrets/`. On Kubernetes the same file is a SOPS secret
mounted at `/var/secrets/apple-iap/AuthKey.p8`
([BILLING.md](BILLING.md#kubernetes)).

## Related

- [BILLING.md](BILLING.md)
- [BILLING-PAYPAL-SANDBOX.md](BILLING-PAYPAL-SANDBOX.md) (shared tunnel)
- [BILLING-OPERATIONS.md](BILLING-OPERATIONS.md)
- [BILLING-AUTO-RENEW-TESTING.md](BILLING-AUTO-RENEW-TESTING.md)
