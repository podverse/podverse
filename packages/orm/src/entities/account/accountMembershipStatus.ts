import type { Account } from '@orm/entities/account/account.js';
import type { AccountMembership } from '@orm/entities/account/accountMembership.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ type: 'integer', default: 1 })
  account_trust_tier_id!: number;

  @Column({ type: 'timestamp', nullable: true })
  membership_expires_at?: Date | null;

  @Column({ type: 'boolean', default: false })
  auto_renew?: boolean;

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
