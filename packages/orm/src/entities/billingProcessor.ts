import type { BillingCheckoutChannel } from '@orm/entities/billingCheckoutChannel.js';
import type { BillingProcessorProduct } from '@orm/entities/billingProcessorProduct.js';
import type { BillingSubscription } from '@orm/entities/billingSubscription.js';
import type { BillingTransaction } from '@orm/entities/billingTransaction.js';
import type { BillingWebhookEvent } from '@orm/entities/billingWebhookEvent.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('billing_processor')
export class BillingProcessor {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ type: 'text' })
  display_name!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @OneToMany(
    'BillingCheckoutChannel',
    (billingCheckoutChannel: BillingCheckoutChannel) => billingCheckoutChannel.billing_processor
  )
  billing_checkout_channels!: Relation<BillingCheckoutChannel[]>;

  @OneToMany(
    'BillingProcessorProduct',
    (billingProcessorProduct: BillingProcessorProduct) => billingProcessorProduct.billing_processor
  )
  billing_processor_products!: Relation<BillingProcessorProduct[]>;

  @OneToMany(
    'BillingSubscription',
    (billingSubscription: BillingSubscription) => billingSubscription.billing_processor
  )
  billing_subscriptions!: Relation<BillingSubscription[]>;

  @OneToMany(
    'BillingTransaction',
    (billingTransaction: BillingTransaction) => billingTransaction.billing_processor
  )
  billing_transactions!: Relation<BillingTransaction[]>;

  @OneToMany(
    'BillingWebhookEvent',
    (billingWebhookEvent: BillingWebhookEvent) => billingWebhookEvent.billing_processor
  )
  billing_webhook_events!: Relation<BillingWebhookEvent[]>;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: Date;
}
