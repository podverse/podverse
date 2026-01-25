import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { Account } from '@orm/entities/account/account';
import { Channel } from '@orm/entities/channel/channel';
import { AccountNotificationChannelType } from './accountNotificationChannelType';

@Entity()
@Unique(['channel_id', 'account_id'])
export class AccountNotificationChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  channel_id!: number;

  @Column()
  account_id!: number;

  @ManyToOne(() => Channel, channel => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @ManyToOne(() => Account, account => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @OneToMany(() => AccountNotificationChannelType, accountNotificationChannelType => accountNotificationChannelType.account_notification_channel)
  account_notification_channel_types!: AccountNotificationChannelType[];
}