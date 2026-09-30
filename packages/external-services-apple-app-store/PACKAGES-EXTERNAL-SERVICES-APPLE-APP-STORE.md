# `@podverse/external-services-apple-app-store`

Apple App Store Server integration for Podverse billing.

## Exported API

- `createAppleAdapter(config)` returns a `PaymentProcessorAdapter` for processor id `apple`
- `AppStoreServerClient` wraps App Store Server API + signed payload verification
- `resolveAppleRuntimeEnvironment(APPLE_IAP_ENVIRONMENT, NODE_ENV)` resolves sandbox, production,
  or xcode, and throws for xcode when `NODE_ENV` is `production`

## Xcode StoreKit Testing mode

With `APPLE_IAP_ENVIRONMENT=xcode`, `createAppleAdapter` never builds an App Store Server API
client or reads the `.p8` key. Xcode's StoreKit Testing purchases are not on Apple's servers, so
the adapter decodes the signed transaction (`jwsRepresentationIos`) the app posts as
`signed_transaction`. Xcode signs those with its own local certificate, so the adapter checks the
bundle id, the `Xcode` environment, and that the transaction id matches, but cannot prove the
device did not write the token itself. That is why the mode is refused in production.

- `fetchTransaction` and `fetchSubscription` throw `BillingProcessorRecordNotFoundError` without a
  matching signed transaction, which includes every reconcile-worker lookup
- A subscription snapshot is `active` until the transaction's `expiresDate`, then `expired`
- Webhooks are rejected: Xcode sends no App Store Server Notifications

## Environment keys

These values are read by the app/worker wiring that creates the adapter:

- `APPLE_IAP_ISSUER_ID`
- `APPLE_IAP_KEY_ID`
- `APPLE_IAP_PRIVATE_KEY_PATH`
- `APPLE_IAP_BUNDLE_ID`
- `APPLE_IAP_APP_APPLE_ID`
- `APPLE_IAP_ENVIRONMENT` (optional override; `sandbox`, `production`, or local-only `xcode`)

Apple root certificates are bundled as static trust anchors in this package so
`SignedDataVerifier` can validate App Store Server Notification signatures.
