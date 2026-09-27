import { BillingDomainEventLogService } from '@orm/services/billingDomainEventLog.js';
import { BillingMembershipExtensionService } from '@orm/services/billingMembershipExtension.js';
import type { BillingCadence } from '@podverse/helpers';
import { AccountMembershipEnum, BILLING_EVENT_TYPES } from '@podverse/helpers';

type RenewalProviderAttemptResult =
  | { status: 'succeeded'; providerAttemptId: string; payload?: Record<string, unknown> }
  | {
      status: 'failed';
      providerAttemptId: string | null;
      errorCode: string;
      payload?: Record<string, unknown>;
    };

export interface BillingRenewalProviderAdapter {
  attemptRenewal(params: {
    accountId: number;
    cadence: BillingCadence;
    idempotencyKey: string;
    now: Date;
  }): Promise<RenewalProviderAttemptResult>;
}

export class BillingRenewalOrchestratorService {
  private billingDomainEventLogService: BillingDomainEventLogService;
  private billingMembershipExtensionService: BillingMembershipExtensionService;

  constructor() {
    this.billingDomainEventLogService = new BillingDomainEventLogService();
    this.billingMembershipExtensionService = new BillingMembershipExtensionService();
  }

  async handlePaymentSettled(params: {
    accountId: number;
    cadence: BillingCadence;
    idempotencyKey: string;
    provider: string;
    now?: Date;
  }): Promise<void> {
    const now = params.now ?? new Date();
    await this.billingDomainEventLogService.logEvent({
      accountId: params.accountId,
      eventType: BILLING_EVENT_TYPES.PAYMENT_SETTLED,
      idempotencyKey: params.idempotencyKey,
      payload: { cadence: params.cadence, provider: params.provider },
    });
    await this.billingMembershipExtensionService.extendByCadence({
      accountId: params.accountId,
      cadence: params.cadence,
      idempotencyKey: params.idempotencyKey,
      source: 'one_time_purchase',
      accountMembershipId: AccountMembershipEnum.Premium,
      now,
    });
  }

  async handlePayOnDemandExtensionRequested(params: {
    accountId: number;
    monthsToAdd: number;
    idempotencyKey: string;
    source: string;
    now?: Date;
  }): Promise<void> {
    const now = params.now ?? new Date();
    await this.billingDomainEventLogService.logEvent({
      accountId: params.accountId,
      eventType: BILLING_EVENT_TYPES.PAY_ON_DEMAND_EXTENSION_REQUESTED,
      idempotencyKey: params.idempotencyKey,
      payload: { monthsToAdd: params.monthsToAdd, source: params.source },
    });
    if (params.monthsToAdd > 0) {
      await this.billingMembershipExtensionService.extendByMonths({
        accountId: params.accountId,
        monthsToAdd: params.monthsToAdd,
        idempotencyKey: params.idempotencyKey,
        source: 'admin',
        accountMembershipId: AccountMembershipEnum.Premium,
        now,
      });
    }
  }

  async processDueRenewals(params: {
    adapter: BillingRenewalProviderAdapter;
    now?: Date;
    retryDelayMinutes?: number;
  }): Promise<{ attempted: number; succeeded: number; failed: number }> {
    void params;
    return { attempted: 0, succeeded: 0, failed: 0 };
  }
}
