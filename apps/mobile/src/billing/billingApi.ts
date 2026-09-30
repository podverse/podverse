import type { ApiRequestService } from '@podverse/helpers-requests';

import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { requestWithMobileAuthRefresh } from '../auth/authRequestWithRefresh';
import type { BillingPurchaseKind } from './BillingClient';

/**
 * Structural slice of the checkout-options payload. The real DTO is assignable. Checkout needs
 * the processor id, cadence, and product id; purchase settlement only reads the product id and kind.
 */
export type BillingCheckoutCatalog = {
  processors: Array<{
    processor_id: string;
    products: Array<{
      id: number;
      cadence: string;
      external_product_id: string;
      purchase_kind: BillingPurchaseKind;
    }>;
  }>;
};

/** Fields the membership screen reads from `GET /billing/status`. */
export type BillingMembershipStatus = {
  active_auto_renew: boolean;
  in_grace_period: boolean;
  membership_expires_at: string | null;
  active_subscription: {
    current_period_end: string | null;
  } | null;
};

export type BillingApi = {
  getStatus: () => Promise<{ billing_customer_ref: string }>;
  getMembershipStatus: () => Promise<BillingMembershipStatus>;
  getCheckoutOptions: (params: {
    platform: 'android' | 'ios';
    storefront: string | null;
  }) => Promise<BillingCheckoutCatalog>;
  postAppleTransaction: (params: {
    transactionId: string;
    productId: string;
    signedTransaction: string | null;
  }) => Promise<{ confirmed: boolean }>;
  postGooglePurchase: (params: {
    purchaseToken: string;
    productId: string;
    purchaseKind: BillingPurchaseKind;
  }) => Promise<{ confirmed: boolean }>;
  restore: (params: {
    processor: 'apple' | 'google_play';
    purchases: Array<{
      externalId: string;
      externalProductId: string;
      purchaseKind: BillingPurchaseKind;
      signedTransaction?: string | null;
    }>;
  }) => Promise<{ confirmed: boolean }>;
  simulatePayment: (params: {
    purchaseKind: BillingPurchaseKind;
    cadence: 'annual' | 'monthly';
    externalProductId: string | null;
    externalSubscriptionId: string | null;
    externalTransactionId: string;
  }) => Promise<{ outcome: { status: string } }>;
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
    getMembershipStatus: () => run((api) => api.reqBillingGetStatus()),
    getStatus: () => run((api) => api.reqBillingGetStatus()),
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
          purchaseKind: params.purchaseKind,
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
            purchaseKind: purchase.purchaseKind,
            signedTransaction: purchase.signedTransaction,
          })),
        })
      ),
    simulatePayment: (params) => run((api) => api.reqBillingSimulatePayment(params)),
  };
};
