import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/**
 * A show the listener hid from Browse and Recommendations. Subscriptions stay visible.
 * Listening still updates the Taste Profile.
 */
@Entity('stats_channel_hidden')
export class StatsChannelHidden {
  @PrimaryColumn({ type: 'uuid' })
  listener_id!: string;

  @PrimaryColumn({ type: 'integer' })
  channel_id!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  hidden_at!: Date;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;
}
