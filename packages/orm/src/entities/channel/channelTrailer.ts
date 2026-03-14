import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

import type { ChannelSeason } from './channelSeason.js';

@Entity({ name: 'channel_trailer' })
export class ChannelTrailer {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({
    type: 'varchar',
    name: 'title',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_normal,
  })
  title!: string | null;

  @Column({ type: 'varchar', name: 'url', length: DATABASE_CONSTANTS.varchar_url })
  url!: string | null;

  @Column({ type: 'timestamptz', name: 'pub_date' })
  pub_date!: Date;

  @Column({ type: 'integer', name: 'length', nullable: true })
  length!: number | null;

  @Column({
    type: 'varchar',
    name: 'type',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_short,
  })
  type!: string | null;

  @ManyToOne('ChannelSeason', (channel_season: ChannelSeason) => channel_season.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'channel_season_id' })
  channel_season!: Relation<ChannelSeason> | null;
}
