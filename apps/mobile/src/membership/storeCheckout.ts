import type { BillingBackend } from '../billing/BillingClient';

/** `billing.client_update_required` from a 426 purchase response. */
export const BILLING_CLIENT_UPDATE_REQUIRED = 'billing.client_update_required';

export const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

/** Published Podverse App Store listing. */
export const APP_STORE_LISTING_URL = 'https://apps.apple.com/us/app/podverse/id1390888454?mt=8';

/** This app's Play package. */
export const PLAY_PACKAGE_NAME = 'com.podverse.app.next';

export const PLAY_LISTING_URL = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE_NAME}`;

export type StoreCheckoutCadence = 'annual' | 'monthly';

export type StoreCheckoutPurchaseKind = 'auto_renew' | 'one_time';

export type CheckoutProductOffer = {
  id: number;
  cadence: StoreCheckoutCadence;
  purchaseKind: StoreCheckoutPurchaseKind;
  externalProductId: string;
};

export type CheckoutProcessorOffer = {
  processorId: string;
  products: readonly CheckoutProductOffer[];
};

export type CheckoutOptionsShape = {
  processors: readonly {
    processor_id: string;
    products: readonly {
      id: number;
      cadence: string;
      purchase_kind: string;
      external_product_id: string;
    }[];
  }[];
};

const isCadence = (value: string): value is StoreCheckoutCadence =>
  value === 'monthly' || value === 'annual';

const isPurchaseKind = (value: string): value is StoreCheckoutPurchaseKind =>
  value === 'auto_renew' || value === 'one_time';

const CADENCE_ORDER: readonly StoreCheckoutCadence[] = ['monthly', 'annual'];

/** Store processor for this billing backend. PayPal is offered separately. */
export const storeProcessorId = (
  backend: BillingBackend
): 'apple' | 'google_play' | 'test' | null => {
  switch (backend) {
    case 'storekit':
      return 'apple';
    case 'play':
      return 'google_play';
    case 'fake':
      return 'test';
    case 'unavailable':
      return null;
  }
};

export const mapCheckoutProcessors = (options: CheckoutOptionsShape): CheckoutProcessorOffer[] =>
  options.processors.map((processor) => ({
    processorId: processor.processor_id,
    products: processor.products.flatMap((product) => {
      if (!isCadence(product.cadence) || !isPurchaseKind(product.purchase_kind)) {
        return [];
      }
      return [
        {
          cadence: product.cadence,
          externalProductId: product.external_product_id,
          id: product.id,
          purchaseKind: product.purchase_kind,
        },
      ];
    }),
  }));

export const offersProcessor = (
  processors: readonly CheckoutProcessorOffer[],
  processorId: string
): boolean => processors.some((processor) => processor.processorId === processorId);

export type StoreCheckoutMode = 'purchase' | 'contact';

/**
 * Purchase when this platform's store or PayPal is offered. Otherwise ask the member to contact
 * the team.
 */
export const resolveStoreCheckoutMode = (params: {
  processors: readonly CheckoutProcessorOffer[];
  backend: BillingBackend;
}): StoreCheckoutMode => {
  const storeId = storeProcessorId(params.backend);
  const storeOffered = storeId !== null && offersProcessor(params.processors, storeId);
  if (storeOffered || offersProcessor(params.processors, 'paypal')) {
    return 'purchase';
  }
  return 'contact';
};

export const checkoutProduct = (
  processors: readonly CheckoutProcessorOffer[],
  processorId: string,
  cadence: StoreCheckoutCadence,
  purchaseKind: StoreCheckoutPurchaseKind
): CheckoutProductOffer | null => {
  const processor = processors.find((item) => item.processorId === processorId);
  if (processor === undefined) {
    return null;
  }
  return (
    processor.products.find(
      (product) => product.cadence === cadence && product.purchaseKind === purchaseKind
    ) ?? null
  );
};

export const availableCadences = (
  processors: readonly CheckoutProcessorOffer[],
  processorId: string,
  purchaseKind: StoreCheckoutPurchaseKind
): StoreCheckoutCadence[] =>
  CADENCE_ORDER.filter(
    (cadence) => checkoutProduct(processors, processorId, cadence, purchaseKind) !== null
  );

/** Remaining membership time is banked on the server and runs after a store subscription period. */
export const showsStackingNotice = (membershipExpiresAt: string | null, nowMs: number): boolean => {
  if (membershipExpiresAt === null) {
    return false;
  }
  const expiresAt = Date.parse(membershipExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt > nowMs;
};

export const isClientUpdateRequired = (errorCode: string | null): boolean =>
  errorCode === BILLING_CLIENT_UPDATE_REQUIRED;

export const playSubscriptionsUrl = (packageName: string): string =>
  `https://play.google.com/store/account/subscriptions?package=${encodeURIComponent(packageName)}`;

/** Apple and Play subscription management pages. Fake and FOSS builds have none. */
export const subscriptionManagementUrl = (backend: BillingBackend): string | null => {
  switch (backend) {
    case 'storekit':
      return APPLE_SUBSCRIPTIONS_URL;
    case 'play':
      return playSubscriptionsUrl(PLAY_PACKAGE_NAME);
    case 'fake':
    case 'unavailable':
      return null;
  }
};

export const storeListingUrl = (platform: 'android' | 'ios'): string =>
  platform === 'ios' ? APP_STORE_LISTING_URL : PLAY_LISTING_URL;
