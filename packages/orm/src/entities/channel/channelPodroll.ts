import { Entity, PrimaryGeneratedColumn, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { ChannelPodrollRemoteItem } from '@orm/entities/channel/channelPodrollRemoteItem.js';

@Entity()
export class ChannelPodroll {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @OneToMany(
    'ChannelPodrollRemoteItem',
    (remoteItem: ChannelPodrollRemoteItem) => remoteItem.channel_podroll
  )
  channel_podroll_remote_items!: ChannelPodrollRemoteItem[];
}
