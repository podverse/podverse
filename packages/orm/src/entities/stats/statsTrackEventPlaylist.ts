import type { Playlist } from '@orm/entities/playlist/playlist.js';
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

@Entity('stats_track_event_playlist')
export class StatsTrackEventPlaylist {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('uuid')
  account_guid!: string;

  @ManyToOne('StatsTrackAccountGuid', (accountGuid: StatsTrackAccountGuid) => accountGuid.id)
  @JoinColumn({ name: 'stats_track_account_guid_id' })
  stats_track_account_guid!: Relation<StatsTrackAccountGuid>;

  @Column()
  stats_track_account_guid_id!: number;

  @ManyToOne('Playlist', (playlist: Playlist) => playlist.id)
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Relation<Playlist>;

  @Column()
  playlist_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
