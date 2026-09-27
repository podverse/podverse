import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingSubscription } from '@orm/entities/billingSubscription.js';
import type { DataSource, EntityManager } from 'typeorm';

import type { BillingSubscriptionStatus, PurchaseKind } from '@podverse/helpers';

type BillingSubscriptionServiceParams = {
  dataSourceRead?: DataSource;
  dataSourceReadWrite?: DataSource;
};

/** Omitted fields are written as their defaults, so pass the full state of the row. */
type BillingSubscriptionUpsertParams = {
  accountId: number;
  processorId: string;
  externalSubscriptionId: string;
  status: BillingSubscriptionStatus;
  purchaseKind: PurchaseKind;
  billingProcessorProductId?: number | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  gracePeriodEndsAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  bankedSeconds?: number;
  isSandbox?: boolean;
  rawStatusSnapshot?: Record<string, unknown> | null;
};

export class BillingSubscriptionService {
  private dataSourceRead: DataSource;
  private dataSourceReadWrite: DataSource;

  constructor(params?: BillingSubscriptionServiceParams) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
  }

  async getByExternalId(
    processorId: string,
    externalSubscriptionId: string
  ): Promise<BillingSubscription | null> {
    return this.getByExternalIdWithManager(
      this.dataSourceRead.manager,
      processorId,
      externalSubscriptionId
    );
  }

  async getByExternalIdWithManager(
    transactionalEntityManager: EntityManager,
    processorId: string,
    externalSubscriptionId: string
  ): Promise<BillingSubscription | null> {
    return transactionalEntityManager.getRepository(BillingSubscription).findOne({
      where: {
        processor_id: processorId,
        external_subscription_id: externalSubscriptionId,
      },
    });
  }

  async upsertByExternalId(params: BillingSubscriptionUpsertParams): Promise<BillingSubscription> {
    return this.upsertByExternalIdWithManager(this.dataSourceReadWrite.manager, params);
  }

  async upsertByExternalIdWithManager(
    transactionalEntityManager: EntityManager,
    params: BillingSubscriptionUpsertParams
  ): Promise<BillingSubscription> {
    const repository = transactionalEntityManager.getRepository(BillingSubscription);
    const existing = await repository.findOne({
      where: {
        processor_id: params.processorId,
        external_subscription_id: params.externalSubscriptionId,
      },
    });

    if (!existing) {
      const created = repository.create({
        account_id: params.accountId,
        processor_id: params.processorId,
        external_subscription_id: params.externalSubscriptionId,
        status: params.status,
        purchase_kind: params.purchaseKind,
        billing_processor_product_id: params.billingProcessorProductId ?? null,
        current_period_start: params.currentPeriodStart ?? null,
        current_period_end: params.currentPeriodEnd ?? null,
        grace_period_ends_at: params.gracePeriodEndsAt ?? null,
        cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
        banked_seconds: params.bankedSeconds ?? 0,
        is_sandbox: params.isSandbox ?? false,
        raw_status_snapshot: params.rawStatusSnapshot ?? null,
      });
      return repository.save(created);
    }

    existing.account_id = params.accountId;
    existing.status = params.status;
    existing.purchase_kind = params.purchaseKind;
    existing.billing_processor_product_id = params.billingProcessorProductId ?? null;
    existing.current_period_start = params.currentPeriodStart ?? null;
    existing.current_period_end = params.currentPeriodEnd ?? null;
    existing.grace_period_ends_at = params.gracePeriodEndsAt ?? null;
    existing.cancel_at_period_end = params.cancelAtPeriodEnd ?? false;
    existing.banked_seconds = params.bankedSeconds ?? 0;
    existing.is_sandbox = params.isSandbox ?? false;
    existing.raw_status_snapshot = params.rawStatusSnapshot ?? null;

    return repository.save(existing);
  }
}

export type { BillingSubscriptionUpsertParams };
