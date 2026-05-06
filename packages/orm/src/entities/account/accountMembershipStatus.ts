import type { Account } from '@orm/entities/account/account.js';
import type { AccountMembership } from '@orm/entities/account/accountMembership.js';
import { BILLING_IDEMPOTENCY_KEY_MAX_LENGTH } from '@orm/lib/billingLimits.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import type { BillingCadence } from '@podverse/helpers';

@Entity()
export class AccountMembershipStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @ManyToOne('AccountMembership', (accountMembership: AccountMembership) => accountMembership.id)
  @JoinColumn({ name: 'account_membership_id' })
  account_membership!: Relation<AccountMembership>;

  @Column({ type: 'timestamp', nullable: true })
  membership_expires_at?: Date | null;

  @Column({ type: 'boolean', default: false })
  auto_renew?: boolean;

  @Column({ type: 'text', nullable: true })
  billing_cadence?: BillingCadence | null;

  @Column({ type: 'text', default: 'off' })
  auto_renew_mode?: 'off' | 'on';

  @Column({ type: 'timestamp', nullable: true })
  next_renewal_attempt_at?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_renewal_attempt_at?: Date | null;

  @Column({ type: 'text', default: 'none' })
  last_renewal_status?: 'none' | 'succeeded' | 'failed';

  @Column({ type: 'varchar', length: BILLING_IDEMPOTENCY_KEY_MAX_LENGTH, nullable: true })
  last_extension_idempotency_key?: string | null;

  @Column({ type: 'varchar', length: BILLING_IDEMPOTENCY_KEY_MAX_LENGTH, nullable: true })
  last_renewal_idempotency_key?: string | null;

  @Column({ type: 'integer', default: 0 })
  renewal_retry_count?: number;

  @Column({ type: 'timestamp', nullable: true })
  renewal_retry_backoff_until?: Date | null;

  @Column({ type: 'boolean', nullable: true })
  allow_directory_add_by_rss?: boolean | null;

  @Column({ type: 'integer', nullable: true })
  max_add_by_rss_feeds?: number | null;

  @Column({ type: 'integer', nullable: true })
  max_manual_refreshes_per_hour?: number | null;

  @Column({ type: 'boolean', nullable: true })
  track_stats?: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  allow_notifications?: boolean | null;
}
