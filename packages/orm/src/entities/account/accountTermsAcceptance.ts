import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class AccountTermsAcceptance {
  @PrimaryColumn({ type: 'int', name: 'account_id' })
  account_id!: number;

  @OneToOne('Account', (account: Account) => account.account_terms_acceptance, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column({ type: 'varchar', length: 64 })
  terms_version!: string;

  @Column({ type: 'timestamp' })
  accepted_at!: Date;
}
