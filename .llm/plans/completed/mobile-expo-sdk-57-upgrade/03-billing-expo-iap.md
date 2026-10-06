# 03 — Billing: expo-iap 5.x

**Cursor model:** Opus 5.5 · **Reasoning:** extra high

## Goal

Rewrite Play and StoreKit billing clients against installed `expo-iap` 5.x
so Android uses Billing Library 8+ (via openiap-google) while preserving
the existing `BillingClient` interface, account-token binding, and server
verification payloads.

## Ownership

- **Owns:** entire `apps/mobile/src/billing/**`
- **Must not touch:** file-system imports, Reanimated, notifications,
  `package.json` / lockfile (01), plugins / modules (04 / 05)

Runs **after** Prompt 02 (sequential). Owns Checkpoint A at the end.

## Preconditions

- Prompt 01 and Prompt 02 complete (`expo-iap` is on 5.x in node_modules;
  non-billing JS migrations already landed).
- Read installed types before rewriting:
  - `apps/mobile/node_modules/expo-iap` public exports / README
  - Prefer public APIs only — **delete** `import … from 'expo-iap/build/ExpoIapModule'`

## Unchanged product contracts

These must still hold after the rewrite (do not redesign checkout UX):

- `obfuscatedAccountId` (Android) / `appAccountToken` (iOS) binding via
  `bindAccountToken.ts`
- Server verify / settle payloads produced by `settleStorePurchase.ts` and
  `billingApi.ts`
- `finishTransaction` only after API confirmation (existing settle path)
- Prepaid vs auto-renew kind resolution via `purchaseKinds.ts` /
  `selectPlayOfferToken.ts`
- Error mapping: cancelled / waiting / account-token / product-unavailable

## Files

1. `apps/mobile/src/billing/playBillingClient.ts` — primary rewrite
2. `apps/mobile/src/billing/storekitBillingClient.ts` — primary rewrite
3. `apps/mobile/src/billing/normalizeStorePurchase.ts` — Purchase shape
4. `apps/mobile/src/billing/selectPlayOfferToken.ts` — offer token selection
   against 5.x subscription / product types
5. `apps/mobile/src/billing/BillingClient.ts` — update the Kotlin / SDK
   comment (was “SDK 52 / Kotlin 1.9”); keep the interface symbols stable
6. `apps/mobile/src/billing/billingClient.test.ts` — mock the new APIs
7. Other billing helpers **only if** type-check forces it (`localizedPrices.ts`,
   `restoreStorePurchases.ts`, `createBillingClient.ts`, etc.)

## Rewrite guidance (resolve against installed 5.x types)

Exact symbol names may differ slightly by patch; follow the installed
package, not this summary if they disagree.

### Connection / listeners

- Keep `initConnection` + `purchaseUpdatedListener` if still exported.
- Tear down listeners the same way the current clients do.

### Product / subscription fetch

- Replace `getProducts` / `getSubscriptions` with `fetchProducts` (or the
  5.x equivalent) using the documented `type` / `skus` (or `sku`) args.
- Map results into existing `BillingStoreProduct` /
  `BillingLocalizedPrice` via `listStorePrices` where possible.

### Purchase request

- Replace flat `requestPurchase({ sku, … })` with the 5.x platform-keyed
  form, typically `requestPurchase({ request: { google: … } | { apple: … }, type })`.
- Android subscriptions must pass the selected **offer token** (base plan)
  the same way `selectPlayOfferToken` chooses today.
- Preserve account-token fields on the request (Android obfuscated account
  id / iOS app account token).

### Storefront

- Play: stop using deep `ExpoIapModule.getStorefront`. Use the public
  storefront helper 5.x exports for Android (or omit country if 5.x has no
  public equivalent — prefer a public API that returns a country code).
- iOS: rename `getStorefrontIOS` to whatever 5.x exports (often
  `getStorefront` with platform, or a renamed helper). Keep
  `normalizeStorefrontCode` usage.

### Purchase type / finish

- Update `Purchase` type imports and `normalizeStorePurchase` field reads
  (`productId`, `transactionId`, `purchaseToken`, `id`, etc.) to match 5.x.
- Keep `finishTransaction` semantics; adjust args if the signature changed.

## Tests

Update `billingClient.test.ts` (and any other billing unit tests) so mocks
match the new module surface. Prefer mocking public `expo-iap` exports, not
deep paths.

## Done when

- No `expo-iap/build/` deep imports remain
- Play + StoreKit clients type-check against expo-iap 5.x
- `BillingClient` public methods unchanged for UI callers
  (`MembershipStoreCheckout` should not need a redesign)
- Unit tests updated
- **Checkpoint A green** (agent-run)

## Agent verify — Checkpoint A (required)

After the billing rewrite:

```bash
./scripts/nix/with-env npm run type-check:mobile
./scripts/nix/with-env npm --prefix apps/mobile run test
```

If either fails:

1. Fix errors you own under `src/billing/**`.
2. For failures clearly caused by Prompt 02 call sites outside billing, fix
   the minimum needed to green the gate and note those files in the summary.
3. Re-run both commands until green, or **stop** with the failure output if
   blocked (do not pretend success).

Do not start Prompt 04 guidance in this turn — end after Checkpoint A passes
or after a hard stop report.
