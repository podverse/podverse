import type { Account } from '@orm/entities/account/account.js';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity('account_device_auto_download_channel')
@Unique(['account_id', 'installation_id', 'channel_id'])
export class AccountDeviceAutoDownloadChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  account_id!: number;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_guid })
  installation_id!: string;

  @Column()
  channel_id!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;
}
