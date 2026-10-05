import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';
import { getBillingContext } from '@workers/lib/billing/billingContext.js';
import { reconcileBilling } from '@workers/lib/billing/reconcileBilling.js';

import {
  BillingSubscriptionService,
  BillingTransactionService,
  BillingWebhookEventService,
} from '@podverse/orm';

/**
 * Reads processor state and applies what the ledger missed. Processors run every renewal and
 * charge; this command never charges a payment method.
 */
export const billingReconcileSubscriptions = async (_args: CommandLineArgs) => {
  const logger = getLogger();
  const { registry, processor, googlePlayClient } = getBillingContext();
  const subscriptionService = new BillingSubscriptionService();
  const transactionService = new BillingTransactionService();
  const webhookEventService = new BillingWebhookEventService();

  logger.info('Reconciling billing with payment processors');
  const summary = await reconcileBilling({
    registry,
    processor,
    googlePlayClient,
    listDueSubscriptions: (params) => subscriptionService.listDueForReconcile(params),
    listRetryableInboxEvents: (params) => webhookEventService.listRetryableFailed(params),
    findRecordedGooglePlayPurchase: async (kind, externalId) => {
      const recorded =
        kind === 'transaction'
          ? await transactionService.getByExternalId('google_play', externalId)
          : await subscriptionService.getByExternalId('google_play', externalId);
      return recorded === null ? null : { isSandbox: recorded.is_sandbox };
    },
    logger,
    now: new Date(),
  });

  logger.info('Reconciled billing with payment processors', {
    subscriptions: summary.subscriptions,
    inbox: summary.inbox,
    googlePlayVoids: summary.googlePlayVoids,
  });

  if (summary.stepErrors.length > 0) {
    throw new Error(`Billing reconcile steps stopped early: ${summary.stepErrors.join('; ')}`);
  }
};
