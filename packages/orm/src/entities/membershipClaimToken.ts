import type { AccountMembershipEnum } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { AccountMembership } from '@orm/entities/account/accountMembership.js';

@Entity()
export class MembershipClaimToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: false })
  claimed!: boolean;

  @Column({ default: 1 })
  months_to_add!: number;

  @Column()
  account_membership_id!: number;

  @ManyToOne('AccountMembership', (accountMembership: AccountMembership) => accountMembership.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_membership_id' })
  account_membership!: AccountMembershipEnum;
}
