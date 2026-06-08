import type { Clip } from '@orm/entities/clip.js';
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

@Entity('stats_track_event_clip')
export class StatsTrackEventClip {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('uuid')
  account_guid!: string;

  @ManyToOne('StatsTrackAccountGuid', (accountGuid: StatsTrackAccountGuid) => accountGuid.id)
  @JoinColumn({ name: 'stats_track_account_guid_id' })
  stats_track_account_guid!: Relation<StatsTrackAccountGuid>;

  @Column()
  stats_track_account_guid_id!: number;

  @ManyToOne('Clip', (clip: Clip) => clip.id)
  @JoinColumn({ name: 'clip_id' })
  clip!: Relation<Clip>;

  @Column()
  clip_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
