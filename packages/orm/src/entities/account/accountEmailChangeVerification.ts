import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Account } from '@orm/entities/account/account.js';
import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class AccountEmailChangeVerification {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column()
  account_id!: number;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_guid })
  verification_token!: string;

  @Column({ type: 'timestamp' })
  verification_token_expires_at!: Date;

  @Column({ type: 'varchar', unique: true, length: DATABASE_CONSTANTS.varchar_email })
  pending_email_address!: string;
}
