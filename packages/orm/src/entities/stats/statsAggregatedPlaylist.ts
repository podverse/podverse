import type { Playlist } from '@orm/entities/playlist/playlist.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('stats_aggregated_playlist')
export class StatsAggregatedPlaylist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Playlist', (playlist: Playlist) => playlist.id)
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Relation<Playlist>;

  @Column()
  playlist_id!: number;

  @Column('int', { default: 0 })
  day_current_count!: number;

  @Column('int', { default: 0 })
  day_1_count!: number;

  @Column('int', { default: 0 })
  day_2_count!: number;

  @Column('int', { default: 0 })
  day_3_count!: number;

  @Column('int', { default: 0 })
  day_4_count!: number;

  @Column('int', { default: 0 })
  day_5_count!: number;

  @Column('int', { default: 0 })
  day_6_count!: number;

  @Column('int', { default: 0 })
  day_7_count!: number;

  @Column('int', { default: 0 })
  day_8_count!: number;

  @Column('int', { default: 0 })
  week_current_count!: number;

  @Column('int', { default: 0 })
  week_1_count!: number;

  @Column('int', { default: 0 })
  week_2_count!: number;

  @Column('int', { default: 0 })
  week_3_count!: number;

  @Column('int', { default: 0 })
  week_4_count!: number;

  @Column('int', { default: 0 })
  month_current_count!: number;

  @Column('int', { default: 0 })
  month_1_count!: number;

  @Column('int', { default: 0 })
  all_time_count!: number;
}
