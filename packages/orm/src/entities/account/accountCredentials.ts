import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import { Check, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
@Check('chk_account_credentials_email_or_username', 'email IS NOT NULL OR username IS NOT NULL')
export class AccountCredentials {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column()
  account_id!: number;

  @Column({
    type: 'varchar',
    unique: true,
    length: DATABASE_CONSTANTS.varchar_email,
    nullable: true,
  })
  email!: string | null;

  @Column({
    type: 'varchar',
    unique: true,
    length: DATABASE_CONSTANTS.varchar_username,
    nullable: true,
  })
  username!: string | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_password })
  password!: string;
}
