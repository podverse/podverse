import type { BillingPriceChangeAudit } from '@orm/entities/billingPriceChangeAudit.js';
import type { BillingProduct } from '@orm/entities/billingProduct.js';
import { ISO_4217_CURRENCY_CODE_CHAR_LENGTH } from '@orm/lib/billingLimits.js';
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

import type { BillingCadence } from '@podverse/helpers';

@Entity('billing_price')
export class BillingPrice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  billing_product_id!: number;

  @ManyToOne('BillingProduct', (billingProduct: BillingProduct) => billingProduct.billingPrices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'billing_product_id' })
  billingProduct!: Relation<BillingProduct>;

  @Column({ type: 'char', length: ISO_4217_CURRENCY_CODE_CHAR_LENGTH })
  currency_code!: string;

  @Column({ type: 'text' })
  billing_cadence!: BillingCadence;

  @Column({ type: 'integer' })
  amount_cents!: number;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  effective_from!: Date;

  @Column({ type: 'timestamp', nullable: true })
  effective_to!: Date | null;

  @Column({ type: 'text', default: 'manual' })
  source!: string;

  @OneToMany(
    'BillingPriceChangeAudit',
    (billingPriceChangeAudit: BillingPriceChangeAudit) => billingPriceChangeAudit.billingPrice
  )
  audits!: Relation<BillingPriceChangeAudit[]>;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  updated_at!: Date;
}
