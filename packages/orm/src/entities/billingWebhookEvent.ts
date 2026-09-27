import type { BillingProcessor } from '@orm/entities/billingProcessor.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

type BillingWebhookEventStatus = 'pending' | 'processed' | 'failed';

@Entity('billing_webhook_event')
@Unique('billing_webhook_event_processor_external_key', ['processor_id', 'external_event_id'])
export class BillingWebhookEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  processor_id!: string;

  @ManyToOne(
    'BillingProcessor',
    (billingProcessor: BillingProcessor) => billingProcessor.billing_webhook_events
  )
  @JoinColumn({ name: 'processor_id' })
  billing_processor!: Relation<BillingProcessor>;

  @Column({ type: 'text' })
  external_event_id!: string;

  @Column({ type: 'varchar', length: 32 })
  schema_version!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'text', default: 'pending' })
  status!: BillingWebhookEventStatus;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  received_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processed_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  process_error!: string | null;
}
