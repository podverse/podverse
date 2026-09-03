import type { Account } from '@orm/entities/account/account.js';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class AccountFollowingChannel {
  @PrimaryColumn()
  account_id!: number;

  @PrimaryColumn()
  channel_id!: number;

  /**
   * When this account last opened the channel, on any device. Items published after it are unseen.
   *
   * `null` means never opened, which counts as nothing unseen — a new follow should not claim the
   * whole back catalogue is new. The value only ever moves forward.
   */
  @Column({ type: 'timestamptz', nullable: true })
  last_seen_at!: Date | null;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;
}
