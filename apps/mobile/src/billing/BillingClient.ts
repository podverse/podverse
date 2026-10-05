/**
 * Store billing for the mobile app.
 *
 * The native module is `expo-iap` 5.x (OpenIAP bridge). It provides StoreKit 2 and
 * Google Play Billing 8+ wrappers for Expo SDK 57 / RN 0.86.
 *
 * Finish or acknowledge a store transaction only after the API returns `confirmed: true`.
 * Pending and Ask to Buy stay unfinished. `syncUnfinishedTransactions` is the cold-start pass;
 * the store listener attaches when the client is created.
 *
 * FOSS / F-Droid builds use `unavailableBillingClient`. Exclude `expo-iap` from autolinking on
 * that prebuild so Play Billing is not in the binary.
 */

export type BillingBackend = 'storekit' | 'play' | 'fake' | 'unavailable';

export type BillingPurchaseKind = 'auto_renew' | 'one_time';

export type BillingStoreProduct = {
  productId: string;
  purchaseKind: BillingPurchaseKind;
  /** Google Play base plan id; null for Apple, PayPal, and the fake client. */
  basePlanId: string | null;
};

/** A store-localized price string for one product id. */
export type BillingLocalizedPrice = {
  productId: string;
  displayPrice: string;
};

export type BillingPurchasePhase = 'cancelled' | 'confirmed' | 'failed' | 'unconfirmed' | 'waiting';

export type BillingPurchaseOutcome = {
  phase: BillingPurchasePhase;
  productId: string | null;
  externalId: string | null;
  /** Store or API code. `billing.client_update_required` asks the user to update the app. */
  errorCode: string | null;
};

export interface BillingClient {
  readonly backend: BillingBackend;
  /** Reads `billing_customer_ref` and keeps it for the next store purchase. */
  bindAccount(): Promise<string>;
  /** ISO 3166-1 alpha-2 storefront, or null when the store does not report one. */
  getStorefront(): Promise<string | null>;
  /** Localized price strings from the store. Missing ids are omitted. */
  listPrices(productIds: readonly string[]): Promise<readonly BillingLocalizedPrice[]>;
  purchase(product: BillingStoreProduct): Promise<BillingPurchaseOutcome>;
  restore(): Promise<BillingPurchaseOutcome>;
  syncUnfinishedTransactions(): Promise<void>;
}

export class BillingUnavailableError extends Error {
  readonly code = 'unavailable';

  constructor() {
    super('Store billing is unavailable on this build');
    this.name = 'BillingUnavailableError';
  }
}

export class BillingAccountTokenError extends Error {
  readonly code = 'invalid_account_token';

  constructor() {
    super('Account billing id is not a UUID');
    this.name = 'BillingAccountTokenError';
  }
}

export class BillingPurchaseError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'BillingPurchaseError';
    this.code = code;
  }
}

export const billingPurchaseOutcome = (
  phase: BillingPurchasePhase,
  productId: string | null = null,
  externalId: string | null = null,
  errorCode: string | null = null
): BillingPurchaseOutcome => ({
  errorCode,
  externalId,
  phase,
  productId,
});
