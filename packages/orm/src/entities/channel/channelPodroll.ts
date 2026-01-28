import { Entity, PrimaryGeneratedColumn, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';
import { ChannelPodrollRemoteItem } from '@orm/entities/channel/channelPodrollRemoteItem';

@Entity()
export class ChannelPodroll {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Channel, (channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @OneToMany(() => ChannelPodrollRemoteItem, (remoteItem) => remoteItem.channel_podroll)
  channel_podroll_remote_items!: ChannelPodrollRemoteItem[];
}
