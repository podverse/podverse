import { getDataSourceRead } from '@orm/context.js';
import { AccountService } from '@orm/services/account/account.js';
import { AccountMembershipStatusService } from '@orm/services/account/accountMembershipStatus.js';
import { BillingDomainEventLogService } from '@orm/services/billingDomainEventLog.js';
import { BillingMembershipExtensionService } from '@orm/services/billingMembershipExtension.js';
import type { DataSource } from 'typeorm';

import { BILLING_EVENT_TYPES, type BillingCadence } from '@podverse/helpers';

type DueRenewalCandidate = {
  account_id: number;
  membership_expires_at: Date;
  billing_cadence: BillingCadence | null;
};

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
  private dataSourceRead: DataSource;
  private accountService: AccountService;
  private accountMembershipStatusService: AccountMembershipStatusService;
  private billingDomainEventLogService: BillingDomainEventLogService;
  private billingMembershipExtensionService: BillingMembershipExtensionService;

  constructor(params?: { dataSourceRead?: DataSource }) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.accountService = new AccountService();
    this.accountMembershipStatusService = new AccountMembershipStatusService();
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
      reason: 'payment_settled',
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
        reason: 'pay_on_demand_extension_requested',
        now,
      });
    }
  }

  private async findRenewalsDueWithin24Hours(now: Date): Promise<DueRenewalCandidate[]> {
    const rows = await this.dataSourceRead.query(
      `
      SELECT
        ams.account_id,
        ams.membership_expires_at,
        ams.billing_cadence
      FROM account_membership_status ams
      INNER JOIN account_membership am
        ON am.id = ams.account_membership_id
      WHERE am.tier = 'premium'
        AND ams.auto_renew_mode = 'on'
        AND ams.membership_expires_at IS NOT NULL
        AND ams.membership_expires_at <= ($1::timestamp + interval '24 hours')
        AND ams.membership_expires_at >= ($1::timestamp - interval '24 hours')
        AND (ams.next_renewal_attempt_at IS NULL OR ams.next_renewal_attempt_at <= $1::timestamp)
        AND (
          ams.renewal_retry_backoff_until IS NULL OR
          ams.renewal_retry_backoff_until <= $1::timestamp
        )
      ORDER BY ams.membership_expires_at ASC
      `,
      [now]
    );
    return rows as DueRenewalCandidate[];
  }

  async processDueRenewals(params: {
    adapter: BillingRenewalProviderAdapter;
    now?: Date;
    retryDelayMinutes?: number;
  }): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const now = params.now ?? new Date();
    const retryDelayMinutes = params.retryDelayMinutes ?? 60;
    const due = await this.findRenewalsDueWithin24Hours(now);
    let succeeded = 0;
    let failed = 0;

    for (const candidate of due) {
      const cadence = candidate.billing_cadence ?? 'annual';
      const idempotencyKey = `renewal:${candidate.account_id}:${candidate.membership_expires_at.toISOString()}`;
      const attempt = await params.adapter.attemptRenewal({
        accountId: candidate.account_id,
        cadence,
        idempotencyKey,
        now,
      });

      const account = await this.accountService.get(candidate.account_id, {
        relations: {
          account_membership_status: { account_membership: true },
        },
      });
      if (!account || !account.account_membership_status) {
        continue;
      }
      const status = account.account_membership_status;

      if (attempt.status === 'succeeded') {
        await this.billingMembershipExtensionService.extendByCadence({
          accountId: candidate.account_id,
          cadence,
          idempotencyKey,
          reason: 'renewal_succeeded',
          now,
        });

        await this.accountMembershipStatusService.update(account, {
          account_membership_id: status.account_membership.id,
          membership_expires_at: status.membership_expires_at ?? null,
          billing_cadence: cadence,
          auto_renew_mode: status.auto_renew_mode ?? 'on',
          last_renewal_attempt_at: now,
          last_renewal_status: 'succeeded',
          last_renewal_idempotency_key: idempotencyKey,
          next_renewal_attempt_at: null,
          renewal_retry_count: 0,
          renewal_retry_backoff_until: null,
        });

        await this.billingDomainEventLogService.logEvent({
          accountId: candidate.account_id,
          eventType: BILLING_EVENT_TYPES.RENEWAL_SUCCEEDED,
          idempotencyKey,
          payload: {
            cadence,
            providerAttemptId: attempt.providerAttemptId,
            ...attempt.payload,
          },
        });
        succeeded += 1;
      } else {
        const retryCount = (status.renewal_retry_count ?? 0) + 1;
        const nextAttemptAt = new Date(now.getTime() + retryDelayMinutes * 60 * 1000);
        await this.accountMembershipStatusService.update(account, {
          account_membership_id: status.account_membership.id,
          membership_expires_at: status.membership_expires_at ?? null,
          billing_cadence: cadence,
          auto_renew_mode: status.auto_renew_mode ?? 'on',
          last_renewal_attempt_at: now,
          last_renewal_status: 'failed',
          last_renewal_idempotency_key: idempotencyKey,
          next_renewal_attempt_at: nextAttemptAt,
          renewal_retry_count: retryCount,
          renewal_retry_backoff_until: nextAttemptAt,
        });

        await this.billingDomainEventLogService.logEvent({
          accountId: candidate.account_id,
          eventType: BILLING_EVENT_TYPES.RENEWAL_FAILED,
          idempotencyKey,
          payload: {
            cadence,
            errorCode: attempt.errorCode,
            providerAttemptId: attempt.providerAttemptId,
            retryCount,
            retryDelayMinutes,
            ...attempt.payload,
          },
        });
        failed += 1;
      }
    }

    return { attempted: due.length, succeeded, failed };
  }
}
