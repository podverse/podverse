import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';

@Entity()
export class AccountMembership {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  tier!: 'trial' | 'basic';

  @OneToMany(
    () => AccountMembershipStatus,
    (accountMembershipStatus) => accountMembershipStatus.account_membership
  )
  account_membership_status!: AccountMembershipStatus[];
}
