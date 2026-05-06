import type { BillingPrice } from '@orm/entities/billingPrice.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('billing_product')
export class BillingProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  product_code!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @OneToMany('BillingPrice', (billingPrice: BillingPrice) => billingPrice.billingProduct)
  billingPrices!: Relation<BillingPrice[]>;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  updated_at!: Date;
}
