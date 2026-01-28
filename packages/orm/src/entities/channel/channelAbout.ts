import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';
import {
  ChannelItunesType,
  ChannelItunesTypeItunesTypeEnum,
} from '@orm/entities/channel/channelItunesType';

@Entity()
export class ChannelAbout {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Channel, (channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  author!: string | null;

  @Column({ type: 'int', nullable: true })
  episode_count!: number | null;

  @Column({ type: 'boolean', nullable: true })
  explicit!: boolean | null;

  @ManyToOne(() => ChannelItunesType, (channelItunesType) => channelItunesType.id, {
    nullable: true,
  })
  @JoinColumn({ name: 'itunes_type_id' })
  itunes_type!: ChannelItunesTypeItunesTypeEnum | ChannelItunesType | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  language!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_pub_date!: Date | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  website_link_url!: string | null;

  @OneToOne(() => Channel, (channel) => channel.channel_about, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  item!: Channel;
}
