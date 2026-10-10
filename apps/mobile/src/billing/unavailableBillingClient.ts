import type { BillingClient, BillingPurchaseOutcome, BillingStoreProduct } from './BillingClient';
import { BillingUnavailableError } from './BillingClient';

const rejectUnavailable = async (): Promise<never> => {
  throw new BillingUnavailableError();
};

/**
 * FOSS / F-Droid billing. Every store method rejects with `unavailable` so the UI can link to
 * web checkout. This module does not import the store SDK.
 */
export const createUnavailableBillingClient = (): BillingClient => ({
  backend: 'unavailable',
  bindAccount: rejectUnavailable,
  getStorefront: rejectUnavailable,
  listPrices: (_productIds: readonly string[]) => rejectUnavailable(),
  purchase: (_product: BillingStoreProduct): Promise<BillingPurchaseOutcome> => rejectUnavailable(),
  restore: rejectUnavailable,
  syncUnfinishedTransactions: rejectUnavailable,
});
