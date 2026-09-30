import type {
  BillingCadence,
  BillingPlatform,
  DTOBillingCancelSubscriptionResult,
  DTOBillingCheckoutOptions,
  DTOBillingPayPalOrder,
  DTOBillingPayPalSubscription,
  DTOBillingPurchaseResult,
  DTOBillingSimulationResult,
  DTOBillingStatus,
  PurchaseKind,
} from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

const credentials = { withCredentials: true };

export type ReqBillingPayPalCheckoutParams = {
  processorProductId: number;
  returnUrl: string;
  cancelUrl: string;
};

export type ReqBillingSimulatePaymentParams = {
  purchaseKind: PurchaseKind;
  cadence: BillingCadence;
  externalProductId: string | null;
  externalSubscriptionId: string | null;
  externalTransactionId: string;
};

export type ReqBillingCheckoutOptionsParams = {
  platform?: BillingPlatform;
  storefront?: string | null;
};

export type ReqBillingAppleTransactionParams = {
  transactionId: string;
  productId?: string;
  /** StoreKit JWS. The API reads it only when it runs with `APPLE_IAP_ENVIRONMENT=xcode`. */
  signedTransaction?: string | null;
};

export type ReqBillingGooglePurchaseParams = {
  purchaseToken: string;
  productId: string;
  purchaseKind: PurchaseKind;
};

export type ReqBillingRestorePurchase = {
  externalId: string;
  externalProductId?: string | null;
  purchaseKind: PurchaseKind;
  /** StoreKit JWS for an Apple purchase. */
  signedTransaction?: string | null;
};

export type ReqBillingRestorePurchasesParams = {
  processor: 'apple' | 'google_play';
  purchases: ReqBillingRestorePurchase[];
};

export async function reqBillingGetCheckoutOptions(
  api: ApiRequestService,
  params?: ReqBillingCheckoutOptionsParams
) {
  const search = new URLSearchParams({ platform: params?.platform ?? 'web' });
  const storefront = params?.storefront?.trim() ?? '';
  if (storefront !== '') {
    search.set('storefront', storefront);
  }
  return api.apiRequest<DTOBillingCheckoutOptions>({
    path: `/billing/checkout-options?${search.toString()}`,
    method: 'GET',
  });
}

export async function reqBillingGetStatus(api: ApiRequestService) {
  return api.apiRequest<DTOBillingStatus>({
    path: '/billing/status',
    method: 'GET',
    config: credentials,
  });
}

export async function reqBillingPostAppleTransaction(
  api: ApiRequestService,
  params: ReqBillingAppleTransactionParams
) {
  return api.apiRequest<DTOBillingPurchaseResult>({
    path: '/billing/apple/transactions',
    method: 'POST',
    data: {
      transaction_id: params.transactionId,
      ...(params.productId !== undefined ? { product_id: params.productId } : {}),
      ...(typeof params.signedTransaction === 'string' && params.signedTransaction !== ''
        ? { signed_transaction: params.signedTransaction }
        : {}),
    },
    config: credentials,
  });
}

export async function reqBillingPostGooglePurchase(
  api: ApiRequestService,
  params: ReqBillingGooglePurchaseParams
) {
  return api.apiRequest<DTOBillingPurchaseResult>({
    path: '/billing/google/purchases',
    method: 'POST',
    data: {
      purchase_token: params.purchaseToken,
      product_id: params.productId,
      purchase_kind: params.purchaseKind,
    },
    config: credentials,
  });
}

export async function reqBillingRestorePurchases(
  api: ApiRequestService,
  params: ReqBillingRestorePurchasesParams
) {
  return api.apiRequest<DTOBillingPurchaseResult>({
    path: '/billing/restore',
    method: 'POST',
    data: {
      processor: params.processor,
      purchases: params.purchases.map((purchase) => ({
        external_id: purchase.externalId,
        external_product_id: purchase.externalProductId ?? null,
        purchase_kind: purchase.purchaseKind,
        ...(typeof purchase.signedTransaction === 'string' && purchase.signedTransaction !== ''
          ? { signed_transaction: purchase.signedTransaction }
          : {}),
      })),
    },
    config: credentials,
  });
}

export async function reqBillingCreatePayPalOrder(
  api: ApiRequestService,
  params: ReqBillingPayPalCheckoutParams
) {
  return api.apiRequest<DTOBillingPayPalOrder>({
    path: '/billing/paypal/orders',
    method: 'POST',
    data: {
      processor_product_id: params.processorProductId,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    },
    config: credentials,
  });
}

export async function reqBillingCancelSubscription(api: ApiRequestService, subscriptionId: number) {
  return api.apiRequest<DTOBillingCancelSubscriptionResult>({
    path: `/billing/subscriptions/${subscriptionId}/cancel`,
    method: 'POST',
    config: credentials,
  });
}

export async function reqBillingCapturePayPalOrder(api: ApiRequestService, orderId: string) {
  return api.apiRequest<DTOBillingPurchaseResult>({
    path: `/billing/paypal/orders/${encodeURIComponent(orderId)}/capture`,
    method: 'POST',
    config: credentials,
  });
}

export async function reqBillingCreatePayPalSubscription(
  api: ApiRequestService,
  params: ReqBillingPayPalCheckoutParams
) {
  return api.apiRequest<DTOBillingPayPalSubscription>({
    path: '/billing/paypal/subscriptions',
    method: 'POST',
    data: {
      processor_product_id: params.processorProductId,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    },
    config: credentials,
  });
}

/**
 * Records a test-processor payment. One-time purchases leave the subscription id null; an
 * auto-renew payment names the subscription it settles.
 */
export async function reqBillingSimulatePayment(
  api: ApiRequestService,
  params: ReqBillingSimulatePaymentParams
) {
  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime());
  if (params.cadence === 'annual') {
    periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
  } else {
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
  }

  return api.apiRequest<DTOBillingSimulationResult>({
    path: '/billing/test/simulate',
    method: 'POST',
    data: {
      event: {
        type: 'payment_settled',
        purchaseKind: params.purchaseKind,
        externalProductId: params.externalProductId,
        externalBasePlanId: null,
        externalTransactionId: params.externalTransactionId,
        externalSubscriptionId: params.externalSubscriptionId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        amount: null,
      },
    },
    config: credentials,
  });
}
