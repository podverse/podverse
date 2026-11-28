import type { Playlist } from '@orm/entities/playlist/playlist.js';
import type { Relation } from 'typeorm';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class PlaylistTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: DATABASE_CONSTANTS.varchar_short })
  name!: string;
}

@Entity()
@Unique(['playlist_id', 'list_position'])
export class PlaylistTagAssignment {
  @PrimaryColumn()
  playlist_id!: number;

  @PrimaryColumn()
  playlist_tag_id!: number;

  @Column({ type: 'smallint' })
  list_position!: number;

  @ManyToOne('Playlist', (playlist: Playlist) => playlist.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: Relation<Playlist>;

  @ManyToOne('PlaylistTag', (playlistTag: PlaylistTag) => playlistTag.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_tag_id' })
  playlist_tag!: Relation<PlaylistTag>;
}
