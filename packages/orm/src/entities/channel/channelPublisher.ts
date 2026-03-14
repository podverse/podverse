import type { Channel } from '@orm/entities/channel/channel.js';
import type { ChannelPublisherRemoteItem } from '@orm/entities/channel/channelPublisherRemoteItem.js';
import type { Relation } from 'typeorm';
import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'channel_publisher' })
export class ChannelPublisher {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  // Per RSS spec, publisher can only have ONE remote item
  @OneToOne(
    'ChannelPublisherRemoteItem',
    (remoteItem: ChannelPublisherRemoteItem) => remoteItem.channel_publisher
  )
  channel_publisher_remote_item!: Relation<ChannelPublisherRemoteItem> | null;
}
