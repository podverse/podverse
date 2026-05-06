import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';

import type { BillingCadence } from '@podverse/helpers';
import {
  BillingRenewalOrchestratorService,
  type BillingRenewalProviderAdapter,
} from '@podverse/orm';

class WorkerBillingRenewalAdapter implements BillingRenewalProviderAdapter {
  async attemptRenewal(params: {
    accountId: number;
    cadence: BillingCadence;
    idempotencyKey: string;
    now: Date;
  }) {
    if (process.env.BILLING_RENEWAL_DRY_RUN_SUCCESS === 'true') {
      return {
        status: 'succeeded' as const,
        providerAttemptId: `dryrun-${params.accountId}-${params.now.getTime()}`,
        payload: { adapterMode: 'dry_run_success', cadence: params.cadence },
      };
    }

    return {
      status: 'failed' as const,
      providerAttemptId: null,
      errorCode: 'adapter_not_configured',
      payload: { adapterMode: 'not_configured', cadence: params.cadence },
    };
  }
}

export const billingProcessDueRenewals = async (_args: CommandLineArgs) => {
  const logger = getLogger();
  const retryDelayMinutesRaw = process.env.BILLING_RENEWAL_RETRY_DELAY_MINUTES;
  const retryDelayMinutes = Number.parseInt(retryDelayMinutesRaw ?? '60', 10);

  logger.info('Processing due membership renewals');
  const orchestrator = new BillingRenewalOrchestratorService();
  const result = await orchestrator.processDueRenewals({
    adapter: new WorkerBillingRenewalAdapter(),
    retryDelayMinutes: Number.isFinite(retryDelayMinutes) ? retryDelayMinutes : 60,
  });
  logger.info(
    `Processed due membership renewals. attempted=${result.attempted}, succeeded=${result.succeeded}, failed=${result.failed}`
  );
};
