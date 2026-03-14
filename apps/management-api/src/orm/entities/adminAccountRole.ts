import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { AdminAccount } from './adminAccount.js';

export enum AdminAccountRoleEnum {
  SUPERUSER = 'superuser',
  ADMIN = 'admin',
}

@Entity('admin_account_role')
export class AdminAccountRole {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  role!: AdminAccountRoleEnum;

  @OneToMany('AdminAccount', 'admin_account_role')
  admin_accounts!: AdminAccount[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  updated_at!: Date;
}
