import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';

@Entity({ name: 'channel_remote_item' })
export class ChannelRemoteItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Channel, channel => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @Column({ type: 'uuid', name: 'feed_guid' })
  feed_guid!: string;

  @Column({ type: 'varchar', name: 'feed_url', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  feed_url!: string | null;

  @Column({ type: 'varchar', name: 'item_guid', nullable: true, length: DATABASE_CONSTANTS.varchar_uri })
  item_guid!: string | null;

  @Column({ type: 'varchar', name: 'title', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title!: string | null;
}
