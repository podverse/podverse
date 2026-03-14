import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
@Unique(['channel'])
export class ChannelDescription {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_longer })
  value!: string;
}
