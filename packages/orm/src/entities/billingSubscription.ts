import type { Account } from '@orm/entities/account/account.js';
import type { BillingMembershipGrant } from '@orm/entities/billingMembershipGrant.js';
import type { BillingProcessor } from '@orm/entities/billingProcessor.js';
import type { BillingProcessorProduct } from '@orm/entities/billingProcessorProduct.js';
import type { BillingTransaction } from '@orm/entities/billingTransaction.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { BillingSubscriptionStatus, PurchaseKind } from '@podverse/helpers';

@Entity('billing_subscription')
export class BillingSubscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  account_id!: number;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column({ type: 'varchar', length: 32 })
  processor_id!: string;

  @ManyToOne(
    'BillingProcessor',
    (billingProcessor: BillingProcessor) => billingProcessor.billing_subscriptions
  )
  @JoinColumn({ name: 'processor_id' })
  billing_processor!: Relation<BillingProcessor>;

  @Column({ type: 'integer', nullable: true })
  billing_processor_product_id!: number | null;

  @ManyToOne(
    'BillingProcessorProduct',
    (billingProcessorProduct: BillingProcessorProduct) =>
      billingProcessorProduct.billing_subscriptions,
    { onDelete: 'SET NULL' }
  )
  @JoinColumn({ name: 'billing_processor_product_id' })
  billing_processor_product!: Relation<BillingProcessorProduct | null>;

  @Column({ type: 'text' })
  external_subscription_id!: string;

  @Column({ type: 'text' })
  status!: BillingSubscriptionStatus;

  @Column({ type: 'text' })
  purchase_kind!: PurchaseKind;

  @Column({ type: 'timestamptz', nullable: true })
  current_period_start!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  current_period_end!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  grace_period_ends_at!: Date | null;

  @Column({ type: 'boolean', default: false })
  cancel_at_period_end!: boolean;

  @Column({ type: 'integer', default: 0 })
  banked_seconds!: number;

  @Column({ type: 'boolean', default: false })
  is_sandbox!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  raw_status_snapshot!: Record<string, unknown> | null;

  @OneToMany(
    'BillingMembershipGrant',
    (billingMembershipGrant: BillingMembershipGrant) => billingMembershipGrant.billing_subscription
  )
  billing_membership_grants!: Relation<BillingMembershipGrant[]>;

  @OneToMany(
    'BillingTransaction',
    (billingTransaction: BillingTransaction) => billingTransaction.billing_subscription
  )
  billing_transactions!: Relation<BillingTransaction[]>;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: Date;
}
