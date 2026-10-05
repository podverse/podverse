import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingSubscription } from '@orm/entities/billingSubscription.js';
import type { DataSource, EntityManager } from 'typeorm';
import { Brackets } from 'typeorm';

import type { BillingSubscriptionStatus, PurchaseKind } from '@podverse/helpers';

/** Statuses whose access still depends on the processor's next renewal, recovery, or expiry. */
const RECONCILABLE_SUBSCRIPTION_STATUSES: readonly BillingSubscriptionStatus[] = [
  'active',
  'in_grace_period',
  'past_due',
  'cancelled_active',
];

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

  /**
   * The account's subscriptions, latest period first, with their processor product. Reads the
   * primary so a status poll right after a purchase sees the subscription it created.
   */
  async listForAccount(accountId: number): Promise<BillingSubscription[]> {
    return this.dataSourceReadWrite.getRepository(BillingSubscription).find({
      where: { account_id: accountId },
      relations: { billing_processor_product: true },
      order: { current_period_end: { direction: 'DESC', nulls: 'LAST' }, id: 'DESC' },
    });
  }

  /** Null when the subscription does not exist or belongs to another account. */
  async getForAccountById(accountId: number, id: number): Promise<BillingSubscription | null> {
    return this.dataSourceReadWrite.getRepository(BillingSubscription).findOne({
      where: { id, account_id: accountId },
      relations: { billing_processor_product: true },
    });
  }

  /**
   * Live subscriptions whose period end or grace end falls inside the window, in id order with
   * their processor product. Page by passing the last id of the previous batch as `afterId`.
   */
  async listDueForReconcile(params: {
    windowStart: Date;
    windowEnd: Date;
    afterId: number;
    limit: number;
  }): Promise<BillingSubscription[]> {
    return this.dataSourceRead
      .getRepository(BillingSubscription)
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.billing_processor_product', 'product')
      .where('subscription.status IN (:...statuses)', {
        statuses: [...RECONCILABLE_SUBSCRIPTION_STATUSES],
      })
      .andWhere('subscription.id > :afterId', { afterId: params.afterId })
      .andWhere(
        new Brackets((window) => {
          window
            .where('subscription.current_period_end BETWEEN :windowStart AND :windowEnd')
            .orWhere('subscription.grace_period_ends_at BETWEEN :windowStart AND :windowEnd');
        })
      )
      .setParameters({ windowStart: params.windowStart, windowEnd: params.windowEnd })
      .orderBy('subscription.id', 'ASC')
      .limit(params.limit)
      .getMany();
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
