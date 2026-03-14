import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class AccountFollowingAccount {
  @PrimaryColumn()
  account_id!: number;

  @PrimaryColumn()
  following_account_id!: number;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_account_id' })
  following_account!: Relation<Account>;
}
