import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { AdminAccount } from './adminAccount.js';

@Entity('admin_account_permissions')
export class AdminAccountPermissions {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('AdminAccount', 'permissions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_account_id' })
  admin_account!: AdminAccount;

  @Column({ type: 'integer' })
  admin_account_id!: number;

  @Column({ name: 'feeds_crud', type: 'integer', default: 0 })
  feedsCrud!: number;

  @Column({ name: 'feed_flag_statuses_crud', type: 'integer', default: 0 })
  feedFlagStatusesCrud!: number;

  @Column({ name: 'feed_flag_status_reasons_crud', type: 'integer', default: 0 })
  feedFlagStatusReasonsCrud!: number;

  @Column({ name: 'admins_crud', type: 'integer', default: 0 })
  adminsCrud!: number;

  @Column({ name: 'stats_crud', type: 'integer', default: 0 })
  statsCrud!: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  updated_at!: Date;
}
