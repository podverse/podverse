import type { Account } from '@orm/entities/account/account.js';
import type { BillingSubscription } from '@orm/entities/billingSubscription.js';
import type { BillingTransaction } from '@orm/entities/billingTransaction.js';
import type { MembershipClaimToken } from '@orm/entities/membershipClaimToken.js';
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

import type { MembershipGrantSource } from '@podverse/helpers';

@Entity('billing_membership_grant')
export class BillingMembershipGrant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  account_id!: number;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column({ type: 'text' })
  source!: MembershipGrantSource;

  @Column({ type: 'timestamptz' })
  starts_at!: Date;

  @Column({ type: 'timestamptz' })
  ends_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at!: Date | null;

  @Column({ type: 'integer', nullable: true })
  billing_subscription_id!: number | null;

  @ManyToOne(
    'BillingSubscription',
    (billingSubscription: BillingSubscription) => billingSubscription.billing_membership_grants
  )
  @JoinColumn({ name: 'billing_subscription_id' })
  billing_subscription!: Relation<BillingSubscription | null>;

  @Column({ type: 'integer', nullable: true, unique: true })
  billing_transaction_id!: number | null;

  @OneToOne(
    'BillingTransaction',
    (billingTransaction: BillingTransaction) => billingTransaction.billing_membership_grant
  )
  @JoinColumn({ name: 'billing_transaction_id' })
  billing_transaction!: Relation<BillingTransaction | null>;

  @Column({ type: 'uuid', nullable: true, unique: true })
  membership_claim_token_id!: string | null;

  @ManyToOne(
    'MembershipClaimToken',
    (membershipClaimToken: MembershipClaimToken) => membershipClaimToken.id
  )
  @JoinColumn({ name: 'membership_claim_token_id' })
  membership_claim_token!: Relation<MembershipClaimToken | null>;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
}
