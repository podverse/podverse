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

Base plans must be **Active**. Inactive (draft) plans are not returned to the
Play Billing client, so checkout cannot load an offer token for them.

Auto-renew base plans (`monthly`, `annual`) renew on their own. Prepaid base
plans (`prepaid-monthly`, `prepaid-annual`) stay mapped for refunds and voids of
past prepaid purchases. Checkout does not offer them: stores sell auto-renew
subscriptions only. The mobile client selects the offer by
`external_base_plan_id` from checkout options so the auto-renew plans share the
subscription id `premium`.

## Play Console access for the service account

1. Play Console → **Users and permissions** → **Invite new users**
2. Invite the service account email from the JSON key
3. Grant the app permission to view financial data and to manage orders and
   subscriptions

Without those permissions, purchase verification against the Play Developer API
fails even when the device purchase sheet succeeds.

## App on a testing track

Upload `com.podverse.app.next` to an internal (or other) testing track at least
once. License testers must opt into that track. If Play answers "item not
available", check package name, signing certificate, and `versionCode` against
the uploaded build. Play rejects bundles built with Billing Library 7 or older;
builds on Expo SDK 57 with `expo-iap` 5.x meet the requirement. See
[APPS-MOBILE.md](../../apps/mobile/APPS-MOBILE.md#membership-billing).

EAS builds the `.aab` in the cloud with the upload key it already stores. Run
from the **Mobile** tab:

```bash
make mobile_eas_android_list
make mobile_eas_android_download
make mobile_eas_android_build
```

- `list` shows recent builds with versionCode and SDK version. Builds can share
  a commit hash, because EAS uploads uncommitted changes but records HEAD.
- `download` saves the newest finished `beta` build to
  `.artifacts/mobile-builds/`. Pass `BUILD_ID=<id>` for a specific build.
- `build` starts a new `beta` build, waits for it, then downloads it. The remote
  versionCode increments on each build. Reuse the existing keystore if asked; a
  new one would not match the upload key Play has.

Upload the file in **Test and release** → **Testing** → **Internal testing** →
**Create new release** → **App bundles**, then **Next** → **Save and publish**.

Or send the build from the command line instead of uploading it:

```bash
make mobile_eas_android_submit
make mobile_eas_android_submit ROLLOUT=1
```

- Submit sends the newest finished `beta` build (`BUILD_ID=<id>` for another)
  to the internal track. It prints the build, track, and release status, then
  asks before uploading. It needs an interactive terminal.
- By default the upload is a **draft**: testers get nothing until someone
  rolls it out in Play Console (**Internal testing** → **Edit release** →
  **Next** → **Save and publish**).
- `ROLLOUT=1` publishes to the track and asks you to type the versionCode. Play
  rejects it with "Only releases with status draft may be created on draft
  app" until the app has had one release rolled out.
- The track and release status live in the `beta` and `beta-rollout` submit
  profiles in `apps/mobile/eas.json`. The script refuses a profile that does
  not set both, because the eas-cli default is a completed rollout.
- Use a dedicated publisher service account, not the billing one the API uses.
  In Play Console → **Users and permissions**, give it only **Release apps to
  testing tracks** for this app.
- On the first submit, eas-cli asks for that account's JSON key path and
  offers to store the key on EAS. Later submits reuse it.

## Device and emulator

Play Billing needs the Play Store on the device. Creating the tester Google
account, signing the phone into it, and buying on USB is
[BILLING-GOOGLE-PLAY-DEVICE.md](BILLING-GOOGLE-PLAY-DEVICE.md).

- **USB phone (recommended for first local run):** sign in with a license-tester
  Google account, then from **Mobile Metro** / **Mobile Android**:
  `npm run mobile:dev:device` and `npm run mobile:android:device`.
- **Emulator:** the default `Pixel_6_Pro_API_33` AVD uses a Google APIs image
  (`PlayStore.enabled = false`) and cannot open the Play Billing sheet. Create a
  separate AVD (for example `Pixel_6_Pro_API_33_Play`) on
  `system-images;android-33;google_apis_playstore;arm64-v8a`, sign into a
  license-tester account in that emulator's Play Store, and install with
  `npm run mobile:android -- --device Pixel_6_Pro_API_33_Play`.

E2E AVDs stay on Google APIs images; Maestro uses the fake billing client and
never calls Play.

## Real-time developer notifications

On the Pub/Sub topic, grant
`google-play-developer-notifications@system.gserviceaccount.com` the **Pub/Sub
Publisher** role so Play can publish. After **Send test notification** in Play
Console monetization setup, confirm the push subscription delivers to the
Google webhook URL.

RTDN is optional for the first local purchase: the app posts the purchase token
to the API, which verifies it with the Play Developer API and grants membership.
RTDN keeps renewals and refunds in sync when the app is not open.

## License testers

Play Console → **Settings** → **License testing**. Add the Google accounts that
will buy on a device. Those accounts can complete a purchase with a Play test
card. A declined test card is how a human exercises billing grace. Podverse
does not store tester passwords. This path is manual; default CI does not call
Play. Creating the account and signing the phone into it is
[BILLING-GOOGLE-PLAY-DEVICE.md](BILLING-GOOGLE-PLAY-DEVICE.md). Renewal behavior
is in [BILLING-AUTO-RENEW-TESTING.md](BILLING-AUTO-RENEW-TESTING.md). License
testers use billing periods measured in minutes, so the in-app renewal date can
read today or tomorrow even for a monthly or yearly plan.

## Seed processor products

After product and base plan ids are in `billing-products.env` and
`make local_env_setup` has run, seed the ledger rows from **Root**:

```bash
npm run build -w apps/workers
npm run billing_seed_processor_products_from_env -w apps/workers
```

Checkout options stay empty for Google until those rows exist.

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
- [BILLING-GOOGLE-PLAY-DEVICE.md](BILLING-GOOGLE-PLAY-DEVICE.md)
- [BILLING-AUTO-RENEW-TESTING.md](BILLING-AUTO-RENEW-TESTING.md)
