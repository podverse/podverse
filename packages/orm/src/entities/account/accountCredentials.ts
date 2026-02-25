import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Account } from '@orm/entities/account/account.js';

@Entity()
export class AccountCredentials {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column()
  account_id!: number;

  @Column({ type: 'varchar', unique: true, length: DATABASE_CONSTANTS.varchar_email })
  email!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_password })
  password!: string;
}
