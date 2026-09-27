import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingWebhookEvent } from '@orm/entities/billingWebhookEvent.js';
import type { DataSource } from 'typeorm';
import { QueryFailedError } from 'typeorm';

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

  async insertIfNew(params: InsertBillingWebhookEventParams): Promise<InsertBillingWebhookEventResult> {
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
      const existing = await this.dataSourceRead.getRepository(BillingWebhookEvent).findOne({
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
