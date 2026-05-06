import { getDataSourceReadWrite } from '@orm/context.js';
import { BillingDomainEvent } from '@orm/entities/billingDomainEvent.js';
import type { DataSource } from 'typeorm';

import type { BillingEventType } from '@podverse/helpers';

type LogBillingEventParams = {
  accountId: number | null;
  eventType: BillingEventType;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
};

export class BillingDomainEventLogService {
  private dataSourceReadWrite: DataSource;

  constructor(params?: { dataSourceReadWrite?: DataSource }) {
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
  }

  async logEvent(params: LogBillingEventParams): Promise<BillingDomainEvent | null> {
    const repository = this.dataSourceReadWrite.getRepository(BillingDomainEvent);

    if (params.idempotencyKey !== undefined && params.idempotencyKey !== null) {
      const existing = await repository.findOne({
        where: { idempotency_key: params.idempotencyKey },
      });
      if (existing) {
        return null;
      }
    }

    const entity = repository.create({
      account_id: params.accountId,
      event_type: params.eventType,
      idempotency_key: params.idempotencyKey ?? null,
      payload: params.payload ?? {},
    });

    return repository.save(entity);
  }
}
