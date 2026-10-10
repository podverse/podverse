/**
 * Store purchase requests for a prepaid membership.
 * Apple sells it as a non-renewing in-app product. Play sells it as a subscription whose
 * offer token is the prepaid base plan, with no replacement of an existing purchase token.
 */

export type StorekitInAppPurchaseRequest = {
  request: {
    apple: {
      andDangerouslyFinishTransactionAutomatically: false;
      appAccountToken: string;
      sku: string;
    };
  };
  type: 'in-app';
};

export const storekitInAppPurchaseRequest = (
  productId: string,
  appAccountToken: string
): StorekitInAppPurchaseRequest => ({
  request: {
    apple: {
      andDangerouslyFinishTransactionAutomatically: false,
      appAccountToken,
      sku: productId,
    },
  },
  type: 'in-app',
});

export type PlaySubscriptionPurchaseRequest = {
  request: {
    google: {
      obfuscatedAccountId: string;
      skus: [string];
      subscriptionOffers: [{ offerToken: string; sku: string }];
    };
  };
  type: 'subs';
};

export const playSubscriptionPurchaseRequest = (
  productId: string,
  offerToken: string,
  obfuscatedAccountId: string
): PlaySubscriptionPurchaseRequest => ({
  request: {
    google: {
      obfuscatedAccountId,
      skus: [productId],
      subscriptionOffers: [{ offerToken, sku: productId }],
    },
  },
  type: 'subs',
});
