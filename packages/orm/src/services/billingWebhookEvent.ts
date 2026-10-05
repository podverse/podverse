import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingWebhookEvent } from '@orm/entities/billingWebhookEvent.js';
import type { DataSource } from 'typeorm';
import { LessThan, QueryFailedError } from 'typeorm';

type BillingWebhookEventServiceParams = {
  dataSourceRead?: DataSource;
  dataSourceReadWrite?: DataSource;
};

type InsertBillingWebhookEventParams = {
  processorId: string;
  externalEventId: string;
  schemaVersion: string;
  payload: Record<string, unknown>;
  receivedAt?: Date;
};

type InsertBillingWebhookEventResult = {
  event: BillingWebhookEvent;
  inserted: boolean;
};

type BillingWebhookEventStatus = 'pending' | 'processed' | 'failed';

function isPostgresUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  if ('code' in error && error.code === '23505') {
    return true;
  }
  const driverError = error.driverError;
  if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
    return false;
  }
  return Reflect.get(driverError, 'code') === '23505';
}

export class BillingWebhookEventService {
  private dataSourceRead: DataSource;
  private dataSourceReadWrite: DataSource;

  constructor(params?: BillingWebhookEventServiceParams) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
  }

  async insertIfNew(
    params: InsertBillingWebhookEventParams
  ): Promise<InsertBillingWebhookEventResult> {
    const repository = this.dataSourceReadWrite.getRepository(BillingWebhookEvent);
    const event = repository.create({
      processor_id: params.processorId,
      external_event_id: params.externalEventId,
      schema_version: params.schemaVersion,
      payload: params.payload,
      received_at: params.receivedAt ?? new Date(),
      status: 'pending',
    });

    try {
      const inserted = await repository.save(event);
      return { event: inserted, inserted: true };
    } catch (error) {
      if (!isPostgresUniqueViolation(error)) {
        throw error;
      }
      const existing = await repository.findOne({
        where: {
          processor_id: params.processorId,
          external_event_id: params.externalEventId,
        },
      });
      if (existing === null) {
        throw error;
      }
      return { event: existing, inserted: false };
    }
  }

  /**
   * Failed rows received before `receivedBefore`, least recently attempted first, so a row that
   * keeps failing moves behind the others instead of holding back the batch.
   */
  async listForAdmin(params: {
    status?: BillingWebhookEventStatus;
    processorId?: string;
    accountId?: number;
    limit: number;
  }): Promise<BillingWebhookEvent[]> {
    const query = this.dataSourceRead
      .getRepository(BillingWebhookEvent)
      .createQueryBuilder('event')
      .orderBy('event.received_at', 'DESC')
      .addOrderBy('event.id', 'DESC')
      .limit(params.limit);
    if (params.status !== undefined) {
      query.andWhere('event.status = :status', { status: params.status });
    }
    if (params.processorId !== undefined) {
      query.andWhere('event.processor_id = :processorId', { processorId: params.processorId });
    }
    if (params.accountId !== undefined) {
      query.andWhere(`(event.payload -> 'event' ->> 'accountId')::bigint = :accountId`, {
        accountId: params.accountId,
      });
    }
    return query.getMany();
  }

  async listRetryableFailed(params: {
    receivedBefore: Date;
    limit: number;
  }): Promise<BillingWebhookEvent[]> {
    return this.dataSourceRead.getRepository(BillingWebhookEvent).find({
      where: { status: 'failed', received_at: LessThan(params.receivedBefore) },
      order: { processed_at: { direction: 'ASC', nulls: 'FIRST' }, received_at: 'ASC', id: 'ASC' },
      take: params.limit,
    });
  }

  async getById(id: string): Promise<BillingWebhookEvent | null> {
    return this.dataSourceRead.getRepository(BillingWebhookEvent).findOne({ where: { id } });
  }

  async markProcessed(id: string, processedAt = new Date()): Promise<BillingWebhookEvent> {
    const repository = this.dataSourceReadWrite.getRepository(BillingWebhookEvent);
    const existing = await repository.findOne({ where: { id } });
    if (existing === null) {
      throw new Error('BillingWebhookEvent not found');
    }

    existing.status = 'processed';
    existing.processed_at = processedAt;
    existing.process_error = null;
    existing.attempts += 1;
    return repository.save(existing);
  }

  async markFailed(
    id: string,
    processError: string,
    processedAt = new Date()
  ): Promise<BillingWebhookEvent> {
    const repository = this.dataSourceReadWrite.getRepository(BillingWebhookEvent);
    const existing = await repository.findOne({ where: { id } });
    if (existing === null) {
      throw new Error('BillingWebhookEvent not found');
    }

    existing.status = 'failed';
    existing.processed_at = processedAt;
    existing.process_error = processError;
    existing.attempts += 1;
    return repository.save(existing);
  }
}

export type { InsertBillingWebhookEventParams, InsertBillingWebhookEventResult };
