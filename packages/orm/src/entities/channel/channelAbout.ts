import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import type {
  ChannelItunesType,
  ChannelItunesTypeItunesTypeEnum,
} from '@orm/entities/channel/channelItunesType.js';

@Entity()
export class ChannelAbout {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  author!: string | null;

  @Column({ type: 'int', nullable: true })
  episode_count!: number | null;

  @Column({ type: 'boolean', nullable: true })
  explicit!: boolean | null;

  @ManyToOne('ChannelItunesType', (channelItunesType: ChannelItunesType) => channelItunesType.id, {
    nullable: true,
  })
  @JoinColumn({ name: 'itunes_type_id' })
  itunes_type!: Relation<ChannelItunesType> | ChannelItunesTypeItunesTypeEnum | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  language!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_pub_date!: Date | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  website_link_url!: string | null;
}
