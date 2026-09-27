import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingTransaction } from '@orm/entities/billingTransaction.js';
import type { DataSource } from 'typeorm';

import type { BillingRevocationReason, PurchaseKind } from '@podverse/helpers';

type BillingTransactionServiceParams = {
  dataSourceRead?: DataSource;
  dataSourceReadWrite?: DataSource;
};

type BillingTransactionUpsertParams = {
  accountId: number;
  processorId: string;
  externalTransactionId: string;
  purchaseKind: PurchaseKind;
  settledAt: Date;
  billingSubscriptionId?: number | null;
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

  async getByExternalId(
    processorId: string,
    externalTransactionId: string
  ): Promise<BillingTransaction | null> {
    return this.dataSourceRead.getRepository(BillingTransaction).findOne({
      where: {
        processor_id: processorId,
        external_transaction_id: externalTransactionId,
      },
    });
  }

  async upsertByExternalId(params: BillingTransactionUpsertParams): Promise<BillingTransaction> {
    const repository = this.dataSourceReadWrite.getRepository(BillingTransaction);
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
        purchase_kind: params.purchaseKind,
        settled_at: params.settledAt,
        billing_subscription_id: params.billingSubscriptionId ?? null,
        amount: params.amount ?? null,
        currency_code: params.currencyCode ?? null,
        revoked_at: params.revokedAt ?? null,
        revocation_reason: params.revocationReason ?? null,
        is_sandbox: params.isSandbox ?? false,
      });
      return repository.save(created);
    }

    existing.account_id = params.accountId;
    existing.purchase_kind = params.purchaseKind;
    existing.settled_at = params.settledAt;
    existing.billing_subscription_id = params.billingSubscriptionId ?? null;
    existing.amount = params.amount ?? null;
    existing.currency_code = params.currencyCode ?? null;
    existing.revoked_at = params.revokedAt ?? null;
    existing.revocation_reason = params.revocationReason ?? null;
    existing.is_sandbox = params.isSandbox ?? false;

    return repository.save(existing);
  }
}

export type { BillingTransactionUpsertParams };
