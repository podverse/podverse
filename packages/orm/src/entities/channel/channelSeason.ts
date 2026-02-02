import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';

@Entity({ name: 'channel_season' })
@Unique(['channel_id', 'number'])
export class ChannelSeason {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer', name: 'channel_id' })
  channel_id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'integer', name: 'number' })
  number!: number;

  @Column({
    type: 'varchar',
    name: 'name',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_normal,
  })
  name!: string | null;
}
