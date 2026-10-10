import type {
  BillingPlatform,
  DTOBillingCheckoutOptions,
  DTOBillingStatus,
} from '@podverse/helpers';
import type { ApiRequestService } from '@podverse/helpers-requests';

import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { requestWithMobileAuthRefresh } from '../auth/authRequestWithRefresh';

export type BillingApi = {
  getStatus: (platform?: BillingPlatform) => Promise<{ billing_customer_ref: string }>;
  getMembershipStatus: (platform?: BillingPlatform) => Promise<DTOBillingStatus>;
  getCheckoutOptions: (params: {
    platform: 'android' | 'ios';
    storefront: string | null;
  }) => Promise<DTOBillingCheckoutOptions>;
  postAppleTransaction: (params: {
    transactionId: string;
    productId: string;
    signedTransaction: string | null;
  }) => Promise<{ confirmed: boolean }>;
  postGooglePurchase: (params: {
    purchaseToken: string;
    productId: string;
  }) => Promise<{ confirmed: boolean }>;
  restore: (params: {
    processor: 'apple' | 'google_play';
    purchases: Array<{
      externalId: string;
      externalProductId: string;
      signedTransaction?: string | null;
    }>;
  }) => Promise<{ confirmed: boolean }>;
  simulatePayment: (params: {
    cadence: 'annual' | 'monthly';
    externalProductId: string | null;
    externalTransactionId: string;
  }) => Promise<{ outcome: { status: string } }>;
};

/** External product ids offered by one processor in a checkout-options payload. */
export const externalProductIdsForProcessor = (
  catalog: DTOBillingCheckoutOptions,
  processorId: string
): ReadonlySet<string> => {
  const ids = new Set<string>();
  for (const processor of catalog.processors) {
    if (processor.processor_id !== processorId) {
      continue;
    }
    for (const product of processor.products) {
      if (product.external_product_id !== '') {
        ids.add(product.external_product_id);
      }
    }
  }
  return ids;
};

/**
 * Authenticated billing calls. Every request goes through the mobile refresh gate so a lapsed
 * access token is replaced before the post, and billing stays reachable for an expired member.
 */
export const createBillingApi = (deps: AuthRequestDeps): BillingApi => {
  const run = <T>(request: (api: ApiRequestService) => Promise<T>): Promise<T> =>
    requestWithMobileAuthRefresh(deps, request);

  return {
    getCheckoutOptions: (params) =>
      run((api) =>
        api.reqBillingGetCheckoutOptions({
          platform: params.platform,
          storefront: params.storefront,
        })
      ),
    getMembershipStatus: (platform) =>
      run((api) => api.reqBillingGetStatus(platform === undefined ? undefined : { platform })),
    getStatus: (platform) =>
      run((api) => api.reqBillingGetStatus(platform === undefined ? undefined : { platform })),
    postAppleTransaction: (params) =>
      run((api) =>
        api.reqBillingPostAppleTransaction({
          productId: params.productId,
          signedTransaction: params.signedTransaction,
          transactionId: params.transactionId,
        })
      ),
    postGooglePurchase: (params) =>
      run((api) =>
        api.reqBillingPostGooglePurchase({
          productId: params.productId,
          purchaseToken: params.purchaseToken,
        })
      ),
    restore: (params) =>
      run((api) =>
        api.reqBillingRestorePurchases({
          processor: params.processor,
          purchases: params.purchases.map((purchase) => ({
            externalId: purchase.externalId,
            externalProductId: purchase.externalProductId,
            signedTransaction: purchase.signedTransaction,
          })),
        })
      ),
    simulatePayment: (params) => run((api) => api.reqBillingSimulatePayment(params)),
  };
};
