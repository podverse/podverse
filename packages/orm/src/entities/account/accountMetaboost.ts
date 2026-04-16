import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class AccountMetaboost {
  @PrimaryColumn({ type: 'int', name: 'account_id' })
  account_id!: number;

  @OneToOne('Account', (account: Account) => account.account_metaboost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column({ type: 'uuid', unique: true })
  sender_guid!: string;
}
