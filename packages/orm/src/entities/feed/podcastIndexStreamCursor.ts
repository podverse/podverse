import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

/**
 * - `recent_data`: the `/recent/data` stream; `next_since` and `position` come from the response.
 * - `gap_sweep`: an unfinished sweep of our feeds against Podcast Index; `next_since` is the gap
 *   start (Unix seconds) and `position` the last swept `feed.id`. The row exists only while a
 *   sweep is unfinished.
 */
export enum PodcastIndexStreamKeyEnum {
  RecentData = 'recent_data',
  GapSweep = 'gap_sweep',
}

/**
 * How far a worker has read one Podcast Index stream. The driver returns `bigint` as text.
 */
@Entity('podcast_index_stream_cursor')
export class PodcastIndexStreamCursor {
  @PrimaryColumn({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  stream_key!: string;

  @Column({ type: 'bigint' })
  next_since!: string;

  @Column({ type: 'bigint', nullable: true })
  position!: string | null;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
