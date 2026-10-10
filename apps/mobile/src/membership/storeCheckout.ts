import type { BillingCadence, DTOBillingCheckoutOptions } from '@podverse/helpers';
import { extendMembershipPeriodByCadence } from '@podverse/helpers';

import type { BillingBackend } from '../billing/BillingClient';

/** `billing.client_update_required` from a 426 purchase response. */
export const BILLING_CLIENT_UPDATE_REQUIRED = 'billing.client_update_required';

/** Published Podverse App Store listing. */
export const APP_STORE_LISTING_URL = 'https://apps.apple.com/us/app/podverse/id1390888454?mt=8';

/** This app's Play package. */
export const PLAY_PACKAGE_NAME = 'com.podverse.app.next';

export const PLAY_LISTING_URL = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE_NAME}`;

export type StoreCheckoutCadence = BillingCadence;

export type CheckoutProductOffer = {
  id: number;
  cadence: StoreCheckoutCadence;
  externalProductId: string;
  /** Google Play base plan id; null for other processors. */
  basePlanId: string | null;
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
      external_product_id: string;
      external_base_plan_id?: string | null;
    }[];
  }[];
};

const isCadence = (value: string): value is StoreCheckoutCadence =>
  value === 'monthly' || value === 'annual';

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

export const mapCheckoutProcessors = (
  options: CheckoutOptionsShape | DTOBillingCheckoutOptions
): CheckoutProcessorOffer[] =>
  options.processors.map((processor) => ({
    processorId: processor.processor_id,
    products: processor.products.flatMap((product) => {
      if (!isCadence(product.cadence)) {
        return [];
      }
      return [
        {
          basePlanId: product.external_base_plan_id ?? null,
          cadence: product.cadence,
          externalProductId: product.external_product_id,
          id: product.id,
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

/** The product checkout buys for this processor and cadence. When several match, the first one is used. */
export const checkoutProduct = (
  processors: readonly CheckoutProcessorOffer[],
  processorId: string,
  cadence: StoreCheckoutCadence
): CheckoutProductOffer | null => {
  const processor = processors.find((item) => item.processorId === processorId);
  if (processor === undefined) {
    return null;
  }
  return processor.products.find((product) => product.cadence === cadence) ?? null;
};

export const availableCadences = (
  processors: readonly CheckoutProcessorOffer[],
  processorId: string
): StoreCheckoutCadence[] =>
  CADENCE_ORDER.filter((cadence) => checkoutProduct(processors, processorId, cadence) !== null);

/**
 * When the member already has time left, the window new time covers: it starts at the current
 * expiry and ends one cadence later. Null when there is no future expiry.
 */
export const addedMembershipWindow = (params: {
  membershipExpiresAt: string | null;
  cadence: StoreCheckoutCadence;
  nowMs: number;
}): { start: Date; end: Date } | null => {
  if (params.membershipExpiresAt === null) {
    return null;
  }
  const start = new Date(params.membershipExpiresAt);
  if (Number.isNaN(start.getTime()) || start.getTime() <= params.nowMs) {
    return null;
  }
  return {
    end: extendMembershipPeriodByCadence({
      cadence: params.cadence,
      membershipExpiresAt: start,
      now: new Date(params.nowMs),
    }),
    start,
  };
};

export const isClientUpdateRequired = (errorCode: string | null): boolean =>
  errorCode === BILLING_CLIENT_UPDATE_REQUIRED;

export const storeListingUrl = (platform: 'android' | 'ios'): string =>
  platform === 'ios' ? APP_STORE_LISTING_URL : PLAY_LISTING_URL;
