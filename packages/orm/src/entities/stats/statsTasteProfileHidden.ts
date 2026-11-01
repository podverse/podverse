import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/**
 * A show the listener left out of recommendations. The show stays visible. Listening never adds
 * it back to the Taste Profile while the row exists.
 */
@Entity('stats_taste_profile_hidden')
export class StatsTasteProfileHidden {
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
