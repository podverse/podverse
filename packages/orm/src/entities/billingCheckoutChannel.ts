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
  UpdateDateColumn,
} from 'typeorm';

import type { BillingPlatform } from '@podverse/helpers';

@Entity('billing_checkout_channel')
@Unique('billing_checkout_channel_processor_platform_key', ['processor_id', 'platform'])
export class BillingCheckoutChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 32 })
  processor_id!: string;

  @ManyToOne(
    'BillingProcessor',
    (billingProcessor: BillingProcessor) => billingProcessor.billing_checkout_channels
  )
  @JoinColumn({ name: 'processor_id' })
  billing_processor!: Relation<BillingProcessor>;

  @Column({ type: 'text' })
  platform!: BillingPlatform;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  storefront_allowlist!: string[];

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  min_client_version!: string | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: Date;
}
