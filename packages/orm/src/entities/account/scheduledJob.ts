import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { ScheduledJobStatusValues } from '@podverse/helpers';
import { ScheduledJobStatusEnum } from '@podverse/helpers';

@Entity('scheduled_job')
export class ScheduledJob {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  job_type!: string;

  @Column({ type: 'varchar', unique: true })
  dedupe_key!: string;

  @Column({ type: 'timestamptz' })
  run_after!: Date;

  @Column({ type: 'varchar', default: ScheduledJobStatusEnum.Pending })
  status!: ScheduledJobStatusValues;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int', default: 5 })
  max_attempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  locked_at?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  locked_by?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  last_error?: string | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: Date;
}
