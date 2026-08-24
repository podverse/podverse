import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type {
  AdminNotificationAudience,
  AdminNotificationCampaignStatusValues,
  NotificationCategoryValues,
} from '@podverse/helpers';
import { AdminNotificationCampaignStatusEnum } from '@podverse/helpers';

import { generateRandomIdText, NANO_ID_V2_MAX_LENGTH } from '../../lib/nanoid.js';

@Entity('admin_notification_campaign')
export class AdminNotificationCampaign {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: NANO_ID_V2_MAX_LENGTH })
  id_text!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  @Column({ type: 'varchar', nullable: true })
  link_path?: string | null;

  @Column({ type: 'varchar' })
  category!: NotificationCategoryValues;

  @Column({ type: 'jsonb' })
  audience!: AdminNotificationAudience;

  @Column({ type: 'boolean', default: false })
  send_push!: boolean;

  @Column({ type: 'varchar', default: AdminNotificationCampaignStatusEnum.Draft })
  status!: AdminNotificationCampaignStatusValues;

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at?: Date | null;

  @Column({ type: 'integer', nullable: true })
  created_by_admin_id?: number | null;

  @Column({ type: 'varchar', nullable: true })
  scheduled_job_dedupe_key?: string | null;

  @Column({ type: 'text', nullable: true })
  last_error?: string | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: Date;

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
