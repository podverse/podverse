import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Account } from '@orm/entities/account/account';

@Entity('account_webpush_device')
export class AccountWebPushDevice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_url, unique: true })
  endpoint!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_long })
  p256dh!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_long })
  auth!: string;

  @Column()
  account_id!: number;

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
