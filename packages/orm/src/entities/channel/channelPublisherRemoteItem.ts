import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { ChannelPublisher } from '@orm/entities/channel/channelPublisher';

@Entity({ name: 'channel_publisher_remote_item' })
export class ChannelPublisherRemoteItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => ChannelPublisher, (channelPublisher) => channelPublisher.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'channel_publisher_id' })
  channel_publisher!: ChannelPublisher;

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
