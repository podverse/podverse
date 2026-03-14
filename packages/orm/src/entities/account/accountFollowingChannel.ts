import type { Account } from '@orm/entities/account/account.js';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class AccountFollowingChannel {
  @PrimaryColumn()
  account_id!: number;

  @PrimaryColumn()
  channel_id!: number;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;
}
