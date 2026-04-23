import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { AdminAccount } from './adminAccount.js';

@Entity('database_audit_log')
export class DatabaseAuditLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @ManyToOne('AdminAccount', 'audit_logs')
  @JoinColumn({ name: 'admin_account_id' })
  admin_account!: AdminAccount;

  @Column({ type: 'integer' })
  admin_account_id!: number;

  @Column({ type: 'varchar', length: 10 })
  operation!: 'create' | 'update' | 'delete';

  @Column({ type: 'varchar', length: 100 })
  table_name!: string;

  @Column({ type: 'integer' })
  row_id!: number;

  @Column({ type: 'jsonb', nullable: true })
  before_snapshot!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after_snapshot!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  request_id!: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;
}
