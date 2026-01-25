import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { Account } from '@orm/entities/account/account';

@Entity()
export class AccountResetPassword {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Account, account => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_guid })
  reset_token!: string;

  @Column({ type: 'timestamp' })
  reset_token_expires_at!: Date;
}