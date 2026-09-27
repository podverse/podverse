# Auto-renew testing

Default CI uses the test processor and the mobile fake client. Live PayPal sandbox,
StoreKit Testing, and Google Play license testers are opt-in or manual.

## Default CI

| Surface         | What runs                                      | Processor   |
| --------------- | ---------------------------------------------- | ----------- |
| API integration | `apps/api/src/test/billing.test.ts`            | `test`      |
| Web E2E         | `apps/web/e2e/checkout-membership.spec.ts`     | `test`      |
| Mobile Maestro  | `apps/mobile/e2e/membership-checkout.yaml`     | fake client |

The API tests post `POST /billing/test/simulate` for a signed-in account. They cover a
redelivered PayPal webhook recorded once, a renewal that stays entitled when an older expiry
arrives afterward, a refund that clears entitlement, and grace: access while
`in_grace_period`, then no entitlement after grace lapses to `past_due`.

`tools/web/seed-e2e.mjs` enables the `test` checkout channel for web, iOS, and Android and
inserts the `e2e-test-*` products. `NODE_ENV=test` registers the test adapter. Default runs
do not set PayPal, Apple, or Google credentials.

The mobile fake client is selected only when Metro `__DEV__` is on and
`EXPO_PUBLIC_MOBILE_E2E=1`. A release build does not select it.

From **Root**:

```bash
npm run test -w apps/api -- src/test/billing
make e2e_test_web_report_spec SPEC=e2e/checkout-membership.spec.ts
```

From **Mobile Maestro**, with **Mobile E2E Metro**, **Mobile E2E API**, and the E2E devices
already up:

```bash
npm run mobile:e2e:test -- membership-checkout
```

The web report hub is `.artifacts/e2e-reports/latest/index.html`.

## Opt-in PayPal sandbox

`make e2e_test_web_paypal_sandbox` is not part of `e2e_test` or `e2e_test_report`. It builds
packages, sources `dev/env-overrides/local/billing-e2e.env` when that file exists, and sets
`E2E_PAYPAL_SANDBOX=1`.

The spec `apps/web/e2e/checkout-paypal-sandbox.spec.ts` skips unless that flag is `1` and
both `E2E_PAYPAL_SANDBOX_BUYER_EMAIL` and `E2E_PAYPAL_SANDBOX_BUYER_PASSWORD` are non-empty.
The committed example leaves both empty. Merchant `PAYPAL_CLIENT_ID` and
`PAYPAL_CLIENT_SECRET` are read from the home `paypal.env`. The spec does not print them.

Setup calls `PayPalService.ensureDailyRenewalPlan()`, which creates or reuses a sandbox plan
named **Podverse Premium E2E Daily** (`interval_unit` `DAY`, `interval_count` `1`). The spec
approves that plan as the sandbox buyer, asserts the subscription is `ACTIVE`, and asserts
the next billing time is about one day out. It cancels the subscription when the status is
`ACTIVE`. It does not wait a day. That plan is not a catalog id in `billing-products.env`.

From **Root**, after the buyer file is filled:

```bash
make e2e_test_web_paypal_sandbox
```

Sandbox app, webhook, and tunnel setup stay in
[BILLING-PAYPAL-SANDBOX.md](BILLING-PAYPAL-SANDBOX.md).

## StoreKit Testing

`apps/mobile/storekit/PodverseMembership.storekit` holds the monthly and annual
auto-renew products:

| Product         | Product ID                               | Period | Price |
| --------------- | ---------------------------------------- | ------ | ----- |
| Premium Monthly | `com.podverse.app.next.premium.monthly`  | `P1M`  | 3.00  |
| Premium Annual  | `com.podverse.app.next.premium.annual`   | `P1Y`  | 30.00 |

Those ids match the recommended App Store Connect ids in
[BILLING-APPLE-SANDBOX.md](BILLING-APPLE-SANDBOX.md). Annual is subscription level 1 and
monthly is level 2 in the `PODVERSE_PREMIUM` group.

`_timeRate` is `1`, Xcode's accelerated renewal rate (a monthly period elapses in about 30
seconds, an annual period in about 6 minutes). Do not copy the file into the generated
`apps/mobile/ios` project.

1. Open the app scheme in Xcode → **Run** → **Options** → **StoreKit Configuration**
2. Select `apps/mobile/storekit/PodverseMembership.storekit`
3. If the configuration editor shows **Real Time**, set **Subscription Renewal Rate** to the
   accelerated rate and save

Sandbox Apple Accounts are created in App Store Connect. Podverse does not store their
passwords. See [BILLING-APPLE-SANDBOX.md](BILLING-APPLE-SANDBOX.md).

## Google Play license testers

License testers buy on a device with a Play test card. A declined test card is how a human
exercises billing grace. This path is manual. Default CI does not call Play. See
[BILLING-GOOGLE-PLAY-SANDBOX.md](BILLING-GOOGLE-PLAY-SANDBOX.md).

## Related

- [BILLING.md](BILLING.md) (test processor)
- [BILLING-PAYPAL-SANDBOX.md](BILLING-PAYPAL-SANDBOX.md)
- [BILLING-APPLE-SANDBOX.md](BILLING-APPLE-SANDBOX.md)
- [BILLING-GOOGLE-PLAY-SANDBOX.md](BILLING-GOOGLE-PLAY-SANDBOX.md)
