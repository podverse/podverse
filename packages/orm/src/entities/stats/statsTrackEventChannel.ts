import type { Channel } from '@orm/entities/channel/channel.js';
import type { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('stats_track_event_channel')
export class StatsTrackEventChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('StatsTrackAccountGuid', (accountGuid: StatsTrackAccountGuid) => accountGuid.id)
  @JoinColumn({ name: 'account_guid' })
  account_guid!: Relation<StatsTrackAccountGuid>;

  @ManyToOne('Channel', (channel: Channel) => channel.id)
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column()
  channel_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
