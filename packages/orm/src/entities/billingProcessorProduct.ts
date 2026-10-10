import type { BillingProcessor } from '@orm/entities/billingProcessor.js';
import type { BillingProduct } from '@orm/entities/billingProduct.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { BillingCadence } from '@podverse/helpers';

@Entity('billing_processor_product')
export class BillingProcessorProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 32 })
  processor_id!: string;

  @ManyToOne(
    'BillingProcessor',
    (billingProcessor: BillingProcessor) => billingProcessor.billing_processor_products
  )
  @JoinColumn({ name: 'processor_id' })
  billing_processor!: Relation<BillingProcessor>;

  @Column({ type: 'varchar', length: 255 })
  external_product_id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  external_base_plan_id!: string | null;

  @Column({ type: 'integer' })
  billing_product_id!: number;

  @ManyToOne('BillingProduct', (billingProduct: BillingProduct) => billingProduct.id)
  @JoinColumn({ name: 'billing_product_id' })
  billing_product!: Relation<BillingProduct>;

  @Column({ type: 'text' })
  billing_cadence!: BillingCadence;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: Date;
}
