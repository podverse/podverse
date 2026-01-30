import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid';
import { Clip } from '@orm/entities/clip';

@Entity('stats_track_event_clip')
export class StatsTrackEventClip {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => StatsTrackAccountGuid)
  @JoinColumn({ name: 'account_guid' })
  account_guid!: StatsTrackAccountGuid;

  @ManyToOne(() => Clip)
  @JoinColumn({ name: 'clip_id' })
  clip!: Clip;

  @Column()
  clip_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
