import type { ChannelPublisher } from '@orm/entities/channel/channelPublisher.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity({ name: 'channel_publisher_remote_item' })
export class ChannelPublisherRemoteItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('ChannelPublisher', (channelPublisher: ChannelPublisher) => channelPublisher.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'channel_publisher_id' })
  channel_publisher!: Relation<ChannelPublisher>;

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
