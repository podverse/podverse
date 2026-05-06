import type { BillingPrice } from '@orm/entities/billingPrice.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('billing_price_change_audit')
export class BillingPriceChangeAudit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer', nullable: true })
  billing_price_id!: number | null;

  @ManyToOne('BillingPrice', (billingPrice: BillingPrice) => billingPrice.audits, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'billing_price_id' })
  billingPrice!: Relation<BillingPrice>;

  @Column({ type: 'integer', nullable: true })
  changed_by_admin_account_id!: number | null;

  @Column({ type: 'text', nullable: true })
  change_reason!: string | null;

  @Column({ type: 'integer', nullable: true })
  previous_amount_cents!: number | null;

  @Column({ type: 'integer', nullable: true })
  new_amount_cents!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  previous_effective_from!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  previous_effective_to!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  new_effective_from!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  new_effective_to!: Date | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;
}
