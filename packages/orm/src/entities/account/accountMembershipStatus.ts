import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Account } from '@orm/entities/account/account.js';
import type { AccountMembership } from '@orm/entities/account/accountMembership.js';

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
}
