import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid';
import { Playlist } from '@orm/entities/playlist/playlist';

@Entity('stats_track_event_playlist')
export class StatsTrackEventPlaylist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => StatsTrackAccountGuid)
  @JoinColumn({ name: 'account_guid' })
  account_guid!: StatsTrackAccountGuid;

  @ManyToOne(() => Playlist)
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Playlist;

  @Column()
  playlist_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
