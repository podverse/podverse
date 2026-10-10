import type { BillingCadence } from '../billingDomain.js';
import type { PaymentProcessorId } from './paymentProcessorId.js';

/**
 * PayPal Orders v2 has no product catalog, so Podverse names the one-time products itself. The
 * PayPal adapter sends one of these as the purchase unit reference and reports it back as the
 * event's `externalProductId`, which maps the capture to its cadence.
 */
export const PAYPAL_ONE_TIME_PRODUCT_IDS = {
  monthly: 'podverse_premium_one_time_monthly',
  annual: 'podverse_premium_one_time_annual',
} as const satisfies Record<BillingCadence, string>;

/**
 * Where a processor product's store ids come from in env. Store ids differ per environment, so
 * they are never committed; locally they live in `billing-products.env`.
 */
export interface BillingProcessorProductEnvMapping {
  processor: PaymentProcessorId;
  cadence: BillingCadence;
  /** The store product id, or the Google Play product id plus base plan id. */
  productIdEnvKey: string;
  /** Google Play base plan id; null for processors without base plans. */
  basePlanIdEnvKey: string | null;
}

const GOOGLE_SUBSCRIPTION_ID_ENV_KEY = 'BILLING_PRODUCT_GOOGLE_SUBSCRIPTION_ID';

export const BILLING_PROCESSOR_PRODUCT_ENV_MAPPINGS: readonly BillingProcessorProductEnvMapping[] =
  [
    {
      processor: 'apple',
      cadence: 'monthly',
      productIdEnvKey: 'BILLING_PRODUCT_APPLE_ONE_TIME_MONTHLY_ID',
      basePlanIdEnvKey: null,
    },
    {
      processor: 'apple',
      cadence: 'annual',
      productIdEnvKey: 'BILLING_PRODUCT_APPLE_ONE_TIME_ANNUAL_ID',
      basePlanIdEnvKey: null,
    },
    {
      processor: 'google_play',
      cadence: 'monthly',
      productIdEnvKey: GOOGLE_SUBSCRIPTION_ID_ENV_KEY,
      basePlanIdEnvKey: 'BILLING_PRODUCT_GOOGLE_PREPAID_MONTHLY_BASE_PLAN_ID',
    },
    {
      processor: 'google_play',
      cadence: 'annual',
      productIdEnvKey: GOOGLE_SUBSCRIPTION_ID_ENV_KEY,
      basePlanIdEnvKey: 'BILLING_PRODUCT_GOOGLE_PREPAID_ANNUAL_BASE_PLAN_ID',
    },
  ];

/** Every `BILLING_PRODUCT_*` key, once each, in catalog order. */
export const BILLING_PROCESSOR_PRODUCT_ENV_KEYS: readonly string[] = [
  ...new Set(
    BILLING_PROCESSOR_PRODUCT_ENV_MAPPINGS.flatMap((mapping) =>
      mapping.basePlanIdEnvKey === null
        ? [mapping.productIdEnvKey]
        : [mapping.productIdEnvKey, mapping.basePlanIdEnvKey]
    )
  ),
];

export interface ResolvedBillingProcessorProduct {
  processor: PaymentProcessorId;
  cadence: BillingCadence;
  /** Store product id, Google Play product id, or PayPal checkout product id. */
  externalProductId: string;
  /** Google Play base plan id when one is required; null for other processors. */
  externalBasePlanId: string | null;
}

export interface ResolveBillingProcessorProductsResult {
  products: ResolvedBillingProcessorProduct[];
  /** Mappings left out because a key they need is empty. */
  skipped: BillingProcessorProductEnvMapping[];
}

function readEnvValue(env: Readonly<Record<string, string | undefined>>, key: string): string {
  return env[key]?.trim() ?? '';
}

/**
 * Reads the processor product catalog from env. A mapping whose keys are empty is skipped, so a
 * processor that is not configured yet stays unmapped. The PayPal one-time products are always
 * included because Podverse names them.
 */
export function resolveBillingProcessorProductsFromEnv(
  env: Readonly<Record<string, string | undefined>>
): ResolveBillingProcessorProductsResult {
  const products: ResolvedBillingProcessorProduct[] = [
    {
      processor: 'paypal',
      cadence: 'monthly',
      externalProductId: PAYPAL_ONE_TIME_PRODUCT_IDS.monthly,
      externalBasePlanId: null,
    },
    {
      processor: 'paypal',
      cadence: 'annual',
      externalProductId: PAYPAL_ONE_TIME_PRODUCT_IDS.annual,
      externalBasePlanId: null,
    },
  ];
  const skipped: BillingProcessorProductEnvMapping[] = [];

  for (const mapping of BILLING_PROCESSOR_PRODUCT_ENV_MAPPINGS) {
    const externalProductId = readEnvValue(env, mapping.productIdEnvKey);
    const externalBasePlanId =
      mapping.basePlanIdEnvKey === null ? null : readEnvValue(env, mapping.basePlanIdEnvKey);

    if (externalProductId === '' || externalBasePlanId === '') {
      skipped.push(mapping);
      continue;
    }

    products.push({
      processor: mapping.processor,
      cadence: mapping.cadence,
      externalProductId,
      externalBasePlanId,
    });
  }

  return { products, skipped };
}
