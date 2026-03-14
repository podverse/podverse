import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity({ name: 'channel_social_interact' })
export class ChannelSocialInteract {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', name: 'protocol', length: DATABASE_CONSTANTS.varchar_short })
  protocol!: string;

  @Column({ type: 'varchar', name: 'uri', length: DATABASE_CONSTANTS.varchar_uri })
  uri!: string;

  @Column({
    type: 'varchar',
    name: 'account_id',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_normal,
  })
  account_id!: string | null;

  @Column({
    type: 'varchar',
    name: 'account_url',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_url,
  })
  account_url!: string | null;

  @Column({ type: 'integer', name: 'priority', nullable: true })
  priority!: number | null;
}
