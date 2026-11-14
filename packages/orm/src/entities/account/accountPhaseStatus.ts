import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * One row per v4 user and migration phase. status is pending, done, failed,
 * deferred, or needs_operator. error_class is a short token. The row stores
 * the v4 user id and that token, never an email, a name, a password hash,
 * or a raw row.
 */
@Entity('account_phase_status')
@Unique('account_phase_status_v4_user_phase_unique', ['v4_user_id', 'phase'])
@Index('account_phase_status_phase_status_idx', ['phase', 'status'])
@Index('account_phase_status_account_id_idx', ['account_id'], {
  where: '"account_id" IS NOT NULL',
})
@Check(
  'account_phase_status_phase_check',
  `"phase" IN ('identity', 'catalog', 'library', 'replay', 'membership', 'verify')`
)
@Check(
  'account_phase_status_status_check',
  `"status" IN ('pending', 'done', 'failed', 'deferred', 'needs_operator')`
)
@Check(
  'account_phase_status_v4_user_id_check',
  `char_length("v4_user_id") BETWEEN 1 AND 32 AND "v4_user_id" !~ '[[:space:]@]'`
)
@Check(
  'account_phase_status_error_class_check',
  `"error_class" IS NULL OR (
    char_length("error_class") BETWEEN 1 AND 80
    AND "error_class" ~ '^[A-Za-z0-9_:]+$'
  )`
)
@Check(
  'account_phase_status_error_class_status_check',
  `(
    "status" IN ('pending', 'done') AND "error_class" IS NULL
  ) OR (
    "status" IN ('failed', 'deferred', 'needs_operator') AND "error_class" IS NOT NULL
  )`
)
export class AccountPhaseStatus {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id!: string;

  @Column({ type: 'text' })
  v4_user_id!: string;

  @Column({ type: 'text' })
  phase!: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'integer', nullable: true })
  account_id!: number | null;

  @ManyToOne('Account', (account: Account) => account.id, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account> | null;

  @Column({ type: 'text', nullable: true })
  error_class!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
