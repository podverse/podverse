import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity({ name: 'channel_remote_item' })
export class ChannelRemoteItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'uuid', name: 'feed_guid' })
  feed_guid!: string;

  @Column({
    type: 'varchar',
    name: 'feed_url',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_url,
  })
  feed_url!: string | null;

  @Column({
    type: 'varchar',
    name: 'item_guid',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_uri,
  })
  item_guid!: string | null;

  @Column({
    type: 'varchar',
    name: 'title',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_normal,
  })
  title!: string | null;

  @Column({ type: 'int', name: 'medium_id', nullable: true })
  medium_id!: number | null;
}
