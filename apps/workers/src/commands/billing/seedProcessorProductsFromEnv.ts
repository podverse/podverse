import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';

import { resolveBillingProcessorProductsFromEnv } from '@podverse/helpers';
import { BillingProcessorProductService } from '@podverse/orm';

/**
 * Maps the Premium product to each processor's store ids from `BILLING_PRODUCT_*`. Production
 * mappings are managed through the management app, so this command refuses to run there.
 */
export const billingSeedProcessorProductsFromEnv = async (_args: CommandLineArgs) => {
  const logger = getLogger();

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'billingSeedProcessorProductsFromEnv refuses to run when NODE_ENV is production.'
    );
  }

  const { products, skipped } = resolveBillingProcessorProductsFromEnv(process.env);
  const service = new BillingProcessorProductService();
  let created = 0;
  let updated = 0;

  for (const product of products) {
    const result = await service.upsertPremiumProcessorProduct({
      processorId: product.processor,
      externalProductId: product.externalProductId,
      externalBasePlanId: product.externalBasePlanId,
      cadence: product.cadence,
    });
    if (result.created) {
      created += 1;
    } else {
      updated += 1;
    }
    logger.info('Billing processor product mapped', {
      processor: product.processor,
      cadence: product.cadence,
      externalProductId: product.externalProductId,
      externalBasePlanId: product.externalBasePlanId,
      created: result.created,
    });
  }

  logger.info('Billing processor products seeded', {
    created,
    updated,
    skipped: skipped.length,
  });
};
