# `@podverse/external-services-google-play`

Google Play billing integration for Podverse.

## Exported API

- `createGooglePlayAdapter(config)` returns a `PaymentProcessorAdapter` for
  processor id `google_play`
- `pollGooglePlayVoidedPurchases(client, params)` fetches one page of voided
  purchases for reconciliation polling
- `PlayDeveloperClient` wraps Android Publisher API calls used by the adapter
  (subscription/product purchase fetch, acknowledge, and voided purchases list)

## Environment keys

These values are read by API/worker wiring that creates the adapter:

- `GOOGLE_PLAY_PACKAGE_NAME`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH`
- `GOOGLE_PLAY_RTDN_PUSH_AUDIENCE`
- `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL`

Google test purchases map to sandbox billing events through `testPurchase` in
RTDN-linked purchase payloads.
