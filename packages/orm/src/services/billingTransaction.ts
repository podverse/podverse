import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingTransaction } from '@orm/entities/billingTransaction.js';
import type { DataSource, EntityManager } from 'typeorm';

import type { BillingRevocationReason } from '@podverse/helpers';

type BillingTransactionServiceParams = {
  dataSourceRead?: DataSource;
  dataSourceReadWrite?: DataSource;
};

/** Omitted fields are written as their defaults, so pass the full state of the row. */
type BillingTransactionUpsertParams = {
  accountId: number;
  processorId: string;
  externalTransactionId: string;
  settledAt: Date;
  amount?: string | null;
  currencyCode?: string | null;
  revokedAt?: Date | null;
  revocationReason?: BillingRevocationReason | null;
  isSandbox?: boolean;
};

export class BillingTransactionService {
  private dataSourceRead: DataSource;
  private dataSourceReadWrite: DataSource;

  constructor(params?: BillingTransactionServiceParams) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
  }

  async listForAccount(accountId: number, limit: number): Promise<BillingTransaction[]> {
    return this.dataSourceRead.getRepository(BillingTransaction).find({
      where: { account_id: accountId },
      order: { settled_at: 'DESC', id: 'DESC' },
      take: limit,
    });
  }

  async getByExternalId(
    processorId: string,
    externalTransactionId: string
  ): Promise<BillingTransaction | null> {
    return this.getByExternalIdWithManager(
      this.dataSourceRead.manager,
      processorId,
      externalTransactionId
    );
  }

  async getByExternalIdWithManager(
    transactionalEntityManager: EntityManager,
    processorId: string,
    externalTransactionId: string
  ): Promise<BillingTransaction | null> {
    return transactionalEntityManager.getRepository(BillingTransaction).findOne({
      where: {
        processor_id: processorId,
        external_transaction_id: externalTransactionId,
      },
    });
  }

  async upsertByExternalId(params: BillingTransactionUpsertParams): Promise<BillingTransaction> {
    return this.upsertByExternalIdWithManager(this.dataSourceReadWrite.manager, params);
  }

  async upsertByExternalIdWithManager(
    transactionalEntityManager: EntityManager,
    params: BillingTransactionUpsertParams
  ): Promise<BillingTransaction> {
    const repository = transactionalEntityManager.getRepository(BillingTransaction);
    const existing = await repository.findOne({
      where: {
        processor_id: params.processorId,
        external_transaction_id: params.externalTransactionId,
      },
    });

    if (!existing) {
      const created = repository.create({
        account_id: params.accountId,
        processor_id: params.processorId,
        external_transaction_id: params.externalTransactionId,
        settled_at: params.settledAt,
        amount: params.amount ?? null,
        currency_code: params.currencyCode ?? null,
        revoked_at: params.revokedAt ?? null,
        revocation_reason: params.revocationReason ?? null,
        is_sandbox: params.isSandbox ?? false,
      });
      return repository.save(created);
    }

    existing.account_id = params.accountId;
    existing.settled_at = params.settledAt;
    existing.amount = params.amount ?? null;
    existing.currency_code = params.currencyCode ?? null;
    existing.revoked_at = params.revokedAt ?? null;
    existing.revocation_reason = params.revocationReason ?? null;
    existing.is_sandbox = params.isSandbox ?? false;

    return repository.save(existing);
  }
}

export type { BillingTransactionUpsertParams };
