import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import {
  ADMIN_ACCOUNT_CREDENTIALS_EMAIL_MAX_LENGTH,
  ADMIN_ACCOUNT_CREDENTIALS_PASSWORD_HASH_MAX_LENGTH,
  ADMIN_ACCOUNT_CREDENTIALS_USERNAME_MAX_LENGTH,
} from '@podverse/helpers';

import type { AdminAccount } from './adminAccount.js';

@Entity('admin_account_credentials')
export class AdminAccountCredentials {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('AdminAccount', 'admin_account_credentials', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_account_id' })
  admin_account!: AdminAccount;

  @Column({ type: 'integer' })
  admin_account_id!: number;

  @Column({ type: 'varchar', length: ADMIN_ACCOUNT_CREDENTIALS_EMAIL_MAX_LENGTH, nullable: true })
  email!: string | null;

  @Column({
    type: 'varchar',
    length: ADMIN_ACCOUNT_CREDENTIALS_USERNAME_MAX_LENGTH,
    nullable: true,
  })
  username!: string | null;

  @Column({ type: 'varchar', length: ADMIN_ACCOUNT_CREDENTIALS_PASSWORD_HASH_MAX_LENGTH })
  password!: string;
}
