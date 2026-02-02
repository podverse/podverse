import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { ChannelPodroll } from '@orm/entities/channel/channelPodroll.js';

@Entity({ name: 'channel_podroll_remote_item' })
export class ChannelPodrollRemoteItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('ChannelPodroll', (channelPodroll: ChannelPodroll) => channelPodroll.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'channel_podroll_id' })
  channel_podroll!: Relation<ChannelPodroll>;

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
}
