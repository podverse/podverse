import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';
import { getBillingContext } from '@workers/lib/billing/billingContext.js';
import { reconcileBilling } from '@workers/lib/billing/reconcileBilling.js';

import { BillingTransactionService, BillingWebhookEventService } from '@podverse/orm';

/**
 * Retries failed inbox rows and applies Google Play voids the webhook missed.
 * This command never charges a payment method.
 */
export const billingReconcile = async (_args: CommandLineArgs) => {
  const logger = getLogger();
  const { processor, googlePlayClient } = getBillingContext();
  const transactionService = new BillingTransactionService();
  const webhookEventService = new BillingWebhookEventService();

  logger.info('Reconciling billing with payment processors');
  const summary = await reconcileBilling({
    processor,
    googlePlayClient,
    listRetryableInboxEvents: (params) => webhookEventService.listRetryableFailed(params),
    findRecordedGooglePlayPurchase: async (externalTransactionId) => {
      const recorded = await transactionService.getByExternalId(
        'google_play',
        externalTransactionId
      );
      return recorded === null ? null : { isSandbox: recorded.is_sandbox };
    },
    logger,
    now: new Date(),
  });

  logger.info('Reconciled billing with payment processors', {
    inbox: summary.inbox,
    googlePlayVoids: summary.googlePlayVoids,
  });

  if (summary.stepErrors.length > 0) {
    throw new Error(`Billing reconcile steps stopped early: ${summary.stepErrors.join('; ')}`);
  }
};
