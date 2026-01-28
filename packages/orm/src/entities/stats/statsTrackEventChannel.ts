import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid';
import { Channel } from '@orm/entities/channel/channel';

@Entity('stats_track_event_channel')
export class StatsTrackEventChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => StatsTrackAccountGuid)
  @JoinColumn({ name: 'account_guid' })
  account_guid!: StatsTrackAccountGuid;

  @ManyToOne(() => Channel)
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @Column()
  channel_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
