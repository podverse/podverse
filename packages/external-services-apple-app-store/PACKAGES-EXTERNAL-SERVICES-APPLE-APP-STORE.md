# `@podverse/external-services-apple-app-store`

Apple App Store Server integration for Podverse billing.

## Exported API

- `createAppleAdapter(config)` returns a `PaymentProcessorAdapter` for processor id `apple`
- `AppStoreServerClient` wraps App Store Server API + signed payload verification
- `resolveAppleRuntimeEnvironment(APPLE_IAP_ENVIRONMENT, NODE_ENV)` resolves sandbox vs production

## Environment keys

These values are read by the app/worker wiring that creates the adapter:

- `APPLE_IAP_ISSUER_ID`
- `APPLE_IAP_KEY_ID`
- `APPLE_IAP_PRIVATE_KEY_PATH`
- `APPLE_IAP_BUNDLE_ID`
- `APPLE_IAP_APP_APPLE_ID`
- `APPLE_IAP_ENVIRONMENT` (optional override; `sandbox` or `production`)

Apple root certificates are bundled as static trust anchors in this package so
`SignedDataVerifier` can validate App Store Server Notification signatures.
