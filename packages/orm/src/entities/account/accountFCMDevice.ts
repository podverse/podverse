import { DATABASE_CONSTANTS, AccountFCMDevicePlatformEnum } from '@podverse/helpers';
import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Account } from '@orm/entities/account/account';

@Entity()
export class AccountFCMDevice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_fcm_token, unique: true })
  fcm_token!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_guid, unique: true })
  installation_id!: string;

  @Column()
  account_id!: number;

  @Column({ type: 'enum', enum: AccountFCMDevicePlatformEnum })
  platform!: AccountFCMDevicePlatformEnum;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_locale })
  locale!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;

  @ManyToOne(() => Account, account => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;
}