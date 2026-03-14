import { AccountNotificationChannel } from '@orm/entities/account/accountNotificationChannel.js';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { AccountNotificationTypeEnum } from '@podverse/helpers';

@Entity()
export class AccountNotificationChannelType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: AccountNotificationTypeEnum })
  type!: AccountNotificationTypeEnum;

  @ManyToOne(
    () => AccountNotificationChannel,
    (accountNotificationChannel) => accountNotificationChannel.account_notification_channel_types,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'account_notification_channel_id' })
  account_notification_channel!: AccountNotificationChannel;
}
