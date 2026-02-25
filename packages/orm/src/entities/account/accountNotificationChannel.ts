import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Account } from '@orm/entities/account/account.js';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { AccountNotificationChannelType } from './accountNotificationChannelType.js';

@Entity()
@Unique(['channel_id', 'account_id'])
export class AccountNotificationChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  channel_id!: number;

  @Column()
  account_id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @OneToMany(
    'AccountNotificationChannelType',
    (accountNotificationChannelType: AccountNotificationChannelType) =>
      accountNotificationChannelType.account_notification_channel
  )
  account_notification_channel_types!: AccountNotificationChannelType[];
}
