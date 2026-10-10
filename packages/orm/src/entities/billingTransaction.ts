import type { Account } from '@orm/entities/account/account.js';
import type { BillingMembershipGrant } from '@orm/entities/billingMembershipGrant.js';
import type { BillingProcessor } from '@orm/entities/billingProcessor.js';
import { ISO_4217_CURRENCY_CODE_CHAR_LENGTH } from '@orm/lib/billingLimits.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { BillingRevocationReason } from '@podverse/helpers';

@Entity('billing_transaction')
export class BillingTransaction {
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
    (billingProcessor: BillingProcessor) => billingProcessor.billing_transactions
  )
  @JoinColumn({ name: 'processor_id' })
  billing_processor!: Relation<BillingProcessor>;

  @Column({ type: 'text' })
  external_transaction_id!: string;

  @Column({ type: 'numeric', precision: 19, scale: 4, nullable: true })
  amount!: string | null;

  @Column({ type: 'char', length: ISO_4217_CURRENCY_CODE_CHAR_LENGTH, nullable: true })
  currency_code!: string | null;

  @Column({ type: 'timestamptz' })
  settled_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  revocation_reason!: BillingRevocationReason | null;

  @Column({ type: 'boolean', default: false })
  is_sandbox!: boolean;

  @OneToOne(
    'BillingMembershipGrant',
    (billingMembershipGrant: BillingMembershipGrant) => billingMembershipGrant.billing_transaction
  )
  billing_membership_grant!: Relation<BillingMembershipGrant | null>;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
}
