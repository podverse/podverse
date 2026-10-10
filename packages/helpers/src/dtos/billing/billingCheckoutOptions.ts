import type { BillingPlatform } from '../../lib/billing/billingPlatform.js';
import type { BillingCadence } from '../../lib/billingDomain.js';

/** One purchasable product as a processor sells it. */
export interface DTOBillingCheckoutProduct {
  /** `billing_processor_product.id`; the client sends it back to start checkout. */
  id: number;
  /** A `BillingProductCode`, left open like `processor_id` so new products do not break clients. */
  product_code: string;
  cadence: BillingCadence;
  /** The App Store product id, the Play product id, or the PayPal checkout product id. */
  external_product_id: string;
  /** Google Play base plan id; null for other processors. */
  external_base_plan_id: string | null;
}

/** A processor enabled for the requesting platform and storefront. */
export interface DTOBillingCheckoutProcessor {
  /**
   * A `PaymentProcessorId`, typed as a string because the server may offer a processor an installed
   * client does not know yet. Narrow with `isPaymentProcessorId` and skip ids that do not match.
   */
  processor_id: string;
  /** Minimum `X-Podverse-Client-Version` for purchasing here; older clients are asked to update. */
  min_client_version: string | null;
  products: DTOBillingCheckoutProduct[];
}

/**
 * What the client may offer at checkout. Store builds show the localized price from the store;
 * web shows the catalog price.
 */
export interface DTOBillingCheckoutOptions {
  platform: BillingPlatform;
  /** The App Store or Play country the options were resolved for, when the client sent one. */
  storefront: string | null;
  processors: DTOBillingCheckoutProcessor[];
}
