import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid.js';
import type { Clip } from '@orm/entities/clip.js';

@Entity('stats_track_event_clip')
export class StatsTrackEventClip {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('StatsTrackAccountGuid', (accountGuid: StatsTrackAccountGuid) => accountGuid.id)
  @JoinColumn({ name: 'account_guid' })
  account_guid!: Relation<StatsTrackAccountGuid>;

  @ManyToOne('Clip', (clip: Clip) => clip.id)
  @JoinColumn({ name: 'clip_id' })
  clip!: Relation<Clip>;

  @Column()
  clip_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
