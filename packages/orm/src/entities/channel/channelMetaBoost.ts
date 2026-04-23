import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity({ name: 'channel_meta_boost' })
export class ChannelMetaBoost {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', name: 'standard', length: DATABASE_CONSTANTS.varchar_short })
  standard!: string;

  @Column({ type: 'varchar', name: 'node', length: DATABASE_CONSTANTS.varchar_url })
  node!: string;
}
