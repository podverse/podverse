import { BILLING_IDEMPOTENCY_KEY_MAX_LENGTH } from '@orm/lib/billingLimits.js';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('billing_domain_event')
export class BillingDomainEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'integer', nullable: true })
  account_id!: number | null;

  @Column({ type: 'text' })
  event_type!: string;

  @Column({ type: 'varchar', length: BILLING_IDEMPOTENCY_KEY_MAX_LENGTH, nullable: true })
  idempotency_key!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;
}
