import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AccountMembership {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  tier!: 'trial' | 'premium';

  @OneToMany(
    () => AccountMembershipStatus,
    (accountMembershipStatus) => accountMembershipStatus.account_membership
  )
  account_membership_status!: AccountMembershipStatus[];
}
