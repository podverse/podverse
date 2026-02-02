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
import type { Playlist } from '@orm/entities/playlist/playlist.js';

@Entity('stats_track_event_playlist')
export class StatsTrackEventPlaylist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('StatsTrackAccountGuid', (accountGuid: StatsTrackAccountGuid) => accountGuid.id)
  @JoinColumn({ name: 'account_guid' })
  account_guid!: Relation<StatsTrackAccountGuid>;

  @ManyToOne('Playlist', (playlist: Playlist) => playlist.id)
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Relation<Playlist>;

  @Column()
  playlist_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
