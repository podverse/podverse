import { Entity, PrimaryGeneratedColumn, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';
import { ChannelPublisherRemoteItem } from '@orm/entities/channel/channelPublisherRemoteItem';

@Entity({ name: 'channel_publisher' })
export class ChannelPublisher {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Channel, (channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @OneToMany(() => ChannelPublisherRemoteItem, (remoteItem) => remoteItem.channel_publisher)
  channel_publisher_remote_items!: ChannelPublisherRemoteItem[];
}
