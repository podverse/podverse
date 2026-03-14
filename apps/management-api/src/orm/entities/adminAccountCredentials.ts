import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import type { AdminAccount } from './adminAccount.js';

@Entity('admin_account_credentials')
export class AdminAccountCredentials {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('AdminAccount', 'admin_account_credentials', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_account_id' })
  admin_account!: AdminAccount;

  @Column()
  admin_account_id!: number;

  @Column({ type: 'varchar', unique: true, length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 60 })
  password!: string;
}
